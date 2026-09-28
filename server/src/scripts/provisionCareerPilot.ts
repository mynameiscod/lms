/**
 * Stand a tenant up with the whole of CareerPilot: four years of curriculum, their content,
 * the question banks, the stage skill sets and the role blueprints — in the one order that works.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/scripts/provisionCareerPilot.ts <tenantId>
 *   npx ts-node src/scripts/provisionCareerPilot.ts <tenantId> --apply
 *   npx ts-node src/scripts/provisionCareerPilot.ts <tenantId> --apply --from 8
 *   npx ts-node src/scripts/provisionCareerPilot.ts <tenantId> --apply --only 15,16,17,18
 *   npx ts-node src/scripts/provisionCareerPilot.ts <tenantId> --verify-only
 *
 * ── READ THIS BEFORE RUNNING IT AGAINST PRODUCTION ────────────────────────────────────────
 *
 * THIS DOES NOT COPY THE DEVELOPMENT DATABASE, AND IT SHOULD NOT.
 *
 * Every curriculum, unit, content bundle and question in CareerPilot is GENERATED FROM FILES IN
 * THIS REPOSITORY — the stage maps, the unit datasets, the content bundles and the golden-bank
 * CSVs under `docs/audit`. Production does not need a copy of a database; it needs the same
 * generators run against it, which is what this does.
 *
 * Copying the dev database instead would carry everything that is NOT curriculum: the test
 * members and their journeys, sixty-one dev payment rows, dev Razorpay settings, two tenants'
 * worth of half-finished experiments. Those are precisely the things production must not have.
 *
 * WHAT THIS CANNOT DO FOR YOU, and must be done by hand first or after:
 *
 *   1. THE TENANT MUST EXIST. This writes into a tenant; it does not create one. Create it the
 *      way you normally do and pass its id.
 *   2. RAZORPAY KEYS ARE NOT COPIED. Production needs its own live keys, set in the admin
 *      screen under Integrations. Copying dev's test keys into production would be a bug with
 *      a refund attached.
 *   3. PREVIEW VIDEOS ARE NOT SEEDED HERE. `seedPreviewVideos.ts` is separate and deliberate.
 *   4. ADMIN USERS, BRANDING AND PRICING are tenant setup, not curriculum.
 *
 * ── RUNNING IT ON A TENANT THAT ALREADY HAS STUDENTS ──────────────────────────────────────
 *
 * Every step is idempotent, and the seeders are written so a re-run never unpublishes a unit
 * somebody published or undoes an authorship decision an admin made. That is what makes this
 * safe to re-run when content changes.
 *
 * It is NOT invisible, though. `reconcileUnitAuthorship` changes unit depth and direction
 * scoping, and depth and directions are inputs to composition — so a student whose journey is
 * recomposed AFTER this runs may get a different plan from the one they would have got before.
 * That is the point (it is fixing wrong data), but it is a real change and the script says so
 * when it finds journeys already on the tenant.
 *
 * ── THE ORDER IS NOT ARBITRARY ────────────────────────────────────────────────────────────
 *
 * Skills before everything, because a curriculum that names an unknown skill is refused.
 * Curricula before content, because content binds to unit codes that must already exist.
 * Content before publishing, because publishing refuses a unit that has nothing to teach.
 * Blueprints and stage sets before anybody sits an assessment, and the banks before that again.
 *
 * Steps run in order and the run HALTS on the first failure, because a later step reading a
 * half-written earlier one is how a tenant ends up subtly wrong rather than obviously broken.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import LearningCurriculum from '../models/LearningCurriculum';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import AssessmentItem from '../models/AssessmentItem';
import RoleSkillBlueprint from '../models/RoleSkillBlueprint';

interface Step {
  n: number;
  label: string;
  /** Script path relative to `server/`. */
  script: string;
  /** Arguments BEFORE the apply flag. `%t` is replaced with the tenant id. */
  args: string[];
  /** Steps that write nothing ever — run identically in dry run and apply. */
  readOnly?: boolean;
  /** A step whose failure is a warning rather than a halt, with the reason. */
  optional?: string;
}

