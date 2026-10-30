import { ComposerResult, SelectedUnit, StudentProfile, ComposableUnit } from './curriculumComposerService';
import { loadCandidates, assertProductionEligible, CandidateSource } from './composerCandidateService';
import { densityFor } from '../data/learningDensityPolicy';
import {
  standingOn, bridgeUnitsForTopic, fitToDays, packTight, slotsOf, revisionPick, PlanItem, V2Tier, V2Phase,
} from '../data/roadmapV2PlanPolicy';
import { trackTopics, placementSplit, TrackPriority } from '../data/careerTrackPolicy';
import { asSelected, byTopic, topicSkills, V2Plan } from './roadmapV2ComposerService';
import { priorStudyOf } from './learnerHistoryService';
import { ResolvedTrack } from './careerTrackService';

/**
 * A career-track roadmap (see careerTrackPolicy): Year 3 is the track's skill packs; Year 4 is the
 * track again — a short revision for a member who did Year 3 on it, its essentials for a fresh
 * joiner — and then the placement packs. Fitted into the admin's days at the daily study time by
 * the same V2 fit (priorities, Skill DNA, projects split into parts), and returned in V2's shape,
 * so it is stored, served, recomposed and rebuilt exactly like any V2 roadmap.
 */

export interface TrackComposeOptions {
  stageKey: string;
  programDays: number;
  dailyMinutes: number;
  studentId?: string | null;
  source: CandidateSource;
  /** Units already given (frozen days of a roadmap being recomposed): never planned again. */
  history?: string[];
}

type Item = PlanItem<SelectedUnit>;
const TIER_OF: Record<TrackPriority, V2Tier> = { CORE: 'MUST_EXTRA', MUST: 'MUST_EXTRA', SHOULD: 'SHOULD', OPTIONAL: 'OPTIONAL' };
const PROOF = ['CHECKPOINT', 'PROJECT'];
const DRILLS = ['DEBUG', 'PRACTICE'];

const refuse = (programDays: number, reason: string): { composition: ComposerResult; plan: null; reason: string } => ({
  composition: { ok: false, requestedDays: programDays, units: [], reason } as any,
  plan: null,
  reason,
});

