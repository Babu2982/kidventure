'use client';

// components/MasterMindsEngine.tsx
// Mavericks "Master Minds" — rapid-fire retrieval practice.
// Visual-auditory flash loop: prompt + native narration → recall → flip → grade.
// Session order is driven by SM-2 (getDueFlashcards), topped up with the least-
// seen cards so a session is never empty. Speech routes through the native
// narrate() layer (Samsung WebView returns 0 web voices — see project brief).

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import confetti from 'canvas-confetti';
import { Capacitor } from '@capacitor/core';
import { narrate } from '@/lib/narrator';
import { useGameStore } from '@/store/useGameStore';
import { loadFlashcards, type Flashcard } from '@/lib/flashcards';
import type { FlashcardState } from '@/lib/spacedRepetition';

// require() (NOT dynamic import()) — matches the project's established
// native-plugin pattern. A dynamic import() promise hangs forever in the
// Android WebView; require() only runs at call-time, guarded by the native
// check below, so it never executes during SSR prerender either.
let _CapApp: any = null;
function CapApp() {
  if (_CapApp) return _CapApp;
  _CapApp = require('@capacitor/app').App;
  return _CapApp;
}

// --- public API -------------------------------------------------------------
export interface SessionSummary {
  total: number;
  mastered: number; // graded "Got it" or "Easy"
  revisit: number; // graded "Missed"
  durationMs: number;
}

interface MasterMindsEngineProps {
  mode?: 'junior' | 'advanced';
  skillLevel?: number;
  deck?: string; // optional filter: 'multiplication' | 'geography' | 'science'
  sessionSize?: number; // cards per session (default 12)
  /** Progress hook — wire to your store to award stars/stickers. */
  onComplete?: (summary: SessionSummary) => void;
  onExit?: () => void;
}

type Grade = 'easy' | 'good' | 'missed';
const GRADE_TO_RECALL = { easy: 'instant', good: 'knew', missed: 'missed' } as const;

const DECK_THEME: Record<string, { from: string; to: string; accent: string }> = {
  multiplication: { from: '#1e1b4b', to: '#4338ca', accent: '#facc15' },
  geography: { from: '#064e3b', to: '#0d9488', accent: '#fde047' },
  science: { from: '#3b0764', to: '#7c3aed', accent: '#34d399' },
  default: { from: '#0f172a', to: '#1d4ed8', accent: '#f59e0b' },
};

// safe speak — never throws into the render path
function say(text?: string) {
  if (!text) return;
  try {
    void narrate(text);
  } catch {
    /* narration is best-effort */
  }
}

