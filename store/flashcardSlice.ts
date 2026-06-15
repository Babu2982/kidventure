// store/flashcardSlice.ts
// Drop-in Zustand slice for the Master Minds SM-2 tracker.
// Spread this into your existing create() — it touches none of your v3 state.
// REQUIREMENT: your store already exposes `activeProfileId: string | null`.

import {
  newFlashcard,
  reviewCard,
  dueCards,
  type FlashcardState,
  type Recall,
} from '@/lib/spacedRepetition';

export interface FlashcardSlice {
  /** profileId -> cardId -> SM-2 state (lightweight; lives in localStorage via persist) */
  flashcardProgress: Record<string, Record<string, FlashcardState>>;
  /** Seed any not-yet-tracked cards for the active profile (idempotent). */
  initFlashcards: (cardIds: string[]) => void;
  /** Grade one review and reschedule via SM-2. */
  reviewFlashcard: (cardId: string, recall: Recall) => void;
  /** Due cards for the active profile, hardest-first. */
  getDueFlashcards: () => string[];
}

// set/get are intentionally loosely typed so this file needs no knowledge of
// your full GameState. Tighten to StateCreator<GameState,...> if you prefer.
export const createFlashcardSlice = (set: any, get: any): FlashcardSlice => ({
  flashcardProgress: {},

  initFlashcards: (cardIds) =>
    set((s: any) => {
      const pid = s.activeProfileId;
      if (!pid) return {};
      const deck = { ...(s.flashcardProgress?.[pid] ?? {}) };
      let changed = false;
      for (const id of cardIds) {
        if (!deck[id]) {
          deck[id] = newFlashcard();
          changed = true;
        }
      }
      if (!changed) return {};
      return { flashcardProgress: { ...s.flashcardProgress, [pid]: deck } };
    }),

  reviewFlashcard: (cardId, recall) =>
    set((s: any) => {
      const pid = s.activeProfileId;
      if (!pid) return {};
      const deck = { ...(s.flashcardProgress?.[pid] ?? {}) };
      deck[cardId] = reviewCard(deck[cardId] ?? newFlashcard(), recall);
      return { flashcardProgress: { ...s.flashcardProgress, [pid]: deck } };
    }),

  getDueFlashcards: () => {
    const s = get();
    const pid = s.activeProfileId;
    return pid ? dueCards(s.flashcardProgress?.[pid] ?? {}) : [];
  },
});
