/**
 * Make CareerPilot's configuration match the content it actually has.
 *
 *   npx ts-node src/scripts/fitCareerPilotToPool.ts <tenantId>            # dry run
 *   npx ts-node src/scripts/fitCareerPilotToPool.ts <tenantId> --apply
 *
 * In production, against the compiled build:
 *   docker exec lms-server-<slot> node dist/scripts/fitCareerPilotToPool.js <tenantId>
 *
 * TWO PROBLEMS, ONE MEASUREMENT.
 *
 * A role is published but cannot produce a paper, so a student picks it and is told the
 * assessment is not ready — having already invested in registering, choosing, and being
 * told this is the thing that will map their career. And a stage asks for more skills than
 * the tenant has content for, which no role can satisfy no matter how good its blueprint
 * is, because the arithmetic does not work.
 *
 * Both are the same fact seen twice: the configuration promises more than the pool can pay
 * for. So both are decided here from one measurement — the real generator, run for every
 * role at every stage, which is the only thing that knows for certain.
 *
 * WHY THIS IS A SCRIPT AND NOT A ONE-OFF EDIT.
 *
 * It is re-runnable, and it is meant to be re-run. As questions are added the answer
 * changes: a role that could not be served last week can be served today, and this will
 * publish it again. A hardcoded list of five role keys would be correct for exactly as long
 * as it took somebody to approve a batch of questions.
 *
 * WHAT IT WILL NOT DO.
 *
 * It never publishes a role it has not just watched generate a real paper, and it never
 * unpublishes the last surviving role — a CareerPilot where nobody can choose anything is
 * a worse failure than one with a narrow choice, and it would strand every existing member.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RoleSkillBlueprint from '../models/RoleSkillBlueprint';
import PassportConfig from '../models/PassportConfig';
import SkillEvidence from '../models/SkillEvidence';
import User from '../models/User';
import { buildPersonalizedAssessment } from '../services/personalizedAssessmentService';
import { resolveAssessmentPolicy } from '../services/assessmentPolicyService';
import { getRoleSkillBlueprint } from '../services/roleSkillBlueprintService';

dotenv.config();

/** The stage a role must be able to serve to stay published. */
const ENTRY_STAGES = ['foundation', 'build'] as const;
const ALL_STAGES = ['foundation', 'build', 'placement', 'job_seeker'] as const;

/**
 * A skill counts toward what a stage can span only if it has enough questions to fill a
 * slot on its own. `minItemsPerSkill` is 2 on every shipped policy, so a skill with one
 * question cannot hold a slot and must not be counted when sizing the paper.
 */
const MIN_ITEMS_PER_SKILL = 2;

