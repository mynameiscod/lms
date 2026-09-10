/**
 * Rebuild plans that point at material which no longer resolves.
 *
 * DRY RUN BY DEFAULT.
 *
 * WHY THIS IS NEEDED. A plan stores the content it chose, deliberately — re-resolving on every
 * read would let the page disagree with the week it came from. The cost of that choice is that
 * retiring a content row leaves every plan built against it pointing at something a student can
 * no longer open. Moving Foundation content from per-skill rows to per-topic rows did exactly
 * that to every plan generated before the move: the topics are correct, the material behind them
 * is unpublished, and a student opening one sees an empty page.
 *
 * WHAT IT DOES. Finds active assignments whose assigned content no longer resolves, and replans
 * them through the ordinary service. A replan supersedes rather than deletes, so the old plan
 * stays readable and the student's history is untouched.
 *
 * WHAT IT DOES NOT DO. It does not touch a plan whose content still resolves, even if newer
 * material exists — that would rewrite plans nobody asked to have rewritten, and a plan that
 * changes under a student mid-week is worse than one that is slightly behind.
 *
 *   npx ts-node src/scripts/replanStaleAssignments.ts <tenantId>
 *   npx ts-node src/scripts/replanStaleAssignments.ts <tenantId> --apply
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LearningContentLibrary from '../models/LearningContentLibrary';
import StudentCurriculumAssignment from '../models/StudentCurriculumAssignment';
import { generateAssignment } from '../services/studentCurriculumAssignmentService';

dotenv.config();

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId) {
    console.error('Usage: replanStaleAssignments.ts <tenantId> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const assignments = await StudentCurriculumAssignment.find({
    tenantId, status: 'ACTIVE',
  }).lean() as any[];

  const rows: {
    id: string; studentId: string; curriculumId: string;
    topics: number; assigned: number; resolvable: number;
  }[] = [];

  for (const a of assignments) {
    const topics = ((a.moduleAssignments || []) as any[])
      .flatMap(m => (m.topicAssignments || []) as any[]);
    const ids = [...new Set(topics.flatMap(t => (t.assignedContentIds || []).map(String)))];
    const live = ids.length
      ? await LearningContentLibrary.countDocuments({
        _id: { $in: ids }, tenantId, isPublished: true,
      })
      : 0;
    rows.push({
      id: String(a._id), studentId: String(a.studentId), curriculumId: String(a.curriculumId),
      topics: topics.length, assigned: ids.length, resolvable: live,
    });
  }

  // Stale means it HAD material and none of it opens. A plan that never had any is not stale,
  // it is unauthored, and replanning would change nothing.
  const stale = rows.filter(r => r.assigned > 0 && r.resolvable === 0);
  const partial = rows.filter(r => r.assigned > 0 && r.resolvable > 0 && r.resolvable < r.assigned);
  const healthy = rows.filter(r => r.assigned > 0 && r.resolvable === r.assigned);
  const empty = rows.filter(r => r.assigned === 0);

  console.log(`\nSTALE PLAN CHECK — tenant ${tenantId} — ${apply ? 'APPLY' : 'DRY RUN'}\n`);
  console.log(`  active plans                    ${rows.length}`);
  console.log(`  fully resolvable, left alone    ${healthy.length}`);
  console.log(`  partly resolvable, left alone   ${partial.length}`);
  console.log(`  no content assigned at all      ${empty.length}`);
  console.log(`  STALE — nothing resolves        ${stale.length}`);

  for (const r of stale) {
    console.log(`    student ${r.studentId}  ${r.topics} topics, `
      + `${r.assigned} items assigned, ${r.resolvable} open`);
  }

  if (!apply) {
    console.log(`\nDry run. Nothing was written.`);
    await mongoose.disconnect();
    return;
  }

  let replanned = 0;
  let failed = 0;
  for (const r of stale) {
    try {
      const res = await generateAssignment({
        tenantId, studentId: r.studentId, curriculumId: r.curriculumId,
        replan: true, trigger: 'CONTENT_CHANGED' as any,
      });
      if (res.assignment) replanned++; else failed++;
    } catch (e: any) {
      console.error(`    student ${r.studentId}: ${e?.message || e}`);
      failed++;
    }
  }

  console.log(`\n  replanned                       ${replanned}`);
  console.log(`  failed                          ${failed}`);
  console.log(`  old plans superseded, not deleted`);

  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
