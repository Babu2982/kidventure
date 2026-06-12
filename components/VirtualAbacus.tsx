"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { useGameStore } from "@/store/useGameStore";
import { playTap, playSuccess, playRetry } from "@/lib/sounds";
import { BigButton } from "@/components/ui";

/**
 * VirtualAbacus — a two-column (tens | units) bead frame.
 *
 * Each column has 9 beads. Tapping a bead slides it (and every bead
 * above it) down to the counted zone, or back up — exactly like a
 * physical school abacus. Column value = number of beads pushed down.
 *
 * Challenge loop: the child is shown a target number (1–99 scaled by
 * olympiadLevel) and must set the abacus to it, then press Check.
 * Correct answers bump `abacusScore` in the store.
 */

const BEADS_PER_COL = 9;

function ChallengeTarget(level: number) {
  // L1: 1–20, L2: 1–50, L3+: 1–99
  const max = level <= 1 ? 20 : level === 2 ? 50 : 99;
  return 1 + Math.floor(Math.random() * max);
}

function BeadColumn({
  label,
  count,
  color,
  onSet,
}: {
  label: string;
  count: number; // beads currently pushed down (0–9)
  color: string;
  onSet: (n: number) => void;
}) {
  const soundOn = useGameStore((s) => s.soundOn);
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-display text-lg text-slate-600">{label}</span>
      <div className="relative bg-white/80 rounded-[1.5rem] shadow-chunkySm px-2 py-3 flex flex-col items-center gap-1.5">
        {/* rod */}
        <div className="absolute top-3 bottom-3 w-1.5 bg-amber-700/40 rounded-full" />
        {Array.from({ length: BEADS_PER_COL }, (_, i) => {
          const beadNumber = i + 1; // 1 = top bead
          const isDown = beadNumber > BEADS_PER_COL - count;
          return (
            <motion.button
              key={i}
              layout
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              whileTap={{ scale: 1.15 }}
              onClick={() => {
                playTap(soundOn);
                // Tapping bead i: if it's up, push it and all below it down;
                // if it's down, lift it and all above it up.
                const newCount = isDown
                  ? BEADS_PER_COL - beadNumber
                  : BEADS_PER_COL - beadNumber + 1;
                onSet(newCount);
              }}
              aria-label={`${label} bead ${beadNumber}, ${isDown ? "counted" : "not counted"}`}
              className={`relative z-10 w-12 h-9 sm:w-14 sm:h-10 rounded-full shadow-chunkySm transition-colors
                ${isDown ? color : "bg-slate-200"}
                ${isDown ? "" : "opacity-80"}`}
              style={{ marginTop: !isDown && beadNumber === 1 ? 0 : undefined }}
            >
              <span className="absolute inset-x-3 top-1.5 h-2 rounded-full bg-white/40" />
            </motion.button>
          );
        })}
      </div>
      <motion.span
        key={count}
        initial={{ scale: 1.4 }}
        animate={{ scale: 1 }}
        className="font-display text-3xl text-slate-700"
        aria-live="polite"
      >
        {count}
      </motion.span>
    </div>
  );
}

export function VirtualAbacus() {
  const { soundOn, bumpAdvancedMetric } = useGameStore();
  const level = useGameStore(
    (s) =>
      s.profiles.find((p) => p.id === s.activeProfileId)?.advancedMetrics
        .olympiadLevel ?? 1
  );

  const [tens, setTens] = useState(0);
  const [units, setUnits] = useState(0);
  const [target, setTarget] = useState(() => ChallengeTarget(level));
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<"none" | "right" | "wrong">("none");

  const value = tens * 10 + units;
  const targetTens = useMemo(() => Math.floor(target / 10), [target]);

  const check = () => {
    if (value === target) {
      playSuccess(soundOn);
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 } });
      bumpAdvancedMetric("abacusScore", 1);
      setFeedback("right");
      setStreak((s) => s + 1);
      setTimeout(() => {
        setTens(0);
        setUnits(0);
        setTarget(ChallengeTarget(level));
        setFeedback("none");
      }, 1100);
    } else {
      playRetry(soundOn);
      setFeedback("wrong");
      setTimeout(() => setFeedback("none"), 900);
    }
  };

  return (
    <section className="flex flex-col items-center gap-5 w-full max-w-md">
      <div className="bg-white rounded-[2rem] shadow-chunky px-6 py-4 text-center">
        <p className="font-body text-slate-500">Make this number on the abacus:</p>
        <motion.p
          key={target}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-display text-5xl text-grape"
        >
          {target}
        </motion.p>
        {targetTens > 0 && (
          <p className="font-body text-xs text-slate-400 mt-1">
            Hint: {targetTens} ten{targetTens > 1 ? "s" : ""} and {target % 10} unit
            {target % 10 === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <div className="bg-amber-100 rounded-[2rem] shadow-chunky p-4 sm:p-6 flex gap-8 sm:gap-12 border-4 border-amber-300">
        <BeadColumn label="Tens" count={tens} color="bg-berry" onSet={setTens} />
        <BeadColumn label="Units" count={units} color="bg-sky-kid" onSet={setUnits} />
      </div>

      <div className="flex items-center gap-4">
        <div
          className={`font-display text-2xl rounded-2xl px-5 py-2 shadow-chunkySm transition
            ${feedback === "right" ? "bg-grass text-white" : feedback === "wrong" ? "bg-berry text-white" : "bg-white text-slate-700"}`}
          aria-live="polite"
        >
          = {value}
        </div>
        <BigButton color="bg-grass text-white" className="!text-xl" onClick={check}>
          ✅ Check
        </BigButton>
      </div>

      {streak > 0 && (
        <p className="font-display text-grape">🔥 Streak: {streak}</p>
      )}
      {feedback === "wrong" && (
        <p className="font-display text-berry">Not yet — slide some beads! 🧮</p>
      )}
    </section>
  );
}
