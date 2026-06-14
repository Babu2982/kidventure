"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { narrate, type NarrationLang } from "@/lib/narrator";
import { listenOnce, sttSupported } from "@/lib/voice";
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

type MicState = "idle" | "listening" | "denied";

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
  const [micState, setMicState] = useState<MicState>("idle");
  const [heard, setHeard] = useState<string | null>(null);
  const cancelRef = useRef<() => void>(() => {});

  // Always show on native; probe web support on mount
  const [show, setShow] = useState(Capacitor.isNativePlatform());
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setShow(sttSupported());
    }
    return () => cancelRef.current();
  }, []);

  if (!show) return null;

  const startListening = () => {
    if (micState === "listening") {
      cancelRef.current();
      setMicState("idle");
      return;
    }
    playTap(soundOn);
    setHeard(null);
    setMicState("listening"); // go straight to listening — no "requesting" hang

    cancelRef.current = listenOnce({
      lang,
      maxMs: 8000,
      onResult: (t) => {
        const first = t.split(" | ")[0];
        setHeard(first);
        setMicState("idle");
        onTranscript(t);
      },
      onError: (reason) => {
        console.warn("STT:", reason);
        if (reason === "mic-denied") setMicState("denied");
        else setMicState("idle");
      },
      onEnd: () => setMicState("idle"),
    });
  };

  const dim = size === "lg" ? "w-24 h-24 text-4xl" : "w-16 h-16 text-3xl";

  const statusText =
    micState === "listening" ? "I'm listening… 👂" :
    micState === "denied"    ? "Microphone blocked — check Settings" :
    heard                    ? `Heard: "${heard}"` :
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
          aria-label={micState === "listening" ? "Tap to stop" : "Answer with your voice"}
          aria-pressed={micState === "listening"}
          className={`relative ${dim} rounded-full shadow-chunky flex items-center justify-center
            ${micState === "listening" ? "bg-berry text-white" :
              micState === "denied"    ? "bg-slate-300" : "bg-white"}`}
        >
          {micState === "listening" ? "🐰" : micState === "denied" ? "🚫" : "🎤"}
        </motion.button>
      </div>
      <span className={`font-body text-xs text-center min-h-[1.5rem] max-w-[160px]
        ${micState === "denied" ? "text-berry" : "text-slate-400"}`}>
        {statusText}
      </span>
    </div>
  );
}
