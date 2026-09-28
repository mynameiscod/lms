/**
 * Does every kind of joiner actually GET this year? Persist real journeys and look.
 *
 *   npx ts-node src/scripts/verifyStageJourneys.ts <tenantId> <stageKey> [days]
 *
 * ── WHY THIS PERSISTS RATHER THAN COMPOSES ────────────────────────────────────────────────
 *
 * Composing tells you what the composer chose. It does not tell you what the student receives,
 * and for Year 4 the two differed by fifty units: the composition held the capstone and the
 * packer trimmed it, silently, because a trim is not a refusal. Every defect that mattered there
 * was invisible until a journey was actually written to DayPlans and read back.
 *
 * So this writes a real journey for each profile, counts what landed in the days, and deletes it
 * again. Nothing is left behind.
 *
 * ── THE PROFILES ──────────────────────────────────────────────────────────────────────────
 *
 * The cases the product actually has: somebody arriving with nothing, somebody arriving without
 * the fundamentals the year assumes, somebody who finished the year before, and somebody strong
 * but lopsided. Uniform scores are included because they are the edges, and UNEVEN ones because
 * they are the realistic middle and behave differently — a lesson learned the hard way.
 *
 * `confidence` is LOW | MEDIUM | HIGH. Writing anything else — 'MEASURED', say — makes every
 * belief unreliable, so suppression never fires and every strong profile silently reads as weak.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { persistFoundationJourney, deleteFoundationJourney } from '../services/foundationJourneyService';
import { StudentProfile } from '../services/curriculumComposerService';
import { densityFor } from '../data/learningDensityPolicy';
import DayPlan from '../models/DayPlan';
import LearningCurriculum from '../models/LearningCurriculum';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';

/** The modules worth naming per stage: the bridge it opens with and the tail it must reach. */
const WATCHED: Record<string, { bridge: string[]; tail: string[]; track: Record<string, string> }> = {
  build: {
    bridge: ['B01_BRIDGE'],
    tail: ['B12_PROJECTS', 'B13_PROFESSIONAL', 'B14_VERIFICATION'],
    track: {
      SOFTWARE_BACKEND: 'B11_DIRECTIONS', WEB_DEVELOPMENT: 'B11_DIRECTIONS',
      DATA: 'B11_DIRECTIONS', AI_ML: 'B11_DIRECTIONS', MOBILE: 'B11_DIRECTIONS',
      CLOUD_DEVOPS: 'B11_DIRECTIONS', CYBERSECURITY: 'B11_DIRECTIONS',
    },
  },
  specialize: {
    bridge: ['S01_READINESS'],
    tail: ['S20_PRODUCTION_PROJECT', 'S21_INTERVIEW', 'S22_COMMUNICATION', 'S23_PORTFOLIO', 'S24_INTERNSHIP', 'S25_VERIFICATION'],
    track: {
      SOFTWARE_BACKEND: 'S12_BACKEND', WEB_DEVELOPMENT: 'S13_FRONTEND', DATA: 'S14_DATA',
      AI_ML: 'S15_AI_ML', CLOUD_DEVOPS: 'S16_CLOUD_DEVOPS', CYBERSECURITY: 'S17_CYBERSECURITY',
      MOBILE: 'S18_MOBILE', SOFTWARE_ENGINEERING: 'S18B_SOFTWARE_ENGINEERING', FULL_STACK: 'S18C_FULL_STACK',
    },
  },
  placement: {
    bridge: ['P02_BRIDGE'],
    tail: ['P22_MOCKS', 'P23_SIMULATION', 'P24_VERIFICATION'],
    track: {
      SOFTWARE_BACKEND: 'P06_BACKEND', WEB_DEVELOPMENT: 'P07_FRONTEND', DATA: 'P09_DATA',
      AI_ML: 'P10_AIML', CLOUD_DEVOPS: 'P11_CLOUD', CYBERSECURITY: 'P12_SECURITY',
      MOBILE: 'P13_MOBILE', SOFTWARE_ENGINEERING: 'P05_SE', FULL_STACK: 'P08_FULLSTACK',
    },
  },
};

/** A deterministic uneven spread, so "strong" does not mean "identical on every skill". */
const spread = (lo: number, range: number) => (k: string): number =>
  lo + ([...k].reduce((a, c) => a + c.charCodeAt(0), 0) % range);

