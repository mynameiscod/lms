/**
 * Roadmap V2 — how a learner's roadmap is fitted into the admin's days.
 *
 * THE PROMISE. The roadmap is exactly the admin's days for the year (bridge included), no day is
 * planned past the tenant's daily study time, and a MUST topic is never left out. What varies by
 * learner — their Skill DNA — is how much of each topic they are given and how much room is left
 * for SHOULD and OPTIONAL topics.
 *
 * THE BRIDGE, PER TOPIC, PER LEARNER. A topic in a fresh joiner's bridge is given by what the
 * learner shows on the skills it teaches:
 *   HELD     (measured at or above the ready score, with some confidence) → the class as a
 *            refresher, then prove it: the checkpoint (or, where the topic has none and there is
 *            room, one practice).
 *   WEAK     (measured below the ready score) → teach it: the class, one practice, the checkpoint.
 *   UNKNOWN  (never measured) → taught as WEAK: a fresh joiner gets the whole foundation.
 *
 * THE FIT. Every unit carries a tier. When the units do not pack into the days, they are removed in
 * this order, each from the END of the plan (furthest from what the learner needs first):
 *   OPTIONAL → SHOULD → BRIDGE_EXTRA → MUST_EXTRA.
 * Bridge extras (practice) go from the learner's strongest topic first, so a weak topic keeps it.
 * A career track's year puts its DRILLS (debugging, practice, interview units) right after OPTIONAL:
 * an over-full track year gives up drills across every topic before any lesson, checkpoint or
 * project — never the end of the track, where its full-stack and AI work and the capstone sit. If
 * lessons must go too, they go the same way — one per topic at a time — and projects go last.
 * ESSENTIAL units — the core of every MUST topic and of every bridge topic — are never removed. If
 * even they do not fit, the plan is still built, over as few extra days as it takes, and reported:
 * dropping a MUST topic silently is the one outcome V2 exists to prevent.
 *
 * THE BRIDGE IS PACKED TIGHT (fitBridgeThenYear): as few days as the daily study time and the
 * per-day unit limit allow, and the year gets every day it frees.
 *
 * Pure and deterministic: same units, same options, same plan.
 */
import { packIntoDays, PackableUnit, PackResult } from './dayPackingPolicy';

export type V2Phase = 'REVISION' | 'BRIDGE' | 'YEAR';
export type V2Tier = 'ESSENTIAL' | 'MUST_EXTRA' | 'BRIDGE_EXTRA' | 'REVISION' | 'SHOULD' | 'OPTIONAL' | 'DRILL';
/**
 * The order tiers are given up in when the days are short. ESSENTIAL is never in it. Revision (on
 * what a member already studied with us) goes before a bridge extra: a skill they have not met
 * matters more than practising one they have. DRILL is used only by career-track years.
 */
export const REMOVAL_ORDER: readonly V2Tier[] = ['OPTIONAL', 'DRILL', 'SHOULD', 'REVISION', 'BRIDGE_EXTRA', 'MUST_EXTRA'];

/**
 * A year's own refresher module (Year 2's B01_BRIDGE, Year 4's P02_BRIDGE): written for the old
 * roadmap, which had no bridge. V2 gives the real bridge or revision instead, so it is left out.
 * Year 3's S01_READINESS is a readiness check and gap plan, not a refresher, and stays.
 */
export const isYearRefresher = (moduleCode: string | null | undefined): boolean => /_BRIDGE$/.test(String(moduleCode || ''));

export type SkillStanding = 'HELD' | 'WEAK' | 'UNKNOWN';
export const READY_SCORE = 50;
/** Units a bridge day may hold (the year keeps its own limit). The daily study time still caps it. */
export const BRIDGE_MAX_UNITS_PER_DAY = 3;

export interface PlanItem<U extends PackableUnit = PackableUnit> {
  unit: U;
  phase: V2Phase;
  tier: V2Tier;
  /** Set on a unit longer than one day (a project): which day of it this is. */
  part?: { index: number; of: number };
  /**
   * The learner's score on the unit's topic (their weakest skill in it); null when never measured.
   * A bridge extra on a stronger topic is given up before one on a weaker topic.
   */
  strength?: number | null;
  /**
   * Its place from the end of its topic's units of the same tier (0 = the last). Set by a career
   * track's year: such units are given up one per topic at a time, so every topic loses its last
   * before any topic loses two, and the end of the year is not what goes.
   */
  dropRank?: number;
}

