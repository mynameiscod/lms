import crypto from 'crypto';
import mongoose from 'mongoose';
import AssessmentItem from '../models/AssessmentItem';
import { IExamSection, IHackathonExam } from '../models/HackathonExam';
import { IDrawnItem } from '../models/HackathonExamAttempt';

/**
 * Compose one candidate's paper from the bank.
 *
 * ── A DIFFERENT DRAW PER PERSON, NOT PER EXAM ─────────────────────────────────────────────
 *
 * Teammates share a team score, so they are actively motivated to help each other. Handing the
 * same thirty questions to four people who are on the same side is an answer-sharing exercise
 * with extra steps. Every member gets their own draw from the same pool, which keeps the paper
 * comparable in shape and difficulty while making "tell me number 12" useless.
 *
 * ── SEEDED, SO A DRAW CAN BE EXPLAINED AFTERWARDS ─────────────────────────────────────────
 *
 * `Math.random()` gives a paper nobody can reproduce. When a candidate disputes a question, or
 * a question turns out to be broken and its marks have to be voided, somebody has to answer
 * "what exactly did this person sit, and why". The seed makes the selection deterministic and
 * auditable. The RESULT is still stored on the attempt — see that model for why recomputing
 * from the seed is not good enough once the bank has been edited.
 *
 * ── THE POOL IS LOADED ONCE, NOT ONCE PER CANDIDATE ───────────────────────────────────────
 *
 * Eight hundred candidates start within a few minutes of each other. A per-candidate query per
 * section would be thousands of identical scans against a 2,700-row bank at the worst possible
 * moment. The eligible ids are cached per (exam, section) for the length of the event and
 * shuffled in memory, which is the same thing loadBattleQuestions does and for the same reason.
 */

/** Deterministic 32-bit hash of a string, for seeding the generator. */
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * mulberry32 — small, fast, and good enough for choosing questions.
 *
 * Deliberately NOT crypto randomness: the whole point is that the same seed reproduces the
 * same paper. Unpredictability comes from the seed, which the candidate never sees.
 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates, driven by the seeded generator.
 *
 * `sort(() => rand() - 0.5)` is not a shuffle — the comparator is inconsistent, so some
 * orderings are far likelier than others. That matters here for the same reason it matters in
 * battleService: shuffling is being relied on to make two people's papers differ.
 */
function seededShuffle<T>(src: T[], rand: () => number): T[] {
  const a = src.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A fresh, unguessable seed for one attempt. */
export const newDrawSeed = (): string => crypto.randomBytes(12).toString('hex');

/** The bank query a section describes. Empty filters mean "no constraint on that axis". */
export function sectionFilter(tenantId: string, s: IExamSection): Record<string, any> {
  const f: Record<string, any> = {
    tenantId,
    active: true,
    type: { $in: s.types?.length ? s.types : ['mcq'] },
    difficulty: { $gte: s.minDifficulty ?? 1, $lte: s.maxDifficulty ?? 5 },
  };
  if (s.dimensions?.length) f.dimension = { $in: s.dimensions };
  if (s.tags?.length) f.tags = { $in: s.tags };
  if (s.languages?.length) f.language = { $in: s.languages };
  return f;
}

interface PoolEntry { at: number; items: { _id: any; type: string; points: number }[] }
const poolCache = new Map<string, PoolEntry>();
/** Long enough to cover an event, short enough that an admin edit lands without a restart. */
const POOL_TTL_MS = 2 * 60 * 1000;

export function clearDrawPoolCache(): void {
  poolCache.clear();
}

async function loadPool(tenantId: string, examId: string, s: IExamSection) {
  const key = `${examId}:${s.key}`;
  const hit = poolCache.get(key);
  if (hit && Date.now() - hit.at < POOL_TTL_MS) return hit.items;

  const items = await AssessmentItem
    .find(sectionFilter(tenantId, s))
    .select('_id type points')
    .lean() as any[];

  /*
   * Sorted by id before caching. The Mongo result order is not guaranteed stable across
   * queries, and an unstable pool would make the same seed produce different papers — which
   * quietly removes the reproducibility this service exists to provide.
   */
  const sorted = items
    .map(i => ({ _id: i._id, type: String(i.type), points: Number(i.points) || 1 }))
    .sort((a, b) => String(a._id).localeCompare(String(b._id)));

  poolCache.set(key, { at: Date.now(), items: sorted });
  return sorted;
}

export interface SectionCoverage {
  key: string;
  label: string;
  required: number;
  available: number;
  ok: boolean;
  /** Set when the bank cannot fill the section — the message an admin needs to act on. */
  problem?: string;
}

export interface DrawCoverage {
  ok: boolean;
  totalQuestions: number;
  totalMarks: number;
  sections: SectionCoverage[];
}

/**
 * Can this exam actually be drawn? Answered BEFORE invitations go out, not at the gun.
 *
 * A section asking for one live_code item from a bank holding none is a paper that hands a
 * candidate twenty-nine questions and no explanation. This is what the admin screen calls to
 * say so while it can still be fixed.
 */
export async function checkDrawCoverage(exam: IHackathonExam): Promise<DrawCoverage> {
  const sections: SectionCoverage[] = [];
  let totalQuestions = 0;
  let totalMarks = 0;

  for (const s of exam.sections || []) {
    const pool = await loadPool(String(exam.tenantId), String(exam._id), s);
    const available = pool.length;
    const required = s.drawCount;
    const ok = available >= required;

    let problem: string | undefined;
    if (!ok) {
      problem = available === 0
        ? `No active items match this section — check the type, tags, language and difficulty band.`
        : `Only ${available} item${available === 1 ? '' : 's'} match, and ${required} are needed.`;
    }

    sections.push({ key: s.key, label: s.label, required, available, ok, problem });
    totalQuestions += required;
    totalMarks += pool.slice(0, required).reduce(
      (sum, it) => sum + (s.marksPerItem > 0 ? s.marksPerItem : it.points), 0,
    );
  }

  return { ok: sections.every(s => s.ok), totalQuestions, totalMarks, sections };
}

/**
 * Draw one candidate's paper.
 *
 * Throws rather than short-drawing. A paper quietly missing its coding question would be
 * graded out of a different total from everyone else's and would poison the team average
 * without anyone noticing — a loud failure at start is the kinder outcome by a distance.
 */
export async function drawForAttempt(exam: IHackathonExam, seed: string): Promise<IDrawnItem[]> {
  const drawn: IDrawnItem[] = [];

  for (const s of exam.sections || []) {
    const pool = await loadPool(String(exam.tenantId), String(exam._id), s);
    if (pool.length < s.drawCount) {
      throw new Error(
        `Section "${s.label}" needs ${s.drawCount} item(s) and the bank has ${pool.length}.`,
      );
    }

    /*
     * The seed is combined with the section key, so two sections drawing from overlapping
     * pools do not pick the same items in the same order for the same candidate.
     */
    const rand = rng(hashSeed(`${seed}:${s.key}`));
    const picked = seededShuffle(pool, rand).slice(0, s.drawCount);

    picked.forEach((item, order) => {
      drawn.push({
        itemId: item._id as mongoose.Types.ObjectId,
        sectionKey: s.key,
        order,
        type: item.type as IDrawnItem['type'],
        marks: s.marksPerItem > 0 ? s.marksPerItem : item.points,
      });
    });
  }

  return drawn;
}
