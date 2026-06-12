"use client";

import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import type { Sticker } from "@/store/useAppStore";
import { useAppStore } from "@/store/useAppStore";
import { playFanfare } from "@/lib/sounds";
import { BigButton } from "./ui";

export function RewardOverlay({
  sticker,
  onClose,
  onPlayAgain,
}: {
  sticker: Sticker | null;
  onClose: () => void;
  onPlayAgain?: () => void;
}) {
  const soundOn = useAppStore((s) => s.soundOn);

  useEffect(() => {
    if (!sticker) return;
    playFanfare(soundOn);
    const burst = (x: number) =>
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { x, y: 0.65 },
        colors: ["#4FC3F7", "#FFD54F", "#81C784", "#F06292", "#9575CD"],
      });
    burst(0.3);
    const t = setTimeout(() => burst(0.7), 250);
    return () => clearTimeout(t);
  }, [sticker, soundOn]);

  return (
    <AnimatePresence>
      {sticker && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-grape/60 backdrop-blur-sm flex items-center justify-center p-6"
          role="dialog"
          aria-label="You earned a sticker!"
        >
          <motion.div
            initial={{ scale: 0.4, rotate: -12, y: 60 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="bg-white rounded-[2.5rem] shadow-chunky p-8 flex flex-col items-center gap-4 max-w-sm w-full text-center"
          >
            <p className="font-display text-2xl text-slate-700">You did it! 🎉</p>
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="text-[7rem] leading-none"
              aria-hidden
            >
              {sticker.emoji}
            </motion.div>
            <p className="font-display text-xl text-berry">
              New sticker: {sticker.name}!
            </p>
            <p className="font-body text-slate-500">+1 ⭐ added to your stars</p>
            <div className="flex gap-3 w-full">
              {onPlayAgain && (
                <BigButton color="bg-grass" className="flex-1" onClick={onPlayAgain}>
                  🔁 Again
                </BigButton>
              )}
              <BigButton color="bg-sun" className="flex-1" onClick={onClose}>
                🏠 Map
              </BigButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
