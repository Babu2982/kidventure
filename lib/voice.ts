"use client";

/**
 * Voice (STT). Native plugin imported STATICALLY (same fix as TTS) so
 * its bridge registers at load time.
 */

import { Capacitor } from "@capacitor/core";
import { dbg } from "@/lib/dbg";

// Synchronous require() (same fix as tts.ts) — no hanging import promise,
// no SSR execution since it only runs at call time.
let _SR: any = null;
function SR_get() {
  if (_SR) return _SR;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _SR = require("@capacitor-community/speech-recognition").SpeechRecognition;
  return _SR;
}

type ListenOpts = {
  lang?: string;
  onResult: (transcript: string) => void;
  onError?: (reason: string) => void;
  onEnd?: () => void;
  maxMs?: number;
};

let webRec: any = null;

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function sttSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (isNative()) return true;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export async function initVoice(): Promise<void> {
  if (!isNative()) return;
  try {
    const SpeechRecognition = SR_get();
    const a = await SpeechRecognition.available();
    dbg(`STT available: ${JSON.stringify(a)}`);
  } catch (e: any) {
    dbg(`initVoice ERROR: ${e?.message ?? e}`);
  }
}

export async function requestMic(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const SpeechRecognition = SR_get();
    const p = await SpeechRecognition.requestPermissions();
    dbg(`requestMic: ${JSON.stringify(p)}`);
    return p.speechRecognition === "granted";
  } catch (e: any) {
    dbg(`requestMic ERROR: ${e?.message ?? e}`);
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

  /* ---- NATIVE ---- */
  if (isNative()) {
    dbg(`listenOnce native lang=${lang}`);
    let cancelled = false;
    let SpeechRecognition: any = null;
    let gotResult = false;

    const cleanup = () => {
      try { SpeechRecognition?.removeAllListeners?.(); } catch {}
      try { SpeechRecognition?.stop?.(); } catch {}
    };

    const timeout = setTimeout(() => {
      dbg("listenOnce TIMEOUT");
      cleanup();
      finish(() => onError?.("timeout"));
    }, maxMs);

    (async () => {
      try {
        SpeechRecognition = SR_get();
        dbg("SR plugin loaded, requesting perms...");
        const perm = await SpeechRecognition.requestPermissions();
        dbg(`perm: ${JSON.stringify(perm)}`);
        if (perm.speechRecognition !== "granted") {
          clearTimeout(timeout);
          finish(() => onError?.("mic-denied"));
          return;
        }
        if (cancelled) return;

        // Listen for partial results via the event listener — more
        // reliable on Samsung than awaiting start()'s return value.
        dbg("adding partialResults listener...");
        await SpeechRecognition.addListener("partialResults", (data: any) => {
          const matches: string[] = data?.matches ?? [];
          dbg(`partialResults: ${JSON.stringify(matches).slice(0, 60)}`);
          if (matches.length && matches[0] && !gotResult) {
            gotResult = true;
            clearTimeout(timeout);
            cleanup();
            finish(() => onResult(matches.join(" | ")));
          }
        });

        dbg("calling start() with partialResults...");
        // start() with partialResults true; result comes via listener
        SpeechRecognition.start({
          language: lang,
          maxResults: 3,
          partialResults: true,
          popup: false,
        }).then((res: any) => {
          // Some Android versions also return final matches here
          dbg(`start() resolved: ${JSON.stringify(res).slice(0, 60)}`);
          const matches: string[] = res?.matches ?? [];
          if (matches.length && matches[0] && !gotResult) {
            gotResult = true;
            clearTimeout(timeout);
            cleanup();
            finish(() => onResult(matches.join(" | ")));
          }
        }).catch((e: any) => {
          const msg = String(e?.message ?? e);
          dbg(`start() error: ${msg}`);
          if (!gotResult && !cancelled) {
            clearTimeout(timeout);
            cleanup();
            if (msg.includes("abort") || msg.includes("stop")) finish();
            else finish(() => onError?.(msg));
          }
        });
      } catch (e: any) {
        clearTimeout(timeout);
        dbg(`native STT setup ERROR: ${e?.message ?? e}`);
        if (!cancelled) finish(() => onError?.(String(e?.message ?? e)));
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cleanup();
      finish();
    };
  }

  /* ---- OLD NATIVE (disabled) ---- */
  if (false) {
    dbg(`listenOnce native lang=${lang}`);
    let cancelled = false;
    let SpeechRecognition: any = null;
    const timeout = setTimeout(() => {
      dbg("listenOnce TIMEOUT");
      SpeechRecognition?.stop().catch(() => {});
      finish(() => onError?.("timeout"));
    }, maxMs);

    (async () => {
      try {
        SpeechRecognition = SR_get();
        // permission
        const perm = await SpeechRecognition.requestPermissions();
        dbg(`perm: ${JSON.stringify(perm)}`);
        if (perm.speechRecognition !== "granted") {
          clearTimeout(timeout);
          finish(() => onError?.("mic-denied"));
          return;
        }
        try { await SpeechRecognition.stop(); } catch {}
        await new Promise((r) => setTimeout(r, 150));
        if (cancelled) return;

        dbg("calling SpeechRecognition.start()...");
        const res: any = await SpeechRecognition.start({
          language: lang,
          maxResults: 3,
          partialResults: false,
          popup: false,
        });
        dbg(`start() returned: ${JSON.stringify(res)}`);
        if (cancelled) return;
        clearTimeout(timeout);
        const matches: string[] = res?.matches ?? [];
        if (matches.length && matches[0]) {
          finish(() => onResult(matches.join(" | ")));
        } else {
          finish(() => onError?.("no-speech"));
        }
      } catch (e: any) {
        clearTimeout(timeout);
        const msg = String(e?.message ?? e);
        dbg(`start() ERROR: ${msg}`);
        if (!cancelled) {
          if (msg.includes("aborted") || msg.includes("stop")) finish();
          else finish(() => onError?.(msg));
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      SpeechRecognition?.stop().catch(() => {});
      finish();
    };
  }

  /* ---- WEB ---- */
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) { finish(() => onError?.("unsupported")); return () => {}; }
  try { webRec?.abort?.(); } catch {}
  const rec = new SR();
  webRec = rec;
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  rec.continuous = false;
  const timeout = setTimeout(() => { try { rec.abort(); } catch {}; finish(() => onError?.("timeout")); }, maxMs);
  rec.onresult = (e: any) => {
    clearTimeout(timeout);
    const alts: string[] = [];
    for (let i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript);
    finish(() => onResult(alts.join(" | ")));
  };
  rec.onerror = (e: any) => { clearTimeout(timeout); finish(() => onError?.(e?.error ?? "error")); };
  rec.onend = () => { clearTimeout(timeout); finish(); };
  try { rec.start(); } catch { clearTimeout(timeout); finish(() => onError?.("start-failed")); }
  return () => { clearTimeout(timeout); try { rec.abort(); } catch {}; finish(); };
}

/* ---- matching helpers ---- */
const norm = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
    prev = cur;
  }
  return prev[n];
}
export function similarity(spoken: string, target: string): number {
  const a = norm(spoken), b = norm(target);
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}
const NUMW: Record<string, number> = {
  zero:0,one:1,won:1,two:2,to:2,too:2,three:3,tree:3,four:4,for:4,five:5,six:6,
  seven:7,eight:8,ate:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,
  fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,
  forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,hundred:100,
};
export function numberFromSpeech(t: string): number | null {
  const s = norm(t).replace(/-/g, " ");
  const d = s.match(/\d+/);
  if (d) return parseInt(d[0], 10);
  const w = s.split(" ");
  let total: number | null = null;
  for (let i = 0; i < w.length; i++) {
    const v = NUMW[w[i]];
    if (v === undefined) { if (total !== null) break; continue; }
    if (total === null) total = 0;
    if (v >= 20 && v < 100 && NUMW[w[i+1]] !== undefined && NUMW[w[i+1]] < 10) { total += v + NUMW[w[i+1]]; i++; }
    else total += v;
  }
  return total;
}
