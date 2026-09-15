/**
 * Provision a tenant with the CareerPilot Year-1 Foundation product. THE supported way to do it.
 *
 * ── WHY ONE COMMAND ───────────────────────────────────────────────────────────────────────
 *
 * Every Year-1 record except the skill taxonomy belongs to one tenant, and its ids are derived from
 * that tenant's id. Creating a tenant creates none of it. So a tenant made through the UI, another
 * machine's database, or a new institute starts with no Foundation curriculum at all — which, before
 * Foundation was made a product invariant, silently gave its first-years the topic roadmap.
 *
 * This runs the audited seeds in their canonical order against one tenant, publishes exactly the
 * certified set through the product's publish handler, verifies the result, runs the production
 * gate, and records the run. Nothing here is specific to any tenant.
 *
 * ── SAFE TO RUN AGAIN ─────────────────────────────────────────────────────────────────────
 *
 * Every step is idempotent: seeds upsert on deterministic keys (updating, never duplicating),
 * publication skips units already published, verification and certification only read. A failed
 * run is resumed by running it again.
 *
 * ── REQUIREMENTS ──────────────────────────────────────────────────────────────────────────
 *
 * The tenant must exist and have a TENANT_ADMIN (seeded project briefs are attributed to one).
 * The repository's committed fixtures and docs/audit question bank must be present, which they are
 * in any checkout of this branch.
 *
 *   npx ts-node src/scripts/provisionCareerPilotFoundation.ts <tenantId>            # plan only
 *   npx ts-node src/scripts/provisionCareerPilotFoundation.ts <tenantId> --apply
 *   ... --apply --skip-certify        # skip the (read-only, slow) production gate at the end
 *
 * From a compiled build: node dist/scripts/provisionCareerPilotFoundation.js <tenantId> --apply
 */

import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { spawnSync } from 'child_process';
import mongoose from 'mongoose';
import { loadCandidates } from '../services/composerCandidateService';
import { checkCurriculumQuizLinkage } from '../services/quizLinkageService';
import { foundationReadiness } from '../services/foundationReadinessService';
import {
  planCertifiedPublication, publishCertifiedFoundation, loadCertifiedSet, CERTIFIED_FOUNDATION,
} from '../services/certifiedFoundationPublicationService';
import { effectiveCurriculumEngine } from '../data/curriculumEnginePolicy';
import { CAREER_STAGES } from '../services/careerStageService';

const ACTOR = 'careerpilot-foundation-provisioning';
const SERVER_ROOT = path.join(__dirname, '..', '..');
const RUNNING_TS = __filename.endsWith('.ts');

/** The audited seeds, in the order they depend on each other. `{T}` is the tenant id. */
const SEED_STEPS: { name: string; script: string; args: string[] }[] = [
  { name: 'skill taxonomy (global)', script: 'scripts/seedCareerSkills', args: ['--apply'] },
  { name: 'Foundation question bank', script: 'scripts/importGoldenBank', args: ['{T}', '--apply'] },
  { name: 'Foundation curriculum hierarchy', script: 'seeds/careerPilot/createFoundationCurriculum', args: ['{T}', '--apply'] },
  { name: 'curriculum validation gate', script: 'scripts/validateMegaCurriculum', args: ['{T}'] },
  { name: 'Year-1 Learning Units', script: 'seeds/careerPilot/seedYear1MegaCurriculum', args: ['{T}', '--apply'] },
  { name: 'Year-1 expansion units', script: 'seeds/careerPilot/seedYear1Expansion', args: ['{T}', '--apply'] },
  { name: 'Foundation content', script: 'seeds/careerPilot/seedFoundationContent', args: ['{T}', '--apply'] },
  { name: 'unit suitability overrides', script: 'seeds/careerPilot/seedUnitSuitabilityOverrides', args: ['{T}', '--apply'] },
  { name: 'unit content, checkpoints (quizId-linked) and projects', script: 'seeds/careerPilot/seedPilotUnitContent', args: ['{T}', '--apply'] },
];

