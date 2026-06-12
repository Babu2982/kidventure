"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Component, type ReactNode, useEffect, useState } from "react";
import { useAppStore, useActiveProfile } from "@/store/useAppStore";
import { playTap, startMusic, stopMusic } from "@/lib/sounds";

/* ================= BigButton ================= */

export function BigButton({
  children,
  onClick,
  color = "bg-sun",
  className = "",
  ariaLabel,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  color?: string;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const soundOn = useAppStore((s) => s.soundOn);
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.06 }}
      whileTap={{ scale: disabled ? 1 : 0.93 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        playTap(soundOn);
        onClick?.();
      }}
      className={`${color} ${className} font-display rounded-blob shadow-chunky
        text-slate-800 active:shadow-chunkySm disabled:opacity-40
        touch-manipulation min-h-[64px] px-6 py-4 text-2xl`}
    >
      {children}
    </motion.button>
  );
}

/* ================= TopBar (kid screens) ================= */

export function TopBar({ title, emoji }: { title: string; emoji: string }) {
  const router = useRouter();
  const profile = useActiveProfile();
  const { soundOn, toggleSound, musicOn, toggleMusic } = useAppStore();

  useEffect(() => {
    if (musicOn) startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [musicOn]);

  return (
    <header className="flex items-center justify-between gap-2 p-3 sm:p-4">
      <BigButton
        color="bg-white"
        className="!min-h-[56px] !px-4 !py-2 !text-3xl"
        ariaLabel="Go back"
        onClick={() => router.back()}
      >
        ⬅️
      </BigButton>

      <h1 className="font-display text-xl sm:text-3xl text-slate-700 flex items-center gap-2">
        <span aria-hidden>{emoji}</span> {title}
      </h1>

      <div className="flex items-center gap-2">
        {profile && (
          <div
            className="bg-white rounded-full px-3 py-2 shadow-chunkySm font-display text-lg flex items-center gap-1"
            aria-label={`${profile.stars} stars earned`}
          >
            ⭐ {profile.stars}
          </div>
        )}
        <BigButton
          color={soundOn ? "bg-grass" : "bg-white"}
          className="!min-h-[56px] !px-3 !py-2 !text-2xl"
          ariaLabel={soundOn ? "Turn sound off" : "Turn sound on"}
          onClick={toggleSound}
        >
          {soundOn ? "🔊" : "🔇"}
        </BigButton>
        <BigButton
          color={musicOn ? "bg-grape text-white" : "bg-white"}
          className="!min-h-[56px] !px-3 !py-2 !text-2xl hidden sm:block"
          ariaLabel={musicOn ? "Turn music off" : "Turn music on"}
          onClick={toggleMusic}
        >
          🎵
        </BigButton>
      </div>
    </header>
  );
}

/* ================= ErrorBoundary ================= */

export class KidErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("KidVenture error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-sky-scene flex flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="text-8xl" aria-hidden>🙈</div>
          <h2 className="font-display text-3xl text-slate-700">
            Oops! Something got tangled.
          </h2>
          <BigButton color="bg-sun" onClick={() => (window.location.href = "/")}>
            🏠 Go Home
          </BigButton>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ================= ClientGate =================
   Waits for zustand to rehydrate from localStorage and redirects
   to profile selection if no child is active. Shows a friendly loader. */

export function ClientGate({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const profile = useActiveProfile();
  const router = useRouter();

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated && !profile) router.replace("/");
  }, [hydrated, profile, router]);

  if (!hydrated || !profile) {
    return (
      <div className="min-h-dvh bg-sky-scene flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
          className="text-7xl"
          aria-hidden
        >
          🌞
        </motion.div>
        <p className="font-display text-2xl text-slate-600">Loading…</p>
      </div>
    );
  }
  return <KidErrorBoundary>{children}</KidErrorBoundary>;
}
