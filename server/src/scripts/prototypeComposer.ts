/**
 * Run the composition core against the real authored inventory.
 *
 * READ ONLY. It loads candidates, composes, and prints. No DayPlan, no student assignment, no
 * publication — composition is a decision, and persisting it is P7B's job with its own approvals.
 *
 * IT USES THE PROTOTYPE CANDIDATE SOURCE, which accepts READY units regardless of publication.
 * That is the only way to exercise the algorithm before anybody publishes anything, and it is
 * why `assertProductionEligible` exists: the same set would be refused by a production caller.
 *
 *   npx ts-node src/scripts/prototypeComposer.ts <tenantId>
 *   npx ts-node src/scripts/prototypeComposer.ts <tenantId> --target=20
 *   npx ts-node src/scripts/prototypeComposer.ts <tenantId> --profile=web --verbose
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { loadCandidates, assertProductionEligible } from '../services/composerCandidateService';
import {
  composeUnits, StudentProfile, SkillBelief, ComposableUnit,
} from '../services/curriculumComposerService';
import { explainReason } from '../data/adaptiveCurriculumPolicy';

dotenv.config();

const belief = (score: number | null): SkillBelief => ({ score, confidence: 'HIGH' });

/**
 * Five synthetic students, chosen to exercise different branches rather than to look realistic.
 *
 * Skill keys are filled in against the real inventory at runtime: hard-coding them would make
 * the profiles quietly stop working the moment the curriculum was edited.
 */
const PROFILES: Record<string, (skills: string[]) => StudentProfile> = {
  beginner: () => ({
    // Nothing measured. Every unit is NOT_EXPOSED — unknown, not weak.
    skills: new Map(),
    primaryDirection: null,
    directionStatus: 'UNDECIDED',
  }),

  mixed: (skills) => ({
    // A real diagnostic: some gaps, some adequate, most untouched.
    skills: new Map(skills.slice(0, 6).map((k, i) => [k, belief([20, 35, 55, 70, 45, 80][i])])),
    primaryDirection: 'WEB_DEVELOPMENT',
    directionStatus: 'SELECTED',
  }),

  strong: (skills) => ({
    // Everything demonstrated. VERIFIED must not remove these units, only rank them last.
    skills: new Map(skills.map(k => [k, belief(92)])),
    primaryDirection: 'WEB_DEVELOPMENT',
    directionStatus: 'SELECTED',
  }),

  web: (skills) => ({
    skills: new Map(skills.filter(k => /HTML|CSS|JS/.test(k)).map(k => [k, belief(30)])),
    primaryDirection: 'WEB_DEVELOPMENT',
    directionStatus: 'SELECTED',
  }),

  undecided: (skills) => ({
    skills: new Map(skills.slice(0, 2).map(k => [k, belief(55)])),
    primaryDirection: null,
    directionStatus: 'EXPLORING',
    explorationDirections: ['WEB_DEVELOPMENT', 'DATA', 'AI_ML'],
  }),
};

const TARGETS = [10, 20, 30, 90];

(async () => {
  const tenantId = process.argv[2];
  const verbose = process.argv.includes('--verbose');
  const onlyProfile = (process.argv.find(a => a.startsWith('--profile=')) || '').split('=')[1];
  const onlyTarget = Number((process.argv.find(a => a.startsWith('--target=')) || '').split('=')[1]);

  if (!tenantId) {
    console.error('Usage: prototypeComposer.ts <tenantId> [--target=N] [--profile=name] [--verbose]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const production = await loadCandidates(tenantId, 'PRODUCTION');
  const prototype = await loadCandidates(tenantId, 'PROTOTYPE_UNPUBLISHED');

  const line = (n = 84) => console.log('-'.repeat(n));

  console.log('\nCOMPOSER PROTOTYPE  ·  tenant ' + tenantId);
  line();
  console.log(`  PRODUCTION candidates (PUBLISHED and READY)   ${production.units.length}`);
  console.log(`  PROTOTYPE candidates  (READY, any status)     ${prototype.units.length}`);
  console.log(`  prototype set is production eligible          ${prototype.isProductionEligible}`);

  /** Proof the wall holds: a production caller refuses the prototype set. */
  let refused = '';
  try { assertProductionEligible(prototype); } catch (e: any) { refused = e.message; }
  console.log(`  assertProductionEligible(prototype)           ${refused ? 'THREW' : 'did not throw (!)'}`);

  const candidates: ComposableUnit[] = prototype.units;
  const allSkills = [...new Set(candidates.flatMap(u => u.skillKeys))].sort();
  console.log(`  distinct skills across candidates             ${allSkills.length}`);

  const profileNames = onlyProfile ? [onlyProfile] : Object.keys(PROFILES);
  const targets = onlyTarget ? [onlyTarget] : TARGETS;

  for (const name of profileNames) {
    const make = PROFILES[name];
    if (!make) { console.log(`\n  unknown profile: ${name}`); continue; }
    const student = make(allSkills);

    line();
    console.log(`  PROFILE: ${name}`);
    console.log(`    direction ${student.primaryDirection || '(none)'} · ${student.directionStatus}`
      + ` · ${student.skills.size} skill(s) measured`);

    for (const target of targets) {
      const r = composeUnits({ candidates, targetUnits: target, student });

      if (!r.ok) {
        console.log(`    target ${String(target).padStart(3)}  ->  ${r.code}`);
        console.log(`                   requestedDays=${r.requestedDays} eligibleUnits=${r.eligibleUnits}`
          + ` composed=${r.units.length}`);
        continue;
      }

      const reasons = new Map<string, number>();
      for (const u of r.units) reasons.set(u.reason, (reasons.get(u.reason) || 0) + 1);

      console.log(`    target ${String(target).padStart(3)}  ->  ${r.units.length} units`
        + ` · ${r.totalMinutes} min`
        + ` · ${[...reasons].map(([k, v]) => `${k}=${v}`).join(' ')}`);

      if (verbose) {
        for (const u of r.units) {
          console.log(`        ${String(u.position).padStart(3)}  ${u.unitCode.padEnd(32)}`
            + `${u.reason.padEnd(21)}${u.state.padEnd(20)}`
            + `${u.score === null ? '   -' : String(u.score).padStart(4)}`);
        }
        console.log('');
        // The student-facing sentence, from the existing explainer rather than a new one.
        const first = r.units[0];
        console.log(`        e.g. "${explainReason(first.reason, {
          skillName: first.governingSkill || first.title, score: first.score,
        })}"`);
      }
    }
  }

  line();
  console.log('  Nothing was written. No DayPlan, no assignment, no publication.\n');

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
