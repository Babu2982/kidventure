// lib/smc/bank/types.ts
// Compact question format used inside the bank batches.

export interface BankQuestion {
  id: string;
  stem: string;
  type: 'mcq' | 'open';
  opts?: [string, string, string, string]; // MCQ: A,B,C,D text
  answer: string;                           // MCQ: 'A'|'B'|'C'|'D'  Open: numeric/text
  solution: string;
  topic: string;
  diff: 1 | 2 | 3;
  h: string;  // heuristic
  unit?: string;
}
