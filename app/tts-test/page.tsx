"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

type LogEntry = { time: string; msg: string; ok: boolean };

export default function TTSTestPage() {
  const router = useRouter();
  const [log, setLog] = useState<LogEntry[]>([]);
  const [voices, setVoices] = useState<string[]>([]);

  const addLog = (msg: string, ok = true) =>
    setLog((l) => [{ time: new Date().toLocaleTimeString(), msg, ok }, ...l]);

  useEffect(() => {
    addLog(`Platform: ${Capacitor.getPlatform()}`);
    addLog(`isNative: ${Capacitor.isNativePlatform()}`);
    addLog(`Protocol: ${location.protocol}`);
    addLog(`speechSynthesis: ${"speechSynthesis" in window}`);

    // immediately try getVoices
    const v = window.speechSynthesis?.getVoices() ?? [];
    addLog(`getVoices() now: ${v.length}`, v.length > 0);
    if (v.length) setVoices(v.map(x => `${x.name} (${x.lang})`));

    window.speechSynthesis?.getVoices && (window.speechSynthesis.onvoiceschanged = () => {
      const v2 = window.speechSynthesis.getVoices();
      addLog(`onvoiceschanged: ${v2.length}`, v2.length > 0);
      if (v2.length) setVoices(v2.map(x => `${x.name} (${x.lang})`));
    });

    // try native TTS plugin
    if (Capacitor.isNativePlatform()) {
      addLog("Trying native TTS plugin...");
      import("@capacitor-community/text-to-speech").then(({ TextToSpeech }) => {
        addLog("Plugin imported OK");
        TextToSpeech.getSupportedLanguages()
          .then((r: any) => addLog(`Supported langs: ${JSON.stringify(r).slice(0,80)}`))
          .catch((e: any) => addLog(`getSupportedLanguages error: ${e?.message ?? e}`, false));
      }).catch((e: any) => addLog(`Plugin import failed: ${e?.message ?? e}`, false));
    } else {
      addLog("Not native — skipping native plugin test");
    }
  }, []);

  const testWebTTS = (lang: string, text: string) => {
    addLog(`Web speak() lang=${lang}`);
    const ss = window.speechSynthesis;
    if (!ss) { addLog("No speechSynthesis!", false); return; }
    ss.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.85;
    const all = ss.getVoices();
    const voice = all.find(v => v.lang === lang) ?? all.find(v => v.lang.startsWith(lang.split("-")[0]));
    if (voice) { u.voice = voice; addLog(`Voice: ${voice.name}`); }
    else addLog(`No voice for ${lang} — using default`, false);
    u.onstart = () => addLog("▶ onstart");
    u.onend = () => addLog("⏹ onend");
    u.onerror = (e) => addLog(`❌ onerror: ${e.error}`, false);
    ss.speak(u);
    setTimeout(() => addLog(`speaking=${ss.speaking} pending=${ss.pending}`), 300);
  };

  const testNativeTTS = async (lang: string, text: string) => {
    addLog(`Native speak() lang=${lang}`);
    try {
      const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
      await TextToSpeech.stop();
      await TextToSpeech.speak({ text, lang, rate: 1.0, pitch: 1.1, volume: 1.0, category: "ambient" });
      addLog("Native speak() resolved ✅");
    } catch(e: any) {
      addLog(`Native speak() error: ${e?.message ?? e}`, false);
    }
  };

  const testMic = () => {
    addLog("Testing mic (web STT)...");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { addLog("No SpeechRecognition in WebView", false); return; }
    const r = new SR();
    r.lang = "en-US";
    r.onstart = () => addLog("Mic started — speak!");
    r.onresult = (e: any) => addLog(`Heard: "${e.results[0][0].transcript}" ✅`);
    r.onerror = (e: any) => addLog(`Mic error: ${e.error}`, false);
    r.onend = () => addLog("Mic ended");
    try { r.start(); } catch(e: any) { addLog(`Mic start failed: ${e.message}`, false); }
  };

  const testNativeMic = async () => {
    addLog("Testing native STT plugin...");
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      const avail = await SpeechRecognition.available();
      addLog(`STT available: ${JSON.stringify(avail)}`);
      const perm = await SpeechRecognition.requestPermissions();
      addLog(`Permission: ${JSON.stringify(perm)}`);
      if (perm.speechRecognition !== "granted") { addLog("Mic denied!", false); return; }
      addLog("Starting STT — speak now...");
      const res = await SpeechRecognition.start({ language: "en-US", maxResults: 1, partialResults: false, popup: false });
      addLog(`Result: ${JSON.stringify(res)}`);
    } catch(e: any) {
      addLog(`Native STT error: ${e?.message ?? e}`, false);
    }
  };

  const isNative = Capacitor.isNativePlatform();

  return (
    <main className="min-h-dvh bg-slate-900 p-3 flex flex-col gap-3 font-mono text-xs">
      <div className="flex items-center justify-between">
        <h1 className="text-white font-bold text-sm">🔬 Full Debug Panel</h1>
        <button onClick={() => router.back()} className="bg-slate-700 text-white rounded px-2 py-1">Back</button>
      </div>

      {/* Test buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => testWebTTS("en-US", "Hello from web TTS")}
          className="bg-blue-600 text-white rounded-lg p-2 text-xs active:bg-blue-700">
          🌐 Web TTS English
        </button>
        <button onClick={() => testWebTTS("hi-IN", "नमस्ते")}
          className="bg-blue-600 text-white rounded-lg p-2 text-xs active:bg-blue-700">
          🌐 Web TTS Hindi
        </button>
        {isNative && <>
          <button onClick={() => testNativeTTS("en-US", "Hello from native engine")}
            className="bg-green-600 text-white rounded-lg p-2 text-xs active:bg-green-700">
            🤖 Native TTS English
          </button>
          <button onClick={() => testNativeTTS("hi-IN", "नमस्ते")}
            className="bg-green-600 text-white rounded-lg p-2 text-xs active:bg-green-700">
            🤖 Native TTS Hindi
          </button>
          <button onClick={testNativeMic}
            className="bg-purple-600 text-white rounded-lg p-2 text-xs active:bg-purple-700 col-span-2">
            🎤 Native STT Plugin Test
          </button>
        </>}
        <button onClick={testMic}
          className="bg-orange-600 text-white rounded-lg p-2 text-xs active:bg-orange-700 col-span-2">
          🎤 Web STT Test
        </button>
      </div>

      {/* Voices */}
      {voices.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-2 max-h-24 overflow-y-auto">
          <p className="text-green-400 mb-1">Voices ({voices.length}):</p>
          {voices.slice(0, 8).map((v, i) => <p key={i} className="text-slate-300">{v}</p>)}
        </div>
      )}

      {/* Log */}
      <div className="flex-1 bg-slate-800 rounded-lg p-2 overflow-y-auto max-h-[60vh]">
        <p className="text-slate-400 mb-1">Event log (newest first):</p>
        {log.map((l, i) => (
          <p key={i} className={l.ok ? "text-green-300" : "text-red-400"}>
            {l.time} {l.msg}
          </p>
        ))}
      </div>
    </main>
  );
}
