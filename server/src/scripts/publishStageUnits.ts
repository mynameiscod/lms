/**
 * Publish a stage's Learning Units, applying the Admin route's gates exactly.
 *
 * DRY RUN BY DEFAULT. Nothing is written without --apply, and the dry run reports exactly what
 * the apply would do, decided by the same code path rather than estimated.
 *
 *   npx ts-node src/scripts/publishStageUnits.ts <tenantId> <stageKey>
 *   npx ts-node src/scripts/publishStageUnits.ts <tenantId> <stageKey> --apply
 *   npx ts-node src/scripts/publishStageUnits.ts <tenantId> build --apply --only T2_DSA_STACK_INTRO
 *
 * ── WHY THIS EXISTS RATHER THAN publishCertifiedPublishSet ────────────────────────────────
 *
 * That script publishes ONE frozen set: the 338 Foundation codes certified at ed2f29c7, checked
 * against committed fixtures and refused if anything has moved since. It is a record of a
 * decision, not a tool, and it cannot publish a stage that was authored afterwards.
 *
 * It also drives the real HTTP route, signing in as an admin from PUBLISH_ADMIN_EMAIL and
 * PUBLISH_ADMIN_PASSWORD. That is the stronger guarantee — every layer of middleware runs — and
 * it needs a password. This script applies the controller's gates directly instead, which is a
 * deliberate trade and the reason the gates are transcribed here in full rather than summarised.
 *
 * ── THE GATES, IN THE ORDER publishUnit APPLIES THEM ──────────────────────────────────────
 *
 * Transcribed from curriculumLearningUnitController.publishUnit. If that controller changes,
 * this is wrong until it is updated, and the header of the report says so out loud.
 *
 *   1. The unit exists on this tenant.
 *   2. If its type requires teaching, something in the Content Library must resolve for it AND
 *      at least one resolved row must teach. A CHECKPOINT is exempt: its rule is `assessment` at
 *      every rung, so no binding an author could make would ever satisfy a teaching check.
 *   3. Readiness, from the same evaluateReadiness the screen uses, must meet MINIMUM_TO_PUBLISH.
 *      Inheritance caps readiness at PARTIAL by frozen policy, so this means: the unit must have
 *      teaching material OF ITS OWN.
 *   4. estimatedMinutes, if the author left it at zero, becomes the resolved bundle total.
 *
 * ── WHAT PUBLISHING DOES AND DOES NOT DO ──────────────────────────────────────────────────
 *
 * Composer eligibility is PUBLISHED **and** READY. A unit that is merely TEACHABLE clears the
 * publish bar and is still never planned onto a journey, so the report separates the two counts:
 * publishing a TEACHABLE unit is real but changes nothing a student sees until it has content of
 * its own. That distinction is the one an author most often expects to be told about and is not.
 *
 * ── WHAT IS NEVER TOUCHED ─────────────────────────────────────────────────────────────────
 *
 * Any unit already PUBLISHED or ARCHIVED, any unit on another stage, any unit on another tenant,
 * and every student record of every kind. A rerun publishes only what is still DRAFT, so an
 * interrupted run is resumed by running it again.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import LearningContentLibrary from '../models/LearningContentLibrary';
import Quiz from '../models/Quiz';
import Assignment from '../models/Assignment';
import { inTeachingOrder, teaches } from '../data/contentBundlePolicy';
import {
  evaluateReadiness, meetsPublishBar, MINIMUM_TO_PUBLISH, typeRequiresTeaching,
} from '../data/unitReadinessPolicy';

dotenv.config();

/** The projection publishUnit reads through resolveBundle, kept identical. */
const SEL = '_id type title estimatedDuration learningDepth isPublished canonical createdAt unitCode topicCode skillKeys';

interface UnitLike { unitCode: string; topicCode: string; skillKeys: string[] }

/**
 * The controller's resolveBundle: unit code first, then topic, then skills, first hit wins.
 *
 * The fall-through order is the whole of it. A unit with its own content never sees its topic's,
 * which is why `own` below can be decided by comparing unitCode rather than by a second query.
 */