const STEPS: Step[] = [
  /* ── The taxonomy everything else is checked against ──────────────────────────────────── */
  {
    n: 1,
    label: 'Career skill taxonomy (GLOBAL — not per tenant)',
    script: 'src/scripts/seedCareerSkills.ts',
    args: [],
  },

  /* ── The four curricula. Units land DRAFT; nothing is visible yet. ────────────────────── */
  /**
   * Year 1's curriculum document itself — its topics, skill keys and backbone flags. Years 2-4
   * create theirs inside their seeders; Year 1's seeder only adds units to one that already
   * exists, so on a new tenant everything after this step used to halt on "No 'foundation'
   * curriculum".
   */
  { n: 2, label: 'Year 1 — create the foundation curriculum (topics, skills, backbone)', script: 'src/seeds/careerPilot/createFoundationCurriculum.ts', args: ['%t'] },
  {
    n: 3,
    label: 'Validate the Year-1 mega curriculum before importing it',
    script: 'src/scripts/validateMegaCurriculum.ts',
    args: ['%t'],
    readOnly: true,
  },
  { n: 4, label: 'Year 1 — foundation curriculum and units', script: 'src/seeds/careerPilot/seedYear1MegaCurriculum.ts', args: ['%t'] },
  { n: 5, label: 'Year 2 — build curriculum and units', script: 'src/seeds/careerPilot/seedYear2Curriculum.ts', args: ['%t'] },
  { n: 6, label: 'Year 3 — specialize curriculum and units', script: 'src/seeds/careerPilot/seedYear3Curriculum.ts', args: ['%t'] },
  { n: 7, label: 'Year 4 — placement curriculum and units', script: 'src/seeds/careerPilot/seedYear4Curriculum.ts', args: ['%t'] },

  /**
   * Depth and directions are written on INSERT only, so a tenant seeded before those fields were
   * resolved correctly keeps the wrong values however often it is re-seeded. On a fresh tenant
   * this finds nothing and says so.
   */
  { n: 8, label: 'Reconcile unit depth and direction scoping', script: 'src/scripts/reconcileUnitAuthorship.ts', args: ['%t'] },

  /* ── What each stage measures. `--enable` turns the set on; without it nothing reads it. ── */
  { n: 9, label: 'Stage skill set — foundation', script: 'src/seeds/careerPilot/seedFoundationStageSkillSet.ts', args: ['%t', '--enable'] },
  { n: 10, label: 'Stage skill set — build', script: 'src/seeds/careerPilot/seedFoundationStageSkillSet.ts', args: ['%t', '--enable', '--year2'] },
  { n: 11, label: 'Stage skill set — specialize', script: 'src/seeds/careerPilot/seedFoundationStageSkillSet.ts', args: ['%t', '--enable', '--year3'] },
  { n: 12, label: 'Stage skill set — placement', script: 'src/seeds/careerPilot/seedFoundationStageSkillSet.ts', args: ['%t', '--enable', '--year4'] },

  /**
   * Without these, every student who names a target role is refused an assessment and then a
   * roadmap. The seeder writes them unpublished; this publishes the ones it just created.
   */
  { n: 13, label: 'Role blueprints — the seven core roles, seeded and published', script: 'src/scripts/seedAndPublishRoleBlueprints.ts', args: ['%t'] },
  {
    n: 14,
    label: 'Role blueprints — AI, Data, Security and Cloud',
    script: 'src/scripts/seedAiDataSecurityRoles.ts',
    args: ['%t'],
    optional: 'these roles are optional; the core seven are what the setup screen leads with',
  },

  /* ── The teaching itself: notes, practice, checkpoints and assignments per unit ────────── */
  { n: 15, label: 'Unit content — Year 1', script: 'src/seeds/careerPilot/seedPilotUnitContent.ts', args: ['%t'] },
  { n: 16, label: 'Unit content — Year 2', script: 'src/seeds/careerPilot/seedPilotUnitContent.ts', args: ['%t', '--year2'] },
  { n: 17, label: 'Unit content — Year 3', script: 'src/seeds/careerPilot/seedPilotUnitContent.ts', args: ['%t', '--year3'] },
  { n: 18, label: 'Unit content — Year 4', script: 'src/seeds/careerPilot/seedPilotUnitContent.ts', args: ['%t', '--year4'] },

  /**
   * The assessment banks. These read the master CSVs under `docs/audit`, which are build
   * artefacts committed to the repo — if they are stale, re-emit them first with
   * emitYear2GoldenBank.ts / emitYear3GoldenBank.ts.
   */
  { n: 19, label: 'Golden bank — foundation', script: 'src/scripts/importGoldenBank.ts', args: ['%t'] },
  { n: 20, label: 'Golden bank — Year 2', script: 'src/scripts/importGoldenBank.ts', args: ['%t', '--year2'] },
  { n: 21, label: 'Golden bank — Year 3', script: 'src/scripts/importGoldenBank.ts', args: ['%t', '--year3'] },

  /* ── Last, because a unit is only publishable once it has something to teach ───────────── */
  { n: 22, label: 'Publish — foundation', script: 'src/scripts/publishStageUnits.ts', args: ['%t', 'foundation'] },
  { n: 23, label: 'Publish — build', script: 'src/scripts/publishStageUnits.ts', args: ['%t', 'build'] },
  { n: 24, label: 'Publish — specialize', script: 'src/scripts/publishStageUnits.ts', args: ['%t', 'specialize'] },
  { n: 25, label: 'Publish — placement', script: 'src/scripts/publishStageUnits.ts', args: ['%t', 'placement'] },
];

