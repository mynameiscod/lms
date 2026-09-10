/**
 * Find the material that teaches a skill at the depth this student needs.
 *
 * THE HALF OF THE BRIDGE THAT TOUCHES THE DATABASE. The planner decides "PY_LOOP, foundation
 * depth, difficulty 1-2"; this turns that into actual rows a student can open. Until skillKeys
 * existed on the library there was no query that could answer it — content was findable only by
 * free-text tag, so a precisely measured gap led to a keyword search.
 *
 * DEGRADES, NEVER FAILS. A content bank is filled in over months, so the honest states are
 * "here is the right material", "here is near-enough material", and "there is nothing yet" —
 * and the third has to be reported rather than hidden. A plan that silently omits a topic
 * because nobody authored a video for it looks identical to a plan that decided the student did
 * not need it, and only one of those is true.
 *
 * NO AI. Selection is a query and a sort. Generation of missing material is somebody else's job,
 * and deliberately: a planner that can invent its own content cannot be audited against a bank.
 */

import LearningContentLibrary from '../models/LearningContentLibrary';
import type { LearningDepth } from '../data/adaptiveCurriculumPolicy';
import { appliesToDirection } from '../data/careerDirectionPolicy';

/**
 * Depths ordered by how much support they give, most first.
 *
 * Used to substitute when the exact depth is missing. Substitution walks toward MORE support,
 * never less: giving a struggling student the recap intended for somebody revising is how they
 * conclude they are stupid, whereas giving a confident student the full build is merely slow.
 */
const DEPTH_LADDER: LearningDepth[] = ['FOUNDATION', 'GUIDED', 'STANDARD', 'REVISION', 'CHALLENGE'];

/** Depths to try, in order, when the requested one has nothing. */
export function depthFallbacks(want: LearningDepth): LearningDepth[] {
  const i = DEPTH_LADDER.indexOf(want);
  if (i < 0) return [want];
  const richer = DEPTH_LADDER.slice(0, i).reverse();   // toward more support
  const leaner = DEPTH_LADDER.slice(i + 1);            // only once richer is exhausted
  return [want, ...richer, ...leaner];
}

/** The teaching shape every assigned topic follows. */
export const DELIVERY_ORDER = ['video', 'notes', 'interactive_lesson', 'tech_qa', 'practice_coding', 'practice_theory'] as const;
export type DeliveryType = typeof DELIVERY_ORDER[number];

export interface ResolveRequest {
  tenantId: string;
  skillKeys: string[];
  depth: LearningDepth;
  difficultyMin: number;
  difficultyMax: number;
  practiceCount: number;
  /** Used to prefer worked examples from the student's own field. */
  direction?: string | null;
  /**
   * The topic being taught, so material written for it is preferred over material that merely
   * shares its skills. Optional: a topic with no purpose-written content resolves exactly as
   * it did before.
   */
  topicCode?: string | null;
}

export interface ResolvedContent {
  contentIds: string[];
  /** What was actually found, so a gap in the bank is visible rather than inferred. */
  coverage: {
    hasTeaching: boolean;
    hasPractice: boolean;
    practiceFound: number;
    practiceWanted: number;
    /** True when nothing at the requested depth existed and a neighbour was used. */
    depthSubstituted: boolean;
    depthUsed: LearningDepth | null;
    /** Skills with no content at all. The authoring to-do list. */
    unmappedSkills: string[];
  };
}

/**
 * Rank candidates for one slot.
 *
 * A TOPIC MATCH WINS ABOVE EVERYTHING, including canonical. Where several curriculum topics
 * legitimately teach one skill — six career topics on TECH_CAREER_AWARENESS, six operating
 * system topics on OPERATING_SYSTEMS — skill matching alone hands all six the same video.
 * Material written for THIS topic is not merely a better match, it is the only one that is
 * about the right subject, so it outranks a flag that only means "prefer me among equals".
 * Content with no topicCode is unaffected and still serves every topic teaching its skills.
 *
 * `canonical` wins next — that is what the flag is for, and without it the tie-break falls to
 * insertion order, which is how AI day-generation ended up de-duplicating by "oldest match" for
 * years. Then a career-context match, so an AI student gets the dataset example and a web
 * student the shopping-cart one for the identical skill. Everything after that is a stable
 * tie-break so two runs cannot disagree.
 */
function rank(a: any, b: any, direction?: string | null, topicCode?: string | null): number {
  if (topicCode) {
    const topic = (x: any) => (String(x.topicCode || '') === topicCode ? 0 : 1);
    if (topic(a) !== topic(b)) return topic(a) - topic(b);
  }

  const canon = (x: any) => (x.canonical ? 0 : 1);
  if (canon(a) !== canon(b)) return canon(a) - canon(b);

  const ctx = (x: any) => (direction && (x.careerContexts || []).some((c: string) =>
    String(c).toUpperCase() === String(direction).toUpperCase()) ? 0 : 1);
  if (ctx(a) !== ctx(b)) return ctx(a) - ctx(b);

  const used = (x: any) => -(x.usageCount || 0);
  if (used(a) !== used(b)) return used(a) - used(b);

  return String(a._id).localeCompare(String(b._id));
}

