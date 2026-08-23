/**
 * Draft questions for every skill a published role needs and the pool cannot serve.
 *
 *   npx ts-node src/scripts/draftQuestionsForEmptySkills.ts <tenantId>                 # plan only
 *   npx ts-node src/scripts/draftQuestionsForEmptySkills.ts <tenantId> --apply
 *   ... --apply --per 8 --limit 5 --difficulty medium
 *
 * THESE ARE DRAFTS. THEY DO NOT REACH A STUDENT.
 *
 * Everything written here lands in SkillQuestionDraft with status 'pending'. A pending
 * draft is not a Question, has no SkillEvidence row, and is invisible to the generator —
 * so running this changes nothing a member can see. The pool only grows when a person
 * approves drafts on /admin/passport/question-drafts, which creates the Question and its
 * mapping together.
 *
 * That separation is the point, not an inconvenience. These questions produce a score that
 * gates a paid membership and gets printed on a card shown to people who are not the
 * student. A bigger pool of unreviewed questions is a worse product than a small reviewed
 * one: a question with a subtly wrong answer key marks people down for being right, and
 * nothing detects it except a human reading it.
 *
 * IT COSTS MONEY. Every batch is an AI call billed to the tenant, and the run is bounded by
 * --limit for exactly that reason. The plan printed before any spend says how many calls it
 * intends to make.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RoleSkillBlueprint from '../models/RoleSkillBlueprint';
import SkillEvidence from '../models/SkillEvidence';
import SkillQuestionDraft from '../models/SkillQuestionDraft';
import { getRoleSkillBlueprint } from '../services/roleSkillBlueprintService';
import { generateDrafts } from '../services/skillQuestionDraftService';

dotenv.config();

const arg = (flag: string, fallback: number): number => {
  const i = process.argv.indexOf(flag);
  return i > 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) || fallback : fallback;
};

async function main() {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const per = Math.max(1, Math.min(20, arg('--per', 8)));
  const limit = arg('--limit', 999);
  const dIdx = process.argv.indexOf('--difficulty');
  const difficulty = (dIdx > 0 ? process.argv[dIdx + 1] : 'medium') as 'easy' | 'medium' | 'hard';

  if (!tenantId) {
    console.error('Usage: draftQuestionsForEmptySkills.ts <tenantId> [--apply] [--per N] [--limit N] [--difficulty easy|medium|hard]');
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('MONGODB_URI is not set'); process.exit(1); }
  await mongoose.connect(uri);

  // Every skill any blueprint asks for — published or not, because a role that is currently
  // unpublished is unpublished BECAUSE of these gaps, and filling them is how it comes back.
  const wanted = new Map<string, Set<string>>();
  for (const row of await RoleSkillBlueprint.find({ tenantId }).lean() as any[]) {
    const bp: any = await getRoleSkillBlueprint(tenantId, row.roleKey);
    if (!bp) continue;
    for (const r of bp.requirements) {
      if (!r.active || !r.skillActive || r.missing) continue;
      if (!wanted.has(r.skillKey)) wanted.set(r.skillKey, new Set());
      wanted.get(r.skillKey)!.add(row.roleKey);
    }
  }

  const have = new Map<string, number>();
  for (const r of await SkillEvidence.aggregate([
    { $match: { tenantId, active: true } },
    { $group: { _id: '$skillKey', n: { $sum: 1 } } },
  ])) have.set(r._id, r.n);

  const pending = new Map<string, number>();
  for (const r of await SkillQuestionDraft.aggregate([
    { $match: { tenantId, status: 'pending' } },
    { $group: { _id: '$skillKey', n: { $sum: 1 } } },
  ])) pending.set(r._id, r.n);

  // Worst first, then by how many roles the skill unblocks — the highest-leverage gaps
  // get drafted before the budget runs out.
  const gaps = [...wanted.entries()]
    .map(([skillKey, roles]) => ({
      skillKey,
      roles: roles.size,
      approved: have.get(skillKey) || 0,
      pending: pending.get(skillKey) || 0,
    }))
    .filter(g => g.approved < per)
    .sort((a, b) => a.approved - b.approved || b.roles - a.roles);

  const targets = gaps.slice(0, limit);

  console.log(`\n${apply ? '=== DRAFTING ===' : '=== PLAN ONLY — no AI calls, nothing written ==='}`);
  console.log(`tenant ${tenantId}   ${per} questions per skill, ${difficulty} difficulty\n`);
  console.log(`${gaps.length} skills below target; drafting for ${targets.length} (--limit ${limit === 999 ? 'unset' : limit})\n`);
  for (const g of targets) {
    console.log(`  ${g.skillKey.padEnd(26)} in pool=${String(g.approved).padStart(2)}  pending=${String(g.pending).padStart(2)}  unblocks ${g.roles} role(s)`);
  }
  console.log(`\n  AI calls this run: ${targets.length}`);

  if (!apply) {
    console.log('\n(plan only — re-run with --apply to spend. Drafts land in the review queue,');
    console.log(' not in the pool: nothing reaches a student until a person approves it.)');
    await mongoose.disconnect();
    return;
  }

  let stored = 0, flagged = 0, dropped = 0, failed = 0;
  for (const g of targets) {
    try {
      const rep = await generateDrafts({
        tenantId, skillKey: g.skillKey, difficulty,
        count: per, generatedBy: 'draftQuestionsForEmptySkills',
      });
      stored += rep.stored; flagged += rep.flagged; dropped += rep.dropped.length;
      const warn = rep.dropped.length > rep.stored ? '  ⚠ more dropped than kept' : '';
      console.log(`  ${g.skillKey.padEnd(26)} +${rep.stored} drafted, ${rep.flagged} flagged, ${rep.dropped.length} auto-rejected${warn}`);
    } catch (e: any) {
      failed += 1;
      console.log(`  ${g.skillKey.padEnd(26)} FAILED — ${String(e?.message || e).slice(0, 90)}`);
    }
  }

  console.log(`\n=== ${stored} drafts written, ${flagged} flagged for a closer look, ${dropped} auto-rejected, ${failed} skills failed ===`);
  console.log('\nNothing has reached a student. Review at /admin/passport/question-drafts —');
  console.log('the pool grows only as drafts are approved, and roles republish when they can');
  console.log('be served (re-run fitCareerPilotToPool.ts after a review session).');

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
