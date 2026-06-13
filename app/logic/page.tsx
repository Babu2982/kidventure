"use client";

import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClientGate, TopBar, BigButton } from "@/components/ui";
import { RewardOverlay } from "@/components/RewardOverlay";
import { useAppStore, useLearningMode, useSkillLevel, type Sticker } from "@/store/useAppStore";
import { useAutoNarrate, narrateMistake, narrateCelebration, MODULE_INTROS } from "@/lib/narrator";
import { useRef } from "react";
import { playSuccess, playRetry, playTap } from "@/lib/sounds";
import { RhythmMatcher, OlympiadPatterns } from "@/components/AdvancedLogic";

/**
 * Size Sort: tap the items from SMALLEST to LARGEST.
 * Each correct tap moves the item into the answer row; a wrong tap
 * gives a gentle shake and retry sound. 3 puzzles = sticker.
 */

const THINGS = ["🍎", "⚽", "🌻", "🐠", "🎈", "🧁", "🚗", "🦖"];
const PUZZLES_TO_WIN = 3;

interface Item {
  id: number;
  emoji: string;
  size: number; // rem-based font size; also the sort key
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Adaptive: L1 sorts 4 items, L2 sorts 5, L3 sorts 6. */
function makePuzzle(level: number): Item[] {
  const emoji = THINGS[Math.floor(Math.random() * THINGS.length)];
  const all = [1.6, 2.2, 2.8, 3.6, 4.6, 5.8];
  const n = level >= 3 ? 6 : level === 2 ? 5 : 4;
  const sizes = shuffle(all).slice(0, n);
  return shuffle(sizes.map((size, id) => ({ id, emoji, size })));
}

export default function LogicPage() {
  return (
    <ClientGate>
      <LogicRouter />
    </ClientGate>
  );
}

/** Junior keeps the original Size Sort game untouched.
    Advanced gets rhythm + pattern puzzles. */
function LogicRouter() {
  const mode = useLearningMode();
  return mode === "advanced" ? <AdvancedLogic /> : <SizeSort />;
}

function AdvancedLogic() {
  const soundOn = useAppStore((s) => s.soundOn);
  const [tab, setTab] = useState<"rhythm" | "patterns">("rhythm");
  useAutoNarrate(tab === "rhythm" ? MODULE_INTROS.logicRhythm : MODULE_INTROS.logicPatterns);
  return (
    <main className="min-h-dvh bg-sky-scene flex flex-col">
      <TopBar title="Logic Lagoon" emoji="🧠" />
      <div className="flex justify-center gap-3 px-4 py-2">
        {([
          ["rhythm", "🪘 Rhythm"],
          ["patterns", "🛼 Patterns"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => { playTap(soundOn); setTab(id); }}
            aria-pressed={tab === id}
            className={`font-display text-lg sm:text-xl rounded-2xl px-5 py-2.5 shadow-chunkySm transition min-h-[48px]
              ${tab === id ? "bg-grape text-white scale-105" : "bg-white text-slate-600"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {tab === "rhythm" ? <RhythmMatcher /> : <OlympiadPatterns />}
      </div>
    </main>
  );
}

function SizeSort() {
  const router = useRouter();
  const { soundOn, awardStarAndSticker, recordAnswer } = useAppStore();
  const level = useSkillLevel();
  const puzzleStart = useRef(Date.now());
  useAutoNarrate(MODULE_INTROS.logicJunior);
  const [items, setItems] = useState<Item[]>(() => makePuzzle(1));
  const [placed, setPlaced] = useState<Item[]>([]);
  const [puzzlesDone, setPuzzlesDone] = useState(0);
  const [shakeId, setShakeId] = useState<number | null>(null);
  const [reward, setReward] = useState<Sticker | null>(null);

  const remaining = items.filter((it) => !placed.some((p) => p.id === it.id));
  const nextSmallest = remaining.reduce(
    (min, it) => (it.size < min ? it.size : min),
    Infinity
  );

  const tap = (item: Item) => {
    playTap(soundOn);
    if (item.size === nextSmallest) {
      const newPlaced = [...placed, item];
      setPlaced(newPlaced);
      playSuccess(soundOn);
      if (newPlaced.length === items.length) {
        const { levelChange, newLevel } = recordAnswer(true, Date.now() - puzzleStart.current);
        if (levelChange === 1)
          narrateCelebration(`Brilliant sorting! Level ${newLevel} — more things to line up now!`);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        const done = puzzlesDone + 1;
        setTimeout(() => {
          if (done >= PUZZLES_TO_WIN) {
            setReward(awardStarAndSticker("logic"));
            setPuzzlesDone(0);
          } else {
            setPuzzlesDone(done);
            setItems(makePuzzle(level));
            setPlaced([]);
            puzzleStart.current = Date.now();
          }
        }, 1000);
      }
    } else {
      recordAnswer(false, Date.now() - puzzleStart.current);
      narrateMistake(
        "Hmm, look carefully — which one is the very smallest left over? That one goes next!"
      );
      setShakeId(item.id);
      setTimeout(() => setShakeId(null), 500);
    }
  };

  const restart = () => {
    setReward(null);
    setItems(makePuzzle(level));
    setPlaced([]);
    setPuzzlesDone(0);
    puzzleStart.current = Date.now();
  };

  return (
    <main className="min-h-dvh bg-sky-scene flex flex-col">
      <TopBar title="Logic Lagoon" emoji="🧩" />

      <div className="flex justify-center gap-2 py-1" aria-label={`Puzzle ${puzzlesDone + 1} of ${PUZZLES_TO_WIN}`}>
        {Array.from({ length: PUZZLES_TO_WIN }).map((_, i) => (
          <span
            key={i}
            className={`w-4 h-4 rounded-full ${i < puzzlesDone ? "bg-grass" : "bg-white/70"}`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-7 px-5 pb-8">
        <h2 className="font-display text-2xl sm:text-3xl text-slate-700 text-center">
          Tap them in order: small ➡️ BIG!
        </h2>

        {/* Answer row */}
        <div className="bg-white/70 rounded-[2rem] shadow-chunkySm min-h-[110px] w-full max-w-lg flex items-end justify-center gap-4 p-4">
          <AnimatePresence>
            {placed.length === 0 && (
              <motion.span
                exit={{ opacity: 0 }}
                className="font-body text-slate-400 self-center"
              >
                Your line-up goes here ✨
              </motion.span>
            )}
            {placed.map((it) => (
              <motion.span
                key={it.id}
                layout
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{ fontSize: `${it.size}rem`, lineHeight: 1 }}
              >
                {it.emoji}
              </motion.span>
            ))}
          </AnimatePresence>
          {placed.length > 0 && placed.length < items.length && (
            <span className="font-display text-3xl text-slate-300 self-center">→</span>
          )}
        </div>

        {/* Choices */}
        <div className="flex items-end justify-center gap-5 flex-wrap min-h-[120px]">
          {remaining.map((it) => (
            <motion.button
              key={it.id}
              layout
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              animate={shakeId === it.id ? { x: [0, -10, 10, -8, 8, 0] } : {}}
              transition={{ duration: 0.4 }}
              onClick={() => tap(it)}
              aria-label={`Item size ${it.size}`}
              className="bg-white rounded-[1.75rem] shadow-chunky p-4 leading-none"
              style={{ fontSize: `${it.size}rem` }}
            >
              {it.emoji}
            </motion.button>
          ))}
        </div>

        {placed.length === items.length && (
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-display text-2xl text-grass"
          >
            Perfect order! 🌟
          </motion.p>
        )}
      </div>

      <RewardOverlay
        sticker={reward}
        onClose={() => router.push("/dashboard")}
        onPlayAgain={restart}
      />
    </main>
  );
}
