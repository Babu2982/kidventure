// lib/dynamicContent.ts
// Offline-first loader for math_problem_templates + logic_patterns —
// the "infinite content" half of the pipeline (flashcards has its own
// loader in lib/flashcards.ts). Same cache-first strategy: IndexedDB →
// Supabase → small built-in seed, so Math Mountain / Logic Lagoon keep
// working with zero backend and zero network.
//
// NOTE: this file is NOT yet wired into your existing math/logic screens —
// it's ready to use, but hooking it into VirtualAbacus / OlympiadGenerator /
// AdvancedLogic safely requires seeing those components first, so they
// don't get overwritten the way lib/supabase.ts did. Ask for that file to
// finish the wiring.

import { supabase } from './supabase';

export interface MathProblemTemplate {
  id: string;
  topic: string;
  template: string; // e.g. "If {a} shuttles cost {b} each..."
  variables: Record<string, { min: number; max: number }>;
  answerFormula: string; // e.g. "a*b" — evaluate with evaluateFormula()
  themeTags: string[];
}

export interface LogicPattern {
  id: string;
  patternType: string;
  sequence: (number | string)[];
  answer: number | string;
  distractors: (number | string)[];
  themeTags: string[];
}

export interface ExpandedMathProblem {
  id: string;
  question: string; // template with placeholders filled in
  answer: number;
  themeTags: string[];
}

// ---------------------------------------------------------------------------
// IndexedDB (separate object store from flashcards, same DB)
// ---------------------------------------------------------------------------
const DB_NAME = 'kidventure-content';
const DB_VERSION = 2; // bumped: adds math/logic stores alongside flashcards
const MATH_STORE = 'mathTemplates';
const LOGIC_STORE = 'logicPatterns';

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('flashcards')) db.createObjectStore('flashcards');
      if (!db.objectStoreNames.contains(MATH_STORE)) db.createObjectStore(MATH_STORE);
      if (!db.objectStoreNames.contains(LOGIC_STORE)) db.createObjectStore(LOGIC_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function idbGet<T>(store: string, key: string): Promise<T | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const r = db.transaction(store, 'readonly').objectStore(store).get(key);
    r.onsuccess = () => resolve((r.result as T) ?? null);
    r.onerror = () => resolve(null);
  });
}

async function idbSet(store: string, key: string, value: unknown): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// ---------------------------------------------------------------------------
// Safe formula evaluator — NEVER uses eval()/Function(). Supports the small
// set of ops these templates actually need: + - * / and parentheses-free
// single-letter variables (a, b, c...).
// ---------------------------------------------------------------------------
export function evaluateFormula(formula: string, vars: Record<string, number>): number {
  const tokens = formula.match(/[a-zA-Z]+|\d+(\.\d+)?|[+\-*/]/g) ?? [];
  const values: number[] = [];
  const ops: string[] = [];
  const apply = () => {
    const op = ops.pop();
    const b = values.pop();
    const a = values.pop();
    if (op === undefined || a === undefined || b === undefined) return;
    if (op === '+') values.push(a + b);
    else if (op === '-') values.push(a - b);
    else if (op === '*') values.push(a * b);
    else if (op === '/') values.push(b !== 0 ? a / b : 0);
  };
  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

  for (const tok of tokens) {
    if (/^[+\-*/]$/.test(tok)) {
      while (ops.length && precedence[ops[ops.length - 1]] >= precedence[tok]) apply();
      ops.push(tok);
    } else if (/^[a-zA-Z]+$/.test(tok)) {
      values.push(vars[tok] ?? 0);
    } else {
      values.push(parseFloat(tok));
    }
  }
  while (ops.length) apply();
  return values[0] ?? 0;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Expand a template into a concrete, ready-to-display problem with rolled variable values. */
export function expandMathTemplate(t: MathProblemTemplate): ExpandedMathProblem {
  const rolled: Record<string, number> = {};
  for (const [key, range] of Object.entries(t.variables)) {
    rolled[key] = randomInt(range.min, range.max);
  }
  let question = t.template;
  for (const [key, val] of Object.entries(rolled)) {
    question = question.replaceAll(`{${key}}`, String(val));
  }
  const answer = Math.round(evaluateFormula(t.answerFormula, rolled));
  return { id: `${t.id}-${Date.now()}`, question, answer, themeTags: t.themeTags };
}

// ---------------------------------------------------------------------------
// Remote fetch
// ---------------------------------------------------------------------------
async function fetchMathRemote(mode: 'junior' | 'advanced', skillLevel: number): Promise<MathProblemTemplate[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('math_problem_templates')
      .select('id,topic,template,variables,answer_formula,theme_tags')
      .eq('mode', mode)
      .gte('skill_level', Math.max(1, skillLevel - 1))
      .lte('skill_level', skillLevel + 1);
    if (error || !data) return null;
    return data.map((r: any) => ({
      id: r.id,
      topic: r.topic,
      template: r.template,
      variables: r.variables ?? {},
      answerFormula: r.answer_formula,
      themeTags: r.theme_tags ?? [],
    }));
  } catch {
    return null;
  }
}

