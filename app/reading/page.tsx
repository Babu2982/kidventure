"use client";

import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ClientGate, TopBar } from "@/components/ui";
import { RewardOverlay } from "@/components/RewardOverlay";
import { useAppStore, useLearningMode, type Sticker } from "@/store/useAppStore";
import { playSuccess, playRetry, playTap } from "@/lib/sounds";
import { StoryReader, TamilSpeaker } from "@/components/StoryAndTamil";
import { LetterTracer } from "@/components/LetterTracer";

/**
 * Letter Match: drag each lowercase letter onto its uppercase partner.
 * Built with Framer Motion drag + manual hit-testing so it works with
 * both touch and mouse. Tapping a lowercase then tapping an uppercase
 * also works (accessibility / small-screen fallback).
 */

const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");
const PAIRS_PER_ROUND = 4;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeLetters() {
  return shuffle(ALPHABET).slice(0, PAIRS_PER_ROUND);
}

const TARGET_COLORS = ["bg-sky-kid", "bg-berry", "bg-grass", "bg-tangerine"];

export default function ReadingPage() {
  return (
    <ClientGate>
      <ReadingRouter />
    </ClientGate>
  );
}

/** Junior keeps the original Letter Match game untouched.
    Advanced gets a tabbed multilingual track header. */
function ReadingRouter() {
  const mode = useLearningMode();
  return mode === "advanced" ? <AdvancedReading /> : <LetterMatch />;
}

const LANG_TABS = [
  { id: "english", label: "🇬🇧 English", color: "bg-berry" },
  { id: "hindi", label: "🪔 हिंदी", color: "bg-tangerine" },
  { id: "kannada", label: "🌼 ಕನ್ನಡ", color: "bg-grass" },
  { id: "tamil", label: "🛕 தமிழ்", color: "bg-grape" },
] as const;

type LangTab = (typeof LANG_TABS)[number]["id"];