/** Run one audited script as its own process, exactly as an operator would, from source or a build. */
function runScript(script: string, args: string[]): { exitCode: number; ms: number } {
  const file = RUNNING_TS
    ? path.join(SERVER_ROOT, 'src', `${script}.ts`)
    : path.join(SERVER_ROOT, 'dist', `${script}.js`);
  const argv = RUNNING_TS ? ['-r', require.resolve('ts-node/register/transpile-only'), file, ...args] : [file, ...args];
  const t0 = Date.now();
  const r = spawnSync(process.execPath, argv, { cwd: SERVER_ROOT, stdio: 'inherit', env: process.env });
  return { exitCode: r.status ?? 1, ms: Date.now() - t0 };
}

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const skipCertify = process.argv.includes('--skip-certify');
  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
    console.error('Usage: provisionCareerPilotFoundation.ts <tenantId> [--apply] [--skip-certify]');
    process.exit(2);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const db = mongoose.connection.db!;
  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const say = (s: string) => console.log(s);
  const line = () => say('─'.repeat(96));

  const tenant = await db.collection('tenants').findOne({ _id: tenantOid });
  const admin = await db.collection('users').findOne({ tenantId: { $in: [tenantId, tenantOid] }, role: { $in: ['TENANT_ADMIN', 'SUPER_ADMIN'] } });

  const state = async () => {
    const readiness = await foundationReadiness(tenantId);
    const [units, ready, production, linkage, bank] = await Promise.all([
      db.collection('curriculumlearningunits').countDocuments({ tenantId, stageKey: 'foundation' }),
      loadCandidates(tenantId, 'PROTOTYPE_UNPUBLISHED').then(s => s.units.length),
      loadCandidates(tenantId, 'PRODUCTION').then(s => s.units.map(u => u.unitCode).sort()),
      checkCurriculumQuizLinkage(tenantId),
      db.collection('assessmentitems').countDocuments({ tenantId }),
    ]);
    return { readiness, units, ready, production, linkage, bank };
  };
  const report = (label: string, s: Awaited<ReturnType<typeof state>>) => {
    say(`  ${label}: units ${s.units} · READY ${s.ready} · PRODUCTION ${s.production.length} · skill-check questions ${s.bank}`
      + ` · quizzes ${s.linkage.quizzes}/questions ${s.linkage.questions} linkage ${s.linkage.ok ? 'ok' : 'BROKEN'}`
      + ` · Foundation ${s.readiness.configured ? 'CONFIGURED' : `NOT CONFIGURED (${s.readiness.reason})`}`);
  };

  line();
  say(`CAREERPILOT FOUNDATION PROVISIONING  ·  ${tenant?.name || '(unknown tenant)'}  ·  ${tenantId}  ·  ${apply ? 'APPLY' : 'PLAN ONLY'}`);
  line();
  if (!tenant) { say('  STOP — no tenant with that id in this database.'); await mongoose.disconnect(); process.exit(1); }
  if (!admin) { say('  STOP — this tenant has no TENANT_ADMIN; seeded project briefs must be attributed to one.'); await mongoose.disconnect(); process.exit(1); }

  const before = await state();
  report('before', before);
  say(`  engine policy: ${CAREER_STAGES.map(s => `${s.key}=${effectiveCurriculumEngine({ stageKey: s.key }).engine}`).join(' ')}`);

  if (!apply) {
    say('\n  Steps an --apply run takes, each idempotent:');
    SEED_STEPS.forEach((s, i) => say(`    ${i + 1}. ${s.name}`));
    say(`    ${SEED_STEPS.length + 1}. publish the certified ${CERTIFIED_FOUNDATION.target} through the publish handler`);
    say(`    ${SEED_STEPS.length + 2}. verify inventory, linkage and Foundation readiness`);
    say(`    ${SEED_STEPS.length + 3}. production gate (certifyProductionComposer)`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const startedAt = new Date();
  const steps: { name: string; exitCode: number; ms: number; detail?: string }[] = [];
  let failed: string | null = null;

  for (const step of SEED_STEPS) {
    line();
    say(`STEP ${steps.length + 1} — ${step.name}`);
    const r = runScript(step.script, step.args.map(a => (a === '{T}' ? tenantId : a)));
    steps.push({ name: step.name, ...r });
    if (r.exitCode !== 0) { failed = `${step.name} exited ${r.exitCode}`; break; }
  }

  let publication: { published: number; already: number; problems: string[]; refused: string | null } | null = null;
  if (!failed) {
    line();
    say(`STEP ${steps.length + 1} — certified publication`);
    const t0 = Date.now();
    const result = await publishCertifiedFoundation(tenantId, ACTOR);
    publication = {
      published: result.published.length, already: result.plan.already.length,
      problems: result.plan.problems, refused: result.refused,
    };
    say(`  already published ${result.plan.already.length} · published now ${result.published.length} · still DRAFT before this run ${result.plan.todo.length}`);
    for (const p of result.plan.problems) say(`  ! ${p}`);
    if (result.refused) say(`  ! refused ${result.refused}`);
    const ok = !result.plan.problems.length && !result.refused;
    steps.push({ name: 'certified publication', exitCode: ok ? 0 : 1, ms: Date.now() - t0, detail: `published ${result.published.length}` });
    if (!ok) failed = 'certified publication did not complete';
  }

  let after: Awaited<ReturnType<typeof state>> | null = null;
  if (!failed) {
    line();
    say(`STEP ${steps.length + 1} — verification`);
    const t0 = Date.now();
    after = await state();
    report('after', after);
    const certified = loadCertifiedSet().target;
    const plan = await planCertifiedPublication(tenantId);
    const checks: [string, boolean][] = [
      [`units ${CERTIFIED_FOUNDATION.total}, READY ${CERTIFIED_FOUNDATION.ready}`, after.units === CERTIFIED_FOUNDATION.total && after.ready === CERTIFIED_FOUNDATION.ready],
      [`PRODUCTION inventory is exactly the certified ${CERTIFIED_FOUNDATION.target}`, JSON.stringify(after.production) === JSON.stringify(certified)],
      ['no certified unit left DRAFT, nothing published outside the set', !plan.todo.length && !plan.problems.length],
      ['every checkpoint question linked to its quiz, both ways', after.linkage.ok],
      ['Foundation readiness: CONFIGURED', after.readiness.configured],
      ['Foundation → UNIT, every other stage → TOPIC', CAREER_STAGES.every(s => effectiveCurriculumEngine({ stageKey: s.key }).engine === (s.key === 'foundation' ? 'UNIT' : 'TOPIC'))],
    ];
    for (const [label, ok] of checks) say(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
    const ok = checks.every(([, pass]) => pass);
    steps.push({ name: 'verification', exitCode: ok ? 0 : 1, ms: Date.now() - t0 });
    if (!ok) failed = 'verification failed';
  }

  if (!failed && !skipCertify) {
    line();
    say(`STEP ${steps.length + 1} — production gate`);
    const r = runScript('scripts/certifyProductionComposer', [tenantId]);
    steps.push({ name: 'production gate', ...r });
    if (r.exitCode !== 0) failed = 'the production gate did not pass';
  }

  // The audit trail: what ran, against which tenant, with what result. One document per run.
  await db.collection('careerpilotprovisioningruns').insertOne({
    tenantId, product: 'FOUNDATION_YEAR1', actor: ACTOR, startedAt, finishedAt: new Date(),
    result: failed ? 'FAILED' : 'PROVISIONED', failure: failed, steps, publication,
    before: { units: before.units, ready: before.ready, production: before.production.length, configured: before.readiness.configured },
    after: after ? { units: after.units, ready: after.ready, production: after.production.length, configured: after.readiness.configured } : null,
  });

  line();
  say(failed ? `FOUNDATION PROVISIONING: FAILED — ${failed}` : 'FOUNDATION PROVISIONING: COMPLETE — Foundation learners in this tenant are served the ninety-day journey');
  for (const s of steps) say(`  ${s.exitCode === 0 ? 'ok  ' : 'FAIL'}  ${s.name.padEnd(56)} ${(s.ms / 1000).toFixed(1)}s${s.detail ? `  ${s.detail}` : ''}`);
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
})().catch(async e => { console.error(e); try { await mongoose.disconnect(); } catch { /* closing */ } process.exit(1); });
