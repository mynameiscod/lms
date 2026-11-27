import mongoose, { ClientSession } from 'mongoose';
import { createHash, randomUUID } from 'crypto';
import Attendance from '../models/Attendance';
import User from '../models/User';
import Batch from '../models/Batch';
import Audit from '../models/McpAuditEvent';
import { McpIdentity } from './identity';
import { McpError } from './oauthPolicy';

export const attendanceId = { type: 'string', pattern: '^[a-fA-F0-9]{24}$' };
const times = { type: 'string', pattern: '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' };
export const attendanceFields = {
  status: { type: 'string', enum: ['present', 'absent', 'leave'] }, inTime: times, outTime: times,
};
export const attendanceInput = {
  batchId: attendanceId, date: { type: 'string', pattern: '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' },
  records: { type: 'array', minItems: 1, maxItems: 50, items: {
    type: 'object', additionalProperties: false, required: ['studentId', 'status'],
    properties: { studentId: attendanceId, ...attendanceFields },
  } },
};

/** Both legacy UTC midnight and IST midnight map to the same IST calendar day. */
export function attendanceDate(day: string) {
  const utc = new Date(day + 'T00:00:00.000Z');
  if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== day) throw new McpError('invalid_attendance_date');
  const start = new Date(utc.getTime() - 19800000);
  const today = new Date(Date.now() + 19800000).toISOString().slice(0, 10);
  if (day > today) throw new McpError('future_attendance_date');
  return { start, end: new Date(start.getTime() + 86400000) };
}
export function validAttendanceTimes(record: any) {
  return !(record.outTime && (!record.inTime || record.outTime <= record.inTime)) &&
    !(record.status !== 'present' && (record.inTime || record.outTime));
}
export const attendanceRevision = (row: any) => createHash('sha256').update(JSON.stringify([
  String(row._id), String(row.tenantId), String(row.studentId), String(row.batchId), row.date,
  row.status, row.inTime, row.outTime, String(row.markedBy), row.remarks, row.updatedAt, row.__v,
])).digest('hex');
const publicRow = (row: any) => ({ recordId: String(row._id), studentId: String(row.studentId),
  batchId: String(row.batchId), date: row.date, status: row.status, inTime: row.inTime,
  outTime: row.outTime, revision: attendanceRevision(row) });
const change = (row: any) => ({ status: row.status, inTime: row.inTime, outTime: row.outTime, revision: attendanceRevision(row) });

export async function assertAttendanceWriteReady() {
  const indexes = await Attendance.collection.indexes();
  if (!indexes.some(i => i.name === 'attendance_day_unique' && i.unique === true &&
      JSON.stringify(i.key) === JSON.stringify({ tenantId: 1, batchId: 1, studentId: 1, attendanceDay: 1 }) &&
      JSON.stringify(i.partialFilterExpression) === JSON.stringify({ attendanceDay: { $type: 'string' } }))) {
    throw new McpError('attendance_migration_required', 503);
  }
  if (await Attendance.exists({ attendanceDay: { $exists: false } })) throw new McpError('attendance_migration_required', 503);
}

