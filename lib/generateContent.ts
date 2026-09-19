// lib/generateContent.ts
// SERVER-ONLY. Procedurally generates themed content for Supabase content
// tables using Google's free Gemini API. Only generates the content types
// requested (count > 0), keeping prompts small enough to avoid MAX_TOKENS.

import { supabaseAdmin } from './supabaseAdmin';

export interface GenerateContentOptions {
  skillCeiling: number;
  themes: string[];
  mode?: 'junior' | 'advanced';
  mathCount?: number;
  logicCount?: number;
  flashcardCount?: number;
  storyCount?: number;
}

export interface GenerateContentResult {
  mathInserted: number;
  logicInserted: number;
  flashcardsInserted: number;
  storiesInserted: number;
  errors: string[];
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
  const themeStr = opts.themes.join(', ') || 'general school life';
  const sections: string[] = [];
  const counts: string[] = [];

  if (opts.mathCount > 0) {
    counts.push(`${opts.mathCount} math_problems`);
    sections.push(`"math_problems": [
    {
      "template": "word problem with {a} and {b} placeholders, themed around the interests, 1-2 sentences",
      "variables": { "a": { "min": number, "max": number }, "b": { "min": number, "max": number } },
      "answer_formula": "arithmetic expression e.g. \\"a*b\\"",
      "theme_tags": ["tag"]
    }
  ]`);
  }

  if (opts.logicCount > 0) {
    counts.push(`${opts.logicCount} logic_patterns`);
    sections.push(`"logic_patterns": [
    {
      "sequence": [number, number, "?"],
      "answer": number,
      "distractors": [number, number, number],
      "theme_tags": ["tag"]
    }
  ]`);
  }

  if (opts.flashcardCount > 0) {
    counts.push(`${opts.flashcardCount} flashcards`);
    sections.push(`"flashcards": [
    {
      "deck": "geography or science or multiplication or animals or space or vocabulary",
      "concept": "short front-of-card prompt",
      "detail": "short answer for back of card",
      "emoji": "one emoji",
      "theme_tags": ["tag"]
    }
  ]`);
  }

  if (opts.storyCount > 0) {
    counts.push(`${opts.storyCount} stories`);
    sections.push(`"stories": [
    {
      "title": "story title",
      "body": "60-100 word story for a 6-10 year old",
      "mind_map_prompt": "one sentence prompting child to draw the core idea",
      "comprehension_question": "one simple question about the story",
      "answer_keywords": ["keyword"],
      "theme_tags": ["tag"]
    }
  ]`);
  }

  return `Generate children's educational content. Skill level: ${opts.skillCeiling}/20. Theme: ${themeStr}. Mode: ${opts.mode}.

Return ONLY this JSON, nothing else:
{
  ${sections.join(',\n  ')}
}

Generate exactly ${counts.join(', ')}.
Use varied scenarios and sentence structures. Age-appropriate for 6-10 year olds. Positive tone only.`;
}

function stripFences(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}

function isValidMath(p: any) {
  return p && typeof p.template === 'string' && p.template.length > 0 &&
    typeof p.variables === 'object' && typeof p.answer_formula === 'string' &&
    Array.isArray(p.theme_tags);
}

function isValidLogic(p: any) {
  return p && Array.isArray(p.sequence) && p.sequence.length > 0 &&
    p.answer !== undefined && Array.isArray(p.distractors) && Array.isArray(p.theme_tags);
}

function isValidFlashcard(p: any) {
  return p && typeof p.deck === 'string' && p.deck.length > 0 &&
    typeof p.concept === 'string' && p.concept.length > 0 &&
    typeof p.detail === 'string' && Array.isArray(p.theme_tags);
}

function isValidStory(p: any) {
  return p && typeof p.title === 'string' && typeof p.body === 'string' &&
    p.body.length > 20 && typeof p.comprehension_question === 'string' &&
    Array.isArray(p.answer_keywords) && Array.isArray(p.theme_tags);
}