async function resolveBundle(tenantId: string, unit: UnitLike): Promise<{ rows: any[]; via: string }> {
  const byUnit = await LearningContentLibrary
    .find({ tenantId, isPublished: true, unitCode: unit.unitCode }).select(SEL).lean() as any[];
  if (byUnit.length) return { rows: byUnit, via: 'unitCode' };

  if (unit.topicCode) {
    const byTopic = await LearningContentLibrary
      .find({ tenantId, isPublished: true, topicCode: unit.topicCode }).select(SEL).lean() as any[];
    if (byTopic.length) return { rows: byTopic, via: 'topicCode' };
  }

  if (unit.skillKeys.length) {
    const bySkill = await LearningContentLibrary
      .find({ tenantId, isPublished: true, skillKeys: { $in: unit.skillKeys } }).select(SEL).lean() as any[];
    if (bySkill.length) return { rows: bySkill, via: 'skillKeys' };
  }

  return { rows: [], via: 'none' };
}

const hasTeaching = (rows: any[]) => inTeachingOrder(rows).some((r: any) => teaches(r.type));
const resolvedMinutes = (rows: any[]) =>
  inTeachingOrder(rows).reduce((n: number, r: any) => n + (Number(r.estimatedDuration) || 0), 0);

interface Verdict {
  unitCode: string;
  unitType: string;
  status: string;
  readiness: string;
  publishable: boolean;
  reason: string | null;
  minutesToSet: number | null;
}

