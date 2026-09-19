"use client";

/**
 * useGameStore — the app's single source of truth.
 *
 * v2 adds dual learning modes on top of the v1 schema.
 * v3 adds adaptive difficulty (PerformanceStats).
 * v4 adds Master Minds spaced-repetition tracker (flashcardProgress).
 * v5 adds SMC Olympiad progress tracker (olympiadProgress).
 *
 * Backward compatibility:
 *   - store/useAppStore.ts re-exports everything here, so all
 *     existing imports keep working.
 *   - The persist `migrate` function upgrades saved data with safe
 *     defaults at every version bump. No data is ever lost.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { syncProfileToCloud } from "@/lib/supabase";
import { createFlashcardSlice, type FlashcardSlice } from "./flashcardSlice";
import { createOlympiadSlice, type OlympiadSlice } from "./olympiadSlice";

/* ---------- Types ---------- */

export type ModuleId = "math" | "reading" | "logic" | "art";
export type LearningMode = "junior" | "advanced";
export type SportType = "badminton" | "swimming" | "skating";

export interface Sticker {
  id: string;
  emoji: string;
  name: string;
  earnedAt: number;
}

export interface SportsLogEntry {
  id: string;
  sport: SportType;
  minutes: number;
  note: string;
  loggedAt: number;
}

export interface PerformanceStats {
  correctStreak: number;
  totalAnswers: number;
  totalCorrect: number;
  totalTimeMs: number;
  averageTimePerAnswer: number;
  currentSkillCeiling: number;  // 1 (baseline) | 2 (intermediate) | 3 (olympiad)
  recentResults: boolean[];     // rolling window of the last 5 answers
}

export interface AdvancedMetrics {
  currentHindiLevel: number;
  currentKannadaLevel: number;
  abacusScore: number;
  olympiadLevel: number;
  sportsBadges: number;
  sportsLog: SportsLogEntry[];
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  avatar: string;
  stars: number;
  stickers: Sticker[];
  completions: Record<ModuleId, number>;
  createdAt: number;
  /* ---- v2 ---- */
  learningMode: LearningMode;
  advancedMetrics: AdvancedMetrics;
  /* ---- v3: adaptive difficulty ---- */
  performance: PerformanceStats;
}

interface GameState extends FlashcardSlice, OlympiadSlice {
  profiles: ChildProfile[];
  activeProfileId: string | null;
  soundOn: boolean;
  musicOn: boolean;
  narrationOn: boolean;
  parentUnlockedUntil: number;

  /* profile lifecycle */
  addProfile: (name: string, age: number, avatar: string) => ChildProfile;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;

  /* rewards */
  awardStarAndSticker: (module: ModuleId, pool?: "default" | "sports") => Sticker;

  /* v2: modes & advanced progress */
  setLearningMode: (profileId: string, mode: LearningMode) => void;
  toggleLearningMode: (profileId: string) => void;
  bumpAdvancedMetric: (
    key: "abacusScore" | "olympiadLevel" | "currentHindiLevel" | "currentKannadaLevel",
    delta?: number
  ) => void;
  logSportsActivity: (sport: SportType, minutes: number, note?: string) => void;

  /* v3: adaptive difficulty */
  recordAnswer: (correct: boolean, timeMs: number) => {
    levelChange: -1 | 0 | 1;
    newLevel: number;
  };

  /* settings & gate */
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleNarration: () => void;
  unlockParentGate: () => void;
  isParentUnlocked: () => boolean;
}

/* ---------- Sticker pools ---------- */

const STICKER_POOL: Array<{ emoji: string; name: string }> = [
  { emoji: "🦄", name: "Sparkle Unicorn" },
  { emoji: "🐯", name: "Brave Tiger" },
  { emoji: "🐸", name: "Hoppy Frog" },
  { emoji: "🦊", name: "Clever Fox" },
  { emoji: "🐙", name: "Giggly Octopus" },
  { emoji: "🦋", name: "Flutter Butterfly" },
  { emoji: "🐢", name: "Steady Turtle" },
  { emoji: "🦁", name: "Sunny Lion" },
  { emoji: "🐼", name: "Cuddly Panda" },
  { emoji: "🦕", name: "Dino Buddy" },
  { emoji: "🚀", name: "Zoomy Rocket" },
  { emoji: "🌈", name: "Rainbow Magic" },
  { emoji: "⭐", name: "Super Star" },
  { emoji: "🍦", name: "Ice Cream Treat" },
  { emoji: "🎈", name: "Party Balloon" },
  { emoji: "🐳", name: "Splashy Whale" },
  { emoji: "🦜", name: "Chatty Parrot" },
  { emoji: "🍓", name: "Sweet Berry" },
  { emoji: "🤖", name: "Robo Pal" },
  { emoji: "🧸", name: "Teddy Friend" },
];

