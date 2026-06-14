"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { narrate, type NarrationLang } from "@/lib/narrator";
import { listenOnce, sttSupported, initVoice, requestMic } from "@/lib/voice";
import { playTap } from "@/lib/sounds";
import { useGameStore } from "@/store/useGameStore";

/** Speaker button — taps re-read any prompt aloud. */
export function SpeakButton({
  text,
  lang = "en-US",
  className = "",
}: {
  text: string;
  lang?: NarrationLang;
  className?: string;
}) {
  const soundOn = useGameStore((s) => s.soundOn);
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={() => { playTap(soundOn); narrate(text, lang); }}
      aria-label="Read aloud"
      className={`bg-white rounded-full shadow-chunkySm w-11 h-11 text-xl
        flex items-center justify-center shrink-0 ${className}`}
    >
      🔊
    </motion.button>
  );
}

type MicState = "idle" | "requesting" | "listening" | "denied";

/**
 * MicButton — hands-free answering.
 *
 * On Android (native): uses @capacitor-community/speech-recognition.
 * On web (Chrome/Edge): uses webkitSpeechRecognition.
 * Hides entirely on platforms where neither is available (Firefox).
 *
 * First tap always requests mic permission explicitly so the Android
 * system dialog appears at a natural moment (when the child wants to
 * speak) rather than at app startup.
 */
export function MicButton({
  lang = "en-US",
  onTranscript,
  prompt = "Tap to answer with your voice!",
  size = "md",
}: {
  lang?: string;
  onTranscript: (transcript: string) => void;
  prompt?: string;
  size?: "md" | "lg";
}) {
  const soundOn = useGameStore((s) => s.soundOn);
  const [supported, setSupported] = useState(false);
  const [micState, setMicState] = useState<MicState>("idle");
  const [heard, setHeard] = useState<string | null>(null);
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    // initVoice probes availability + pre-warms the native plugin
    initVoice().then(() => setSupported(sttSupported()));
    return () => cancelRef.current();
  }, []);

  if (!supported) return null;

  const startListening = async () => {
    if (micState === "listening") {
      cancelRef.current();
      setMicState("idle");
      return;
    }
    playTap(soundOn);
    setHeard(null);
    setMicState("requesting");

    // Explicit permission request before starting — shows Android dialog
    const granted = await requestMic();
    if (!granted) {
      setMicState("denied");
      setTimeout(() => setMicState("idle"), 3000);
      return;
    }

    setMicState("listening");
    cancelRef.current = listenOnce({
      lang,
      onResult: (t) => {
        const first = t.split(" | ")[0];
        setHeard(first);
        onTranscript(t);
      },
      onError: (reason) => {
        console.warn("STT error:", reason);
        setHeard(null);
      },
      onEnd: () => setMicState("idle"),
    });
  };

  const dim = size === "lg" ? "w-24 h-24 text-4xl" : "w-16 h-16 text-3xl";

  const statusText =
    micState === "requesting" ? "Checking microphone…" :
    micState === "listening"  ? "I'm listening… 👂" :
    micState === "denied"     ? "Microphone not allowed 😔 (check Settings)" :
    heard                     ? `Heard: "${heard}"` :
    prompt;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <AnimatePresence>
          {micState === "listening" && [0, 1].map((i) => (
            <motion.span
              key={i}
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.9, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.7 }}
              className="absolute inset-0 rounded-full bg-berry"
              aria-hidden
            />
          ))}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.88 }}
          animate={micState === "listening" ? { scale: [1, 1.08, 1] } : {}}
          transition={micState === "listening" ? { repeat: Infinity, duration: 0.9 } : {}}
          onClick={startListening}
          disabled={micState === "requesting"}
          aria-label={micState === "listening" ? "Listening… tap to stop" : "Answer with your voice"}
          aria-pressed={micState === "listening"}
          className={`relative ${dim} rounded-full shadow-chunky flex items-center justify-center
            ${micState === "listening" ? "bg-berry text-white" :
              micState === "denied"    ? "bg-slate-300" :
              "bg-white"}
            disabled:opacity-50`}
        >
          {micState === "listening" ? "🐰" :
           micState === "requesting" ? "⏳" :
           micState === "denied"     ? "🚫" : "🎤"}
        </motion.button>
      </div>
      <span className={`font-body text-xs text-center min-h-[1.5rem] max-w-[160px]
        ${micState === "denied" ? "text-berry" : "text-slate-400"}`}>
        {statusText}
      </span>
    </div>
  );
}
