import mongoose from 'mongoose';
import Attendance from '../models/Attendance';
import Audit from '../models/McpAuditEvent';

export async function inspectAttendanceMigration() {
  const invalidDates = await Attendance.collection.countDocuments({ $expr: { $ne: [{ $type: '$date' }, 'date'] } });
  if (invalidDates) return { ready: false, invalidDates, duplicates: [] };
  const duplicates = await Attendance.aggregate([
    { $group: { _id: { tenantId: '$tenantId', batchId: '$batchId', studentId: '$studentId',
      day: { $dateToString: { date: '$date', format: '%Y-%m-%d', timezone: 'Asia/Kolkata' } } }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }, { $limit: 101 },
  ]).option({ maxTimeMS: 120000, allowDiskUse: true });
  const missingKeys = await Attendance.countDocuments({ attendanceDay: { $exists: false } });
  const wrongKeys = await Attendance.countDocuments({ attendanceDay: { $exists: true }, $expr: {
    $ne: ['$attendanceDay', { $dateToString: { date: '$date', format: '%Y-%m-%d', timezone: 'Asia/Kolkata' } }],
  } });
  return { ready: !duplicates.length && !wrongKeys, invalidDates, missingKeys, wrongKeys, duplicates };
}

/** Explicit operator migration only, with all native/MCP attendance writers paused.
 * Stop on duplicates. Never delete, merge or modify historical attendance dates. */
export async function prepareAttendanceMigration(operationId: string) {
  const report = await inspectAttendanceMigration();
  if (!report.ready) throw new Error('attendance_history_requires_review');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Attendance.collection.updateMany({ attendanceDay: { $exists: false } }, [{ $set: {
        attendanceDay: { $dateToString: { date: '$date', format: '%Y-%m-%d', timezone: 'Asia/Kolkata' } },
      } }], { session });
      await Audit.create([{ requestId: operationId, tool: 'operator_attendance_prepare', outcome: 'allowed',
        reason: 'explicit_ist_key_backfill' }], { session });
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  } finally { await session.endSession(); }
  // If interrupted here, repeat the same operation while writers stay paused.
  // MongoDB also rejects any duplicates introduced after the preview.
  await Attendance.collection.createIndex({ tenantId: 1, batchId: 1, studentId: 1, attendanceDay: 1 },
    { name: 'attendance_day_unique', unique: true, partialFilterExpression: { attendanceDay: { $type: 'string' } } });
  return { prepared: true, backfilled: report.missingKeys };
}
