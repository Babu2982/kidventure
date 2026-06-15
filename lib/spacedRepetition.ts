// lib/spacedRepetition.ts
// Pure, testable SuperMemo-2 (SM-2) implementation for the Master Minds engine.
// Kept dependency-free so it can be unit-tested and reused by the Zustand slice.

/** Per-card scheduling state, persisted in the store (keyed by profileId → cardId). */
export interface FlashcardState {
  repetitions: number; // n — consecutive correct recalls
  easiness: number; // EF — ease factor, floor 1.3, default 2.5
  interval: number; // days until next due
  dueAt: number; // epoch ms when the card is next due
  lastReviewed: number; // epoch ms
  seen: number; // total times shown (telemetry / parent dashboard)
  lapses: number; // times she missed it after having learned it
}

/**
 * Kid-friendly recall grades mapped to SM-2 quality q ∈ [0,5].
 * The UI never shows 0–5 — it shows e.g. 😀 / 🙂 / 😕 and maps to these.
 */
export type Recall = 'instant' | 'knew' | 'hesitated' | 'missed';

const QUALITY: Record<Recall, number> = {
  instant: 5,
  knew: 4,
  hesitated: 3,
  missed: 1,
};

const DAY = 24 * 60 * 60 * 1000;
const MIN_EF = 1.3;

export function newFlashcard(now = Date.now()): FlashcardState {
  return {
    repetitions: 0,
    easiness: 2.5,
    interval: 0,
    dueAt: now, // brand-new cards are due immediately
    lastReviewed: 0,
    seen: 0,
    lapses: 0,
  };
}

/**
 * Apply one SM-2 review. Pure: returns a NEW state, never mutates.
 * Standard SM-2: q<3 resets repetitions and relearns tomorrow; otherwise the
 * interval grows 1 → 6 → interval*EF. EF is nudged by the classic formula and
 * clamped to >= 1.3.
 */
export function reviewCard(
  card: FlashcardState,
  recall: Recall,
  now = Date.now(),
): FlashcardState {
  const q = QUALITY[recall];

  // EF update (classic SM-2). Always applied, then clamped.
  let easiness = card.easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easiness < MIN_EF) easiness = MIN_EF;

  let repetitions: number;
  let interval: number;
  let lapses = card.lapses;

  if (q < 3) {
    // Lapse — relearn from scratch tomorrow.
    repetitions = 0;
    interval = 1;
    if (card.repetitions > 0) lapses += 1;
  } else {
    repetitions = card.repetitions + 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(card.interval * easiness);
  }

  return {
    repetitions,
    easiness,
    interval,
    dueAt: now + interval * DAY,
    lastReviewed: now,
    seen: card.seen + 1,
    lapses,
  };
}

/** Cards due now, hardest-first (lowest EF, then most overdue) — good flash order. */
export function dueCards(
  deck: Record<string, FlashcardState>,
  now = Date.now(),
): string[] {
  return Object.keys(deck)
    .filter((id) => deck[id].dueAt <= now)
    .sort((a, b) => {
      const ef = deck[a].easiness - deck[b].easiness;
      if (ef !== 0) return ef; // struggled cards first
      return deck[a].dueAt - deck[b].dueAt; // then most overdue
    });
}
