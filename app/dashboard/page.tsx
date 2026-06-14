"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientGate, TopBar } from "@/components/ui";
import { narrate } from "@/lib/narrator";
import { warmVoices, initNativeTTS, directSpeak } from "@/lib/tts";
import { initVoice } from "@/lib/voice";
import { useActiveProfile, useAppStore } from "@/store/useAppStore";
import { playTap } from "@/lib/sounds";

const ISLANDS = [
  {
    href: "/reading",
    emoji: "📖",
    label: "Reading Island",
    sub: "Letters & words",
    color: "bg-berry",
    float: 0,
  },
  {
    href: "/math",
    emoji: "🔢",
    label: "Math Mountain",
    sub: "Count & solve",
    color: "bg-sky-kid",
    float: 0.4,
  },
  {
    href: "/logic",
    emoji: "🧩",
    label: "Logic Lagoon",
    sub: "Sort & think",
    color: "bg-grass",
    float: 0.8,
  },
  {
    href: "/art",
    emoji: "🎨",
    label: "Art Cove",
    sub: "Draw & create",
    color: "bg-tangerine",
    float: 1.2,
  },
] as const;

export default function DashboardPage() {
  return (
    <ClientGate>
      <Dashboard />
    </ClientGate>
  );
}

function Dashboard() {
  const router = useRouter();
  const profile = useActiveProfile()!;
  const soundOn = useAppStore((s) => s.soundOn);
  const narrationOn = useAppStore((s) => s.narrationOn);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const [greeted, setGreeted] = useState(false);

  // Warm up TTS + STT on the dashboard (safe: user just tapped a profile)
  useEffect(() => {
    warmVoices();
    initNativeTTS(); // pre-warm Android TTS engine
    initVoice();
  }, []);

  const toggleNarration = useAppStore((s) => s.toggleNarration);

  const handleGreet = () => {
    setGreeted(true);
    // Force narration ON so the greeting always speaks, regardless of
    // any earlier accidental toggle of the 🗣️ button.
    if (!useAppStore.getState().narrationOn) toggleNarration();
    setTimeout(() => {
      narrate(`Hi ${profile.name}! Pick an island to start learning!`);
    }, 120);
  };

  return (
    <main className="min-h-dvh bg-sky-scene flex flex-col">
      <TopBar title={`Hi, ${profile.name}!`} emoji={profile.avatar} />

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5 pb-6">
        {/* First-gesture button — forces narration on + speaks greeting */}
        {!greeted && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleGreet}
            className="bg-sun rounded-[2rem] shadow-chunky px-6 py-3 flex items-center gap-3 font-display text-xl text-slate-700"
            aria-label="Tap to hear welcome"
          >
            <span className="text-3xl" aria-hidden>🗣️</span>
            Tap me to start!
          </motion.button>
        )}

        {/* DIRECT plugin test — bypasses narrate/speak entirely, calls
            the TTS plugin exactly like the working debug page did. */}
        <button
          onClick={async () => {
            try {
              await directSpeak("Direct test. Can you hear me?");
            } catch (e) {
              console.error("direct test failed", e);
            }
          }}
          className="bg-grass text-white rounded-2xl px-5 py-2 font-display text-sm"
        >
          🔧 Direct TTS test
        </button>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl">
          {ISLANDS.map((isle, i) => (
            <motion.button
              key={isle.href}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: [0, -8, 0] }}
              transition={{
                opacity: { delay: i * 0.1 },
                y: {
                  delay: isle.float,
                  repeat: Infinity,
                  duration: 3.4,
                  ease: "easeInOut",
                },
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                playTap(soundOn);
                router.push(isle.href);
              }}
              aria-label={isle.label}
              className={`${isle.color} rounded-[2.5rem] shadow-chunky p-6 sm:p-8
                flex flex-col items-center gap-2 min-h-[160px] sm:min-h-[200px]`}
            >
              <span className="text-6xl sm:text-7xl" aria-hidden>{isle.emoji}</span>
              <span className="font-display text-xl sm:text-2xl text-white drop-shadow">
                {isle.label}
              </span>
              <span className="font-body text-white/80 text-sm">{isle.sub}</span>
            </motion.button>
          ))}
        </div>

        {/* The Suitcase — sticker collection */}
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.05, rotate: -1 }}
          whileTap={{ scale: 0.93 }}
          onClick={() => {
            playTap(soundOn);
            router.push("/stickers");
          }}
          aria-label="Open your sticker suitcase"
          className="bg-grape rounded-[2rem] shadow-chunky px-8 py-4 flex items-center gap-3 text-white"
        >
          <span className="text-4xl" aria-hidden>🧳</span>
          <span className="font-display text-2xl">My Suitcase</span>
          <span className="bg-white/25 rounded-full px-3 py-1 font-display">
            {profile.stickers.length}
          </span>
        </motion.button>

        <div className="flex gap-4">
          <button
            onClick={() => { setActiveProfile(null); router.push("/"); }}
            className="font-body text-slate-400 underline underline-offset-4 py-2"
            aria-label="Switch player"
          >
            🔄 Switch player
          </button>
          <button
            onClick={() => router.push("/tts-test")}
            className="font-body text-slate-300 underline underline-offset-4 py-2 text-xs"
          >
            🔬 Debug
          </button>
        </div>
      </div>
    </main>
  );
}