async function fetchLogicRemote(mode: 'junior' | 'advanced', skillLevel: number): Promise<LogicPattern[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('logic_patterns')
      .select('id,pattern_type,sequence,answer,distractors,theme_tags')
      .eq('mode', mode)
      .gte('skill_level', Math.max(1, skillLevel - 1))
      .lte('skill_level', skillLevel + 1);
    if (error || !data) return null;
    return data.map((r: any) => ({
      id: r.id,
      patternType: r.pattern_type,
      sequence: r.sequence,
      answer: r.answer,
      distractors: r.distractors ?? [],
      themeTags: r.theme_tags ?? [],
    }));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Built-in seed — guarantees Math Mountain / Logic Lagoon work offline.
// ---------------------------------------------------------------------------
export const SEED_MATH: MathProblemTemplate[] = [
  {
    id: 'seed-math-1',
    topic: 'olympiad',
    template: 'A shop sells {a} pencils in each box. If there are {b} boxes, how many pencils in total?',
    variables: { a: { min: 3, max: 9 }, b: { min: 2, max: 6 } },
    answerFormula: 'a*b',
    themeTags: ['shopping'],
  },
  {
    id: 'seed-math-2',
    topic: 'olympiad',
    template: 'You have {a} stickers and give away {b} of them. How many stickers are left?',
    variables: { a: { min: 10, max: 30 }, b: { min: 1, max: 9 } },
    answerFormula: 'a-b',
    themeTags: ['stickers'],
  },
  {
    id: 'seed-math-3',
    topic: 'olympiad',
    template: 'A team scores {a} points in the first half and {b} points in the second half. What is the total score?',
    variables: { a: { min: 5, max: 20 }, b: { min: 5, max: 20 } },
    answerFormula: 'a+b',
    themeTags: ['sports'],
  },
];

export const SEED_LOGIC: LogicPattern[] = [
  { id: 'seed-logic-1', patternType: 'sequence', sequence: [2, 4, 6, 8, '?'], answer: 10, distractors: [9, 11, 12], themeTags: [] },
  { id: 'seed-logic-2', patternType: 'sequence', sequence: [1, 3, 5, 7, '?'], answer: 9, distractors: [8, 10, 11], themeTags: [] },
  { id: 'seed-logic-3', patternType: 'sequence', sequence: [5, 10, 15, 20, '?'], answer: 25, distractors: [22, 24, 30], themeTags: [] },
];

// ---------------------------------------------------------------------------
// Public loaders
// ---------------------------------------------------------------------------
export async function loadMathTemplates(
  mode: 'junior' | 'advanced',
  skillLevel: number,
): Promise<MathProblemTemplate[]> {
  const key = `${mode}:${skillLevel}`;
  const cached = await idbGet<MathProblemTemplate[]>(MATH_STORE, key);
  if (cached && cached.length) {
    fetchMathRemote(mode, skillLevel).then((fresh) => {
      if (fresh && fresh.length) idbSet(MATH_STORE, key, fresh);
    });
    return cached;
  }
  const remote = await fetchMathRemote(mode, skillLevel);
  if (remote && remote.length) {
    await idbSet(MATH_STORE, key, remote);
    return remote;
  }
  await idbSet(MATH_STORE, key, SEED_MATH);
  return SEED_MATH;
}

export async function loadLogicPatterns(
  mode: 'junior' | 'advanced',
  skillLevel: number,
): Promise<LogicPattern[]> {
  const key = `${mode}:${skillLevel}`;
  const cached = await idbGet<LogicPattern[]>(LOGIC_STORE, key);
  if (cached && cached.length) {
    fetchLogicRemote(mode, skillLevel).then((fresh) => {
      if (fresh && fresh.length) idbSet(LOGIC_STORE, key, fresh);
    });
    return cached;
  }
  const remote = await fetchLogicRemote(mode, skillLevel);
  if (remote && remote.length) {
    await idbSet(LOGIC_STORE, key, remote);
    return remote;
  }
  await idbSet(LOGIC_STORE, key, SEED_LOGIC);
  return SEED_LOGIC;
}
