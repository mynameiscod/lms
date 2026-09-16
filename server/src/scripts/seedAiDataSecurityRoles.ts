/**
 * Give the AI, Data, Security and Cloud roles a skill taxonomy and a blueprint.
 *
 *   npx ts-node src/scripts/seedAiDataSecurityRoles.ts <tenantId>            # plan only
 *   npx ts-node src/scripts/seedAiDataSecurityRoles.ts <tenantId> --apply
 *
 * ── WHAT IT FIXES ─────────────────────────────────────────────────────────────────────────
 *
 * Nineteen roles are on offer and ten have no blueprint, because the catalogue holds one domain
 * — SOFTWARE_ENGINEERING — and nothing in it describes retrieval, pipelines, threat modelling or
 * Kubernetes. Two more have a blueprint built from whatever was available: AI_ENGINEER is HTML,
 * CSS, SQL and DSA; GENERATIVE_AI_ENGINEER is 58 skills including TYPING_SPEED and
 * SELF_INTRODUCTION, and no generative-AI skill at all.
 *
 * ── WHY IT REFUSES RATHER THAN PARTIALLY WRITES ───────────────────────────────────────────
 *
 * Every skill a blueprint names is checked against the catalogue BEFORE anything is written. A
 * blueprint referring to a skill that does not exist is not a small problem: role readiness
 * divides by the number of requirements, so a dangling key permanently lowers the score of every
 * student who picks that role, and nothing in the product reports it. Refusing leaves a tenant
 * exactly as it was, which is a state somebody can reason about.
 *
 * Idempotent. Skills upsert on `key`, blueprints on (tenantId, roleKey). Running it twice changes
 * nothing the second time. Existing blueprints are only replaced when they are in REPLACE, and
 * the reason is printed.
 */

import mongoose from 'mongoose';
import CareerSkill from '../models/CareerSkill';
import CareerRole from '../models/CareerRole';
import RoleSkillBlueprint, { DEFAULT_WEIGHT } from '../models/RoleSkillBlueprint';
import { NEW_SKILLS, NEW_DOMAINS } from '../data/aiDataSecuritySkills';
import { NEW_BLUEPRINTS } from '../data/aiDataSecurityBlueprints';

const ACTOR = 'ai-data-security-seed';