/** How a learner stands on a topic's skills: the weakest measured one decides. */
export function standingOn(
  skills: Map<string, { score: number | null; confidence?: string | null }> | undefined,
  skillKeys: string[],
): SkillStanding {
  if (!skills || !skillKeys.length) return 'UNKNOWN';
  let measured = 0;
  for (const k of skillKeys) {
    const b = skills.get(k);
    if (typeof b?.score !== 'number') continue;
    measured++;
    if (b.score < READY_SCORE) return 'WEAK';
  }
  if (!measured) return 'UNKNOWN';
  // Every measured skill is at or above ready; one LOW-confidence reading is not proof of holding.
  const allConfident = skillKeys.every(k => {
    const b = skills.get(k);
    return typeof b?.score !== 'number' || String(b?.confidence || '').toUpperCase() !== 'LOW';
  });
  return allConfident ? 'HELD' : 'UNKNOWN';
}

export interface TopicUnit extends PackableUnit {
  displayOrder?: number;
}

/**
 * The units a bridge gives one topic for a learner, each marked ESSENTIAL or BRIDGE_EXTRA.
 * `units` are the topic's published units; they are taken in their authored order.
 */
export function bridgeUnitsForTopic<U extends TopicUnit>(units: U[], standing: SkillStanding): { unit: U; tier: V2Tier }[] {
  const ordered = units.slice().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const concept = ordered.find(u => u.unitType === 'CONCEPT');
  const practice = ordered.find(u => u.unitType === 'PRACTICE');
  // One checkpoint is enough to prove or measure a topic in a bridge: the last, which covers all of it.
  const lastCheckpoint = ordered.filter(u => u.unitType === 'CHECKPOINT').slice(-1);
  const checkpoints = lastCheckpoint;
  const pick: { unit: U; tier: V2Tier }[] = [];
  /*
   * Every learner gets the topic's class — a strong one too, as a refresher before they prove it.
   * Only a learner who already holds the topic is spared the practice.
   */
  /*
   * The class and the checkpoint are the topic's core; practice is given while there is room — to
   * a strong learner too, as the proof where a topic has no checkpoint. It is never essential for
   * one learner and droppable for another: that once left a strong learner's bridge 40 units
   * longer than a weak learner's.
   */
  if (concept) pick.push({ unit: concept, tier: 'ESSENTIAL' });
  if (practice && (standing !== 'HELD' || !checkpoints.length)) pick.push({ unit: practice, tier: 'BRIDGE_EXTRA' });
  pick.push(...checkpoints.map(u => ({ unit: u, tier: 'ESSENTIAL' as V2Tier })));
  if (!pick.some(x => x.tier === 'ESSENTIAL') && ordered[0]) {
    const first = pick.find(x => x.unit.unitCode === ordered[0].unitCode);
    if (first) first.tier = 'ESSENTIAL'; else pick.push({ unit: ordered[0], tier: 'ESSENTIAL' });
  }
  // Authored order, so a lesson still comes before its checkpoint.
  const pos = new Map(ordered.map((u, i) => [u.unitCode, i]));
  return pick.sort((a, b) => (pos.get(a.unit.unitCode) ?? 0) - (pos.get(b.unit.unitCode) ?? 0));
}

/**
 * Tier for a unit of the learner's own year, from its topic's priority. In a MUST topic the first
 * lesson and every checkpoint are ESSENTIAL (the topic is covered and measured); where the learner
 * was given neither, the first of its units is — a MUST topic is never represented by nothing.
 */
export function yearTiers<U extends PackableUnit>(
  units: U[],
  priorityOf: (topicCode: string) => 'MUST' | 'SHOULD' | 'OPTIONAL',
): V2Tier[] {
  const seenConcept = new Set<string>();
  const hasCore = new Set<string>();
  const tiers: V2Tier[] = units.map(u => {
    const p = priorityOf(u.topicCode);
    if (p !== 'MUST') return p;
    const isCore = u.unitType === 'CHECKPOINT' || (u.unitType === 'CONCEPT' && !seenConcept.has(u.topicCode));
    if (u.unitType === 'CONCEPT') seenConcept.add(u.topicCode);
    if (isCore) { hasCore.add(u.topicCode); return 'ESSENTIAL'; }
    return 'MUST_EXTRA';
  });
  units.forEach((u, i) => {
    if (priorityOf(u.topicCode) === 'MUST' && !hasCore.has(u.topicCode)) { tiers[i] = 'ESSENTIAL'; hasCore.add(u.topicCode); }
  });
  return tiers;
}

export interface FitOptions {
  days: number;
  dailyMinutes: number;
  maxUnitsPerDay: number;
}

