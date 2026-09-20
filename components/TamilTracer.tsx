"use client";

/**
 * TamilTracer.tsx — SVG stroke-dashoffset path-reveal tracer for Tamil letters.
 *
 * Approach: Tamil letters are continuous cursive curves — canvas waypoint
 * tracing (used for Hindi/Kannada in GuidedTracer.tsx) doesn't suit them.
 * Instead we use SVG <path> + stroke-dasharray/stroke-dashoffset to reveal
 * the letter as the child drags along it.
 *
 * How it works:
 *  - Each stroke is an SVG path. dasharray = totalLength, dashoffset starts
 *    at totalLength (fully hidden). As progress 0→1, dashoffset drops to 0
 *    (fully revealed).
 *  - At each pointer event we call getPointAtLength(progress * totalLength)
 *    to find the "active" point on the path and check distance to the pointer.
 *  - If within FORGIVENESS_PX the child is "on track" and progress advances.
 *  - Progress can only go forward — dragging backward does nothing.
 *  - Stroke N is locked until Stroke N-1 is complete.
 *  - A glowing dot tracks the current active point to guide the child.
 *
 * Forgiveness zone:
 *  - Controlled by FORGIVENESS_PX (default 36px on a 320px viewBox).
 *  - Increase for younger / less precise children; decrease for challenge mode.
 *  - On mobile the SVG is typically 300–360px wide; 36px ≈ 10% of width.
 *
 * Data shape:
 *  TamilLetterData = { letter, strokes: TamilStroke[] }
 *  TamilStroke     = { id, d (SVG path string), label? }
 *  Paths are authored in a 320×320 viewBox.
 *
 * Props:
 *  letter    TamilLetterData   letter to trace
 *  onComplete () => void       called when all strokes finish
 */

import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useGameStore } from "@/store/useGameStore";
import { playSuccess, playRetry, playTap } from "@/lib/sounds";
import { narrate } from "@/lib/narrator";

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */

export type TamilStroke = {
  /** Unique id within the letter */
  id: string;
  /** SVG path 'd' attribute string — authored in a 320×320 viewBox */
  d: string;
  /** Optional human label shown in the stroke counter */
  label?: string;
};

export type TamilLetterData = {
  /** The Tamil Unicode character(s) — used for display and narration */
  letter: string;
  /** Phonetic label e.g. "அ (a)" */
  phonetic: string;
  /** Ordered strokes — must trace in sequence */
  strokes: TamilStroke[];
};

/* ─────────────────────────────────────────────────────────────
   CONSTANTS  — tune these to adjust difficulty
───────────────────────────────────────────────────────────── */

/**
 * FORGIVENESS_PX — how many SVG-user-unit pixels the pointer may stray
 * from the active path point and still count as "on track".
 *
 * The viewBox is 320×320.
 * 36 ≈ 11% of width — comfortable for age 6–10 on a phone.
 * Raise to 50+ for preschool / fine-motor challenges.
 * Lower to 20 for older / more precise children.
 */
const FORGIVENESS_PX = 36;

/**
 * ADVANCE_PER_EVENT — maximum fraction of total path length that can be
 * consumed in a single pointer-move event. Prevents "teleporting" if the
 * child drags very fast across the whole letter in one swipe.
 */
const ADVANCE_PER_EVENT = 0.04; // 4% per event

/** Fraction of stroke that counts as "complete" (avoids needing to hit the exact end). */
const COMPLETE_THRESHOLD = 0.96;

/* ─────────────────────────────────────────────────────────────
   SINGLE STROKE TRACER
───────────────────────────────────────────────────────────── */

type StrokeState = "locked" | "active" | "done";

