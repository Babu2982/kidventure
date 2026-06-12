"use client";

import { motion } from "framer-motion";
import { ClientGate, TopBar } from "@/components/ui";
import { useActiveProfile } from "@/store/useAppStore";

export default function StickersPage() {
  return (
    <ClientGate>
      <StickerBook />
    </ClientGate>
  );
}

function StickerBook() {
  const profile = useActiveProfile()!;
  const stickers = [...profile.stickers].sort((a, b) => b.earnedAt - a.earnedAt);

  return (
    <main className="min-h-dvh bg-sky-scene flex flex-col">
      <TopBar title="My Suitcase" emoji="🧳" />

      <div className="flex-1 px-5 pb-8 max-w-3xl w-full mx-auto">
        <div className="text-center mb-6">
          <p className="font-display text-2xl text-slate-700">
            {profile.name}&apos;s Sticker Collection
          </p>
          <p className="font-body text-slate-500">
            ⭐ {profile.stars} stars · 🎁 {stickers.length} stickers
          </p>
        </div>

        {/* Advanced mode: kid-friendly progress badges */}
        {profile.learningMode === "advanced" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6"
            aria-label="My learning progress"
          >
            {(
              [
                ["🧮", "Abacus", profile.advancedMetrics.abacusScore, "bg-sky-kid"],
                ["🏅", "Olympiad", `Lv ${profile.advancedMetrics.olympiadLevel}`, "bg-sun"],
                ["🪔", "Hindi", `${profile.advancedMetrics.currentHindiLevel} letters`, "bg-tangerine"],
                ["🌼", "Kannada", `${profile.advancedMetrics.currentKannadaLevel} letters`, "bg-grass"],
                ["🏸", "Sports", `${profile.advancedMetrics.sportsBadges} logged`, "bg-berry"],
              ] as const
            ).map(([emoji, label, value, color], i) => (
              <motion.div
                key={label}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 + i * 0.07, type: "spring", stiffness: 260 }}
                className={`${color} rounded-[1.5rem] shadow-chunkySm p-3 text-center text-white`}
              >
                <span className="text-3xl block" aria-hidden>{emoji}</span>
                <span className="font-display text-sm block">{label}</span>
                <span className="font-body text-xs opacity-90">{value}</span>
              </motion.div>
            ))}
          </motion.div>
        )}

        {stickers.length === 0 ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/80 rounded-[2.5rem] shadow-chunky p-10 text-center flex flex-col items-center gap-4"
          >
            <motion.span
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2.4 }}
              className="text-8xl"
              aria-hidden
            >
              🧳
            </motion.span>
            <p className="font-display text-2xl text-slate-600">
              Your suitcase is empty!
            </p>
            <p className="font-body text-slate-500">
              Finish a game on the map to win your first sticker. 🗺️
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {stickers.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: (i % 3) - 1 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 260 }}
                whileHover={{ scale: 1.12, rotate: 0 }}
                className="bg-white rounded-[1.75rem] shadow-chunky p-4 flex flex-col items-center gap-1"
              >
                <span className="text-5xl sm:text-6xl" aria-hidden>{s.emoji}</span>
                <span className="font-display text-xs sm:text-sm text-slate-600 text-center">
                  {s.name}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
