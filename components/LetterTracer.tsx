"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useGameStore, type Sticker } from "@/store/useGameStore";
import { playSuccess, playRetry, playTap } from "@/lib/sounds";
import { BigButton } from "@/components/ui";
import { RewardOverlay } from "@/components/RewardOverlay";
import { useRouter } from "next/navigation";
import { speak, warmVoices } from "@/lib/tts";
import { GuidedTracer } from "@/components/GuidedTracer";
import { hasStrokeData } from "@/lib/strokes";

/**
 * LetterTracer — repurposes the Art Cove canvas engine for script
 * practice. The target letter is rendered as a fat light outline on a
 * background canvas; the child draws on a transparent canvas above it.
 *
 * Accuracy check (pixel sampling):
 *   - "inside" = drawn pixels that land on the letter's stroke mask
 *   - coverage = fraction of the letter mask the child has covered
 *   - precision = fraction of the child's ink that stayed inside
 * Pass = coverage ≥ 45% AND precision ≥ 55% (forgiving, age 6–10).
 * Passing a letter advances currentHindiLevel / currentKannadaLevel.
 */

const HINDI_TRACK = ["अ", "आ", "इ", "ई", "उ", "ऊ", "ए", "ऐ", "ओ", "औ", "क", "ख", "ग", "घ", "च"];
const KANNADA_TRACK = ["ಅ", "ಆ", "ಇ", "ಈ", "ಉ", "ಊ", "ಎ", "ಏ", "ಒ", "ಓ", "ಕ", "ಖ", "ಗ", "ಘ", "ಚ"];

