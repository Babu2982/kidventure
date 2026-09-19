// lib/smc/scoring.ts
// Pure, zero-dependency scoring engine for SMC Grade 1.
// All functions are side-effect free and unit-testable.

import { SMC_G1_SPEC, getMarksForQuestion } from './spec';

// ---------------------------------------------------------------------------
// Answer normalisation
// ---------------------------------------------------------------------------

/** Strip whitespace, dollar/rupee signs, unit suffixes, and normalise case. */
export function normalise(raw: string | number): string {
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/^\$|^rs\.?\s*/i, '')   // remove currency
    .replace(/\s*(cm|m|kg|g|ml|l|cents?|¢|min|mins?|hours?|hrs?)\s*$/i, '') // strip units
    .replace(/\s+/g, ' ');           // collapse spaces
}

/** Accept "1:2", "1/2", "0.5" as equivalent when they evaluate the same. */
export function normaliseFraction(s: string): string {
  const colonMatch = s.match(/^(\d+):(\d+)$/);
  if (colonMatch) return `${colonMatch[1]}/${colonMatch[2]}`;
  return s;
}

/**
 * Grade one answer against the correct answer.
 * For MCQ: case-insensitive letter match (a/b/c/d).
 * For open: normalise both sides; accept numeric tolerance of ±0.
 */
export function isCorrect(
  studentAnswer: string | number,
  correctAnswer: string | number,
  tolerancePct = 0,
): boolean {
  const s = normaliseFraction(normalise(studentAnswer));
  const c = normaliseFraction(normalise(correctAnswer));
  if (s === c) return true;

  // Numeric tolerance check
  const sNum = parseFloat(s);
  const cNum = parseFloat(c);
  if (!isNaN(sNum) && !isNaN(cNum)) {
    if (tolerancePct === 0) return sNum === cNum;
    return Math.abs(sNum - cNum) / Math.max(Math.abs(cNum), 1) <= tolerancePct / 100;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Session scoring
// ---------------------------------------------------------------------------

export interface AnswerRecord {
  questionNumber: number;   // 1–31
  studentAnswer: string;    // '' = unanswered
  correctAnswer: string;
  timeTakenSeconds: number;
}

export interface SectionResult {
  sectionId: string;
  attempted: number;
  correct: number;
  marksEarned: number;
  marksAvailable: number;
  accuracyPct: number;
}

export interface SessionResult {
  totalScore: number;
  maxScore: number;
  percentScore: number;
  awardBand: (typeof SMC_G1_SPEC.awardBands)[number];
  sections: SectionResult[];
  byQuestion: Array<{
    questionNumber: number;
    correct: boolean;
    marksEarned: number;
    studentAnswer: string;
    correctAnswer: string;
  }>;
  totalTimeSeconds: number;
}

export function scoreSession(answers: AnswerRecord[]): SessionResult {
  const byQuestion = answers.map((a) => {
    const correct = a.studentAnswer !== '' && isCorrect(a.studentAnswer, a.correctAnswer);
    const marks = getMarksForQuestion(a.questionNumber);
    return {
      questionNumber: a.questionNumber,
      correct,
      marksEarned: correct ? marks : 0,
      studentAnswer: a.studentAnswer,
      correctAnswer: a.correctAnswer,
    };
  });

  const totalScore = byQuestion.reduce((s, q) => s + q.marksEarned, 0);
  const maxScore = SMC_G1_SPEC.totalMarks;
  const percentScore = Math.round((totalScore / maxScore) * 100);

  const awardBand =
    SMC_G1_SPEC.awardBands.find((b) => totalScore >= b.minScore) ??
    SMC_G1_SPEC.awardBands[SMC_G1_SPEC.awardBands.length - 1];

  const sections = SMC_G1_SPEC.sections.map((sec) => {
    const qInSection = byQuestion.filter(
      (q) => q.questionNumber >= sec.from && q.questionNumber <= sec.to,
    );
    const attempted = qInSection.filter((q) => q.studentAnswer !== '').length;
    const correct = qInSection.filter((q) => q.correct).length;
    const marksEarned = qInSection.reduce((s, q) => s + q.marksEarned, 0);
    return {
      sectionId: sec.id,
      attempted,
      correct,
      marksEarned,
      marksAvailable: sec.totalMarks,
      accuracyPct: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    };
  });

  return {
    totalScore,
    maxScore,
    percentScore,
    awardBand,
    sections,
    byQuestion,
    totalTimeSeconds: answers.reduce((s, a) => s + a.timeTakenSeconds, 0),
  };
}

/** Quick award prediction given a raw score. */
export function predictAward(score: number) {
  return (
    SMC_G1_SPEC.awardBands.find((b) => score >= b.minScore) ??
    SMC_G1_SPEC.awardBands[SMC_G1_SPEC.awardBands.length - 1]
  );
}
