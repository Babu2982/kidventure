'use client';

// app/olympiad/exam/page.tsx
// Full mock exam: 31 questions (2025 format), 90-minute countdown, no calculator,
// section-by-section navigation, results + award band prediction at the end.

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Capacitor } from '@capacitor/core';
import { narrate } from '@/lib/narrator';
import { useAppStore } from '@/store/useAppStore';
import { useGameStore } from '@/store/useGameStore';
import { ClientGate, TopBar } from '@/components/ui';
import { QUESTIONS_BY_YEAR, type SMCQuestion } from '@/lib/smc/questions-g1';
import { scoreSession, type AnswerRecord } from '@/lib/smc/scoring';
import { SMC_G1_SPEC } from '@/lib/smc/spec';
import DrawingCanvas from '@/components/olympiad/DrawingCanvas';

let _CapApp: any = null;
function CapApp() {
  if (_CapApp) return _CapApp;
  _CapApp = require('@capacitor/app').App;
  return _CapApp;
}

const TOTAL_SECONDS = SMC_G1_SPEC.durationMinutes * 60; // 5400

type ExamPhase = 'intro' | 'exam' | 'review' | 'results';

export default function ExamPage() {
  return <ClientGate><MockExam /></ClientGate>;
}

function MockExam() {
  const router = useRouter();
  const recordSession = useGameStore((s: any) => s.recordOlympiadSession);

  const questions = QUESTIONS_BY_YEAR[2025];
  const [phase, setPhase] = useState<ExamPhase>('intro');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [showCanvas, setShowCanvas] = useState(false);
  const [results, setResults] = useState<ReturnType<typeof scoreSession> | null>(null);
  const questionStartedAt = useRef<number>(Date.now());
  const timeTakenPerQ = useRef<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // back button
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: any;
    CapApp().addListener('backButton', () => {
      if (phase === 'exam') {/* ignore during exam */} else router.back();
    }).then((h: any) => (handle = h)).catch(() => {});
    return () => handle?.remove();
  }, [phase, router]);

  // countdown timer
  useEffect(() => {
    if (phase !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          finishExam();
          return 0;
        }
        if (t === 300) try { narrate('5 minutes remaining!'); } catch {}
        if (t === 60)  try { narrate('1 minute remaining!'); } catch {}
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function startExam() {
    setPhase('exam');
    setCurrent(0);
    setAnswers({});
    setTimeLeft(TOTAL_SECONDS);
    questionStartedAt.current = Date.now();
    try { narrate('The mock exam has started. Good luck!'); } catch {}
  }

  function setAnswer(qId: string, val: string) {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  }

  function navigateTo(idx: number) {
    // record time on current question
    const id = questions[current]?.id;
    if (id) {
      timeTakenPerQ.current[id] = (timeTakenPerQ.current[id] ?? 0) +
        Math.round((Date.now() - questionStartedAt.current) / 1000);
    }
    setCurrent(idx);
    setShowCanvas(false);
    questionStartedAt.current = Date.now();
  }

  function finishExam() {
    clearInterval(timerRef.current!);
    // record last question time
    const id = questions[current]?.id;
    if (id) {
      timeTakenPerQ.current[id] = (timeTakenPerQ.current[id] ?? 0) +
        Math.round((Date.now() - questionStartedAt.current) / 1000);
    }

    const records: AnswerRecord[] = questions.map((q) => ({
      questionNumber: q.questionNumber,
      studentAnswer: answers[q.id] ?? '',
      correctAnswer: q.correctAnswer,
      timeTakenSeconds: timeTakenPerQ.current[q.id] ?? 0,
    }));

    const result = scoreSession(records);
    setResults(result);
    setPhase('results');

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }
    try {
      recordSession?.({ ...result, paperId: '2025' });
    } catch {}
    try {
      narrate(`Exam complete! You scored ${result.totalScore} out of ${result.maxScore}. ${result.awardBand.label}!`);
    } catch {}
  }

  const q = questions[current];
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  const timerUrgent = timeLeft < 300;

  // ---- INTRO ----
  if (phase === 'intro') {
    return (
      <main className="min-h-dvh bg-sky-scene flex flex-col">
        <TopBar title="Mock Exam" emoji="⏱️" />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-5">
          <div className="bg-white rounded-[2rem] shadow-chunky p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-3">📄</div>
            <h1 className="font-display text-2xl text-slate-700 mb-3">SMC Grade 1 — Mock Paper</h1>
            <div className="text-left bg-slate-50 rounded-2xl p-4 text-sm font-body text-slate-600 space-y-2">
              <p>🕐 90 minutes — timer starts when you press Start</p>
              <p>📝 31 questions (Section A: MCQ · Section B & C: open-ended)</p>
              <p>✅ No negative marking — attempt every question</p>
              <p>🚫 No calculator allowed</p>
              <p>✏️ Use the rough-work canvas for working steps</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startExam}
              className="mt-6 w-full bg-berry text-white rounded-2xl py-4 font-display text-xl shadow-chunky"
            >
              Start Exam 🚀
            </motion.button>
            <button onClick={() => router.push('/olympiad')} className="mt-3 font-body text-slate-400 underline text-sm">
              ← Not yet, go back
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---- RESULTS ----
  if (phase === 'results' && results) {
    const { totalScore, maxScore, awardBand, sections, byQuestion } = results;
    return (
      <main className="min-h-dvh flex flex-col items-center bg-sky-scene py-6 px-4 gap-5">
        {/* score card */}
        <div className="w-full max-w-md bg-white rounded-[2rem] shadow-chunky p-6 text-center">
          <div className="text-5xl mb-2">{awardBand.emoji}</div>
          <p className="font-display text-3xl" style={{ color: awardBand.color }}>{totalScore}/{maxScore}</p>
          <p className="font-display text-xl text-slate-600 mt-1">{awardBand.label}</p>
          {/* section breakdown */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {sections.map((sec) => (
              <div key={sec.sectionId} className="bg-slate-50 rounded-2xl p-3">
                <p className="font-display text-sm text-slate-500">Section {sec.sectionId}</p>
                <p className="font-display text-2xl text-slate-800">
                  {sec.marksEarned}<span className="text-slate-400 text-sm">/{sec.marksAvailable}</span>
                </p>
                <p className="font-body text-xs text-slate-400">{sec.accuracyPct}% accurate</p>
              </div>
            ))}
          </div>
        </div>

        {/* question-by-question review */}
        <div className="w-full max-w-md bg-white rounded-[2rem] shadow-chunky p-5">
          <p className="font-display text-base text-slate-600 mb-3">Question Review</p>
          <div className="grid grid-cols-6 gap-2">
            {byQuestion.map((bq, i) => (
              <div
                key={bq.questionNumber}
                className={`rounded-xl py-2 text-center text-sm font-bold ${
                  bq.studentAnswer === ''
                    ? 'bg-slate-100 text-slate-400'
                    : bq.correct
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-600'
                }`}
              >
                {bq.questionNumber}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-3 text-xs font-body text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 inline-block"/>Correct</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-100 inline-block"/>Wrong</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 inline-block"/>Skipped</span>
          </div>
        </div>

        <div className="flex gap-3 w-full max-w-md">
          <button
            onClick={startExam}
            className="flex-1 bg-berry text-white rounded-2xl py-3 font-display"
          >
            Retry
          </button>
          <button
            onClick={() => router.push('/olympiad')}
            className="flex-1 bg-grass text-white rounded-2xl py-3 font-display"
          >
            Done
          </button>
        </div>
      </main>
    );
  }

  // ---- EXAM ----
  const answeredCount = Object.values(answers).filter((v) => v.trim() !== '').length;
  const sectionStart = SMC_G1_SPEC.sections.find((s) => q?.questionNumber >= s.from && q?.questionNumber <= s.to);

  return (
    <main className="min-h-dvh flex flex-col bg-slate-50">
      {/* sticky header */}
      <div
        className="sticky top-0 z-10 bg-white shadow-sm flex items-center gap-3 px-4 pb-3 border-b border-slate-100"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        {/* timer */}
        <div className={`font-display text-2xl font-black min-w-[5rem] ${timerUrgent ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
          {mins}:{secs}
        </div>
        {/* progress bar */}
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-400 rounded-full transition-[width] duration-300"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
        <span className="font-body text-sm text-slate-500">{answeredCount}/{questions.length}</span>
        <button
          onClick={finishExam}
          className="bg-berry text-white rounded-xl px-3 py-2 font-display text-sm active:scale-95"
        >
          Submit
        </button>
      </div>

      {/* section navigation pills */}
      <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto">
        {SMC_G1_SPEC.sections.map((sec) => {
          const isCurrentSection = q?.questionNumber >= sec.from && q?.questionNumber <= sec.to;
          return (
            <button
              key={sec.id}
              onClick={() => {
                const firstQ = questions.findIndex((x) => x.questionNumber === sec.from);
                if (firstQ >= 0) navigateTo(firstQ);
              }}
              className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap transition ${
                isCurrentSection ? 'bg-sky-kid text-white' : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              Section {sec.id}: {sec.from}–{sec.to}
            </button>
          );
        })}
      </div>

      {/* question dots */}
      <div className="px-4 pt-2 pb-1 flex gap-1 flex-wrap">
        {questions.map((qq, i) => {
          const answered = (answers[qq.id] ?? '').trim() !== '';
          const isCur = i === current;
          return (
            <button
              key={qq.id}
              onClick={() => navigateTo(i)}
              className={`w-7 h-7 rounded-full text-xs font-bold transition ${
                isCur ? 'bg-sky-600 text-white ring-2 ring-sky-300' :
                answered ? 'bg-emerald-400 text-white' : 'bg-white border border-slate-200 text-slate-500'
              }`}
            >
              {qq.questionNumber}
            </button>
          );
        })}
      </div>

      {/* question card */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-3 overflow-y-auto pb-6">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={q?.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-[2rem] shadow-chunky p-5"
          >
            {/* meta */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <span className="rounded-full bg-sky-100 text-sky-700 px-3 py-1 text-xs font-bold">
                Q{q?.questionNumber} · Section {sectionStart?.id} · {sectionStart?.marksEach} marks
              </span>
              <span className="text-xs text-slate-400 self-center">{'⭐'.repeat(q?.difficulty ?? 1)}</span>
            </div>

            {/* stem */}
            <p className="font-body text-slate-800 text-lg leading-relaxed mb-5">{q?.stem}</p>

            {/* calculator lock notice */}
            <div className="flex items-center gap-2 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <span>🚫</span>
              <span className="font-body text-xs text-amber-700">Calculator not allowed — Grade 1</span>
            </div>

            {/* MCQ */}
            {q?.type === 'mcq' && q.options && (
              <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt) => {
                  const picked = answers[q.id] === opt.letter;
                  return (
                    <button
                      key={opt.letter}
                      onClick={() => setAnswer(q.id, opt.letter)}
                      className={`rounded-2xl p-4 text-left font-body text-base border-2 transition active:scale-95 ${
                        picked ? 'bg-sky-100 border-sky-400 text-sky-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="font-bold">{opt.letter}.</span> {opt.text}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Open-ended */}
            {q?.type === 'open' && (
              <div className="flex gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Write your answer here…"
                  className="flex-1 rounded-2xl border-2 border-sky-300 px-4 py-3 font-body text-lg text-slate-800 focus:border-sky-500 outline-none"
                />
                {q.unit && <span className="self-center font-body text-slate-400 text-sm">{q.unit}</span>}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* rough work canvas */}
        <button
          onClick={() => setShowCanvas((v) => !v)}
          className="self-start bg-slate-100 text-slate-600 rounded-2xl px-4 py-2 font-body text-sm active:scale-95"
        >
          ✏️ {showCanvas ? 'Hide' : 'Show'} Rough Work
        </button>
        {showCanvas && <DrawingCanvas height={200} />}

        {/* prev / next */}
        <div className="flex gap-3">
          <button
            onClick={() => current > 0 && navigateTo(current - 1)}
            disabled={current === 0}
            className="flex-1 bg-white border-2 border-slate-200 rounded-2xl py-3 font-display text-slate-700 disabled:opacity-30 active:scale-95"
          >
            ← Prev
          </button>
          <button
            onClick={() => current < questions.length - 1 && navigateTo(current + 1)}
            disabled={current === questions.length - 1}
            className="flex-1 bg-sky-kid text-white rounded-2xl py-3 font-display active:scale-95 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>
    </main>
  );
}
