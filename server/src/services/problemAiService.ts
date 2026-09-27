import Anthropic from '@anthropic-ai/sdk';
import { getAnthropic } from './aiClients';
import { recordUsage } from './aiGateway';
import * as settings from './settingsService';
import { PB_LANGUAGE_KEYS, PB_TOPICS } from '../config/problemBankTaxonomy';
import { generateExpectedOutputs, judge } from './problemJudgeService';
import { normalizeInput, PbError, ProblemInput } from './problemBankService';

/**
 * AI problem generation.
 *
 * Claude writes the statement, the test INPUTS and a reference solution per language. It does
 * not get to decide the expected outputs: those come from running the first solution on the
 * judge, and every other language's solution is then judged against them. A language whose
 * solution disagrees is kept as a starter only and reported — so nothing reaches the bank whose
 * answers were guessed by a model.
 *
 * Nothing is saved here. The author reviews the drafts in the studio and saves the ones they want.
 */

const MODEL = () => settings.getStr('PROBLEM_GEN_MODEL', 'claude-opus-5');

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'statement', 'inputFormat', 'outputFormat', 'constraints', 'difficulty', 'topics', 'hints', 'editorial', 'tests', 'languages'],
  properties: {
    title: { type: 'string' },
    statement: { type: 'string', description: 'Markdown. The story and the task. No input/output format here.' },
    inputFormat: { type: 'string' },
    outputFormat: { type: 'string' },
    constraints: { type: 'string' },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
    topics: { type: 'array', items: { type: 'string' } },
    hints: { type: 'array', items: { type: 'string' } },
    editorial: { type: 'string', description: 'Markdown explanation of the intended approach and its complexity.' },
    tests: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['input', 'isSample', 'explanation'],
        properties: {
          input: { type: 'string', description: 'Exact stdin, newline separated.' },
          isSample: { type: 'boolean' },
          explanation: { type: 'string' },
        },
      },
    },
    languages: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['language', 'starterCode', 'solutionCode'],
        properties: {
          language: { type: 'string', enum: PB_LANGUAGE_KEYS },
          starterCode: { type: 'string', description: 'Complete program skeleton that reads stdin; the solver fills in the logic.' },
          solutionCode: { type: 'string', description: 'Complete, correct program reading stdin and printing to stdout.' },
        },
      },
    },
  },
} as const;

export interface AiSpec {
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  languages: string[];
  count: number;
  instructions?: string;
  avoidTitles?: string[];
}

function prompt(spec: AiSpec, index: number): string {
  const topicLabel = PB_TOPICS.find((t) => t.key === spec.topic)?.label || spec.topic;
  return [
    `Write one original ${spec.difficulty} programming problem on the topic "${topicLabel}" for a coding-practice platform used by Indian engineering students preparing for placements.`,
    spec.instructions ? `Author's instructions: ${spec.instructions}` : '',
    spec.avoidTitles?.length ? `It must differ from these existing problems: ${spec.avoidTitles.slice(0, 40).join('; ')}.` : '',
    spec.count > 1 ? `This is problem ${index + 1} of ${spec.count} in a set — make it clearly different from typical variants of the same idea.` : '',
    '',
    'Rules:',
    '- The problem must be original. Do not copy or closely paraphrase problems from LeetCode, HackerRank, Codeforces or any other platform.',
    '- Programs read from standard input and write to standard output. No function-signature style.',
    '- Output must be deterministic and have exactly one correct answer (no "print any valid answer").',
    `- Provide 2 sample tests (isSample true) and 8 hidden tests covering edge cases: minimums, maximums within the constraints, duplicates, negatives where allowed, and at least one large input. Keep each input under 20 KB.`,
    `- Provide languages entries for exactly: ${spec.languages.join(', ')}. Each solutionCode is a full program that passes every test within 2 seconds. Java must use "public class Main".`,
    '- starterCode reads the input exactly as the format describes and leaves a clear TODO where the logic goes.',
    `- topics: choose from ${PB_TOPICS.map((t) => t.key).join(', ')}.`,
    '- Do not include expected outputs anywhere; they are computed by running your solution.',
  ].filter(Boolean).join('\n');
}