export interface FitResult<U extends PackableUnit> {
  ok: boolean;
  /** Why not, when not: too little content to fill even the days, at every unit kept. */
  reason?: 'TOO_FEW_UNITS';
  kept: PlanItem<U>[];
  days: PlanItem<U>[][];
  /** Units given up, by tier. */
  dropped: Record<V2Tier, number>;
  /** Days added past the admin's because the ESSENTIAL units alone did not fit. 0 normally. */
  overflowDays: number;
}

const emptyDropped = (): Record<V2Tier, number> => ({ ESSENTIAL: 0, MUST_EXTRA: 0, BRIDGE_EXTRA: 0, REVISION: 0, SHOULD: 0, OPTIONAL: 0, DRILL: 0 });

/*
 * A UNIT LONGER THAN A DAY SPANS DAYS. A four-hour project in a 2.5-hour day is a day nobody can
 * finish, so it is packed as consecutive parts that each own a day. It is kept or given up
 * whole — removal works on the unit, never on a part.
 */
const partsOf = (i: PlanItem<any>, opts: { dailyMinutes: number }) =>
  Math.max(1, Math.ceil((Number(i.unit.estimatedMinutes) || 0) / Math.max(1, opts.dailyMinutes)));
/*
 * A BRIDGE CHECKPOINT SHARES ITS DAY. In a year a checkpoint owns its day (dayPackingPolicy):
 * it measures the work before it. In a bridge it is a short proof, and a strong learner proving
 * forty topics would otherwise spend forty days on forty half-hour checks. Shared days still
 * keep to the daily study time.
 */
const asPacked = <U extends PackableUnit>(i: PlanItem<U>): PlanItem<U> =>
  (i.phase === 'BRIDGE' && i.unit.unitType === 'CHECKPOINT' ? { ...i, unit: { ...i.unit, unitType: 'PRACTICE' } } : i);
const expand = <U extends PackableUnit>(list: PlanItem<U>[], opts: { dailyMinutes: number }): PlanItem<U>[] => list.map(asPacked).flatMap(i => {
  const of = partsOf(i, opts);
  if (of === 1) return [i];
  return Array.from({ length: of }, (_, k) => ({
    ...i, part: { index: k + 1, of },
    unit: { ...i.unit, unitCode: `${i.unit.unitCode}#${k + 1}`, unitType: 'PROJECT', estimatedMinutes: Math.ceil(i.unit.estimatedMinutes / of) },
  }));
});
/* One topic a day where it costs nothing; a mixed day before any content is taken away. */
const pack = <U extends PackableUnit>(list: PlanItem<U>[], days: number, opts: Omit<FitOptions, 'days'>): PackResult => {
  const units = expand(list, opts).map(i => i.unit);
  const base = { days, budgetMinutes: opts.dailyMinutes, maxUnitsPerDay: opts.maxUnitsPerDay };
  const grouped = packIntoDays(units, base);
  return grouped.ok ? grouped : packIntoDays(units, { ...base, preferSameTopicDays: false });
};
/* Back from packed units to plan items: a part keeps its ORIGINAL unit, and says which part it is. */
const toDays = <U extends PackableUnit>(list: PlanItem<U>[], packed: PackResult, opts: { dailyMinutes: number }): PlanItem<U>[][] => {
  const byCode = new Map(list.map(i => [i.unit.unitCode, i]));
  return packed.days.map(d => d.map(u => {
    const [code, part] = String(u.unitCode).split('#');
    const item = byCode.get(code)!;
    return part ? { ...item, part: { index: Number(part), of: partsOf(item, opts) } } : item;
  }));
};

/** How many days a plan item takes up at least: one, or one per part of a long project. */
export const slotsOf = (items: PlanItem<any>[], opts: { dailyMinutes: number }): number =>
  items.reduce((s, i) => s + partsOf(i, opts), 0);

/**
 * The fewest days `items` pack into with every one of them kept, up to `limit`; null when they
 * need more. Days are as full as the daily study time and the per-day unit limit allow.
 */
export function packTight<U extends PackableUnit>(items: PlanItem<U>[], opts: Omit<FitOptions, 'days'>, limit: number): PlanItem<U>[][] | null {
  const parts = expand(items, opts);
  if (!parts.length) return [];
  const minutes = parts.reduce((s, i) => s + (Number(i.unit.estimatedMinutes) || 0), 0);
  const from = Math.max(1, Math.ceil(minutes / Math.max(1, opts.dailyMinutes)), Math.ceil(parts.length / Math.max(1, opts.maxUnitsPerDay)));
  for (let d = from; d <= Math.min(limit, parts.length); d++) {
    const p = pack(items, d, opts);
    if (p.ok) return toDays(items, p, opts);
  }
  return null;
}

