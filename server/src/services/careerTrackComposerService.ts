import { ComposerResult, SelectedUnit, StudentProfile, ComposableUnit } from './curriculumComposerService';
import { loadCandidates, assertProductionEligible, CandidateSource } from './composerCandidateService';
import { densityFor } from '../data/learningDensityPolicy';
import {
  standingOn, bridgeUnitsForTopic, fitToDays, packTight, slotsOf, revisionPick, isYearRefresher, PlanItem, V2Tier, V2Phase,
} from '../data/roadmapV2PlanPolicy';
import { trackTopics, placementSplit, TrackPriority, MAX_TRACK_SHARE } from '../data/careerTrackPolicy';
import { asSelected, byTopic, topicSkills, V2Plan } from './roadmapV2ComposerService';
import { priorStudyOf } from './learnerHistoryService';
import { ResolvedTrack } from './careerTrackService';
import LearningCurriculum from '../models/LearningCurriculum';
import { appliesToDirection } from '../data/careerDirectionPolicy';

/**
 * A career-track roadmap (see careerTrackPolicy). The user's rules (2026-10-30):
 *
 *   A FRESH JOINER — in Year 2, 3 or 4 — GETS THE FULL TRACK. Every lesson, every practice and
 *   project; a checkpoint may be given up, practice never. Personal to the assessment: debugging
 *   drills are skipped on topics the learner already holds. It is packed into as few days as fit
 *   at the learner's own daily time; only when the full track cannot fit does the day stretch.
 *   Years 2 and 3 then give the year's own curriculum in the days left (fillCurriculum: its topics
 *   the track does not teach, for this learner). Year 4 gives placement in the days left,
 *   which always keep at least (1 − MAX_TRACK_SHARE) of the year.
 *
 *   A MEMBER WHO DID THE TRACK THE YEAR BEFORE gets a short revision of it (the track's
 *   memberTrackShare of the days, weakest first), any track topic they never reached taught in
 *   full, and then the year's own part: its curriculum in Year 3, placement in Year 4.
 * Fitted into the admin's days at the daily study time by
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

/** A stage curriculum's topics in course order, with the admin's priorities (unclassified: backbone SHOULD, else OPTIONAL). */
async function curriculumTopicsOf(tenantId: string, stage: string): Promise<{ topicCode: string; priority: TrackPriority }[]> {
  const cur: any = await LearningCurriculum.findOne({ tenantId, adaptiveStage: stage, personalizedFor: null })
    .select('topics.topicCode topics.priority topics.backbone topics.order').lean();
  return ((cur?.topics || []) as any[])
    .filter(t => t.topicCode)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .map(t => ({ topicCode: String(t.topicCode), priority: (t.priority || (t.backbone ? 'SHOULD' : 'OPTIONAL')) as TrackPriority }));
}

