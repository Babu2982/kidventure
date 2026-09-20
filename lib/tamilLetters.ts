/**
 * tamilLetters.ts — SVG path data for Tamil Uyir Ezhuthukal (vowels).
 *
 * All paths authored in a 320×320 viewBox.
 * Used by TamilTracer.tsx (stroke-dashoffset reveal technique).
 *
 * Tamil vowels are primarily cursive curves — each letter is broken into
 * 1–3 strokes matching the natural pen-lift points taught in Tamil schools.
 *
 * Stroke order follows the standard taught in Tamil Nadu primary schools:
 *  - Start from the top or the head of the curve
 *  - Follow the natural clockwise/counter-clockwise flow of the letter
 *  - Marks (pulli ் , length marks) are separate final strokes
 *
 * To extend: add entries to TAMIL_LETTERS. Nothing else changes.
 * TamilTracer.tsx reads traceLetters[] from story data and looks up entries here.
 */

import type { TamilLetterData } from "@/components/TamilTracer";

export const TAMIL_LETTERS: Record<string, TamilLetterData> = {

  /* ── அ (a) — 2 strokes ───────────────────────────────────────
     Stroke 1: The main rounded body — a top-open loop that sweeps
               right, curves down-left, and curls back up.
     Stroke 2: The inner hook / tail that descends and curls right.
  ─────────────────────────────────────────────────────────────── */
  "அ": {
    letter: "அ",
    phonetic: "அ (a)",
    strokes: [
      {
        id: "a-s1",
        label: "Main body",
        d: "M 155 70 C 195 65, 235 90, 230 135 C 225 175, 190 200, 155 198 C 120 196, 90 175, 88 145 C 86 115, 110 95, 140 95 C 155 95, 165 105, 160 120",
      },
      {
        id: "a-s2",
        label: "Inner tail",
        d: "M 160 120 C 158 145, 148 175, 152 205 C 156 230, 180 245, 210 240",
      },
    ],
  },

  /* ── ஆ (aa) — 3 strokes ──────────────────────────────────────
     அ body (stroke 1 + 2) plus the lengthening vertical bar (stroke 3).
  ─────────────────────────────────────────────────────────────── */
  "ஆ": {
    letter: "ஆ",
    phonetic: "ஆ (aa)",
    strokes: [
      {
        id: "aa-s1",
        label: "Main body",
        d: "M 130 70 C 165 65, 205 88, 200 130 C 195 168, 162 192, 130 190 C 98 188, 74 168, 72 140 C 70 112, 92 94, 118 94 C 132 94, 140 103, 136 118",
      },
      {
        id: "aa-s2",
        label: "Inner tail",
        d: "M 136 118 C 134 142, 124 170, 128 200 C 130 220, 148 232, 168 228",
      },
      {
        id: "aa-s3",
        label: "Length bar",
        d: "M 230 68 C 230 68, 228 130, 226 185 C 224 220, 228 238, 232 245",
      },
    ],
  },

  /* ── இ (i) — 2 strokes ───────────────────────────────────────
     Stroke 1: The wave-like crest curving left-to-right.
     Stroke 2: The under-body bowl that sweeps down and back up.
  ─────────────────────────────────────────────────────────────── */
  "இ": {
    letter: "இ",
    phonetic: "இ (i)",
    strokes: [
      {
        id: "i-s1",
        label: "Top wave",
        d: "M 85 100 C 95 75, 130 68, 160 78 C 185 86, 200 108, 195 130 C 190 150, 170 162, 150 158",
      },
      {
        id: "i-s2",
        label: "Lower bowl",
        d: "M 150 158 C 175 156, 220 168, 228 200 C 234 225, 212 248, 185 248 C 158 248, 136 230, 128 208 C 120 186, 130 165, 150 158",
      },
    ],
  },

  /* ── ஈ (ii) — 3 strokes ──────────────────────────────────────
     இ body (strokes 1+2) plus the length mark loop above.
  ─────────────────────────────────────────────────────────────── */
  "ஈ": {
    letter: "ஈ",
    phonetic: "ஈ (ii)",
    strokes: [
      {
        id: "ii-s1",
        label: "Top wave",
        d: "M 80 110 C 90 85, 122 76, 150 86 C 174 94, 188 114, 183 135 C 178 155, 160 165, 140 162",
      },
      {
        id: "ii-s2",
        label: "Lower bowl",
        d: "M 140 162 C 164 160, 208 172, 216 202 C 222 226, 200 248, 174 248 C 148 248, 126 230, 118 208 C 110 186, 120 166, 140 162",
      },
      {
        id: "ii-s3",
        label: "Length loop",
        d: "M 220 78 C 235 65, 255 70, 258 85 C 261 100, 248 112, 232 108 C 218 104, 212 90, 220 78",
      },
    ],
  },

  /* ── உ (u) — 2 strokes ───────────────────────────────────────
     Stroke 1: Arch from top-left sweeping right-down.
     Stroke 2: Spiral inner bowl closing back to center.
  ─────────────────────────────────────────────────────────────── */
  "உ": {
    letter: "உ",
    phonetic: "உ (u)",
    strokes: [
      {
        id: "u-s1",
        label: "Top arch",
        d: "M 100 85 C 115 62, 155 58, 185 75 C 210 90, 220 118, 215 145",
      },
      {
        id: "u-s2",
        label: "Inner spiral",
        d: "M 215 145 C 212 175, 195 202, 168 212 C 142 222, 112 210, 100 188 C 88 166, 96 140, 118 128 C 136 118, 158 122, 165 140 C 170 153, 158 165, 144 160",
      },
    ],
  },

  /* ── ஊ (uu) — 3 strokes ──────────────────────────────────────
     உ body (strokes 1+2) plus the lengthening tail sweep.
  ─────────────────────────────────────────────────────────────── */
  "ஊ": {
    letter: "ஊ",
    phonetic: "ஊ (uu)",
    strokes: [
      {
        id: "uu-s1",
        label: "Top arch",
        d: "M 88 88 C 102 64, 140 58, 168 74 C 192 88, 202 115, 196 142",
      },
      {
        id: "uu-s2",
        label: "Inner spiral",
        d: "M 196 142 C 192 170, 176 196, 150 206 C 124 216, 96 205, 84 184 C 72 163, 80 138, 100 126 C 118 116, 138 120, 146 136 C 151 148, 140 160, 126 155",
      },
      {
        id: "uu-s3",
        label: "Length tail",
        d: "M 218 148 C 238 152, 258 145, 264 128 C 270 110, 254 94, 235 98",
      },
    ],
  },

  /* ── எ (e) — 2 strokes ───────────────────────────────────────
     Stroke 1: Top horizontal bar curving down.
     Stroke 2: Open C-body sweeping down, around and up-right.
  ─────────────────────────────────────────────────────────────── */
  "எ": {
    letter: "எ",
    phonetic: "எ (e)",
    strokes: [
      {
        id: "e-s1",
        label: "Top bar",
        d: "M 90 82 C 130 72, 195 75, 220 95",
      },
      {
        id: "e-s2",
        label: "C-body",
        d: "M 155 78 C 155 108, 148 140, 135 165 C 118 196, 92 210, 80 238 C 74 252, 82 265, 100 265 C 135 265, 185 250, 218 228",
      },
    ],
  },

  /* ── ஏ (ee) — 3 strokes ──────────────────────────────────────
     எ body (strokes 1+2) plus the length tail to the right.
  ─────────────────────────────────────────────────────────────── */
  "ஏ": {
    letter: "ஏ",
    phonetic: "ஏ (ae)",
    strokes: [
      {
        id: "ee-s1",
        label: "Top bar",
        d: "M 80 82 C 118 70, 178 72, 205 92",
      },
      {
        id: "ee-s2",
        label: "C-body",
        d: "M 142 75 C 142 104, 136 136, 122 160 C 106 188, 80 202, 68 228 C 62 242, 70 255, 88 255 C 122 255, 168 240, 200 218",
      },
      {
        id: "ee-s3",
        label: "Length tail",
        d: "M 200 218 C 228 202, 248 196, 255 178 C 260 162, 248 148, 232 152",
      },
    ],
  },

  /* ── ஐ (ai) — 2 strokes ──────────────────────────────────────
     Diphthong அ+இ shape. Two overlapping curves.
  ─────────────────────────────────────────────────────────────── */
  "ஐ": {
    letter: "ஐ",
    phonetic: "ஐ (ai)",
    strokes: [
      {
        id: "ai-s1",
        label: "Left curve",
        d: "M 108 72 C 85 72, 68 95, 70 122 C 72 148, 92 165, 118 165 C 138 165, 152 152, 152 135 C 152 118, 138 108, 122 112 C 112 116, 108 128, 116 138",
      },
      {
        id: "ai-s2",
        label: "Right curve",
        d: "M 175 72 C 152 72, 135 95, 137 122 C 139 148, 158 165, 184 165 C 204 165, 218 152, 218 135 C 218 118, 204 108, 188 112 C 178 116, 174 128, 182 138",
      },
    ],
  },

  /* ── ஒ (o) — 2 strokes ───────────────────────────────────────
     Stroke 1: Large loop body.
     Stroke 2: The kombu (curving right extension).
  ─────────────────────────────────────────────────────────────── */
  "ஒ": {
    letter: "ஒ",
    phonetic: "ஒ (o)",
    strokes: [
      {
        id: "o-s1",
        label: "Loop body",
        d: "M 155 68 C 120 65, 88 88, 82 122 C 76 155, 95 185, 128 198 C 160 210, 198 198, 215 170 C 230 144, 222 108, 200 90 C 182 74, 165 68, 155 68 C 148 68, 142 72, 145 80 C 148 90, 162 92, 165 108",
      },
      {
        id: "o-s2",
        label: "Kombu",
        d: "M 215 170 C 235 165, 255 172, 262 188 C 268 204, 258 222, 240 222",
      },
    ],
  },

  /* ── ஓ (oo) — 3 strokes ──────────────────────────────────────
     ஒ body (strokes 1+2) plus the length mark loop above-right.
  ─────────────────────────────────────────────────────────────── */
  "ஓ": {
    letter: "ஓ",
    phonetic: "ஓ (oo)",
    strokes: [
      {
        id: "oo-s1",
        label: "Loop body",
        d: "M 140 78 C 106 75, 76 96, 70 128 C 64 160, 82 190, 114 202 C 146 214, 182 202, 198 175 C 214 148, 206 114, 184 96 C 166 80, 148 78, 140 78 C 133 78, 128 82, 131 90 C 134 100, 148 102, 150 116",
      },
      {
        id: "oo-s2",
        label: "Kombu",
        d: "M 198 175 C 218 170, 238 177, 245 193 C 251 208, 241 225, 224 226",
      },
      {
        id: "oo-s3",
        label: "Length loop",
        d: "M 220 62 C 238 50, 260 56, 264 72 C 268 88, 252 100, 236 96 C 220 92, 215 78, 224 68",
      },
    ],
  },

  /* ── ஔ (au) — 3 strokes ──────────────────────────────────────
     ஒ body (strokes 1+2) plus the double top mark (strokes 2+3).
  ─────────────────────────────────────────────────────────────── */
  "ஔ": {
    letter: "ஔ",
    phonetic: "ஔ (au)",
    strokes: [
      {
        id: "au-s1",
        label: "Loop body",
        d: "M 128 80 C 96 77, 68 98, 62 128 C 56 158, 74 186, 105 198 C 136 210, 170 198, 185 172 C 200 146, 193 114, 172 97 C 154 82, 136 80, 128 80 C 121 80, 116 84, 119 92 C 122 102, 135 104, 137 118",
      },
      {
        id: "au-s2",
        label: "Kombu",
        d: "M 185 172 C 204 167, 222 174, 228 190 C 234 204, 224 220, 208 220",
      },
      {
        id: "au-s3",
        label: "Double mark",
        d: "M 245 78 C 256 62, 274 62, 278 78 C 282 93, 270 105, 258 102 C 246 100, 240 85, 248 76 M 258 102 C 258 118, 260 132, 264 145",
      },
    ],
  },
};

/**
 * Look up a Tamil letter's tracing data by its Unicode character.
 * Returns undefined if the letter has no data yet.
 */
export function getTamilLetter(letter: string): TamilLetterData | undefined {
  return TAMIL_LETTERS[letter];
}

/**
 * All 12 Tamil vowels in canonical order.
 * Useful for building a vowel-sequence practice session.
 */
export const TAMIL_VOWEL_ORDER: string[] = [
  "அ", "ஆ", "இ", "ஈ", "உ", "ஊ", "எ", "ஏ", "ஐ", "ஒ", "ஓ", "ஔ",
];