/**
 * Resolve one topic's material.
 *
 * Practice is filtered by difficulty; teaching is not. A recap and a full build are different
 * ROWS at different depths, not the same row at different difficulties — difficulty describes
 * how hard a problem is, and a video does not have one.
 */
export async function resolveContentForTopic(req: ResolveRequest): Promise<ResolvedContent> {
  const empty: ResolvedContent = {
    contentIds: [],
    coverage: {
      hasTeaching: false, hasPractice: false,
      practiceFound: 0, practiceWanted: req.practiceCount,
      depthSubstituted: false, depthUsed: null, unmappedSkills: req.skillKeys,
    },
  };
  if (!req.skillKeys.length) return empty;

  const rows = await LearningContentLibrary.find({
    tenantId: req.tenantId,
    isPublished: true,
    skillKeys: { $in: req.skillKeys },
  }).select('_id type learningDepth difficultyLevel skillKeys topicCode applicableDirections careerContexts canonical usageCount').lean() as any[];

  if (!rows.length) return empty;

  const relevant = rows.filter(r => appliesToDirection(r.applicableDirections, req.direction));
  const pool = relevant.length ? relevant : rows;

  const covered = new Set<string>();
  for (const r of pool) for (const k of (r.skillKeys || [])) covered.add(String(k).toUpperCase());
  const unmappedSkills = req.skillKeys.filter(k => !covered.has(String(k).toUpperCase()));

  /**
   * One depth for the whole topic, not one per slot.
   *
   * Mixing a foundation video with a challenge exercise produces a lesson that contradicts
   * itself. The first depth on the ladder that has any teaching wins, and everything else is
   * chosen at that depth.
   */
  let depthUsed: LearningDepth | null = null;
  let atDepth: any[] = [];
  for (const d of depthFallbacks(req.depth)) {
    const found = pool.filter(r => (r.learningDepth || 'STANDARD') === d);
    if (found.length) { depthUsed = d; atDepth = found; break; }
  }
  if (!depthUsed) { depthUsed = req.depth; atDepth = pool; }

  const contentIds: string[] = [];
  const byType = (t: string) => atDepth.filter(r => r.type === t).sort((a, b) => rank(a, b, req.direction, req.topicCode));

  // Teaching: one of each available, in the order a lesson is delivered.
  let hasTeaching = false;
  for (const t of ['video', 'notes', 'interactive_lesson', 'tech_qa'] as const) {
    const best = byType(t)[0];
    if (best) { contentIds.push(String(best._id)); hasTeaching = true; }
  }

  // Practice: filtered to the assigned difficulty window, capped at what was asked for.
  const practice = atDepth
    .filter(r => r.type === 'practice_coding' || r.type === 'practice_theory')
    .filter(r => {
      const lvl = Number(r.difficultyLevel);
      if (!Number.isFinite(lvl)) return true;   // unrated content is usable, not excluded
      return lvl >= req.difficultyMin && lvl <= req.difficultyMax;
    })
    .sort((a, b) => rank(a, b, req.direction, req.topicCode))
    .slice(0, Math.max(0, req.practiceCount));

  for (const p of practice) contentIds.push(String(p._id));

  return {
    contentIds,
    coverage: {
      hasTeaching,
      hasPractice: practice.length > 0,
      practiceFound: practice.length,
      practiceWanted: req.practiceCount,
      depthSubstituted: depthUsed !== req.depth,
      depthUsed,
      unmappedSkills,
    },
  };
}

/**
 * What the bank cannot yet teach, across a whole curriculum.
 *
 * Written for whoever is filling the library: it names the skills with no content rather than
 * letting them be discovered one confused student at a time.
 */
export async function contentGapReport(tenantId: string, skillKeys: string[]): Promise<{
  mapped: string[];
  unmapped: string[];
  byDepth: Record<string, number>;
}> {
  const keys = Array.from(new Set(skillKeys.map(k => String(k).toUpperCase())));
  if (!keys.length) return { mapped: [], unmapped: [], byDepth: {} };

  const rows = await LearningContentLibrary.find({
    tenantId, isPublished: true, skillKeys: { $in: keys },
  }).select('skillKeys learningDepth').lean() as any[];

  const covered = new Set<string>();
  const byDepth: Record<string, number> = {};
  for (const r of rows) {
    for (const k of (r.skillKeys || [])) covered.add(String(k).toUpperCase());
    const d = r.learningDepth || 'UNSET';
    byDepth[d] = (byDepth[d] || 0) + 1;
  }

  return {
    mapped: keys.filter(k => covered.has(k)),
    unmapped: keys.filter(k => !covered.has(k)),
    byDepth,
  };
}
