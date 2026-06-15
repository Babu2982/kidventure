// lib/narrationHealth.ts
// Cross-OEM narration probe. Android WebViews vary wildly: Google-TTS devices,
// AOSP/Huawei/budget devices with a different engine or NONE, and a few WebViews
// that hang on plugin calls. This probes once, can never hang, and reports
// "unavailable" cleanly so the app simply runs silent instead of freezing.

import { Capacitor } from '@capacitor/core';

// require() (NOT import) — a dynamic import() of a Capacitor plugin hangs forever
// in the Android WebView. require() runs only at call-time, guarded by native check.
let _TTS: any = null;
function TTS() {
  if (_TTS) return _TTS;
  _TTS = require('@capacitor-community/text-to-speech').TextToSpeech;
  return _TTS;
}

export interface NarrationStatus {
  available: boolean;
  lang: string; // best language to speak in on this device
  reason?: string; // for the parent dashboard / telemetry
}

let cached: NarrationStatus | null = null;

/** Resolve a promise, but give up after `ms` so a stuck WebView never blocks UI. */
export function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(p).catch(() => fallback),
    new Promise<T>((res) => setTimeout(() => res(fallback), ms)),
  ]);
}

function pickLang(langs: string[]): string {
  if (!langs?.length) return 'en-US';
  const prefer = ['en-US', 'en-GB', 'en-IN', 'en'];
  for (const p of prefer) {
    const hit = langs.find((l) => l.toLowerCase().startsWith(p.toLowerCase()));
    if (hit) return hit;
  }
  return langs[0];
}

/** Probe the device TTS engine once. Empty/throw/hang ⇒ unavailable (run silent). */
export async function checkNarration(): Promise<NarrationStatus> {
  if (cached) return cached;

  if (!Capacitor.isNativePlatform()) {
    const ok =
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      window.speechSynthesis.getVoices().length > 0;
    cached = ok
      ? { available: true, lang: 'en-US' }
      : { available: false, lang: 'en-US', reason: 'no-web-voices' };
    return cached;
  }

  try {
    const res = await withTimeout<{ languages: string[] }>(
      TTS().getSupportedLanguages(),
      2500,
      { languages: [] },
    );
    const langs = res?.languages ?? [];
    cached = langs.length
      ? { available: true, lang: pickLang(langs) }
      : { available: false, lang: 'en-US', reason: 'no-engine-or-languages' };
  } catch {
    cached = { available: false, lang: 'en-US', reason: 'probe-failed' };
  }
  return cached;
}
