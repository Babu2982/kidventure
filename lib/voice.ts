"use client";

/**
 * Voice — centralized speech-to-text service.
 *
 * KEY PLATFORM FACT: the Web Speech *Recognition* API does NOT exist
 * inside the Android WebView (only synthesis does). So this module is
 * an abstraction over two backends:
 *
 *   1. Native (Capacitor Android/iOS): @capacitor-community/
 *      speech-recognition → Android's on-device SpeechRecognizer.
 *      Requires RECORD_AUDIO permission (added to AndroidManifest).
 *   2. Web (Chrome desktop/Android browser): webkitSpeechRecognition.
 *
 * Both expose the same surface here: sttSupported(), requestMic(),
 * and listenOnce({lang, onResult, ...}).
 */

import { Capacitor } from "@capacitor/core";

type ListenOpts = {
  lang?: string; // BCP-47, e.g. "en-US", "hi-IN"
  onResult: (transcript: string) => void;
  onError?: (reason: string) => void;
  onEnd?: () => void;
  maxMs?: number;
};

let webRec: any = null;
let nativeAvailable: boolean | null = null;

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

async function getNativePlugin() {
  const mod = await import("@capacitor-community/speech-recognition");
  return mod.SpeechRecognition;
}

/** Cheap synchronous capability check for rendering mic buttons. */
export function sttSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (isNative()) return nativeAvailable !== false; // optimistic until probed
  return !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

/** Probe native availability + permission once at startup (no-op on web). */
export async function initVoice(): Promise<void> {
  if (!isNative()) return;
  try {
    const sr = await getNativePlugin();
    const { available } = await sr.available();
    nativeAvailable = available;
  } catch {
    nativeAvailable = false;
  }
}

/** Ask for microphone permission. Returns true when granted. */
export async function requestMic(): Promise<boolean> {
  if (isNative()) {
    try {
      const sr = await getNativePlugin();
      const { speechRecognition } = await sr.requestPermissions();
      return speechRecognition === "granted";
    } catch {
      return false;
    }
  }
  // Web: permission is requested implicitly when recognition starts.
  return true;
}

/**
 * Listen for a single utterance, then stop. Exactly one of onResult /
 * onError fires, followed by onEnd. Returns a cancel function.
 */
export function listenOnce(opts: ListenOpts): () => void {
  const { lang = "en-US", onResult, onError, onEnd, maxMs = 7000 } = opts;
  let finished = false;
  const finish = (cb?: () => void) => {
    if (finished) return;
    finished = true;
    cb?.();
    onEnd?.();
  };

  /* ---------- native path ---------- */
  if (isNative()) {
    let cancelled = false;
    (async () => {
      try {
        const sr = await getNativePlugin();
        const perm = await sr.requestPermissions();
        if (perm.speechRecognition !== "granted") {
          finish(() => onError?.("mic-denied"));
          return;
        }
        const res = await sr.start({
          language: lang,
          maxResults: 1,
          partialResults: false,
          popup: false,
        });
        if (cancelled) return;
        const text = res?.matches?.[0] ?? "";
        if (text) finish(() => onResult(text));
        else finish(() => onError?.("no-speech"));
      } catch (e) {
        finish(() => onError?.("native-error"));
      }
    })();
    const timeout = setTimeout(async () => {
      try {
        const sr = await getNativePlugin();
        await sr.stop();
      } catch {}
      finish(() => onError?.("timeout"));
    }, maxMs);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      getNativePlugin().then((sr) => sr.stop()).catch(() => {});
      finish();
    };
  }

  /* ---------- web path ---------- */
  const SR =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    finish(() => onError?.("unsupported"));
    return () => {};
  }
  try {
    webRec?.abort?.();
  } catch {}
  const rec = new SR();
  webRec = rec;
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  rec.continuous = false;

  const timeout = setTimeout(() => {
    try { rec.abort(); } catch {}
    finish(() => onError?.("timeout"));
  }, maxMs);

  rec.onresult = (e: any) => {
    clearTimeout(timeout);
    const alts: string[] = [];
    for (let i = 0; i < e.results[0].length; i++)
      alts.push(e.results[0][i].transcript);
    finish(() => onResult(alts.join(" | ")));
  };
  rec.onerror = (e: any) => {
    clearTimeout(timeout);
    finish(() => onError?.(e?.error ?? "error"));
  };
  rec.onend = () => {
    clearTimeout(timeout);
    finish();
  };
  try {
    rec.start();
  } catch {
    clearTimeout(timeout);
    finish(() => onError?.("start-failed"));
  }
  return () => {
    clearTimeout(timeout);
    try { rec.abort(); } catch {}
    finish();
  };
}

/* ====================================================================
   Matching helpers
   ==================================================================== */

const norm = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

/** Levenshtein distance. */
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

/** 0–1 similarity between spoken transcript and target phrase. */
export function similarity(spoken: string, target: string): number {
  const a = norm(spoken), b = norm(target);
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 1;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, tree: 3,
  four: 4, for: 4, five: 5, six: 6, seven: 7, eight: 8, ate: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80,
  ninety: 90, hundred: 100,
};

/**
 * Extract a number from a speech transcript. Handles digits ("12"),
 * single words ("twelve", homophones like "for"→4), and simple
 * compounds ("twenty one", "forty-five").
 */
export function numberFromSpeech(transcript: string): number | null {
  const t = norm(transcript).replace(/-/g, " ");
  const digit = t.match(/\d+/);
  if (digit) return parseInt(digit[0], 10);
  const words = t.split(" ");
  let total: number | null = null;
  for (let i = 0; i < words.length; i++) {
    const v = NUMBER_WORDS[words[i]];
    if (v === undefined) {
      if (total !== null) break;
      continue;
    }
    if (total === null) total = 0;
    if (v >= 20 && v < 100 && NUMBER_WORDS[words[i + 1]] !== undefined && NUMBER_WORDS[words[i + 1]] < 10) {
      total += v + NUMBER_WORDS[words[i + 1]];
      i++;
    } else {
      total += v;
    }
  }
  return total;
}
