// lib/generateContent.ts
// SERVER-ONLY. Procedurally generates themed content for ALL FOUR content
// tables (math, logic, flashcards, stories) using Google's free Gemini API,
// then writes valid rows into Supabase. One call now fills the whole
// pipeline instead of just two tables.
//
// Called only from app/api/content/generate/route.ts (Vercel server only —
// never reachable from, or bundled into, the Android APK).
//
// Env required (Vercel dashboard):
//   GEMINI_API_KEY            — free, from aistudio.google.com
//   SUPABASE_SERVICE_ROLE_KEY
//   NEXT_PUBLIC_SUPABASE_URL
//
// IMPORTANT: never enable billing on the Google Cloud project tied to this
// key — the Gemini free tier disappears entirely the moment billing is
// turned on for that project.

import { supabaseAdmin } from './supabaseAdmin';

export interface GenerateContentOptions {
  /** Child's current adaptive skill ceiling (1–20), drives difficulty. */
  skillCeiling: number;
  /** Real-world interests to theme content around, e.g. ['badminton','swimming']. */
  themes: string[];
  mode?: 'junior' | 'advanced';
  mathCount?: number; // default 5
  logicCount?: number; // default 5
  flashcardCount?: number; // default 6
  storyCount?: number; // default 1 (stories are longer; keep batches small)
}

export interface GenerateContentResult {
  mathInserted: number;
  logicInserted: number;
  flashcardsInserted: number;
  storiesInserted: number;
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

interface RawFlashcard {
  deck: string;
  concept: string;
  detail: string;
  emoji?: string;
  theme_tags: string[];
}

interface RawStory {
  title: string;
  body: string;
  mind_map_prompt: string;
  comprehension_question: string;
  answer_keywords: string[];
  theme_tags: string[];
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function buildPrompt(opts: {
  skillCeiling: number;
  themes: string[];
  mode: string;
  mathCount: number;
  logicCount: number;
  flashcardCount: number;
  storyCount: number;
}): string {
  return `Generate children's educational content for an IGCSE-track learning app.
Child's skill level: ${opts.skillCeiling} (1=baseline, higher=harder).
Theme the content around these real-world interests where natural: ${opts.themes.join(', ') || 'general school life'}.
Mode: ${opts.mode}.

Return EXACTLY this JSON shape and nothing else:

{
  "math_problems": [
    {
      "template": "string with {a} and {b} placeholders, themed, age-appropriate, one or two sentences",
      "variables": { "a": { "min": number, "max": number }, "b": { "min": number, "max": number } },
      "answer_formula": "simple arithmetic expression using a and b, e.g. \\"a*b\\" or \\"a+b\\"",
      "theme_tags": ["lowercase-tag"]
    }
  ],
  "logic_patterns": [
    {
      "sequence": [number_or_string, "..."],
      "answer": number_or_string,
      "distractors": [number_or_string, number_or_string, number_or_string],
      "theme_tags": ["lowercase-tag"]
    }
  ],
  "flashcards": [
    {
      "deck": "one short lowercase category name, e.g. geography, science, multiplication, vocabulary",
      "concept": "short prompt shown on the front of the card, a few words",
      "detail": "the answer shown on the back, a few words",
      "emoji": "one single emoji that visually represents the concept",
      "theme_tags": ["lowercase-tag"]
    }
  ],
  "stories": [
    {
      "title": "short story title",
      "body": "a simple, encouraging 80-150 word story appropriate for a 6-10 year old, optionally touching the themes",
      "mind_map_prompt": "one sentence prompting the child to draw or map the core idea of the story",
      "comprehension_question": "one simple spoken question about the story's content",
      "answer_keywords": ["lowercase-keyword", "..."],
      "theme_tags": ["lowercase-tag"]
    }
  ]
}

Generate exactly ${opts.mathCount} math_problems, ${opts.logicCount} logic_patterns, ${opts.flashcardCount} flashcards, and ${opts.storyCount} stories.
Keep all language simple, encouraging, and age-appropriate for 6-10 year olds. Never include violent, scary, sad, or adult themes. Stories must have a positive, gentle tone.`;
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

function isValidFlashcard(p: any): p is RawFlashcard {
  return (
    p &&
    typeof p.deck === 'string' &&
    p.deck.length > 0 &&
    typeof p.concept === 'string' &&
    p.concept.length > 0 &&
    typeof p.detail === 'string' &&
    Array.isArray(p.theme_tags)
  );
}

function isValidStory(p: any): p is RawStory {
  return (
    p &&
    typeof p.title === 'string' &&
    p.title.length > 0 &&
    typeof p.body === 'string' &&
    p.body.length > 20 &&
    typeof p.comprehension_question === 'string' &&
    Array.isArray(p.answer_keywords) &&
    Array.isArray(p.theme_tags)
  );
}

/**
 * Calls the Gemini API (free tier) to procedurally generate themed content
 * across all four content tables, then writes valid rows into Supabase
 * (source: 'generated'). Never throws — problems are collected into
 * `errors` so one bad batch never crashes the route or blocks the others.
 */
export async function generateThemedContent(
  opts: GenerateContentOptions,
): Promise<GenerateContentResult> {
  const errors: string[] = [];
  const result: GenerateContentResult = {
    mathInserted: 0,
    logicInserted: 0,
    flashcardsInserted: 0,
    storiesInserted: 0,
    errors,
  };

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
  const flashcardCount = opts.flashcardCount ?? 6;
  const storyCount = opts.storyCount ?? 1;
  const skillCeiling = Math.min(20, Math.max(1, Math.round(opts.skillCeiling)));

  let raw: {
    math_problems?: unknown[];
    logic_patterns?: unknown[];
    flashcards?: unknown[];
    stories?: unknown[];
  };

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
              parts: [
                {
                  text: buildPrompt({
                    skillCeiling,
                    themes: opts.themes,
                    mode,
                    mathCount,
                    logicCount,
                    flashcardCount,
                    storyCount,
                  }),
                },
              ],
            },
          ],
          generationConfig: {
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
    const { error, count } = await supabaseAdmin.from('math_problem_templates').insert(mathRows, { count: 'exact' });
    if (error) errors.push(`math insert failed: ${error.message}`);
    else result.mathInserted = count ?? mathRows.length;
  }

