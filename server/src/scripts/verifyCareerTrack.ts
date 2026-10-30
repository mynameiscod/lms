/**
 * Does a career track keep its promises? Persist real roadmaps from it and check.
 *
 *   npx ts-node src/scripts/verifyCareerTrack.ts <tenantId> <trackKey>
 *   npx ts-node src/scripts/verifyCareerTrack.ts <tenantId> --demo      a track assembled from existing topics
 *   ... --days=180 --minutes=150                                         try a year length before setting it
 *
 * For Year 3, and for Year 4 as a member (did Year 3 on the track) and as a fresh joiner, across
 * Skill DNA profiles, it writes a real roadmap and checks:
 *
 *   DAYS     exactly the admin's days for the year
 *   LOAD     no day over the daily study time
 *   MUST     every MUST topic of the year's packs is in the roadmap (Year 4: of the placement packs)
 *   SPLIT    Year 4: the track part is within the admin's share (member short, fresh longer)
 *   ONCE     no unit given twice (a project's consecutive parts aside)
 *   DNA      different Skill DNA, different roadmaps
 *
 * `--demo` needs no track content: it assembles a track in memory from topics that exist today
 * (Year-3 backend for "Year 3", Year-4 placement modules for placement) to prove the engine.
 * Everything written is deleted again. Exits 1 when a promise is broken.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { persistFoundationJourney, deleteFoundationJourney } from '../services/foundationJourneyService';
import { StudentProfile } from '../services/curriculumComposerService';
import { programDaysFor } from '../services/foundationProgramLengthService';
import { loadTrack, ResolvedTrack } from '../services/careerTrackService';
import { trackTopics, placementSplit, PackDef, MAX_TRACK_SHARE } from '../data/careerTrackPolicy';
import { resolveRoadmapV2 } from '../data/roadmapV2Policy';
import PassportConfig from '../models/PassportConfig';
import DayPlan from '../models/DayPlan';
import LearningCurriculum from '../models/LearningCurriculum';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import CurriculumEnrollment from '../models/CurriculumEnrollment';

const spread = (lo: number, range: number) => (k: string): number => lo + ([...k].reduce((a, c) => a + c.charCodeAt(0), 0) % range);
const PROFILES: [string, (k: string) => number | null][] = [
  ['nothing measured', () => null], ['weak (28)', () => 28], ['mid, uneven', spread(40, 30)], ['very strong (93)', () => 93],
];

/** A track made of topics that exist today, to prove the engine before any track content is written. */
async function demoTrack(tenantId: string): Promise<ResolvedTrack> {
  const topicsOf = async (stage: string, modules: RegExp) => {
    const cur = await LearningCurriculum.findOne({ tenantId, adaptiveStage: stage, personalizedFor: null }).select('topics').lean() as any;
    return ((cur?.topics || []) as any[]).filter(t => modules.test(String(t.moduleCode || ''))).sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(t => ({ topicCode: String(t.topicCode), priority: (t.priority || 'SHOULD') as any }));
  };
  const packs = new Map<string, PackDef>([
    ['DEMO_CORE', { key: 'DEMO_CORE', title: 'Demo core', kind: 'SKILL', topics: await topicsOf('specialize', /^S0[2-8]_/) }],
    ['DEMO_BACKEND', { key: 'DEMO_BACKEND', title: 'Demo backend', kind: 'SKILL', topics: await topicsOf('specialize', /^S12_/) }],
    ['DEMO_PLACEMENT', { key: 'DEMO_PLACEMENT', title: 'Demo placement', kind: 'PLACEMENT', topics: await topicsOf('placement', /^P1[5-9]_|^P2[0-3]_/) }],
  ]);
  return {
    track: { key: 'DEMO_TRACK', name: 'Demo track', language: 'Any', status: 'DRAFT', specializePacks: ['DEMO_CORE', 'DEMO_BACKEND'], placementPacks: ['DEMO_PLACEMENT'], split: { memberTrackShare: 0.15, freshTrackShare: 0.4 } },
    packs,
  };
}