const SERVER_ROOT = path.resolve(__dirname, '../..');

function runStep(step: Step, tenantId: string, apply: boolean): { ok: boolean; tail: string } {
  const args = step.args.map(a => (a === '%t' ? tenantId : a));
  if (apply && !step.readOnly) args.push('--apply');

  const res = spawnSync('npx', ['ts-node', step.script, ...args], {
    cwd: SERVER_ROOT,
    encoding: 'utf8',
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });

  const out = `${res.stdout || ''}${res.stderr || ''}`;
  const lines = out.split('\n').filter(l => l.trim().length);
  return { ok: res.status === 0, tail: lines.slice(-14).join('\n') };
}

/** What the tenant actually holds afterwards — the only report worth trusting. */
async function verify(tenantId: string): Promise<void> {
  console.log('\n══ VERIFICATION ═══════════════════════════════════════════════════════════════\n');

  const stages = ['foundation', 'build', 'specialize', 'placement'];
  let anyMissing = false;
  for (const stage of stages) {
    const total = await CurriculumLearningUnit.countDocuments({ tenantId, stageKey: stage } as any);
    const published = await CurriculumLearningUnit.countDocuments({ tenantId, stageKey: stage, status: 'PUBLISHED' } as any);
    const curriculum = await LearningCurriculum.findOne({ tenantId, adaptiveStage: stage, personalizedFor: null } as any)
      .select('topics').lean() as any;
    const topics = (curriculum?.topics || []).length;
    const backbone = (curriculum?.topics || []).filter((t: any) => t.backbone === true).length;
    if (!total || !published) anyMissing = true;
    console.log(`  ${stage.padEnd(11)} ${String(published).padStart(4)}/${String(total).padEnd(4)} units published   ${String(topics).padStart(3)} topics (${backbone} backbone)`);
  }

  const items = await AssessmentItem.countDocuments({ tenantId } as any);
  const withSkill = await AssessmentItem.countDocuments({ tenantId, 'golden.skillKey': { $exists: true } } as any);
  console.log(`\n  assessment items       ${items} (${withSkill} skill-keyed)`);

  const blueprints = await RoleSkillBlueprint.find({ tenantId }).select('roleKey published').lean() as any[];
  const publishedBps = blueprints.filter(b => b.published).length;
  console.log(`  role blueprints        ${blueprints.length} (${publishedBps} published)`);

  const journeys = await LearningCurriculum.countDocuments({ tenantId, personalizedFor: { $ne: null } } as any);
  console.log(`  student journeys       ${journeys}`);

  console.log('');
  if (anyMissing) {
    console.log('  ⚠ A stage has no published units. Re-run the steps for it and read their output.');
  }
  if (!publishedBps) {
    console.log('  ⚠ No published role blueprints: every student who names a target role will be');
    console.log('    refused an assessment, and with no Skill DNA, a roadmap after it.');
  }
  if (!withSkill) {
    console.log('  ⚠ No skill-keyed assessment items: the entry assessment has nothing to ask.');
  }
  console.log('');
}

