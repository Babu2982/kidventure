"use client";

/**
 * Lightweight global logger that surfaces messages in an on-screen
 * overlay inside the running app (including the native APK, where we
 * have no console access). Toggle with the 🐞 button added to TopBar.
 *
 * This is a debugging aid — once voice/narration are confirmed working
 * it can be removed along with the TopBar button.
 */

type Listener = (lines: string[]) => void;

const lines: string[] = [];
const listeners = new Set<Listener>();

export function dbg(msg: string) {
  const line = `${new Date().toLocaleTimeString()} ${msg}`;
  lines.unshift(line);
  if (lines.length > 100) lines.pop();
  listeners.forEach((l) => l([...lines]));
  // also log to console for web
  if (typeof console !== "undefined") console.log("[dbg]", msg);
}

export function subscribeDbg(fn: Listener): () => void {
  listeners.add(fn);
  fn([...lines]);
  return () => listeners.delete(fn);
}

export function clearDbg() {
  lines.length = 0;
  listeners.forEach((l) => l([]));
}