/**
 * Fit an ordered plan into the days.
 *
 * Units are taken away one at a time in the removal order — lowest tier first, each tier from the
 * end — until the rest packs. Packing itself is dayPackingPolicy: order kept, a project or
 * checkpoint owns its day, and no day exceeds `dailyMinutes`.
 */
export function fitToDays<U extends PackableUnit>(items: PlanItem<U>[], opts: FitOptions): FitResult<U> {
  /*
   * Each tier is given up from the end of the plan — except bridge extras, which go from the
   * learner's STRONGEST topic first: a weak learner keeps the practice on what they are weak at,
   * wherever it falls in the course. Never measured counts as weakest (taught as weak).
   */
  const removal: number[] = [];
  const strengthOf = (i: number) => (typeof items[i].strength === 'number' ? (items[i].strength as number) : -1);
  for (const tier of REMOVAL_ORDER) {
    const idx = items.map((_, i) => i).filter(i => items[i].tier === tier);
    if (tier === 'BRIDGE_EXTRA') idx.sort((a, b) => strengthOf(b) - strengthOf(a) || b - a);
    // Ranked items (a career track's drills and lessons) go a topic at a time: strongest topic first,
    // each topic's last first, every topic once before any twice. Unranked ones go from the end.
    else if (idx.some(i => typeof items[i].dropRank === 'number')) {
      const rank = (i: number) => (typeof items[i].dropRank === 'number' ? items[i].dropRank as number : -1);
      idx.sort((a, b) => (rank(a) < 0 ? 0 : 1) - (rank(b) < 0 ? 0 : 1) || strengthOf(b) - strengthOf(a) || rank(a) - rank(b) || b - a);
    }
    else idx.sort((a, b) => b - a);
    removal.push(...idx);
  }

  const dropped = emptyDropped();
  const removed = new Set<number>();
  const current = () => items.filter((_, i) => !removed.has(i));

  if (expand(items, opts).length < opts.days) {
    return { ok: false, reason: 'TOO_FEW_UNITS', kept: items, days: [], dropped, overflowDays: 0 };
  }
  let attempt = pack(items, opts.days, opts);
  for (const idx of removal) {
    if (attempt.ok) break;
    if (expand(items.filter((_, i) => i !== idx && !removed.has(i)), opts).length < opts.days) break; // could never fill the days
    removed.add(idx);
    dropped[items[idx].tier]++;
    attempt = pack(current(), opts.days, opts);
  }
  const kept = current();
  if (attempt.ok) return { ok: true, kept, days: toDays(kept, attempt, opts), dropped, overflowDays: 0 };

  // The essentials alone do not fit: build over the fewest extra days that hold them, and say so.
  const keptParts = expand(kept, opts).length;
  for (let d = opts.days + 1; d <= keptParts; d++) {
    const p = pack(kept, d, opts);
    if (p.ok) return { ok: true, kept, days: toDays(kept, p, opts), dropped, overflowDays: d - opts.days };
  }
  // One unit (or part) a day always packs.
  const single = expand(kept, opts).map(i => [i]);
  return { ok: true, kept, days: single, dropped, overflowDays: Math.max(0, single.length - opts.days) };
}

/**
 * Fit a bridge and a year into the days: the bridge as tight as the daily study time allows, the
 * year in every day it leaves.
 *
 * WHY. Packed together, the even-load packer spreads a short bridge thin: a strong learner whose
 * bridge is forty half-hour proofs got forty days of one proof each — the longest bridge of
 * anyone, for the learner who needs it least. A tight bridge gives those days to the year.
 *
 * The bridge holds up to BRIDGE_MAX_UNITS_PER_DAY units a day; the year keeps its own limit. As
 * few bridge practices are given up (strongest topic first) as keep the year's MUST extras whole —
 * the year gives up its OPTIONAL and SHOULD first. Whenever that cannot be done cleanly, the joint
 * fit stands — never a worse plan.
 */
