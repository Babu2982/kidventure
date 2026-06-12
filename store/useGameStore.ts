"use client";

/**
 * useGameStore — the app's single source of truth.
 *
 * v2 adds dual learning modes on top of the v1 schema:
 *   - learningMode: 'junior' | 'advanced' per child profile
 *   - advancedMetrics: IGCSE-track progress (abacus, olympiad,
 *     Hindi/Kannada writing levels) and real-world sports badges
 *
 * Backward compatibility:
 *   - store/useAppStore.ts re-exports everything here, so all
 *     existing imports keep working.
 *   - The persist `migrate` function upgrades v1 profiles already
 *     saved in localStorage (adds learningMode + advancedMetrics
 *     with safe defaults). No data is lost on update.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { syncProfileToCloud } from "@/lib/supabase";

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

export interface AdvancedMetrics {
  currentHindiLevel: number;   // index into the Hindi varnamala track
  currentKannadaLevel: number; // index into the Kannada aksharamale track
  abacusScore: number;         // cumulative correct abacus answers
  olympiadLevel: number;       // 1+ — scales word-problem difficulty
  sportsBadges: number;        // total activities logged
  sportsLog: SportsLogEntry[]; // diary entries (Athlete's Diary)
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
}

interface GameState {
  profiles: ChildProfile[];
  activeProfileId: string | null;
  soundOn: boolean;
  musicOn: boolean;
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

  /* settings & gate */
  toggleSound: () => void;
  toggleMusic: () => void;
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

export const defaultAdvancedMetrics = (): AdvancedMetrics => ({
  currentHindiLevel: 0,
  currentKannadaLevel: 0,
  abacusScore: 0,
  olympiadLevel: 1,
  sportsBadges: 0,
  sportsLog: [],
});

/** Upgrade any v1 profile (or partially-formed object) to the v2 shape. */
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

      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      toggleMusic: () => set((s) => ({ musicOn: !s.musicOn })),

      unlockParentGate: () =>
        set({ parentUnlockedUntil: Date.now() + 5 * 60 * 1000 }),
      isParentUnlocked: () => Date.now() < get().parentUnlockedUntil,
    }),
    {
      name: "kidsacademy-v1", // unchanged key so existing data migrates in place
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        profiles: s.profiles,
        activeProfileId: s.activeProfileId,
        soundOn: s.soundOn,
        musicOn: s.musicOn,
      }),
      /** v1 → v2: add learningMode + advancedMetrics to saved profiles. */
      migrate: (persisted: any) => {
        if (persisted?.profiles) {
          persisted.profiles = persisted.profiles.map(normalizeProfile);
        }
        return persisted;
      },
      /** Belt-and-braces: normalize after every rehydrate, covering
          profiles written by mixed app versions. */
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.profiles = state.profiles.map(normalizeProfile);
      },
    }
  )
);

export const useActiveProfile = () =>
  useGameStore((s) => s.profiles.find((p) => p.id === s.activeProfileId) ?? null);

/** Convenience: current child's mode ('junior' when no profile). */
export const useLearningMode = (): LearningMode =>
  useGameStore(
    (s) =>
      s.profiles.find((p) => p.id === s.activeProfileId)?.learningMode ??
      "junior"
  );

/* Back-compat alias so old call sites can keep using useAppStore. */
export const useAppStore = useGameStore;