export async function composeTrackRoadmap(
  tenantId: string,
  profile: StudentProfile,
  resolved: ResolvedTrack,
  opts: TrackComposeOptions,
): Promise<{ composition: ComposerResult; plan: V2Plan | null; reason?: string }> {
  const { track, packs } = resolved;
  const stage = opts.stageKey;
  const days = opts.programDays;
  // The track's skill packs, in teaching order: the whole track, in every year.
  const yearTopics = trackTopics(track.specializePacks, packs);
  const placementTopics = stage === 'placement' ? trackTopics(track.placementPacks, packs) : [];
  /*
   * The year's own curriculum (Years 2 and 3): its topics in course order with the admin's priorities,
   * less the topics the track already teaches. Given in the days the track leaves.
   */
  const yearCurriculum = stage === 'placement' ? [] : await curriculumTopicsOf(tenantId, stage);
  const trackCodes = new Set(yearTopics.map(t => t.topicCode));
  const curriculumTopics = yearCurriculum.filter(t => !trackCodes.has(t.topicCode));
  const topicCodes = [...new Set([...yearTopics, ...placementTopics, ...curriculumTopics].map(t => t.topicCode))];

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

  /*
   * THE FULL TRACK, as this learner needs it: every lesson, practice and project of every topic;
   * a topic's debugging drills only when they do not already hold it. Checkpoints are kept when
   * they fit and are the only thing ever given up.
   */
  const fullTrackItems = (topics: { topicCode: string; priority: TrackPriority }[], withCheckpoints: boolean): Item[] => {
    const out: Item[] = [];
    for (const t of topics) {
      const units = unitsOf.get(t.topicCode) || [];
      const isHeld = held(units);
      for (const u of units) {
        if (u.unitType === 'CHECKPOINT' && !withCheckpoints) continue;
        if (u.unitType === 'DEBUG' && isHeld) continue;
        out.push(item(u, 'YEAR', 'ESSENTIAL', isHeld));
      }
    }
    return out;
  };
  /*
   * IN ORDER, AS FULL AS THE DAY ALLOWS. Each day takes the next units until the daily time or the
   * per-day unit limit is reached; a unit longer than a day gets consecutive days of its own, as
   * parts. Simple and exact: the day count at a given daily time is what the learner will live.
   * (The shared packer spreads units evenly and gives every project its own day, so stretching
   * the day barely shortened the track: 233 days at 150 minutes, 212 at 300.)
   */
  const packInOrder = (items: Item[], minutes: number, cap: number): Item[][] => {
    const out: Item[][] = [];
    let day: Item[] = [];
    let used = 0;
    const close = () => { if (day.length) { out.push(day); day = []; used = 0; } };
    for (const it of items) {
      const m = Number(it.unit.estimatedMinutes) || 0;
      if (m > minutes) {
        close();
        const of = Math.ceil(m / minutes);
        for (let k = 1; k <= of; k++) out.push([{ ...it, part: { index: k, of } }]);
        continue;
      }
      if (day.length >= cap || used + m > minutes) close();
      day.push(it); used += m;
    }
    close();
    return out;
  };
  /** Units a day may hold at a daily time: the learner's density, more as the day stretches. */
  const capFor = (minutes: number) => Math.max(fitOpts.maxUnitsPerDay, Math.ceil(minutes / 35));
  /**
   * The full track in at most `limit` days, as few as possible: at the learner's own daily time when it
   * fits, otherwise the day stretches 15 minutes at a time (to 10 hours) until it does. Checkpoints go
   * only if even that cannot fit them.
   */
  const packFull = (topics: { topicCode: string; priority: TrackPriority }[], limit: number): { days: Item[][]; dailyMinutes: number; checkpoints: boolean } | null => {
    if (limit < 1) return null;
    for (const withCheckpoints of [true, false]) {
      const items = fullTrackItems(topics, withCheckpoints);
      if (!items.length) return { days: [], dailyMinutes: opts.dailyMinutes, checkpoints: withCheckpoints };
      for (let minutes = opts.dailyMinutes; minutes <= 600; minutes += 15) {
        const packed = packInOrder(items, minutes, capFor(minutes));
        if (packed.length <= limit) return { days: packed, dailyMinutes: minutes, checkpoints: withCheckpoints };
      }
    }
    return null;
  };
  /*
   * THE YEAR'S CURRICULUM, AS THIS LEARNER NEEDS IT, in exactly `n` days. A topic they do not hold:
   * every unit. One they hold: its lesson and its proof. Year-3 units outside their direction are
   * left out. Nothing here is ESSENTIAL — it is what the days left allow — so an over-full year gives
   * up OPTIONAL, then SHOULD, then MUST topics, strongest first (fitToDays).
   */
  const fillCurriculum = (n: number): { days: Item[][]; dropped: Record<V2Tier, number> } | null => {
    if (n < 1) return { days: [], dropped: { ESSENTIAL: 0, MUST_EXTRA: 0, BRIDGE_EXTRA: 0, REVISION: 0, SHOULD: 0, OPTIONAL: 0, DRILL: 0 } };
    const direction = profile.primaryDirection || (profile.explorationDirections || [])[0] || null;
    // The year's own refresher module (B01_BRIDGE…) is left out, as the regular V2 year leaves it out: the track has just taught it.
    const mine = (t: { topicCode: string }) => (unitsOf.get(t.topicCode) || [])
      .filter(u => !isYearRefresher(u.moduleCode))
      .filter(u => !(u.applicableDirections || []).length || (!!direction && appliesToDirection(u.applicableDirections, direction)));
    const build = (drilled: Set<string> | 'ALL'): Item[] => {
      const items: Item[] = [];
      for (const t of curriculumTopics) {
        const units = mine(t);
        if (!units.length) continue;
        const isHeld = held(units);
        const full = drilled === 'ALL' || drilled.has(t.topicCode);
        const strength = scoreOrNull(t.topicCode);
        let firstClass = true;
        for (const u of units) {
          const isClass = u.unitType === 'CONCEPT';
          if (isHeld && !full && !(isClass && firstClass) && !PROOF.includes(u.unitType)) continue;
          if (isClass) firstClass = false;
          const tier: V2Tier = t.priority === 'MUST' ? 'MUST_EXTRA' : t.priority === 'SHOULD' ? 'SHOULD' : 'OPTIONAL';
          items.push({ ...item(u, 'YEAR', tier, isHeld), strength });
        }
      }
      return items;
    };
    // Too little to fill the days (a strong learner holds most topics): their WEAKEST held topics get
    // their practice back, one topic at a time, as the track year does.
    const drilled = new Set<string>();
    let items = build(drilled);
    const heldTopics = curriculumTopics.filter(t => held(mine(t))).map(t => t.topicCode).sort((a, b) => scoreOf(a) - scoreOf(b));
    for (const code of heldTopics) {
      if (slotsOf(items, fitOpts) >= n) break;
      drilled.add(code);
      items = build(drilled);
    }
    if (slotsOf(items, fitOpts) < n) items = build('ALL');
    if (slotsOf(items, fitOpts) < n) return null;
    const fit = fitToDays(items, { ...fitOpts, days: n });
    return fit.ok && fit.days.length === n ? { days: fit.days, dropped: fit.dropped } : null;
  };
  /** Revision of the topics a member studied with us, weakest first, in `n` days at most. */
  const revisionDaysOf = (studied: { topicCode: string }[], n: number, completedUnits: Set<string>): Item[][] => {
    const pool = studied.map(t => {
      const units = unitsOf.get(t.topicCode) || [];
      const scores = topicSkills(units).map(k => profile.skills.get(k)?.score).filter((x): x is number => typeof x === 'number');
      return { topicCode: t.topicCode, units, score: scores.length ? Math.min(...scores) : null };
    });
    const items = revisionPick(pool, n * opts.dailyMinutes, completedUnits).map(u => item(u, 'REVISION', 'REVISION', true));
    if (!items.length) return [];
    const tight = packTight(items, fitOpts, n);
    if (tight) return tight;
    const fit = fitToDays(items, { ...fitOpts, days: n });
    return fit.ok ? fit.days : [];
  };

  let planDays: Item[][] = [];
  let fillDays = 0;
  let stretchedTo = opts.dailyMinutes;
  /** The years before this one, where a member may have done the track already. */
  const earlierStages = stage === 'placement' ? ['build', 'specialize'] : stage === 'specialize' ? ['build'] : [];
  const prior = await priorStudyOf(tenantId, opts.studentId, earlierStages);
  const member = yearTopics.some(t => prior.studiedTopics.has(t.topicCode));
  const dropped: Record<V2Tier, number> = { ESSENTIAL: 0, MUST_EXTRA: 0, BRIDGE_EXTRA: 0, REVISION: 0, SHOULD: 0, OPTIONAL: 0, DRILL: 0 };
  let overflowDays = 0;
  const addDropped = (d: Record<V2Tier, number>) => { for (const k of Object.keys(d) as V2Tier[]) dropped[k] += d[k] || 0; };

  if (stage !== 'placement') {
    // ── YEARS 2 AND 3: the track (in full, or revised for a member), then the year's curriculum. ──
    const revision = member ? revisionDaysOf(yearTopics.filter(t => prior.studiedTopics.has(t.topicCode)), placementSplit(days, true, track.split).trackDays, prior.completedUnits) : [];
    const toTeach = member ? yearTopics.filter(t => !prior.studiedTopics.has(t.topicCode)) : yearTopics;
    const left = days - revision.length;
    const full = packFull(toTeach, left);
    // The curriculum in the days the track leaves — or, when there is none to give, the track spread over them.
    const rest = full ? fillCurriculum(left - full.days.length) : null;
    if (full && rest) {
      planDays = [...revision, ...full.days, ...rest.days];
      stretchedTo = full.dailyMinutes;
      if (!full.checkpoints) dropped.ESSENTIAL += fullTrackItems(toTeach, true).filter(i => i.unit.unitType === 'CHECKPOINT').length;
      fillDays = rest.days.length;
      addDropped(rest.dropped);
    } else if (full && fitToDays(fullTrackItems(toTeach, full.checkpoints), { ...fitOpts, dailyMinutes: full.dailyMinutes, maxUnitsPerDay: capFor(full.dailyMinutes), days: left }).ok) {
      // No curriculum to give: the full track spread over every day left, at the same daily time.
      const spread = fitToDays(fullTrackItems(toTeach, full.checkpoints), { ...fitOpts, dailyMinutes: full.dailyMinutes, maxUnitsPerDay: capFor(full.dailyMinutes), days: left });
      planDays = [...revision, ...spread.days];
      stretchedTo = full.dailyMinutes;
    } else {
      // Spread over every day (no curriculum to fill with), or the track cannot fit even at 10 hours a day: the V2 fit decides.
      const r = fitTopics(toTeach, left, `"${track.name}"`);
      if ('error' in r) return refuse(days, r.error as string);
      planDays = [...revision, ...r.fit!.days];
      addDropped(r.fit!.dropped);
      overflowDays = r.fit!.overflowDays;
    }
  } else {
    // ── YEAR 4, part 1: the track again — revision for a member, the FULL track for a fresh joiner. ──
    const { trackDays } = placementSplit(days, member, track.split);
    let trackItems: Item[] = [];
    let freshFull: Item[][] | null = null;
    if (!member) {
      /*
       * As few days as the full track needs — but placement keeps what IT needs: the days its MUST
       * topics take at the learner's own time, and never less than (1 − MAX_TRACK_SHARE) of the year.
       * The track's day stretches to fit what is left.
       */
      const placementMust = topicItems(placementTopics.filter(t => t.priority === 'MUST' || t.priority === 'CORE'), new Set());
      const placementNeeds = Math.max(Math.ceil(days * (1 - MAX_TRACK_SHARE)), packInOrder(placementMust, opts.dailyMinutes, fitOpts.maxUnitsPerDay).length);
      const full = packFull(yearTopics, Math.max(1, days - placementNeeds));
      if (full) { freshFull = full.days; stretchedTo = full.dailyMinutes; }
    }
    if (member) {
      const pool = yearTopics.filter(t => prior.studiedTopics.has(t.topicCode)).map(t => {
        const units = unitsOf.get(t.topicCode) || [];
        const scores = topicSkills(units).map(k => profile.skills.get(k)?.score).filter((x): x is number => typeof x === 'number');
        return { topicCode: t.topicCode, units, score: scores.length ? Math.min(...scores) : null };
      });
      trackItems = revisionPick(pool, trackDays * opts.dailyMinutes, prior.completedUnits)
        .map(u => item(u, 'REVISION', 'REVISION', true));
    } else if (!freshFull) {
      // The full track could not be packed even at 10 hours a day: its essentials, as before.
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
    let trackPart: Item[][] = freshFull || [];
    if (!freshFull && trackItems.length) {
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
  console.log(`[career-track] ${track.key} ${stage}: ${v2Days.length} days (${revisionDays} revision, ${fillDays} left for the year's curriculum, ${stretchedTo} min/day) — dropped ${JSON.stringify(dropped)}`);
  return {
    composition: { ok: true, requestedDays: days, units } as any,
    plan: { days: v2Days, revisionDays, bridgeDays: 0, yearDays: v2Days.length - revisionDays, dropped, overflowDays },
  };
}
