"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { BigButton, KidErrorBoundary } from "@/components/ui";
import { playSuccess } from "@/lib/sounds";
import { ModeToggle } from "@/components/ModeToggle";

const AVATARS = ["🦊", "🐼", "🦄", "🐸", "🦁", "🐙", "🐯", "🦋", "🐳", "🤖"];
const AGES = [6, 7, 8, 9, 10];

export default function ProfileSelectPage() {
  return (
    <KidErrorBoundary>
      <ProfileSelect />
    </KidErrorBoundary>
  );
}

function ProfileSelect() {
  const router = useRouter();
  const { profiles, setActiveProfile, addProfile, soundOn } = useAppStore();
  const [hydrated, setHydrated] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => setHydrated(true), []);

  const pick = (id: string) => {
    setActiveProfile(id);
    playSuccess(soundOn);
    router.push("/dashboard");
  };

  const create = () => {
    if (!avatar || age === null) return;
    const p = addProfile(name, age, avatar);
    pick(p.id);
  };

  if (!hydrated) {
    return (
      <div className="min-h-dvh bg-sky-scene flex items-center justify-center">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
          className="text-7xl"
        >
          🌞
        </motion.span>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-sky-scene flex flex-col items-center px-5 py-8 gap-8 overflow-hidden relative">
      {/* drifting clouds */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute text-6xl opacity-70"
          style={{ top: `${8 + i * 12}%` }}
          initial={{ x: "-20vw" }}
          animate={{ x: "110vw" }}
          transition={{ repeat: Infinity, duration: 28 + i * 9, ease: "linear", delay: i * 6 }}
        >
          ☁️
        </motion.span>
      ))}

      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center z-10"
      >
        <h1 className="font-display text-4xl sm:text-6xl text-slate-700 drop-shadow-sm">
          🎒 KidVenture
        </h1>
        <p className="font-body text-lg text-slate-500 mt-1">Who&apos;s playing today?</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!creating ? (
          <motion.section
            key="select"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="z-10 w-full max-w-3xl"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 justify-items-center">
              {profiles.map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ scale: 1.07, rotate: -2 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => pick(p.id)}
                  className="bg-white rounded-[2rem] shadow-chunky p-5 w-full max-w-[180px] flex flex-col items-center gap-2"
                  aria-label={`Play as ${p.name}`}
                >
                  <span className="text-6xl" aria-hidden>{p.avatar}</span>
                  <span className="font-display text-xl text-slate-700 truncate w-full text-center">
                    {p.name}
                  </span>
                  <span className="font-body text-sm text-slate-400">⭐ {p.stars}</span>
                  <ModeToggle profile={p} compact />
                </motion.button>
              ))}

              <motion.button
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: profiles.length * 0.08 }}
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setCreating(true)}
                className="bg-sun rounded-[2rem] shadow-chunky p-5 w-full max-w-[180px] flex flex-col items-center gap-2 border-4 border-dashed border-white"
                aria-label="Add a new player"
              >
                <span className="text-6xl" aria-hidden>➕</span>
                <span className="font-display text-xl text-slate-700">New Player</span>
              </motion.button>
            </div>

            {profiles.length === 0 && (
              <p className="text-center font-body text-slate-500 mt-6">
                Tap the yellow card to create your first explorer! 🌟
              </p>
            )}
          </motion.section>
        ) : (
          <motion.section
            key="create"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            className="z-10 w-full max-w-md bg-white rounded-[2.5rem] shadow-chunky p-6 flex flex-col gap-5"
          >
            <h2 className="font-display text-2xl text-slate-700 text-center">
              Make your explorer! 🧭
            </h2>

            <label className="flex flex-col gap-2">
              <span className="font-display text-lg text-slate-600">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder="e.g. Aanya"
                className="font-body text-xl rounded-2xl border-4 border-sky-kid/40 px-4 py-3 focus:border-sky-kid outline-none"
              />
            </label>

            <div>
              <span className="font-display text-lg text-slate-600">Age</span>
              <div className="flex gap-2 mt-2 flex-wrap">
                {AGES.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAge(a)}
                    className={`font-display text-xl rounded-2xl px-5 py-3 shadow-chunkySm transition
                      ${age === a ? "bg-grass text-white scale-105" : "bg-cream text-slate-600"}`}
                    aria-pressed={age === a}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="font-display text-lg text-slate-600">Pick your buddy</span>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    onClick={() => setAvatar(av)}
                    className={`text-4xl rounded-2xl p-2 transition shadow-chunkySm
                      ${avatar === av ? "bg-sun scale-110" : "bg-cream"}`}
                    aria-pressed={avatar === av}
                    aria-label={`Avatar ${av}`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <BigButton color="bg-white" className="flex-1 !text-xl" onClick={() => setCreating(false)}>
                ⬅️ Back
              </BigButton>
              <BigButton
                color="bg-berry text-white"
                className="flex-1 !text-xl"
                disabled={!avatar || age === null}
                onClick={create}
              >
                Let&apos;s Go! 🚀
              </BigButton>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        onClick={() => router.push("/parent")}
        className="z-10 mt-auto font-body text-slate-400 underline underline-offset-4 py-2"
      >
        👨‍👩‍👧 Grown-ups
      </button>
    </main>
  );
}
