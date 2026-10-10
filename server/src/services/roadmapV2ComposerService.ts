import LearningCurriculum from '../models/LearningCurriculum';
import {
  composeUnits, ComposerResult, SelectedUnit, StudentProfile, ComposableUnit,
} from './curriculumComposerService';
import { allocationForStage } from '../data/compositionShapePolicy';
import { densityFor, unitsForDays } from '../data/learningDensityPolicy';
import { loadCandidates, assertProductionEligible, CandidateSource, CandidateSet } from './composerCandidateService';
import {
  standingOn, bridgeUnitsForTopic, yearTiers, fitToDays, fitBridgeThenYear, packTight, slotsOf, PlanItem, V2Tier, V2Phase, revisionPick,
} from '../data/roadmapV2PlanPolicy';
import { priorStudyOf } from './learnerHistoryService';

/**
 * Roadmap V2 — compose a learner's roadmap to fit the admin's days (see roadmapV2PlanPolicy).
 *
 *   1. BRIDGE (Years 2–4). Year 1's MUST topics, and each later earlier year's important topics
 *      that teach a skill this year's MUST topics stand on — Year 1 first, nearest last. Each topic
 *      is given by the learner's standing on it: proved if held, taught if weak or unknown.
 *   2. YEAR. The composer chooses the year's units for this learner exactly as V1 does; a MUST topic
 *      it gave nothing to (a strong learner) still gets its proof, so no MUST topic is absent.
 *   3. FIT. Packed into the admin's days at the tenant's daily study time, giving up OPTIONAL,
 *      then SHOULD, then extras — never the core of a MUST or bridge topic.
 *
 * Only ever called for a learner `roadmapV2For` puts on V2; everyone else is composed by V1.
 */

const STAGE_ORDER = ['foundation', 'build', 'specialize', 'placement'];
type Priority = 'MUST' | 'SHOULD' | 'OPTIONAL';

export interface V2Options {
  stageKey: string;
  programDays: number;
  dailyMinutes: number;
  /** Revision days for an existing member moving up a year (the admin's setting). */
  revisionDays?: number;
  /** Whose roadmap: needed to read what they already studied with CareerPilot. */
  studentId?: string | null;
  source: CandidateSource;
  history?: string[];
}

export interface V2Plan {
  /** The days, in order, each unit with its phase. */
  days: { unit: SelectedUnit; phase: V2Phase; tier: V2Tier; part?: { index: number; of: number } }[][];
  revisionDays: number;
  bridgeDays: number;
  yearDays: number;
  dropped: Record<V2Tier, number>;
  /** Days past the admin's, only when the essentials alone could not fit. 0 normally. */
  overflowDays: number;
}

/** Each stage curriculum's topic priorities, one query for the stages asked. */
/**
 * Each stage curriculum's topic priorities and its topic order (the course sequence), keyed by
 * stage then topic. Built per call: two tenants composing at once must never share it.
 */
async function prioritiesFor(tenantId: string, stages: string[]): Promise<{
  priorities: Map<string, Map<string, Priority>>; topicOrder: Map<string, Map<string, number>>;
}> {
  const topicOrder = new Map<string, Map<string, number>>();
  const docs = await LearningCurriculum.find({ tenantId, adaptiveStage: { $in: stages }, personalizedFor: null })
    .select('adaptiveStage topics.topicCode topics.priority topics.backbone topics.order').lean() as any[];
  const out = new Map<string, Map<string, Priority>>();
  for (const d of docs) {
    const m = new Map<string, Priority>();
    const order = new Map<string, number>();
    topicOrder.set(String(d.adaptiveStage), order);
    for (const t of (d.topics || []) as any[]) {
      if (!t.topicCode) continue;
      order.set(String(t.topicCode), Number(t.order) || 0);
      // A topic not yet classified reads as its backbone flag says: backbone SHOULD, else OPTIONAL.
      m.set(String(t.topicCode), (t.priority as Priority) || (t.backbone ? 'SHOULD' : 'OPTIONAL'));
    }
    out.set(String(d.adaptiveStage), m);
  }
  return { priorities: out, topicOrder };
}

const ROLE_OF: Record<string, any> = { CONCEPT: 'FOUNDATION_INSTRUCTION', CHECKPOINT: 'VERIFICATION', PRACTICE: 'PRACTICE', DEBUG: 'PRACTICE', PROJECT: 'APPLICATION' };