const SPORTS_STICKER_POOL: Array<{ emoji: string; name: string }> = [
  { emoji: "🏸", name: "Smash Champion" },
  { emoji: "🏊", name: "Lap Legend" },
  { emoji: "⛸️", name: "Glide Master" },
  { emoji: "🛼", name: "Roller Rocket" },
  { emoji: "🥇", name: "Gold Medal Day" },
  { emoji: "🏆", name: "Tiny Trophy" },
  { emoji: "💪", name: "Power Practice" },
  { emoji: "🎽", name: "Jersey Hero" },
  { emoji: "⏱️", name: "Personal Best" },
  { emoji: "🔥", name: "Streak Keeper" },
];

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const defaultPerformance = (): PerformanceStats => ({
  correctStreak: 0,
  totalAnswers: 0,
  totalCorrect: 0,
  totalTimeMs: 0,
  averageTimePerAnswer: 0,
  currentSkillCeiling: 1,
  recentResults: [],
});

export const defaultAdvancedMetrics = (): AdvancedMetrics => ({
  currentHindiLevel: 0,
  currentKannadaLevel: 0,
  abacusScore: 0,
  olympiadLevel: 1,
  sportsBadges: 0,
  sportsLog: [],
});

/** Upgrade any v1 profile (or partially-formed object) to the full shape. */
function normalizeProfile(p: any): ChildProfile {
  return {
    id: p.id ?? uid(),
    name: p.name ?? "Explorer",
    age: p.age ?? 6,
    avatar: p.avatar ?? "🦊",
    stars: p.stars ?? 0,
    stickers: p.stickers ?? [],
    completions: { math: 0, reading: 0, logic: 0, art: 0, ...(p.completions ?? {}) },
    createdAt: p.createdAt ?? Date.now(),
    learningMode: p.learningMode === "advanced" ? "advanced" : "junior",
    advancedMetrics: {
      ...defaultAdvancedMetrics(),
      ...(p.advancedMetrics ?? {}),
      sportsLog: p.advancedMetrics?.sportsLog ?? [],
    },
    performance: {
      ...defaultPerformance(),
      ...(p.performance ?? {}),
      recentResults: (p.performance?.recentResults ?? []).slice(-5),
    },
  };
}

