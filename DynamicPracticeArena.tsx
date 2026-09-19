'use client';

// components/DynamicPracticeArena.tsx
// "Brain Boost" — genuinely dynamic practice. Unlike fixed flashcards, math
// problems are TEMPLATES that get fresh random numbers rolled in every round
// (see lib/dynamicContent.ts expandMathTemplate), so even a modest template
// pool never repeats identically. Logic rounds shuffle in fresh distractors.
// Speech routes through the native narrate() layer (project convention).

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Capacitor } from '@capacitor/core';
import { narrate } from '@/lib/narrator';
import {
  loadMathTemplates,
  loadLogicPatterns,
  expandMathTemplate,
  type MathProblemTemplate,
  type LogicPattern,
} from '@/lib/dynamicContent';

let _CapApp: any = null;
function CapApp() {
  if (_CapApp) return _CapApp;
  _CapApp = require('@capacitor/app').App;
  return _CapApp;
}

export interface BrainBoostSummary {
  total: number;
  correct: number;
  durationMs: number;
}

interface DynamicPracticeArenaProps {
  mode?: 'junior' | 'advanced';
  skillLevel?: number;
  roundsPerSession?: number; // default 10
  onComplete?: (summary: BrainBoostSummary) => void;
  onExit?: () => void;
}

interface Round {
  id: string;
  kind: 'math' | 'logic';
  prompt: string;
  options: (string | number)[];
  correctIndex: number;
}

