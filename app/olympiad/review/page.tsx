'use client';

// app/olympiad/review/page.tsx
// Shows the child's Olympiad practice history, best score, and award trajectory.

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { ClientGate, TopBar } from '@/components/ui';
import { SMC_G1_SPEC } from '@/lib/smc/spec';

export default function ReviewPage() {
  return <ClientGate><ProgressReview /></ClientGate>;
}

function ProgressReview() {
  const router = useRouter();
  const getProfile = useGameStore((s: any) => s.getOlympiadProfile);
  const profile = getProfile?.() ?? {
    totalSessions: 0,
    bestScore: 0,
    totalQuestionsAttempted: 0,
    totalQuestionsCorrect: 0,
    recentSessions: [],
  };

  const accuracyPct = profile.totalQuestionsAttempted > 0
    ? Math.round((profile.totalQuestionsCorrect / profile.totalQuestionsAttempted) * 100)
    : 0;

  const bestAward = SMC_G1_SPEC.awardBands.find((b) => profile.bestScore >= b.minScore)
    ?? SMC_G1_SPEC.awardBands[SMC_G1_SPEC.awardBands.length - 1];

  const nextAward = SMC_G1_SPEC.awardBands
    .slice()
    .reverse()
    .find((b) => b.minScore > profile.bestScore);

  return (
    <main className="min-h-dvh bg-sky-scene flex flex-col">
      <TopBar title="My Progress" emoji="📊" />
      <div className="flex-1 flex flex-col items-center gap-5 px-5 py-6">

        {profile.totalSessions === 0 ? (
          <div className="bg-white rounded-[2rem] shadow-chunky p-8 text-center max-w-sm w-full">
            <div className="text-5xl mb-3">📝</div>
            <p className="font-display text-xl text-slate-600">No sessions yet!</p>
            <p className="font-body text-slate-400 text-sm mt-2">
              Complete a practice or mock exam to see your progress here.
            </p>
            <button
              onClick={() => router.push('/olympiad/practice')}
              className="mt-5 w-full bg-sky-kid text-white rounded-2xl py-3 font-display"
            >
              Start Practising
            </button>
          </div>
        ) : (
          <>
            {/* summary card */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] shadow-chunky p-5"
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl">{bestAward.emoji}</div>
                <div>
                  <p className="font-display text-2xl" style={{ color: bestAward.color }}>
                    Best: {profile.bestScore}/100
                  </p>
                  <p className="font-body text-slate-500 text-sm">{bestAward.label}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-slate-50 rounded-2xl p-3 text-center">
                  <p className="font-display text-2xl text-slate-800">{profile.totalSessions}</p>
                  <p className="font-body text-xs text-slate-400">Sessions</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 text-center">
                  <p className="font-display text-2xl text-slate-800">{accuracyPct}%</p>
                  <p className="font-body text-xs text-slate-400">Accuracy</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 text-center">
                  <p className="font-display text-2xl text-slate-800">{profile.totalQuestionsCorrect}</p>
                  <p className="font-body text-xs text-slate-400">Correct</p>
                </div>
              </div>

              {nextAward && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <p className="font-body text-xs text-amber-700">
                    🎯 Next goal: <strong>{nextAward.label}</strong> — need {nextAward.minScore} marks
                    ({nextAward.minScore - profile.bestScore} more to go!)
                  </p>
                </div>
              )}
            </motion.div>

            {/* award bands reference */}
            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-chunky p-5">
              <p className="font-display text-sm text-slate-500 mb-3">Award Bands</p>
              {SMC_G1_SPEC.awardBands.map((band) => {
                const achieved = profile.bestScore >= band.minScore;
                return (
                  <div key={band.label} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <span className="text-2xl">{achieved ? band.emoji : '🔒'}</span>
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${achieved ? 'text-slate-700' : 'text-slate-300'}`}>
                        {band.label}
                      </p>
                      <p className="font-body text-xs text-slate-400">≥ {band.minScore} marks</p>
                    </div>
                    {achieved && (
                      <span className="rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold px-2 py-1">
                        Achieved
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* recent sessions */}
            {profile.recentSessions.length > 0 && (
              <div className="w-full max-w-md bg-white rounded-[2rem] shadow-chunky p-5">
                <p className="font-display text-sm text-slate-500 mb-3">Recent Sessions</p>
                {profile.recentSessions.map((sess: any) => (
                  <div key={sess.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-slate-700">
                        {sess.awardLabel} · {sess.totalScore}/{sess.maxScore}
                      </p>
                      <p className="font-body text-xs text-slate-400">
                        {new Date(sess.completedAt).toLocaleDateString()} · {sess.paperId} paper
                      </p>
                    </div>
                    <span className="font-display text-lg text-slate-600">
                      {Math.round((sess.totalScore / sess.maxScore) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <button onClick={() => router.push('/olympiad')} className="font-body text-slate-400 underline py-2">
          ← Back to Olympiad
        </button>
      </div>
    </main>
  );
}
