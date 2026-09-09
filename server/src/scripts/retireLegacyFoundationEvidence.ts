/**
 * Retire the legacy Foundation question mappings, so new diagnostics draw only on the Golden bank.
 *
 * DRY RUN BY DEFAULT. --apply retires, --restore puts back exactly what this script retired.
 *
 * WHAT IS RETIRED, AND WHAT THAT MEANS. A SkillEvidence row with active:false is a mapping that
 * has been withdrawn: findEvidenceCandidates filters on active, so the question stops being
 * offered to new papers. The model defines the flag as "retired but not forgotten" and that is
 * exactly the intent here.
 *
 * WHAT IS NOT TOUCHED, DELIBERATELY AND IN EVERY CASE:
 *
 *   Question rows          — never deleted. The content survives, and every paper already sitting
 *                            in a student's history still resolves and still grades, because the
 *                            grader loads content by id and never consults the mapping.
 *   PersonalizedAssessment — historical papers are not rewritten. A retired mapping does not make
 *                            a past attempt invalid; it means the question will not be asked again.
 *   StudentSkillEvidence   — what somebody demonstrated. Retiring the question they demonstrated
 *                            it on does not un-demonstrate it.
 *   StudentSkillProfile    — derived from the evidence above, which has not changed, so the
 *                            profile must not change either. A skill measured last week is still
 *                            measured; only the pool for the NEXT paper is different.
 *
 * REVERSIBLE, AND EXACTLY. Every row this retires is stamped `updatedBy`, so --restore reactivates
 * those and only those. It cannot resurrect the 151 mappings the Golden importer retired for a
 * different reason — those carry a different stamp — and it cannot reactivate something an admin
 * switched off by hand.
 *
 * IDEMPOTENT. Retiring twice modifies nothing the second time, because the filter requires
 * active:true. Restoring twice likewise.
 *
 *   npx ts-node src/scripts/retireLegacyFoundationEvidence.ts <tenantId>
 *   npx ts-node src/scripts/retireLegacyFoundationEvidence.ts <tenantId> --apply
 *   npx ts-node src/scripts/retireLegacyFoundationEvidence.ts <tenantId> --restore --apply
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import SkillEvidence from '../models/SkillEvidence';
import StageSkillSet from '../models/StageSkillSet';
import StudentSkillEvidence from '../models/StudentSkillEvidence';
import StudentSkillProfile from '../models/StudentSkillProfile';
import Question from '../models/Question';
import { findEvidenceCandidates } from '../services/skillEvidenceService';

dotenv.config();

/** The stamp that makes --restore exact. Rows retired by the importer carry a different one. */
const RETIRED_BY = 'foundation-legacy-retirement';

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const restore = process.argv.includes('--restore');
  const stageArg = process.argv.find(a => a.startsWith('--stage='));
  const stage = stageArg ? stageArg.split('=')[1] : 'foundation';

  if (!tenantId) {
    console.error('Usage: retireLegacyFoundationEvidence.ts <tenantId> [--apply] [--restore]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const set = await StageSkillSet.findOne({ tenantId, stage }).lean() as any;
  const foundationSkills = ((set?.requirements || []) as any[])
    .filter(r => r.active !== false)
    .map(r => String(r.skillKey).toUpperCase());

  /* ---- the before picture, including everything that must not move --------------------- */

  const before = await snapshot();

  const target = restore
    ? { tenantId, sourceType: 'question', active: false, updatedBy: RETIRED_BY }
    : { tenantId, sourceType: 'question', active: true, skillKey: { $in: foundationSkills } };

  const affected = await SkillEvidence.find(target).select('sourceId skillKey').lean() as any[];
  const bySkill = new Map<string, number>();
  for (const r of affected) bySkill.set(r.skillKey, (bySkill.get(r.skillKey) || 0) + 1);

  console.log(`\nLEGACY FOUNDATION RETIREMENT — tenant ${tenantId}, stage "${stage}"`);
  console.log(`${restore ? 'RESTORE' : 'RETIRE'} — ${apply ? 'APPLY' : 'DRY RUN'}\n`);
  console.log(`mappings this run would ${restore ? 'reactivate' : 'retire'}: ${affected.length}`);
  for (const [k, n] of [...bySkill].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(30)}${n}`);
  }

  if (apply && affected.length) {
    const res = restore
      ? await SkillEvidence.updateMany(target, { $set: { active: true }, $unset: { updatedBy: '' } })
      : await SkillEvidence.updateMany(target, { $set: { active: false, updatedBy: RETIRED_BY } });
    console.log(`\nmodified: ${res.modifiedCount}`);
  } else if (!apply) {
    console.log('\nDry run. Nothing was written.');
  }

  /* ---- the after picture, and the untouchables checked rather than asserted ------------- */

  const after = await snapshot();

  console.log(`\nSTATE`);
  const line = (label: string, b: number, a: number, mustHold: boolean) =>
    console.log(`  ${label.padEnd(38)}${String(b).padEnd(8)}${String(a).padEnd(8)}`
      + (mustHold ? (b === a ? 'unchanged' : '*** CHANGED ***') : ''));
  console.log(`  ${'metric'.padEnd(38)}${'before'.padEnd(8)}${'after'.padEnd(8)}`);
  line('active Golden PRIMARY', before.golden, after.golden, false);
  line('active legacy Foundation', before.legacyActive, after.legacyActive, false);
  line('inactive legacy (any reason)', before.legacyInactive, after.legacyInactive, false);
  line('Question rows', before.questions, after.questions, true);
  line('PersonalizedAssessment rows', before.papers, after.papers, true);
  line('StudentSkillEvidence rows', before.studentEvidence, after.studentEvidence, true);
  line('StudentSkillProfile rows', before.profiles, after.profiles, true);
  line('StudentSkillProfile last update', before.profileStamp, after.profileStamp, true);

  /* ---- the known-bad question, checked through the generator's own pool query ----------- */

  const BAD_ID = '95c3883661632872716f6039';
  const bad = await Question.findById(BAD_ID).lean() as any;
  console.log(`\nKNOWN-BAD LEGACY QUESTION ${BAD_ID}`);
  if (!bad) {
    console.log('  not present in this tenant');
  } else {
    const correct = (bad.options || []).filter((o: any) => o?.isCorrect === true).length;
    console.log(`  prompt          : ${String(bad.question).replace(/\s+/g, ' ').slice(0, 70)}`);
    console.log(`  options flagged correct: ${correct} of ${(bad.options || []).length}`);
    console.log(`  Question row still present: yes (content is never deleted)`);

    const maps = await SkillEvidence.find({ tenantId, sourceId: BAD_ID }).lean() as any[];
    console.log(`  mappings        : ${maps.map(m => `${m.skillKey} active=${m.active !== false}`).join(', ') || 'none'}`);

    // The real test: ask the generator's own pool function, for every Foundation skill.
    const pools = await findEvidenceCandidates(tenantId, {
      skillKeys: foundationSkills, contribution: 'PRIMARY',
    });
    const reachable = pools.some(p => (p.items || []).some((i: any) => String(i.sourceId) === BAD_ID));
    console.log(`  reachable by findEvidenceCandidates across all ${foundationSkills.length} `
      + `Foundation skills: ${reachable ? '*** YES ***' : 'no'}`);
  }

  await mongoose.disconnect();

  async function snapshot() {
    const [golden, legacyActive, legacyInactive, questions, papers, studentEvidence, profiles] =
      await Promise.all([
        SkillEvidence.countDocuments({ tenantId, sourceType: 'assessment_item', active: true }),
        SkillEvidence.countDocuments({ tenantId, sourceType: 'question', active: true }),
        SkillEvidence.countDocuments({ tenantId, sourceType: 'question', active: false }),
        Question.countDocuments({ tenantId }),
        PersonalizedAssessment.countDocuments({ tenantId }),
        StudentSkillEvidence.countDocuments({ tenantId }),
        StudentSkillProfile.countDocuments({ tenantId }),
      ]);
    // A profile rewritten as a side effect would move its updatedAt even if the count held.
    const newest = await StudentSkillProfile.findOne({ tenantId })
      .sort({ updatedAt: -1 }).select('updatedAt').lean() as any;
    return {
      golden, legacyActive, legacyInactive, questions, papers, studentEvidence, profiles,
      profileStamp: newest?.updatedAt ? new Date(newest.updatedAt).getTime() : 0,
    };
  }
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
