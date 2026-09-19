'use client';

// app/olympiad/practice/page.tsx
// Practice mode — pick questions by year/section/topic, answer at own pace,
// see instant feedback + step-by-step Singapore-method solution.

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { narrate } from '@/lib/narrator';
import { useAppStore } from '@/store/useAppStore';
import { ClientGate, TopBar } from '@/components/ui';
import { ALL_QUESTIONS_G1, type SMCQuestion } from '@/lib/smc/questions-g1';
import { isCorrect } from '@/lib/smc/scoring';
import { getMarksForQuestion } from '@/lib/smc/spec';
import DrawingCanvas from '@/components/olympiad/DrawingCanvas';
import { playTap, playSuccess } from '@/lib/sounds';

let _CapApp: any = null;
function CapApp() {
  if (_CapApp) return _CapApp;
  _CapApp = require('@capacitor/app').App;
  return _CapApp;
}

function say(text: string) {
  try { void narrate(text); } catch { /* best-effort */ }
}

type FilterMode = 'all' | '2025' | '2023' | 'hard';

export default function PracticePage() {
  return <ClientGate><PracticeMode /></ClientGate>;
}

function PracticeMode() {
  const router = useRouter();
  const soundOn = useAppStore((s) => s.soundOn);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [pool, setPool] = useState<SMCQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [showCanvas, setShowCanvas] = useState(false);
  const [phase, setPhase] = useState<'select' | 'play' | 'done'>('select');

  // back button
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: any;
    let cancelled = false;
    CapApp().addListener('backButton', () => {
      if (phase === 'play') { setPhase('select'); } else router.push('/olympiad');
    }).then((h: any) => cancelled ? h.remove() : (handle = h)).catch(() => {});
    return () => { cancelled = true; handle?.remove(); };
  }, [phase, router]);

  function buildPool(f: FilterMode) {
    let q = ALL_QUESTIONS_G1;
    if (f === '2025') q = q.filter((x) => x.year === 2025);
    else if (f === '2023') q = q.filter((x) => x.year === 2023);
    else if (f === 'hard') q = q.filter((x) => x.difficulty === 3);
    return [...q].sort(() => Math.random() - 0.5);
  }

  function start(f: FilterMode) {
    const p = buildPool(f);
    if (!p.length) return;
    setFilter(f);
    setPool(p);
    setIndex(0);
    setAnswer('');
    setSubmitted(false);
    setSessionStats({ correct: 0, total: 0 });
    setPhase('play');
    say(`Let's practise! Question 1 of ${p.length}.`);
  }

  const current = pool[index];

  useEffect(() => {
    if (current && !submitted) {
      say(current.stem);
    }
  }, [current, submitted]);

  function submit() {
    if (!current || submitted || !answer.trim()) return;
    const ok = isCorrect(answer, current.correctAnswer);
    setCorrect(ok);
    setSubmitted(true);
    setSessionStats((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
    if (ok) {
      say('Well done! That is correct!');
      try { (playSuccess as any)(soundOn); } catch {}
    } else {
      say(`Not quite. The correct answer is ${current.correctAnswer}. Let's see why.`);
    }
  }

  function next() {
    if (index + 1 >= pool.length) {
      setPhase('done');
      say(`Great work! You got ${sessionStats.correct} out of ${sessionStats.total} correct.`);
      return;
    }
    setIndex((i) => i + 1);
    setAnswer('');
    setSubmitted(false);
    setShowCanvas(false);
  }

  function pickMCQ(letter: string) {
    if (submitted) return;
    setAnswer(letter);
  }

  if (phase === 'select') {
    return (
      <main className="min-h-dvh bg-sky-scene flex flex-col">
        <TopBar title="Practice Mode" emoji="📝" />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-5 py-6">
          <p className="font-display text-2xl text-slate-700 text-center">Choose what to practise</p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            {([
              { f: 'all', emoji: '📚', label: 'All Questions', sub: `${ALL_QUESTIONS_G1.length} questions` },
              { f: '2025', emoji: '📄', label: '2025 Paper', sub: 'Latest format (31 Qs)' },
              { f: '2023', emoji: '📄', label: '2023 Paper', sub: 'Previous year (40 Qs)' },
              { f: 'hard', emoji: '🔥', label: 'Challenging', sub: 'Non-routine only' },
            ] as const).map((opt) => (
              <motion.button
                key={opt.f}
                whileTap={{ scale: 0.92 }}
                onClick={() => { playTap(soundOn); start(opt.f); }}
                className="bg-white rounded-[2rem] shadow-chunky p-5 flex flex-col items-center gap-2"
              >
                <span className="text-4xl">{opt.emoji}</span>
                <span className="font-display text-base text-slate-700">{opt.label}</span>
                <span className="font-body text-xs text-slate-400">{opt.sub}</span>
              </motion.button>
            ))}
          </div>
          <button onClick={() => router.push('/olympiad')} className="font-body text-slate-400 underline py-2">
            ← Back
          </button>
        </div>
      </main>
    );
  }

  if (phase === 'done') {
    const pct = Math.round((sessionStats.correct / sessionStats.total) * 100);
    return (
      <main className="min-h-dvh bg-sky-scene flex flex-col items-center justify-center gap-6 px-5">
        <div className="bg-white rounded-[2rem] shadow-chunky p-8 text-center max-w-sm w-full">
          <div className="text-6xl mb-3">🎉</div>
          <p className="font-display text-2xl text-slate-700">Practice done!</p>
          <p className="font-display text-5xl text-sky-600 mt-4">{sessionStats.correct}/{sessionStats.total}</p>
          <p className="font-body text-slate-400 text-sm mt-1">{pct}% correct</p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => start(filter)} className="flex-1 bg-grass rounded-2xl py-3 font-display text-white">
              Again
            </button>
            <button onClick={() => router.push('/olympiad')} className="flex-1 bg-sky-kid rounded-2xl py-3 font-display text-white">
              Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- play phase ---
  return (
    <main
      className="min-h-dvh flex flex-col"
      style={{ background: 'linear-gradient(160deg, #0c4a6e, #0ea5e9)' }}
    >
      {/* header */}
      <div
        className="flex items-center gap-3 px-4 pb-3"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => setPhase('select')}
          className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-xl text-white active:scale-95"
          aria-label="Exit practice"
        >✕</button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-yellow-300 transition-[width] duration-300"
            style={{ width: `${((index) / pool.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-bold text-white/90">{index + 1}/{pool.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={current?.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="bg-white rounded-[2rem] p-5 shadow-2xl"
          >
            {/* section badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="rounded-full bg-sky-100 text-sky-700 px-3 py-1 text-xs font-bold">
                Section {current?.section} · {getMarksForQuestion(index + 1) || current?.section === 'A' ? 2 : current?.section === 'B' ? 4 : 5} marks
              </span>
              <span className="rounded-full bg-slate-100 text-slate-500 px-3 py-1 text-xs font-bold">
                {current?.year}
              </span>
              {'⭐'.repeat(current?.difficulty ?? 1)}
            </div>

            {/* question stem */}
            <p className="font-body text-slate-800 text-lg leading-relaxed mb-4">
              {current?.stem}
            </p>

            {/* MCQ options */}
            {current?.type === 'mcq' && current.options && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {current.options.map((opt) => {
                  let cls = 'rounded-2xl p-4 text-left font-body text-base border-2 transition ';
                  if (!submitted) {
                    cls += answer === opt.letter
                      ? 'bg-sky-100 border-sky-400 text-sky-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700';
                  } else {
                    if (opt.letter === current.correctAnswer) cls += 'bg-emerald-50 border-emerald-400 text-emerald-800';
                    else if (opt.letter === answer) cls += 'bg-rose-50 border-rose-400 text-rose-800';
                    else cls += 'bg-slate-50 border-slate-200 text-slate-400';
                  }
                  return (
                    <button
                      key={opt.letter}
                      onClick={() => pickMCQ(opt.letter)}
                      disabled={submitted}
                      className={cls}
                    >
                      <span className="font-bold">{opt.letter}.</span> {opt.text}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Open-ended input */}
            {current?.type === 'open' && !submitted && (
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  inputMode="numeric"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="Type your answer…"
                  className="flex-1 rounded-2xl border-2 border-sky-300 px-4 py-3 font-body text-lg text-slate-800 focus:border-sky-500 outline-none"
                />
                {current.unit && (
                  <span className="self-center font-body text-slate-400 text-sm">{current.unit}</span>
                )}
              </div>
            )}

            {/* Submitted open answer */}
            {current?.type === 'open' && submitted && (
              <div className={`rounded-2xl p-4 mb-4 ${correct ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-rose-50 border-2 border-rose-300'}`}>
                <p className="font-body text-sm">
                  Your answer: <strong>{answer}</strong>{current.unit ? ` ${current.unit}` : ''}
                </p>
                <p className="font-body text-sm mt-1">
                  Correct answer: <strong>{current.correctAnswer}</strong>{current.unit ? ` ${current.unit}` : ''}
                </p>
              </div>
            )}

            {/* Submit button */}
            {!submitted && (
              <button
                onClick={submit}
                disabled={!answer.trim()}
                className="w-full bg-sky-kid text-white rounded-2xl py-4 font-display text-lg shadow disabled:opacity-40 active:scale-95"
              >
                Check Answer ✓
              </button>
            )}

            {/* Solution reveal */}
            {submitted && (
              <div className="mt-4">
                <div className={`rounded-2xl p-4 mb-3 ${correct ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  <p className="font-display text-white text-lg">
                    {correct ? '🌟 Correct! Well done!' : '💡 Not quite — let\'s learn!'}
                  </p>
                </div>
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                  <p className="font-bold text-amber-700 text-sm mb-1">
                    🧠 Singapore Method: {current?.heuristic}
                  </p>
                  <p className="font-body text-slate-700 text-sm leading-relaxed">{current?.solution}</p>
                  {current?.commonMistake && (
                    <p className="font-body text-rose-600 text-xs mt-2">
                      ⚠️ Watch out: {current.commonMistake}
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Drawing canvas toggle */}
        <button
          onClick={() => setShowCanvas((v) => !v)}
          className="self-start bg-white/20 text-white rounded-2xl px-4 py-2 font-body text-sm"
        >
          ✏️ {showCanvas ? 'Hide' : 'Show'} Rough Work
        </button>
        {showCanvas && <DrawingCanvas height={200} />}

        {/* Next button */}
        {submitted && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={next}
            className="w-full bg-white text-slate-800 rounded-2xl py-4 font-display text-lg shadow-chunky active:scale-95"
          >
            {index + 1 >= pool.length ? 'Finish 🎉' : 'Next Question →'}
          </motion.button>
        )}
      </div>
    </main>
  );
}