export async function generateThemedContent(
  opts: GenerateContentOptions,
): Promise<GenerateContentResult> {
  const errors: string[] = [];
  const result: GenerateContentResult = {
    mathInserted: 0, logicInserted: 0, flashcardsInserted: 0, storiesInserted: 0, errors,
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { errors.push('GEMINI_API_KEY not set'); return result; }
  if (!supabaseAdmin) { errors.push('Supabase admin unavailable'); return result; }

  const mode = opts.mode ?? 'advanced';
  const mathCount = opts.mathCount ?? 8;
  const logicCount = opts.logicCount ?? 8;
  const flashcardCount = opts.flashcardCount ?? 10;
  const storyCount = opts.storyCount ?? 2;
  const skillCeiling = Math.min(20, Math.max(1, Math.round(opts.skillCeiling)));

  // Skip entirely if nothing requested
  if (mathCount + logicCount + flashcardCount + storyCount === 0) return result;

  let raw: any;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: buildPrompt({ skillCeiling, themes: opts.themes, mode, mathCount, logicCount, flashcardCount, storyCount }) }],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.9,
            maxOutputTokens: 4096,
          },
        }),
      },
    );

    if (!res.ok) { errors.push(`Gemini ${res.status}: ${await res.text()}`); return result; }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    if (!candidate) { errors.push('No candidates returned'); return result; }
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      errors.push(`Gemini stopped early: ${candidate.finishReason}`);
      // Don't return — try to parse whatever we got
    }

    const text: string = candidate?.content?.parts?.[0]?.text ?? '';
    if (!text) { errors.push('No text in response'); return result; }
    raw = JSON.parse(stripFences(text));
  } catch (e) {
    errors.push(`Parse failed: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }

  // Insert math
  if (mathCount > 0) {
    const rows = (raw.math_problems ?? []).filter(isValidMath).map((p: any) => ({
      topic: 'olympiad', mode, skill_level: skillCeiling,
      template: p.template, variables: p.variables,
      answer_formula: p.answer_formula, theme_tags: p.theme_tags, source: 'generated',
    }));
    if (rows.length) {
      const { error, count } = await supabaseAdmin.from('math_problem_templates').insert(rows, { count: 'exact' });
      if (error) errors.push(`math insert: ${error.message}`);
      else result.mathInserted = count ?? rows.length;
    }
  }

  // Insert logic
  if (logicCount > 0) {
    const rows = (raw.logic_patterns ?? []).filter(isValidLogic).map((p: any) => ({
      pattern_type: 'olympiad', mode, skill_level: skillCeiling,
      sequence: p.sequence, answer: p.answer,
      distractors: p.distractors, theme_tags: p.theme_tags, source: 'generated',
    }));
    if (rows.length) {
      const { error, count } = await supabaseAdmin.from('logic_patterns').insert(rows, { count: 'exact' });
      if (error) errors.push(`logic insert: ${error.message}`);
      else result.logicInserted = count ?? rows.length;
    }
  }

  // Insert flashcards
  if (flashcardCount > 0) {
    const rows = (raw.flashcards ?? []).filter(isValidFlashcard).map((p: any) => ({
      deck: p.deck, mode, skill_level: skillCeiling,
      concept: p.concept, detail: p.detail,
      emoji: p.emoji ?? null, theme_tags: p.theme_tags, source: 'generated',
    }));
    if (rows.length) {
      const { error, count } = await supabaseAdmin.from('flashcards').insert(rows, { count: 'exact' });
      if (error) errors.push(`flashcards insert: ${error.message}`);
      else result.flashcardsInserted = count ?? rows.length;
    }
  }

  // Insert stories
  if (storyCount > 0) {
    const rows = (raw.stories ?? []).filter(isValidStory).map((p: any) => ({
      title: p.title, language: 'en', mode, skill_level: skillCeiling,
      body: p.body, mind_map_prompt: p.mind_map_prompt ?? null,
      comprehension_question: p.comprehension_question,
      answer_keywords: p.answer_keywords, theme_tags: p.theme_tags, source: 'generated',
    }));
    if (rows.length) {
      const { error, count } = await supabaseAdmin.from('educational_stories').insert(rows, { count: 'exact' });
      if (error) errors.push(`stories insert: ${error.message}`);
      else result.storiesInserted = count ?? rows.length;
    }
  }

  return result;
}