export async function composeTrackRoadmap(
  tenantId: string,
  profile: StudentProfile,
  resolved: ResolvedTrack,
  opts: TrackComposeOptions,
): Promise<{ composition: ComposerResult; plan: V2Plan | null; reason?: string }> {
  const { track, packs } = resolved;
  const stage = opts.stageKey;
  const days = opts.programDays;
  // Year 2 is the track's own Year-2 packs; Years 3 and 4 build on its Year-3 packs.
  const yearTopics = trackTopics(stage === 'build' ? (track.buildPacks || []) : track.specializePacks, packs);
  const placementTopics = stage === 'placement' ? trackTopics(track.placementPacks, packs) : [];
  const topicCodes = [...new Set([...yearTopics, ...placementTopics].map(t => t.topicCode))];

  const set = await loadCandidates(tenantId, opts.source, stage, { topicCodes });
  if (opts.source === 'PRODUCTION') assertProductionEligible(set);
  const history = new Set((opts.history || []).map(c => String(c).toUpperCase()));
  const unitsOf = byTopic(set.units.filter(u => !history.has(String(u.unitCode).toUpperCase())));
  for (const list of unitsOf.values()) list.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  // A track's checkpoints and projects share a day with lessons (roadmapV2PlanPolicy soloSharesDay).
  const fitOpts = { dailyMinutes: opts.dailyMinutes, maxUnitsPerDay: densityFor(profile, stage).maxUnitsPerDay, soloSharesDay: true };
  const held = (units: ComposableUnit[]) => standingOn(profile.skills as any, topicSkills(units)) === 'HELD';
  const item = (u: ComposableUnit, phase: V2Phase, tier: V2Tier, isHeld: boolean): Item =>
    ({ unit: asSelected(u, profile, isHeld, 0), phase, tier });
  /** The learner's weakest measured score on a topic's skills (null when none is measured). */
  const scoreOrNull = (topicCode: string): number | null => {
    const scores = topicSkills(unitsOf.get(topicCode) || []).map(k => profile.skills.get(k)?.score).filter((x): x is number => typeof x === 'number');
    return scores.length ? Math.min(...scores) : null;
  };
  const scoreOf = (topicCode: string): number => scoreOrNull(topicCode) ?? 0;

  /*
   * A WHOLE TOPIC, AS THIS LEARNER NEEDS IT. Every unit of the topic — class, practice, debugging,
   * checkpoint, project — for a learner who does not hold it. One who does gets the class and the
   * proof (checkpoint, project), not the drills; `full` gives them the drills back when the year
   * has days to spare. In a MUST topic the first class and every checkpoint are never given up.
   *
   * In Year 3 a MUST or SHOULD topic's drills (debugging, practice, interview units) are DRILL: an
   * over-full year gives them up — strongest topic first, one per topic at a time — before any
   * lesson, checkpoint or project, so the end of the track (its full-stack and AI work, and the
   * capstone) is never what a weak learner loses. If MUST lessons must go too, they go the same
   * way, and projects only after every topic's lessons. Year 4's practice IS placement, so it is not.
   */
  const drillTier = stage !== 'placement';
  const topicItems = (topics: { topicCode: string; priority: TrackPriority }[], drilled: Set<string> | 'ALL'): Item[] => {
    const out: Item[] = [];
    for (const t of topics) {
      const units = unitsOf.get(t.topicCode) || [];
      if (!units.length) continue;
      const isHeld = held(units);
      const full = drilled === 'ALL' || drilled.has(t.topicCode);
      const strength = scoreOrNull(t.topicCode);
      const mine: Item[] = [];
      let firstClass = true;
      for (const u of units) {
        const isClass = u.unitType === 'CONCEPT';
        if (isHeld && !full && !(isClass && firstClass) && !PROOF.includes(u.unitType)) continue;
        // A CORE topic keeps every lesson (the capstone builds on it); a MUST topic its first lesson and checkpoints.
        const mustLike = t.priority === 'MUST' || t.priority === 'CORE';
        const core = mustLike && ((isClass && (firstClass || t.priority === 'CORE')) || u.unitType === 'CHECKPOINT');
        if (isClass) firstClass = false;
        const drill = drillTier && t.priority !== 'OPTIONAL' && DRILLS.includes(u.unitType);
        mine.push({ ...item(u, 'YEAR', core ? 'ESSENTIAL' : drill ? 'DRILL' : TIER_OF[t.priority], isHeld), ...(drill ? { strength } : {}) });
      }
      // A MUST topic is never empty: a learner who holds a topic made only of practice (Year 4's
      // mocks) still gets its first unit, as the topic's core.
      if (!mine.length && (t.priority === 'MUST' || t.priority === 'CORE')) mine.push(item(units[0], 'YEAR', 'ESSENTIAL', isHeld));
      if (drillTier) {
        // Ranked from the end of the topic, so an over-full year takes each topic's last first.
        // A project ranks after every lesson: the topic's proof is the last thing it gives up.
        const rankFromEnd = (list: Item[], offset = 0) => list.forEach((d, k) => { d.dropRank = offset + list.length - 1 - k; });
        rankFromEnd(mine.filter(i => i.tier === 'DRILL'));
        const extras = mine.filter(i => i.tier === 'MUST_EXTRA');
        const lessons = extras.filter(i => i.unit.unitType !== 'PROJECT');
        rankFromEnd(lessons);
        rankFromEnd(extras.filter(i => i.unit.unitType === 'PROJECT'), 1000);
        for (const i of extras) i.strength = strength;
      }
      out.push(...mine);
    }
    return out;
  };

  /** Enough for the days: at least a unit a day, and about half the study time the days hold. */
  const enough = (items: Item[], n: number) => slotsOf(items, fitOpts) >= n
    && items.reduce((s, i) => s + (Number(i.unit.estimatedMinutes) || 0), 0) >= n * opts.dailyMinutes * 0.5;

  /*
   * Fill `n` days from topics, as this learner needs them. When the days have room left, a topic
   * they already hold gets its drills back — their WEAKEST held topics first, one topic at a time,
   * until the year is full. So a strong learner's year is drill on what they are least sure of and
   * class-and-proof on what they plainly know: never everybody's identical year.
   */
  const fitTopics = (topics: { topicCode: string; priority: TrackPriority }[], n: number, label: string) => {
    const drilled = new Set<string>();
    let items = topicItems(topics, drilled);
    const heldTopics = topics.filter(t => held(unitsOf.get(t.topicCode) || [])).map(t => t.topicCode)
      .sort((a, b) => scoreOf(a) - scoreOf(b));
    for (const code of heldTopics) {
      if (enough(items, n)) break;
      drilled.add(code);
      items = topicItems(topics, drilled);
    }
    if (slotsOf(items, fitOpts) < n) items = topicItems(topics, 'ALL');
    if (slotsOf(items, fitOpts) < n) {
      return { error: `${label} has lessons for ${slotsOf(items, fitOpts)} day(s) but needs ${n}. Add content to its packs, or lower the days.` };
    }
    const fit = fitToDays(items, { ...fitOpts, days: n });
    return fit.ok ? { fit } : { error: `${label} could not be fitted into ${n} day(s).` };
  };

  let planDays: Item[][] = [];
  const dropped: Record<V2Tier, number> = { ESSENTIAL: 0, MUST_EXTRA: 0, BRIDGE_EXTRA: 0, REVISION: 0, SHOULD: 0, OPTIONAL: 0, DRILL: 0 };
  let overflowDays = 0;
  const addDropped = (d: Record<V2Tier, number>) => { for (const k of Object.keys(d) as V2Tier[]) dropped[k] += d[k] || 0; };

  if (stage !== 'placement') {
    // ── YEAR 3: the track's skill packs, nothing else. ──
    const r = fitTopics(yearTopics, days, `"${track.name}"`);
    if ('error' in r) return refuse(days, r.error as string);
    planDays = r.fit!.days;
    addDropped(r.fit!.dropped);
    overflowDays = r.fit!.overflowDays;
  } else {
    // ── YEAR 4, part 1: the track again — revision for a member, essentials for a fresh joiner. ──
    const prior = await priorStudyOf(tenantId, opts.studentId, ['specialize']);
    const member = yearTopics.some(t => prior.studiedTopics.has(t.topicCode));
    const { trackDays } = placementSplit(days, member, track.split);
    let trackItems: Item[] = [];
    if (member) {
      const pool = yearTopics.filter(t => prior.studiedTopics.has(t.topicCode)).map(t => {
        const units = unitsOf.get(t.topicCode) || [];
        const scores = topicSkills(units).map(k => profile.skills.get(k)?.score).filter((x): x is number => typeof x === 'number');
        return { topicCode: t.topicCode, units, score: scores.length ? Math.min(...scores) : null };
      });
      trackItems = revisionPick(pool, trackDays * opts.dailyMinutes, prior.completedUnits)
        .map(u => item(u, 'REVISION', 'REVISION', true));
    } else {
      for (const t of yearTopics.filter(x => x.priority !== 'OPTIONAL')) {
        const units = unitsOf.get(t.topicCode) || [];
        if (!units.length) continue;
        const standing = standingOn(profile.skills as any, topicSkills(units));
        for (const { unit, tier } of bridgeUnitsForTopic(units, standing)) {
          // The share is the admin's budget: essentials of later MUST topics may go before placement does.
          trackItems.push(item(unit, 'YEAR', t.priority === 'SHOULD' ? 'SHOULD' : tier === 'ESSENTIAL' ? 'MUST_EXTRA' : 'BRIDGE_EXTRA', standing === 'HELD'));
        }
      }
    }
    let trackPart: Item[][] = [];
    if (trackItems.length) {
      const tight = packTight(trackItems, fitOpts, trackDays);
      if (tight) trackPart = tight;
      else {
        const fit = fitToDays(trackItems, { ...fitOpts, days: trackDays });
        if (fit.ok) { trackPart = fit.days; addDropped(fit.dropped); }
      }
    }

    // ── YEAR 4, part 2: placement, in every day the track part leaves. ──
    const placementDaysLeft = days - trackPart.length;
    const r = fitTopics(placementTopics, placementDaysLeft, `"${track.name}" placement`);
    if ('error' in r) return refuse(days, r.error as string);
    planDays = [...trackPart, ...r.fit!.days];
    addDropped(r.fit!.dropped);
    overflowDays = r.fit!.overflowDays;
  }

  // In V2's shape: one list of units in day order, and the days pointing at them.
  const seen = new Map<string, SelectedUnit>();
  for (const d of planDays) for (const i of d) if (!seen.has(i.unit.unitCode)) seen.set(i.unit.unitCode, i.unit);
  const units = [...seen.values()].map((u, i) => ({ ...u, position: i + 1 }));
  const byCode = new Map(units.map(u => [u.unitCode, u]));
  const v2Days = planDays.map(d => d.map(i => ({ unit: byCode.get(i.unit.unitCode)!, phase: i.phase, tier: i.tier, part: i.part })));
  const revisionDays = v2Days.filter(d => d.some(x => x.phase === 'REVISION')).length;
  console.log(`[career-track] ${track.key} ${stage}: ${v2Days.length} days (${revisionDays} revision) — dropped ${JSON.stringify(dropped)}`);
  return {
    composition: { ok: true, requestedDays: days, units } as any,
    plan: { days: v2Days, revisionDays, bridgeDays: 0, yearDays: v2Days.length - revisionDays, dropped, overflowDays },
  };
}
