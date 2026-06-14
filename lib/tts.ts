"use client";

/**
 * TTS engine — dual backend:
 *
 *  NATIVE (Capacitor Android/iOS):
 *    @capacitor-community/text-to-speech → calls Android TTS Java API
 *    directly, bypassing the WebView sandbox. This is why Samsung
 *    WebView shows 0 voices while Chrome shows 92 — they use different
 *    TTS process contexts. The native plugin uses the SYSTEM TTS
 *    engine regardless of WebView, so it always works.
 *
 *  WEB (Chrome / Edge / Safari):
 *    Standard speechSynthesis API. Works fine in browsers.
 *
 * Both backends expose the same speak() / stopSpeaking() surface
 * so all calling code is unchanged.
 */

import { Capacitor } from "@capacitor/core";

let nativeTTS: any = null;
let nativeTTSReady = false;

async function getNativeTTS() {
  if (nativeTTS) return nativeTTS;
  const mod = await import("@capacitor-community/text-to-speech");
  nativeTTS = mod.TextToSpeech;
  return nativeTTS;
}

/** Initialize native TTS engine once at startup. */
export async function initNativeTTS(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const tts = await getNativeTTS();
    // getSupportedLanguages warms up the engine
    await tts.getSupportedLanguages();
    nativeTTSReady = true;
  } catch (e) {
    console.warn("Native TTS init failed:", e);
  }
}

export function ttsSupported(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking() {
  if (Capacitor.isNativePlatform()) {
    getNativeTTS().then((tts) => tts.stop()).catch(() => {});
    return;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speak text. On Android uses the native TTS plugin directly.
 * On web uses speechSynthesis with voice polling.
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
  if (!text) { onEnd?.(); return () => {}; }

  /* ---- Native path ---- */
  if (Capacitor.isNativePlatform()) {
    (async () => {
      try {
        const tts = await getNativeTTS();
        await tts.stop(); // cancel anything playing
        await tts.speak({
          text,
          lang,
          rate: rate * 1.0,  // native rate is 0–2, same scale
          pitch: 1.1,
          volume: 1.0,
          category: "ambient",
        });
        onEnd?.();
      } catch (e: any) {
        // 'interrupted' = normal when stop() called mid-speech
        if (!String(e?.message ?? e).includes("interrupted")) {
          console.warn("Native TTS speak error:", e);
        }
        onEnd?.();
      }
    })();
    return () => stopSpeaking();
  }

  /* ---- Web path ---- */
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return () => {};
  }

  window.speechSynthesis.cancel();

  // Split long text at sentence boundaries (WebView 60s cutoff bug)
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
    // Pick voice from cached list
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang === lang) ??
      voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
    if (voice) u.voice = voice;
    u.onboundary = (e) => { if (e.name === "word") onWord?.(e.charIndex); };
    u.onend = speakNext;
    u.onerror = (e) => { if (e.error !== "interrupted") onEnd?.(); };
    window.speechSynthesis.speak(u);
  };
  speakNext();
  return () => window.speechSynthesis.cancel();
}

/** Warm up web voices (no-op on native). */
export function warmVoices() {
  if (Capacitor.isNativePlatform()) {
    // Warm up native engine instead
    initNativeTTS();
    return;
  }
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return;
  window.speechSynthesis.onvoiceschanged = () =>
    window.speechSynthesis.getVoices();
}
