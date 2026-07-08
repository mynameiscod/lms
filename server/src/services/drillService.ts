import { getAnthropic, getOpenAI, isAnthropicEnabled } from './aiClients';
import * as settings from './settingsService';
import codeRunner from './codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';
import { generateItems } from './assessmentQuestionGeneratorService';

const RUNNABLE: Record<string, ProgrammingLanguage> = {
  javascript: ProgrammingLanguage.JAVASCRIPT, python: ProgrammingLanguage.PYTHON, java: ProgrammingLanguage.JAVA,
  cpp: ProgrammingLanguage.CPP, c: ProgrammingLanguage.C,
};
const norm = (s: string) => (s || '').replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/g, '').trim();
const diffNum = (d: string) => (d === 'hard' ? 4 : d === 'medium' ? 3 : 1);

// ── Generate a fully Piston-verified micro-problem for a concept + level ──────
export async function generateProblem(tenantId: string, concept: string, difficulty: string, language: string) {
  const items = await generateItems(tenantId, {
    type: 'live_code' as any, dimension: 'dsa' as any, difficulty: diffNum(difficulty),
    language, count: 1, context: `Beginner-friendly problem-solving drill on: ${concept}. Keep it SMALL and single-concept — one clear task, reads from stdin, prints to stdout.`,
  } as any, { persist: false });
  const it: any = items && items[0];
  if (!it || !Array.isArray(it.testCases) || !it.testCases.length) return null;
  const examples = it.testCases.filter((t: any) => !t.hidden).slice(0, 2).map((t: any) => ({ input: t.input || '', expectedOutput: t.expectedOutput || '' }));
  return {
    prompt: it.prompt as string,
    language: it.language || language,
    starterCode: it.starterCode || '',
    testCases: it.testCases.map((t: any) => ({ input: t.input || '', expectedOutput: t.expectedOutput || '', hidden: t.hidden !== false })),
    examples: examples.length ? examples : it.testCases.slice(0, 1).map((t: any) => ({ input: t.input || '', expectedOutput: t.expectedOutput || '' })),
  };
}

async function ai(system: string, user: string, maxTokens = 500): Promise<string> {
  if (isAnthropicEnabled()) {
    const a = getAnthropic();
    if (a) {
      const model = settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6');
      const r: any = await a.messages.create({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] });
      return (r.content || []).map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
    }
  }
  const o = getOpenAI();
  if (!o) return '';
  const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini');
  const r = await o.chat.completions.create({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] });
  return r.choices?.[0]?.message?.content?.trim() || '';
}

const stripJson = (s: string) => (s || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

// Evaluate the student's plain-English plan for the problem — the logic, not syntax.
export async function evaluatePlan(prompt: string, plan: string): Promise<{ ok: boolean; hint: string }> {
  if ((plan || '').trim().length < 10) return { ok: false, hint: 'Write your approach in a few plain-English steps first — what will you read, what will you check/compute, and what will you print?' };
  const sys = 'You are a patient coding tutor checking a beginner\'s PLAIN-ENGLISH plan (pseudocode) for a small problem. Judge the LOGIC/approach only, not code or syntax. Output ONLY raw JSON.';
  const usr = `Problem: ${prompt}\n\nStudent's plan:\n"""${(plan || '').slice(0, 1500)}"""\n\nIs the approach essentially correct and complete for this problem? Return JSON: {"ok": true|false, "hint": "<if not ok: ONE short guiding hint or question that nudges them to the missing/incorrect step — do NOT give the full plan or any code>"}`;
  try {
    const p = JSON.parse(stripJson(await ai(sys, usr, 400)));
    return { ok: !!p.ok, hint: typeof p.hint === 'string' ? p.hint : '' };
  } catch { return { ok: true, hint: '' }; }
}

// Run the student's code against every test case → pass/fail.
export async function runAgainstTests(language: string, code: string, testCases: { input: string; expectedOutput: string; hidden: boolean }[]) {
  const lang = RUNNABLE[(language || '').toLowerCase()] || ProgrammingLanguage.JAVASCRIPT;
  const results: { passed: boolean; hidden: boolean; index: number }[] = [];
  let firstFail: { input: string; expected: string; actual: string } | null = null;
  let compileError = '';
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const r = await codeRunner.execute({ code, language: lang, input: tc.input || '', expectedOutput: '', timeLimit: 10000, memoryLimit: 256 });
    if (r.compilationError) { compileError = r.compilationError; results.push({ passed: false, hidden: tc.hidden, index: i }); if (!firstFail) firstFail = { input: tc.input, expected: tc.expectedOutput, actual: r.compilationError }; continue; }
    const actual = norm(r.output || '');
    const passed = actual === norm(tc.expectedOutput);
    results.push({ passed, hidden: tc.hidden, index: i });
    if (!passed && !firstFail) firstFail = { input: tc.input, expected: tc.expectedOutput, actual: r.error ? `${actual}\n${r.error}`.trim() : (actual || '(no output)') };
  }
  return { results, allPassed: results.every((r) => r.passed), firstFail, compileError };
}

// A hint for a failing attempt — never the fix/solution.
export async function hintForFailure(prompt: string, code: string, fail: { input: string; expected: string; actual: string }): Promise<string> {
  const sys = 'You are a patient coding tutor. The student\'s code failed a test. Give ONE short, specific hint that points them toward the bug in THEIR code — never rewrite it, never give the corrected code or the full approach. A nudge, not the answer.';
  const usr = `Problem: ${prompt}\n\nTheir code:\n"""${(code || '').slice(0, 2000)}"""\n\nOn input:\n${fail.input}\nExpected: ${fail.expected}\nGot: ${fail.actual}\n\nOne-sentence hint:`;
  try { return (await ai(sys, usr, 200)).slice(0, 400) || 'Trace your code by hand on that input — where does the actual output first differ from what you expected?'; }
  catch { return 'Trace your code by hand on that input — where does the actual output first differ from what you expected?'; }
}

// Score a solved drill: reward planning + first-try success; penalise many attempts/hints.
export function scoreDrill(planOk: boolean, attempts: number, hintsUsed: number): number {
  let s = 100;
  s -= Math.max(0, attempts - 1) * 8;
  s -= hintsUsed * 6;
  if (planOk) s += 5; else s -= 5;
  return Math.max(30, Math.min(100, Math.round(s)));
}

export const DRILL_CONCEPTS = [
  'Variables & Input/Output', 'Conditionals (if/else)', 'Loops', 'Arrays / Lists',
  'Strings', 'Functions', 'Basic Math', 'Searching', 'Sorting basics', 'Dictionaries / Maps',
];