(async () => {
  const tenantId = process.argv[2];
  const stageKey = process.argv[3];
  const apply = process.argv.includes('--apply');
  const onlyAt = process.argv.indexOf('--only');
  const only = onlyAt > -1 ? (process.argv[onlyAt + 1] || '').toUpperCase() : null;

  if (!tenantId || !stageKey || stageKey.startsWith('--')) {
    console.error('Usage: publishStageUnits.ts <tenantId> <stageKey> [--apply] [--only UNIT_CODE]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const where: any = { tenantId, stageKey };
  if (only) where.unitCode = only;
  const units = await CurriculumLearningUnit.find(where)
    .select('unitCode topicCode skillKeys unitType status estimatedMinutes')
    .sort({ displayOrder: 1, unitCode: 1 }).lean() as any[];

  if (!units.length) {
    console.log(`\nNo units on stage "${stageKey}" for tenant ${tenantId}.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\nPUBLISH STAGE UNITS — ${stageKey} — tenant ${tenantId} — ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log('gates transcribed from curriculumLearningUnitController.publishUnit\n');

  const verdicts: Verdict[] = [];

  for (const u of units) {
    const unit: UnitLike = { unitCode: u.unitCode, topicCode: u.topicCode, skillKeys: u.skillKeys || [] };

    if (u.status !== 'DRAFT') {
      verdicts.push({
        unitCode: u.unitCode, unitType: u.unitType, status: u.status,
        readiness: '-', publishable: false,
        reason: u.status === 'PUBLISHED' ? 'already published' : `status is ${u.status}`,
        minutesToSet: null,
      });
      continue;
    }

    const { rows, via } = await resolveBundle(tenantId, unit);

    /* Gate 2 — teaching, for the types whose rule asks for it. */
    if (typeRequiresTeaching(u.unitType)) {
      if (!rows.length) {
        verdicts.push({
          unitCode: u.unitCode, unitType: u.unitType, status: u.status, readiness: '-',
          publishable: false, minutesToSet: null,
          reason: 'nothing in the Content Library resolves for it',
        });
        continue;
      }
      if (!hasTeaching(rows)) {
        verdicts.push({
          unitCode: u.unitCode, unitType: u.unitType, status: u.status, readiness: '-',
          publishable: false, minutesToSet: null,
          reason: `resolves ${rows.length} item(s) via ${via}, none of which teach`,
        });
        continue;
      }
    }

    /* Gate 3 — the publish bar, on own content rather than inherited. */
    const own = rows.filter((r: any) => String(r.unitCode || '') === u.unitCode);
    const inherited = rows.filter((r: any) => String(r.unitCode || '') !== u.unitCode);

    const [boundQuizzes, boundAssignments] = await Promise.all([
      Quiz.countDocuments({ tenantId, unitCode: u.unitCode }),
      mongoose.Types.ObjectId.isValid(tenantId)
        ? Assignment.countDocuments({ tenant: new mongoose.Types.ObjectId(tenantId), unitCode: u.unitCode })
        : Promise.resolve(0),
    ]);

    const { readiness, missing } = evaluateReadiness({
      unitType: u.unitType,
      ownContent: own,
      inheritedContent: inherited,
      boundAssessments: boundQuizzes + boundAssignments,
      boundAssignments,
    } as any);

    if (!meetsPublishBar(readiness)) {
      verdicts.push({
        unitCode: u.unitCode, unitType: u.unitType, status: u.status, readiness,
        publishable: false, minutesToSet: null,
        reason: `${readiness}, and publishing needs at least ${MINIMUM_TO_PUBLISH}`
          + (missing?.length ? ` — missing ${missing.join(', ')}` : '')
          + (own.length ? '' : ' — everything it resolves is inherited'),
      });
      continue;
    }

    /* Gate 4 — the estimate, only where the author left it at zero. */
    verdicts.push({
      unitCode: u.unitCode, unitType: u.unitType, status: u.status, readiness,
      publishable: true, reason: null,
      minutesToSet: u.estimatedMinutes ? null : resolvedMinutes(rows),
    });
  }

  /* ---- report ---------------------------------------------------------------------------- */

  const pad = (s: string) => s.padEnd(40);
  const publishable = verdicts.filter(v => v.publishable);
  const refused = verdicts.filter(v => !v.publishable && v.reason !== 'already published');
  const alreadyLive = verdicts.filter(v => v.reason === 'already published');
  const ready = publishable.filter(v => v.readiness === 'READY');
  const belowReady = publishable.filter(v => v.readiness !== 'READY');
  const estimates = publishable.filter(v => v.minutesToSet !== null);

  console.log(pad('units on this stage') + units.length);
  console.log(pad('already published') + alreadyLive.length);
  console.log(pad('would publish') + publishable.length);
  console.log(pad('  of those READY, so composable') + ready.length);
  console.log(pad('  of those below READY, published only') + belowReady.length);
  console.log(pad('refused by a gate') + refused.length);
  console.log(pad('estimates that would be filled in') + estimates.length);

  const byReadiness = new Map<string, number>();
  for (const v of verdicts) byReadiness.set(v.readiness, (byReadiness.get(v.readiness) || 0) + 1);
  console.log('\nREADINESS — publish bar is ' + MINIMUM_TO_PUBLISH);
  for (const [r, n] of [...byReadiness].sort()) console.log(`  ${String(r).padEnd(12)} ${n}`);

  if (belowReady.length) {
    console.log(`\nPUBLISHED BUT NOT COMPOSABLE (${belowReady.length})`);
    console.log('  Composer eligibility is PUBLISHED and READY, so these go live and are never planned.');
    for (const v of belowReady.slice(0, 15)) console.log(`  ${v.unitCode.padEnd(34)} ${v.readiness}`);
    if (belowReady.length > 15) console.log(`  ... ${belowReady.length - 15} more`);
  }

  if (refused.length) {
    console.log(`\nREFUSED (${refused.length})`);
    for (const v of refused.slice(0, 20)) console.log(`  ${v.unitCode.padEnd(34)} ${v.reason}`);
    if (refused.length > 20) console.log(`  ... ${refused.length - 20} more`);
  }

  if (!apply) {
    console.log('\nDry run. Nothing was written.');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (!publishable.length) {
    console.log('\nNothing to publish.');
    await mongoose.disconnect();
    process.exit(0);
  }

  /* ---- apply ------------------------------------------------------------------------------ */

  /**
   * One write per unit rather than a bulkWrite, because the estimate differs per unit and a
   * partial failure should leave the rest published rather than roll a batch back. The loop is
   * resumable: a rerun sees the published ones and skips them.
   */
  let published = 0, minutesFilled = 0;
  for (const v of publishable) {
    const set: any = { status: 'PUBLISHED', updatedBy: 'publishStageUnits' };
    if (v.minutesToSet !== null) { set.estimatedMinutes = v.minutesToSet; minutesFilled++; }
    await CurriculumLearningUnit.updateOne({ tenantId, unitCode: v.unitCode }, { $set: set });
    published++;
  }

  const live = await CurriculumLearningUnit.countDocuments({ tenantId, stageKey, status: 'PUBLISHED' });

  console.log('\nAPPLIED');
  console.log('  ' + pad('units published') + published);
  console.log('  ' + pad('estimates filled in') + minutesFilled);
  console.log('  ' + pad('now PUBLISHED on this stage') + live);
  console.log('  ' + pad('units archived or deleted') + 0);
  console.log('  ' + pad('student rows written') + 0);

  await mongoose.disconnect();
})().catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  await mongoose.disconnect();
  process.exit(1);
});
