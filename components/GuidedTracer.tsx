"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useGameStore } from "@/store/useGameStore";
import { playTap, playSuccess, playRetry } from "@/lib/sounds";
import { STROKE_DATA, resample, type Stroke } from "@/lib/strokes";

/**
 * GuidedTracer — IGCSE-style stroke-sequence teaching.
 *
 * How it works:
 *  - The letter's stroke skeleton renders on a static base canvas:
 *    completed strokes solid green, the current stroke as a dashed
 *    guide with a numbered start badge, future strokes faint gray.
 *  - An animated guide dot loops along the current stroke showing
 *    the direction of travel.
 *  - The child must drag through the stroke's resampled waypoints
 *    IN ORDER. The pointer may wander slightly (tolerance radius),
 *    but skipping ahead doesn't count — waypoints only clear
 *    sequentially, which is what enforces stroke direction.
 *  - Lifting the finger mid-stroke gently resets that stroke.
 *  - All strokes done → onComplete() fires (level-up + sticker
 *    logic stays in the parent, identical to free-trace mode).
 */

const TOLERANCE = 0.075;       // waypoint hit radius (fraction of canvas)
const WAYPOINT_SPACING = 0.05; // resample distance

export function GuidedTracer({
  letter,
  onComplete,
}: {
  letter: string;
  onComplete: () => void;
}) {
  const soundOn = useGameStore((s) => s.soundOn);
  const baseRef = useRef<HTMLCanvasElement>(null); // skeleton + completed strokes
  const inkRef = useRef<HTMLCanvasElement>(null);  // live finger trail
  const dotRef = useRef<HTMLDivElement>(null);     // animated guide dot

  const strokes = STROKE_DATA[letter] ?? [];
  const waypointsRef = useRef<Stroke[]>([]);
  const [strokeIdx, setStrokeIdx] = useState(0);
  const progressRef = useRef(0); // next waypoint index in current stroke
  const tracing = useRef(false);
  const [wobble, setWobble] = useState(false);
  const doneRef = useRef(false);

  /* ---------- canvas helpers ---------- */

  const dims = () => {
    const c = baseRef.current!;
    const r = c.getBoundingClientRect();
    return { w: r.width, h: r.height, rect: r };
  };

  const toPx = ([x, y]: [number, number]) => {
    const { w, h } = dims();
    return { x: x * w, y: y * h };
  };

  const drawSkeleton = (currentIdx: number) => {
    const c = baseRef.current;
    if (!c) return;
    const { w, h } = dims();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    strokes.forEach((stroke, i) => {
      ctx.beginPath();
      stroke.forEach(([x, y], j) => {
        if (j === 0) ctx.moveTo(x * w, y * h);
        else ctx.lineTo(x * w, y * h);
      });
      if (i < currentIdx) {
        // completed — solid green
        ctx.setLineDash([]);
        ctx.strokeStyle = "#81C784";
        ctx.lineWidth = 16;
      } else if (i === currentIdx) {
        // active — bold dashed blue band
        ctx.setLineDash([]);
        ctx.strokeStyle = "#E3F2FD";
        ctx.lineWidth = 26;
        ctx.stroke();
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = "#64B5F6";
        ctx.lineWidth = 4;
      } else {
        // future — faint
        ctx.setLineDash([]);
        ctx.strokeStyle = "#ECEFF1";
        ctx.lineWidth = 14;
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // numbered start badge for the active + future strokes
      if (i >= currentIdx) {
        const [sx, sy] = stroke[0];
        ctx.beginPath();
        ctx.arc(sx * w, sy * h, 16, 0, Math.PI * 2);
        ctx.fillStyle = i === currentIdx ? "#F06292" : "#CFD8DC";
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px Fredoka, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), sx * w, sy * h);
        // direction arrow at the start of the active stroke
        if (i === currentIdx && stroke.length > 1) {
          const [nx, ny] = stroke[1];
          const ang = Math.atan2((ny - sy) * h, (nx - sx) * w);
          const ax = sx * w + Math.cos(ang) * 30;
          const ay = sy * h + Math.sin(ang) * 30;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax - 10 * Math.cos(ang - 0.4), ay - 10 * Math.sin(ang - 0.4));
          ctx.lineTo(ax - 10 * Math.cos(ang + 0.4), ay - 10 * Math.sin(ang + 0.4));
          ctx.closePath();
          ctx.fillStyle = "#F06292";
          ctx.fill();
        }
      }
    });
  };

  const clearInk = () => {
    const c = inkRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  };

  /* ---------- setup per letter / stroke ---------- */

  useEffect(() => {
    waypointsRef.current = strokes.map((s) => resample(s, WAYPOINT_SPACING));
    setStrokeIdx(0);
    progressRef.current = 0;
    doneRef.current = false;
    const ink = inkRef.current;
    if (ink) {
      const { w, h } = dims();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ink.width = w * dpr;
      ink.height = h * dpr;
      ink.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    drawSkeleton(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter]);

  useEffect(() => {
    drawSkeleton(strokeIdx);
    clearInk();
    progressRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokeIdx]);

  /* ---------- animated guide dot along the active stroke ---------- */

  useEffect(() => {
    let raf = 0;
    const animate = (t: number) => {
      const wps = waypointsRef.current[strokeIdx];
      const dot = dotRef.current;
      if (wps && dot && !doneRef.current) {
        // loop 0→1 along waypoints every 2.2s, paused while tracing
        if (!tracing.current) {
          const phase = (t % 2200) / 2200;
          const fi = phase * (wps.length - 1);
          const i = Math.floor(fi);
          const frac = fi - i;
          const a = wps[i];
          const b = wps[Math.min(i + 1, wps.length - 1)];
          const p = toPx([a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac]);
          dot.style.transform = `translate(${p.x - 10}px, ${p.y - 10}px)`;
          dot.style.opacity = "1";
        } else {
          dot.style.opacity = "0";
        }
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [strokeIdx]);

  /* ---------- pointer tracing with ordered waypoints ---------- */

  const normPos = (e: React.PointerEvent) => {
    const { rect } = dims();
    return {
      nx: (e.clientX - rect.left) / rect.width,
      ny: (e.clientY - rect.top) / rect.height,
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
    };
  };

  const advanceThroughWaypoints = (nx: number, ny: number) => {
    const wps = waypointsRef.current[strokeIdx];
    if (!wps) return;
    // Clear as many *sequential* waypoints as the pointer reaches.
    while (progressRef.current < wps.length) {
      const [wx, wy] = wps[progressRef.current];
      if (Math.hypot(nx - wx, ny - wy) <= TOLERANCE) {
        progressRef.current++;
      } else break;
    }
    if (progressRef.current >= wps.length) strokeFinished();
  };

  const strokeFinished = () => {
    tracing.current = false;
    playSuccess(soundOn);
    if (strokeIdx + 1 >= strokes.length) {
      doneRef.current = true;
      drawSkeleton(strokes.length); // all green
      clearInk();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setTimeout(onComplete, 700);
    } else {
      setStrokeIdx((i) => i + 1);
    }
  };

  const down = (e: React.PointerEvent) => {
    if (doneRef.current) return;
    const { nx, ny, px, py } = normPos(e);
    const wps = waypointsRef.current[strokeIdx];
    if (!wps) return;
    const [sx, sy] = wps[0];
    // Must start near the numbered badge
    if (Math.hypot(nx - sx, ny - sy) > TOLERANCE * 1.4) {
      setWobble(true);
      playRetry(soundOn);
      setTimeout(() => setWobble(false), 500);
      return;
    }
    tracing.current = true;
    progressRef.current = 0;
    playTap(soundOn);
    const ctx = inkRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#F06292";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(px, py);
    advanceThroughWaypoints(nx, ny);
  };

  const move = (e: React.PointerEvent) => {
    if (!tracing.current || doneRef.current) return;
    const { nx, ny, px, py } = normPos(e);
    const ctx = inkRef.current!.getContext("2d")!;
    ctx.lineTo(px, py);
    ctx.stroke();
    advanceThroughWaypoints(nx, ny);
  };

  const up = () => {
    if (!tracing.current || doneRef.current) return;
    tracing.current = false;
    const wps = waypointsRef.current[strokeIdx];
    // Lifted before finishing the stroke → gentle reset of this stroke
    if (wps && progressRef.current < wps.length) {
      playRetry(soundOn);
      clearInk();
      progressRef.current = 0;
    }
  };

  return (
    <motion.div
      animate={wobble ? { x: [0, -8, 8, -6, 6, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="relative w-full aspect-square max-w-sm"
    >
      <canvas
        ref={baseRef}
        className="absolute inset-0 w-full h-full bg-white rounded-[2rem] shadow-chunky"
        aria-hidden
      />
      <canvas
        ref={inkRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        className="absolute inset-0 w-full h-full touch-none cursor-crosshair rounded-[2rem]"
        aria-label={`Trace stroke ${strokeIdx + 1} of ${strokes.length} for ${letter}. Start at the pink number ${strokeIdx + 1}.`}
      />
      {/* animated guide dot */}
      <div
        ref={dotRef}
        aria-hidden
        className="absolute top-0 left-0 w-5 h-5 rounded-full bg-grape shadow pointer-events-none transition-opacity"
        style={{ opacity: 0 }}
      />
      <span className="absolute bottom-3 right-4 font-display text-sm text-slate-400">
        Stroke {Math.min(strokeIdx + 1, strokes.length)} / {strokes.length}
      </span>
    </motion.div>
  );
}