export function LetterTracer({ language }: { language: "hindi" | "kannada" }) {
  const router = useRouter();
  const { soundOn, bumpAdvancedMetric, awardStarAndSticker } = useGameStore();
  const levelKey = language === "hindi" ? "currentHindiLevel" : "currentKannadaLevel";
  const level = useGameStore(
    (s) =>
      s.profiles.find((p) => p.id === s.activeProfileId)?.advancedMetrics[
        levelKey
      ] ?? 0
  );

  const track = language === "hindi" ? HINDI_TRACK : KANNADA_TRACK;
  const letter = track[level % track.length];
  const lettersUntilSticker = 3;
  const [passedThisSession, setPassedThisSession] = useState(0);

  /* Guided (stroke-sequence) vs Free (pixel-accuracy) tracing.
     Guided is the default whenever this letter has authored stroke
     data; letters without it automatically use free trace. */
  const guidedAvailable = hasStrokeData(letter);
  const [traceMode, setTraceMode] = useState<"guided" | "free">("guided");
  const effectiveMode: "guided" | "free" =
    guidedAvailable && traceMode === "guided" ? "guided" : "free";

  const onGuidedComplete = () => {
    bumpAdvancedMetric(levelKey, 1);
    const done = passedThisSession + 1;
    setPassedThisSession(done);
    if (done >= lettersUntilSticker) {
      setTimeout(() => {
        setReward(awardStarAndSticker("reading"));
        setPassedThisSession(0);
      }, 600);
    }
  };

  const bgRef = useRef<HTMLCanvasElement>(null);   // letter outline + mask source
  const inkRef = useRef<HTMLCanvasElement>(null);  // child's strokes
  const maskRef = useRef<Uint8Array | null>(null); // 1 = letter stroke pixel
  const maskCount = useRef(0);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [verdict, setVerdict] = useState<"none" | "pass" | "retry">("none");
  const [reward, setReward] = useState<Sticker | null>(null);

  useEffect(() => { warmVoices(); }, []);

  /** Draw the big outline letter and capture its pixel mask. */
  useEffect(() => {
    const bg = bgRef.current;
    const ink = inkRef.current;
    if (!bg || !ink) return;
    const rect = bg.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [bg, ink]) {
      c.width = rect.width * dpr;
      c.height = rect.height * dpr;
    }
    const ctx = bg.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Fat stroke letter: fill + thick stroke gives a generous tracing band.
    const size = Math.min(rect.width, rect.height) * 0.72;
    ctx.font = `${size}px "Noto Sans", "Noto Sans Devanagari", "Noto Sans Kannada", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.fillStyle = "#E3F2FD";
    ctx.strokeStyle = "#90CAF9";
    ctx.lineWidth = 10;
    ctx.fillText(letter, rect.width / 2, rect.height / 2 + size * 0.06);
    ctx.strokeText(letter, rect.width / 2, rect.height / 2 + size * 0.06);
    // dashed guide outline
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "#64B5F6";
    ctx.lineWidth = 2;
    ctx.strokeText(letter, rect.width / 2, rect.height / 2 + size * 0.06);
    ctx.setLineDash([]);

    // Build the mask at canvas resolution
    const raw = bg.getContext("2d")!.getImageData(0, 0, bg.width, bg.height).data;
    const mask = new Uint8Array(bg.width * bg.height);
    let count = 0;
    for (let i = 0; i < mask.length; i++) {
      if (raw[i * 4 + 3] > 30) { mask[i] = 1; count++; }
    }
    maskRef.current = mask;
    maskCount.current = count;

    // Reset ink layer
    const ictx = ink.getContext("2d")!;
    ictx.setTransform(1, 0, 0, 1, 0, 0);
    ictx.clearRect(0, 0, ink.width, ink.height);
    setHasInk(false);
    setVerdict("none");
  }, [letter, language]);

  const pos = (e: React.PointerEvent) => {
    const ink = inkRef.current!;
    const rect = ink.getBoundingClientRect();
    const scaleX = ink.width / rect.width;
    const scaleY = ink.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    const ctx = inkRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.strokeStyle = "#F06292";
    ctx.lineWidth = 14 * Math.min(window.devicePixelRatio || 1, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    setHasInk(true);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = inkRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => (drawing.current = false);

  const clear = () => {
    const ink = inkRef.current!;
    ink.getContext("2d")!.clearRect(0, 0, ink.width, ink.height);
    setHasInk(false);
    setVerdict("none");
    playTap(soundOn);
  };

  const check = () => {
    const ink = inkRef.current!;
    const mask = maskRef.current;
    if (!mask) return;
    const data = ink.getContext("2d")!.getImageData(0, 0, ink.width, ink.height).data;
    let inkTotal = 0;
    let inkInside = 0;
    const covered = new Set<number>();
    // Sample every 2nd pixel for speed
    for (let i = 0; i < mask.length; i += 2) {
      if (data[i * 4 + 3] > 30) {
        inkTotal++;
        if (mask[i]) { inkInside++; covered.add(i); }
      }
    }
    const sampledMask = Math.max(1, Math.floor(maskCount.current / 2));
    const coverage = covered.size / sampledMask;
    const precision = inkTotal ? inkInside / inkTotal : 0;

    if (coverage >= 0.45 && precision >= 0.55) {
      playSuccess(soundOn);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setVerdict("pass");
      bumpAdvancedMetric(levelKey, 1);
      const done = passedThisSession + 1;
      setPassedThisSession(done);
      if (done >= lettersUntilSticker) {
        setTimeout(() => { setReward(awardStarAndSticker("reading")); setPassedThisSession(0); }, 900);
      }
      // The level bump re-renders with the next letter automatically.
    } else {
      playRetry(soundOn);
      setVerdict("retry");
    }
  };

  const hear = () => {
    playTap(soundOn);
    speak(letter, { lang: language === "hindi" ? "hi-IN" : "kn-IN", rate: 0.7 });
  };

  return (
    <section className="flex flex-col items-center gap-4 w-full max-w-md">
      <div className="flex items-center gap-3">
        <span className="bg-grape text-white font-display rounded-full px-4 py-1">
          Letter {level + 1}
        </span>
        <div className="flex gap-1.5" aria-label={`${passedThisSession} of ${lettersUntilSticker} letters traced`}>
          {Array.from({ length: lettersUntilSticker }).map((_, i) => (
            <span key={i} className={`w-3.5 h-3.5 rounded-full ${i < passedThisSession ? "bg-grass" : "bg-white/70"}`} />
          ))}
        </div>
        <BigButton color="bg-white" className="!min-h-[44px] !px-3 !py-1 !text-xl" onClick={hear} ariaLabel="Hear the letter">
          🔊
        </BigButton>
      </div>

      {guidedAvailable && (
        <div className="flex gap-2" role="tablist" aria-label="Tracing mode">
          {([
            ["guided", "🎯 Guided strokes"],
            ["free", "✍️ Free trace"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { playTap(soundOn); setTraceMode(id); setVerdict("none"); }}
              aria-pressed={traceMode === id}
              className={`font-display text-sm rounded-2xl px-4 py-2 shadow-chunkySm transition min-h-[44px]
                ${traceMode === id ? "bg-berry text-white scale-105" : "bg-white text-slate-600"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <p className="font-body text-slate-500 text-center">
        {effectiveMode === "guided"
          ? "Start at the pink ①, follow the moving dot, and don't lift your finger until the stroke is done! 🎯"
          : "Trace the letter — stay on the light blue shape! ✍️"}
      </p>

      {effectiveMode === "guided" ? (
        <GuidedTracer letter={letter} onComplete={onGuidedComplete} />
      ) : (
      <div className="relative w-full aspect-square max-w-sm">
        <canvas ref={bgRef} className="absolute inset-0 w-full h-full bg-white rounded-[2rem] shadow-chunky" aria-hidden />
        <canvas
          ref={inkRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair rounded-[2rem]"
          aria-label={`Trace the ${language} letter ${letter}`}
        />
        {verdict === "pass" && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-3 -right-3 text-6xl"
            aria-hidden
          >
            🌟
          </motion.div>
        )}
      </div>
      )}

      {effectiveMode === "free" && verdict === "retry" && (
        <p className="font-display text-berry">Good try! Trace more of the letter and stay inside. 💪</p>
      )}

      {effectiveMode === "free" && (
        <div className="flex gap-3">
          <BigButton color="bg-white" className="!text-xl" onClick={clear}>
            🧽 Clear
          </BigButton>
          <BigButton
            color="bg-grass text-white"
            className="!text-xl"
            disabled={!hasInk}
            onClick={check}
          >
            ✅ Check
          </BigButton>
        </div>
      )}

      <RewardOverlay
        sticker={reward}
        onClose={() => router.push("/dashboard")}
        onPlayAgain={() => setReward(null)}
      />
    </section>
  );
}
