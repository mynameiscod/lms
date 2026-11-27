import mongoose from 'mongoose';
import { IPoolExam, IPoolExamSection } from '../models/Assignment';
import { Actor } from './problemBankService';
import { poolsForExam } from './questionPoolService';

/**
 * Pool exams — the setup side: cleaning what the form sends, and checking that the pools can fill
 * every student's paper before anyone is allowed to sit it.
 *
 * ── WHY THE CHECK COUNTS POOLS, NOT SECTIONS ───────────────────────────────────────────────
 * Two sections may draw on the same pool ("2 easy" in Part A, "1 easy" in Part B). A student must
 * never get the same question twice, so the draw takes them without overlap, and the check has to
 * add up what every section asks of a pool. Checking each section alone would pass a pool with two
 * easy questions against a demand of three, and the third student's Start would fail.
 */

export const MAX_SECTIONS = 20;
const MAX_PER_LEVEL = 200;
const LEVELS = ['easy', 'medium', 'hard'] as const;

const int = (v: any, max: number) => Math.min(Math.max(Math.floor(Number(v) || 0), 0), max);

/** The form's sections, cleaned: known fields only, whole numbers, unique keys, valid pool ids. */
export function normalizeSections(raw: any): IPoolExamSection[] {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_SECTIONS) : [];
  const used = new Set<string>();
  return list.filter(s => mongoose.isValidObjectId(s?.poolId)).map((s, i) => {
    let key = String(s?.key || '').trim().slice(0, 40) || `s${i + 1}`;
    while (used.has(key)) key = `${key}_${i + 1}`;
    used.add(key);
    return {
      key,
      title: String(s?.title || '').trim().slice(0, 120) || `Section ${i + 1}`,
      poolId: new mongoose.Types.ObjectId(String(s.poolId)),
      easy: int(s?.easy, MAX_PER_LEVEL), medium: int(s?.medium, MAX_PER_LEVEL), hard: int(s?.hard, MAX_PER_LEVEL), any: int(s?.any, MAX_PER_LEVEL),
      marksPerQuestion: Math.min(Math.max(Number(s?.marksPerQuestion) || 0, 0), 1000),
    };
  });
}

export const sectionCount = (s: Pick<IPoolExamSection, 'easy' | 'medium' | 'hard' | 'any'>) => s.easy + s.medium + s.hard + s.any;
export const examTotalMarks = (sections: IPoolExamSection[]) =>
  Math.round(sections.reduce((n, s) => n + sectionCount(s) * s.marksPerQuestion, 0) * 100) / 100;

/** Everything the form sends for an exam, cleaned, with the rules defaulted. */
export function normalizePoolExam(raw: any): IPoolExam {
  const t = raw?.tabSwitch || {};
  return {
    sections: normalizeSections(raw?.sections),
    durationMinutes: int(raw?.durationMinutes ?? 60, 24 * 60),
    maxAttempts: int(raw?.maxAttempts ?? 1, 100),
    preferUnseen: raw?.preferUnseen !== false,
    tabSwitch: { enabled: t.enabled !== false, maxWarnings: Math.max(int(t.maxWarnings ?? 3, 50), 1), autoSubmit: t.autoSubmit !== false },
    blockCopyPaste: raw?.blockCopyPaste !== false,
    showResultsImmediately: raw?.showResultsImmediately === true,
    resultsReleasedAt: raw?.resultsReleasedAt ? new Date(raw.resultsReleasedAt) : null,
  };
}

export interface SectionCheck {
  key: string; title: string; poolId: string; poolName: string; kind: string;
  questions: number; marks: number;
  /** '' when this section can be filled for every student. */
  problem: string;
}

export interface ExamCheck { ok: boolean; totalQuestions: number; totalMarks: number; sections: SectionCheck[]; problems: string[] }

/** Can these pools fill these sections for every student? Says exactly what is short, and where. */
export async function checkPoolExam(a: Actor, rawSections: any): Promise<ExamCheck> {
  const sections = Array.isArray(rawSections) && rawSections.length && rawSections[0]?.poolId instanceof mongoose.Types.ObjectId
    ? rawSections as IPoolExamSection[] : normalizeSections(rawSections);
  const pools = await poolsForExam(a, sections.map(s => String(s.poolId)));
  const problems: string[] = [];
  if (!sections.length) problems.push('Add at least one section.');

  const checks: SectionCheck[] = sections.map(s => {
    const pool = pools.get(String(s.poolId));
    return {
      key: s.key, title: s.title, poolId: String(s.poolId), poolName: pool?.name || '(pool not found)', kind: pool?.kind || '',
      questions: sectionCount(s), marks: sectionCount(s) * s.marksPerQuestion,
      problem: !pool ? 'Its pool no longer exists.' : !sectionCount(s) ? 'Asks for no questions.' : '',
    };
  });

  // What every section together asks of each pool, against what the pool can give.
  const byPool = new Map<string, IPoolExamSection[]>();
  sections.forEach(s => { const k = String(s.poolId); byPool.set(k, [...(byPool.get(k) || []), s]); });
  for (const [poolId, group] of byPool) {
    const pool = pools.get(poolId);
    if (!pool) continue;
    const need = { easy: 0, medium: 0, hard: 0, any: 0 };
    group.forEach(s => { need.easy += s.easy; need.medium += s.medium; need.hard += s.hard; need.any += s.any; });
    const short: string[] = LEVELS.filter(l => need[l] > pool.counts[l]).map(l => `${need[l]} ${l} but it has ${pool.counts[l]}`);
    const spare = pool.counts.usable - Math.min(need.easy, pool.counts.easy) - Math.min(need.medium, pool.counts.medium) - Math.min(need.hard, pool.counts.hard);
    if (need.any > spare) short.push(`${need.any} at any level but only ${Math.max(spare, 0)} are left after the per-level picks`);
    if (!short.length) continue;
    const who = group.length > 1 ? `Sections ${group.map(s => `"${s.title}"`).join(' and ')} together need` : 'Needs';
    const msg = `${who} ${short.join('; ')} in "${pool.name}".`;
    checks.filter(c => c.poolId === poolId && !c.problem).forEach(c => { c.problem = msg; });
  }

  checks.filter(c => c.problem).forEach(c => problems.push(`${c.title}: ${c.problem}`));
  return {
    ok: !problems.length,
    totalQuestions: checks.reduce((n, c) => n + c.questions, 0),
    totalMarks: examTotalMarks(sections),
    sections: checks,
    problems: Array.from(new Set(problems)),
  };
}
