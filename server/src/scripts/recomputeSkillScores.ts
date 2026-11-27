/**
 * Recompute every member's Skill DNA (and with it their Career Score) under the current rules.
 *
 * WHY. Scores are stored, not computed on read. SKILL_DNA_V2 (2026-10-30) changed the rules — a
 * retaken item counts once at its latest answer, MEDIUM confidence needs two different items — and
 * the Career Score now refreshes on every recompute. Stored profiles keep the old numbers until a
 * member next does something, so this brings everyone up to date at once. Nothing is lost: profiles
 * are derived entirely from the evidence rows, which this does not touch.
 *
 * DRY RUN unless --apply: it then reports how many members and skills it would recompute, and how
 * many scores and confidences would change (worked out on the side, nothing written).
 *
 *   npx ts-node src/scripts/recomputeSkillScores.ts [<tenantId>] [--apply]
 *   node dist/scripts/recomputeSkillScores.js [<tenantId>] [--apply]      # in the container
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import StudentSkillEvidence from '../models/StudentSkillEvidence';
import StudentSkillProfile from '../models/StudentSkillProfile';
import { aggregate, latestPerItem } from '../data/skillDnaPolicy';
import { rebuildSkillDnaForStudent } from '../services/skillDnaService';

const key = (t: string, id: string) => `${t}:${id}`;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const onlyTenant = args.find(a => !a.startsWith('--')) || '';
  await mongoose.connect(uri);

  const pairs = await StudentSkillEvidence.aggregate([
    { $match: onlyTenant ? { tenantId: onlyTenant } : {} },
    { $group: { _id: { tenantId: '$tenantId', studentId: '$studentId' } } },
  ]);
  console.log(`\n=== Recompute skill scores (${apply ? 'APPLY' : 'DRY RUN'}) — ${pairs.length} member(s) with evidence ===`);

  let skills = 0, scoreChanged = 0, confChanged = 0, done = 0;
  for (const { _id } of pairs) {
    const tenantId = String(_id.tenantId), studentId = String(_id.studentId);
    const [evidence, profiles] = await Promise.all([
      StudentSkillEvidence.find({ tenantId, studentId }).lean() as Promise<any[]>,
      StudentSkillProfile.find({ tenantId, studentId }).select('skillKey score confidence').lean() as Promise<any[]>,
    ]);
    const before = new Map(profiles.map(p => [String(p.skillKey), p]));
    const bySkill = new Map<string, any[]>();
    for (const e of evidence) bySkill.set(e.skillKey, [...(bySkill.get(e.skillKey) || []), e]);
    for (const [skillKey, rows] of bySkill) {
      skills++;
      const r = aggregate(latestPerItem(rows.map(x => ({
        performance: x.performance, evidenceWeight: x.evidenceWeight, itemKey: key(x.itemSourceType, x.itemSourceId), observedAt: x.observedAt,
      }))));
      const old = before.get(skillKey);
      if (!old || old.score !== r.score) scoreChanged++;
      if (!old || old.confidence !== r.confidence) confChanged++;
    }
    if (apply) {
      await rebuildSkillDnaForStudent(tenantId, studentId);   // also refreshes the Career Score
      done++;
      if (done % 100 === 0) console.log(`  … ${done}/${pairs.length}`);
    }
  }
  console.log(`\n${skills} skill profile(s): ${scoreChanged} score(s) and ${confChanged} confidence(s) ${apply ? 'changed' : 'would change'}.`);
  console.log(apply ? `Recomputed ${done} member(s); their Career Scores were refreshed.\n` : 'Run again with --apply to write.\n');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
