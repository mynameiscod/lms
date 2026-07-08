import { getAnthropic, getOpenAI, isAnthropicEnabled } from './aiClients';
import * as settings from './settingsService';
import { generateProblem, runAgainstTests } from './drillService';

// ── Categories & difficulty ──────────────────────────────────────────────────
export const THINKING_CATEGORIES = [
  'Arithmetic', 'Number Logic', 'Patterns', 'Sequences', 'Strings', 'Arrays',
  'Recursion', 'Sorting', 'Searching', 'Hashing', 'Trees', 'Graphs', 'DP',
  'Brain Teasers', 'Visual Logic', 'Interview Questions', 'Output Prediction',
  'Find Bug', 'Optimization', 'Real Life Problems', 'Decision Making', 'Probability',
];
export const THINKING_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert', 'interview'];
export const XP_BY_DIFFICULTY: Record<string, number> = { easy: 50, medium: 70, hard: 100, expert: 130, interview: 120 };
export const DIFF_NUM: Record<string, number> = { easy: 1, medium: 2, hard: 3, expert: 4, interview: 3 };

// ── Cheap-by-default AI helper (routine eval → gpt-4o-mini via settings) ──────
// Only "premium" callers pass preferAnthropic=true.
async function evalAi(system: string, user: string, maxTokens = 1200, preferAnthropic = false): Promise<string> {
  if (preferAnthropic && isAnthropicEnabled()) {
    const a = getAnthropic();
    if (a) {
      const model = settings.getStr('THINKING_PREMIUM_MODEL', settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6'));
      const r: any = await a.messages.create({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] });
      return (r.content || []).map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
    }
  }
  const o = getOpenAI();
  if (o) {
    const model = settings.getStr('THINKING_EVAL_MODEL', settings.getStr('OPENAI_MODEL', 'gpt-4o-mini'));
    const r = await o.chat.completions.create({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] });
    return r.choices?.[0]?.message?.content?.trim() || '';
  }
  // Fall back to Anthropic if OpenAI isn't configured.
  const a = getAnthropic();
  if (a) {
    const model = settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6');
    const r: any = await a.messages.create({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] });
    return (r.content || []).map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
  }
  return '';
}

