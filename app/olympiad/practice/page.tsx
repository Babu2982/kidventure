'use client';

// app/olympiad/practice/page.tsx
// Practice mode — now powered by 540+ bank questions across 12 topics.
// Combines the official paper questions (71) with the full bank (540).

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { narrate } from '@/lib/narrator';
import { useAppStore } from '@/store/useAppStore';
import { ClientGate, TopBar } from '@/components/ui';
import { ALL_QUESTIONS_G1 } from '@/lib/smc/questions-g1';
import { BANK_QUESTIONS, BANK_BY_TOPIC, BANK_TOPICS } from '@/lib/smc/bank/index';
import type { SMCQuestion } from '@/lib/smc/questions-g1';
import { isCorrect } from '@/lib/smc/scoring';
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

type FilterMode =
  | 'all'
  | '2025'
  | '2023'
  | 'hard'
  | 'topic';

const TOPIC_LABELS: Record<string, string> = {
  'place-value': '🔢 Place Value',
  'addition': '➕ Addition',
  'subtraction': '➖ Subtraction',
  'multiplication': '✖️ Multiplication',
  'division': '➗ Division',
  'money': '💵 Money',
  'time': '🕐 Time',
  'measurement': '📏 Measurement',
  'geometry': '📐 Geometry',
  'patterns': '🔄 Patterns',
  'data': '📊 Data & Graphs',
  'logic': '🧠 Logic & Word Problems',
};

export default function PracticePage() {
  return <ClientGate><PracticeMode /></ClientGate>;
}

