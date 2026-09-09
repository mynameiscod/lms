/**
 * Prove the imported Golden Bank is reachable by the real generator.
 *
 * READ-ONLY. It builds specifications and throws them away — nothing is saved, no attempt is
 * opened, and no student record is written.
 *
 * IT CALLS buildPersonalizedAssessment, not a copy of it. A reachability check that
 * reimplemented selection would prove only that this file can find the rows; the question worth
 * answering is whether the code that actually serves papers can, with the same policy, the same
 * pools and the same anti-repeat rules.
 *
 * WHAT EACH SPECIFICATION IS ASKED TO SHOW:
 *
 *   1-3  three members, same stage, different seeds — papers fill, and draw from the Golden bank
 *   4    one skill in isolation, which is the reassessment path
 *   5    a retake for member 1, told what member 1 has already seen — the items must be fresh
 *
 *   npx ts-node src/scripts/goldenBankReachability.ts <tenantId> [--stage=foundation]
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import AssessmentItem from '../models/AssessmentItem';
import StageSkillSet from '../models/StageSkillSet';
import { buildPersonalizedAssessment } from '../services/personalizedAssessmentService';
import { resolveAssessmentPolicy } from '../services/assessmentPolicyService';

dotenv.config();

interface Built {
  ok: boolean;
  items?: any[];
  report?: any;
  specification?: any;
  notMeasuredSkills?: any[];
  adminMessage?: string;
}

(async () => {
  const tenantId = process.argv[2];
  const stageArg = process.argv.find(a => a.startsWith('--stage='));
  const stage = stageArg ? stageArg.split('=')[1] : 'foundation';

  if (!tenantId) {
    console.error('Usage: goldenBankReachability.ts <tenantId> [--stage=foundation]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const policy = await resolveAssessmentPolicy(tenantId, stage);
  const set = await StageSkillSet.findOne({ tenantId, stage }).lean() as any;
  const skillKeys = ((set?.requirements || []) as any[])
    .filter(r => r.active !== false)
    .map(r => String(r.skillKey).toUpperCase());

  /** Everything needed to say whether a chosen item came from the Golden bank, in one query. */
  const golden = await AssessmentItem.find({ tenantId, 'golden.questionId': { $exists: true } })
    .select('_id golden.questionId golden.familyId golden.factId golden.difficultyBand golden.skillKey')
    .lean() as any[];
  const goldenById = new Map(golden.map(g => [String(g._id), g.golden]));

  console.log(`\nGOLDEN BANK REACHABILITY — tenant ${tenantId}, stage "${stage}"`);
  console.log(`policy ${policy.key} v${policy.version}: ${policy.skillSlots} slots, `
    + `${policy.maxSkills} skills, ${policy.minItemsPerSkill} per skill`);
  console.log(`Golden items in this tenant: ${golden.length}\n`);

  const base = {
    tenantId, stage, roleKey: 'FOUNDATION',
    roleSkillKeys: skillKeys, blueprintVersion: set?.version || 0, policy,
  } as any;

  const specs: { label: string; input: any }[] = [
    { label: '1  member alpha, first attempt', input: { ...base, studentId: 'reach-alpha', attemptNumber: 1 } },
    { label: '2  member beta, first attempt', input: { ...base, studentId: 'reach-beta', attemptNumber: 1 } },
    { label: '3  member gamma, first attempt', input: { ...base, studentId: 'reach-gamma', attemptNumber: 1 } },
    {
      label: '4  member alpha, one skill only (the reassessment path)',
      input: { ...base, studentId: 'reach-alpha', roleSkillKeys: ['OPERATING_SYSTEMS'], attemptNumber: 2 },
    },
  ];

  let firstItems: any[] = [];

  for (const { label, input } of specs) {
    const built = await buildPersonalizedAssessment(input) as Built;
    report(label, built);
    if (label.startsWith('1 ')) firstItems = built.items || [];
  }

  /* ---- the retake: alpha again, told exactly what alpha already saw --------------------- */

  const seenSourceIds = firstItems.map(i => String(i.sourceId));
  const seenFactKeys = [...new Set(firstItems
    .map(i => goldenById.get(String(i.sourceId))?.factId)
    .filter(Boolean) as string[])];

  const retake = await buildPersonalizedAssessment({
    ...base, studentId: 'reach-alpha', attemptNumber: 2, seenSourceIds, seenFactKeys,
  }) as Built;
  report('5  member alpha, retake, avoiding what attempt 1 asked', retake);

  const repeatIds = (retake.items || []).filter(i => seenSourceIds.includes(String(i.sourceId)));
  const repeatFacts = (retake.items || [])
    .map(i => goldenById.get(String(i.sourceId))?.factId)
    .filter(f => f && seenFactKeys.includes(f));

  console.log(`   retake overlap with attempt 1 — items ${repeatIds.length}, `
    + `facts ${repeatFacts.length}`);

  await mongoose.disconnect();

  function report(label: string, built: Built) {
    console.log(label);
    if (!built.ok) {
      console.log(`   REFUSED: ${built.adminMessage || '(no message)'}\n`);
      return;
    }
    const items = built.items || [];
    const r = built.report || {};

    const families = new Map<string, number>();
    for (const i of items) families.set(i.sourceType, (families.get(i.sourceType) || 0) + 1);

    const fromGolden = items.filter(i => goldenById.has(String(i.sourceId)));
    const bands = new Map<string, number>();
    for (const i of fromGolden) {
      const b = goldenById.get(String(i.sourceId))!.difficultyBand;
      bands.set(b, (bands.get(b) || 0) + 1);
    }
    const skills = new Set(items.map(i => i.skillKey));
    const goldFamilies = new Set(fromGolden.map(i => goldenById.get(String(i.sourceId))!.familyId));
    const goldFacts = new Set(fromGolden.map(i => goldenById.get(String(i.sourceId))!.factId));

    console.log(`   filled ${r.filled}/${r.requestedSlots}   skills ${skills.size}`
      + `   exact ${r.exactMatches}   difficulty fallbacks ${r.difficultyFallbacks}`
      + `   shortfalls ${(r.shortfalls || []).length}`);
    console.log(`   source families: ` + [...families].map(([k, n]) => `${k} ${n}`).join(', '));
    console.log(`   from the Golden bank: ${fromGolden.length}/${items.length}`
      + `   distinct families ${goldFamilies.size}   distinct facts ${goldFacts.size}`);
    console.log(`   authored bands served: `
      + ['D1', 'D2', 'D3', 'D4', 'D5'].map(b => `${b} ${bands.get(b) || 0}`).join(', '));
    console.log(`   repeated facts within this paper: ${r.repeatedFactsInPaper ?? 0}`);
    if ((built.notMeasuredSkills || []).length) {
      console.log(`   not measured: ${(built.notMeasuredSkills || []).length} skill(s)`);
    }
    const sample = items[0];
    if (sample) {
      const g = goldenById.get(String(sample.sourceId));
      console.log(`   first item: ${sample.sourceType} ${sample.skillKey} ${sample.difficulty}`
        + (g ? `  <- ${g.questionId} ${g.difficultyBand} ${g.familyId}` : '  <- legacy'));
    }
    console.log('');
  }
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
