/**
 * Phase 21 — publish EXACTLY the certified recommended set, through the production Admin route.
 *
 * ── WHAT IT PUBLISHES ─────────────────────────────────────────────────────────────────────
 *
 * The 338 codes in tests/fixtures/phase21/publish-sets.json `recommended`, certified at commit
 * ed2f29c7 and re-certified at 382a39ee. Not "all READY": the three READY units certification withheld stay DRAFT, and so do the
 * fourteen PARTIAL ones.
 *
 * ── HOW ───────────────────────────────────────────────────────────────────────────────────
 *
 * POST /api/v1/careerpilot/curriculum-units/:unitCode/publish, as a MANAGE-authorised admin who
 * signed in through POST /api/v1/auth/login. The requests go through the real route stack —
 * routes/index, authMiddleware, roleGuard(manage_passport), careerPilotActivity and
 * curriculumLearningUnitController.publishUnit — so every publish gate the controller applies is
 * applied here. Nothing is written to Mongo directly.
 *
 * The stack is mounted on a bare express app rather than imported from app.ts, because importing
 * app.ts starts the WhatsApp drip interval at module load: a background job with nothing to do
 * with publication. The middleware app.ts adds in front of the routes (compression, helmet, morgan,
 * cors, the 4xx logger) shapes responses; none of it gates or writes a publication.
 *
 * ── REFUSES TO WRITE ──────────────────────────────────────────────────────────────────────
 *
 * Before any request, the database and the certified set must still be what was certified: the
 * committed fixtures and the curriculum sources unchanged since ed2f29c7, READY exactly 341 with
 * metadata identical to the certified inventory, every target unit present, READY, not archived and
 * DRAFT (or already PUBLISHED by an interrupted run), nothing outside the set published, the
 * withheld and PARTIAL units exactly as certified, and the set closed under prerequisites.
 *
 * ── RETRY-SAFE ────────────────────────────────────────────────────────────────────────────
 *
 * Only certified codes still DRAFT are requested. An interrupted run is resumed by running it
 * again; codes already PUBLISHED are left alone.
 *
 *   PUBLISH_ADMIN_EMAIL=... PUBLISH_ADMIN_PASSWORD=... \
 *     npx ts-node src/scripts/publishCertifiedPublishSet.ts <tenantId>           # validate only
 *   ... npx ts-node src/scripts/publishCertifiedPublishSet.ts <tenantId> --apply
 */

import dotenv from 'dotenv';
dotenv.config();

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import apiRoutes from '../routes';
import { loadCandidates } from '../services/composerCandidateService';
import { ComposableUnit } from '../services/curriculumComposerService';
import { typeRequiresTeaching } from '../data/unitReadinessPolicy';
import { teaches } from '../data/contentBundlePolicy';

/**
 * The commit the certified sources are compared against.
 *
 * Moved from ed2f29c7 to 382a39ee, where the actual production gate was re-run and passed (nine 9/9,
 * boundaries 40/40, recomposition 72/72, content gates 0). The two changes between them alter no
 * unit, readiness or selection: the content seed also writes each checkpoint question's quizId, and
 * composerCertificationService exports the prerequisite rule it already applied. Any change to a
 * certified source after this commit still stops publication until it is re-certified.
 *
 * MOVED AGAIN, TO 4db217cd — AND THIS ONE IS NOT A NO-OP. Unlike the move above, it changes units,
 * readiness and selection: the nine T_VARIABLES concept units were authored, so READY went 341 to
 * 350, PARTIAL 14 to 5, and the recommended set 338 to 347. Both phase21 fixtures were regenerated
 * from the live inventory rather than edited, and EXPECT below moved with them.
 *
 * Re-certified rather than merely renumbered. certifyProductionComposer on the live tenant:
 * realistic profiles 9/9 at exactly ninety, state-boundary learners 40/40 across the 39-skill
 * matrix, recompositions 72/72, broken project assignments 0, published set identical to the
 * certified set, curriculum unchanged during the run, foundation on UNIT. ACTUAL PRODUCTION GATE:
 * PASS.
 */
