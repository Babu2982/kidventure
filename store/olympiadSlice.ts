// store/olympiadSlice.ts
// Zustand slice for tracking SMC Olympiad practice progress per child.
// Spreads into useGameStore alongside the existing flashcard slice.
// Data is lightweight — only aggregate stats + recent session history.

import type { SessionResult } from '@/lib/smc/scoring';

export interface OlympiadSession {
  id: string;
  paperId: '2025' | '2023' | 'practice';
  completedAt: number;
  totalScore: number;
  maxScore: number;
  durationSeconds: number;
  awardLabel: string;
  bySection: Array<{ sectionId: string; marksEarned: number; marksAvailable: number }>;
}

export interface OlympiadProfile {
  totalSessions: number;
  bestScore: number;
  totalQuestionsAttempted: number;
  totalQuestionsCorrect: number;
  recentSessions: OlympiadSession[]; // last 10
  weakTopics: string[];              // populated after 3+ sessions
}

export interface OlympiadSlice {
  olympiadProgress: Record<string, OlympiadProfile>; // profileId -> stats
  recordOlympiadSession: (result: SessionResult & { paperId: OlympiadSession['paperId'] }) => void;
  getOlympiadProfile: () => OlympiadProfile;
}

const emptyProfile = (): OlympiadProfile => ({
  totalSessions: 0,
  bestScore: 0,
  totalQuestionsAttempted: 0,
  totalQuestionsCorrect: 0,
  recentSessions: [],
  weakTopics: [],
});

export const createOlympiadSlice = (set: any, get: any): OlympiadSlice => ({
  olympiadProgress: {},

  recordOlympiadSession: (result) => {
    const s = get();
    const pid = s.activeProfileId;
    if (!pid) return;

    const existing: OlympiadProfile = s.olympiadProgress?.[pid] ?? emptyProfile();
    const session: OlympiadSession = {
      id: `${Date.now().toString(36)}`,
      paperId: result.paperId,
      completedAt: Date.now(),
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      durationSeconds: result.totalTimeSeconds,
      awardLabel: result.awardBand.label,
      bySection: result.sections.map((sec) => ({
        sectionId: sec.sectionId,
        marksEarned: sec.marksEarned,
        marksAvailable: sec.marksAvailable,
      })),
    };

    const updated: OlympiadProfile = {
      totalSessions: existing.totalSessions + 1,
      bestScore: Math.max(existing.bestScore, result.totalScore),
      totalQuestionsAttempted:
        existing.totalQuestionsAttempted + result.byQuestion.filter((q) => q.studentAnswer !== '').length,
      totalQuestionsCorrect:
        existing.totalQuestionsCorrect + result.byQuestion.filter((q) => q.correct).length,
      recentSessions: [session, ...existing.recentSessions].slice(0, 10),
      weakTopics: existing.weakTopics, // could be enhanced with topic analysis
    };

    set((prev: any) => ({
      olympiadProgress: { ...prev.olympiadProgress, [pid]: updated },
    }));
  },

  getOlympiadProfile: () => {
    const s = get();
    const pid = s.activeProfileId;
    if (!pid) return emptyProfile();
    return s.olympiadProgress?.[pid] ?? emptyProfile();
  },
});
