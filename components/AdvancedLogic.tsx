"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useGameStore, type Sticker } from "@/store/useGameStore";
import { playTap, playSuccess, playRetry } from "@/lib/sounds";
import { BigButton } from "@/components/ui";
import { RewardOverlay } from "@/components/RewardOverlay";
import { useRouter } from "next/navigation";

/* ====================================================================
   Game 1: Bharatanatyam Rhythm Matcher
   A 4-beat adi-style cycle flashes (1-2-3-4, "1" accented like the
   thattu). The child taps the big drum exactly on each beat.
   Accuracy = |tap time − nearest beat time| via performance.now().
   ==================================================================== */

const BEAT_MS = 800;          // 75 BPM — gentle for small hands
const BEATS_PER_CYCLE = 4;
const CYCLES_PER_ROUND = 4;   // 16 taps per round
const GOOD_WINDOW = 220;      // ms tolerance for a "hit"
const PERFECT_WINDOW = 110;
const HITS_TO_WIN = 10;       // hits needed within a round → sticker

const BOLS = ["தை", "யா", "தை", "ஹி"]; // tai-ya-tai-hi style syllables

export function RhythmMatcher() {
  const router = useRouter();
  const { soundOn, awardStarAndSticker } = useGameStore();
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1); // 0..3 currently flashing
  const [taps, setTaps] = useState<Array<"perfect" | "good" | "miss">>([]);
  const [lastVerdict, setLastVerdict] = useState<"perfect" | "good" | "miss" | null>(null);
  const [reward, setReward] = useState<Sticker | null>(null);
  const startTime = useRef(0);
  const timerRef = useRef<number | null>(null);
  const tapsRef = useRef(taps);
  tapsRef.current = taps;

  const totalBeats = BEATS_PER_CYCLE * CYCLES_PER_ROUND;

  const stop = () => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    timerRef.current = null;
    setRunning(false);
    setBeat(-1);
  };

  const finish = () => {
    stop();
    const hits = tapsRef.current.filter((t) => t !== "miss").length;
    if (hits >= HITS_TO_WIN) {
      playSuccess(soundOn);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => setReward(awardStarAndSticker("logic", "sports")), 600);
    } else {
      playRetry(soundOn);
    }
  };

  const start = () => {
    setTaps([]);
    setLastVerdict(null);
    setRunning(true);
    startTime.current = performance.now() + 600; // brief lead-in
    const loop = () => {
      const now = performance.now();
      const elapsed = now - startTime.current;
      if (elapsed >= totalBeats * BEAT_MS + BEAT_MS) {
        finish();
        return;
      }
      const idx = Math.floor(elapsed / BEAT_MS);
      setBeat(elapsed < 0 ? -1 : idx % BEATS_PER_CYCLE);
      timerRef.current = requestAnimationFrame(loop);
    };
    timerRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => () => stop(), []);

  const drumTap = () => {
    if (!running) return;
    playTap(soundOn);
    const now = performance.now();
    const elapsed = now - startTime.current;
    if (elapsed < 0) return;
    // timing delta to the NEAREST beat boundary
    const nearestBeat = Math.round(elapsed / BEAT_MS) * BEAT_MS;
    const delta = Math.abs(elapsed - nearestBeat);
    const verdict =
      delta <= PERFECT_WINDOW ? "perfect" : delta <= GOOD_WINDOW ? "good" : "miss";
    if (verdict === "miss") playRetry(soundOn);
    setLastVerdict(verdict);
    setTaps((t) => [...t, verdict]);
  };

  const hits = taps.filter((t) => t !== "miss").length;

  return (
    <section className="flex flex-col items-center gap-5 w-full max-w-md">
      <p className="font-body text-slate-500 text-center">
        💃 Follow the beat cycle — tap the drum exactly when a circle lights up!
      </p>

      {/* the 4-beat cycle */}
      <div className="flex gap-4" aria-label="Beat cycle">
        {BOLS.map((bol, i) => (
          <motion.div
            key={i}
            animate={
              beat === i
                ? { scale: 1.3, backgroundColor: i === 0 ? "#F06292" : "#FFD54F" }
                : { scale: 1, backgroundColor: "#FFFFFF" }
            }
            transition={{ duration: 0.12 }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-chunky flex flex-col items-center justify-center"
          >
            <span className="font-display text-2xl text-slate-700">{i + 1}</span>
            <span className="font-body text-xs text-slate-400">{bol}</span>
          </motion.div>
        ))}
      </div>

      {/* progress */}
      <div className="font-display text-slate-600" aria-live="polite">
        🥁 Hits: {hits} / {HITS_TO_WIN}
        <AnimatePresence mode="wait">
          {lastVerdict && (
            <motion.span
              key={taps.length}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`ml-3 ${
                lastVerdict === "perfect"
                  ? "text-grass"
                  : lastVerdict === "good"
                  ? "text-sun"
                  : "text-berry"
              }`}
            >
              {lastVerdict === "perfect" ? "🌟 Perfect!" : lastVerdict === "good" ? "👍 Good!" : "💨 Missed"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* the drum */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onPointerDown={drumTap}
        disabled={!running}
        aria-label="Tap drum on the beat"
        className={`w-44 h-44 sm:w-52 sm:h-52 rounded-full shadow-chunky font-display text-3xl text-white
          flex items-center justify-center touch-none transition
          ${running ? "bg-tangerine" : "bg-slate-300"}`}
      >
        🪘 TAP
      </motion.button>

      {!running ? (
        <BigButton color="bg-grass text-white" onClick={start}>
          ▶️ Start the beat
        </BigButton>
      ) : (
        <BigButton color="bg-white" className="!text-lg" onClick={stop}>
          ⏹️ Stop
        </BigButton>
      )}

      <RewardOverlay
        sticker={reward}
        onClose={() => router.push("/dashboard")}
        onPlayAgain={() => setReward(null)}
      />
    </section>
  );
}

/* ====================================================================
   Game 2: Olympiad Patterns — what comes next?
   Sequences built from sports emojis with patterns like
   AB-AB, ABB-ABB, ABBA, AABB. 4 puzzles → sticker.
   ==================================================================== */

const SPORT_EMOJIS = ["🛼", "🏸", "🥽", "🏊", "🥋", "⛸️"];
const PATTERNS = [
  ["A", "B", "A", "B", "A", "B"],
  ["A", "A", "B", "A", "A", "B"],
  ["A", "B", "B", "A", "B", "B"],
  ["A", "B", "B", "A", "A", "B", "B", "A"], // ABBA repeated
  ["A", "B", "C", "A", "B", "C"],
];
const PUZZLES_TO_WIN = 4;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface PatternPuzzle {
  shown: string[];   // sequence with the last item hidden
  answer: string;
  options: string[];
}

function makePatternPuzzle(): PatternPuzzle {
  const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
  const symbols = shuffle(SPORT_EMOJIS);
  const map: Record<string, string> = { A: symbols[0], B: symbols[1], C: symbols[2] };
  const seq = pattern.map((k) => map[k]);
  const answer = seq[seq.length - 1];
  const wrongPool = SPORT_EMOJIS.filter((e) => e !== answer);
  const options = shuffle([answer, ...shuffle(wrongPool).slice(0, 2)]);
  return { shown: seq.slice(0, -1), answer, options };
}

export function OlympiadPatterns() {
  const router = useRouter();
  const { soundOn, awardStarAndSticker } = useGameStore();
  const [puzzle, setPuzzle] = useState<PatternPuzzle>(() => makePatternPuzzle());
  const [solved, setSolved] = useState(0);
  const [feedback, setFeedback] = useState<"none" | "right" | "wrong">("none");
  const [locked, setLocked] = useState(false);
  const [reward, setReward] = useState<Sticker | null>(null);

  const answer = (e: string) => {
    if (locked) return;
    if (e === puzzle.answer) {
      setLocked(true);
      setFeedback("right");
      playSuccess(soundOn);
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.65 } });
      const done = solved + 1;
      setTimeout(() => {
        if (done >= PUZZLES_TO_WIN) {
          setReward(awardStarAndSticker("logic", "sports"));
          setSolved(0);
        } else {
          setSolved(done);
        }
        setPuzzle(makePatternPuzzle());
        setFeedback("none");
        setLocked(false);
      }, 1000);
    } else {
      setFeedback("wrong");
      playRetry(soundOn);
      setTimeout(() => setFeedback("none"), 900);
    }
  };

  return (
    <section className="flex flex-col items-center gap-5 w-full max-w-md">
      <div className="flex gap-1.5" aria-label={`${solved} of ${PUZZLES_TO_WIN} patterns solved`}>
        {Array.from({ length: PUZZLES_TO_WIN }).map((_, i) => (
          <span key={i} className={`w-3.5 h-3.5 rounded-full ${i < solved ? "bg-grass" : "bg-white/70"}`} />
        ))}
      </div>

      <h3 className="font-display text-2xl text-slate-700 text-center">
        What comes next? 🤔
      </h3>

      <motion.div
        key={puzzle.shown.join("")}
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: 0,
          x: feedback === "wrong" ? [0, -10, 10, -8, 8, 0] : 0,
        }}
        className="bg-white rounded-[2rem] shadow-chunky p-5 flex flex-wrap items-center justify-center gap-2 w-full"
      >
        {puzzle.shown.map((e, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300 }}
            className="text-4xl sm:text-5xl"
          >
            {e}
          </motion.span>
        ))}
        <span
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-4 border-dashed flex items-center justify-center text-3xl
            ${feedback === "right" ? "border-grass bg-grass/20" : "border-grape/50 bg-grape/10"}`}
          aria-label="Missing item"
        >
          {feedback === "right" ? puzzle.answer : "❓"}
        </span>
      </motion.div>

      <div className="flex gap-4">
        {puzzle.options.map((e) => (
          <motion.button
            key={e}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => answer(e)}
            disabled={locked}
            aria-label={`Choose ${e}`}
            className="bg-sun rounded-[1.5rem] shadow-chunky w-20 h-20 sm:w-24 sm:h-24 text-5xl disabled:opacity-50"
          >
            {e}
          </motion.button>
        ))}
      </div>

      {feedback === "wrong" && (
        <p className="font-display text-grape">Look at the pattern again — say it out loud! 🗣️</p>
      )}

      <RewardOverlay
        sticker={reward}
        onClose={() => router.push("/dashboard")}
        onPlayAgain={() => setReward(null)}
      />
    </section>
  );
}
