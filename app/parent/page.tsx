"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { BigButton, KidErrorBoundary } from "@/components/ui";
import { ModeToggle } from "@/components/ModeToggle";

/* Multiplication puzzle gate — trivially solved by adults,
   reliably blocks pre-readers and early readers. */
function makePuzzle() {
  const a = 3 + Math.floor(Math.random() * 7); // 3–9
  const b = 3 + Math.floor(Math.random() * 7);
  return { a, b, answer: a * b };
}

export default function ParentPage() {
  return (
    <KidErrorBoundary>
      <Parent />
    </KidErrorBoundary>
  );
}

function Parent() {
  const router = useRouter();
  const {
    profiles,
    deleteProfile,
    soundOn,
    musicOn,
    toggleSound,
    toggleMusic,
    unlockParentGate,
    isParentUnlocked,
  } = useAppStore();

  const [hydrated, setHydrated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [puzzle, setPuzzle] = useState(makePuzzle);
  const [input, setInput] = useState("");
  const [wrong, setWrong] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    setUnlocked(isParentUnlocked());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalStars = useMemo(
    () => profiles.reduce((n, p) => n + p.stars, 0),
    [profiles]
  );

  const tryUnlock = () => {
    if (parseInt(input, 10) === puzzle.answer) {
      unlockParentGate();
      setUnlocked(true);
    } else {
      setWrong(true);
      setInput("");
      setPuzzle(makePuzzle());
      setTimeout(() => setWrong(false), 1200);
    }
  };

  if (!hydrated) return null;

  if (!unlocked) {
    return (
      <main className="min-h-dvh bg-slate-100 flex flex-col items-center justify-center p-6 gap-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm flex flex-col gap-4 ${
            wrong ? "animate-pulse ring-4 ring-red-300" : ""
          }`}
        >
          <h1 className="font-display text-2xl text-slate-700 text-center">
            🔒 Grown-ups only
          </h1>
          <p className="font-body text-slate-500 text-center">
            To continue, solve: <strong className="text-xl">{puzzle.a} × {puzzle.b} = ?</strong>
          </p>
          <input
            type="number"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            className="font-body text-2xl text-center rounded-2xl border-4 border-slate-200 px-4 py-3 focus:border-grape outline-none"
            placeholder="Answer"
            autoFocus
          />
          {wrong && (
            <p className="text-red-500 font-body text-center text-sm">
              Not quite — here&apos;s a new one.
            </p>
          )}
          <BigButton color="bg-grape text-white" className="!text-xl" onClick={tryUnlock}>
            Unlock
          </BigButton>
          <button
            onClick={() => router.push("/")}
            className="font-body text-slate-400 underline underline-offset-4"
          >
            Back to kids&apos; area
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-100 p-5 sm:p-8 flex flex-col gap-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-slate-700">Parent Dashboard</h1>
        <BigButton color="bg-white" className="!text-lg !min-h-[48px]" onClick={() => router.push("/")}>
          Exit
        </BigButton>
      </header>

      <section className="bg-white rounded-3xl shadow p-6">
        <h2 className="font-display text-xl text-slate-600 mb-3">App settings</h2>
        <div className="flex flex-wrap gap-3">
          <BigButton
            color={soundOn ? "bg-grass" : "bg-slate-200"}
            className="!text-lg"
            onClick={toggleSound}
          >
            {soundOn ? "🔊 Sound effects: On" : "🔇 Sound effects: Off"}
          </BigButton>
          <BigButton
            color={musicOn ? "bg-grape text-white" : "bg-slate-200"}
            className="!text-lg"
            onClick={toggleMusic}
          >
            {musicOn ? "🎵 Music: On" : "🎵 Music: Off"}
          </BigButton>
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow p-6">
        <h2 className="font-display text-xl text-slate-600 mb-1">Progress report</h2>
        <p className="font-body text-slate-400 mb-4">
          {profiles.length} {profiles.length === 1 ? "child" : "children"} · {totalStars} stars earned in total
        </p>

        {profiles.length === 0 ? (
          <p className="font-body text-slate-500">
            No profiles yet. Create one from the home screen to start tracking progress.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {profiles.map((p) => (
              <div key={p.id} className="border-2 border-slate-100 rounded-2xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl" aria-hidden>{p.avatar}</span>
                    <div>
                      <p className="font-display text-lg text-slate-700">
                        {p.name} <span className="font-body text-slate-400 text-sm">· age {p.age}</span>
                      </p>
                      <p className="font-body text-slate-500 text-sm">
                        ⭐ {p.stars} stars · 🎁 {p.stickers.length} stickers
                      </p>
                    </div>
                  </div>
                  {confirmDelete === p.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { deleteProfile(p.id); setConfirmDelete(null); }}
                        className="font-body bg-red-500 text-white rounded-xl px-3 py-2"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="font-body bg-slate-200 rounded-xl px-3 py-2"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(p.id)}
                      className="font-body text-red-400 underline underline-offset-4 text-sm"
                    >
                      Delete profile
                    </button>
                  )}
                </div>

                <div className="mt-3 bg-slate-50 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
                  <span className="font-body text-slate-500 text-sm">Learning mode</span>
                  <ModeToggle profile={p} />
                </div>

                {p.learningMode === "advanced" && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                    {(
                      [
                        ["🧮 Abacus", p.advancedMetrics.abacusScore],
                        ["🏅 Olympiad", `L${p.advancedMetrics.olympiadLevel}`],
                        ["🇮🇳 Hindi", `L${p.advancedMetrics.currentHindiLevel + 1}`],
                        ["📜 Kannada", `L${p.advancedMetrics.currentKannadaLevel + 1}`],
                        ["🏸 Sports", p.advancedMetrics.sportsBadges],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label} className="bg-grape/10 rounded-xl p-2 text-center">
                        <p className="font-body text-xs text-slate-500">{label}</p>
                        <p className="font-display text-lg text-grape">{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {p.learningMode === "advanced" &&
                  p.advancedMetrics.sportsLog.length > 0 && (
                    <div className="mt-3">
                      <p className="font-body text-xs text-slate-400 mb-1">
                        Recent activity diary (
                        {p.advancedMetrics.sportsLog.reduce((n, e) => n + e.minutes, 0)}{" "}
                        total minutes)
                      </p>
                      <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                        {p.advancedMetrics.sportsLog.slice(0, 8).map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1 text-sm"
                          >
                            <span aria-hidden>
                              {e.sport === "badminton" ? "🏸" : e.sport === "swimming" ? "🏊" : "🛼"}
                            </span>
                            <span className="font-body text-slate-600 capitalize">{e.sport}</span>
                            <span className="font-body text-slate-400">{e.minutes} min</span>
                            {e.note && (
                              <span className="font-body text-slate-400 truncate">— {e.note}</span>
                            )}
                            <span className="ml-auto font-body text-[10px] text-slate-300 shrink-0">
                              {new Date(e.loggedAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  {(
                    [
                      ["math", "🔢 Math", "bg-sky-kid/20"],
                      ["reading", "📖 Reading", "bg-berry/20"],
                      ["logic", "🧩 Logic", "bg-grass/30"],
                      ["art", "🎨 Art", "bg-sun/40"],
                    ] as const
                  ).map(([key, label, bg]) => (
                    <div key={key} className={`${bg} rounded-xl p-3 text-center`}>
                      <p className="font-display text-slate-600">{label}</p>
                      <p className="font-body text-2xl text-slate-700">
                        {p.completions[key] ?? 0}
                      </p>
                      <p className="font-body text-xs text-slate-400">lessons done</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