function say(text?: string) {
  if (!text) return;
  try {
    void narrate(text);
  } catch {
    /* narration is best-effort */
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildNumericDistractors(correct: number, count: number): number[] {
  const used = new Set<number>([correct]);
  const out: number[] = [];
  let attempts = 0;
  while (out.length < count && attempts < 60) {
    attempts++;
    const offset = randomInt(1, 7) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = correct + offset;
    if (!used.has(candidate)) {
      used.add(candidate);
      out.push(candidate);
    }
  }
  while (out.length < count) {
    out.push(correct + out.length + 1); // guaranteed-unique fallback
  }
  return out;
}

function buildMathRound(template: MathProblemTemplate): Round {
  const expanded = expandMathTemplate(template);
  const distractors = buildNumericDistractors(expanded.answer, 3);
  const options = shuffle([expanded.answer, ...distractors]);
  return {
    id: expanded.id,
    kind: 'math',
    prompt: expanded.question,
    options,
    correctIndex: options.indexOf(expanded.answer),
  };
}

function buildLogicRound(pattern: LogicPattern): Round {
  const pool = shuffle([pattern.answer, ...pattern.distractors]).slice(0, 4);
  const options = pool.includes(pattern.answer) ? pool : [pattern.answer, ...pool.slice(0, 3)];
  return {
    id: `${pattern.id}-${Date.now()}`,
    kind: 'logic',
    prompt: pattern.sequence.map(String).join('   ·   '),
    options,
    correctIndex: options.indexOf(pattern.answer),
  };
}

function buildQueue(math: MathProblemTemplate[], logic: LogicPattern[], size: number): Round[] {
  const queue: Round[] = [];
  for (let i = 0; i < size; i++) {
    const useMath = math.length && (i % 2 === 0 || !logic.length);
    if (useMath && math.length) {
      queue.push(buildMathRound(math[randomInt(0, math.length - 1)]));
    } else if (logic.length) {
      queue.push(buildLogicRound(logic[randomInt(0, logic.length - 1)]));
    }
  }
  return queue;
}

export default function DynamicPracticeArena({
  mode = 'advanced',
  skillLevel = 1,
  roundsPerSession = 10,
  onComplete,
  onExit,
}: DynamicPracticeArenaProps) {
  const reduceMotion = useReducedMotion();

  const [phase, setPhase] = useState<'loading' | 'play' | 'summary'>('loading');
  const [mathPool, setMathPool] = useState<MathProblemTemplate[]>([]);
  const [logicPool, setLogicPool] = useState<LogicPattern[]>([]);
  const [queue, setQueue] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [summary, setSummary] = useState<BrainBoostSummary>({ total: 0, correct: 0, durationMs: 0 });

  const startedAt = useRef(0);
  const correctCount = useRef(0);

  // back button closes the overlay (native only)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: { remove: () => void } | undefined;
    let cancelled = false;
    CapApp()
      .addListener('backButton', () => onExit?.())
      .then((h: { remove: () => void }) => (cancelled ? h.remove() : (handle = h)))
      .catch(() => {});
    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [onExit]);

  const startSession = useCallback((math: MathProblemTemplate[], logic: LogicPattern[]) => {
    setQueue(buildQueue(math, logic, roundsPerSession));
    setIndex(0);
    setPicked(null);
    correctCount.current = 0;
    startedAt.current = Date.now();
    setPhase('play');
  }, [roundsPerSession]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [math, logic] = await Promise.all([
        loadMathTemplates(mode, skillLevel),
        loadLogicPatterns(mode, skillLevel),
      ]);
      if (!alive) return;
      setMathPool(math);
      setLogicPool(logic);
      startSession(math, logic);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, skillLevel]);

  const current = phase === 'play' ? queue[index] : undefined;

  useEffect(() => {
    if (current) say(current.prompt.replace(/\s*·\s*/g, ', '));
  }, [current]);

  const finish = useCallback(() => {
    const result: BrainBoostSummary = {
      total: queue.length,
      correct: correctCount.current,
      durationMs: Date.now() - startedAt.current,
    };
    setSummary(result);
    setPhase('summary');
    say(`Great work! You got ${result.correct} out of ${result.total} right!`);
    if (!reduceMotion) confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    onComplete?.(result);
  }, [queue.length, reduceMotion, onComplete]);

  const pick = useCallback(
    (i: number) => {
      if (picked !== null || !current) return;
      setPicked(i);
      const isCorrect = i === current.correctIndex;
      if (isCorrect) {
        correctCount.current += 1;
        say('Correct! Well done!');
      } else {
        say(`Not quite. The answer is ${current.options[current.correctIndex]}.`);
      }
      setTimeout(() => {
        if (index + 1 >= queue.length) finish();
        else {
          setIndex((n) => n + 1);
          setPicked(null);
        }
      }, 1400);
    },
    [picked, current, index, queue.length, finish],
  );

  const progressPct = queue.length ? Math.round((index / queue.length) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #064e3b, #0d9488)' }}
    >
      <div
        className="flex items-center gap-3 px-4 pb-3"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={onExit}
          aria-label="Close Brain Boost"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-2xl text-white active:scale-95"
        >
          ✕
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-yellow-300 transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="min-w-[3rem] text-right text-sm font-bold text-white/90">
          {phase === 'play' ? `${index + 1}/${queue.length}` : ''}
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-5 pb-6">
        {phase === 'loading' && (
          <p className="animate-pulse text-lg font-semibold text-white/80">Warming up your brain…</p>
        )}

        {phase === 'play' && current && (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`${index}-${current.id}`}
              initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="w-full max-w-[440px] rounded-[2rem] bg-white p-6 shadow-2xl"
            >
              <div className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-emerald-600">
                {current.kind === 'math' ? '🔢 Math Challenge' : '🧩 Pattern Puzzle'}
              </div>
              <div className="mb-6 text-center text-2xl font-extrabold leading-snug text-slate-900">
                {current.prompt}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {current.options.map((opt, i) => {
                  const isCorrect = i === current.correctIndex;
                  const isPicked = i === picked;
                  const showResult = picked !== null;
                  let style = 'bg-cream text-slate-700';
                  if (showResult && isCorrect) style = 'bg-emerald-500 text-white';
                  else if (showResult && isPicked) style = 'bg-rose-500 text-white';
                  return (
                    <button
                      key={i}
                      onClick={() => pick(i)}
                      disabled={picked !== null}
                      className={`rounded-2xl px-4 py-4 text-xl font-bold shadow-chunkySm transition active:scale-95 ${style}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {phase === 'summary' && (
          <div className="w-full max-w-[420px] text-center text-white">
            <div className="mb-3 text-6xl">🚀</div>
            <p className="text-2xl font-black">Brain Boost complete!</p>
            <p className="mt-2 text-lg text-white/90">
              {summary.correct} / {summary.total} correct
            </p>
            <div className="mt-7 flex gap-3">
              <button
                onClick={() => startSession(mathPool, logicPool)}
                className="flex-1 rounded-2xl bg-white/20 py-3 text-lg font-extrabold text-white active:scale-95"
              >
                Play Again
              </button>
              <button
                onClick={onExit}
                className="flex-1 rounded-2xl bg-white py-3 text-lg font-extrabold text-slate-900 active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