async function main(): Promise<void> {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const verifyOnly = process.argv.includes('--verify-only');

  const fromArg = process.argv.indexOf('--from');
  const from = fromArg > -1 ? Number(process.argv[fromArg + 1]) || 1 : 1;
  const onlyArg = process.argv.indexOf('--only');
  const only = onlyArg > -1
    ? new Set(String(process.argv[onlyArg + 1] || '').split(',').map(s => Number(s.trim())).filter(Boolean))
    : null;

  if (!tenantId || tenantId.startsWith('--')) {
    console.error('Usage: provisionCareerPilot.ts <tenantId> [--apply] [--from N] [--only a,b,c] [--verify-only]');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  await mongoose.connect(uri);

  /* Say plainly which database and which tenant, because that is the mistake that costs most. */
  const host = uri.replace(/\/\/[^@]*@/, '//<credentials>@').split('?')[0];
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════');
  console.log('║  CAREERPILOT PROVISIONING');
  console.log(`║  database : ${host}`);
  console.log(`║  tenant   : ${tenantId}`);
  console.log(`║  mode     : ${verifyOnly ? 'VERIFY ONLY' : apply ? 'APPLY — this writes' : 'DRY RUN — nothing is written'}`);
  console.log('╚══════════════════════════════════════════════════════════════════════════════\n');

  if (verifyOnly) {
    await verify(tenantId);
    await mongoose.disconnect();
    return;
  }

  const existingJourneys = await LearningCurriculum.countDocuments({ tenantId, personalizedFor: { $ne: null } } as any);
  if (existingJourneys) {
    console.log(`  NOTE: this tenant already has ${existingJourneys} student journey(s).`);
    console.log('  Step 8 changes unit depth and direction scoping, which are inputs to composition,');
    console.log('  so a journey recomposed after this runs may differ from the one it would have');
    console.log('  produced before. Nothing already written to a student\'s days is touched.\n');
  }

  const planned = STEPS.filter(s => s.n >= from && (!only || only.has(s.n)));
  console.log(`  running ${planned.length} of ${STEPS.length} steps\n`);

  const failures: string[] = [];
  for (const step of planned) {
    const tag = `[${String(step.n).padStart(2)}/${STEPS.length}]`;
    process.stdout.write(`${tag} ${step.label} … `);
    const { ok, tail } = runStep(step, tenantId, apply);
    if (ok) {
      console.log('ok');
      continue;
    }
    if (step.optional) {
      console.log(`SKIPPED (${step.optional})`);
      console.log(tail.split('\n').map(l => `        ${l}`).join('\n'));
      continue;
    }
    console.log('FAILED');
    console.log(tail.split('\n').map(l => `        ${l}`).join('\n'));
    failures.push(`${step.n}. ${step.label}`);
    console.log('\n  HALTED. A later step reading a half-written earlier one is how a tenant ends up');
    console.log('  subtly wrong rather than obviously broken. Fix the above, then re-run with');
    console.log(`  --from ${step.n} to continue from here.\n`);
    break;
  }

  if (!failures.length) {
    console.log(`\n  All ${planned.length} steps completed.`);
    if (!apply) console.log('  DRY RUN — nothing was written. Re-run with --apply.');
  }

  await verify(tenantId);
  await mongoose.disconnect();
  if (failures.length) process.exit(1);
}

main().catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