async function run(): Promise<void> {
  const tenantId = process.argv[2];
  const stageKey = process.argv[3];
  const days = Number(process.argv[4] || 0) || undefined;
  if (!tenantId || !stageKey) {
    console.error('Usage: verifyStageJourneys.ts <tenantId> <stageKey> [days]');
    process.exit(1);
  }
  const watch = WATCHED[stageKey];
  if (!watch) { console.error(`No watch list for stage ${stageKey}.`); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const units = await CurriculumLearningUnit.find({ tenantId, stageKey })
    .select('unitCode moduleCode skillKeys').lean() as any[];
  const modOf = new Map(units.map(u => [String(u.unitCode), String(u.moduleCode)]));
  const allSkills = [...new Set(units.flatMap(u => (u.skillKeys || []).map(String)))];

  const prof = (score: (k: string) => number | null, dir: string): StudentProfile => {
    const m = new Map<string, any>();
    for (const k of allSkills) {
      const v = score(k);
      if (v !== null) m.set(k, { score: v, confidence: 'HIGH' });
    }
    return { skills: m, primaryDirection: dir, directionStatus: 'COMMITTED' } as any;
  };

  const dirs = Object.keys(watch.track);
  const main = dirs[0];
  const cases: [string, StudentProfile, string][] = [
    ['arrives with nothing measured', prof(() => null, main), main],
    ['weak on everything (28)', prof(() => 28, main), main],
    ['weak, uneven spread', prof(spread(15, 30), main), main],
    ['mid, uneven spread', prof(spread(40, 30), main), main],
    ['finished the year before (75)', prof(() => 75, main), main],
    ['strong, uneven spread', prof(spread(55, 35), main), main],
    ['very strong, uneven spread', prof(spread(70, 25), main), main],
    ['very strong, uniform 93', prof(() => 93, main), main],
    ...dirs.slice(1, 4).map((d): [string, StudentProfile, string] =>
      [`mid, direction ${d}`, prof(spread(40, 30), d), d]),
  ];

  console.log(`\n${stageKey.toUpperCase()} — ${units.length} units, ${days ?? 'tenant default'} days\n`);
  const head = ['bridge', 'track', ...watch.tail.map(t => t.replace(/^[A-Z0-9]+_/, '').slice(0, 7).toLowerCase())];
  console.log(`${'profile'.padEnd(32)}${'density'.padEnd(9)}days  units | ${head.map(h => h.padStart(7)).join(' ')}`);

  let refused = 0;
  for (const [label, p, dir] of cases) {
    const sid = new mongoose.Types.ObjectId();
    const d = densityFor(p, stageKey);
    try {
      const r: any = await persistFoundationJourney(tenantId, sid, p, { stageKey, programDays: days });
      if (r?.ok === false) {
        refused++;
        console.log(`${label.padEnd(32)}${String(d.unitsPerDay).padEnd(9)}REFUSED: ${String(r.reason).slice(0, 70)}`);
        continue;
      }
      const cur = await LearningCurriculum.findOne({ tenantId, personalizedFor: sid, adaptiveStage: stageKey })
        .select('_id').lean() as any;
      const plans = await DayPlan.find({ curriculumId: cur?._id }).select('dayNumber unitCodes items').lean() as any[];
      const codes = new Set<string>();
      for (const pl of plans) for (const c of ((pl as any).unitCodes || [])) codes.add(String(c));
      const empty = plans.filter(pl => !((pl as any).items || []).length).length;
      const count = (mods: string[]) => [...codes].filter(c => mods.includes(modOf.get(c) || '')).length;
      const cells = [
        count(watch.bridge),
        count([watch.track[dir]]),
        ...watch.tail.map(t => count([t])),
      ];
      const flag = empty ? ` EMPTY_DAYS=${empty}` : '';
      console.log(`${label.padEnd(32)}${String(d.unitsPerDay).padEnd(9)}${String(plans.length).padStart(4)} ${String(codes.size).padStart(6)} | ${cells.map(c => String(c).padStart(7)).join(' ')}${flag}`);
    } catch (e: any) {
      refused++;
      console.log(`${label.padEnd(32)}${String(d.unitsPerDay).padEnd(9)}THREW ${String(e?.message || e).slice(0, 70)}`);
    } finally {
      await deleteFoundationJourney(tenantId, sid, stageKey);
    }
  }

  console.log(`\n${cases.length - refused} of ${cases.length} profiles received a journey.`);
  console.log('Every journey written by this script has been deleted again.\n');
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
