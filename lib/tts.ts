"use client";

/**
 * TTS engine — Web Speech Synthesis, optimized for Android WebView.
 *
 * Android WebView TTS rules:
 *  1. speechSynthesis.speak() is silently ignored until a user gesture
 *     has occurred in the WebView session. We track this with
 *     `userHasInteracted` and queue any early speak() calls so they
 *     fire on the first tap instead of being lost.
 *  2. Voices load asynchronously. warmVoices() must be called early
 *     and again inside onvoiceschanged.
 *  3. Long utterances (~60s+) get cut off by a WebView bug — we work
 *     around by splitting at sentence boundaries if text is long.
 */

let userHasInteracted = false;
let pendingUtterance: (() => void) | null = null;

if (typeof window !== "undefined") {
  const unlock = () => {
    userHasInteracted = true;
    if (pendingUtterance) {
      const fn = pendingUtterance;
      pendingUtterance = null;
      setTimeout(fn, 80); // tiny delay so the gesture fully completes
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("click", unlock);
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
  window.addEventListener("click", unlock, { passive: true });
}

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let voicesLoaded = false;

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (!ttsSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(lang.split("-")[0])) ??
    null
  );
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
  pendingUtterance = null;
}

function doSpeak(
  text: string,
  lang: string,
  rate: number,
  onWord?: (i: number) => void,
  onEnd?: () => void
) {
  if (!ttsSupported()) { onEnd?.(); return; }
  window.speechSynthesis.cancel();

  // Split long text at sentence ends to avoid the WebView 60s cutoff bug
  const chunks = text.length > 200
    ? text.match(/[^.!?]+[.!?]*/g) ?? [text]
    : [text];

  let idx = 0;
  const speakNext = () => {
    if (idx >= chunks.length) { onEnd?.(); return; }
    const u = new SpeechSynthesisUtterance(chunks[idx++].trim());
    u.lang = lang;
    u.rate = rate;
    u.pitch = 1.05;
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;
    u.onboundary = (e) => {
      if (e.name === "word" || e.charIndex !== undefined) onWord?.(e.charIndex);
    };
    u.onend = speakNext;
    u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  };
  speakNext();
}

export function speak(
  text: string,
  {
    lang = "en-US",
    rate = 0.85,
    onWord,
    onEnd,
  }: {
    lang?: string;
    rate?: number;
    onWord?: (charIndex: number) => void;
    onEnd?: () => void;
  } = {}
): () => void {
  if (!ttsSupported()) { onEnd?.(); return () => {}; }

  if (userHasInteracted) {
    doSpeak(text, lang, rate, onWord, onEnd);
  } else {
    // Queue for first touch — replaces any already-queued utterance
    // so only the most recent pending narration fires on unlock
    pendingUtterance = () => doSpeak(text, lang, rate, onWord, onEnd);
  }
  return () => { stopSpeaking(); };
}

/** Call once at app startup and on every screen to pre-load voices. */
export function warmVoices() {
  if (!ttsSupported() || voicesLoaded) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length) { voicesLoaded = true; return; }
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
    voicesLoaded = true;
  };
}
