"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

/**
 * /tts-test — a standalone diagnostic page that tests the TTS stack
 * layer by layer directly on the device, with visible results.
 * Access it by typing /tts-test in the browser or navigating to it.
 * Remove after debugging is complete.
 */

type Result = { label: string; ok: boolean; detail: string };

export default function TTSTestPage() {
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);
  const [voices, setVoices] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()}: ${msg}`, ...l]);

  const addResult = (r: Result) => setResults((rs) => [...rs, r]);

  useEffect(() => {
    // Layer 1: basic API availability
    const hasAPI = typeof window !== "undefined" && "speechSynthesis" in window;
    addResult({
      label: "speechSynthesis API exists",
      ok: hasAPI,
      detail: hasAPI ? "✅ available" : "❌ missing — WebView may lack TTS",
    });

    // Layer 2: Capacitor platform
    const isNative = Capacitor.isNativePlatform();
    addResult({
      label: "Running as native app",
      ok: isNative,
      detail: isNative ? "✅ Capacitor native" : "⚠️ Running in browser (expected if testing on web)",
    });

    // Layer 3: androidScheme
    const scheme = window.location.protocol;
    addResult({
      label: `Page served over ${scheme}`,
      ok: scheme === "https:",
      detail: scheme === "https:" ? "✅ secure origin (TTS allowed)" : `⚠️ ${scheme} — may block TTS on some devices`,
    });

    if (!hasAPI) return;

    // Layer 4: getVoices immediately
    const v = window.speechSynthesis.getVoices();
    addLog(`getVoices() immediately: ${v.length} voices`);
    if (v.length > 0) {
      setVoices(v.map((x) => `${x.name} (${x.lang})`));
      addResult({ label: "Voices loaded immediately", ok: true, detail: `${v.length} voices` });
    } else {
      addResult({ label: "Voices loaded immediately", ok: false, detail: "0 — waiting for onvoiceschanged" });
      window.speechSynthesis.onvoiceschanged = () => {
        const v2 = window.speechSynthesis.getVoices();
        addLog(`onvoiceschanged fired: ${v2.length} voices`);
        setVoices(v2.map((x) => `${x.name} (${x.lang})`));
        addResult({ label: "Voices after onvoiceschanged", ok: v2.length > 0, detail: `${v2.length} voices` });
      };
    }
  }, []);

  const testSpeak = (text: string, lang: string) => {
    addLog(`speak("${text}", lang=${lang})`);
    const ss = window.speechSynthesis;
    ss.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.85;
    u.pitch = 1.0;
    // Try to pick a matching voice
    const all = ss.getVoices();
    const voice = all.find((v) => v.lang === lang) ?? all.find((v) => v.lang.startsWith(lang.split("-")[0]));
    if (voice) { u.voice = voice; addLog(`Using voice: ${voice.name}`); }
    else addLog(`No voice for ${lang} — using default`);
    u.onstart = () => addLog("▶️ onstart fired");
    u.onend = () => addLog("⏹️ onend fired");
    u.onerror = (e) => addLog(`❌ onerror: ${e.error}`);
    u.onpause = () => addLog("⏸️ onpause fired");
    ss.speak(u);
    addLog(`paused=${ss.paused} pending=${ss.pending} speaking=${ss.speaking}`);
  };

  return (
    <main className="min-h-dvh bg-slate-100 p-4 flex flex-col gap-4 font-body">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-slate-700">🔬 TTS Diagnostic</h1>
        <button onClick={() => router.back()} className="bg-white rounded-xl px-3 py-2 text-sm shadow">
          ← Back
        </button>
      </div>

      {/* Layer results */}
      <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-2">
        <h2 className="font-display text-lg text-slate-600">Environment checks</h2>
        {results.map((r, i) => (
          <div key={i} className={`rounded-xl px-3 py-2 text-sm ${r.ok ? "bg-green-50" : "bg-red-50"}`}>
            <span className="font-semibold">{r.label}:</span> {r.detail}
          </div>
        ))}
      </div>

      {/* Test buttons */}
      <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3">
        <h2 className="font-display text-lg text-slate-600">Manual TTS tests (tap each)</h2>
        {[
          ["Hello! Can you hear me?", "en-US", "🇬🇧 English"],
          ["नमस्ते, क्या आप मुझे सुन सकते हैं?", "hi-IN", "🇮🇳 Hindi"],
          ["ನಮಸ್ಕಾರ, ನೀವು ನನ್ನ ಮಾತು ಕೇಳಬಲ್ಲಿರಾ?", "kn-IN", "🌼 Kannada"],
          ["வணக்கம், என்னை கேட்க முடியுமா?", "ta-IN", "🛕 Tamil"],
        ].map(([text, lang, label]) => (
          <button
            key={lang}
            onClick={() => testSpeak(text as string, lang as string)}
            className="bg-sky-100 rounded-xl px-4 py-3 text-left font-display text-slate-700 active:bg-sky-200"
          >
            {label} — tap to hear
          </button>
        ))}
        <button
          onClick={() => { window.speechSynthesis.cancel(); addLog("cancel() called"); }}
          className="bg-red-100 rounded-xl px-4 py-3 text-left font-display text-red-700"
        >
          ⏹️ Stop all speech
        </button>
      </div>

      {/* Voices list */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-display text-lg text-slate-600 mb-2">
          Available voices ({voices.length})
        </h2>
        {voices.length === 0 ? (
          <p className="text-sm text-slate-400">None loaded yet — tap a test button first</p>
        ) : (
          <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
            {voices.map((v, i) => (
              <span key={i} className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">{v}</span>
            ))}
          </div>
        )}
      </div>

      {/* Event log */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h2 className="font-display text-lg text-slate-300 mb-2">Event log</h2>
        <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
          {log.length === 0 ? (
            <span className="text-slate-500 text-xs">Tap a test above…</span>
          ) : (
            log.map((l, i) => (
              <span key={i} className="text-xs text-green-300 font-mono">{l}</span>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
