"use client";

import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ClientGate, TopBar, BigButton } from "@/components/ui";
import { RewardOverlay } from "@/components/RewardOverlay";
import { useAppStore, useLearningMode, useSkillLevel, type Sticker } from "@/store/useAppStore";
import { useAutoNarrate, narrate, narrateMistake, narrateCelebration, MODULE_INTROS } from "@/lib/narrator";
import { SpeakButton, MicButton } from "@/components/Voice";
import { numberFromSpeech } from "@/lib/voice";
import { useRef } from "react";
import { playSuccess, playRetry, playTap } from "@/lib/sounds";
import { VirtualAbacus } from "@/components/VirtualAbacus";
import { OlympiadGenerator } from "@/components/OlympiadGenerator";

const ANIMALS = ["🐰", "🐥", "🐠", "🐞", "🦆", "🐢", "🐱", "🐶"];
const ROUNDS_TO_WIN = 5;

interface Round {
  animal: string;
  count: number; // 1–5
  options: number[]; // three choices incl. correct
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Adaptive ranges (IGCSE G1 progression):
    L1 counts 1–5 · L2 counts 1–10 · L3 counts 6–12. */
function makeRound(level: number): Round {
  const lo = level >= 3 ? 6 : 1;
  const hi = level >= 3 ? 12 : level === 2 ? 10 : 5;
  const count = lo + Math.floor(Math.random() * (hi - lo + 1));
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const pool = [];
  for (let n = Math.max(1, count - 3); n <= count + 3; n++) if (n !== count) pool.push(n);
  const wrongs = shuffle(pool).slice(0, 2);
  return { animal, count, options: shuffle([count, ...wrongs]) };
}

export default function MathPage() {
  return (
    <ClientGate>
      <MathRouter />
    </ClientGate>
  );
}

/** Junior mode keeps the original Count the Objects game untouched.
    Advanced mode swaps in the Abacus + Olympiad IGCSE track. */
function MathRouter() {
  const mode = useLearningMode();
  return mode === "advanced" ? <AdvancedMath /> : <CountGame />;
}

function AdvancedMath() {
  const soundOn = useAppStore((s) => s.soundOn);
  const [tab, setTab] = useState<"abacus" | "olympiad">("abacus");
  useAutoNarrate(tab === "abacus" ? MODULE_INTROS.mathAbacus : MODULE_INTROS.mathOlympiad);
  return (
    <main className="min-h-dvh bg-sky-scene flex flex-col">
      <TopBar title="Math Mountain" emoji="🧮" />
      <div className="flex justify-center gap-3 px-4 py-2">
        {([
          ["abacus", "🧮 Abacus"],
          ["olympiad", "🏅 Olympiad"],
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
        {tab === "abacus" ? <VirtualAbacus /> : <OlympiadGenerator />}
      </div>
    </main>
  );
}

function CountGame() {
  const router = useRouter();
  const { soundOn, awardStarAndSticker, recordAnswer } = useAppStore();
  const level = useSkillLevel();
  const roundStart = useRef(Date.now());
  useAutoNarrate(MODULE_INTROS.mathJunior);
  const [round, setRound] = useState<Round>(() => makeRound(1));
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<"none" | "wrong" | "right">("none");
  const [reward, setReward] = useState<Sticker | null>(null);
  const [locked, setLocked] = useState(false);

  const next = useCallback((lvl: number) => {
    setRound(makeRound(lvl));
    setFeedback("none");
    setLocked(false);
    roundStart.current = Date.now();
  }, []);

  const answer = (n: number) => {
    if (locked) return;
    const elapsed = Date.now() - roundStart.current;
    if (n === round.count) {
      const { levelChange, newLevel } = recordAnswer(true, elapsed);
      if (levelChange === 1)
        narrateCelebration(`Amazing! You leveled up to level ${newLevel}! The numbers get a little bigger now.`);
      else if (levelChange === -1)
        narrateCelebration("Let's practice with smaller numbers for a bit. You're doing great!");
      setLocked(true);
      setFeedback("right");
      playSuccess(soundOn);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#4FC3F7", "#FFD54F", "#81C784"],
      });
      const newProgress = progress + 1;
      setTimeout(() => {
        if (newProgress >= ROUNDS_TO_WIN) {
          setReward(awardStarAndSticker("math"));
          setProgress(0);
        } else {
          setProgress(newProgress);
          next(level);
        }
      }, 900);
    } else {
      recordAnswer(false, elapsed);
      setFeedback("wrong");
      narrateMistake(
        `Not quite. Touch each ${"animal"} with your finger and count out loud: one, two, three... then pick that number!`
      );
      setTimeout(() => setFeedback("none"), 900);
    }
  };

  const onVoice = (t: string) => {
    const n = numberFromSpeech(t);
    if (n === null) {
      narrate("I didn't catch a number. Try saying it like: four!");
      return;
    }
    if (round.options.includes(n)) answer(n);
    else narrate(`I heard ${n}, but that's not one of the choices. Look at the buttons and try again!`);
  };

  const restart = () => {
    setReward(null);
    setProgress(0);
    next(level);
  };

  return (
    <main className="min-h-dvh bg-sky-scene flex flex-col">
      <TopBar title="Math Mountain" emoji="🔢" />

      {/* progress dots */}
      <div className="flex justify-center gap-2 py-1" aria-label={`Round ${progress + 1} of ${ROUNDS_TO_WIN}`}>
        {Array.from({ length: ROUNDS_TO_WIN }).map((_, i) => (
          <span
            key={i}
            className={`w-4 h-4 rounded-full transition ${
              i < progress ? "bg-grass scale-110" : "bg-white/70"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5 pb-8">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl sm:text-3xl text-slate-700 text-center">
            How many do you see? 👀
          </h2>
          <SpeakButton text="How many animals do you see? Count them and tap the right number!" />
        </div>

        <motion.div
          key={`${round.animal}-${round.count}-${progress}`}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            x: feedback === "wrong" ? [0, -12, 12, -8, 8, 0] : 0,
          }}
          transition={{ x: { duration: 0.45 } }}
          className="bg-white rounded-[2.5rem] shadow-chunky p-6 sm:p-10 flex flex-wrap justify-center gap-3 max-w-md w-full min-h-[160px] items-center"
          aria-label={`${round.count} animals`}
        >
          {Array.from({ length: round.count }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 300 }}
              className="text-6xl sm:text-7xl"
            >
              {round.animal}
            </motion.span>
          ))}
        </motion.div>

        <div className="flex gap-4 sm:gap-6">
          {round.options.map((n) => (
            <BigButton
              key={n}
              color={
                feedback === "right" && n === round.count
                  ? "bg-grass text-white"
                  : "bg-sun"
              }
              className="!text-4xl !min-h-[80px] !min-w-[80px]"
              ariaLabel={`Answer ${n}`}
              onClick={() => answer(n)}
              disabled={locked}
            >
              {n}
            </BigButton>
          ))}
        </div>

        <MicButton onTranscript={onVoice} prompt="Or say the number!" />

        <AnimatePresence>
          {feedback === "wrong" && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="font-display text-xl text-grape"
            >
              Almost! Count again 🐾
            </motion.p>
          )}
          {feedback === "right" && (
            <motion.p
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="font-display text-2xl text-grass"
            >
              Yes! Great counting! 🌟
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <RewardOverlay
        sticker={reward}
        onClose={() => router.push("/dashboard")}
        onPlayAgain={restart}
      />
    </main>
  );
}