export default function MasterMindsEngine({
  mode = 'advanced',
  skillLevel = 1,
  deck,
  sessionSize = 12,
  onComplete,
  onExit,
}: MasterMindsEngineProps) {
  const reduceMotion = useReducedMotion();

  const initFlashcards = useGameStore((s) => s.initFlashcards);
  const reviewFlashcard = useGameStore((s) => s.reviewFlashcard);
  const getDueFlashcards = useGameStore((s) => s.getDueFlashcards);
  const flashcardProgress = useGameStore((s) => s.flashcardProgress);
  const activeProfileId = useGameStore((s) => s.activeProfileId);

  const [phase, setPhase] = useState<'loading' | 'play' | 'empty' | 'summary'>('loading');
  const [pool, setPool] = useState<Record<string, Flashcard>>({});
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [summary, setSummary] = useState<SessionSummary>({ total: 0, mastered: 0, revisit: 0, durationMs: 0 });

  const startedAt = useRef<number>(0);
  const tally = useRef<{ mastered: number; revisit: number }>({ mastered: 0, revisit: 0 });

  // drag/swipe feedback
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-14, 0, 14]);
  const goodGlow = useTransform(x, [40, 160], [0, 1]);
  const missGlow = useTransform(x, [-160, -40], [1, 0]);

  // --- build the session ----------------------------------------------------
  const buildSession = useCallback(
    (cards: Flashcard[]) => {
      const map: Record<string, Flashcard> = {};
      for (const c of cards) map[c.id] = c;
      const ids = cards.map((c) => c.id);

      const due = getDueFlashcards().filter((id) => map[id]);
      const progress: Record<string, FlashcardState> =
        (activeProfileId && flashcardProgress[activeProfileId]) || {};

      // top up with least-seen cards so the session is never empty
      const topUp = ids
        .filter((id) => !due.includes(id))
        .sort((a, b) => (progress[a]?.seen ?? 0) - (progress[b]?.seen ?? 0));

      const session = [...due, ...topUp].slice(0, Math.max(1, sessionSize));

      setPool(map);
      setQueue(session);
      setIndex(0);
      setFlipped(false);
      tally.current = { mastered: 0, revisit: 0 };
      startedAt.current = Date.now();
      setPhase(session.length ? 'play' : 'empty');
    },
    [activeProfileId, flashcardProgress, getDueFlashcards, sessionSize],
  );

  // --- load content once ----------------------------------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      const cards = await loadFlashcards(mode, skillLevel, deck);
      if (!alive) return;
      initFlashcards(cards.map((c) => c.id)); // seed SR state for new cards
      buildSession(cards);
    })();
    return () => {
      alive = false;
    };
    // buildSession depends on store snapshots that are stable enough for mount;
    // re-running on mode/skill/deck change is the intended behaviour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, skillLevel, deck]);

  const current = phase === 'play' ? pool[queue[index]] : undefined;

  // Hardware back button (Android) closes this overlay instead of quitting
  // the app — the expected behavior on every OEM. Guarded native-only.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: { remove: () => void } | undefined;
    let cancelled = false;
    CapApp()
      .addListener('backButton', () => onExit?.())
      .then((h: { remove: () => void }) => {
        if (cancelled) h.remove();
        else handle = h;
      })
      .catch(() => {
        /* listener registration is best-effort */
      });
    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [onExit]);

  // speak the prompt each time a new card appears
  useEffect(() => {
    if (current) say(current.say ?? current.concept);
  }, [current]);

  // --- interactions ---------------------------------------------------------
  const reveal = useCallback(() => {
    if (flipped || !current) return;
    setFlipped(true);
    say(current.detail ?? current.concept);
  }, [flipped, current]);

  const finish = useCallback(() => {
    const result: SessionSummary = {
      total: queue.length,
      mastered: tally.current.mastered,
      revisit: tally.current.revisit,
      durationMs: Date.now() - startedAt.current,
    };
    setSummary(result);
    setPhase('summary');
    say('Great job! You finished your cards!');
    if (!reduceMotion) {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    }
    onComplete?.(result);
  }, [queue.length, reduceMotion, onComplete]);

  const grade = useCallback(
    (g: Grade) => {
      if (!current) return;
      reviewFlashcard(current.id, GRADE_TO_RECALL[g]);
      if (g === 'missed') tally.current.revisit += 1;
      else tally.current.mastered += 1;

      x.set(0);
      if (index + 1 >= queue.length) {
        finish();
      } else {
        setIndex((i) => i + 1);
        setFlipped(false);
      }
    },
    [current, index, queue.length, reviewFlashcard, x, finish],
  );

  const onDragEnd = useCallback(
    (_e: unknown, info: PanInfo) => {
      const swipe = info.offset.x + info.velocity.x * 0.08;
      if (!flipped) {
        x.set(0);
        if (Math.abs(info.offset.x) < 6) reveal(); // a tap, not a drag
        return;
      }
      if (swipe > 120) grade('good');
      else if (swipe < -120) grade('missed');
      else x.set(0);
    },
    [flipped, reveal, grade, x],
  );

  const theme = DECK_THEME[current?.deck ?? deck ?? 'default'] ?? DECK_THEME.default;
  const progressPct = queue.length ? Math.round((index / queue.length) * 100) : 0;

  // --- render ---------------------------------------------------------------
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${theme.from}, ${theme.to})` }}
    >
      {/* top bar */}
      <div
        className="flex items-center gap-3 px-4 pb-3"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={onExit}
          aria-label="Close Master Minds"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-2xl text-white active:scale-95"
        >
          ✕
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${progressPct}%`, background: theme.accent }}
          />
        </div>
        <div className="min-w-[3rem] text-right text-sm font-bold text-white/90">
          {phase === 'play' ? `${index + 1}/${queue.length}` : ''}
        </div>
      </div>

      {/* body */}
      <div className="relative flex flex-1 items-center justify-center px-5 pb-6">
        {phase === 'loading' && (
          <p className="animate-pulse text-lg font-semibold text-white/80">Shuffling your cards…</p>
        )}

        {phase === 'empty' && (
          <div className="text-center text-white">
            <div className="mb-3 text-6xl">🌟</div>
            <p className="text-xl font-extrabold">All caught up!</p>
            <p className="mt-1 text-white/80">No cards are due right now. Come back later.</p>
            <button
              onClick={onExit}
              className="mt-6 rounded-2xl bg-white px-8 py-3 text-lg font-extrabold text-slate-900 active:scale-95"
            >
              Done
            </button>
          </div>
        )}

        {phase === 'play' && current && (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={current.id}
              className="relative h-[58vh] max-h-[460px] w-full max-w-[420px]"
              style={{ x, rotate, touchAction: 'pan-y' }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={onDragEnd}
              onTap={() => !flipped && reveal()}
              initial={reduceMotion ? false : { scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0, y: -24 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            >
              {/* swipe glow cues (only meaningful once flipped) */}
              {flipped && (
                <>
                  <motion.div
                    style={{ opacity: goodGlow }}
                    className="pointer-events-none absolute -inset-1 rounded-[2rem] ring-4 ring-emerald-400"
                  />
                  <motion.div
                    style={{ opacity: missGlow }}
                    className="pointer-events-none absolute -inset-1 rounded-[2rem] ring-4 ring-rose-400"
                  />
                </>
              )}

              <div className="flex h-full w-full flex-col items-center justify-center gap-5 rounded-[2rem] bg-white p-6 shadow-2xl">
                <div className="text-[5.5rem] leading-none">{current.emoji ?? '🧠'}</div>

                <div className="px-2 text-center text-3xl font-extrabold leading-tight text-slate-900">
                  {current.concept}
                </div>

                {flipped ? (
                  <div
                    className="rounded-2xl px-6 py-3 text-center text-2xl font-black text-white"
                    style={{ background: theme.to }}
                  >
                    {current.detail ?? '—'}
                  </div>
                ) : (
                  <button
                    onClick={reveal}
                    className="mt-1 rounded-full px-6 py-2 text-base font-bold text-slate-500 underline-offset-4 active:scale-95"
                  >
                    Tap to flip
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {phase === 'summary' && (
          <div className="w-full max-w-[420px] text-center text-white">
            <div className="mb-3 text-6xl">🏆</div>
            <p className="text-2xl font-black">Session complete!</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/15 p-4">
                <div className="text-3xl font-black" style={{ color: theme.accent }}>
                  {summary.mastered}
                </div>
                <div className="text-sm font-semibold text-white/80">mastered</div>
              </div>
              <div className="rounded-2xl bg-white/15 p-4">
                <div className="text-3xl font-black text-rose-300">{summary.revisit}</div>
                <div className="text-sm font-semibold text-white/80">to revisit</div>
              </div>
            </div>
            <div className="mt-7 flex gap-3">
              <button
                onClick={() => loadFlashcards(mode, skillLevel, deck).then(buildSession)}
                className="flex-1 rounded-2xl bg-white/20 py-3 text-lg font-extrabold text-white active:scale-95"
              >
                Again
              </button>
              <button
                onClick={onExit}
                className="flex-1 rounded-2xl bg-white py-3 text-lg font-extrabold text-slate-900 active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* grade controls — appear only after the answer is revealed */}
      {phase === 'play' && current && (
        <div
          className="px-5"
          style={{
            visibility: flipped ? 'visible' : 'hidden',
            paddingBottom: 'max(1.75rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="mx-auto flex max-w-[420px] gap-3">
            <button
              onClick={() => grade('missed')}
              className="flex-1 rounded-2xl bg-rose-500 py-4 text-lg font-extrabold text-white shadow-lg active:scale-95"
            >
              Missed 🙁
            </button>
            <button
              onClick={() => grade('good')}
              className="flex-1 rounded-2xl bg-sky-500 py-4 text-lg font-extrabold text-white shadow-lg active:scale-95"
            >
              Got it 🙂
            </button>
            <button
              onClick={() => grade('easy')}
              className="flex-1 rounded-2xl bg-emerald-500 py-4 text-lg font-extrabold text-white shadow-lg active:scale-95"
            >
              Easy 😎
            </button>
          </div>
          <p className="mt-3 text-center text-xs font-semibold text-white/70">
            or swipe right for “Got it”, left for “Missed”
          </p>
        </div>
      )}
    </div>
  );
}
