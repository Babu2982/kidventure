"use client";

/**
 * Stroke-order skeletons for guided letter tracing.
 *
 * Each letter is an ordered array of STROKES; each stroke is a
 * polyline of [x, y] points in a normalized 0–1 square (x right,
 * y down). The order encodes the teaching sequence: Devanagari
 * letters finish with the right vertical bar and the shirorekha
 * (headline); Kannada letters are drawn as continuous rounded curves.
 *
 * These are simplified educational skeletons, not typographic
 * outlines — guided mode renders the skeleton itself, so what the
 * child follows always matches the waypoints exactly. Letters
 * without an entry here automatically use free-trace mode against
 * the real font glyph.
 *
 * To extend coverage: add an entry. Nothing else changes.
 */

export type Stroke = Array<[number, number]>;
export type LetterStrokes = Stroke[];

export const STROKE_DATA: Record<string, LetterStrokes> = {
  /* ---------------- Devanagari (Hindi) ---------------- */

  // अ — 1: left "3" curve · 2: middle connector · 3: vertical bar · 4: headline
  "अ": [
    [
      [0.46, 0.34], [0.34, 0.31], [0.25, 0.38], [0.27, 0.46], [0.36, 0.5],
      [0.27, 0.55], [0.25, 0.64], [0.34, 0.72], [0.46, 0.7],
    ],
    [[0.36, 0.5], [0.62, 0.5]],
    [[0.62, 0.28], [0.62, 0.82]],
    [[0.18, 0.28], [0.84, 0.28]],
  ],

  // आ — अ plus the trailing vertical bar
  "आ": [
    [
      [0.4, 0.34], [0.28, 0.31], [0.2, 0.38], [0.22, 0.46], [0.3, 0.5],
      [0.22, 0.55], [0.2, 0.64], [0.28, 0.72], [0.4, 0.7],
    ],
    [[0.3, 0.5], [0.54, 0.5]],
    [[0.54, 0.28], [0.54, 0.82]],
    [[0.76, 0.28], [0.76, 0.82]],
    [[0.14, 0.28], [0.86, 0.28]],
  ],

  // इ — top hook curve · descending tail curl · headline
  "इ": [
    [[0.34, 0.36], [0.42, 0.3], [0.54, 0.32], [0.58, 0.4], [0.52, 0.47], [0.42, 0.48]],
    [[0.42, 0.48], [0.54, 0.54], [0.58, 0.64], [0.5, 0.74], [0.38, 0.76], [0.3, 0.7]],
    [[0.2, 0.28], [0.8, 0.28]],
  ],

  // क — left loop · vertical bar · cross hook · headline
  "क": [
    [[0.44, 0.42], [0.34, 0.38], [0.24, 0.44], [0.24, 0.56], [0.34, 0.62], [0.44, 0.58]],
    [[0.6, 0.28], [0.6, 0.82]],
    [[0.44, 0.5], [0.6, 0.5], [0.72, 0.44], [0.74, 0.56], [0.66, 0.62]],
    [[0.16, 0.28], [0.84, 0.28]],
  ],

  // ग — descending hook · vertical bar · headline
  "ग": [
    [[0.34, 0.28], [0.34, 0.6], [0.38, 0.72], [0.48, 0.78], [0.58, 0.74]],
    [[0.62, 0.28], [0.62, 0.82]],
    [[0.2, 0.28], [0.82, 0.28]],
  ],

  /* ---------------- Kannada ---------------- */

  // ಅ — big rounded body with opening curl and tail
  "ಅ": [
    [
      [0.3, 0.4], [0.4, 0.3], [0.55, 0.28], [0.68, 0.36], [0.7, 0.5],
      [0.62, 0.64], [0.48, 0.7], [0.34, 0.64], [0.3, 0.52], [0.38, 0.46], [0.46, 0.5],
    ],
    [[0.62, 0.64], [0.7, 0.74], [0.8, 0.76]],
  ],

  // ಆ — ಅ body plus the lengthening tail stroke
  "ಆ": [
    [
      [0.26, 0.4], [0.36, 0.3], [0.5, 0.28], [0.62, 0.36], [0.64, 0.5],
      [0.56, 0.64], [0.42, 0.7], [0.3, 0.64], [0.26, 0.52], [0.34, 0.46], [0.42, 0.5],
    ],
    [[0.56, 0.64], [0.64, 0.74], [0.74, 0.76]],
    [[0.74, 0.4], [0.82, 0.5], [0.82, 0.66], [0.74, 0.76]],
  ],

  // ಇ — wave crest then under-curl
  "ಇ": [
    [[0.24, 0.42], [0.32, 0.32], [0.44, 0.3], [0.54, 0.36], [0.56, 0.46], [0.48, 0.52]],
    [[0.48, 0.52], [0.6, 0.56], [0.7, 0.5], [0.74, 0.38]],
    [[0.74, 0.38], [0.78, 0.54], [0.7, 0.68], [0.54, 0.74], [0.38, 0.7], [0.3, 0.6]],
  ],

  // ಕ — crossbar crest · body loop · tail
  "ಕ": [
    [[0.28, 0.34], [0.44, 0.28], [0.6, 0.32]],
    [
      [0.44, 0.3], [0.44, 0.5], [0.36, 0.6], [0.42, 0.7],
      [0.54, 0.72], [0.62, 0.64], [0.6, 0.54], [0.5, 0.52],
    ],
    [[0.62, 0.64], [0.72, 0.72], [0.8, 0.7]],
  ],

  // ಗ — open arch with tail
  "ಗ": [
    [[0.3, 0.66], [0.28, 0.46], [0.38, 0.32], [0.54, 0.28], [0.66, 0.36], [0.68, 0.5]],
    [[0.68, 0.5], [0.68, 0.66], [0.76, 0.74], [0.84, 0.72]],
  ],
};

export function hasStrokeData(letter: string): boolean {
  return letter in STROKE_DATA;
}

/* ---------------- geometry helpers ---------------- */

/** Resample a polyline into evenly spaced waypoints (normalized space). */
export function resample(stroke: Stroke, spacing = 0.045): Stroke {
  if (stroke.length < 2) return stroke;
  const out: Stroke = [stroke[0]];
  let prev = stroke[0];
  let carried = 0;
  for (let i = 1; i < stroke.length; i++) {
    let [x1, y1] = prev;
    const [x2, y2] = stroke[i];
    let seg = Math.hypot(x2 - x1, y2 - y1);
    while (carried + seg >= spacing) {
      const t = (spacing - carried) / seg;
      const nx = x1 + (x2 - x1) * t;
      const ny = y1 + (y2 - y1) * t;
      out.push([nx, ny]);
      x1 = nx; y1 = ny;
      seg = Math.hypot(x2 - x1, y2 - y1);
      carried = 0;
    }
    carried += seg;
    prev = stroke[i];
  }
  const last = stroke[stroke.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > spacing * 0.4) out.push(last);
  return out;
}
