/**
 * Does Roadmap V2 keep its promises for every kind of learner? Persist real journeys and check.
 *
 *   npx ts-node src/scripts/verifyRoadmapV2.ts <tenantId> [stageKey ...]
 *
 * For each year, each kind of joiner and each Skill DNA profile this writes a real V2 journey
 * (DayPlans and all), reads it back and checks the promises the user was given:
 *
 *   DAYS      the journey is exactly the admin's days for that year — bridge and revision inside it
 *   LOAD      no day asks for more than the daily study time (a long project is split into parts)
 *   MUST      every MUST topic of the year is in the journey; a fresh joiner gets every Year-1 MUST
 *   PHASES    revision, then bridge, then the year — never interleaved
 *   JOINER    a fresh joiner gets no revision; a member moving up gets the admin's revision days
 *             (one who left a year part-way gets revision on what they reached — at most that)
 *   GATE      a journey with a bridge has a foundation gate in front of the year's first day
 *   DNA       learners with different Skill DNA get different roadmaps
 *
 * The joiners: FRESH (new to CareerPilot this year), MEMBER (finished every earlier year with us)
 * and LEFT (finished the years before last, left last year at day 10). Earlier-year journeys of a
 * member are written with V1, which is what every existing member actually has.
 *
 * V2 is forced on for these throwaway learners only — the tenant's setting is read for its daily
 * minutes and revision days but never changed. Everything written is deleted again.
 * Exits 1 when any promise is broken.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { persistFoundationJourney, deleteFoundationJourney } from '../services/foundationJourneyService';
import { StudentProfile } from '../services/curriculumComposerService';
import { programDaysFor } from '../services/foundationProgramLengthService';
import { loadCandidates } from '../services/composerCandidateService';
import { foundationGateFor } from '../services/roadmapV2GateService';
import { resolveRoadmapV2, ROADMAP_V2_STAGES } from '../data/roadmapV2Policy';
import PassportConfig from '../models/PassportConfig';
import DayPlan from '../models/DayPlan';
import LearningCurriculum from '../models/LearningCurriculum';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import CurriculumEnrollment from '../models/CurriculumEnrollment';

type Joiner = 'FRESH' | 'MEMBER' | 'LEFT';
const LEFT_AT_DAY = 10;

/** A deterministic uneven spread, so "strong" does not mean "identical on every skill". */
const spread = (lo: number, range: number) => (k: string): number =>
  lo + ([...k].reduce((a, c) => a + c.charCodeAt(0), 0) % range);

const PROFILES: [string, (k: string) => number | null][] = [
  ['nothing measured', () => null],
  ['weak (28)', () => 28],
  ['weak, uneven', spread(15, 30)],
  ['mid, uneven', spread(40, 30)],
  ['strong, uneven', spread(55, 35)],
  ['very strong (93)', () => 93],
];

interface Row { stage: string; joiner: Joiner; profile: string; days: number; rev: number; bridge: number; year: number; maxMin: number; fingerprint: string; problems: string[] }