async function main() {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId) {
    console.error('Usage: fitCareerPilotToPool.ts <tenantId> [--apply]');
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('MONGODB_URI is not set'); process.exit(1); }
  await mongoose.connect(uri);

  console.log(`\n${apply ? '=== APPLYING ===' : '=== DRY RUN — nothing will be written ==='}  tenant ${tenantId}\n`);

  // ── Measure the pool ──────────────────────────────────────────────────────
  const counts = new Map<string, number>();
  for (const r of await SkillEvidence.aggregate([
    { $match: { tenantId, active: true } },
    { $group: { _id: '$skillKey', n: { $sum: 1 } } },
  ])) counts.set(r._id, r.n);

  const usable = [...counts.entries()].filter(([, n]) => n >= MIN_ITEMS_PER_SKILL);
  console.log(`Pool: ${counts.size} skills mapped, ${usable.length} with >= ${MIN_ITEMS_PER_SKILL} questions (only these can hold a slot)`);
  console.log(`      ${usable.map(([k, n]) => `${k}(${n})`).join('  ') || '(none)'}\n`);

  // ── Part 1: size each stage to what the pool can span ─────────────────────
  //
  // maxSkills above the number of usable skills is a promise the pool cannot keep: the
  // generator opens slots for skills it will then find empty, and the paper is refused.
  const cfg: any = await PassportConfig.findOne({ tenantId });
  const overrides: any[] = (cfg?.assessmentPolicyOverrides || []).map((o: any) => ({ ...o }));
  const policyChanges: string[] = [];

  for (const stage of ALL_STAGES) {
    const policy: any = await resolveAssessmentPolicy(tenantId, stage as any);
    if (policy.maxSkills <= usable.length) continue;

    const fitted = Math.max(3, usable.length);
    // Slots must still be fillable: at most maxItemsPerSkill from each skill.
    const maxSlots = fitted * (policy.maxItemsPerSkill || 3);
    const fittedSlots = Math.min(policy.skillSlots, maxSlots);

    policyChanges.push(
      `  ${stage.padEnd(11)} maxSkills ${policy.maxSkills} -> ${fitted}` +
      (fittedSlots !== policy.skillSlots ? `,  skillSlots ${policy.skillSlots} -> ${fittedSlots}` : '')
    );

    const existing = overrides.find(o => o.stage === stage);
    if (existing) { existing.maxSkills = fitted; existing.skillSlots = fittedSlots; }
    else overrides.push({ stage, maxSkills: fitted, skillSlots: fittedSlots });
  }

  console.log('--- stage sizing ---');
  console.log(policyChanges.length ? policyChanges.join('\n') : '  every stage already fits the pool');

  if (apply && policyChanges.length) {
    await PassportConfig.updateOne({ tenantId }, { $set: { assessmentPolicyOverrides: overrides } }, { upsert: true });
  }

  // ── Part 2: publish only what can actually be served ──────────────────────
  //
  // Run AFTER the sizing above is saved, so a role is judged against the paper students
  // will really sit rather than the one that was refusing everybody a moment ago.
  console.log('\n--- role capability (measured with the real generator) ---');

  const blueprints: any[] = await RoleSkillBlueprint.find({ tenantId }).lean() as any;
  const verdicts: { roleKey: string; was: boolean; should: boolean; servable: string[] }[] = [];

  for (const row of blueprints) {
    const bp: any = await getRoleSkillBlueprint(tenantId, row.roleKey);
    if (!bp) continue;
    const roleSkillKeys = bp.requirements
      .filter((r: any) => r.active && r.skillActive && !r.missing)
      .map((r: any) => r.skillKey);

    const servable: string[] = [];
    for (const stage of ALL_STAGES) {
      const policy = await resolveAssessmentPolicy(tenantId, stage as any);
      const built: any = await buildPersonalizedAssessment({
        tenantId, studentId: 'fit-probe', roleKey: row.roleKey, stage,
        roleSkillKeys, blueprintVersion: bp.version, policy, seed: `fit-${row.roleKey}-${stage}`,
      } as any).catch(() => ({ ok: false }));
      if (built.ok) servable.push(stage);
    }

    // Publishable means a NEW member can start. Someone arriving at placement stage with
    // nothing to sit is the case this is protecting against, but foundation and build are
    // where almost everyone enters, so serving either is enough to be worth offering.
    const should = ENTRY_STAGES.some(s => servable.includes(s));
    verdicts.push({ roleKey: row.roleKey, was: !!row.published, should, servable });
  }

  for (const v of verdicts) {
    const mark = v.was === v.should ? ' ' : (v.should ? '+' : '-');
    console.log(`${mark} ${v.roleKey.padEnd(20)} published=${String(v.was).padEnd(5)} servable=[${v.servable.join(',') || 'none'}]`);
  }

  const toUnpublish = verdicts.filter(v => v.was && !v.should);
  const toPublish = verdicts.filter(v => !v.was && v.should);

  // Never leave the product with nothing to choose.
  if (toUnpublish.length && !verdicts.some(v => v.should)) {
    console.log('\n  REFUSING to unpublish: no role can be served, and a CareerPilot with');
    console.log('  no selectable role strands every existing member. Fix the pool first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // Who is already pointed at a role that is about to disappear from the menu.
  for (const v of toUnpublish) {
    const n = await User.countDocuments({ tenantId, 'passport.primaryRole': v.roleKey });
    if (n > 0) {
      console.log(`\n  NOTE: ${n} member(s) already chose ${v.roleKey}. Unpublishing does not`);
      console.log('  change their choice or their data — they keep it, and it starts working');
      console.log('  again the moment the role is republished. Until then they are told it is');
      console.log('  not ready, which is what they were being told anyway.');
    }
  }

  console.log(`\n--- ${apply ? 'applied' : 'would apply'} ---`);
  console.log(`  unpublish: ${toUnpublish.map(v => v.roleKey).join(', ') || '(none)'}`);
  console.log(`  publish:   ${toPublish.map(v => v.roleKey).join(', ') || '(none)'}`);

  if (apply) {
    for (const v of [...toUnpublish, ...toPublish]) {
      await RoleSkillBlueprint.updateOne(
        { tenantId, roleKey: v.roleKey },
        { $set: { published: v.should, updatedBy: 'fitCareerPilotToPool' } },
      );
    }
    console.log('\n✅ Written. Re-run after adding questions — roles republish automatically.');
  } else {
    console.log('\n(dry run — nothing written. Re-run with --apply.)');
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
