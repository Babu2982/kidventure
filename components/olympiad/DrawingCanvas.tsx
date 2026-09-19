'use client';

// components/olympiad/DrawingCanvas.tsx
// Finger/stylus scratchpad for rough working — built on plain HTML Canvas.
// No native libs (no Skia/react-native-skia) — works on web and Capacitor.

import { useEffect, useRef, useState } from 'react';

interface DrawingCanvasProps {
  height?: number;
}

type Tool = 'pen' | 'eraser';

export default function DrawingCanvas({ height = 220 }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#1e293b');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fef9c3'; // soft yellow — like paper
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    lastPos.current = getPos(e);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !lastPos.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);

    if (tool === 'eraser') {
      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 24;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
    }
    ctx.stroke();
    lastPos.current = pos;
  }

  function endDraw() {
    drawing.current = false;
    lastPos.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#fef9c3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const colors = ['#1e293b', '#dc2626', '#2563eb', '#16a34a'];

  return (
    <div className="flex flex-col gap-2">
      {/* toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rough Work</span>
        <div className="flex gap-1 ml-auto">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool('pen'); }}
              className="w-6 h-6 rounded-full border-2 transition"
              style={{
                background: c,
                borderColor: color === c && tool === 'pen' ? '#0ea5e9' : 'transparent',
                transform: color === c && tool === 'pen' ? 'scale(1.2)' : 'scale(1)',
              }}
              aria-label={`colour ${c}`}
            />
          ))}
          <button
            onClick={() => setTool('eraser')}
            className={`px-2 h-6 rounded-full text-xs font-bold border-2 transition ${
              tool === 'eraser' ? 'bg-slate-200 border-sky-400' : 'bg-white border-slate-200'
            }`}
          >
            Erase
          </button>
          <button
            onClick={clearCanvas}
            className="px-2 h-6 rounded-full text-xs font-bold bg-rose-100 text-rose-600 border border-rose-200"
          >
            Clear
          </button>
        </div>
      </div>

      {/* canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={height}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
        className="w-full rounded-2xl border-2 border-slate-200 cursor-crosshair"
        style={{ height, touchAction: 'none' }}
        aria-label="Rough working area"
      />
    </div>
  );
}