/** A unit the composer did not choose (bridge, or a MUST topic's proof), in the composer's shape. */
function asSelected(u: ComposableUnit, profile: StudentProfile, held: boolean, position: number): SelectedUnit {
  const skill = (u.skillKeys || [])[0] || null;
  const score = skill ? profile.skills.get(skill)?.score ?? null : null;
  const state: any = held ? 'REVISION' : 'FOUNDATION_REQUIRED';
  return {
    unitCode: u.unitCode, title: u.title, position,
    reason: 'PREREQUISITE' as any, state, scheduledAt: state, scheduledOnProjection: false,
    governingSkill: skill, score, moduleCode: u.moduleCode, topicCode: u.topicCode,
    unitType: u.unitType, role: ROLE_OF[u.unitType] || 'FOUNDATION_INSTRUCTION', estimatedMinutes: u.estimatedMinutes,
  } as SelectedUnit;
}

const byTopic = (units: ComposableUnit[]) => {
  const m = new Map<string, ComposableUnit[]>();
  for (const u of units) {
    const k = String(u.topicCode || '');
    if (k) (m.get(k) || m.set(k, []).get(k)!).push(u);
  }
  return m;
};
const topicSkills = (units: ComposableUnit[]) => [...new Set(units.flatMap(u => u.skillKeys || []).map(String))];

