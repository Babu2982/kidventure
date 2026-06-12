"use client";

/**
 * Tiny synthesized sound engine built on the Web Audio API.
 * No audio files required — every effect is generated in code,
 * so the app ships with working sound out of the box. Swap any
 * function body for an HTMLAudioElement later to use real assets.
 */

let ctx: AudioContext | null = null;
let unlockBound = false;

/**
 * Android WebView (and mobile Safari) suspend AudioContext until a
 * user gesture. We bind a one-time listener that resumes the context
 * on the very first touch so the first game sound is never swallowed.
 */
function bindUnlock() {
  if (unlockBound || typeof window === "undefined") return;
  unlockBound = true;
  const unlock = () => {
    ctx?.resume();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
}
let musicNodes: { osc: OscillatorNode; gain: GainNode; timer: number } | null =
  null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    bindUnlock();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.18
) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ac.currentTime + start);
  gain.gain.linearRampToValueAtTime(volume, ac.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    ac.currentTime + start + duration
  );
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

/** Cheerful rising arpeggio — correct answer. */
export function playSuccess(enabled: boolean) {
  if (!enabled) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    tone(f, i * 0.09, 0.25, "triangle", 0.2)
  );
}

/** Soft, gentle "try again" — never harsh. */
export function playRetry(enabled: boolean) {
  if (!enabled) return;
  tone(330, 0, 0.18, "sine", 0.12);
  tone(294, 0.16, 0.28, "sine", 0.12);
}

/** Light pop for taps. */
export function playTap(enabled: boolean) {
  if (!enabled) return;
  tone(880, 0, 0.07, "triangle", 0.1);
}

/** Big fanfare when a sticker is earned. */
export function playFanfare(enabled: boolean) {
  if (!enabled) return;
  [523, 523, 659, 784, 1046, 784, 1046].forEach((f, i) =>
    tone(f, i * 0.11, 0.22, "square", 0.07)
  );
}

/** Gentle looping background pad. Returns nothing; control via stopMusic. */
export function startMusic() {
  const ac = getCtx();
  if (!ac || musicNodes) return;
  const gain = ac.createGain();
  gain.gain.value = 0.04;
  gain.connect(ac.destination);
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.connect(gain);
  osc.start();

  const melody = [392, 440, 523, 440, 392, 330, 392, 523];
  let i = 0;
  const step = () => {
    osc.frequency.setTargetAtTime(melody[i % melody.length], ac.currentTime, 0.05);
    i++;
  };
  step();
  const timer = window.setInterval(step, 900);
  musicNodes = { osc, gain, timer };
}

export function stopMusic() {
  if (!musicNodes) return;
  clearInterval(musicNodes.timer);
  try {
    musicNodes.gain.gain.linearRampToValueAtTime(0, (ctx?.currentTime ?? 0) + 0.4);
    musicNodes.osc.stop((ctx?.currentTime ?? 0) + 0.5);
  } catch {}
  musicNodes = null;
}
