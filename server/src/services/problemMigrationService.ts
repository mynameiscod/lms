import mongoose from 'mongoose';
import CodingProblem from '../models/CodingProblem';
import ThinkingProblem from '../models/ThinkingProblem';
import AssessmentItem from '../models/AssessmentItem';
import Assignment from '../models/Assignment';
import { Actor, createProblem, ProblemInput, queueVerification } from './problemBankService';
import { normalizeLanguage, normalizeTopic } from '../config/problemBankTaxonomy';

/**
 * Bring the coding problems scattered across the older modules into the Problem Bank.
 *
 * Idempotent: every copy records `legacyRef {model, id}` under a unique index, so running it
 * again only picks up what is new. Copies land as DRAFTS in the institute that owned them — an
 * author reviews them, and a super admin can promote the good ones to the global library.
 * The source records are not touched; retiring the old modules is a separate, later step.
 */

const SOURCES = ['ThinkingProblem', 'AssessmentItem', 'Assignment'] as const;
type Source = typeof SOURCES[number];

const firstLine = (s: string, n = 90) => {
  const line = String(s || '').replace(/[#*`_>]/g, '').split('\n').map((l) => l.trim()).find(Boolean) || 'Untitled problem';
  return line.length > n ? `${line.slice(0, n - 1)}…` : line;
};

function fromThinking(p: any): ProblemInput {
  const lang = normalizeLanguage(p.language) || 'javascript';
  return {
    title: p.title,
    statement: p.statement,
    constraints: p.constraints || '',
    hints: p.hints || [],
    difficulty: p.difficulty,
    topics: [normalizeTopic(p.category) || '', ...(p.tags || [])].filter(Boolean),
    tags: [p.category, ...(p.tags || [])].filter(Boolean),
    languages: [{ language: lang, starterCode: p.starterCode || '', solutionCode: p.referenceSolution || '' }],
    tests: [
      ...(p.examples || []).map((e: any) => ({ input: e.input, expectedOutput: e.expectedOutput, isSample: true, explanation: e.explanation })),
      ...(p.testCases || []).map((t: any) => ({ input: t.input, expectedOutput: t.expectedOutput, isSample: t.hidden === false })),
    ],
  };
}

function fromAssessmentItem(p: any): ProblemInput {
  const sql = p.type === 'sql';
  const lang = sql ? 'sql' : normalizeLanguage(p.language) || 'javascript';
  const tests = (p.testCases || []).map((t: any) => ({ input: t.input, expectedOutput: t.expectedOutput, isSample: t.hidden === false, weight: t.weight }));
  if (tests.length && !tests.some((t: any) => t.isSample)) tests[0].isSample = true;
  return {
    title: firstLine(p.prompt),
    kind: sql ? 'sql' : 'code',
    statement: p.prompt,
    difficulty: p.difficulty,
    topics: (p.tags || []).map((t: string) => normalizeTopic(t)).filter(Boolean) as string[],
    tags: [p.dimension, ...(p.tags || [])].filter(Boolean),
    languages: [{ language: lang, starterCode: p.starterCode || '', solutionCode: '' }],
    tests,
  };
}

function fromAssignment(p: any): ProblemInput {
  const langs = (p.starterCode || []).map((s: any) => ({
    language: String(s.language), starterCode: s.code || '', solutionCode: s.solutionCode || '',
  }));
  for (const l of p.allowedLanguages || []) if (!langs.some((x: any) => x.language === l)) langs.push({ language: l, starterCode: '', solutionCode: '' });
  return {
    title: p.title,
    statement: [p.description, p.instructions].filter(Boolean).join('\n\n'),
    difficulty: p.difficulty,
    marks: p.totalPoints,
    topics: (p.topics || []).map((t: string) => normalizeTopic(t)).filter(Boolean) as string[],
    tags: [...(p.topics || []), ...(p.tags || []), p.primaryTech].filter(Boolean),
    hints: p.hints || [],
    comparisonMode: p.comparisonMode,
    languages: langs,
    tests: (p.testCases || []).map((t: any) => ({ input: t.input, expectedOutput: t.expectedOutput, isSample: !t.isHidden, weight: t.weight, explanation: t.description })),
  };
}

async function sourceDocs(source: Source, tenantId: string) {
  if (source === 'ThinkingProblem') return ThinkingProblem.find({ tenantId, active: { $ne: false } }).lean();
  if (source === 'AssessmentItem') return AssessmentItem.find({ tenantId, type: { $in: ['live_code', 'sql'] }, active: { $ne: false } }).lean();
  const tid = mongoose.isValidObjectId(tenantId) ? new mongoose.Types.ObjectId(tenantId) : null;
  if (!tid) return [];
  return Assignment.find({ tenant: tid, type: 'coding', 'testCases.0': { $exists: true } }).lean();
}

const MAP: Record<Source, (p: any) => ProblemInput> = {
  ThinkingProblem: fromThinking, AssessmentItem: fromAssessmentItem, Assignment: fromAssignment,
};

/** What each old module holds for this institute, and how much of it is already in the bank. */
export async function migrationSummary(tenantId: string) {
  const out: { source: Source; label: string; total: number; imported: number }[] = [];
  const labels: Record<Source, string> = {
    ThinkingProblem: 'Thinking Lab problems', AssessmentItem: 'Exam bank coding & SQL items', Assignment: 'Coding assignments',
  };
  for (const s of SOURCES) {
    const docs: any[] = await sourceDocs(s, tenantId);
    const imported = docs.length
      ? await CodingProblem.countDocuments({ 'legacyRef.model': s, 'legacyRef.id': { $in: docs.map((d) => String(d._id)) } })
      : 0;
    out.push({ source: s, label: labels[s], total: docs.length, imported });
  }
  return out;
}

export async function runMigration(a: Actor, sources: string[]) {
  const picked = SOURCES.filter((s) => !sources?.length || sources.includes(s));
  const result: Record<string, { created: number; skipped: number; errors: string[] }> = {};
  for (const s of picked) {
    const docs: any[] = await sourceDocs(s, a.tenantId);
    const done = new Set((await CodingProblem.find({ 'legacyRef.model': s, 'legacyRef.id': { $in: docs.map((d) => String(d._id)) } }, { 'legacyRef.id': 1 }).lean())
      .map((d: any) => d.legacyRef.id));
    const r = { created: 0, skipped: 0, errors: [] as string[] };
    for (const d of docs) {
      if (done.has(String(d._id))) { r.skipped++; continue; }
      try {
        const input = MAP[s](d);
        if (!String(input.title || '').trim()) input.title = 'Untitled problem';
        const { problem } = await createProblem(a, { ...input, scope: 'tenant', status: 'draft' }, 'migrated', { model: s, id: String(d._id) });
        r.created++;
        if (problem.languages.some((l) => l.solutionCode.trim())) await queueVerification(null, String(problem._id)).catch(() => undefined);
      } catch (e: any) {
        if (r.errors.length < 20) r.errors.push(`${firstLine(d.title || d.prompt, 50)}: ${e?.message}`);
      }
    }
    result[s] = r;
  }
  return result;
}