export function fitBridgeThenYear<U extends PackableUnit>(items: PlanItem<U>[], opts: FitOptions): FitResult<U> {
  const joint = fitToDays(items, opts);
  const bridgeAll = items.filter(i => i.phase === 'BRIDGE');
  const year = items.filter(i => i.phase !== 'BRIDGE');
  if (!bridgeAll.length || !year.length) return joint;

  /*
   * THE BRIDGE MAY HOLD THREE UNITS A DAY, the year keeps its own limit. A bridge day is short
   * classes and checks on what the learner should already know; the daily study time still caps it.
   */
  const bridgeOpts = { ...opts, maxUnitsPerDay: Math.max(opts.maxUnitsPerDay, BRIDGE_MAX_UNITS_PER_DAY) };
  /* Bridge practice in the order it is given up: the learner's strongest topic first. */
  const strengthOf = (i: number) => (typeof bridgeAll[i].strength === 'number' ? (bridgeAll[i].strength as number) : -1);
  const extras = bridgeAll.map((_, i) => i).filter(i => bridgeAll[i].tier === 'BRIDGE_EXTRA')
    .sort((a, b) => strengthOf(b) - strengthOf(a) || b - a);

  /* k practices given up: the bridge packed tight, the year fitted into what it leaves. */
  const attempt = (k: number) => {
    const gone = new Set(extras.slice(0, k));
    const bridge = bridgeAll.filter((_, i) => !gone.has(i));
    const tight = packTight(bridge, bridgeOpts, opts.days - 1);
    if (!tight) return null;
    const yearFit = fitToDays(year, { ...opts, days: opts.days - tight.length });
    if (!yearFit.ok || yearFit.overflowDays) return null;
    return { k, bridge, tight, yearFit };
  };
  /*
   * The removal order holds across the two blocks: the year gives up OPTIONAL and SHOULD before a
   * bridge practice goes, and a bridge practice goes before a MUST extra of the year. So the fewest
   * practices are given up that leave the year's MUST extras whole.
   */
  const keepsMust = (a: ReturnType<typeof attempt>) => !!a && a.yearFit.dropped.MUST_EXTRA === 0;
  let best = attempt(0);
  if (!keepsMust(best)) {
    const all = attempt(extras.length);
    if (keepsMust(all)) {
      let lo = 1;
      let hi = extras.length;
      best = all;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const a = attempt(mid);
        if (keepsMust(a)) { best = a; hi = mid; } else lo = mid + 1;
      }
    } else if (all) {
      best = !best || all.yearFit.dropped.MUST_EXTRA < best.yearFit.dropped.MUST_EXTRA ? all : best;
    }
  }
  if (!best) return joint;
  const split: FitResult<U> = {
    ok: true,
    kept: [...best.bridge, ...best.yearFit.kept],
    days: [...best.tight, ...best.yearFit.days],
    dropped: { ...best.yearFit.dropped, BRIDGE_EXTRA: best.k },
    overflowDays: 0,
  };
  /* Never a worse plan than the joint fit: fewer MUST extras lost wins, then fewer practices. */
  if (joint.ok && !joint.overflowDays && (joint.dropped.MUST_EXTRA < split.dropped.MUST_EXTRA
    || (joint.dropped.MUST_EXTRA === split.dropped.MUST_EXTRA && joint.dropped.BRIDGE_EXTRA < split.dropped.BRIDGE_EXTRA))) return joint;
  return split;
}

/** The kinds of unit revision is made of: doing it again, never the lesson. */
export const REVISION_UNIT_TYPES: readonly string[] = ['PRACTICE', 'DEBUG', 'CHECKPOINT'];

/**
 * Revision for an existing member: practice on the topics they already studied with CareerPilot,
 * weakest first, one unit per topic per round, until `budgetMinutes` (the admin's revision days at
 * the daily study time) is spent. Units they have not done yet are preferred to ones they have.
 *
 * `topics` carries each topic's units and the learner's lowest score on it (null when unmeasured,
 * which sorts first: an unmeasured skill is the one most worth checking).
 */
export function revisionPick<U extends TopicUnit>(
  topics: { topicCode: string; units: U[]; score: number | null }[],
  budgetMinutes: number,
  done: Set<string> = new Set(),
): U[] {
  const queues = topics
    .map(t => ({
      t,
      q: t.units
        .filter(u => REVISION_UNIT_TYPES.includes(u.unitType))
        .sort((a, b) => Number(done.has(a.unitCode)) - Number(done.has(b.unitCode)) || (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    }))
    .filter(x => x.q.length)
    .sort((a, b) => (a.t.score ?? -1) - (b.t.score ?? -1) || a.t.topicCode.localeCompare(b.t.topicCode));
  const out: U[] = [];
  let used = 0;
  for (let round = 0; queues.some(x => x.q.length > round); round++) {
    for (const x of queues) {
      const u = x.q[round];
      if (!u) continue;
      const m = Number(u.estimatedMinutes) || 0;
      if (used + m > budgetMinutes) return out;
      out.push(u);
      used += m;
    }
  }
  return out;
}
