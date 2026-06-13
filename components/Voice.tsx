"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { narrate, type NarrationLang } from "@/lib/narrator";
import { listenOnce, sttSupported } from "@/lib/voice";
import { playTap } from "@/lib/sounds";
import { useGameStore } from "@/store/useGameStore";

/** Speaker emoji button — taps re-read any prompt aloud. */
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
      onClick={() => {
        playTap(soundOn);
        narrate(text, lang);
      }}
      aria-label="Read aloud"
      className={`bg-white rounded-full shadow-chunkySm w-11 h-11 text-xl
        flex items-center justify-center shrink-0 ${className}`}
    >
      🔊
    </motion.button>
  );
}

/**
 * MicButton — hands-free answering.
 * Idle: tap to start. Listening: pulsing rings + bunny ears perk up.
 * Hides itself entirely on platforms without STT, so layouts never
 * show a dead microphone.
 */
export function MicButton({
  lang = "en-US",
  onTranscript,
  prompt = "Say your answer!",
  size = "md",
}: {
  lang?: string;
  onTranscript: (transcript: string) => void;
  prompt?: string;
  size?: "md" | "lg";
}) {
  const soundOn = useGameStore((s) => s.soundOn);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    setSupported(sttSupported());
    return () => cancelRef.current();
  }, []);

  if (!supported) return null;

  const startListening = () => {
    if (listening) {
      cancelRef.current();
      setListening(false);
      return;
    }
    playTap(soundOn);
    setHeard(null);
    setListening(true);
    cancelRef.current = listenOnce({
      lang,
      onResult: (t) => {
        setHeard(t.split(" | ")[0]);
        onTranscript(t);
      },
      onError: () => setHeard(null),
      onEnd: () => setListening(false),
    });
  };

  const dim = size === "lg" ? "w-24 h-24 text-4xl" : "w-16 h-16 text-3xl";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        {/* pulsing rings while listening */}
        <AnimatePresence>
          {listening &&
            [0, 1].map((i) => (
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
          animate={listening ? { scale: [1, 1.08, 1] } : {}}
          transition={listening ? { repeat: Infinity, duration: 0.9 } : {}}
          onClick={startListening}
          aria-label={listening ? "Listening… tap to stop" : "Answer with your voice"}
          aria-pressed={listening}
          className={`relative ${dim} rounded-full shadow-chunky flex items-center justify-center
            ${listening ? "bg-berry text-white" : "bg-white"}`}
        >
          {listening ? "🐰" : "🎤"}
        </motion.button>
      </div>
      <span className="font-body text-xs text-slate-400 text-center min-h-[1rem]">
        {listening ? "I'm listening… 👂" : heard ? `Heard: “${heard}”` : prompt}
      </span>
    </div>
  );
}