async function run(): Promise<void> {
  const tenantId = process.argv[2];
  const stages = process.argv.slice(3).length ? process.argv.slice(3) : [...ROADMAP_V2_STAGES];
  if (!tenantId) {
    console.error('Usage: verifyRoadmapV2.ts <tenantId> [stageKey ...]');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const cfg = await PassportConfig.findOne({ tenantId }).select('roadmapV2').lean() as any;
  const { dailyMinutes, revisionDays } = resolveRoadmapV2(cfg?.roadmapV2);
  const setting = { dailyMinutes, revisionDays };

  const allUnits = await CurriculumLearningUnit.find({ tenantId })
    .select('unitCode topicCode stageKey estimatedMinutes skillKeys prerequisiteSkillKeys').lean() as any[];
  const unitOf = new Map(allUnits.map(u => [String(u.unitCode), u]));
  const allSkills = [...new Set(allUnits.flatMap(u => [...(u.skillKeys || []), ...(u.prerequisiteSkillKeys || [])]).map(String))];
  const profileOf = (score: (k: string) => number | null): StudentProfile => {
    const m = new Map<string, any>();
    for (const k of allSkills) {
      const v = score(k);
      if (v !== null) m.set(k, { score: v, confidence: 'HIGH' });
    }
    // Years 3 and 4 are bought with a committed direction; the others ignore it.
    return { skills: m, primaryDirection: 'SOFTWARE_BACKEND', directionStatus: 'COMMITTED' } as any;
  };

  /** Each stage's MUST topics that the published curriculum can actually give a unit to. */
  const mustOf = new Map<string, Set<string>>();
  for (const st of ROADMAP_V2_STAGES) {
    const cur = await LearningCurriculum.findOne({ tenantId, adaptiveStage: st, personalizedFor: null })
      .select('topics.topicCode topics.priority').lean() as any;
    const set = await loadCandidates(tenantId, 'PRODUCTION', st).catch(() => null);
    const teachable = new Set((set?.units || []).map(u => String(u.topicCode)));
    const must = ((cur?.topics || []) as any[]).filter(t => t.priority === 'MUST').map(t => String(t.topicCode));
    const unteachable = must.filter(t => !teachable.has(t));
    if (unteachable.length) console.log(`  note: ${st} has ${unteachable.length} MUST topic(s) with no published unit — not checked: ${unteachable.join(', ')}`);
    mustOf.set(st, new Set(must.filter(t => teachable.has(t))));
  }

  console.log(`\nRoadmap V2 — tenant ${tenantId}, ${dailyMinutes} min/day, ${revisionDays} revision days\n`);
  const rows: Row[] = [];

  for (const stage of stages) {
    const programDays = await programDaysFor(tenantId, stage);
    const earlier = ROADMAP_V2_STAGES.slice(0, ROADMAP_V2_STAGES.indexOf(stage));
    const joiners: Joiner[] = earlier.length ? ['FRESH', 'MEMBER', 'LEFT'] : ['FRESH'];
    console.log(`${stage.toUpperCase()} — admin days ${programDays}`);
    console.log(`  ${'joiner'.padEnd(7)}${'profile'.padEnd(19)}days  rev bridge year  max-min  result`);

    for (const joiner of joiners) {
      for (const [label, score] of PROFILES) {
        const sid = new mongoose.Types.ObjectId();
        const profile = profileOf(score);
        const row: Row = { stage, joiner, profile: label, days: 0, rev: 0, bridge: 0, year: 0, maxMin: 0, fingerprint: '', problems: [] };
        try {
          // A member's earlier years, as they have them today: V1 journeys with days completed.
          if (joiner !== 'FRESH') {
            for (const st of earlier) {
              /* V1 refuses some very strong profiles a full year; their history is then written with V2. */
              let r: any = await persistFoundationJourney(tenantId, sid, profile, { stageKey: st, roadmapV2: null });
              if (r?.ok === false) r = await persistFoundationJourney(tenantId, sid, profile, { stageKey: st, roadmapV2: setting });
              if (r?.ok === false) { row.problems.push(`could not write the earlier ${st} journey`); continue; }
              const last = st === earlier[earlier.length - 1] && joiner === 'LEFT' ? LEFT_AT_DAY : r.days;
              await CurriculumEnrollment.create({
                tenantId, curriculumId: r.curriculumId, curriculumTitle: `verify ${st}`, studentId: sid,
                studentName: 'Roadmap V2 verify', studentEmail: 'roadmap-v2-verify@example.com',
                startDate: new Date(), enrolledBy: 'verifyRoadmapV2',
                completedDays: Array.from({ length: last }, (_, i) => i + 1),
              });
            }
          }

          const r: any = await persistFoundationJourney(tenantId, sid, profile, { stageKey: stage, programDays, roadmapV2: setting });
          if (r?.ok === false) { row.problems.push(`REFUSED: ${String(r.reason).slice(0, 80)}`); rows.push(row); report(row); continue; }
          const cur = await LearningCurriculum.findById(r.curriculumId).select('totalDays roadmapVersion phaseDays v2Report').lean() as any;
          const plans = await DayPlan.find({ curriculumId: r.curriculumId }).select('dayNumber phase unitCodes items').sort({ dayNumber: 1 }).lean() as any[];
          checkJourney(row, cur, plans, { programDays, dailyMinutes, revisionDays, earlier, unitOf, mustOf });
          const gate = await foundationGateFor(r.curriculumId, String(sid));
          if (row.bridge) {
            if (!gate.applies || !gate.total) row.problems.push('GATE: a bridge with no foundation checks');
            else if (gate.open) row.problems.push('GATE: open before any check was passed');
            if (gate.firstYearDay !== row.rev + row.bridge + 1) row.problems.push(`GATE: stands at day ${gate.firstYearDay}, year starts at ${row.rev + row.bridge + 1}`);
          } else if (gate.applies && !gate.open) row.problems.push('GATE: closed with no bridge');
        } catch (e: any) {
          row.problems.push(`THREW ${String(e?.message || e).slice(0, 80)}`);
        } finally {
          for (const st of [...earlier, stage]) await deleteFoundationJourney(tenantId, sid, st);
          await CurriculumEnrollment.deleteMany({ tenantId, studentId: sid });
        }
        rows.push(row);
        report(row);
      }
    }

    // DNA: within one year and one kind of joiner, different scores must give different roadmaps.
    for (const joiner of joiners) {
      const group = rows.filter(r => r.stage === stage && r.joiner === joiner && r.fingerprint);
      const distinct = new Set(group.map(r => r.fingerprint)).size;
      const same: string[] = [];
      for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
        if (group[i].fingerprint === group[j].fingerprint) same.push(`${group[i].profile} = ${group[j].profile}`);
      }
      console.log(`  DNA ${joiner}: ${distinct} different roadmaps from ${group.length} profiles${same.length ? ` (identical: ${same.join('; ')})` : ''}`);
      if (group.length > 1 && distinct < 2) group[0].problems.push(`DNA: every ${joiner} profile got the same roadmap`);
    }
    console.log('');
  }

  const failed = rows.filter(r => r.problems.length);
  console.log(`${rows.length - failed.length} of ${rows.length} journeys kept every promise.`);
  for (const r of failed) console.log(`  ✗ ${r.stage} ${r.joiner} ${r.profile}: ${r.problems.join(' | ')}`);
  console.log('Every journey and enrollment written by this script has been deleted again.\n');
  await mongoose.disconnect();
  process.exit(failed.length ? 1 : 0);
}