async function permittedBatch(identity: McpIdentity, batchId: any, session?: ClientSession) {
  const user = identity.user;
  const filter: any = { _id: batchId, tenantId: user.tenantId, isActive: true };
  if (!['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role)) filter.instructors = user._id;
  return Batch.findOne(filter).select('_id').session(session || null).lean();
}
async function inspect(identity: McpIdentity, batchId: string, day: string, records: any[], session?: ClientSession) {
  const { start, end } = attendanceDate(day);
  const batch = await permittedBatch(identity, batchId, session);
  const seen = new Set<string>();
  const results: any[] = [];
  for (const record of records) {
    const studentId = record.studentId.toLowerCase();
    let reason: string | undefined;
    if (!batch) reason = 'permission_denied';
    else if (seen.has(studentId)) reason = 'duplicate_input';
    else if (!validAttendanceTimes(record)) reason = 'invalid_times';
    else if (!await User.exists({ _id: studentId, tenantId: identity.user.tenantId,
      batchId, role: 'STUDENT', isActive: true }).session(session || null)) reason = 'student_not_in_batch';
    seen.add(studentId);
    if (reason) { results.push({ studentId, outcome: reason === 'permission_denied' ? 'permission_denied' : 'validation_failed', reason }); continue; }
    const existing = await Attendance.find({ tenantId: identity.user.tenantId, studentId, batchId,
      $or: [{ attendanceDay: day }, { date: { $gte: start, $lt: end } }] })
      .limit(2).session(session || null).lean();
    const equal = existing.length === 1 && ['status', 'inTime', 'outTime'].every(k => ((existing[0] as any)[k] || undefined) === (record[k] || undefined));
    results.push({ studentId, outcome: !existing.length ? 'valid' : equal ? 'already_exists' : 'conflict',
      ...(existing.length ? { existing: existing.map(publicRow) } : {}) });
  }
  return results;
}

export async function executeAttendance(name: string, identity: McpIdentity, args: any,
  auditContext: { clientId?: string; requestId?: string } = {}) {
  const update = name === 'codebegun_update_attendance';
  const dryRun = name === 'codebegun_validate_attendance' || args.dryRun === true;
  const records = args.records || [{ studentId: args.studentId, status: args.status, inTime: args.inTime, outTime: args.outTime }];
  if (dryRun) return { dryRun: true, results: await inspect(identity, args.batchId, args.date, records) };
  await assertAttendanceWriteReady();
  // Retry whole transactions on transient errors; unique-key races need a fresh
  // snapshot to classify the winning create as already_exists or conflict.
  for (let attempt = 0; attempt < 4; attempt++) {
    const session = await mongoose.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => {
        const changes: any[] = [];
        if (update) {
          const row = await Attendance.findOne({ _id: args.recordId, tenantId: identity.user.tenantId }).session(session).lean();
          if (!row || !await permittedBatch(identity, row.batchId, session)) throw new McpError('permission_denied', 403);
          if (!await User.exists({ _id: row.studentId, batchId: row.batchId, tenantId: identity.user.tenantId,
            role: 'STUDENT', isActive: true }).session(session)) throw new McpError('student_not_in_batch');
          if (attendanceRevision(row) !== args.expectedRevision) throw new McpError('stale_attendance');
          if (!validAttendanceTimes(args)) throw new McpError('invalid_times');
          const saved = await Attendance.findOneAndUpdate({ _id: row._id, tenantId: identity.user.tenantId },
            { $set: { status: args.status, inTime: args.inTime || '', outTime: args.outTime || '', markedBy: identity.user._id },
              $inc: { __v: 1 } }, { session, new: true, runValidators: true }).lean();
          changes.push({ recordId: row._id, before: change(row), after: change(saved) });
          result = { outcome: 'updated', record: publicRow(saved) };
        } else {
          const results = await inspect(identity, args.batchId, args.date, records, session);
          for (let i = 0; i < results.length; i++) {
            if (results[i].outcome !== 'valid') continue;
            const [saved] = await Attendance.create([{ ...records[i], batchId: args.batchId,
              tenantId: identity.user.tenantId, markedBy: identity.user._id,
              // Calendar dates retain the legacy UTC-midnight representation so the
              // native LMS date filters continue to find MCP-created rows.
              date: new Date(args.date + 'T00:00:00.000Z'), attendanceDay: args.date }], { session });
            const row = saved.toObject();
            changes.push({ recordId: saved._id, after: change(row) });
            results[i] = { studentId: records[i].studentId, outcome: 'created', record: publicRow(row) };
          }
          result = { dryRun: false, results };
        }
        // No notification service is called, including for historical absent/leave imports.
        await Audit.create([{ userId: identity.user._id, tenantId: identity.user.tenantId,
          clientId: auditContext.clientId, requestId: auditContext.requestId || randomUUID(),
          tool: name, outcome: 'allowed', reason: 'attendance_transaction', attendanceChanges: changes }], { session });
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 10000 });
      return result;
    } catch (error: any) {
      if (error.code !== 11000 || attempt === 3) throw error;
    } finally { await session.endSession(); }
  }
}
