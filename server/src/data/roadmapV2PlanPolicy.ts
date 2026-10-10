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
 *   HELD     (measured at or above the ready score, with some confidence) → prove it: a checkpoint,
 *            or one practice where the topic has none. Not re-taught.
 *   WEAK     (measured below the ready score) → teach it: the lesson, one practice, the checkpoint.
 *   UNKNOWN  (never measured) → the lesson and the checkpoint.
 *
 * THE FIT. Every unit carries a tier. When the units do not pack into the days, they are removed in
 * this order, each from the END of the plan (furthest from what the learner needs first):
 *   OPTIONAL → SHOULD → BRIDGE_EXTRA → MUST_EXTRA.
 * ESSENTIAL units — the core of every MUST topic and of every bridge topic — are never removed. If
 * even they do not fit, the plan is still built, over as few extra days as it takes, and reported:
 * dropping a MUST topic silently is the one outcome V2 exists to prevent.
 *
 * Pure and deterministic: same units, same options, same plan.
 */
import { packIntoDays, PackableUnit, PackResult } from './dayPackingPolicy';

export type V2Phase = 'REVISION' | 'BRIDGE' | 'YEAR';
export type V2Tier = 'ESSENTIAL' | 'MUST_EXTRA' | 'BRIDGE_EXTRA' | 'REVISION' | 'SHOULD' | 'OPTIONAL';
/**
 * The order tiers are given up in when the days are short. ESSENTIAL is never in it. Revision (on
 * what a member already studied with us) goes before a bridge extra: a skill they have not met
 * matters more than practising one they have.
 */
export const REMOVAL_ORDER: readonly V2Tier[] = ['OPTIONAL', 'SHOULD', 'REVISION', 'BRIDGE_EXTRA', 'MUST_EXTRA'];

export type SkillStanding = 'HELD' | 'WEAK' | 'UNKNOWN';
export const READY_SCORE = 50;

