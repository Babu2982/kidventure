// lib/smc/bank/index.ts
// Combines all batches into one array and adapts compact BankQuestion
// to the full SMCQuestion format the practice screen expects.
// Total: 540 bank questions + 71 official paper questions = 611 questions.

import type { SMCQuestion, SectionId } from '../spec';
import type { BankQuestion } from './types';
import { BATCH1 } from './batch1';
import { BATCH2 } from './batch2';
import { BATCH3 } from './batch3';

/** Map topic → closest SMC section for the mock exam section label. */
const TOPIC_SECTION: Record<string, SectionId> = {
  'place-value': 'A', 'addition': 'A', 'subtraction': 'A',
  'multiplication': 'B', 'division': 'B', 'money': 'B',
  'time': 'B', 'measurement': 'B', 'geometry': 'B',
  'patterns': 'C', 'data': 'C', 'logic': 'C',
};

/** Difficulty → rough marks hint (not real exam marks, just display). */
const DIFF_MARKS: Record<1|2|3, number> = { 1: 2, 2: 4, 3: 5 };

function adapt(bq: BankQuestion): SMCQuestion {
  return {
    id: bq.id,
    year: 2025,           // treated as practice — year is nominal
    section: TOPIC_SECTION[bq.topic] ?? 'B',
    questionNumber: 0,    // practice bank — no fixed number
    stem: bq.stem,
    type: bq.type,
    options: bq.opts
      ? ([['A', bq.opts[0]], ['B', bq.opts[1]], ['C', bq.opts[2]], ['D', bq.opts[3]]] as const)
          .map(([letter, text]) => ({ letter: letter as 'A'|'B'|'C'|'D', text }))
      : undefined,
    correctAnswer: bq.answer,
    unit: bq.unit,
    heuristic: bq.h,
    solution: bq.solution,
    difficulty: bq.diff,
    topicTags: [bq.topic],
    estimatedSeconds: bq.diff === 1 ? 60 : bq.diff === 2 ? 120 : 180,
  };
}

/** All 540 bank questions as full SMCQuestion objects. */
export const BANK_QUESTIONS: SMCQuestion[] = [
  ...BATCH1, ...BATCH2, ...BATCH3,
].map(adapt);

/** Quick lookup for filtering by topic. */
export const BANK_BY_TOPIC: Record<string, SMCQuestion[]> = {};
for (const q of BANK_QUESTIONS) {
  const t = q.topicTags[0] ?? 'other';
  if (!BANK_BY_TOPIC[t]) BANK_BY_TOPIC[t] = [];
  BANK_BY_TOPIC[t].push(q);
}

/** All unique topics in the bank. */
export const BANK_TOPICS = Object.keys(BANK_BY_TOPIC).sort();
