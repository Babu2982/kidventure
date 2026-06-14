"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { speak, initNativeTTS, stopSpeaking } from "@/lib/tts";

type Result = { label: string; ok: boolean; detail: string };

export default function TTSTestPage() {
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);
  const [voices, setVoices] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [micLog, setMicLog] = useState<string[]>([]);

  const addLog = (msg: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()}: ${msg}`, ...l]);
  const addMicLog = (msg: string) =>
    setMicLog((l) => [`${new Date().toLocaleTimeString()}: ${msg}`, ...l]);
  const addResult = (r: Result) => setResults((rs) => [...rs, r]);

  useEffect(() => {
    const hasAPI = typeof window !== "undefined" && "speechSynthesis" in window;
    addResult({ label: "speechSynthesis API", ok: hasAPI, detail: hasAPI ? "✅ available" : "❌ missing" });

    const isNative = Capacitor.isNativePlatform();
    addResult({ label: "Running as native Capacitor", ok: isNative, detail: isNative ? "✅ native APK" : "⚠️ browser (expected on web)" });

    addResult({ label: "Protocol", ok: location.protocol === "https:", detail: location.protocol + "//" + location.host });

    // User agent — tells us WebView version
    addResult({ label: "User Agent", ok: true, detail: navigator.userAgent.slice(0, 80) });

    if (!hasAPI) return;

    // Immediate check
    const v0 = window.speechSynthesis.getVoices();
    addLog(`Immediate getVoices(): ${v0.length}`);

    if (v0.length > 0) {
      setVoices(v0.map((x) => `${x.name} (${x.lang})`));
      addResult({ label: "Voices (immediate)", ok: true, detail: `${v0.length} voices` });
      return;
    }

    addResult({ label: "Voices (immediate)", ok: false, detail: "0 — starting poll + event listener" });

    // onvoiceschanged
    window.speechSynthesis.onvoiceschanged = () => {
      const vv = window.speechSynthesis.getVoices();
      addLog(`onvoiceschanged: ${vv.length}`);
      if (vv.length > 0) {
        setVoices(vv.map((x) => `${x.name} (${x.lang})`));
        addResult({ label: "Voices via onvoiceschanged", ok: true, detail: `${vv.length}` });
      }
    };

    // Poll every 300ms for 10 seconds
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const vp = window.speechSynthesis.getVoices();
      addLog(`Poll ${attempts}: ${vp.length} voices`);
      if (vp.length > 0) {
        clearInterval(poll);
        setVoices(vp.map((x) => `${x.name} (${x.lang})`));
        addResult({ label: `Voices after poll #${attempts}`, ok: true, detail: `${vp.length}` });
      } else if (attempts >= 33) {
        clearInterval(poll);
        addResult({
          label: "Voices after 10s",
          ok: false,
          detail: "❌ Still 0. Samsung WebView TTS engine likely disabled. See fix below.",
        });
        addResult({
          label: "📱 Fix for Samsung",
          ok: false,
          detail: "Settings → Apps → Samsung Text-to-speech → Enable / Update. OR install Google TTS from Play Store.",
        });
      }
    }, 300);
  }, []);

  const testSpeak = (text: string, lang: string, label: string) => {
    addLog(`▶ speak("${text.slice(0, 30)}…", ${lang})`);
    const ss = window.speechSynthesis;
    ss.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.85;
    const all = ss.getVoices();
    addLog(`getVoices at speak time: ${all.length}`);
    const voice = all.find((v) => v.lang === lang) ?? all.find((v) => v.lang.startsWith(lang.split("-")[0]));
    if (voice) { u.voice = voice; addLog(`Voice: ${voice.name}`); }
    else addLog(`No matching voice for ${lang} — using default`);
    u.onstart = () => addLog(`✅ onstart`);
    u.onend = () => addLog(`⏹ onend`);
    u.onerror = (e) => addLog(`❌ onerror: ${e.error}`);
    ss.speak(u);
    setTimeout(() => addLog(`speaking=${ss.speaking} pending=${ss.pending} paused=${ss.paused}`), 200);
  };

  // Mic test using Web Speech Recognition (browser only)
  const testMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { addMicLog("❌ SpeechRecognition not available in this WebView"); return; }
    addMicLog("Starting recognition…");
    const r = new SR();
    r.lang = "en-US";
    r.onstart = () => addMicLog("✅ Mic started — speak now!");
    r.onresult = (e: any) => addMicLog(`✅ Heard: "${e.results[0][0].transcript}"`);
    r.onerror = (e: any) => addMicLog(`❌ Error: ${e.error}`);
    r.onend = () => addMicLog("Mic ended");
    try { r.start(); } catch (e: any) { addMicLog(`❌ start() threw: ${e.message}`); }
  };

  return (
    <main className="min-h-dvh bg-slate-100 p-4 flex flex-col gap-4 font-body text-sm">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl text-slate-700">🔬 TTS + Mic Diagnostic</h1>
        <button onClick={() => router.back()} className="bg-white rounded-xl px-3 py-2 shadow text-xs">← Back</button>
      </div>

      {/* Environment */}
      <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-2">
        <h2 className="font-display text-base text-slate-600">Environment</h2>
        {results.map((r, i) => (
          <div key={i} className={`rounded-xl px-3 py-2 text-xs break-all ${r.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            <span className="font-semibold">{r.label}:</span> {r.detail}
          </div>
        ))}
      </div>

      {/* TTS buttons */}
      <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-2">
        <h2 className="font-display text-base text-slate-600">TTS Tests — tap each</h2>
        {[
          ["Hello, can you hear me now?", "en-US", "🇬🇧 English"],
          ["नमस्ते", "hi-IN", "🇮🇳 Hindi"],
          ["ನಮಸ್ಕಾರ", "kn-IN", "🌼 Kannada"],
          ["வணக்கம்", "ta-IN", "🛕 Tamil"],
        ].map(([text, lang, label]) => (
          <button key={lang} onClick={() => testSpeak(text as string, lang as string, label as string)}
            className="bg-sky-50 rounded-xl px-4 py-3 text-left active:bg-sky-100">
            {label}
          </button>
        ))}
        <button onClick={async () => {
          addLog("Testing NATIVE TTS plugin directly...");
          if (Capacitor.isNativePlatform()) {
            try {
              await initNativeTTS();
              addLog("Native TTS initialized");
              speak("Hello from the native engine!", { lang: "en-US", onEnd: () => addLog("Native TTS onEnd fired") });
              addLog("Native speak() called");
            } catch(e: any) { addLog("Native TTS error: " + e.message); }
          } else {
            addLog("Not on native platform — using web TTS");
            speak("Hello from web speech synthesis", { lang: "en-US", onEnd: () => addLog("Web TTS onEnd") });
          }
        }} className="bg-green-100 rounded-xl px-4 py-3 text-left text-green-800 font-semibold">
          🤖 Test NATIVE TTS Plugin (bypasses WebView)
        </button>
        <button onClick={() => { stopSpeaking(); addLog("stopped"); }}
          className="bg-red-50 rounded-xl px-4 py-3 text-left text-red-700">⏹ Stop (web)</button>
      </div>

      {/* Mic test */}
      <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-2">
        <h2 className="font-display text-base text-slate-600">Mic Test (web STT)</h2>
        <button onClick={testMic} className="bg-berry/10 rounded-xl px-4 py-3 text-left active:bg-berry/20">
          🎤 Tap and speak
        </button>
        <div className="bg-slate-800 rounded-xl p-3 max-h-28 overflow-y-auto">
          {micLog.length === 0
            ? <span className="text-slate-500 text-xs">Tap mic button above…</span>
            : micLog.map((l, i) => <div key={i} className="text-xs text-green-300 font-mono">{l}</div>)}
        </div>
      </div>

      {/* Voices */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-display text-base text-slate-600 mb-2">Voices ({voices.length})</h2>
        {voices.length === 0
          ? <p className="text-xs text-slate-400">None yet — tap a TTS button or wait for polling…</p>
          : <div className="max-h-36 overflow-y-auto flex flex-col gap-1">
              {voices.map((v, i) => <span key={i} className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">{v}</span>)}
            </div>}
      </div>

      {/* Event log */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h2 className="font-display text-base text-slate-300 mb-2">Event log</h2>
        <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
          {log.length === 0
            ? <span className="text-slate-500 text-xs">Tap a test above…</span>
            : log.map((l, i) => <div key={i} className="text-xs text-green-300 font-mono">{l}</div>)}
        </div>
      </div>
    </main>
  );
}