function PracticeMode() {
  const router = useRouter();
  const soundOn = useAppStore((s) => s.soundOn);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [pool, setPool] = useState<SMCQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [showCanvas, setShowCanvas] = useState(false);
  const [phase, setPhase] = useState<'select' | 'topic-pick' | 'play' | 'done'>('select');

  // back button
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: any;
    let cancelled = false;
    CapApp().addListener('backButton', () => {
      if (phase === 'play') setPhase('select');
      else if (phase === 'topic-pick') setPhase('select');
      else router.push('/olympiad');
    }).then((h: any) => cancelled ? h.remove() : (handle = h)).catch(() => {});
    return () => { cancelled = true; handle?.remove(); };
  }, [phase, router]);

  const ALL_BANK = [...ALL_QUESTIONS_G1, ...BANK_QUESTIONS];

  function buildPool(f: FilterMode, topic = ''): SMCQuestion[] {
    let q: SMCQuestion[] = [];
    if (f === '2025') q = ALL_QUESTIONS_G1.filter((x) => x.year === 2025);
    else if (f === '2023') q = ALL_QUESTIONS_G1.filter((x) => x.year === 2023);
    else if (f === 'hard') q = ALL_BANK.filter((x) => x.difficulty === 3);
    else if (f === 'topic') q = BANK_BY_TOPIC[topic] ?? [];
    else q = ALL_BANK; // 'all'
    return [...q].sort(() => Math.random() - 0.5);
  }

  function start(f: FilterMode, topic = '') {
    const p = buildPool(f, topic);
    if (!p.length) return;
    setFilter(f);
    setSelectedTopic(topic);
    setPool(p);
    setIndex(0);
    setAnswer('');
    setSubmitted(false);
    setSessionStats({ correct: 0, total: 0 });
    setPhase('play');
    say(`Let's practise! ${p.length} questions ready.`);
  }

  const current = pool[index];

  useEffect(() => {
    if (current && !submitted) say(current.stem);
  }, [current, submitted]);

  function submit() {
    if (!current || submitted || !answer.trim()) return;
    const ok = isCorrect(answer, current.correctAnswer);
    setCorrect(ok);
    setSubmitted(true);
    setSessionStats((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
    if (ok) {
      say('Correct! Well done!');
      try { (playSuccess as any)(soundOn); } catch {}
    } else {
      say(`Not quite. The answer is ${current.correctAnswer}.`);
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

  // ---- SELECT screen ----
  if (phase === 'select') {
    return (
      <main className="min-h-dvh bg-sky-scene flex flex-col">
        <TopBar title="Practice Mode" emoji="📝" />
        <div className="flex-1 flex flex-col items-center gap-4 px-5 py-6">
          <p className="font-display text-2xl text-slate-700 text-center">Choose what to practise</p>
          <p className="font-body text-sm text-slate-400 text-center">
            {ALL_BANK.length} questions from 3 papers + 12 topic banks
          </p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            {([
              { f: 'all', emoji: '📚', label: 'All Questions', sub: `${ALL_BANK.length} questions` },
              { f: '2025', emoji: '📄', label: '2025 Paper', sub: '31 Qs — latest format' },
              { f: '2023', emoji: '📄', label: '2023 Paper', sub: '40 Qs — previous year' },
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

          {/* Topic picker */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { playTap(soundOn); setPhase('topic-pick'); }}
            className="w-full max-w-sm bg-sky-kid rounded-[2rem] shadow-chunky py-4 text-white font-display text-lg"
          >
            🎯 Practice by Topic
          </motion.button>

          <button onClick={() => router.push('/olympiad')} className="font-body text-slate-400 underline py-2">
            ← Back
          </button>
        </div>
      </main>
    );
  }

  // ---- TOPIC PICKER ----
  if (phase === 'topic-pick') {
    return (
      <main className="min-h-dvh bg-sky-scene flex flex-col">
        <TopBar title="Pick a Topic" emoji="🎯" />
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {BANK_TOPICS.map((topic) => {
            const count = (BANK_BY_TOPIC[topic] ?? []).length;
            return (
              <motion.button
                key={topic}
                whileTap={{ scale: 0.95 }}
                onClick={() => { playTap(soundOn); start('topic', topic); }}
                className="bg-white rounded-[2rem] shadow-chunky px-5 py-4 flex items-center gap-4"
              >
                <span className="text-3xl">{(TOPIC_LABELS[topic] ?? topic).split(' ')[0]}</span>
                <div className="text-left">
                  <p className="font-display text-base text-slate-700">
                    {(TOPIC_LABELS[topic] ?? topic).slice(2)}
                  </p>
                  <p className="font-body text-xs text-slate-400">{count} questions</p>
                </div>
              </motion.button>
            );
          })}
          <button onClick={() => setPhase('select')} className="font-body text-slate-400 underline py-2 mt-2">
            ← Back
          </button>
        </div>
      </main>
    );
  }

  // ---- DONE ----
  if (phase === 'done') {
    const pct = Math.round((sessionStats.correct / sessionStats.total) * 100);
    return (
      <main className="min-h-dvh bg-sky-scene flex flex-col items-center justify-center gap-6 px-5">
        <div className="bg-white rounded-[2rem] shadow-chunky p-8 text-center max-w-sm w-full">
          <div className="text-6xl mb-3">🎉</div>
          <p className="font-display text-2xl text-slate-700">Session done!</p>
          <p className="font-display text-5xl text-sky-600 mt-4">{sessionStats.correct}/{sessionStats.total}</p>
          <p className="font-body text-slate-400 text-sm mt-1">{pct}% correct</p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => start(filter, selectedTopic)} className="flex-1 bg-grass rounded-2xl py-3 font-display text-white">
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

  // ---- PLAY ----
  return (
    <main className="min-h-dvh flex flex-col" style={{ background: 'linear-gradient(160deg,#0c4a6e,#0ea5e9)' }}>
      {/* header */}
      <div className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: 'max(1.25rem,env(safe-area-inset-top))' }}>
        <button onClick={() => setPhase('select')} className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-xl text-white active:scale-95">✕</button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-yellow-300 transition-[width] duration-300" style={{ width: `${(index / pool.length) * 100}%` }} />
        </div>
        <span className="text-sm font-bold text-white/90">{index + 1}/{pool.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={current?.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="bg-white rounded-[2rem] p-5 shadow-2xl"
          >
            {/* badges */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="rounded-full bg-sky-100 text-sky-700 px-3 py-1 text-xs font-bold">
                {TOPIC_LABELS[current?.topicTags?.[0] ?? ''] ?? current?.topicTags?.[0] ?? 'Practice'}
              </span>
              <span className="text-xs text-slate-400">{'⭐'.repeat(current?.difficulty ?? 1)}</span>
            </div>

            <p className="font-body text-slate-800 text-lg leading-relaxed mb-4">{current?.stem}</p>

            {/* MCQ */}
            {current?.type === 'mcq' && current.options && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {current.options.map((opt) => {
                  let cls = 'rounded-2xl p-4 text-left font-body text-base border-2 transition ';
                  if (!submitted) {
                    cls += answer === opt.letter ? 'bg-sky-100 border-sky-400 text-sky-800' : 'bg-slate-50 border-slate-200 text-slate-700';
                  } else {
                    if (opt.letter === current.correctAnswer) cls += 'bg-emerald-50 border-emerald-400 text-emerald-800';
                    else if (opt.letter === answer) cls += 'bg-rose-50 border-rose-400 text-rose-800';
                    else cls += 'bg-slate-50 border-slate-200 text-slate-400';
                  }
                  return (
                    <button key={opt.letter} onClick={() => pickMCQ(opt.letter)} disabled={submitted} className={cls}>
                      <span className="font-bold">{opt.letter}.</span> {opt.text}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Open input */}
            {current?.type === 'open' && !submitted && (
              <div className="flex gap-3 mb-4">
                <input
                  type="text" inputMode="numeric" value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="Your answer…"
                  className="flex-1 rounded-2xl border-2 border-sky-300 px-4 py-3 font-body text-lg text-slate-800 focus:border-sky-500 outline-none"
                />
                {current.unit && <span className="self-center font-body text-slate-400 text-sm">{current.unit}</span>}
              </div>
            )}

            {/* Submitted open */}
            {current?.type === 'open' && submitted && (
              <div className={`rounded-2xl p-4 mb-4 ${correct ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-rose-50 border-2 border-rose-300'}`}>
                <p className="font-body text-sm">Your answer: <strong>{answer}</strong>{current.unit ? ` ${current.unit}` : ''}</p>
                <p className="font-body text-sm mt-1">Correct: <strong>{current.correctAnswer}</strong>{current.unit ? ` ${current.unit}` : ''}</p>
              </div>
            )}

            {!submitted && (
              <button onClick={submit} disabled={!answer.trim()} className="w-full bg-sky-kid text-white rounded-2xl py-4 font-display text-lg shadow disabled:opacity-40 active:scale-95">
                Check Answer ✓
              </button>
            )}

            {submitted && (
              <div className="mt-4">
                <div className={`rounded-2xl p-4 mb-3 ${correct ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  <p className="font-display text-white text-lg">{correct ? '🌟 Correct!' : '💡 Not quite — here\'s why:'}</p>
                </div>
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                  <p className="font-bold text-amber-700 text-sm mb-1">🧠 {current?.heuristic}</p>
                  <p className="font-body text-slate-700 text-sm leading-relaxed">{current?.solution}</p>
                  {current?.commonMistake && (
                    <p className="font-body text-rose-600 text-xs mt-2">⚠️ Watch out: {current.commonMistake}</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <button onClick={() => setShowCanvas((v) => !v)} className="self-start bg-white/20 text-white rounded-2xl px-4 py-2 font-body text-sm">
          ✏️ {showCanvas ? 'Hide' : 'Show'} Rough Work
        </button>
        {showCanvas && <DrawingCanvas height={200} />}

        {submitted && (
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={next}
            className="w-full bg-white text-slate-800 rounded-2xl py-4 font-display text-lg shadow-chunky active:scale-95">
            {index + 1 >= pool.length ? 'Finish 🎉' : 'Next Question →'}
          </motion.button>
        )}
      </div>
    </main>
  );
}
