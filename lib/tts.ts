"use client";

/**
 * TTS engine — Web Speech Synthesis, hardened for Capacitor Android WebView.
 *
 * Key Android WebView differences vs Chrome browser:
 *  1. speechSynthesis.speak() is silently ignored until a user gesture
 *  2. onvoiceschanged fires ONCE then never again, or sometimes never
 *  3. Voices must be polled — not just waited for via event
 *  4. Long utterances get cut off — split at sentence boundaries
 */

let userHasInteracted = false;
let pendingUtterance: (() => void) | null = null;
let voicesReady = false;
let voicesPollTimer: any = null;

if (typeof window !== "undefined") {
  // Capture first gesture to unlock WebView audio
  const unlock = () => {
    userHasInteracted = true;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("click", unlock);
    // Fire any queued utterance
    if (pendingUtterance) {
      const fn = pendingUtterance;
      pendingUtterance = null;
      setTimeout(fn, 100);
    }
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
  window.addEventListener("click", unlock, { passive: true });
}

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Poll for voices until they appear — works in WebView where
 *  onvoiceschanged is unreliable. Tries every 200ms for up to 5s. */
function pollVoices(callback: (voices: SpeechSynthesisVoice[]) => void) {
  if (!ttsSupported()) return;
  if (voicesPollTimer) clearInterval(voicesPollTimer);
  let attempts = 0;
  voicesPollTimer = setInterval(() => {
    attempts++;
    const v = window.speechSynthesis.getVoices();
    if (v.length > 0) {
      voicesReady = true;
      clearInterval(voicesPollTimer);
      callback(v);
    } else if (attempts >= 25) {
      // 5 seconds elapsed — give up polling, proceed with no voice
      clearInterval(voicesPollTimer);
      callback([]);
    }
  }, 200);
}

function pickVoice(
  lang: string,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
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
  voices: SpeechSynthesisVoice[],
  onWord?: (i: number) => void,
  onEnd?: () => void
) {
  if (!ttsSupported()) { onEnd?.(); return; }
  window.speechSynthesis.cancel();

  // Split at sentence boundaries to avoid the WebView 60s cutoff bug
  const chunks =
    text.length > 150
      ? (text.match(/[^.!?]+[.!?]*/g) ?? [text])
      : [text];

  let idx = 0;
  const speakNext = () => {
    if (idx >= chunks.length) { onEnd?.(); return; }
    const chunk = chunks[idx++].trim();
    if (!chunk) { speakNext(); return; }
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = lang;
    u.rate = rate;
    u.pitch = 1.05;
    const voice = pickVoice(lang, voices);
    if (voice) u.voice = voice;
    u.onboundary = (e) => {
      if (e.name === "word") onWord?.(e.charIndex);
    };
    u.onend = speakNext;
    u.onerror = (e) => {
      // 'interrupted' is normal when cancel() is called — not a real error
      if (e.error !== "interrupted") onEnd?.();
    };
    window.speechSynthesis.speak(u);
  };
  speakNext();
}

function speakWhenReady(
  text: string,
  lang: string,
  rate: number,
  onWord?: (i: number) => void,
  onEnd?: () => void
) {
  const go = (voices: SpeechSynthesisVoice[]) => {
    if (userHasInteracted) {
      doSpeak(text, lang, rate, voices, onWord, onEnd);
    } else {
      // Queue — fires on next tap anywhere on the screen
      pendingUtterance = () =>
        doSpeak(text, lang, rate, voices, onWord, onEnd);
    }
  };

  if (voicesReady) {
    go(window.speechSynthesis.getVoices());
  } else {
    pollVoices((voices) => go(voices));
  }
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
  speakWhenReady(text, lang, rate, onWord, onEnd);
  return () => stopSpeaking();
}

/** Call at app startup to begin polling voices immediately. */
export function warmVoices() {
  if (!ttsSupported() || voicesReady) return;
  // Start the poll — voices will be cached when they arrive
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) {
    voicesReady = true;
    return;
  }
  // Also set up onvoiceschanged as a belt-and-braces backup
  window.speechSynthesis.onvoiceschanged = () => {
    if (!voicesReady) {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) voicesReady = true;
    }
  };
  pollVoices(() => {}); // kick off polling early
}