const stripJson = (s: string) => (s || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

// ── Generate a bank problem (admin-triggered) ────────────────────────────────
// Reuses the Piston-verified generator for prompt+tests+starter, then a cheap AI
// call to add title, constraints, 3 hints and expected complexity.
export async function generateThinkingProblem(
  tenantId: string, category: string, difficulty: string, language: string, brief?: string
): Promise<any | null> {
  const base = await generateProblem(tenantId, category, DIFF_NUM[difficulty] >= 3 ? 'hard' : (DIFF_NUM[difficulty] === 2 ? 'medium' : 'easy'), language, brief);
  if (!base) return null;

  let meta: any = {};
  try {
    const sys = 'You add teaching metadata to a coding problem. Output ONLY raw JSON, no prose.';
    const usr = `Category: ${category}\nDifficulty: ${difficulty}\nProblem:\n"""${base.prompt}"""\n\nReturn JSON: {"title":"<=8-word title","constraints":"1-3 short constraint lines","hints":["tiny clue","medium clue","almost-complete logic"],"expectedTimeComplexity":"e.g. O(n)","expectedSpaceComplexity":"e.g. O(1)","estimatedMinutes":10}`;
    meta = JSON.parse(stripJson(await evalAi(sys, usr, 500)));
  } catch { /* metadata is best-effort */ }

  return {
    title: (meta.title && String(meta.title).slice(0, 90)) || `${category} — ${difficulty}`,
    category, difficulty, language: base.language,
    statement: base.prompt,
    examples: base.examples,
    constraints: meta.constraints ? String(meta.constraints).slice(0, 500) : undefined,
    starterCode: base.starterCode,
    testCases: base.testCases,
    hints: Array.isArray(meta.hints) ? meta.hints.slice(0, 3).map((h: any) => String(h).slice(0, 300)) : [],
    expectedTimeComplexity: meta.expectedTimeComplexity ? String(meta.expectedTimeComplexity).slice(0, 40) : undefined,
    expectedSpaceComplexity: meta.expectedSpaceComplexity ? String(meta.expectedSpaceComplexity).slice(0, 40) : undefined,
    estimatedMinutes: Number(meta.estimatedMinutes) > 0 ? Math.min(120, Number(meta.estimatedMinutes)) : 15,
    xp: XP_BY_DIFFICULTY[difficulty] || 50,
    source: 'ai',
  };
}

export const runCode = runAgainstTests;

// ── Full-rubric evaluation of a submission (the differentiator) ──────────────
// Grades the THINKING, not just pass/fail. Runs on the cheap model by default.
export async function evaluateSubmission(input: {
  statement: string; approach: string; code: string; language: string;
  allPassed: boolean; passedCount: number; total: number;
  expectedTime?: string; expectedSpace?: string; premium?: boolean;
}): Promise<any> {
  const sys = [
    'You are an expert coding mentor for engineering students. Evaluate a submission on THINKING quality, not just correctness.',
    'Be encouraging but honest. Never just say correct/wrong. Output ONLY raw JSON matching the requested shape.',
  ].join(' ');
  const usr = `PROBLEM:\n"""${(input.statement || '').slice(0, 2000)}"""\n\n` +
    `STUDENT'S APPROACH (their plain-English thinking):\n"""${(input.approach || '').slice(0, 1500)}"""\n\n` +
    `THEIR CODE (${input.language}):\n"""${(input.code || '').slice(0, 3000)}"""\n\n` +
    `TEST RESULT: ${input.allPassed ? 'ALL PASSED' : `${input.passedCount}/${input.total} passed`}.\n` +
    (input.expectedTime ? `Expected time complexity target: ${input.expectedTime}. ` : '') +
    (input.expectedSpace ? `Expected space: ${input.expectedSpace}.` : '') +
    `\n\nScore each 0-100 and return JSON:\n{` +
    `"logicalThinking":0-100,"problemUnderstanding":0-100,"approach":0-100,"optimization":0-100,"edgeCases":0-100,` +
    `"codingStyle":0-100,"naming":0-100,"communication":0-100,"confidence":0-100,"overall":0-100,` +
    `"timeComplexity":"O(...) of their code","spaceComplexity":"O(...) of their code",` +
    `"strengths":["..."],"weaknesses":["..."],"commonMistakes":["..."],"relatedQuestions":["..."],` +
    `"improvedSolution":"a short better version or key change (plain text, may include code)","alternativeSolution":"a different approach in 1-2 lines",` +
    `"summary":"2-sentence encouraging summary"}`;
  try {
    const parsed = JSON.parse(stripJson(await evalAi(sys, usr, 1400, !!input.premium)));
    return parsed;
  } catch {
    // Deterministic fallback so the student always gets feedback.
    const base = input.allPassed ? 78 : Math.round((input.passedCount / Math.max(1, input.total)) * 60);
    return {
      logicalThinking: base, problemUnderstanding: base, approach: base, optimization: base - 10, edgeCases: base - 10,
      codingStyle: base, naming: base, communication: Math.min(100, (input.approach || '').split(/\s+/).length * 2), confidence: base, overall: base,
      timeComplexity: 'n/a', spaceComplexity: 'n/a',
      strengths: input.allPassed ? ['All test cases passed — your logic works.'] : ['You attempted a full solution.'],
      weaknesses: input.allPassed ? ['Consider edge cases and complexity.'] : ['Some tests fail — trace your logic on the failing case.'],
      commonMistakes: [], relatedQuestions: [],
      improvedSolution: '', alternativeSolution: '',
      summary: input.allPassed ? 'Solid work — keep refining your approach and complexity.' : 'Good attempt — review the failing cases and iterate.',
    };
  }
}

// ── Voice "Explain to AI" evaluation ─────────────────────────────────────────
// Scores a spoken explanation of the approach on communication dimensions.
export async function evaluateVoiceExplanation(input: {
  statement: string; transcript: string; durationSec: number;
}): Promise<any> {
  const sys = 'You are a warm but honest technical communication coach. A student explained aloud how they would solve a coding problem (audio transcribed below). Evaluate their SPOKEN explanation. Output ONLY raw JSON.';
  const usr = `PROBLEM:\n"""${(input.statement || '').slice(0, 1500)}"""\n\n` +
    `Spoken length ~${input.durationSec}s. TRANSCRIPT:\n"""${(input.transcript || '').slice(0, 4000)}"""\n\n` +
    `Score each 0-100 based on what they actually said. Return JSON:\n` +
    `{"confidence":0-100,"communication":0-100,"grammar":0-100,"logic":0-100,"flow":0-100,"professionalism":0-100,"technicalVocabulary":0-100,"overall":0-100,` +
    `"summary":"2-sentence encouraging assessment","tips":["specific tip to sound clearer/more confident next time","..."]}`;
  try { return JSON.parse(stripJson(await evalAi(sys, usr, 900))); }
  catch {
    const wc = (input.transcript || '').split(/\s+/).filter(Boolean).length;
    const base = Math.min(85, 40 + Math.round(wc / 3));
    return { confidence: base, communication: base, grammar: base, logic: base, flow: base, professionalism: base, technicalVocabulary: base - 10, overall: base,
      summary: 'Good effort explaining your thinking out loud. Keep practising to sound more structured and confident.', tips: ['Structure it as: problem → approach → steps → complexity.', 'Speak a little slower and use the key technical terms.'] };
  }
}

// ── Thinking Profile ─────────────────────────────────────────────────────────
// Build a rolling profile from journals + rubric scores + categories + voice.
export async function computeThinkingProfile(payload: {
  samples: { category: string; difficulty: string; passed: boolean; scores?: any; journal?: any; voice?: any }[];
}): Promise<any> {
  const n = payload.samples.length;
  const compact = payload.samples.slice(0, 40).map((s, i) =>
    `#${i + 1} ${s.category}/${s.difficulty} ${s.passed ? 'SOLVED' : 'unsolved'}` +
    (s.scores ? ` | logic:${s.scores.logicalThinking ?? '-'} approach:${s.scores.approach ?? '-'} opt:${s.scores.optimization ?? '-'} edge:${s.scores.edgeCases ?? '-'} comm:${s.scores.communication ?? '-'}` : '') +
    (s.voice ? ` | voice conf:${s.voice.confidence ?? '-'} comm:${s.voice.communication ?? '-'}` : '') +
    (s.journal ? ` | first:"${(s.journal.firstThought || '').slice(0, 80)}" stuck:"${(s.journal.gotStuck || '').slice(0, 80)}" learned:"${(s.journal.learned || '').slice(0, 80)}"` : '')
  ).join('\n');

  const sys = 'You are a mentor building a longitudinal "thinking profile" of an engineering student from their problem-solving history and self-reflections. Be specific and constructive. Output ONLY raw JSON.';
  const usr = `The student has ${n} recorded attempts. Data (most recent first):\n${compact}\n\n` +
    `Identify durable patterns in HOW they think — not one-off results. Return JSON:\n` +
    `{"summary":"3-4 sentence portrait of them as a problem-solver","strengths":["..."],"weaknesses":["..."],` +
    `"traits":[{"label":"e.g. Strong in patterns / Weak in optimization / Needs confidence / Excellent debugging / Slow decision maker / Great communication","note":"1 line why"}],` +
    `"recommendations":["concrete next-step advice"]}`;
  try { return JSON.parse(stripJson(await evalAi(sys, usr, 1200))); }
  catch { return { summary: 'Keep solving daily challenges and journaling — your thinking profile will sharpen as more data comes in.', strengths: [], weaknesses: [], traits: [], recommendations: ['Solve at least one challenge a day and answer the journal questions honestly.'] }; }
}

// ── XP for a submission ──────────────────────────────────────────────────────
export function computeXp(opts: {
  problemXp: number; allPassed: boolean; attempts: number; hintsUsed: number; explainedThinking: boolean;
}): number {
  if (!opts.allPassed) return 0;                 // XP awarded on solve
  let xp = opts.problemXp || 50;                 // base by difficulty
  if (opts.attempts <= 1 && opts.hintsUsed === 0) xp += 50; // perfect solution
  if (opts.hintsUsed === 0) xp += 25;            // no-hint bonus
  if (opts.explainedThinking) xp += 30;          // explained approach (the gate, ≥30 words)
  return xp;
}

export const wordCount = (s: string) => (s || '').trim().split(/\s+/).filter(Boolean).length;
export const MIN_APPROACH_WORDS = 30;

// What the student is allowed to see for a problem (no test cases / solution / unrevealed hints).
export const publicProblem = (p: any, revealedHints = 0) => ({
  id: String(p._id),
  title: p.title, category: p.category, difficulty: p.difficulty, language: p.language,
  statement: p.statement, examples: p.examples, constraints: p.constraints, notes: p.notes,
  starterCode: p.starterCode, xp: p.xp, estimatedMinutes: p.estimatedMinutes,
  totalHints: (p.hints || []).length,
  hints: (p.hints || []).slice(0, revealedHints),
  expectedTimeComplexity: p.expectedTimeComplexity, expectedSpaceComplexity: p.expectedSpaceComplexity,
});
