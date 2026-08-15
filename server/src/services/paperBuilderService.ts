/**
 * Paper builder — turns the question bank into ONE member's paper.
 *
 * Three requirements pull against each other, and the design is mostly about holding
 * them together:
 *
 *   1. The paper must fit the member (stage, goal, background). Handled upstream by
 *      appliesToMember; this service receives only questions already eligible.
 *   2. Two members with the SAME profile should not sit the same paper. Otherwise the
 *      assessment is a fixed test that circulates among a batch within a week.
 *   3. Their scores must still be comparable. This is the one that quietly breaks if you
 *      only chase (2): if the draw varies the CATEGORY MIX as well as the questions, one
 *      member gets four aptitude questions and another four technical, and their two
 *      "68/100" do not mean the same thing — so the leaderboard and the percentile become
 *      fiction.
 *
 * The resolution is a blueprint: an admin fixes the SHAPE per segment (how many from each
 * category) and the draw varies only WHICH questions fill each slot. Same shape, same
 * difficulty spread, different paper.
 *
 * Determinism: the draw is seeded from the member and their attempt number, not from the
 * clock. Refreshing mid-assessment therefore returns the identical paper — a reshuffle
 * there would lose their answers and look like data loss — while a retake seeds
 * differently and produces a genuinely new paper.
 */

import { IPassportQuestion, IPaperBlueprint, PASSPORT_CATEGORIES } from '../models/PassportAssessment';

/* ── Seeded RNG ──────────────────────────────────────────────────────────────
   Math.random() cannot be used: the paper must be reproducible for the same
   member and attempt, or every page refresh serves a different test. */

/**
 * Exported so the personalised generator (Module 6) draws with the SAME primitives rather
 * than a second implementation. Two deterministic shufflers in one codebase would drift,
 * and the fairness guarantees each one carries would stop being the same guarantee.
 */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, and good enough for shuffling a question list. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates. Sorting by a random comparator is biased and produces lopsided papers. */
export function shuffle<T>(list: T[], rand: () => number): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The blueprint for a member. Most specific wins: one naming both stage and goal beats
 * one naming only a stage, which beats a catch-all. Absent fields mean "any", so a single
 * blueprint with neither set is a sensible default for a tenant that has not configured
 * segments yet.
 */
export function blueprintFor(
  blueprints: IPaperBlueprint[] | undefined,
  member: { stage?: string | null; careerGoal?: string | null },
): IPaperBlueprint | null {
  const list = (blueprints || []).filter(b => b.slots?.length);
  if (!list.length) return null;

  const matches = list.filter(b =>
    (!b.stage || b.stage === member.stage) &&
    (!b.goal || b.goal === member.careerGoal));
  if (!matches.length) return null;

  const specificity = (b: IPaperBlueprint) => (b.stage ? 2 : 0) + (b.goal ? 1 : 0);
  return matches.slice().sort((a, b) => specificity(b) - specificity(a))[0];
}

export interface DrawReport {
  /** Slots that could not be filled — the pool for that category was too small. */
  short: { category: string; wanted: number; got: number }[];
  total: number;
}

/**
 * Fill a blueprint from the eligible pool.
 *
 * A slot asking for more questions than the pool holds takes everything available and is
 * REPORTED rather than silently shortened: a category quietly dropping from 4 questions
 * to 1 changes what the score measures, and an admin has no other way to notice.
 */
export function drawPaper(
  eligible: IPassportQuestion[],
  blueprint: IPaperBlueprint,
  seed: string,
): { paper: IPassportQuestion[]; report: DrawReport } {
  const rand = rng(hashSeed(seed));
  const byCat = new Map<string, IPassportQuestion[]>();
  for (const q of eligible) {
    const c = q.category || 'general';
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(q);
  }

  const picked: IPassportQuestion[] = [];
  const short: DrawReport['short'] = [];

  for (const slot of blueprint.slots) {
    const want = Math.max(0, Number(slot.count) || 0);
    if (!want) continue;
    const pool = byCat.get(String(slot.category)) || [];
    const take = shuffle(pool, rand).slice(0, want);
    if (take.length < want) short.push({ category: String(slot.category), wanted: want, got: take.length });
    picked.push(...take);
  }

  // Present in the bank's own order, so a paper reads coherently rather than jumping
  // between categories in whatever order the blueprint happened to list them.
  const order = new Map(eligible.map((q, i) => [String(q._id), i]));
  picked.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));

  return { paper: picked, report: { short, total: picked.length } };
}

/**
 * A starting blueprint derived from what the bank can actually support.
 *
 * Offered to admins rather than applied automatically — it is a reasonable default, not a
 * decision the product should make silently. Weighted towards the categories that carry
 * more of the score, and never asks for more than the pool holds.
 */
export function suggestBlueprint(eligible: IPassportQuestion[], size = 14): IPaperBlueprint {
  const counts = new Map<string, number>();
  for (const q of eligible) counts.set(q.category, (counts.get(q.category) || 0) + 1);

  const weightOf = (c: string) => PASSPORT_CATEGORIES.find(x => x.key === c)?.weight || 1;
  const present = PASSPORT_CATEGORIES.filter(c => (counts.get(c.key) || 0) > 0);
  const totalWeight = present.reduce((a, c) => a + weightOf(c.key), 0) || 1;

  const slots = present.map(c => ({
    category: c.key,
    count: Math.max(1, Math.min(counts.get(c.key) || 0, Math.round((weightOf(c.key) / totalWeight) * size))),
  }));

  // Rounding rarely lands on `size` exactly; trim or top up against real pool depth.
  let total = slots.reduce((a, s) => a + s.count, 0);
  const room = (s: { category: string; count: number }) => (counts.get(s.category) || 0) - s.count;
  while (total > size) {
    const s = slots.slice().sort((a, b) => b.count - a.count)[0];
    if (s.count <= 1) break;
    s.count--; total--;
  }
  while (total < size && slots.some(s => room(s) > 0)) {
    const s = slots.filter(x => room(x) > 0).sort((a, b) => room(b) - room(a))[0];
    s.count++; total++;
  }

  return { label: 'Suggested', slots };
}
