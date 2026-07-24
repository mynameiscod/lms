/**
 * One-off migration: turn existing baked-date, batch-assigned assignments/quizzes
 * into AssessmentSchedule rows (source 'standalone'), so they run on the reusable
 * per-batch scheduling model. Idempotent — skips (content, batch) pairs already
 * scheduled. Un-migrated content keeps working via the baked-date fallback, so this
 * is OPTIONAL and safe to run in stages.
 *
 * Dry run:  node dist/scripts/migrateAssessmentSchedules.js
 * Apply:    APPLY=1 node dist/scripts/migrateAssessmentSchedules.js
 */
import mongoose from 'mongoose';
import Assignment from '../models/Assignment';
import Quiz from '../models/Quiz';
import Batch from '../models/Batch';
import AssessmentSchedule from '../models/AssessmentSchedule';

function atTime(date: any, time?: string): Date | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  if (time && /^\d{1,2}:\d{2}$/.test(time)) { const [h, m] = time.split(':').map(Number); d.setHours(h, m, 0, 0); }
  return d;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri);
  const apply = process.env.APPLY === '1';

  const batchName: Record<string, string> = {};
  (await Batch.find().select('name').lean()).forEach((b: any) => { batchName[String(b._id)] = b.name; });

  const rows: any[] = [];

  // Assignments: batch_wise + selectedBatches + a dueDate.
  const asgs = await Assignment.find({ accessibleTo: 'batch_wise', selectedBatches: { $exists: true, $ne: [] } })
    .select('title tenant selectedBatches startDate dueDate lateSubmissionDeadline lateSubmissionPenalty').lean();
  for (const a of asgs as any[]) {
    const dueAt = a.dueDate ? new Date(a.dueDate) : undefined;
    let latePolicy = 'grace', graceDays = 2;
    if (a.lateSubmissionDeadline && dueAt) {
      graceDays = Math.max(0, Math.round((new Date(a.lateSubmissionDeadline).getTime() - dueAt.getTime()) / 86400000));
    }
    for (const bid of a.selectedBatches || []) {
      rows.push({
        tenantId: String(a.tenant), contentType: 'assignment', contentId: a._id, contentTitle: a.title,
        batchId: bid, batchName: batchName[String(bid)], startAt: a.startDate ? new Date(a.startDate) : undefined,
        dueAt, latePolicy, graceDays, penaltyPct: a.lateSubmissionPenalty || 0, dueTime: '23:59', source: 'standalone', status: 'active',
      });
    }
  }

  // Quizzes: batch_wise + selectedBatches (hard_lock at endDate — matches legacy).
  const quizzes = await Quiz.find({ accessibleTo: 'batch_wise', selectedBatches: { $exists: true, $ne: [] } })
    .select('title tenantId selectedBatches startDate endDate startTime endTime').lean();
  for (const q of quizzes as any[]) {
    for (const bid of q.selectedBatches || []) {
      rows.push({
        tenantId: String(q.tenantId), contentType: 'quiz', contentId: q._id, contentTitle: q.title,
        batchId: bid, batchName: batchName[String(bid)], startAt: atTime(q.startDate, q.startTime),
        dueAt: atTime(q.endDate, q.endTime), latePolicy: 'hard_lock', graceDays: 0, penaltyPct: 0, dueTime: q.endTime || '23:59',
        source: 'standalone', status: 'active',
      });
    }
  }

  // Skip pairs already scheduled.
  let created = 0, skipped = 0;
  for (const r of rows) {
    const exists = await AssessmentSchedule.exists({ contentType: r.contentType, contentId: r.contentId, batchId: r.batchId });
    if (exists) { skipped++; continue; }
    if (apply) await AssessmentSchedule.create(r);
    created++;
  }

  console.log(`\n=== Assessment schedule migration (${apply ? 'APPLY' : 'DRY RUN'}) ===`);
  console.log(`assignments: ${asgs.length}  quizzes: ${quizzes.length}`);
  console.log(`schedule rows to create: ${created}  |  already scheduled (skipped): ${skipped}`);
  if (!apply) console.log('(dry run — set APPLY=1 to write)');
  await mongoose.disconnect();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