function checkJourney(
  row: Row, cur: any, plans: any[],
  ctx: { programDays: number; dailyMinutes: number; revisionDays: number; earlier: string[]; unitOf: Map<string, any>; mustOf: Map<string, Set<string>> },
): void {
  const p = row.problems;
  row.days = plans.length;

  // DAYS
  if (plans.length !== ctx.programDays) p.push(`DAYS: ${plans.length}, admin set ${ctx.programDays}`);
  if (cur?.totalDays !== ctx.programDays) p.push(`DAYS: totalDays ${cur?.totalDays}`);
  if (cur?.roadmapVersion !== 'ROADMAP_V2') p.push('not stored as ROADMAP_V2');
  if (cur?.v2Report?.overflowDays) p.push(`DAYS: essentials over by ${cur.v2Report.overflowDays}`);
  plans.forEach((d, i) => { if (d.dayNumber !== i + 1) p.push(`DAYS: day ${i + 1} missing`); });
  const empty = plans.filter(d => !(d.unitCodes || []).length).length;
  if (empty) p.push(`${empty} day(s) without a unit`);
  const noItems = plans.filter(d => !(d.items || []).length).length;
  if (noItems) p.push(`${noItems} day(s) without activities`);

  // PHASES, in order
  const rank: Record<string, number> = { REVISION: 0, BRIDGE: 1, YEAR: 2 };
  for (let i = 1; i < plans.length; i++) {
    if ((rank[plans[i].phase] ?? -1) < (rank[plans[i - 1].phase] ?? -1)) { p.push(`PHASES: ${plans[i].phase} after ${plans[i - 1].phase} at day ${i + 1}`); break; }
  }
  if (plans.some(d => !(d.phase in rank))) p.push('PHASES: a day with no phase');
  row.rev = plans.filter(d => d.phase === 'REVISION').length;
  row.bridge = plans.filter(d => d.phase === 'BRIDGE').length;
  row.year = plans.filter(d => d.phase === 'YEAR').length;
  if (!row.year) p.push('PHASES: no year days');

  // JOINER
  if (row.joiner === 'FRESH' && row.rev) p.push(`JOINER: a fresh joiner got ${row.rev} revision day(s)`);
  if (row.joiner === 'FRESH' && ctx.earlier.length && !row.bridge) p.push('JOINER: a fresh joiner got no bridge');
  if (row.joiner === 'MEMBER' && row.rev !== ctx.revisionDays) p.push(`JOINER: ${row.rev} revision day(s), admin set ${ctx.revisionDays}`);
  /* Left part-way: revision on what they reached, which can be less than the admin's days. */
  if (row.joiner === 'LEFT' && (!row.rev || row.rev > ctx.revisionDays)) p.push(`JOINER: ${row.rev} revision day(s), admin set ${ctx.revisionDays}`);

  // LOAD — a unit on k days is a project in k parts, each ceil(minutes / k).
  const daysOf = new Map<string, number>();
  for (const d of plans) for (const c of new Set<string>((d.unitCodes || []).map(String))) daysOf.set(c, (daysOf.get(c) || 0) + 1);
  for (const d of plans) {
    const min = (d.unitCodes || []).map(String).reduce((s: number, c: string) => s + Math.ceil((Number(ctx.unitOf.get(c)?.estimatedMinutes) || 0) / (daysOf.get(c) || 1)), 0);
    row.maxMin = Math.max(row.maxMin, min);
    if (min > ctx.dailyMinutes) { p.push(`LOAD: day ${d.dayNumber} is ${min} min`); break; }
  }
  // A unit on several days must be consecutive parts, never the same unit twice.
  for (const [c, k] of daysOf) {
    if (k < 2) continue;
    const at = plans.filter(d => (d.unitCodes || []).map(String).includes(c)).map(d => d.dayNumber);
    if (at[at.length - 1] - at[0] !== k - 1) { p.push(`unit ${c} repeated on days ${at.join(',')}`); break; }
  }

  // MUST coverage
  const topics = new Set<string>();
  const yearTopics = new Set<string>();
  for (const d of plans) for (const c of (d.unitCodes || [])) {
    const t = String(ctx.unitOf.get(String(c))?.topicCode || '');
    topics.add(t);
    if (d.phase === 'YEAR') yearTopics.add(t);
  }
  const missing = [...(ctx.mustOf.get(row.stage) || [])].filter(t => !topics.has(t));
  if (missing.length) p.push(`MUST: ${missing.length} year topic(s) missing: ${missing.slice(0, 4).join(', ')}`);
  if (row.joiner === 'FRESH' && ctx.earlier.length) {
    const y1 = [...(ctx.mustOf.get('foundation') || [])].filter(t => !topics.has(t));
    if (y1.length) p.push(`MUST: ${y1.length} Year-1 topic(s) not bridged: ${y1.slice(0, 4).join(', ')}`);
  }

  row.fingerprint = plans.map(d => (d.unitCodes || []).join('+')).join('|');
}

function report(r: Row): void {
  const nums = `${String(r.days).padStart(4)} ${String(r.rev).padStart(4)} ${String(r.bridge).padStart(6)} ${String(r.year).padStart(4)} ${String(r.maxMin).padStart(8)}`;
  console.log(`  ${r.joiner.padEnd(7)}${r.profile.padEnd(19)}${nums}  ${r.problems.length ? `✗ ${r.problems.join(' | ')}` : 'ok'}`);
}

run().catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
