// lib/smc/spec.ts
// Single source of truth for SMC Grade 1 contest rules.
// Based on the 2025/2026 format (31 questions, 3 sections).

export const SMC_G1_SPEC = {
  grade: 1,
  durationMinutes: 90,
  minimumStayMinutes: 60,
  totalQuestions: 31,
  totalMarks: 100,
  calculatorAllowed: false,
  sections: [
    {
      id: 'A' as const,
      label: 'Section A',
      description: 'Multiple Choice',
      from: 1,
      to: 15,
      marksEach: 2,
      type: 'mcq' as const,
      optionCount: 4,
      penaltyWrong: 0,
      penaltyUnanswered: 0,
      totalMarks: 30,
    },
    {
      id: 'B' as const,
      label: 'Section B',
      description: 'Short Answer',
      from: 16,
      to: 25,
      marksEach: 4,
      type: 'open' as const,
      penaltyWrong: 0,
      penaltyUnanswered: 0,
      totalMarks: 40,
    },
    {
      id: 'C' as const,
      label: 'Section C',
      description: 'Non-Routine Problems',
      from: 26,
      to: 31,
      marksEach: 5,
      type: 'open' as const,
      penaltyWrong: 0,
      penaltyUnanswered: 0,
      totalMarks: 30,
    },
  ],
  awardBands: [
    { label: 'Perfect Scorer', emoji: '🌟', minScore: 96, color: '#f59e0b' },
    { label: 'Gold',           emoji: '🥇', minScore: 82, color: '#eab308' },
    { label: 'Silver',         emoji: '🥈', minScore: 68, color: '#94a3b8' },
    { label: 'Bronze',         emoji: '🥉', minScore: 54, color: '#b45309' },
    { label: 'Honourable Mention', emoji: '🏅', minScore: 40, color: '#6366f1' },
    { label: 'Participation',  emoji: '🎖️', minScore: 0,  color: '#22c55e' },
  ],
} as const;

export type SectionId = 'A' | 'B' | 'C';
export type QuestionType = 'mcq' | 'open';

export function getSectionForQuestion(qNum: number) {
  return SMC_G1_SPEC.sections.find(
    (s) => qNum >= s.from && qNum <= s.to,
  );
}

export function getMarksForQuestion(qNum: number): number {
  return getSectionForQuestion(qNum)?.marksEach ?? 0;
}
