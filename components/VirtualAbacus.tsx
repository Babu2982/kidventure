"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { useGameStore, useSkillLevel } from "@/store/useGameStore";
import { narrate, narrateMistake, narrateCelebration } from "@/lib/narrator";
import { useEffect, useRef } from "react";
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

const TIMER_SECONDS = 30; // L3 rapid mental math countdown

export function VirtualAbacus() {
  const { soundOn, bumpAdvancedMetric, recordAnswer } = useGameStore();
  const level = useSkillLevel(); // adaptive engine drives the targets
  const startedAt = useRef(Date.now());
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);

  const [tens, setTens] = useState(0);
  const [units, setUnits] = useState(0);
  const [target, setTarget] = useState(() => ChallengeTarget(level));
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<"none" | "right" | "wrong">("none");

  const value = tens * 10 + units;
  const targetTens = useMemo(() => Math.floor(target / 10), [target]);

  /* L3 only: visible countdown — rapid mental math. Running out just
     speaks encouragement and refreshes the target; never punitive. */
  useEffect(() => {
    if (level < 3) return;
    setTimeLeft(TIMER_SECONDS);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          narrate("Time's up — here's a fresh number. You can do it!");
          setTens(0); setUnits(0);
          setTarget(ChallengeTarget(level));
          startedAt.current = Date.now();
          return TIMER_SECONDS;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, target]);

  const check = () => {
    const elapsed = Date.now() - startedAt.current;
    if (value === target) {
      const { levelChange, newLevel } = recordAnswer(true, elapsed);
      if (levelChange === 1)
        narrateCelebration(`Fantastic abacus work! Level ${newLevel} unlocked — bigger numbers ahead!`);
      else
        narrate(`Yes! ${target} exactly. Great bead work!`);
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
        startedAt.current = Date.now();
      }, 1100);
    } else {
      recordAnswer(false, elapsed);
      // spoken, specific correction instead of just a buzzer
      const wantTens = Math.floor(target / 10);
      const wantUnits = target % 10;
      const hint =
        tens !== wantTens
          ? `Let's try again! ${target} needs ${wantTens} pink ten-beads — each pink bead counts as ten. Slide ${wantTens === 0 ? "them all up" : `${wantTens} down`}, then check the blue units.`
          : `So close! The tens are right. Now make ${wantUnits} with the blue unit beads — each blue bead counts as one.`;
      narrateMistake(hint);
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

      {level >= 3 && (
        <div className="w-full max-w-xs" aria-label={`${timeLeft} seconds left`}>
          <div className="h-3 bg-white/70 rounded-full overflow-hidden shadow-inner">
            <motion.div
              className={`h-full rounded-full ${timeLeft <= 8 ? "bg-berry" : "bg-grass"}`}
              animate={{ width: `${(timeLeft / TIMER_SECONDS) * 100}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <p className="font-display text-center text-sm text-slate-500 mt-1">⏱️ {timeLeft}s</p>
        </div>
      )}

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