async function main() {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId || tenantId.startsWith('--')) {
    console.error('Usage: seedAiDataSecurityRoles.ts <tenantId> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/lms-saas');
  const say = (s = '') => console.log(s);
  say('─'.repeat(92));
  say(`AI / DATA / SECURITY ROLE SEED  ·  tenant ${tenantId}  ·  ${apply ? 'APPLY' : 'PLAN ONLY'}`);
  say('─'.repeat(92));

  /* ── 1. skills ───────────────────────────────────────────────────────────────────────── */
  const existingKeys = new Set<string>(await CareerSkill.distinct('key'));
  const toCreate = NEW_SKILLS.filter(s => !existingKeys.has(s.key));
  const already = NEW_SKILLS.length - toCreate.length;

  say(`\n  SKILLS`);
  say(`    catalogue now        ${existingKeys.size}`);
  say(`    this seed defines    ${NEW_SKILLS.length}  across ${NEW_DOMAINS.map(d => d.key).join(', ')}`);
  say(`    already present      ${already}`);
  say(`    would create         ${toCreate.length}`);

  /* ── 2. every blueprint reference must resolve ───────────────────────────────────────── */
  const afterSkills = new Set<string>([...existingKeys, ...NEW_SKILLS.map(s => s.key)]);
  const problems: string[] = [];
  const roleKeys = await CareerRole.find({ tenantId }).distinct('key');
  const haveRole = new Set<string>(roleKeys.map(String));

  for (const bp of NEW_BLUEPRINTS) {
    if (!haveRole.has(bp.roleKey)) { problems.push(`${bp.roleKey}: no such role in this tenant`); continue; }
    const seen = new Set<string>();
    for (const r of bp.requirements) {
      if (!afterSkills.has(r.skillKey)) problems.push(`${bp.roleKey}: unknown skill ${r.skillKey}`);
      if (seen.has(r.skillKey)) problems.push(`${bp.roleKey}: ${r.skillKey} listed twice`);
      seen.add(r.skillKey);
    }
  }

  /* ── 3. what each blueprint would become ─────────────────────────────────────────────── */
  say(`\n  BLUEPRINTS`);
  say(`    ${'ROLE'.padEnd(30)}${'now'.padStart(6)}${'after'.padStart(7)}   note`);
  for (const bp of NEW_BLUEPRINTS) {
    const cur = await RoleSkillBlueprint.findOne({ tenantId, roleKey: bp.roleKey }).lean() as any;
    const now = cur ? (cur.requirements || []).length : 0;
    const note = !cur ? 'new' : (bp.replacesReason ? `REPLACES — ${bp.replacesReason}` : 'exists, left alone');
    say(`    ${bp.roleKey.padEnd(30)}${String(cur ? now : '—').padStart(6)}${String(bp.requirements.length).padStart(7)}   ${note}`);
  }

  if (problems.length) {
    say(`\n  REFUSED — ${problems.length} problem(s), nothing written:`);
    for (const p of problems.slice(0, 25)) say(`    ${p}`);
    await mongoose.disconnect();
    process.exit(1);
  }
  say(`\n  every blueprint reference resolves.`);

  if (!apply) {
    say(`\n  PLAN ONLY — nothing written. Re-run with --apply.`);
    await mongoose.disconnect();
    return;
  }

  /* ── 4. write ────────────────────────────────────────────────────────────────────────── */
  let created = 0;
  for (const s of NEW_SKILLS) {
    const res = await CareerSkill.updateOne(
      { key: s.key },
      {
        $set: {
          name: s.name, description: s.description, domainKey: s.domainKey,
          nodeType: s.nodeType, parentKey: s.parentKey, difficulty: s.difficulty,
          prerequisiteKeys: s.prerequisiteKeys || [],
          assessable: s.assessable !== false && s.nodeType === 'SKILL',
          learnable: s.nodeType === 'SKILL',
          updatedBy: ACTOR,
        },
        $setOnInsert: { key: s.key, aliases: s.aliases || [], active: true, systemSkill: true, createdBy: ACTOR },
      },
      { upsert: true },
    );
    if ((res as any).upsertedCount) created++;
  }
  say(`\n  skills: ${created} created, ${NEW_SKILLS.length - created} updated in place`);

  let bpNew = 0, bpReplaced = 0, bpKept = 0;
  for (const bp of NEW_BLUEPRINTS) {
    const cur = await RoleSkillBlueprint.findOne({ tenantId, roleKey: bp.roleKey }).lean() as any;
    if (cur && !bp.replacesReason) { bpKept++; continue; }

    const requirements = bp.requirements.map(r => ({
      skillKey: r.skillKey,
      importance: r.importance,
      weight: DEFAULT_WEIGHT[r.importance],
      targetLevel: r.targetLevel,
      years: [],
      yearTargets: [],
    }));

    await RoleSkillBlueprint.updateOne(
      { tenantId, roleKey: bp.roleKey },
      {
        $set: { requirements, published: true, updatedBy: ACTOR, version: (cur?.version || 0) + 1 },
        $setOnInsert: { tenantId, roleKey: bp.roleKey, domainKey: 'SOFTWARE_ENGINEERING', createdBy: ACTOR },
      },
      { upsert: true },
    );
    if (cur) { bpReplaced++; say(`    replaced ${bp.roleKey}: ${(cur.requirements || []).length} → ${requirements.length}`); }
    else bpNew++;
  }
  say(`  blueprints: ${bpNew} created, ${bpReplaced} replaced, ${bpKept} left alone`);

  say(`\n  DONE. Questions are NOT seeded here — run draftForStageAndRoleGaps.ts next, which`);
  say(`  drafts them for review rather than publishing them straight to students.`);
  await mongoose.disconnect();
}

main().catch(e => { console.error('FAILED:', e?.message || e); process.exit(1); });