/* ---------- Store ---------- */

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      soundOn: true,
      musicOn: false,
      narrationOn: true,
      parentUnlockedUntil: 0,

      addProfile: (name, age, avatar) => {
        const profile = normalizeProfile({
          name: name.trim().slice(0, 20) || "Explorer",
          age,
          avatar,
        });
        set((s) => ({ profiles: [...s.profiles, profile] }));
        syncProfileToCloud(profile);
        return profile;
      },

      deleteProfile: (id) =>
        set((s) => ({
          profiles: s.profiles.filter((p) => p.id !== id),
          activeProfileId: s.activeProfileId === id ? null : s.activeProfileId,
        })),

      setActiveProfile: (id) => set({ activeProfileId: id }),

      awardStarAndSticker: (module, pool = "default") => {
        const source = pool === "sports" ? SPORTS_STICKER_POOL : STICKER_POOL;
        const pick = source[Math.floor(Math.random() * source.length)];
        const sticker: Sticker = { id: uid(), ...pick, earnedAt: Date.now() };
        set((s) => ({
          profiles: s.profiles.map((p) => {
            if (p.id !== s.activeProfileId) return p;
            const updated: ChildProfile = {
              ...p,
              stars: p.stars + 1,
              stickers: [...p.stickers, sticker],
              completions: {
                ...p.completions,
                [module]: (p.completions[module] ?? 0) + 1,
              },
            };
            syncProfileToCloud(updated);
            return updated;
          }),
        }));
        return sticker;
      },

      /* ---- v2 actions ---- */

      setLearningMode: (profileId, mode) =>
        set((s) => ({
          profiles: s.profiles.map((p) => {
            if (p.id !== profileId) return p;
            const updated = { ...p, learningMode: mode };
            syncProfileToCloud(updated);
            return updated;
          }),
        })),

      toggleLearningMode: (profileId) => {
        const p = get().profiles.find((x) => x.id === profileId);
        if (!p) return;
        get().setLearningMode(
          profileId,
          p.learningMode === "junior" ? "advanced" : "junior"
        );
      },

      bumpAdvancedMetric: (key, delta = 1) =>
        set((s) => ({
          profiles: s.profiles.map((p) => {
            if (p.id !== s.activeProfileId) return p;
            const updated: ChildProfile = {
              ...p,
              advancedMetrics: {
                ...p.advancedMetrics,
                [key]: Math.max(0, (p.advancedMetrics[key] as number) + delta),
              },
            };
            syncProfileToCloud(updated);
            return updated;
          }),
        })),

      logSportsActivity: (sport, minutes, note = "") =>
        set((s) => ({
          profiles: s.profiles.map((p) => {
            if (p.id !== s.activeProfileId) return p;
            const entry: SportsLogEntry = {
              id: uid(),
              sport,
              minutes: Math.max(1, Math.min(600, Math.round(minutes))),
              note: note.trim().slice(0, 120),
              loggedAt: Date.now(),
            };
            const updated: ChildProfile = {
              ...p,
              advancedMetrics: {
                ...p.advancedMetrics,
                sportsBadges: p.advancedMetrics.sportsBadges + 1,
                sportsLog: [entry, ...p.advancedMetrics.sportsLog].slice(0, 200),
              },
            };
            syncProfileToCloud(updated);
            return updated;
          }),
        })),

      /* ---- v3: adaptive difficulty engine ---- */
      recordAnswer: (correct, timeMs) => {
        let levelChange: -1 | 0 | 1 = 0;
        let newLevel = 1;
        set((s) => ({
          profiles: s.profiles.map((p) => {
            if (p.id !== s.activeProfileId) return p;
            const perf = p.performance ?? defaultPerformance();
            const totalAnswers = perf.totalAnswers + 1;
            const totalCorrect = perf.totalCorrect + (correct ? 1 : 0);
            const totalTimeMs =
              perf.totalTimeMs + Math.max(0, Math.min(120000, timeMs));
            let correctStreak = correct ? perf.correctStreak + 1 : 0;
            let recentResults = [...perf.recentResults, correct].slice(-5);
            let currentSkillCeiling = perf.currentSkillCeiling;

            if (correctStreak >= 5 && currentSkillCeiling < 3) {
              currentSkillCeiling += 1;
              correctStreak = 0;
              recentResults = [];
              levelChange = 1;
            } else if (
              recentResults.length === 5 &&
              recentResults.filter(Boolean).length / 5 < 0.6 &&
              currentSkillCeiling > 1
            ) {
              currentSkillCeiling -= 1;
              correctStreak = 0;
              recentResults = [];
              levelChange = -1;
            }
            newLevel = currentSkillCeiling;

            const updated: ChildProfile = {
              ...p,
              performance: {
                correctStreak,
                totalAnswers,
                totalCorrect,
                totalTimeMs,
                averageTimePerAnswer: Math.round(totalTimeMs / totalAnswers),
                currentSkillCeiling,
                recentResults,
              },
            };
            syncProfileToCloud(updated);
            return updated;
          }),
        }));
        return { levelChange, newLevel };
      },

      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      toggleMusic: () => set((s) => ({ musicOn: !s.musicOn })),
      toggleNarration: () => set((s) => ({ narrationOn: !s.narrationOn })),

      unlockParentGate: () =>
        set({ parentUnlockedUntil: Date.now() + 5 * 60 * 1000 }),
      isParentUnlocked: () => Date.now() < get().parentUnlockedUntil,

      /* ---- v4: Master Minds spaced-repetition tracker ---- */
      ...createFlashcardSlice(set, get),

      /* ---- v5: SMC Olympiad progress tracker ---- */
      ...createOlympiadSlice(set, get),
    }),
    {
      name: "kidsacademy-v1", // unchanged key — existing saves migrate in place
      version: 5,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        profiles: s.profiles,
        activeProfileId: s.activeProfileId,
        soundOn: s.soundOn,
        musicOn: s.musicOn,
        narrationOn: s.narrationOn,
        flashcardProgress: s.flashcardProgress,
        olympiadProgress: s.olympiadProgress,
      }),
      /**
       * Lossless migrations:
       * v1→v2: add learningMode + advancedMetrics to profiles.
       * v3→v4: ensure flashcardProgress exists.
       * v4→v5: ensure olympiadProgress exists.
       */
      migrate: (persisted: any) => {
        if (persisted?.profiles) {
          persisted.profiles = persisted.profiles.map(normalizeProfile);
        }
        if (!persisted.flashcardProgress) {
          persisted.flashcardProgress = {};
        }
        if (!persisted.olympiadProgress) {
          persisted.olympiadProgress = {};
        }
        return persisted;
      },
      /** Belt-and-braces: normalise after every rehydrate. */
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.profiles = state.profiles.map(normalizeProfile);
        if (!state.flashcardProgress) state.flashcardProgress = {};
        if (!state.olympiadProgress)  state.olympiadProgress = {};
      },
    }
  )
);

export const useActiveProfile = () =>
  useGameStore((s) => s.profiles.find((p) => p.id === s.activeProfileId) ?? null);

/** Current child's learning mode ('junior' when no profile). */
export const useLearningMode = (): LearningMode =>
  useGameStore(
    (s) =>
      s.profiles.find((p) => p.id === s.activeProfileId)?.learningMode ??
      "junior"
  );

/** Current child's adaptive skill level (1 when no profile). */
export const useSkillLevel = (): number =>
  useGameStore(
    (s) =>
      s.profiles.find((p) => p.id === s.activeProfileId)?.performance
        ?.currentSkillCeiling ?? 1
  );

/* Back-compat alias so old call sites can keep using useAppStore. */
export const useAppStore = useGameStore;
