"use client";

/**
 * Thin wrapper over the Web Speech API (speechSynthesis).
 * Works in Chrome desktop/mobile and Android WebView (the system TTS
 * engine provides voices, including hi-IN, kn-IN and ta-IN on most
 * Indian Android devices). Degrades silently when unavailable.
 */

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

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
}

/**
 * Speak `text`, firing onWord(charIndex) at each word boundary so the
 * UI can highlight the active word, and onEnd when finished.
 * Returns a cancel function.
 */
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
  if (!ttsSupported()) {
    onEnd?.();
    return () => {};
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  u.pitch = 1.1;
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;

  u.onboundary = (e) => {
    if (e.name === "word" || e.charIndex !== undefined) onWord?.(e.charIndex);
  };
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();

  window.speechSynthesis.speak(u);
  return () => window.speechSynthesis.cancel();
}

/** Voice lists load asynchronously; call once early to warm them up. */
export function warmVoices() {
  if (!ttsSupported()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () =>
    window.speechSynthesis.getVoices();
}
