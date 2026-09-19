'use client';

// app/olympiad/page.tsx
// SMC Olympiad Universe — Grade 1 training hub.
// Reuses existing KidVenture style tokens (bg-sky-scene, shadow-chunky etc.).

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useActiveProfile, useAppStore } from '@/store/useAppStore';
import { ClientGate, TopBar } from '@/components/ui';
import { SMC_G1_SPEC } from '@/lib/smc/spec';
import { playTap } from '@/lib/sounds';

const MODES = [
  {
    href: '/olympiad/practice',
    emoji: '📝',
    label: 'Practice Mode',
    sub: 'Pick a topic and practise at your own pace',
    color: 'bg-sky-kid',
    float: 0,
  },
  {
    href: '/olympiad/exam',
    emoji: '⏱️',
    label: 'Mock Exam',
    sub: 'Full 90-minute timed paper simulation',
    color: 'bg-berry',
    float: 0.4,
  },
  {
    href: '/olympiad/review',
    emoji: '📊',
    label: 'My Progress',
    sub: 'See scores, strengths and weak topics',
    color: 'bg-grass',
    float: 0.8,
  },
] as const;

export default function OlympiadPage() {
  return (
    <ClientGate>
      <OlympiadHub />
    </ClientGate>
  );
}

function OlympiadHub() {
  const router = useRouter();
  const profile = useActiveProfile();
  const soundOn = useAppStore((s) => s.soundOn);

  const spec = SMC_G1_SPEC;

  return (
    <main className="min-h-dvh bg-sky-scene flex flex-col">
      <TopBar title="SMC Olympiad" emoji="🏆" />

      <div className="flex-1 flex flex-col items-center gap-6 px-5 py-6">

        {/* Info banner */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl bg-white rounded-[2rem] shadow-chunky p-5"
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">🇸🇬</span>
            <div>
              <p className="font-display text-lg text-slate-700">Singapore Math Challenge — Grade 1</p>
              <p className="font-body text-sm text-slate-500">
                {spec.totalQuestions} questions · {spec.durationMinutes} minutes ·{' '}
                {spec.totalMarks} marks · No calculator
              </p>
            </div>
          </div>

          {/* Section pills */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {spec.sections.map((sec) => (
              <div
                key={sec.id}
                className="rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-sky-700"
              >
                Section {sec.id}: {sec.from}–{sec.to} · {sec.marksEach} marks each
              </div>
            ))}
          </div>
        </motion.div>

        {/* Mode tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {MODES.map((mode, i) => (
            <motion.button
              key={mode.href}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: [0, -6, 0] }}
              transition={{
                opacity: { delay: i * 0.1 },
                y: { delay: mode.float, repeat: Infinity, duration: 3.2, ease: 'easeInOut' },
              }}
              whileTap={{ scale: 0.93 }}
              onClick={() => { playTap(soundOn); router.push(mode.href); }}
              className={`${mode.color} rounded-[2rem] shadow-chunky p-6 flex flex-col items-center gap-2 min-h-[140px]`}
            >
              <span className="text-5xl" aria-hidden>{mode.emoji}</span>
              <span className="font-display text-xl text-white drop-shadow">{mode.label}</span>
              <span className="font-body text-white/80 text-xs text-center">{mode.sub}</span>
            </motion.button>
          ))}
        </div>

        {/* Award bands */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-2xl bg-white rounded-[2rem] shadow-chunky p-5"
        >
          <p className="font-display text-base text-slate-600 mb-3">🎖️ Award Bands</p>
          <div className="flex gap-2 flex-wrap">
            {spec.awardBands.map((band) => (
              <div
                key={band.label}
                className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-white"
                style={{ background: band.color }}
              >
                <span>{band.emoji}</span>
                <span>{band.label}</span>
                <span className="opacity-80">≥{band.minScore}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <button
          onClick={() => router.push('/dashboard')}
          className="font-body text-slate-400 underline underline-offset-4 py-2"
        >
          ← Back to dashboard
        </button>
      </div>
    </main>
  );
}
