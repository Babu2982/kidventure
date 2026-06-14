"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { speak, stopSpeaking, ttsSupported, warmVoices } from "@/lib/tts";
import { playRetry } from "@/lib/sounds";
import { useGameStore } from "@/store/useGameStore";
import { dbg } from "@/lib/dbg";

export type NarrationLang = "en-US" | "hi-IN" | "kn-IN" | "ta-IN";

function narrationEnabled(): boolean {
  const on = useGameStore.getState().narrationOn;
  if (!on) { dbg("narrationEnabled: narrationOn=false"); return false; }
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) return true;
  return ttsSupported();
}

export function narrate(text: string, lang: NarrationLang = "en-US") {
  dbg(`narrate("${text.slice(0, 25)}")`);
  if (!narrationEnabled() || !text) { dbg("narrate: blocked"); return; }
  speak(text, { lang, rate: 0.85 });
}

export function narrateMistake(text: string, lang: NarrationLang = "en-US") {
  playRetry(useGameStore.getState().soundOn);
  if (!narrationEnabled() || !text) return;
  setTimeout(() => speak(text, { lang, rate: 0.85 }), 450);
}

export function narrateCelebration(text: string, lang: NarrationLang = "en-US") {
  if (!narrationEnabled() || !text) return;
  setTimeout(() => speak(text, { lang, rate: 0.9 }), 600);
}

/**
 * Auto-narration hook.
 *
 * Android WebView requires a user gesture before speechSynthesis works.
 * The TTS lib queues the utterance if no gesture has happened yet, so
 * it fires on the first tap (profile card, island button, etc.).
 * We use a longer delay (1200ms) on Android to let the WebView settle
 * after navigation — too-early calls land in a suspended audio context.
 *
 * `lastSpoken` ref ensures the same text isn't re-read on re-renders.
 * It resets when `text` genuinely changes (new question, new screen).
 */
export function useAutoNarrate(
  text: string | null | undefined,
  lang: NarrationLang = "en-US",
  delayMs = 1200
) {
  const lastSpoken = useRef<string | null>(null);

  useEffect(() => {
    warmVoices();
    if (!text) return;
    if (text !== lastSpoken.current) {
      lastSpoken.current = null;
    }
    if (lastSpoken.current === text) return;
    if (!narrationEnabled()) return;

    // Native plugin doesn't need gesture unlock — use shorter delay
    const delay = Capacitor.isNativePlatform() ? 400 : delayMs;

    const t = setTimeout(() => {
      if (lastSpoken.current === text) return;
      lastSpoken.current = text;
      speak(text, { lang, rate: 0.85 });
    }, delay);

    return () => { clearTimeout(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, lang]);
}

export const MODULE_INTROS = {
  dashboard: "Welcome back! Pick an island to play on.",
  mathJunior: "Let's count together! How many animals do you see? Tap the right number.",
  mathAbacus:
    "This is your abacus! The pink beads are tens and the blue beads are units. Slide beads down to make the number, then press check.",
  mathOlympiad: "Listen to the problem, think carefully, and tap or say your answer!",
  readingJunior: "Match the small letters to the big letters. Drag them, or tap one and then its partner!",
  readingStory: "Pick a story and I will read it to you. Watch the words light up!",
  readingTrace: "Start at the pink number one and follow the moving dot to write the letter.",
  readingTamil: "Tap any card to hear the word in Tamil!",
  logicJunior: "Tap the things in order, from the smallest to the biggest!",
  logicRhythm: "Listen and watch the circles. Tap the drum exactly on the beat!",
  logicPatterns: "Look at the pattern. What comes next? Tap or say it!",
  art: "Time to create! Pick a color and draw whatever you like.",
  stickers: "Here is your suitcase, full of the stickers you have earned!",
} as const;