const CERTIFIED_COMMIT = '4db217cd';
const EXPECT = { total: 355, ready: 350, target: 347, withheld: 3, partial: 5 };
const REPO = path.join(__dirname, '..', '..', '..');
const FIXTURES = path.join(__dirname, '..', 'tests', 'fixtures', 'phase21');
/** What the certification was computed from. A change to any of these since certification is drift. */
const CERTIFIED_SOURCES = [
  'server/src/tests/fixtures/phase21',
  'server/src/tests/fixtures/year1UnitMetadata.json',
  'server/src/seeds/careerPilot',
  'server/src/services/curriculumComposerService.ts',
  'server/src/services/composerCandidateService.ts',
  'server/src/services/composerCertificationService.ts',
  'server/src/data/unitReadinessPolicy.ts',
  'server/src/data/unitSuitabilityPolicy.ts',
  'server/src/data/compositionShapePolicy.ts',
];

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
    console.error('Usage: publishCertifiedPublishSet.ts <tenantId> [--apply]');
    process.exit(1);
  }
  const problems: string[] = [];
  const say = (s: string) => console.log(s);

  /* ══ 1. THE CERTIFIED SET, FROZEN ════════════════════════════════════════════════════════ */

  say(`\nCERTIFIED PUBLICATION  ·  tenant ${tenantId}  ·  ${apply ? 'APPLY' : 'VALIDATE ONLY'}`);
  try {
    // No `^{commit}` peel: cmd.exe, which execSync uses on Windows, treats the caret as an escape.
    const kind = execSync(`git cat-file -t ${CERTIFIED_COMMIT}`, { cwd: REPO }).toString().trim();
    if (kind !== 'commit') throw new Error(`${CERTIFIED_COMMIT} is a ${kind}, not a commit`);
    const changed = execSync(`git diff --name-only ${CERTIFIED_COMMIT} -- ${CERTIFIED_SOURCES.join(' ')}`, { cwd: REPO }).toString().trim();
    const untracked = execSync(`git ls-files --others --exclude-standard -- ${CERTIFIED_SOURCES.join(' ')}`, { cwd: REPO }).toString().trim();
    say(`  certified sources unchanged since ${CERTIFIED_COMMIT}: ${changed || untracked ? 'NO' : 'yes'}`);
    if (changed) problems.push(`certified sources changed since ${CERTIFIED_COMMIT}: ${changed.split('\n').join(', ')}`);
    if (untracked) problems.push(`untracked files among certified sources: ${untracked.split('\n').join(', ')}`);
  } catch (e: any) {
    problems.push(`cannot verify the certified commit ${CERTIFIED_COMMIT}: ${e?.message || e}`);
  }

  const certified = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'publish-sets.json'), 'utf8'));
  const readyFixture = (JSON.parse(fs.readFileSync(path.join(FIXTURES, 'ready-inventory.json'), 'utf8')) as ComposableUnit[])
    .sort((a, b) => a.unitCode.localeCompare(b.unitCode));
  const target: string[] = [...certified.recommended].sort();
  const withheld: string[] = [...certified.withheldFromRecommended].sort();
  const targetSet = new Set(target);
  if (target.length !== EXPECT.target || targetSet.size !== target.length) problems.push(`certified set has ${target.length} codes (${targetSet.size} distinct), expected ${EXPECT.target}`);
  if (withheld.length !== EXPECT.withheld) problems.push(`certified set withholds ${withheld.length}, expected ${EXPECT.withheld}`);
  if (certified.readyCount !== EXPECT.ready || readyFixture.length !== EXPECT.ready) problems.push(`certified READY ${certified.readyCount}/${readyFixture.length}, expected ${EXPECT.ready}`);
  say(`  certified recommended ${target.length}, withheld ${withheld.length} (${withheld.join(', ')})`);

  /* ══ 2. THE DATABASE, AS CERTIFIED ═══════════════════════════════════════════════════════ */

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const db = mongoose.connection.db!;
  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const TID = { $in: [tenantId, tenantOid] };

  const unitDocs = async () => db.collection('curriculumlearningunits')
    .find({ tenantId: TID, stageKey: 'foundation' }).sort({ unitCode: 1 }).toArray();
  /**
   * What publication may change, counted for THIS tenant's curriculum content only.
   *
   * A live database has members working while this runs — attempts, DayPlans and activity rows move
   * on their own and say nothing about publication — so a database-wide count would report their
   * work as drift.
   */
  const CONTENT = ['curriculumlearningunits', 'learningcontentlibraries', 'quizzes', 'questions', 'assignments', 'skillevidences', 'passportconfigs'];
  const allCounts = async () => {
    const out: Record<string, number> = {};
    for (const c of CONTENT) out[c] = await db.collection(c).countDocuments({ $or: [{ tenantId: TID }, { tenant: tenantOid }] });
    return out;
  };

  const docsBefore = await unitDocs();
  const byCode = new Map(docsBefore.map(d => [String(d.unitCode), d]));
  const readyBefore = await loadCandidates(tenantId, 'PROTOTYPE_UNPUBLISHED');
  const readyUnits = [...readyBefore.units].sort((a, b) => a.unitCode.localeCompare(b.unitCode));
  const readyCodes = new Set(readyUnits.map(u => u.unitCode));
  const partial = readyBefore.rejected.filter(r => r.readiness === 'PARTIAL').map(r => r.unitCode).sort();
  const otherRejected = readyBefore.rejected.filter(r => r.readiness !== 'PARTIAL');

  say(`  units ${docsBefore.length}  READY ${readyUnits.length}  PARTIAL ${partial.length}  other non-READY ${otherRejected.length}`);
  if (docsBefore.length !== EXPECT.total) problems.push(`total units ${docsBefore.length}, expected ${EXPECT.total}`);
  if (readyUnits.length !== EXPECT.ready) problems.push(`READY ${readyUnits.length}, expected ${EXPECT.ready}`);
  if (partial.length !== EXPECT.partial) problems.push(`PARTIAL ${partial.length}, expected ${EXPECT.partial}`);
  if (otherRejected.length) problems.push(`${otherRejected.length} unit(s) neither READY nor PARTIAL`);
  if (docsBefore.some(d => d.status === 'ARCHIVED')) problems.push('archived units exist');
  if (JSON.stringify(readyUnits) !== JSON.stringify(readyFixture)) {
    const drifted = readyUnits.filter(u => JSON.stringify(u) !== JSON.stringify(readyFixture.find(f => f.unitCode === u.unitCode))).map(u => u.unitCode);
    problems.push(`READY inventory differs from the certified inventory: ${drifted.slice(0, 10).join(', ') || 'membership'}`);
  }
  say(`  READY inventory identical to the certified inventory: ${JSON.stringify(readyUnits) === JSON.stringify(readyFixture) ? 'yes' : 'NO'}`);

  for (const code of target) {
    const d = byCode.get(code);
    if (!d) { problems.push(`${code}: does not exist`); continue; }
    if (!readyCodes.has(code)) problems.push(`${code}: not READY`);
    if (d.status !== 'DRAFT' && d.status !== 'PUBLISHED') problems.push(`${code}: status ${d.status}`);
    if (!(Number(d.estimatedMinutes) > 0)) problems.push(`${code}: no estimatedMinutes — publishing would also rewrite its duration`);
  }
  const publishedOutside = docsBefore.filter(d => d.status === 'PUBLISHED' && !targetSet.has(String(d.unitCode))).map(d => String(d.unitCode));
  if (publishedOutside.length) problems.push(`published outside the certified set: ${publishedOutside.join(', ')}`);
  const readyNotTarget = readyUnits.map(u => u.unitCode).filter(c => !targetSet.has(c)).sort();
  if (JSON.stringify(readyNotTarget) !== JSON.stringify(withheld)) problems.push(`READY outside the set is ${readyNotTarget.join(', ')}, certified withheld ${withheld.join(', ')}`);
  if (partial.some(c => targetSet.has(c))) problems.push('a PARTIAL unit is in the certified set');

  const unclosed = target.flatMap(c => ((byCode.get(c)?.prerequisiteUnitCodes || []) as string[])
    .filter(p => !targetSet.has(String(p))).map(p => `${c} -> ${p}`));
  say(`  certified set closed under prerequisites: ${unclosed.length ? `NO (${unclosed.length})` : 'yes'}`);
  if (unclosed.length) problems.push(`not prerequisite-closed: ${unclosed.slice(0, 5).join(', ')}`);

  // The controller's teaching gate, checked in advance so a refusal is found before the first write.
  const ownTeaching = await db.collection('learningcontentlibraries')
    .find({ tenantId: TID, unitCode: { $in: target }, isPublished: true }).project({ unitCode: 1, type: 1 }).toArray();
  const teachingCodes = new Set(ownTeaching.filter(r => teaches(String(r.type))).map(r => String(r.unitCode)));
  const noTeaching = target.filter(c => byCode.get(c) && typeRequiresTeaching(byCode.get(c)!.unitType) && !teachingCodes.has(c));
  if (noTeaching.length) problems.push(`the publish route would refuse (no own teaching): ${noTeaching.join(', ')}`);

  const todo = target.filter(c => byCode.get(c)?.status === 'DRAFT');
  const already = target.filter(c => byCode.get(c)?.status === 'PUBLISHED');
  say(`  certified codes still DRAFT ${todo.length}, already PUBLISHED ${already.length}`);

  if (problems.length) {
    say(`\nSTOP — ${problems.length} problem(s); nothing published:`);
    for (const p of problems) say(`  ! ${p}`);
    await mongoose.disconnect();
    process.exit(1);
  }
  if (!apply) {
    say(`\nVALID. ${todo.length} certified unit(s) would be published. Re-run with --apply.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  /* ══ 3. PUBLISH, THROUGH THE ADMIN ROUTE ═════════════════════════════════════════════════ */

  const email = process.env.PUBLISH_ADMIN_EMAIL;
  const password = process.env.PUBLISH_ADMIN_PASSWORD;
  if (!email || !password) {
    say('STOP — set PUBLISH_ADMIN_EMAIL and PUBLISH_ADMIN_PASSWORD; nothing published.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const countsBefore = await allCounts();
  const api = express();
  api.set('trust proxy', 1);
  api.use(express.json({ limit: '1mb' }));
  api.use(express.urlencoded({ extended: true }));
  api.use('/api/v1', apiRoutes);

  const login = await request(api).post('/api/v1/auth/login').send({ email, password });
  const token = login.body?.token || login.body?.data?.token;
  const who = login.body?.user || login.body?.data?.user;
  if (login.status !== 200 || !token) {
    say(`STOP — sign-in failed (${login.status}); nothing published.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  if (String(who?.tenantId) !== tenantId) {
    say(`STOP — ${email} belongs to tenant ${who?.tenantId}, not ${tenantId}; nothing published.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  say(`\n  signed in as ${who?.email} (${who?.role}); manage_passport: ${(who?.permissions || []).includes('manage_passport') ? 'yes' : 'NO'}`);

  const refused: string[] = [];
  let done = 0;
  for (const code of todo) {
    const res = await request(api)
      .post(`/api/v1/careerpilot/curriculum-units/${encodeURIComponent(code)}/publish`)
      .set('Authorization', `Bearer ${token}`)
      // The admin client sends it on every request; tenantMiddleware refuses a request without it.
      .set('x-tenant-id', tenantId)
      .send({});
    if (res.status !== 200 || res.body?.published !== true || res.body?.unit?.status !== 'PUBLISHED') {
      refused.push(`${code}: HTTP ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
      break;   // stop on the first refusal; a re-run resumes from the remaining DRAFT codes
    }
    done++;
    if (done % 50 === 0 || done === todo.length) say(`  published ${done}/${todo.length}`);
  }

  /* ══ 4. VERIFY ═══════════════════════════════════════════════════════════════════════════ */

  const docsAfter = await unitDocs();
  const afterByCode = new Map(docsAfter.map(d => [String(d.unitCode), d]));
  const readyAfter = await loadCandidates(tenantId, 'PROTOTYPE_UNPUBLISHED');
  const production = await loadCandidates(tenantId, 'PRODUCTION');
  const published = docsAfter.filter(d => d.status === 'PUBLISHED').map(d => String(d.unitCode)).sort();
  const eligible = production.units.map(u => u.unitCode).sort();
  const readyAfterCodes = readyAfter.units.map(u => u.unitCode);
  const readyNotPublished = readyAfterCodes.filter(c => afterByCode.get(c)?.status !== 'PUBLISHED').sort();
  const partialAfter = readyAfter.rejected.filter(r => r.readiness === 'PARTIAL').map(r => r.unitCode);
  const partialNotPublished = partialAfter.filter(c => afterByCode.get(c)?.status !== 'PUBLISHED');

  // Only status and the audit stamp of the certified units may have moved.
  const IGNORE = new Set(['status', 'updatedBy', 'updatedAt', '__v']);
  const strip = (d: any) => JSON.stringify(Object.keys(d).sort().filter(k => !IGNORE.has(k)).map(k => [k, d[k]]));
  const unexpectedUnitChanges = docsBefore.filter(d => {
    const a = afterByCode.get(String(d.unitCode));
    if (!a) return true;
    if (strip(d) !== strip(a)) return true;
    return !targetSet.has(String(d.unitCode)) && (d.status !== a.status || String(d.updatedAt) !== String(a.updatedAt));
  }).map(d => String(d.unitCode));

  const countsAfter = await allCounts();
  const countChanges = [...new Set([...Object.keys(countsBefore), ...Object.keys(countsAfter)])]
    .filter(c => countsBefore[c] !== countsAfter[c])
    .map(c => `${c} ${countsBefore[c] ?? 0} -> ${countsAfter[c] ?? 0}`);

  const checks: [string, boolean, string][] = [
    ['total units', docsAfter.length === EXPECT.total, String(docsAfter.length)],
    ['READY', readyAfterCodes.length === EXPECT.ready, String(readyAfterCodes.length)],
    ['PUBLISHED', published.length === EXPECT.target, String(published.length)],
    ['PUBLISHED is exactly the certified set', JSON.stringify(published) === JSON.stringify(target), ''],
    ['COMPOSER_ELIGIBLE', eligible.length === EXPECT.target, String(eligible.length)],
    ['COMPOSER_ELIGIBLE is exactly the certified set', JSON.stringify(eligible) === JSON.stringify(target), ''],
    ['READY but not PUBLISHED = certified withheld', JSON.stringify(readyNotPublished) === JSON.stringify(withheld), readyNotPublished.join(', ')],
    ['PARTIAL and not PUBLISHED', partialNotPublished.length === EXPECT.partial && partialAfter.length === EXPECT.partial, String(partialNotPublished.length)],
    ['no unit changed beyond status', unexpectedUnitChanges.length === 0, unexpectedUnitChanges.slice(0, 5).join(', ')],
  ];

  say('\nVERIFICATION');
  for (const [label, ok, detail] of checks) say(`  ${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(48)}${detail}`);
  say(`  collection counts that changed: ${countChanges.length ? countChanges.join('; ') : 'none'}`);
  for (const r of refused) say(`  ! refused ${r}`);

  const ok = !refused.length && checks.every(([, pass]) => pass);
  say(`\n${ok ? 'PUBLICATION COMPLETE' : 'PUBLICATION NOT COMPLETE'} — requested ${todo.length}, published ${done}${refused.length ? ', stopped on a refusal' : ''}.`);
  await mongoose.disconnect();
  process.exit(ok ? 0 : 1);
})().catch(async e => { console.error(e); try { await mongoose.disconnect(); } catch { /* closing */ } process.exit(1); });
