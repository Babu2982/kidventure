"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  useGameStore,
  useActiveProfile,
  type Sticker,
  type SportType,
} from "@/store/useGameStore";
import { playTap } from "@/lib/sounds";
import { BigButton } from "@/components/ui";
import { RewardOverlay } from "@/components/RewardOverlay";
import { useRouter } from "next/navigation";

/**
 * Athlete's Diary — log real-world sports practice.
 * Pick a sport, pick minutes, optional note → Log Activity updates the
 * Zustand store (sportsLog + sportsBadges) and fires the standard
 * reward pipeline with a sports-themed sticker.
 */

const SPORTS: Array<{ id: SportType; emoji: string; label: string; color: string }> = [
  { id: "badminton", emoji: "🏸", label: "Badminton", color: "bg-berry" },
  { id: "swimming", emoji: "🏊", label: "Swimming", color: "bg-sky-kid" },
  { id: "skating", emoji: "🛼", label: "Skating", color: "bg-tangerine" },
];

const DURATIONS = [15, 30, 45, 60];

const SPORT_META: Record<SportType, { emoji: string; label: string }> = {
  badminton: { emoji: "🏸", label: "Badminton" },
  swimming: { emoji: "🏊", label: "Swimming" },
  skating: { emoji: "🛼", label: "Skating" },
};

export function AthleteDiary() {
  const router = useRouter();
  const profile = useActiveProfile()!;
  const { soundOn, logSportsActivity, awardStarAndSticker } = useGameStore();
  const [sport, setSport] = useState<SportType | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [reward, setReward] = useState<Sticker | null>(null);

  const log = useGameStore(
    (s) =>
      s.profiles.find((p) => p.id === s.activeProfileId)?.advancedMetrics
        .sportsLog ?? []
  );

  const submit = () => {
    if (!sport || minutes === null) return;
    logSportsActivity(sport, minutes, note);
    setReward(awardStarAndSticker("art", "sports"));
    setSport(null);
    setMinutes(null);
    setNote("");
  };

  return (
    <aside className="bg-white/85 rounded-[2rem] shadow-chunky p-5 w-full lg:w-80 flex flex-col gap-4">
      <div className="text-center">
        <h2 className="font-display text-2xl text-slate-700">🏅 Athlete&apos;s Diary</h2>
        <p className="font-body text-sm text-slate-400">
          {profile.advancedMetrics.sportsBadges} activities logged
        </p>
      </div>

      <div>
        <p className="font-display text-slate-600 mb-2">What did you practice today?</p>
        <div className="flex gap-2">
          {SPORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => { playTap(soundOn); setSport(s.id); }}
              aria-pressed={sport === s.id}
              className={`flex-1 rounded-2xl p-3 shadow-chunkySm flex flex-col items-center gap-1 transition
                ${sport === s.id ? `${s.color} text-white scale-105` : "bg-cream text-slate-600"}`}
            >
              <span className="text-3xl" aria-hidden>{s.emoji}</span>
              <span className="font-display text-xs">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-display text-slate-600 mb-2">For how long?</p>
        <div className="flex gap-2 flex-wrap">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => { playTap(soundOn); setMinutes(d); }}
              aria-pressed={minutes === d}
              className={`font-display rounded-2xl px-4 py-2 shadow-chunkySm transition
                ${minutes === d ? "bg-grass text-white scale-105" : "bg-cream text-slate-600"}`}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={120}
        placeholder="Note (e.g. learned a new serve!)"
        className="font-body rounded-2xl border-4 border-sky-kid/30 px-3 py-2 focus:border-sky-kid outline-none"
        aria-label="Activity note"
      />

      <BigButton
        color="bg-grape text-white"
        className="!text-xl"
        disabled={!sport || minutes === null}
        onClick={submit}
      >
        ✅ Log Activity
      </BigButton>

      {/* recent entries */}
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        <AnimatePresence initial={false}>
          {log.slice(0, 6).map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-cream rounded-xl px-3 py-2 flex items-center gap-2"
            >
              <span className="text-2xl" aria-hidden>{SPORT_META[e.sport].emoji}</span>
              <div className="min-w-0">
                <p className="font-display text-sm text-slate-700">
                  {SPORT_META[e.sport].label} · {e.minutes} min
                </p>
                {e.note && (
                  <p className="font-body text-xs text-slate-400 truncate">{e.note}</p>
                )}
              </div>
              <span className="ml-auto font-body text-[10px] text-slate-300 shrink-0">
                {new Date(e.loggedAt).toLocaleDateString()}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {log.length === 0 && (
          <p className="font-body text-sm text-slate-400 text-center">
            Your diary is empty — log your first practice! 💪
          </p>
        )}
      </div>

      <RewardOverlay
        sticker={reward}
        onClose={() => router.push("/dashboard")}
        onPlayAgain={() => setReward(null)}
      />
    </aside>
  );
}