function StrokeLayer({
  stroke,
  state,
  progress,        // 0–1
  svgRef,          // parent SVG element ref for coordinate conversion
  onProgress,      // called with new clamped progress value
  onComplete,
  soundOn,
}: {
  stroke: TamilStroke;
  state: StrokeState;
  progress: number;
  svgRef: React.RefObject<SVGSVGElement>;
  onProgress: (p: number) => void;
  onComplete: () => void;
  soundOn: boolean;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const tracingRef = useRef(false);
  const totalLengthRef = useRef(0);

  // Cache total length once the path mounts
  useEffect(() => {
    if (pathRef.current) {
      totalLengthRef.current = pathRef.current.getTotalLength();
    }
  }, [stroke.d]);

  // Keep the guide dot at the current progress point
  useEffect(() => {
    const path = pathRef.current;
    const dot = dotRef.current;
    if (!path || !dot || state !== "active") return;
    const len = totalLengthRef.current;
    if (len === 0) return;
    const pt = path.getPointAtLength(Math.min(progress, 1) * len);
    dot.setAttribute("cx", String(pt.x));
    dot.setAttribute("cy", String(pt.y));
  }, [progress, state, stroke.d]);

  /** Convert a client-space PointerEvent into SVG user-space coordinates */
  const clientToSVG = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  };

  /**
   * Find closest point on path to (x, y) using binary search.
   * Returns { t: fraction 0–1, dist: distance in user units }.
   * We search only forward from the current progress to enforce directionality.
   */
  const findClosestForward = (
    x: number,
    y: number,
    currentProgress: number
  ): { t: number; dist: number } => {
    const path = pathRef.current!;
    const len = totalLengthRef.current;
    // Search window: currentProgress → min(currentProgress + ADVANCE_PER_EVENT * 3, 1)
    const startT = currentProgress;
    const endT = Math.min(currentProgress + ADVANCE_PER_EVENT * 3, 1);
    const STEPS = 12;
    let bestDist = Infinity;
    let bestT = currentProgress;
    for (let i = 0; i <= STEPS; i++) {
      const t = startT + (endT - startT) * (i / STEPS);
      const pt = path.getPointAtLength(t * len);
      const dist = Math.hypot(x - pt.x, y - pt.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestT = t;
      }
    }
    return { t: bestT, dist: bestDist };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGElement>) => {
    if (state !== "active") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = clientToSVG(e.clientX, e.clientY);
    if (!pos) return;

    // Must start near the beginning of the stroke (within 2× forgiveness)
    if (progress < 0.02) {
      const path = pathRef.current!;
      const len = totalLengthRef.current;
      const start = path.getPointAtLength(0);
      const dist = Math.hypot(pos.x - start.x, pos.y - start.y);
      if (dist > FORGIVENESS_PX * 2) {
        // Missed start — wobble handled by parent, just play retry
        playRetry(soundOn);
        return;
      }
    }
    tracingRef.current = true;
    playTap(soundOn);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGElement>) => {
    if (!tracingRef.current || state !== "active") return;
    const pos = clientToSVG(e.clientX, e.clientY);
    if (!pos) return;

    const { t, dist } = findClosestForward(pos.x, pos.y, progress);

    if (dist <= FORGIVENESS_PX) {
      // On track — advance progress (forward only, capped per event)
      const newP = Math.min(t, progress + ADVANCE_PER_EVENT, 1);
      onProgress(newP);
      if (newP >= COMPLETE_THRESHOLD) {
        tracingRef.current = false;
        onComplete();
      }
    }
    // If dist > FORGIVENESS_PX: off track — progress freezes, no reset
  };

  const handlePointerUp = () => {
    tracingRef.current = false;
  };

  const dashLen = totalLengthRef.current || 1000;
  const dashOffset = dashLen * (1 - progress);

  // Color scheme per state
  const revealColor =
    state === "done"
      ? "#81C784"   // completed green
      : "#F06292";  // active pink

  return (
    <g>
      {/* Ghost guide — always visible, shows the full stroke shape */}
      <path
        d={stroke.d}
        fill="none"
        stroke={state === "locked" ? "#E8EDF0" : "#DCEEFB"}
        strokeWidth={state === "locked" ? 14 : 18}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: "none" }}
      />

      {/* Revealed ink — grows as child traces */}
      <path
        ref={pathRef}
        d={stroke.d}
        fill="none"
        stroke={revealColor}
        strokeWidth={16}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: dashLen,
          strokeDashoffset: state === "done" ? 0 : dashOffset,
          transition: state === "done" ? "stroke-dashoffset 0.3s ease" : "none",
          filter:
            state === "active" && progress > 0
              ? `drop-shadow(0 0 4px ${revealColor}88)`
              : "none",
          pointerEvents: state === "active" ? "stroke" : "none",
        }}
      />

      {/* Invisible wide hit-area for pointer events (easier to touch) */}
      {state === "active" && (
        <path
          d={stroke.d}
          fill="none"
          stroke="transparent"
          strokeWidth={56}
          strokeLinecap="round"
          style={{ cursor: "crosshair", touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      )}

      {/* Glowing guide dot at current progress point */}
      {state === "active" && (
        <circle
          ref={dotRef}
          r={10}
          fill="#FFC107"
          style={{
            filter: "drop-shadow(0 0 6px #FFC10799)",
            pointerEvents: "none",
            transition: "none",
          }}
        />
      )}

      {/* Start badge (numbered circle at stroke[0]) */}
      {state !== "done" && (
        <StartBadge path={stroke.d} index={0} active={state === "active"} />
      )}
    </g>
  );
}

