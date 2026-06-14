"use client";

import { Capacitor } from "@capacitor/core";

type ListenOpts = {
  lang?: string;
  onResult: (transcript: string) => void;
  onError?: (reason: string) => void;
  onEnd?: () => void;
  maxMs?: number;
};

let webRec: any = null;
let nativeAvailable: boolean | null = null;
let permissionGranted: boolean | null = null;

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

async function getNativePlugin() {
  const mod = await import("@capacitor-community/speech-recognition");
  return mod.SpeechRecognition;
}

export function sttSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (isNative()) return true; // optimistic; will degrade gracefully
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

/** Call once at app start to probe + warm up the native recognizer. */
export async function initVoice(): Promise<void> {
  if (!isNative()) return;
  try {
    const sr = await getNativePlugin();
    const { available } = await sr.available();
    nativeAvailable = available;
    if (!available) return;
    // Pre-request permission so the first mic tap doesn't have a
    // jarring permission dialog mid-listening
    const perm = await sr.requestPermissions();
    permissionGranted = perm.speechRecognition === "granted";
  } catch {
    nativeAvailable = false;
  }
}

export async function requestMic(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const sr = await getNativePlugin();
    const perm = await sr.requestPermissions();
    permissionGranted = perm.speechRecognition === "granted";
    return permissionGranted;
  } catch {
    return false;
  }
}

export function listenOnce(opts: ListenOpts): () => void {
  const { lang = "en-US", onResult, onError, onEnd, maxMs = 8000 } = opts;
  let finished = false;
  const finish = (cb?: () => void) => {
    if (finished) return;
    finished = true;
    cb?.();
    onEnd?.();
  };

  /* ---- Native Android path ---- */
  if (isNative()) {
    let cancelled = false;

    const timeout = setTimeout(async () => {
      try { const sr = await getNativePlugin(); await sr.stop(); } catch {}
      finish(() => onError?.("timeout"));
    }, maxMs);

    (async () => {
      try {
        const sr = await getNativePlugin();

        // Ensure permission
        if (permissionGranted !== true) {
          const perm = await sr.requestPermissions();
          permissionGranted = perm.speechRecognition === "granted";
        }
        if (!permissionGranted) {
          clearTimeout(timeout);
          finish(() => onError?.("mic-denied"));
          return;
        }

        // Clean up any previous session
        try { await sr.stop(); } catch {}
        await new Promise((r) => setTimeout(r, 200));
        if (cancelled) return;

        sr.start({
          language: lang,
          maxResults: 3,
          partialResults: false,
          popup: false,
        }).then((res: any) => {
          if (cancelled) return;
          clearTimeout(timeout);
          const matches: string[] = res?.matches ?? [];
          if (matches.length > 0 && matches[0]) {
            finish(() => onResult(matches.join(" | ")));
          } else {
            finish(() => onError?.("no-speech"));
          }
        }).catch((e: any) => {
          if (cancelled) return;
          clearTimeout(timeout);
          const msg = e?.message ?? String(e);
          if (msg.includes("aborted") || msg.includes("stop")) {
            finish(); // normal cancellation
          } else {
            finish(() => onError?.(`native: ${msg}`));
          }
        });

      } catch (e: any) {
        if (!cancelled) {
          clearTimeout(timeout);
          finish(() => onError?.(`init-error: ${e?.message ?? e}`));
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      getNativePlugin().then((sr) => sr.stop()).catch(() => {});
      finish();
    };
  }

  /* ---- Web path (Chrome / Edge) ---- */
  const SR =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  if (!SR) {
    finish(() => onError?.("unsupported"));
    return () => {};
  }
  try { webRec?.abort?.(); } catch {}
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
  rec.onend = () => { clearTimeout(timeout); finish(); };

  try { rec.start(); } catch {
    clearTimeout(timeout);
    finish(() => onError?.("start-failed"));
  }
  return () => {
    clearTimeout(timeout);
    try { rec.abort(); } catch {}
    finish();
  };
}

/* ---- Matching helpers ---- */

const norm = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
    }
    prev = cur;
  }
  return prev[n];
}

export function similarity(spoken: string, target: string): number {
  const a = norm(spoken), b = norm(target);
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 1;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
}

const NUMBER_WORDS: Record<string, number> = {
  zero:0,one:1,won:1,two:2,to:2,too:2,three:3,tree:3,four:4,for:4,
  five:5,six:6,seven:7,eight:8,ate:8,nine:9,ten:10,eleven:11,twelve:12,
  thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,
  nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,
  eighty:80,ninety:90,hundred:100,
};

export function numberFromSpeech(transcript: string): number | null {
  const t = norm(transcript).replace(/-/g, " ");
  const digit = t.match(/\d+/);
  if (digit) return parseInt(digit[0], 10);
  const words = t.split(" ");
  let total: number | null = null;
  for (let i = 0; i < words.length; i++) {
    const v = NUMBER_WORDS[words[i]];
    if (v === undefined) { if (total !== null) break; continue; }
    if (total === null) total = 0;
    if (v >= 20 && v < 100 && NUMBER_WORDS[words[i+1]] !== undefined && NUMBER_WORDS[words[i+1]] < 10) {
      total += v + NUMBER_WORDS[words[i+1]]; i++;
    } else { total += v; }
  }
  return total;
}