export async function composeRoadmapV2(
  tenantId: string,
  profile: StudentProfile,
  yearSet: CandidateSet,
  opts: V2Options,
): Promise<{ composition: ComposerResult; plan: V2Plan | null }> {
  const stage = String(opts.stageKey || 'foundation');
  const earlier = STAGE_ORDER.slice(0, Math.max(0, STAGE_ORDER.indexOf(stage)));
  const { priorities, topicOrder } = await prioritiesFor(tenantId, [stage, ...earlier]);
  const yearPriority = (topic: string): Priority => priorities.get(stage)?.get(topic) || 'OPTIONAL';
  const history = new Set(opts.history || []);
  const density = densityFor(profile, stage);

  // ── 2. The year, chosen for this learner by the composer (as V1 does), then MUST coverage. ──
  const rest = composeUnits({
    candidates: yearSet.units,
    targetUnits: Math.max(unitsForDays(opts.programDays, density), opts.programDays),
    minUnits: 1,
    student: profile,
    compositionPolicy: allocationForStage(stage),
    history: [...history],
  });
  const year: SelectedUnit[] = rest.units.slice();
  const yearTopics = byTopic(yearSet.units);
  const orderOf = new Map(yearSet.units.map(u => [u.unitCode, u.displayOrder ?? 0]));
  const chosenTopics = new Set(year.map(u => u.topicCode));
  for (const [topic, units] of yearTopics) {
    if (yearPriority(topic) !== 'MUST' || chosenTopics.has(topic)) continue;
    const fresh = units.filter(u => !history.has(u.unitCode));
    const standing = standingOn(profile.skills as any, topicSkills(fresh));
    for (const { unit } of bridgeUnitsForTopic(fresh, standing)) {
      // Into the sequence where its authored order puts it, so it still follows what it needs.
      const at = year.findIndex(s => (orderOf.get(s.unitCode) ?? 0) > (unit.displayOrder ?? 0));
      const sel = asSelected(unit, profile, standing === 'HELD', 0);
      if (at < 0) year.push(sel); else year.splice(at, 0, sel);
    }
  }

  // ── 1. The bridge: Year 1's MUST topics, then what this year's MUST topics stand on. ──
  const needs = new Set<string>();
  for (const [topic, units] of yearTopics) {
    if (yearPriority(topic) !== 'MUST') continue;
    for (const u of units) {
      for (const k of u.skillKeys || []) needs.add(String(k));
      for (const k of u.prerequisiteSkillKeys || []) needs.add(String(k));
    }
  }
  /*
   * AN EXISTING MEMBER IS REVISED, NOT RE-TAUGHT. A topic they completed in an earlier CareerPilot
   * year goes to revision; a topic they never reached (a year left part-way) is still bridged.
   */
  const prior = await priorStudyOf(tenantId, opts.studentId, earlier);
  const revisionPool: { topicCode: string; units: ComposableUnit[]; score: number | null }[] = [];
  const bridge: { unit: SelectedUnit; tier: V2Tier }[] = [];
  const taken = new Set<string>([...history, ...year.map(u => u.unitCode)]);
  for (const src of earlier) {
    const set = await loadCandidates(tenantId, opts.source, src);
    if (opts.source === 'PRODUCTION') assertProductionEligible(set);
    const prio = priorities.get(src) || new Map<string, Priority>();
    const topics = [...byTopic(set.units).entries()]
      .filter(([topic, units]) => {
        const p = prio.get(topic) || 'OPTIONAL';
        // Year 1's MUST topics, always; from a later earlier year only MUST topics this year builds on.
        if (src === 'foundation') return p === 'MUST';
        return p === 'MUST' && topicSkills(units).some(k => needs.has(k));
      })
      /* In the course's own order — hardware and variables before loops, loops before arrays. */
      .sort((a, b) => {
        const order = topicOrder.get(src);
        const oa = order?.get(a[0]) ?? Number.MAX_SAFE_INTEGER;
        const ob = order?.get(b[0]) ?? Number.MAX_SAFE_INTEGER;
        return oa - ob || Math.min(...a[1].map(u => u.displayOrder ?? 0)) - Math.min(...b[1].map(u => u.displayOrder ?? 0));
      });
    for (const [topicCode, units] of topics) {
      if (prior.studiedTopics.has(topicCode)) {
        const scores = topicSkills(units).map(k => profile.skills.get(k)?.score).filter((x): x is number => typeof x === 'number');
        revisionPool.push({ topicCode, units: units.filter(u => !taken.has(u.unitCode)), score: scores.length ? Math.min(...scores) : null });
        continue;
      }
      const fresh = units.filter(u => !taken.has(u.unitCode));
      if (!fresh.length) continue;
      const standing = standingOn(profile.skills as any, topicSkills(fresh));
      for (const { unit, tier } of bridgeUnitsForTopic(fresh, standing)) {
        taken.add(unit.unitCode);
        bridge.push({ unit: asSelected(unit, profile, standing === 'HELD', 0), tier });
      }
    }
  }

  // Revision: the admin's revision days of practice on what they studied, weakest first.
  const revisionBudget = Math.max(0, (opts.revisionDays ?? 0) * opts.dailyMinutes);
  const revision = revisionPool.length && revisionBudget
    ? revisionPick(revisionPool, revisionBudget, prior.completedUnits).map(u => asSelected(u, profile, true, 0))
    : [];

  // ── 3. Fit into the admin's days at the daily study time. ──
  /*
   * Revision is its own block of exactly the admin's revision days (fewer only when there is less
   * to revise). Packed with everything else, the even-load packer spread seven days of revision
   * over ten. The bridge and the year then fit the days that remain.
   */
  const fitOpts = { dailyMinutes: opts.dailyMinutes, maxUnitsPerDay: density.maxUnitsPerDay };
  const revisionItems: PlanItem<SelectedUnit>[] = revision.map(u => ({ unit: u, phase: 'REVISION' as V2Phase, tier: 'REVISION' as V2Tier }));
  const revisionFit = revisionItems.length
    ? fitToDays(revisionItems, { ...fitOpts, days: Math.max(1, Math.min(opts.revisionDays ?? 0, revisionItems.length)) })
    : null;
  const revisionDayCount = revisionFit?.ok ? revisionFit.days.length : 0;

  const tiers = yearTiers(year, yearPriority);

  /*
   * A LEARNER WHO ALREADY HOLDS MOST OF THE YEAR STILL GETS THE ADMIN'S DAYS. The composer leaves
   * out what a strong learner has proved, and a very strong one can be left with fewer units than
   * days — which used to refuse them a roadmap. They are given more of the year instead: practice,
   * debugging and projects before lessons, MUST topics before SHOULD before OPTIONAL, each in its
   * authored place. A top-up is never essential, so it can always be given up again by the fit.
   */
  /* The year fills every day the bridge leaves, and the bridge is packed tight (fitBridgeThenYear). */
  const bridgeItems: PlanItem<SelectedUnit>[] = bridge.map(b => ({ unit: b.unit, phase: 'BRIDGE' as V2Phase, tier: b.tier }));
  const mainDays = opts.programDays - revisionDayCount;
  const tightBridge = packTight(bridgeItems, fitOpts, mainDays)?.length ?? slotsOf(bridgeItems, fitOpts);
  const asYearItem = (u: SelectedUnit) => [{ unit: u, phase: 'YEAR' as V2Phase, tier: 'OPTIONAL' as V2Tier }];
  const slotsNeeded = mainDays - tightBridge;
  let slots = year.reduce((s, u) => s + slotsOf(asYearItem(u), fitOpts), 0);
  if (slots < slotsNeeded) {
    const DOING = ['PROJECT', 'PRACTICE', 'DEBUG', 'CHECKPOINT'];
    const rank: Record<Priority, number> = { MUST: 0, SHOULD: 1, OPTIONAL: 2 };
    const inYear = new Set(year.map(u => u.unitCode));
    const spare = yearSet.units
      .filter(u => !inYear.has(u.unitCode) && !taken.has(u.unitCode) && !history.has(u.unitCode))
      .sort((a, b) => Number(!DOING.includes(a.unitType)) - Number(!DOING.includes(b.unitType))
        || rank[yearPriority(String(a.topicCode))] - rank[yearPriority(String(b.topicCode))]
        || (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    for (const unit of spare) {
      if (slots >= slotsNeeded) break;
      const p = yearPriority(String(unit.topicCode));
      const standing = standingOn(profile.skills as any, topicSkills([unit]));
      const at = year.findIndex(s => (orderOf.get(s.unitCode) ?? 0) > (unit.displayOrder ?? 0));
      const sel = asSelected(unit, profile, standing === 'HELD', 0);
      const tier: V2Tier = p === 'MUST' ? 'MUST_EXTRA' : p;
      if (at < 0) { year.push(sel); tiers.push(tier); } else { year.splice(at, 0, sel); tiers.splice(at, 0, tier); }
      slots += slotsOf(asYearItem(sel), fitOpts);
    }
  }

  const items: PlanItem<SelectedUnit>[] = [
    ...bridgeItems,
    ...year.map((u, i) => ({ unit: u, phase: 'YEAR' as V2Phase, tier: tiers[i] })),
  ];
  const mainFit = fitBridgeThenYear(items, { ...fitOpts, days: mainDays });
  /* One plan out of the two blocks: revision days first, then the bridge and the year. */
  const fit = mainFit.ok && revisionFit?.ok
    ? {
      ...mainFit,
      kept: [...revisionFit.kept, ...mainFit.kept],
      days: [...revisionFit.days, ...mainFit.days],
      dropped: Object.fromEntries(Object.keys(mainFit.dropped).map(k => [k, (mainFit.dropped as any)[k] + ((revisionFit.dropped as any)[k] || 0)])) as Record<V2Tier, number>,
      overflowDays: mainFit.overflowDays + revisionFit.overflowDays,
    }
    : mainFit;
  if (!fit.ok) {
    return {
      composition: { ...rest, ok: false, requestedDays: opts.programDays, units: items.map(i => i.unit) },
      plan: null,
    };
  }
  const units = fit.kept.map((k, i) => ({ ...k.unit, position: i + 1 }));
  const keptIndex = new Map(fit.kept.map((k, i) => [k.unit.unitCode, i]));
  const days = fit.days.map(d => d.map(i => ({
    unit: units[keptIndex.get(i.unit.unitCode) as number], phase: i.phase, tier: i.tier, part: i.part,
  })));
  const bridgeDays = days.filter(d => d.some(x => x.phase === 'BRIDGE')).length;
  const revisionDays = days.filter(d => !d.some(x => x.phase === 'BRIDGE') && d.some(x => x.phase === 'REVISION')).length;
  console.log(`[roadmap-v2] ${stage}: ${days.length} days (${revisionDays} revision, ${bridgeDays} bridge) — dropped ${JSON.stringify(fit.dropped)}`
    + (fit.overflowDays ? ` — ESSENTIALS OVER BY ${fit.overflowDays} DAY(S)` : ''));
  return {
    composition: { ...rest, ok: true, requestedDays: opts.programDays, units },
    plan: { days, revisionDays, bridgeDays, yearDays: days.length - bridgeDays - revisionDays, dropped: fit.dropped, overflowDays: fit.overflowDays },
  };
}
