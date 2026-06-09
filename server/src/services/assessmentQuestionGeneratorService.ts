import Anthropic from '@anthropic-ai/sdk';
import AssessmentItem from '../models/AssessmentItem';
import codeRunner from './codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';
import { AssessmentDimension, AssessmentItemType, DIMENSION_LABELS } from '../constants/assessment';

/**
 * AI Question Generator — Claude writes assessment items (all 6 types); for any
 * item whose answer can be computed (predict_output, live_code, sql) we RUN the
 * AI's reference code on Piston and adopt the real output as ground truth,
 * discarding items whose reference doesn't compile/run. This makes AI-generated
 * questions reliably auto-gradable ("validate AI tests before use").
 */

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const MODEL = process.env.ASSESSMENT_GEN_MODEL || 'claude-sonnet-4-6';

export interface GenSpec {
  type: AssessmentItemType;
  dimension: AssessmentDimension;
  difficulty: number;       // 1–5
  language?: string;        // for code/predict types
  count: number;
  context?: string;         // optional resume/stack flavor
}

function toLang(language?: string, type?: string): ProgrammingLanguage {
  if (type === 'sql') return ProgrammingLanguage.SQL;
  const map: Record<string, ProgrammingLanguage> = {
    java: ProgrammingLanguage.JAVA, python: ProgrammingLanguage.PYTHON, py: ProgrammingLanguage.PYTHON,
    javascript: ProgrammingLanguage.JAVASCRIPT, js: ProgrammingLanguage.JAVASCRIPT,
    typescript: ProgrammingLanguage.TYPESCRIPT, cpp: ProgrammingLanguage.CPP, 'c++': ProgrammingLanguage.CPP,
    c: ProgrammingLanguage.C, csharp: ProgrammingLanguage.CSHARP, go: ProgrammingLanguage.GO,
  };
  return map[(language || '').toLowerCase()] || ProgrammingLanguage.JAVASCRIPT;
}

const norm = (s: string) => (s || '').replace(/\r\n/g, '\n').replace(/\s+$/gm, '').replace(/\n+$/, '').trim();

const SCHEMA_BY_TYPE: Record<AssessmentItemType, string> = {
  mcq: `{"prompt","options":[{"id":"a","text"}...],"correctOptionIds":["a"]}`,
  predict_output: `{"prompt":"What does this print?","language","codeSnippet","expectedOutput"}`,
  debug: `{"prompt":"Which line has the bug?","language","codeSnippet","buggyLineNumber","bugExplanation"}`,
  complete_code: `{"prompt","language","codeSnippet (with a blank marker)","blanks":[{"id":"b1","acceptedAnswers":["..."],"caseSensitive":false}]}`,
  live_code: `{"prompt","language","starterCode","referenceSolution (full working program reading stdin, printing stdout)","testCases":[{"input","expectedOutput","hidden":true}]}`,
  sql: `{"prompt","language":"sql","starterCode (CREATE+INSERT+the query to complete)","referenceSolution (full SQL script that prints the answer rows)","testCases":[{"input":"","expectedOutput","hidden":true}]}`,
};

function buildPrompt(spec: GenSpec): string {
  return [
    `Generate ${spec.count} ${spec.type} assessment item(s).`,
    `Dimension: ${DIMENSION_LABELS[spec.dimension]} (${spec.dimension}). Difficulty: ${spec.difficulty}/5.`,
    spec.language ? `Language: ${spec.language}.` : '',
    spec.context ? `Tailor to this candidate context where natural: ${spec.context}.` : '',
    `Return ONLY a raw JSON array (no markdown). Each element matches: ${SCHEMA_BY_TYPE[spec.type]}.`,
    `For live_code/sql/predict_output you MUST include code that compiles and runs; outputs are verified by execution.`,
    `Keep prompts concise and unambiguous. For mcq, exactly one correct option unless the question implies multiple.`,
  ].filter(Boolean).join('\n');
}

async function callClaude(spec: GenSpec): Promise<any[]> {
  if (!client) return [];
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2200,
    system: 'You are an expert technical interviewer writing precise, auto-gradable coding-assessment items. Output only raw JSON.',
    messages: [{ role: 'user', content: buildPrompt(spec) }],
  });
  const text = resp.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
  const arr = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim());
  return Array.isArray(arr) ? arr : [arr];
}

/** Run code on Piston and return its stdout, or null if it didn't run cleanly. */
async function runForOutput(code: string, language: ProgrammingLanguage, input: string): Promise<string | null> {
  const r = await codeRunner.execute({ code, language, input: input || '', expectedOutput: '', timeLimit: 15000, memoryLimit: 256 });
  if (r.compilationError || r.error) return null;
  return r.output != null ? norm(r.output) : null;
}

/**
 * Validate + finalize one raw AI item into a storable AssessmentItem (or null
 * if it can't be trusted). Uses execution to set authoritative outputs.
 */
