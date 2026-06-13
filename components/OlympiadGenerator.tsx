"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import confetti from "canvas-confetti";
import { useGameStore, useSkillLevel, type Sticker } from "@/store/useGameStore";
import { useAutoNarrate, narrate, narrateMistake, narrateCelebration } from "@/lib/narrator";
import { SpeakButton, MicButton } from "@/components/Voice";
import { numberFromSpeech } from "@/lib/voice";
import { useRef } from "react";
import { playSuccess, playRetry } from "@/lib/sounds";
import { BigButton } from "@/components/ui";
import { RewardOverlay } from "@/components/RewardOverlay";
import { useRouter } from "next/navigation";

/**
 * OlympiadGenerator — arithmetic word problems themed around the
 * child's sports world (pool laps, shuttlecocks, skating loops).
 *
 * Difficulty scales with olympiadLevel:
 *   L1: addition/subtraction within 20
 *   L2: within 50, includes simple ×2/×3
 *   L3+: within 100, mixed operations
 *
 * 5 correct answers in a session → level up + sticker.
 */

const CORRECT_TO_WIN = 5;

interface Problem {
  text: string;
  answer: number;
  options: number[];
  emoji: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const rnd = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

function distractors(answer: number): number[] {
  const set = new Set<number>();
  while (set.size < 2) {
    const d = answer + shuffle([-3, -2, -1, 1, 2, 3, 10, -10])[0];
    if (d !== answer && d >= 0) set.add(d);
  }
  return [...set];
}

const NAMES = ["Aanya", "Vihaan", "Diya", "Arjun", "Meera", "Kabir"];

function makeProblem(level: number): Problem {
  const cap = level <= 1 ? 20 : level === 2 ? 50 : 100;
  const name = NAMES[rnd(0, NAMES.length - 1)];
  const templates: Array<() => Problem> = [
    // Swimming laps — addition
    () => {
      const a = rnd(2, Math.floor(cap / 2));
      const b = rnd(2, Math.floor(cap / 2));
      return {
        emoji: "🏊",
        text: `${name} swam ${a} laps in the morning and ${b} laps in the evening. How many laps in total?`,
        answer: a + b,
        options: [],
      };
    },
    // Shuttlecocks — subtraction
    () => {
      const a = rnd(Math.floor(cap / 2), cap);
      const b = rnd(1, a - 1);
      return {
        emoji: "🏸",
        text: `The coach had ${a} shuttlecocks. ${name} hit ${b} of them over the fence! How many are left?`,
        answer: a - b,
        options: [],
      };
    },
    // Skating loops — addition with three terms (L2+) or two (L1)
    () => {
      const terms = level >= 2 ? 3 : 2;
      const parts = Array.from({ length: terms }, () => rnd(2, Math.floor(cap / terms)));
      const total = parts.reduce((x, y) => x + y, 0);
      return {
        emoji: "🛼",
        text: `${name} skated ${parts.join(" loops, then ")} loops around the rink. How many loops altogether?`,
        answer: total,
        options: [],
      };
    },
  ];

  if (level >= 2) {
    // Multiplication: badminton rallies
    templates.push(() => {
      const a = rnd(2, level === 2 ? 5 : 9);
      const b = rnd(2, level === 2 ? 3 : 5);
      return {
        emoji: "🏸",
        text: `${name} plays ${b} badminton games. Each game has ${a} rallies. How many rallies in total?`,
        answer: a * b,
        options: [],
      };
    });
    // Pool lanes: equal sharing
    templates.push(() => {
      const b = rnd(2, 5);
      const each = rnd(2, Math.floor(cap / b));
      return {
        emoji: "🏊",
        text: `${b} friends share ${b * each} pool floats equally. How many floats does each friend get?`,
        answer: each,
        options: [],
      };
    });
  }

  const p = templates[rnd(0, templates.length - 1)]();
  p.options = shuffle([p.answer, ...distractors(p.answer)]);
  return p;
}

export function OlympiadGenerator() {
  const router = useRouter();
  const { soundOn, bumpAdvancedMetric, awardStarAndSticker, recordAnswer } = useGameStore();
  const level = useSkillLevel(); // adaptive engine drives difficulty
  const startedAt = useRef(Date.now());

  const [problem, setProblem] = useState<Problem>(() => makeProblem(level));
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<"none" | "right" | "wrong">("none");
  const [locked, setLocked] = useState(false);
  const [reward, setReward] = useState<Sticker | null>(null);

  // Every new word problem is read aloud automatically (IGCSE prompts).
  useAutoNarrate(problem.text, "en-US", 500);

  const answer = (n: number) => {
    if (locked) return;
    const elapsed = Date.now() - startedAt.current;
    if (n === problem.answer) {
      const { levelChange, newLevel } = recordAnswer(true, elapsed);
      if (levelChange === 1)
        narrateCelebration(`Incredible! You reached level ${newLevel}! The problems get trickier now — you're ready.`);
      else if (levelChange === -1)
        narrateCelebration("Let's take it a little easier and build up again. You're doing great!");
      setLocked(true);
      setFeedback("right");
      playSuccess(soundOn);
      confetti({ particleCount: 45, spread: 60, origin: { y: 0.65 } });
      const done = correct + 1;
      setTimeout(() => {
        if (done >= CORRECT_TO_WIN) {
          bumpAdvancedMetric("olympiadLevel", 1);
          setReward(awardStarAndSticker("math", "sports"));
          setCorrect(0);
        } else {
          setCorrect(done);
        }
        setProblem(makeProblem(level));
        setFeedback("none");
        setLocked(false);
        startedAt.current = Date.now();
      }, 1000);
    } else {
      recordAnswer(false, elapsed);
      narrateMistake(
        `Not yet! Listen again: ${problem.text} Take your time — count it step by step.`
      );
      setFeedback("wrong");
      setTimeout(() => setFeedback("none"), 900);
    }
  };

  const onVoice = (t: string) => {
    const n = numberFromSpeech(t);
    if (n === null) {
      narrate("I didn't hear a number. Try saying just the answer, like: twelve!");
      return;
    }
    answer(n);
  };

  return (
    <section className="flex flex-col items-center gap-5 w-full max-w-md">
      <div className="flex items-center gap-2">
        <span className="bg-grape text-white font-display rounded-full px-4 py-1">
          🏅 Level {level}
        </span>
        <div className="flex gap-1.5" aria-label={`${correct} of ${CORRECT_TO_WIN} solved`}>
          {Array.from({ length: CORRECT_TO_WIN }).map((_, i) => (
            <span
              key={i}
              className={`w-3.5 h-3.5 rounded-full ${i < correct ? "bg-grass" : "bg-white/70"}`}
            />
          ))}
        </div>
      </div>

      <motion.div
        key={problem.text}
        initial={{ x: 60, opacity: 0 }}
        animate={{
          x: feedback === "wrong" ? [0, -10, 10, -8, 8, 0] : 0,
          opacity: 1,
        }}
        className="bg-white rounded-[2rem] shadow-chunky p-6 w-full"
      >
        <span className="text-5xl block text-center mb-3" aria-hidden>
          {problem.emoji}
        </span>
        <p className="font-body text-xl text-slate-700 text-center leading-relaxed">
          {problem.text}
        </p>
        <div className="flex justify-center mt-3">
          <SpeakButton text={problem.text} />
        </div>
      </motion.div>

      <div className="flex gap-4">
        {problem.options.map((n) => (
          <BigButton
            key={n}
            color={feedback === "right" && n === problem.answer ? "bg-grass text-white" : "bg-sun"}
            className="!text-3xl !min-w-[80px]"
            onClick={() => answer(n)}
            disabled={locked}
            ariaLabel={`Answer ${n}`}
          >
            {n}
          </BigButton>
        ))}
      </div>

      <MicButton onTranscript={onVoice} prompt="Or say the answer out loud!" />

      <AnimatePresence>
        {feedback === "wrong" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-display text-xl text-grape"
          >
            Read it once more — you&apos;ve got this! 💪
          </motion.p>
        )}
      </AnimatePresence>

      <RewardOverlay
        sticker={reward}
        onClose={() => router.push("/dashboard")}
        onPlayAgain={() => setReward(null)}
      />
    </section>
  );
}
