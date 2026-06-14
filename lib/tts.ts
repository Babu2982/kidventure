"use client";

/**
 * TTS — dual backend.
 *
 * NATIVE (Capacitor): @capacitor-community/text-to-speech
 *   Calls Android TTS Java API directly. No gesture unlock needed.
 *   No speechSynthesis used at all on native.
 *
 * WEB (Chrome/Edge/Safari): speechSynthesis API.
 */

import { Capacitor } from "@capacitor/core";

let _nativeTTS: any = null;

async function getNativeTTS() {
  if (_nativeTTS) return _nativeTTS;
  const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
  _nativeTTS = TextToSpeech;
  return _nativeTTS;
}

export function ttsSupported(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export async function initNativeTTS(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const tts = await getNativeTTS();
    await tts.getSupportedLanguages();
  } catch (e) {
    console.warn("initNativeTTS:", e);
  }
}

export function stopSpeaking() {
  if (Capacitor.isNativePlatform()) {
    getNativeTTS().then((t: any) => t.stop()).catch(() => {});
    return;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
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
  if (!text) { onEnd?.(); return () => {}; }

  /* ---- NATIVE path: direct Java TTS, no WebView sandbox ---- */
  if (Capacitor.isNativePlatform()) {
    getNativeTTS().then(async (tts: any) => {
      try {
        await tts.stop();
        await tts.speak({
          text,
          lang,
          rate: 1.0,
          pitch: 1.1,
          volume: 1.0,
          category: "ambient",
        });
        onEnd?.();
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        if (!msg.includes("interrupted")) console.warn("TTS speak:", msg);
        onEnd?.();
      }
    }).catch((e: any) => {
      console.warn("TTS plugin load:", e);
      onEnd?.();
    });
    return () => stopSpeaking();
  }

  /* ---- WEB path: speechSynthesis ---- */
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.(); return () => {};
  }

  window.speechSynthesis.cancel();
  const chunks = text.length > 150
    ? (text.match(/[^.!?]+[.!?]*/g) ?? [text])
    : [text];

  let idx = 0;
  const next = () => {
    if (idx >= chunks.length) { onEnd?.(); return; }
    const chunk = chunks[idx++].trim();
    if (!chunk) { next(); return; }
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = lang; u.rate = rate; u.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((v) => v.lang === lang)
      ?? voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
    if (v) u.voice = v;
    u.onboundary = (e) => { if (e.name === "word") onWord?.(e.charIndex); };
    u.onend = next;
    u.onerror = (e) => { if (e.error !== "interrupted") onEnd?.(); };
    window.speechSynthesis.speak(u);
  };
  next();
  return () => window.speechSynthesis.cancel();
}

export function warmVoices() {
  if (Capacitor.isNativePlatform()) {
    initNativeTTS();
    return;
  }
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length > 0) return;
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
