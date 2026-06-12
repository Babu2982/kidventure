"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ClientGate, TopBar, BigButton } from "@/components/ui";
import { RewardOverlay } from "@/components/RewardOverlay";
import { useAppStore, useLearningMode, type Sticker } from "@/store/useAppStore";
import { playTap } from "@/lib/sounds";
import { AthleteDiary } from "@/components/AthleteDiary";

/**
 * Art Cove: free-draw canvas with chunky brushes and crayon colors.
 * Works with mouse and touch via Pointer Events. "Done!" awards a
 * sticker once the child has actually drawn something.
 */

const COLORS = ["#F06292", "#FF8A65", "#FFD54F", "#81C784", "#4FC3F7", "#9575CD", "#5D4037", "#37474F"];
const SIZES = [6, 14, 26];

export default function ArtPage() {
  return (
    <ClientGate>
      <DrawingCanvas />
    </ClientGate>
  );
}

function DrawingCanvas() {
  const router = useRouter();
  const { soundOn, awardStarAndSticker } = useAppStore();
  const mode = useLearningMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [reward, setReward] = useState<Sticker | null>(null);

  // Size the canvas to its CSS box at device pixel ratio for crisp lines.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      // Preserve existing drawing on resize
      const prev = document.createElement("canvas");
      prev.width = canvas.width;
      prev.height = canvas.height;
      prev.getContext("2d")?.drawImage(canvas, 0, 0);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (prev.width) ctx.drawImage(prev, 0, 0, rect.width, rect.height);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1); // dot on tap
    ctx.stroke();
    setHasDrawn(true);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => (drawing.current = false);

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    playTap(soundOn);
  };

  return (
    <main className="min-h-dvh bg-sky-scene flex flex-col">
      <TopBar title="Art Cove" emoji="🎨" />

      <div className="flex-1 flex flex-col lg:flex-row lg:items-stretch items-center justify-center gap-4 px-4 pb-6 w-full max-w-6xl mx-auto">
        <div className="flex-1 flex flex-col items-center gap-4 w-full">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          aria-label="Drawing canvas"
          className="bg-white rounded-[2rem] shadow-chunky w-full max-w-2xl flex-1 min-h-[300px] touch-none cursor-crosshair"
        />

        {/* Crayon box */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); playTap(soundOn); }}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              className={`w-11 h-11 rounded-full shadow-chunkySm transition
                ${color === c ? "scale-125 ring-4 ring-white" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <span className="w-2" />
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => { setSize(s); playTap(soundOn); }}
              aria-label={`Brush size ${s}`}
              aria-pressed={size === s}
              className={`bg-white rounded-full shadow-chunkySm flex items-center justify-center w-11 h-11
                ${size === s ? "ring-4 ring-sun" : ""}`}
            >
              <span
                className="rounded-full bg-slate-700"
                style={{ width: s * 0.8, height: s * 0.8 }}
              />
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <BigButton color="bg-white" className="!text-xl" onClick={clear}>
            🧽 Clear
          </BigButton>
          <BigButton
            color="bg-grass text-white"
            className="!text-xl"
            disabled={!hasDrawn}
            onClick={() => setReward(awardStarAndSticker("art"))}
          >
            ✅ Done!
          </BigButton>
        </div>
        </div>

        {/* Advanced mode only: Athlete's Diary beside the drawing board */}
        {mode === "advanced" && <AthleteDiary />}
      </div>

      <RewardOverlay
        sticker={reward}
        onClose={() => router.push("/dashboard")}
        onPlayAgain={() => { setReward(null); clear(); }}
      />
    </main>
  );
}
