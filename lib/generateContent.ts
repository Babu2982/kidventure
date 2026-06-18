// lib/generateContent.ts
// SERVER-ONLY. Procedurally generates IGCSE-style math word problems and
// logic patterns themed around a child's real-world interests, using
// Google's Gemini API (free tier — no card required, see project notes),
// then writes them into Supabase for later offline-cached reads.
//
// This file must only be called from a Route Handler (see
// app/api/content/generate/route.ts). It is never imported by any
// 'use client' component and never ships inside the Android APK — the
// app only ever READS generated rows via lib/flashcards.ts-style loaders.
//
// Env required (Vercel dashboard):
//   GEMINI_API_KEY            — from aistudio.google.com, free, no card
//   SUPABASE_SERVICE_ROLE_KEY — used indirectly via lib/supabaseAdmin.ts
//   NEXT_PUBLIC_SUPABASE_URL
//
// IMPORTANT: never enable billing on the Google Cloud project tied to this
// key. The Gemini free tier disappears entirely the moment billing is
// turned on for that project — every call becomes paid from then on.

import { supabaseAdmin } from './supabaseAdmin';

export interface GenerateContentOptions {
  /** Child's current adaptive skill ceiling (1–20), drives difficulty. */
  skillCeiling: number;
  /** Real-world interests to theme problems around, e.g. ['badminton','swimming']. */
  themes: string[];
  mode?: 'junior' | 'advanced';
  mathCount?: number; // default 5
  logicCount?: number; // default 5
}

export interface GenerateContentResult {
  mathInserted: number;
  logicInserted: number;
  errors: string[];
}

interface RawMathProblem {
  template: string;
  variables: Record<string, { min: number; max: number }>;
  answer_formula: string;
  theme_tags: string[];
}

interface RawLogicPattern {
  sequence: (number | string)[];
  answer: number | string;
  distractors: (number | string)[];
  theme_tags: string[];
}

// Configurable via env so a future Gemini model-name change never needs a
// code edit — just update GEMINI_MODEL in Vercel.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function buildPrompt(opts: Required<Omit<GenerateContentOptions, 'mode'>> & { mode: string }): string {
  return `Generate children's educational content for an IGCSE-track learning app.
Child's skill level: ${opts.skillCeiling} (1=baseline, higher=harder).
Theme the content around these real-world interests: ${opts.themes.join(', ') || 'general school life'}.
Mode: ${opts.mode}.

Return EXACTLY this JSON shape and nothing else:

{
  "math_problems": [
    {
      "template": "string with {a} and {b} placeholders, themed around the interests, age-appropriate, one or two sentences",
      "variables": { "a": { "min": number, "max": number }, "b": { "min": number, "max": number } },
      "answer_formula": "a simple arithmetic expression using a and b, e.g. \\"a*b\\" or \\"a+b\\"",
      "theme_tags": ["lowercase-tag", "..."]
    }
  ],
  "logic_patterns": [
    {
      "sequence": [number_or_string, number_or_string, "..."],
      "answer": number_or_string,
      "distractors": [number_or_string, number_or_string, number_or_string],
      "theme_tags": ["lowercase-tag", "..."]
    }
  ]
}

Generate exactly ${opts.mathCount} math_problems and exactly ${opts.logicCount} logic_patterns.
Keep language simple, encouraging, and appropriate for a child aged 6-10. Never include violent, scary, or adult themes.`;
}

function stripFences(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}

function isValidMathProblem(p: any): p is RawMathProblem {
  return (
    p &&
    typeof p.template === 'string' &&
    p.template.length > 0 &&
    typeof p.variables === 'object' &&
    typeof p.answer_formula === 'string' &&
    Array.isArray(p.theme_tags)
  );
}

function isValidLogicPattern(p: any): p is RawLogicPattern {
  return (
    p &&
    Array.isArray(p.sequence) &&
    p.sequence.length > 0 &&
    p.answer !== undefined &&
    Array.isArray(p.distractors) &&
    Array.isArray(p.theme_tags)
  );
}

/**
 * Calls the Gemini API (free tier) to procedurally generate themed math +
 * logic content, then writes valid rows into Supabase (source: 'generated').
 * Never throws — collects problems into `errors` so a bad generation never
 * crashes the route.
 */
export async function generateThemedContent(
  opts: GenerateContentOptions,
): Promise<GenerateContentResult> {
  const errors: string[] = [];
  const result: GenerateContentResult = { mathInserted: 0, logicInserted: 0, errors };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    errors.push('GEMINI_API_KEY is not set — skipping generation.');
    return result;
  }
  if (!supabaseAdmin) {
    errors.push('Supabase admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL.');
    return result;
  }

  const mode = opts.mode ?? 'advanced';
  const mathCount = opts.mathCount ?? 5;
  const logicCount = opts.logicCount ?? 5;
  const skillCeiling = Math.min(20, Math.max(1, Math.round(opts.skillCeiling)));

  let raw: { math_problems?: unknown[]; logic_patterns?: unknown[] };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildPrompt({ skillCeiling, themes: opts.themes, mode, mathCount, logicCount }) }],
            },
          ],
          generationConfig: {
            // Forces valid JSON back — far more reliable than prompting alone.
            responseMimeType: 'application/json',
            temperature: 0.9,
          },
        }),
      },
    );

    if (!res.ok) {
      errors.push(`Gemini API returned ${res.status}: ${await res.text()}`);
      return result;
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];

    if (!candidate) {
      errors.push('Gemini API returned no candidates (likely blocked by safety filters).');
      return result;
    }
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      errors.push(`Gemini stopped early: ${candidate.finishReason}`);
      // Some early-stop reasons (e.g. MAX_TOKENS) may still have partial usable text below;
      // continue rather than returning, but the parse step will catch genuinely bad output.
    }

    const text: string | undefined = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      errors.push('Gemini API response had no text content.');
      return result;
    }

    raw = JSON.parse(stripFences(text));
  } catch (e) {
    errors.push(`Generation/parsing failed: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }

  // --- math_problem_templates ------------------------------------------
  const mathRows = (raw.math_problems ?? [])
    .filter(isValidMathProblem)
    .map((p) => ({
      topic: 'olympiad',
      mode,
      skill_level: skillCeiling,
      template: p.template,
      variables: p.variables,
      answer_formula: p.answer_formula,
      theme_tags: p.theme_tags,
      source: 'generated' as const,
    }));

  if (mathRows.length) {
    const { error, count } = await supabaseAdmin
      .from('math_problem_templates')
      .insert(mathRows, { count: 'exact' });
    if (error) errors.push(`math insert failed: ${error.message}`);
    else result.mathInserted = count ?? mathRows.length;
  }

  // --- logic_patterns ------------------------------------------------------
  const logicRows = (raw.logic_patterns ?? [])
    .filter(isValidLogicPattern)
    .map((p) => ({
      pattern_type: 'olympiad',
      mode,
      skill_level: skillCeiling,
      sequence: p.sequence,
      answer: p.answer,
      distractors: p.distractors,
      theme_tags: p.theme_tags,
      source: 'generated' as const,
    }));

  if (logicRows.length) {
    const { error, count } = await supabaseAdmin
      .from('logic_patterns')
      .insert(logicRows, { count: 'exact' });
    if (error) errors.push(`logic insert failed: ${error.message}`);
    else result.logicInserted = count ?? logicRows.length;
  }

  return result;
}
