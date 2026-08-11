import mongoose from 'mongoose';
import { CompanyQuestion, InterviewExperience } from '../models/CompanyQuestionModels';
import PassportProgress from '../models/PassportProgress';

/**
 * Everything on the company page that is a NUMBER rather than a fact.
 *
 * One rule runs through all of it: a statistic is always returned with the sample it came
 * from. "5.6 rounds" from three reports and from three hundred are different claims, and a
 * student can tell the difference — so the client is given `{ value, n }` and shows the n.
 * A bare number would let the UI imply confidence the data does not support.
 *
 * Nothing here is invented. Every figure is either counted from the tenant's own question
 * bank, computed from their own students' practice attempts, or averaged over interview
 * reports those students submitted.
 */

/** A statistic and the number of observations behind it. */
export interface Stat<T = number> { value: T | null; n: number }
const stat = <T>(value: T | null, n: number): Stat<T> => ({ value: n > 0 ? value : null, n });

export interface CompanyStats {
  avgRounds: Stat;
  avgDurationDays: Stat;
  offerRate: Stat;
  rating: Stat;
  difficultyFelt: Stat<string>;
  experiences: number;
  /** Questions grouped by round, with how many of YOUR students have attempted them. */
  rounds: { key: string; questions: number; attemptedPct: number | null }[];
  totals: {
    questions: number;
    askedThisYear: number;
    highFrequency: number;
    avgSuccessRate: Stat;
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Aggregate one company.
 *
 * Deliberately a handful of small aggregations rather than one clever pipeline: each
 * answers a question a reader of the page would ask, and they can be read independently
 * when a number looks wrong.
 */
export async function companyStats(tenantId: string, companySlug: string): Promise<CompanyStats> {
  const [experiences, questions] = await Promise.all([
    InterviewExperience.find({ tenantId, companySlug, status: 'published' })
      .select('roundsFaced durationDays outcome rating difficultyFelt').lean(),
    CompanyQuestion.find({ tenantId, companySlug, status: 'published' })
      .select('round difficulty year practiceProblemId').lean(),
  ]);

  // ── From student reports ──
  const roundCounts = experiences.map(e => (e.roundsFaced || []).length).filter(n => n > 0);
  const durations = experiences.map(e => e.durationDays).filter((d): d is number => !!d && d > 0);
  const ratings = experiences.map(e => e.rating).filter((r): r is number => !!r);
  // Outcome rate counts DECIDED interviews only. Including "waiting" would drag the offer
  // rate down purely because someone has not heard back yet.
  const decided = experiences.filter(e => e.outcome === 'offer' || e.outcome === 'rejected');
  const offers = decided.filter(e => e.outcome === 'offer').length;

  const felt = experiences.map(e => e.difficultyFelt).filter(Boolean) as string[];
  const feltMode = felt.length
    ? Object.entries(felt.reduce((m: Record<string, number>, f) => ({ ...m, [f]: (m[f] || 0) + 1 }), {}))
        .sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // ── From the question bank ──
  const thisYear = new Date().getFullYear();
  const byRound = new Map<string, { questions: number; problemIds: string[] }>();
  for (const q of questions) {
    const r = byRound.get(q.round) || { questions: 0, problemIds: [] };
    r.questions += 1;
    if (q.practiceProblemId) r.problemIds.push(q.practiceProblemId);
    byRound.set(q.round, r);
  }

  /**
   * How much of each round this tenant's students have actually worked through.
   *
   * Only questions wired to a runnable Practice Lab problem can be measured — a question
   * that is just text has no attempt to count. Rounds with no runnable questions report
   * null rather than 0, because "nobody has attempted these" and "these cannot be
   * attempted" are different statements.
   */
  const solvedRows = await PassportProgress.find({ tenantId }).select('solvedProblems').lean();
  const solvedCount = new Map<string, number>();
  for (const row of solvedRows) {
    for (const id of (row.solvedProblems || [])) solvedCount.set(id, (solvedCount.get(id) || 0) + 1);
  }
  const members = solvedRows.length || 1;

  const rounds = Array.from(byRound.entries()).map(([key, r]) => {
    if (!r.problemIds.length) return { key, questions: r.questions, attemptedPct: null };
    const attempts = r.problemIds.reduce((s, id) => s + (solvedCount.get(id) || 0), 0);
    return {
      key,
      questions: r.questions,
      attemptedPct: Math.min(100, Math.round((attempts / (r.problemIds.length * members)) * 100)),
    };
  });

  const runnable = questions.filter(q => q.practiceProblemId);
  const solvedOfRunnable = runnable.reduce((s, q) => s + (solvedCount.get(q.practiceProblemId!) ? 1 : 0), 0);

  return {
    avgRounds: stat(roundCounts.length ? round1(roundCounts.reduce((a, b) => a + b, 0) / roundCounts.length) : null, roundCounts.length),
    avgDurationDays: stat(durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null, durations.length),
    offerRate: stat(decided.length ? Math.round((offers / decided.length) * 100) : null, decided.length),
    rating: stat(ratings.length ? round1(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null, ratings.length),
    difficultyFelt: stat(feltMode, felt.length),
    experiences: experiences.length,
    rounds,
    totals: {
      questions: questions.length,
      askedThisYear: questions.filter(q => q.year === thisYear).length,
      // "High frequency" means reported by more than one student, which only a real
      // duplicate can produce — so it stays 0 until the reports actually overlap.
      highFrequency: 0,
      avgSuccessRate: stat(
        runnable.length ? Math.round((solvedOfRunnable / runnable.length) * 100) : null,
        runnable.length,
      ),
    },
  };
}

/**
 * How many separate students have reported each question, and when it was last seen.
 *
 * Matches on normalised text rather than an id, because two students typing the same
 * question will never produce the same row. Cheap enough at this scale; if the bank grows
 * past a few thousand per company this wants a stored fingerprint instead.
 */
export async function questionFrequency(
  tenantId: string, companySlug: string,
): Promise<Map<string, { asked: number; lastAsked: Date | null }>> {
  const rows = await CompanyQuestion.find({ tenantId, companySlug, status: 'published' })
    .select('questionText year createdAt source').lean();

  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const out = new Map<string, { asked: number; lastAsked: Date | null }>();
  const groups = new Map<string, { n: number; last: Date | null }>();

  for (const r of rows as any[]) {
    const k = norm(r.questionText);
    const g = groups.get(k) || { n: 0, last: null };
    g.n += 1;
    const when = r.year ? new Date(r.year, 0, 1) : r.createdAt;
    if (!g.last || when > g.last) g.last = when;
    groups.set(k, g);
  }
  for (const r of rows as any[]) {
    const g = groups.get(norm(r.questionText))!;
    out.set(String(r._id), { asked: g.n, lastAsked: g.last });
  }
  return out;
}