async function run(): Promise<void> {
  const [tenantId, which] = process.argv.slice(2);
  if (!tenantId || !which) { console.error('Usage: verifyCareerTrack.ts <tenantId> <trackKey|--demo>'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const resolved = which === '--demo' ? await demoTrack(tenantId) : await loadTrack(tenantId, which);
  if (!resolved) throw new Error(`No track ${which}.`);
  const cfg = await PassportConfig.findOne({ tenantId }).select('roadmapV2').lean() as any;
  const flag = (name: string) => Number(process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1]) || null;
  const resolvedV2 = resolveRoadmapV2(cfg?.roadmapV2);
  const dailyMinutes = flag('minutes') || resolvedV2.dailyMinutes;
  const { revisionDays } = resolvedV2;
  const setting = { dailyMinutes, revisionDays };
  const allUnits = await CurriculumLearningUnit.find({ tenantId }).select('unitCode topicCode unitType status estimatedMinutes skillKeys prerequisiteSkillKeys').lean() as any[];
  const unitOf = new Map(allUnits.map(u => [String(u.unitCode), u]));
  const skills = [...new Set(allUnits.flatMap(u => [...(u.skillKeys || []), ...(u.prerequisiteSkillKeys || [])]).map(String))];
  const profileOf = (score: (k: string) => number | null): StudentProfile => {
    const m = new Map<string, any>();
    for (const k of skills) { const v = score(k); if (v !== null) m.set(k, { score: v, confidence: 'HIGH' }); }
    return { skills: m } as any;
  };
  const { track, packs } = resolved;
  console.log(`\n${track.name} (${track.key}) — ${dailyMinutes} min/day`);
  let failures = 0;

  /*
   * THE RULES (user, 2026-10-30): a FRESH joiner in Years 2, 3 and 4 gets the FULL track — every lesson,
   * practice and project; checkpoints may go; debugging only on topics they do not hold — then the
   * year's curriculum (Years 2, 3) or placement (Year 4, at least 20% of the days). A MEMBER who did
   * the track the year before gets a short revision of it, then the year's own part.
   */
  const runs = [
    ['build', 'FRESH', null], ['specialize', 'FRESH', null], ['specialize', 'MEMBER', 'build'],
    ['placement', 'MEMBER', 'specialize'], ['placement', 'FRESH', null],
  ] as const;
  const trackTopicSet = new Set(trackTopics(track.specializePacks, packs).map(t => t.topicCode));
  for (const [stage, joiner, priorStage] of runs) {
    const days = (stage === 'specialize' && flag('days')) || await programDaysFor(tenantId, stage);
    const mustTopics = stage === 'placement' ? trackTopics(track.placementPacks, packs).filter(t => t.priority === 'MUST').map(t => t.topicCode) : [];
    console.log(`\n${stage === 'build' ? 'YEAR 2' : stage === 'specialize' ? 'YEAR 3' : 'YEAR 4'} ${joiner} — ${days} days`);
    const prints: string[] = [];
    for (const [label, score] of PROFILES) {
      const sid = new mongoose.Types.ObjectId();
      const profile = profileOf(score);
      const problems: string[] = [];
      let summary = '';
      try {
        if (priorStage) {
          // Last year on the track, every day completed.
          const before: any = await persistFoundationJourney(tenantId, sid, profile, { stageKey: priorStage, roadmapV2: setting, track: resolved });
          if (!before.ok) throw new Error(`last year's roadmap could not be written: ${before.reason}`);
          await CurriculumEnrollment.create({ tenantId, curriculumId: before.curriculumId, curriculumTitle: 'verify', studentId: sid, studentName: 'verify',
            studentEmail: 'verify@example.com', startDate: new Date(), enrolledBy: 'verifyCareerTrack', completedDays: Array.from({ length: before.days }, (_, i) => i + 1) });
        }
        const r: any = await persistFoundationJourney(tenantId, sid, profile, { stageKey: stage, programDays: days, roadmapV2: setting, track: resolved });
        if (!r.ok) { problems.push(`REFUSED: ${String(r.reason).slice(0, 110)}`); throw null; }
        const plans = await DayPlan.find({ curriculumId: r.curriculumId }).select('dayNumber phase unitCodes').sort({ dayNumber: 1 }).lean() as any[];
        if (plans.length !== days) problems.push(`DAYS: ${plans.length}, admin set ${days}`);
        const daysOf = new Map<string, number>();
        for (const d of plans) for (const c of new Set<string>((d.unitCodes || []).map(String))) daysOf.set(c, (daysOf.get(c) || 0) + 1);
        let maxMin = 0;
        for (const d of plans) {
          const min = (d.unitCodes || []).map(String).reduce((s: number, c: string) => s + Math.ceil((Number(unitOf.get(c)?.estimatedMinutes) || 0) / (daysOf.get(c) || 1)), 0);
          maxMin = Math.max(maxMin, min);
        }
        // A day may stretch past the study time only to fit the full track; 10 hours is the hard ceiling.
        if (maxMin > 600) problems.push(`LOAD: a day of ${maxMin} min`);
        for (const [c, k] of daysOf) {
          if (k < 2) continue;
          const at = plans.filter(d => (d.unitCodes || []).map(String).includes(c)).map(d => d.dayNumber);
          if (at[at.length - 1] - at[0] !== k - 1) { problems.push(`ONCE: ${c} on days ${at.join(',')}`); break; }
        }
        const topics = new Set(plans.flatMap(d => (d.unitCodes || []).map((c: any) => String(unitOf.get(String(c))?.topicCode || ''))));
        const missing = mustTopics.filter(t => !topics.has(t));
        if (missing.length) problems.push(`MUST: ${missing.length} missing (${missing.slice(0, 3).join(', ')})`);
        const given = new Set(plans.flatMap(d => (d.unitCodes || []).map(String)));
        const trackPart = plans.filter(d => (d.unitCodes || []).some((c: any) => trackTopicSet.has(String(unitOf.get(String(c))?.topicCode || '')))).length;
        if (joiner === 'FRESH') {
          // FULL: every lesson, practice and project of the track (debugging and checkpoints may be skipped).
          const owed = allUnits.filter(u => u.status === 'PUBLISHED' && trackTopicSet.has(String(u.topicCode)) && ['CONCEPT', 'PRACTICE', 'PROJECT'].includes(String(u.unitType)));
          const missed = owed.filter(u => !given.has(String(u.unitCode)));
          if (missed.length) problems.push(`FULL: ${missed.length} of ${owed.length} track lessons/practice missing`);
        }
        if (stage === 'placement') {
          const budget = joiner === 'MEMBER' ? placementSplit(days, true, track.split).trackDays : Math.floor(days * MAX_TRACK_SHARE);
          if (trackPart > budget) problems.push(`SPLIT: track part ${trackPart} days, allowed ${budget}`);
        }
        summary = `${String(plans.length).padStart(4)} days | max ${maxMin} min | track ${trackPart} / ${stage === 'placement' ? 'placement' : 'curriculum'} ${plans.length - trackPart}`;
        prints.push(plans.map(d => (d.unitCodes || []).join('+')).join('|'));
      } catch (e: any) {
        if (e) problems.push(`THREW ${String(e?.message || e).slice(0, 100)}`);
      } finally {
        await deleteFoundationJourney(tenantId, sid, stage);
        if (priorStage) await deleteFoundationJourney(tenantId, sid, priorStage);
        await CurriculumEnrollment.deleteMany({ tenantId, studentId: sid });
      }
      if (problems.length) failures++;
      console.log(`  ${label.padEnd(18)} ${summary.padEnd(44)} ${problems.length ? '✗ ' + problems.join(' | ') : 'ok'}`);
    }
    const distinct = new Set(prints).size;
    console.log(`  DNA: ${distinct} different roadmaps from ${prints.length} profiles`);
  }
  console.log(failures ? `\n${failures} roadmap(s) broke a promise.` : '\nEvery roadmap kept every promise.');
  console.log('Everything written by this script has been deleted again.\n');
  await mongoose.disconnect();
  process.exit(failures ? 1 : 0);
}

run().catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
