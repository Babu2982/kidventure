"use client";

import { useEffect, useState } from "react";
import { subscribeDbg, clearDbg } from "@/lib/dbg";

/** Floating 🐞 button + collapsible log panel, visible in the running app. */
export function DebugOverlay() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => subscribeDbg(setLines), []);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle debug log"
        className="fixed bottom-3 right-3 z-[100] bg-slate-800 text-white rounded-full w-12 h-12 text-xl shadow-lg opacity-80"
      >
        🐞
      </button>
      {open && (
        <div className="fixed inset-x-2 bottom-20 z-[100] bg-slate-900/95 rounded-2xl p-3 max-h-[50vh] overflow-y-auto shadow-2xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-green-400 font-mono text-xs">Debug log ({lines.length})</span>
            <button onClick={clearDbg} className="text-red-400 text-xs underline">clear</button>
          </div>
          {lines.length === 0 ? (
            <p className="text-slate-500 text-xs font-mono">No logs yet — interact with the app</p>
          ) : (
            lines.map((l, i) => (
              <p key={i} className="text-green-300 font-mono text-[10px] leading-relaxed break-all">{l}</p>
            ))
          )}
        </div>
      )}
    </>
  );
}