/** Renders the numbered circle at the start of a stroke */
function StartBadge({
  path: d,
  index,
  active,
}: {
  path: string;
  index: number;
  active: boolean;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // We render an invisible path just to read its start point
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    document.body.appendChild(p);
    const pt = p.getPointAtLength(0);
    setPos({ x: pt.x, y: pt.y });
    document.body.removeChild(p);
  }, [d]);

  if (pos.x === 0 && pos.y === 0) return null;

  return (
    <g style={{ pointerEvents: "none" }}>
      <circle
        cx={pos.x}
        cy={pos.y}
        r={14}
        fill={active ? "#F06292" : "#B0BEC5"}
      />
      <text
        x={pos.x}
        y={pos.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight="bold"
        fill="white"
        fontFamily="Fredoka, sans-serif"
      >
        {index + 1}
      </text>
    </g>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */

export function TamilTracer({
  letter,
  onComplete,
}: {
  letter: TamilLetterData;
  onComplete: () => void;
}) {
  const soundOn = useGameStore((s) => s.soundOn);
  const svgRef = useRef<SVGSVGElement>(null);

  const [currentStroke, setCurrentStroke] = useState(0);
  const [progressArr, setProgressArr] = useState<number[]>(
    () => letter.strokes.map(() => 0)
  );
  const [wobble, setWobble] = useState(false);
  const [allDone, setAllDone] = useState(false);

  // Reset when letter prop changes
  useEffect(() => {
    setCurrentStroke(0);
    setProgressArr(letter.strokes.map(() => 0));
    setAllDone(false);
    narrate(`Let's trace ${letter.phonetic}. Start at the pink number 1.`);
  }, [letter.letter]);

  const handleProgress = useCallback(
    (strokeIdx: number, p: number) => {
      setProgressArr((prev) => {
        const next = [...prev];
        next[strokeIdx] = p;
        return next;
      });
    },
    []
  );

  const handleStrokeComplete = useCallback(
    (strokeIdx: number) => {
      playSuccess(soundOn);
      setProgressArr((prev) => {
        const next = [...prev];
        next[strokeIdx] = 1;
        return next;
      });

      if (strokeIdx + 1 < letter.strokes.length) {
        setCurrentStroke(strokeIdx + 1);
        narrate(
          `Great! Now trace stroke ${strokeIdx + 2}.`
        );
      } else {
        // All strokes done
        setAllDone(true);
        confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 } });
        narrate(
          `Wonderful! You traced ${letter.phonetic} perfectly!`
        );
        setTimeout(onComplete, 800);
      }
    },
    [letter, soundOn, onComplete]
  );

  // Wobble when child taps outside start zone
  const triggerWobble = () => {
    setWobble(true);
    playRetry(soundOn);
    setTimeout(() => setWobble(false), 450);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Letter label */}
      <div className="flex items-center gap-3">
        <span
          className="font-display text-6xl text-slate-700 select-none"
          style={{ fontFamily: "Noto Sans Tamil, sans-serif" }}
        >
          {letter.letter}
        </span>
        <span className="font-body text-slate-400 text-lg">{letter.phonetic}</span>
      </div>

      {/* Stroke counter */}
      <p className="font-body text-sm text-slate-400">
        Stroke {Math.min(currentStroke + 1, letter.strokes.length)} of{" "}
        {letter.strokes.length}
        {allDone ? " — Done! ✅" : ""}
      </p>

      {/* SVG tracing canvas */}
      <div
        className={`relative w-full max-w-xs aspect-square bg-white rounded-[2rem] shadow-chunky
          ${wobble ? "animate-[wiggle_0.4s_ease-in-out]" : ""}`}
        style={
          wobble
            ? { animation: "wiggle 0.4s ease-in-out" }
            : {}
        }
      >
        {/* Inline keyframe — avoids Tailwind plugin requirement */}
        <style>{`
          @keyframes wiggle {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-8px)}
            40%{transform:translateX(8px)}
            60%{transform:translateX(-6px)}
            80%{transform:translateX(6px)}
          }
        `}</style>

        <svg
          ref={svgRef}
          viewBox="0 0 320 320"
          className="w-full h-full"
          aria-label={`Trace the Tamil letter ${letter.phonetic}`}
          style={{ touchAction: "none" }}
        >
          {/* Faint guide grid lines */}
          <line x1="160" y1="20" x2="160" y2="300" stroke="#F0F4F8" strokeWidth={1} />
          <line x1="20" y1="160" x2="300" y2="160" stroke="#F0F4F8" strokeWidth={1} />

          {letter.strokes.map((stroke, i) => {
            const state: StrokeState =
              i < currentStroke
                ? "done"
                : i === currentStroke
                ? "active"
                : "locked";

            return (
              <StrokeLayer
                key={stroke.id}
                stroke={stroke}
                state={state}
                progress={progressArr[i]}
                svgRef={svgRef}
                onProgress={(p) => handleProgress(i, p)}
                onComplete={() => handleStrokeComplete(i)}
                soundOn={soundOn}
              />
            );
          })}
        </svg>
      </div>

      {/* Progress bar for current stroke */}
      {!allDone && (
        <div className="w-full max-w-xs bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-grape rounded-full transition-all duration-150"
            style={{
              width: `${Math.round(progressArr[currentStroke] * 100)}%`,
            }}
          />
        </div>
      )}

      {allDone && (
        <p className="font-display text-grass text-xl text-center">
          ✅ {letter.letter} — beautifully traced!
        </p>
      )}
    </div>
  );
}
