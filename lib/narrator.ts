"use client";

/**
 * Narrator — the app-wide interactive narration layer.
 *
 * Built on lib/tts.ts (speechSynthesis), which works in browsers AND
 * the Capacitor Android WebView (androidScheme:'https' gives a secure
 * origin; Android's system TTS supplies en-US / hi-IN / kn-IN / ta-IN
 * voices on most devices).
 *
 * Three entry points:
 *   narrate(text, lang)        — speak now (respects global toggle)
 *   narrateMistake(text, lang) — gentle chime + spoken explanation
 *   useAutoNarrate(text, lang) — hook: auto-read when a screen mounts
 *                                or when `text` changes (new question)
 *
 * The global on/off lives in the Zustand store (narrationOn) so the
 * Parent Dashboard and TopBar control it like sound/music.
 */

import { useEffect, useRef } from "react";
import { speak, stopSpeaking, ttsSupported, warmVoices } from "@/lib/tts";
import { playRetry } from "@/lib/sounds";
import { useGameStore } from "@/store/useGameStore";

export type NarrationLang = "en-US" | "hi-IN" | "kn-IN" | "ta-IN";

function narrationEnabled(): boolean {
  return useGameStore.getState().narrationOn && ttsSupported();
}

/** Speak a line of guidance. Cancels anything currently speaking. */
export function narrate(text: string, lang: NarrationLang = "en-US") {
  if (!narrationEnabled() || !text) return;
  speak(text, { lang, rate: 0.85 });
}

/**
 * Spoken corrective feedback: soft retry tone first (familiar cue),
 * then the explanation. Falls back to tone-only when TTS is absent
 * or narration is off.
 */
export function narrateMistake(text: string, lang: NarrationLang = "en-US") {
  playRetry(useGameStore.getState().soundOn);
  if (!narrationEnabled() || !text) return;
  setTimeout(() => speak(text, { lang, rate: 0.85 }), 450);
}

/** Celebration line for level-ups and big wins. */
export function narrateCelebration(text: string, lang: NarrationLang = "en-US") {
  if (!narrationEnabled() || !text) return;
  setTimeout(() => speak(text, { lang, rate: 0.9 }), 600);
}

/**
 * Auto-narration hook. Reads `text` aloud shortly after mount and
 * again whenever it changes (e.g. a new word problem). The small
 * delay lets enter-animations settle and avoids clobbering reward
 * fanfares. Cleans up on unmount so navigation never leaves a
 * narrator talking over the next screen.
 */
export function useAutoNarrate(
  text: string | null | undefined,
  lang: NarrationLang = "en-US",
  delayMs = 700
) {
  const lastSpoken = useRef<string | null>(null);
  useEffect(() => {
    warmVoices();
    if (!text || text === lastSpoken.current) return;
    if (!narrationEnabled()) return;
    // Commit lastSpoken only when the timeout actually fires — not
    // here. React 18 Strict Mode runs effects as mount→cleanup→mount;
    // if we set lastSpoken eagerly, the cleanup cancels this timeout
    // but the *second* mount sees lastSpoken already equal to `text`
    // and bails out, so nothing is ever spoken (dev-mode only, but
    // confusing). Setting it inside the timeout means the cancelled
    // first attempt never marks itself as "spoken".
    const t = setTimeout(() => {
      lastSpoken.current = text;
      speak(text, { lang, rate: 0.85 });
    }, delayMs);
    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
  }, [text, lang, delayMs]);
}

/** Module welcome lines, read automatically when a screen opens. */
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