  // --- logic_patterns ----------------------------------------------------
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
    const { error, count } = await supabaseAdmin.from('logic_patterns').insert(logicRows, { count: 'exact' });
    if (error) errors.push(`logic insert failed: ${error.message}`);
    else result.logicInserted = count ?? logicRows.length;
  }

  // --- flashcards ----------------------------------------------------------
  const flashcardRows = (raw.flashcards ?? [])
    .filter(isValidFlashcard)
    .map((p) => ({
      deck: p.deck,
      mode,
      skill_level: skillCeiling,
      concept: p.concept,
      detail: p.detail,
      emoji: p.emoji ?? null,
      theme_tags: p.theme_tags,
      source: 'generated' as const,
    }));
  if (flashcardRows.length) {
    const { error, count } = await supabaseAdmin.from('flashcards').insert(flashcardRows, { count: 'exact' });
    if (error) errors.push(`flashcards insert failed: ${error.message}`);
    else result.flashcardsInserted = count ?? flashcardRows.length;
  }

  // --- educational_stories -------------------------------------------------
  const storyRows = (raw.stories ?? [])
    .filter(isValidStory)
    .map((p) => ({
      title: p.title,
      language: 'en' as const,
      mode,
      skill_level: skillCeiling,
      body: p.body,
      mind_map_prompt: p.mind_map_prompt ?? null,
      comprehension_question: p.comprehension_question,
      answer_keywords: p.answer_keywords,
      theme_tags: p.theme_tags,
      source: 'generated' as const,
    }));
  if (storyRows.length) {
    const { error, count } = await supabaseAdmin.from('educational_stories').insert(storyRows, { count: 'exact' });
    if (error) errors.push(`stories insert failed: ${error.message}`);
    else result.storiesInserted = count ?? storyRows.length;
  }

  return result;
}