async function callModel(spec: AiSpec, index: number, tenantId: string): Promise<any> {
  const client = getAnthropic();
  if (!client) throw new PbError('AI is not configured — add an Anthropic API key in Platform Settings.', 503);
  const params: any = {
    model: MODEL(),
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: { type: 'json_schema', schema: SCHEMA } },
    system: 'You are an experienced competitive-programming problem setter. You write precise, unambiguous statements and correct reference solutions.',
    messages: [{ role: 'user', content: prompt(spec, index) }],
  };
  // Server-side refusal fallback: if the primary model declines, the API re-runs on a fallback
  // model within the same call. Retried without it if this account/API rejects the parameter.
  let msg: any;
  try {
    msg = await (client.beta.messages as any)
      .stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      .finalMessage();
  } catch (e: any) {
    if (e instanceof Anthropic.BadRequestError && /fallback/i.test(e.message)) {
      msg = await client.messages.stream(params).finalMessage();
    } else throw e;
  }
  await recordUsage({
    tenantId, module: 'problem_gen', provider: 'anthropic', model: MODEL(),
    inputTokens: msg.usage?.input_tokens || 0, outputTokens: msg.usage?.output_tokens || 0,
  });
  if (msg.stop_reason === 'refusal') throw new PbError('The AI declined to write this problem. Try different instructions.');
  if (msg.stop_reason === 'max_tokens') throw new PbError('The AI response was cut off. Try fewer languages.');
  const text = (msg.content as any[]).filter((b) => b.type === 'text').map((b) => b.text).join('');
  try { return JSON.parse(text); } catch { throw new PbError('The AI returned something that was not valid JSON. Try again.'); }
}

export interface AiDraft {
  draft: ProblemInput;
  report: { language: string; status: 'reference' | 'passed' | 'failed'; message?: string }[];
  warnings: string[];
  error?: string;
}

async function buildDraft(spec: AiSpec, index: number, tenantId: string): Promise<AiDraft> {
  const g = await callModel(spec, index, tenantId);
  const langs: any[] = (g.languages || []).filter((l: any) => PB_LANGUAGE_KEYS.includes(l.language) && l.solutionCode?.trim());
  if (!langs.length) throw new PbError('The AI returned no usable solution.');

  // Prefer a fast-starting language as the source of truth.
  const order = ['python', 'cpp', 'javascript', 'java', 'go', 'c', 'rust', 'csharp', 'typescript'];
  langs.sort((a, b) => order.indexOf(a.language) - order.indexOf(b.language));
  const reference = langs[0];

  const baseProblem: any = { kind: 'code', languages: langs.map((l) => ({ language: l.language, solutionCode: l.solutionCode })), limits: { timeMs: 2000 } };
  const inputs = (g.tests || []).map((t: any) => String(t.input ?? ''));
  const { outputs, failures } = await generateExpectedOutputs(baseProblem, reference.language, reference.solutionCode, inputs);
  const tests = (g.tests || []).map((t: any, i: number) => ({
    input: inputs[i], expectedOutput: outputs[i] ?? '', isSample: !!t.isSample, explanation: t.explanation || '',
  })).filter((_: any, i: number) => outputs[i] !== null);
  if (tests.length < 3) throw new PbError(`The reference solution failed on most tests (${failures[0]?.error || 'unknown error'}).`);
  if (!tests.some((t: any) => t.isSample)) tests[0].isSample = true;

  const report: AiDraft['report'] = [{ language: reference.language, status: 'reference' }];
  const warnings: string[] = [];
  if (failures.length) warnings.push(`${failures.length} generated test(s) were dropped because the reference solution could not run them.`);

  const kept: any[] = [{ language: reference.language, starterCode: reference.starterCode || '', solutionCode: reference.solutionCode }];
  for (const l of langs.slice(1)) {
    const r = await judge(baseProblem, l.language, l.solutionCode, tests, { revealHidden: true });
    if (r.verdict === 'AC') {
      report.push({ language: l.language, status: 'passed' });
      kept.push({ language: l.language, starterCode: l.starterCode || '', solutionCode: l.solutionCode });
    } else {
      const bad = r.cases.find((c) => !c.passed);
      report.push({ language: l.language, status: 'failed', message: `${r.verdict} on test ${bad ? bad.index + 1 : '?'}` });
      // Keep the starter so the language stays available; drop the untrusted solution.
      kept.push({ language: l.language, starterCode: l.starterCode || '', solutionCode: '' });
    }
  }

  const draft: ProblemInput = {
    title: g.title, statement: g.statement, inputFormat: g.inputFormat, outputFormat: g.outputFormat,
    constraints: g.constraints, difficulty: g.difficulty || spec.difficulty, topics: [spec.topic, ...(g.topics || [])],
    hints: g.hints || [], editorial: g.editorial || '', languages: kept, tests,
  };
  const n = normalizeInput(draft);
  return { draft, report, warnings: [...warnings, ...n.warnings] };
}

export async function generateProblems(spec: AiSpec, tenantId: string): Promise<AiDraft[]> {
  const count = Math.min(Math.max(Number(spec.count) || 1, 1), 5);
  const languages = (spec.languages || []).filter((l) => PB_LANGUAGE_KEYS.includes(l)).slice(0, 5);
  if (!languages.length) throw new PbError('Choose at least one language.');
  const out: AiDraft[] = [];
  for (let i = 0; i < count; i++) {
    try {
      out.push(await buildDraft({ ...spec, languages, count, avoidTitles: [...(spec.avoidTitles || []), ...out.map((d) => d.draft.title)] }, i, tenantId));
    } catch (e: any) {
      out.push({ draft: { title: `Draft ${i + 1}` }, report: [], warnings: [], error: e?.message || 'Generation failed' });
    }
  }
  return out;
}