async function finalizeItem(raw: any, spec: GenSpec): Promise<any | null> {
  const base = {
    type: spec.type, dimension: spec.dimension, difficulty: spec.difficulty,
    language: raw.language || spec.language, prompt: String(raw.prompt || '').trim(),
    points: spec.type === 'live_code' || spec.type === 'sql' ? 2 : 1,
    tags: ['ai-generated'], active: true,
  };
  if (!base.prompt) return null;

  switch (spec.type) {
    case 'mcq': {
      if (!Array.isArray(raw.options) || !raw.options.length || !Array.isArray(raw.correctOptionIds) || !raw.correctOptionIds.length) return null;
      return { ...base, options: raw.options.map((o: any) => ({ id: String(o.id), text: String(o.text) })), correctOptionIds: raw.correctOptionIds.map(String) };
    }
    case 'debug': {
      if (!raw.codeSnippet || raw.buggyLineNumber == null) return null;
      return { ...base, codeSnippet: raw.codeSnippet, buggyLineNumber: Number(raw.buggyLineNumber), bugExplanation: raw.bugExplanation || '' };
    }
    case 'complete_code': {
      if (!raw.codeSnippet || !Array.isArray(raw.blanks) || !raw.blanks.length) return null;
      return { ...base, codeSnippet: raw.codeSnippet, blanks: raw.blanks.map((b: any, i: number) => ({ id: b.id || `b${i + 1}`, acceptedAnswers: (b.acceptedAnswers || []).map(String), caseSensitive: !!b.caseSensitive })) };
    }
    case 'predict_output': {
      if (!raw.codeSnippet) return null;
      const lang = toLang(base.language, spec.type);
      const out = await runForOutput(raw.codeSnippet, lang, '');
      const expectedOutput = out != null ? out : norm(String(raw.expectedOutput || ''));
      if (!expectedOutput) return null; // couldn't determine a trustworthy answer
      return { ...base, codeSnippet: raw.codeSnippet, expectedOutput };
    }
    case 'live_code':
    case 'sql': {
      if (!raw.referenceSolution || !Array.isArray(raw.testCases) || !raw.testCases.length) return null;
      const lang = toLang(base.language, spec.type);
      const validated: any[] = [];
      for (const tc of raw.testCases) {
        const out = await runForOutput(raw.referenceSolution, lang, tc.input || '');
        if (out == null) continue; // reference broke on this input → drop the test
        validated.push({ input: tc.input || '', expectedOutput: out, hidden: tc.hidden !== false, weight: 1 });
      }
      if (!validated.length) return null; // reference never ran cleanly → discard item
      return { ...base, starterCode: raw.starterCode || '', testCases: validated };
    }
    default:
      return null;
  }
}

/**
 * Generate (and optionally persist) validated items for a spec.
 * Returns the items actually created.
 */
export async function generateItems(tenantId: string, spec: GenSpec, opts: { persist?: boolean } = {}): Promise<any[]> {
  if (!client || spec.count <= 0) return [];
  let raws: any[] = [];
  try { raws = await callClaude(spec); } catch { return []; }

  const finalized: any[] = [];
  for (const raw of raws.slice(0, spec.count + 2)) {
    try {
      const item = await finalizeItem(raw, spec);
      if (item) finalized.push(item);
    } catch { /* skip bad item */ }
    if (finalized.length >= spec.count) break;
  }

  if (!finalized.length) return [];
  if (opts.persist) {
    const docs = finalized.map((f) => ({ ...f, tenantId, createdBy: 'ai-generator', createdAt: new Date(), updatedAt: new Date() }));
    const created = await AssessmentItem.insertMany(docs);
    return created;
  }
  return finalized;
}

/**
 * Ensure the tenant's bank has enough active items for every cell of a blueprint
 * (type × dimension × difficulty band); AI-generates + validates the shortfall.
 * Best-effort, returns how many items were created. Used to warm the bank in the
 * background after a candidate's exam is designed.
 */
export async function ensureBankCoverage(
  tenantId: string,
  blueprint: any,
  opts: { language?: string; context?: string } = {}
): Promise<number> {
  if (!client || !blueprint?.stages?.length) return 0;
  let generated = 0;
  for (const stage of blueprint.stages) {
    const band: [number, number] = Array.isArray(stage.difficultyBand) && stage.difficultyBand.length === 2
      ? [stage.difficultyBand[0], stage.difficultyBand[1]] : [2, 3];
    for (const m of stage.mix || []) {
      const have = await AssessmentItem.countDocuments({
        tenantId, active: true, type: m.type, dimension: m.dimension,
        difficulty: { $gte: band[0], $lte: band[1] },
      });
      const need = (m.count || 1) + 1; // small buffer for variety
      if (have >= need) continue;
      const mid = Math.round((band[0] + band[1]) / 2);
      const items = await generateItems(
        tenantId,
        { type: m.type, dimension: m.dimension, difficulty: mid, language: opts.language, count: need - have, context: opts.context },
        { persist: true }
      );
      generated += items.length;
    }
  }
  return generated;
}
