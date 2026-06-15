// lib/flashcards.ts
// Offline-first flashcard content. SR *metadata* lives in Zustand/localStorage;
// the *content* lives here in IndexedDB so an "infinite" deck never blows the
// ~5MB localStorage cap. Load order: IndexedDB cache → Supabase → bundled seed.

import { supabase } from './supabase';

export interface Flashcard {
  id: string;
  deck: string; // 'multiplication' | 'geography' | 'science' | ...
  concept: string; // prompt shown on the front (also default spoken text)
  detail?: string; // answer revealed on the back
  say?: string; // speech-friendly override (e.g. "six times seven")
  emoji?: string; // offline visual when no image
  imageUrl?: string; // optional remote image
}

// ---------------------------------------------------------------------------
// IndexedDB (tiny dependency-free wrapper)
// ---------------------------------------------------------------------------
const DB_NAME = 'kidventure-content';
const STORE = 'flashcards';

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    r.onsuccess = () => resolve((r.result as T) ?? null);
    r.onerror = () => resolve(null);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// ---------------------------------------------------------------------------
// Supabase fetch (windowed around the child's skill ceiling)
// ---------------------------------------------------------------------------
type Row = {
  id: string;
  deck: string;
  concept: string;
  detail: string | null;
  emoji: string | null;
  image_url: string | null;
};

async function fetchRemote(
  mode: 'junior' | 'advanced',
  skillLevel: number,
  deck?: string,
): Promise<Flashcard[] | null> {
  if (!supabase) return null;
  try {
    let q = supabase
      .from('flashcards')
      .select('id,deck,concept,detail,emoji,image_url')
      .eq('mode', mode)
      .gte('skill_level', Math.max(1, skillLevel - 1))
      .lte('skill_level', skillLevel + 1);
    if (deck) q = q.eq('deck', deck);
    const { data, error } = await q;
    if (error || !data) return null;
    return (data as Row[]).map((r) => ({
      id: r.id,
      deck: r.deck,
      concept: r.concept,
      detail: r.detail ?? undefined,
      emoji: r.emoji ?? undefined,
      imageUrl: r.image_url ?? undefined,
    }));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Bundled seed deck — guarantees the engine works with zero backend/network.
// ---------------------------------------------------------------------------
export const SEED_DECK: Flashcard[] = [
  { id: 'seed-mult-6x7', deck: 'multiplication', concept: '6 × 7', detail: '42', say: 'six times seven', emoji: '✖️' },
  { id: 'seed-mult-7x8', deck: 'multiplication', concept: '7 × 8', detail: '56', say: 'seven times eight', emoji: '✖️' },
  { id: 'seed-mult-8x9', deck: 'multiplication', concept: '8 × 9', detail: '72', say: 'eight times nine', emoji: '✖️' },
  { id: 'seed-mult-9x9', deck: 'multiplication', concept: '9 × 9', detail: '81', say: 'nine times nine', emoji: '✖️' },
  { id: 'seed-geo-france', deck: 'geography', concept: 'Capital of France', detail: 'Paris', emoji: '🗼' },
  { id: 'seed-geo-japan', deck: 'geography', concept: 'Capital of Japan', detail: 'Tokyo', emoji: '🗾' },
  { id: 'seed-geo-ocean', deck: 'geography', concept: 'Largest ocean', detail: 'The Pacific Ocean', emoji: '🌊' },
  { id: 'seed-geo-nile', deck: 'geography', concept: 'Longest river in the world', detail: 'The Nile', emoji: '🐊' },
  { id: 'seed-sci-mercury', deck: 'science', concept: 'Planet closest to the Sun', detail: 'Mercury', emoji: '☀️' },
  { id: 'seed-sci-oxygen', deck: 'science', concept: 'Gas we breathe in to live', detail: 'Oxygen', emoji: '🫁' },
  { id: 'seed-sci-freeze', deck: 'science', concept: 'Water freezes at', detail: '0°C (32°F)', emoji: '❄️' },
  { id: 'seed-sci-nucleus', deck: 'science', concept: 'Center of an atom', detail: 'The nucleus', emoji: '⚛️' },
];

// ---------------------------------------------------------------------------
// Public loader: cache-first, refresh-in-background, seed as last resort.
// ---------------------------------------------------------------------------
export async function loadFlashcards(
  mode: 'junior' | 'advanced',
  skillLevel: number,
  deck?: string,
): Promise<Flashcard[]> {
  const key = `${mode}:${skillLevel}:${deck ?? 'all'}`;

  const cached = await idbGet<Flashcard[]>(key);
  if (cached && cached.length) {
    // refresh quietly for next time; don't block this session
    fetchRemote(mode, skillLevel, deck).then((fresh) => {
      if (fresh && fresh.length) idbSet(key, fresh);
    });
    return cached;
  }

  const remote = await fetchRemote(mode, skillLevel, deck);
  if (remote && remote.length) {
    await idbSet(key, remote);
    return remote;
  }

  const seed = SEED_DECK.filter((c) => !deck || c.deck === deck);
  await idbSet(key, seed);
  return seed;
}