function AdvancedReading() {
  const soundOn = useAppStore((s) => s.soundOn);
  const [tab, setTab] = useState<LangTab>("english");
  return (
    <main className="min-h-dvh bg-sky-scene flex flex-col">
      <TopBar title="Reading Island" emoji="📚" />
      {/* mobile-friendly horizontally scrollable tab header */}
      <nav
        className="flex gap-2 px-4 py-2 overflow-x-auto snap-x"
        aria-label="Language tracks"
      >
        {LANG_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { playTap(soundOn); setTab(t.id); }}
            aria-pressed={tab === t.id}
            className={`font-display text-lg rounded-2xl px-5 py-2.5 shadow-chunkySm whitespace-nowrap snap-start transition min-h-[48px]
              ${tab === t.id ? `${t.color} text-white scale-105` : "bg-white text-slate-600"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 flex flex-col items-center justify-start pt-4 px-4 pb-8 overflow-y-auto">
        {tab === "english" && <StoryReader />}
        {tab === "hindi" && <LetterTracer language="hindi" key="hi" />}
        {tab === "kannada" && <LetterTracer language="kannada" key="kn" />}
        {tab === "tamil" && <TamilSpeaker />}
      </div>
    </main>
  );
}

function LetterMatch() {
  const router = useRouter();
  const { soundOn, awardStarAndSticker } = useAppStore();
  const [letters, setLetters] = useState<string[]>(makeLetters);
  const [targets] = useState(() => shuffle(Array.from({ length: PAIRS_PER_ROUND }, (_, i) => i)));
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [shaking, setShaking] = useState<string | null>(null);
  const [reward, setReward] = useState<Sticker | null>(null);
  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const targetOrder = targets.map((i) => letters[i]).filter(Boolean);

  const handleMatch = (lower: string, upper: string) => {
    if (lower === upper) {
      const next = new Set(matched).add(lower);
      setMatched(next);
      playSuccess(soundOn);
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
      if (next.size === PAIRS_PER_ROUND) {
        setTimeout(() => setReward(awardStarAndSticker("reading")), 700);
      }
    } else {
      playRetry(soundOn);
      setShaking(lower);
      setTimeout(() => setShaking(null), 500);
    }
    setSelected(null);
  };

  /** After a drag ends, check which uppercase target the pointer is over. */
  const onDragEnd = (
    letter: string,
    e: MouseEvent | TouchEvent | PointerEvent
  ) => {
    const point =
      "changedTouches" in e && e.changedTouches.length
        ? e.changedTouches[0]
        : (e as PointerEvent);
    const x = point.clientX;
    const y = point.clientY;
    for (const t of targetOrder) {
      const el = targetRefs.current[t];
      if (!el || matched.has(t)) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        handleMatch(letter, t);
        return;
      }
    }
  };

  const restart = () => {
    setReward(null);
    setLetters(makeLetters());
    setMatched(new Set());
    setSelected(null);
  };

  return (
    <main className="min-h-dvh bg-sky-scene flex flex-col">
      <TopBar title="Reading Island" emoji="📖" />

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-5 pb-8">
        <h2 className="font-display text-2xl sm:text-3xl text-slate-700 text-center">
          Match the little letters to the BIG letters! 🔤
        </h2>

        {/* Uppercase targets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {targetOrder.map((t, i) => (
            <div
              key={t}
              ref={(el) => { targetRefs.current[t] = el; }}
              onClick={() => selected && handleMatch(selected, t)}
              role="button"
              aria-label={`Uppercase ${t.toUpperCase()}${matched.has(t) ? ", matched" : ""}`}
              className={`${TARGET_COLORS[i % TARGET_COLORS.length]}
                rounded-[1.75rem] shadow-chunky w-28 h-28 sm:w-32 sm:h-32
                flex items-center justify-center font-display text-6xl text-white
                transition ${matched.has(t) ? "opacity-100 ring-8 ring-grass/60" : "opacity-90"}
                ${selected ? "cursor-pointer animate-pulse" : ""}`}
            >
              {matched.has(t) ? (
                <span className="flex flex-col items-center leading-none">
                  {t.toUpperCase()}
                  <span className="text-2xl">✅</span>
                </span>
              ) : (
                t.toUpperCase()
              )}
            </div>
          ))}
        </div>

        {/* Lowercase draggables */}
        <div className="flex flex-wrap justify-center gap-4 min-h-[110px]">
          {letters.map(
            (l) =>
              !matched.has(l) && (
                <motion.div
                  key={l}
                  drag
                  dragSnapToOrigin
                  dragElastic={0.2}
                  whileDrag={{ scale: 1.25, zIndex: 50 }}
                  whileTap={{ scale: 1.1 }}
                  onDragEnd={(e) => onDragEnd(l, e as any)}
                  onClick={() => {
                    playTap(soundOn);
                    setSelected(selected === l ? null : l);
                  }}
                  animate={
                    shaking === l
                      ? { x: [0, -10, 10, -8, 8, 0] }
                      : selected === l
                      ? { y: [0, -8, 0] }
                      : {}
                  }
                  transition={
                    selected === l ? { repeat: Infinity, duration: 0.8 } : { duration: 0.4 }
                  }
                  role="button"
                  aria-label={`Lowercase ${l}${selected === l ? ", selected" : ""}`}
                  className={`bg-white rounded-[1.5rem] shadow-chunky w-20 h-20 sm:w-24 sm:h-24
                    flex items-center justify-center font-display text-5xl text-slate-700
                    cursor-grab active:cursor-grabbing touch-none
                    ${selected === l ? "ring-8 ring-sun" : ""}`}
                >
                  {l}
                </motion.div>
              )
          )}
        </div>

        <p className="font-body text-slate-500 text-center">
          Drag a small letter onto its big partner — or tap one, then tap the other! 👆
        </p>
      </div>

      <RewardOverlay
        sticker={reward}
        onClose={() => router.push("/dashboard")}
        onPlayAgain={restart}
      />
    </main>
  );
}