export interface PlanItem<U extends PackableUnit = PackableUnit> {
  unit: U;
  phase: V2Phase;
  tier: V2Tier;
  /** Set on a unit longer than one day (a project): which day of it this is. */
  part?: { index: number; of: number };
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
  if (standing === 'HELD') {
    if (checkpoints.length) pick.push(...checkpoints.map(u => ({ unit: u, tier: 'ESSENTIAL' as V2Tier })));
    else if (practice) pick.push({ unit: practice, tier: 'ESSENTIAL' });
    else if (concept) pick.push({ unit: concept, tier: 'ESSENTIAL' });
  } else {
    if (concept) pick.push({ unit: concept, tier: 'ESSENTIAL' });
    if (standing === 'WEAK' && practice) pick.push({ unit: practice, tier: 'BRIDGE_EXTRA' });
    pick.push(...checkpoints.map(u => ({ unit: u, tier: 'ESSENTIAL' as V2Tier })));
    if (!pick.length && ordered[0]) pick.push({ unit: ordered[0], tier: 'ESSENTIAL' });
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

const emptyDropped = (): Record<V2Tier, number> => ({ ESSENTIAL: 0, MUST_EXTRA: 0, BRIDGE_EXTRA: 0, REVISION: 0, SHOULD: 0, OPTIONAL: 0 });

/**
 * Fit an ordered plan into the days.
 *
 * Units are taken away one at a time in the removal order — lowest tier first, each tier from the
 * end — until the rest packs. Packing itself is dayPackingPolicy: order kept, a project or
 * checkpoint owns its day, and no day exceeds `dailyMinutes`.
 */
export function fitToDays<U extends PackableUnit>(items: PlanItem<U>[], opts: FitOptions): FitResult<U> {
  /*
   * A UNIT LONGER THAN A DAY SPANS DAYS. A four-hour project in a 2.5-hour day is a day nobody can
   * finish, so it is packed as consecutive parts that each own a day. It is kept or given up
   * whole — removal works on the unit, never on a part.
   */
  const partsOf = (i: PlanItem<U>) => Math.max(1, Math.ceil((Number(i.unit.estimatedMinutes) || 0) / Math.max(1, opts.dailyMinutes)));
  /*
   * A BRIDGE CHECKPOINT SHARES ITS DAY. In a year a checkpoint owns its day (dayPackingPolicy):
   * it measures the work before it. In a bridge it is a short proof, and a strong learner proving
   * forty topics would otherwise spend forty days on forty half-hour checks. Shared days still
   * keep to the daily study time.
   */
  const asPacked = (i: PlanItem<U>): PlanItem<U> =>
    (i.phase === 'BRIDGE' && i.unit.unitType === 'CHECKPOINT' ? { ...i, unit: { ...i.unit, unitType: 'PRACTICE' } } : i);
  const expand = (list: PlanItem<U>[]): PlanItem<U>[] => list.map(asPacked).flatMap(i => {
    const of = partsOf(i);
    if (of === 1) return [i];
    return Array.from({ length: of }, (_, k) => ({
      ...i, part: { index: k + 1, of },
      unit: { ...i.unit, unitCode: `${i.unit.unitCode}#${k + 1}`, unitType: 'PROJECT', estimatedMinutes: Math.ceil(i.unit.estimatedMinutes / of) },
    }));
  });
  /* One topic a day where it costs nothing; a mixed day before any content is taken away. */
  const pack = (list: PlanItem<U>[], days: number): PackResult => {
    const units = expand(list).map(i => i.unit);
    const base = { days, budgetMinutes: opts.dailyMinutes, maxUnitsPerDay: opts.maxUnitsPerDay };
    const grouped = packIntoDays(units, base);
    return grouped.ok ? grouped : packIntoDays(units, { ...base, preferSameTopicDays: false });
  };

  const removal: number[] = [];
  for (const tier of REMOVAL_ORDER) {
    for (let i = items.length - 1; i >= 0; i--) if (items[i].tier === tier) removal.push(i);
  }

  /* Back from packed units to plan items: a part keeps its ORIGINAL unit, and says which part it is. */
  const toDays = (list: PlanItem<U>[], packed: PackResult): PlanItem<U>[][] => {
    const byCode = new Map(list.map(i => [i.unit.unitCode, i]));
    return packed.days.map(d => d.map(u => {
      const [code, part] = String(u.unitCode).split('#');
      const item = byCode.get(code)!;
      return part ? { ...item, part: { index: Number(part), of: partsOf(item) } } : item;
    }));
  };
  const dropped = emptyDropped();
  const removed = new Set<number>();
  const current = () => items.filter((_, i) => !removed.has(i));

  if (expand(items).length < opts.days) {
    return { ok: false, reason: 'TOO_FEW_UNITS', kept: items, days: [], dropped, overflowDays: 0 };
  }
  let attempt = pack(items, opts.days);
  for (const idx of removal) {
    if (attempt.ok) break;
    if (expand(items.filter((_, i) => i !== idx && !removed.has(i))).length < opts.days) break; // could never fill the days
    removed.add(idx);
    dropped[items[idx].tier]++;
    attempt = pack(current(), opts.days);
  }
  const kept = current();
  if (attempt.ok) return { ok: true, kept, days: toDays(kept, attempt), dropped, overflowDays: 0 };

  // The essentials alone do not fit: build over the fewest extra days that hold them, and say so.
  const keptParts = expand(kept).length;
  for (let d = opts.days + 1; d <= keptParts; d++) {
    const p = pack(kept, d);
    if (p.ok) return { ok: true, kept, days: toDays(kept, p), dropped, overflowDays: d - opts.days };
  }
  // One unit (or part) a day always packs.
  const single = expand(kept).map(i => [i]);
  return { ok: true, kept, days: single, dropped, overflowDays: Math.max(0, single.length - opts.days) };
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
