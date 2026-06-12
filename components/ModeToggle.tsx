"use client";

import { motion } from "framer-motion";
import { useGameStore, type ChildProfile } from "@/store/useGameStore";
import { playTap } from "@/lib/sounds";

/**
 * Junior ⇄ Advanced switch. `compact` renders the small pill used on
 * profile cards; the default renders the labeled switch used in the
 * Parent Dashboard.
 */
export function ModeToggle({
  profile,
  compact = false,
}: {
  profile: ChildProfile;
  compact?: boolean;
}) {
  const { toggleLearningMode, soundOn } = useGameStore();
  const advanced = profile.learningMode === "advanced";

  const flip = (e: React.MouseEvent) => {
    e.stopPropagation(); // cards are clickable — don't launch the profile
    playTap(soundOn);
    toggleLearningMode(profile.id);
  };

  if (compact) {
    return (
      <button
        onClick={flip}
        aria-label={`Switch ${profile.name} to ${advanced ? "Junior" : "Advanced"} mode`}
        className={`font-display text-xs rounded-full px-3 py-1 shadow-chunkySm transition
          ${advanced ? "bg-grape text-white" : "bg-sun text-slate-700"}`}
      >
        {advanced ? "🎓 Advanced" : "🌱 Junior"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`font-display ${!advanced ? "text-slate-700" : "text-slate-400"}`}>
        🌱 Junior
      </span>
      <button
        onClick={flip}
        role="switch"
        aria-checked={advanced}
        aria-label={`Learning mode for ${profile.name}`}
        className={`w-16 h-9 rounded-full p-1 transition-colors shadow-inner
          ${advanced ? "bg-grape" : "bg-slate-300"}`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`block w-7 h-7 bg-white rounded-full shadow ${advanced ? "ml-auto" : ""}`}
        />
      </button>
      <span className={`font-display ${advanced ? "text-grape" : "text-slate-400"}`}>
        🎓 Advanced
      </span>
    </div>
  );
}
