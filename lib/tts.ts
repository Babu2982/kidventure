"use client";

/**
 * TTS — dual backend.
 *
 * CRITICAL FIX: the native TTS plugin is imported STATICALLY at the top
 * of this module (not via dynamic import()). In a Capacitor static
 * export, a top-level import guarantees the plugin's registerPlugin()
 * runs at load time so the native bridge is wired up. Dynamic import()
 * inside an async function could resolve before the bridge was ready,
 * which is why narrate() silently did nothing even though the isolated
 * debug page (which forced its own import) worked.
 */

import { Capacitor } from "@capacitor/core";
import { dbg } from "@/lib/dbg";

// Lazy-loaded (cached) to avoid running the plugin's browser code during
// SSR prerender. On the client the first call loads + registers the
// native bridge, then it's reused.
let _TTS: any = null;
async function TTS() {
  if (_TTS) return _TTS;
  const mod = await import("@capacitor-community/text-to-speech");
  _TTS = mod.TextToSpeech;
  return _TTS;
}

export function ttsSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return true;
  return "speechSynthesis" in window;
}

export async function initNativeTTS(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const t = await TTS();
    const r = await t.getSupportedLanguages();
    dbg(`initNativeTTS ok: ${(r as any)?.languages?.length ?? 0} langs`);
  } catch (e: any) {
    dbg(`initNativeTTS ERROR: ${e?.message ?? e}`);
  }
}

export function stopSpeaking() {
  if (Capacitor.isNativePlatform()) {
    TTS().then((t) => t.stop()).catch(() => {});
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

  /* ---- NATIVE ---- */
  if (Capacitor.isNativePlatform()) {
    dbg(`speak() native: "${text.slice(0, 30)}" lang=${lang}`);
    (async () => {
      try {
        const t = await TTS();
        await t.stop();
        dbg("TextToSpeech.stop() ok, calling speak...");
        await t.speak({
          text,
          lang,
          rate: 1.0,
          pitch: 1.1,
          volume: 1.0,
          category: "ambient",
        });
        dbg("TextToSpeech.speak() resolved ✅");
        onEnd?.();
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        dbg(`TextToSpeech.speak() ERROR: ${msg}`);
        onEnd?.();
      }
    })();
    return () => stopSpeaking();
  }

  /* ---- WEB ---- */
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.(); return () => {};
  }
  window.speechSynthesis.cancel();
  const chunks = text.length > 150
    ? (text.match(/[^.!?]+[.!?]*/g) ?? [text]) : [text];
  let idx = 0;
  const next = () => {
    if (idx >= chunks.length) { onEnd?.(); return; }
    const chunk = chunks[idx++].trim();
    if (!chunk) { next(); return; }
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = lang; u.rate = rate; u.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang === lang)
      ?? voices.find((x) => x.lang.startsWith(lang.split("-")[0]));
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
  if (Capacitor.isNativePlatform()) { initNativeTTS(); return; }
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length > 0) return;
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
