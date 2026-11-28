import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Attendance from '../models/Attendance';
import Batch from '../models/Batch';
import User from '../models/User';
import Audit from '../models/McpAuditEvent';
import { canUseTool, executeTool, tools, validateArguments } from '../mcp/tools';
import { attendanceDate } from '../mcp/attendance';
import { inspectAttendanceMigration, prepareAttendanceMigration } from '../mcp/attendanceMigration';
import { readConsentOffer } from '../mcp/oauthConsent';
import { EmailService } from '../services/emailService';

let mongo: MongoMemoryReplSet;
const oid = () => new mongoose.Types.ObjectId();
const tenantId = oid(), actorId = oid(), batchId = oid(), studentId = oid(), otherStudent = oid();
let identity: any;
const scopes = ['mcp_connect', 'mcp_attendance_read', 'mcp_attendance_write'];
const input = () => ({ batchId: String(batchId), date: '2026-10-08', studentId: String(studentId), status: 'present', inTime: '09:00', outTime: '17:00' });
const candidate = (suffix: string) => tools.find(t => t.name === 'codebegun_' + suffix)!;
const call = (suffix: string, args: any, who = identity, tokenScopes = scopes) => executeTool(candidate(suffix), who, tokenScopes, args, { clientId: 'synthetic-client', requestId: 'synthetic-request' });
const validationInput = () => { const { studentId: id, status, inTime, outTime, ...header } = input(); return { ...header, records: [{ studentId: id, status, inTime, outTime }] }; };

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.24' } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([Attendance.createCollection(), Audit.createCollection()]);
  await Attendance.createIndexes();
}, 120000);
afterAll(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([Attendance, Audit, Batch, User].map(m => m.collection.deleteMany({})));
  identity = { user: { _id: actorId, tenantId, role: 'TENANT_ADMIN' }, tenant: {}, modules: { attendance: true },
    permissions: [...scopes, 'mark_attendance', 'view_attendance'] };
  await Batch.collection.insertOne({ _id: batchId, tenantId, isActive: true, instructors: [actorId] });
  await User.collection.insertMany([{ _id: studentId, email: 'student@synthetic.invalid', tenantId, batchId, role: 'STUDENT', isActive: true },
    { _id: otherStudent, email: 'other@synthetic.invalid', tenantId, batchId, role: 'STUDENT', isActive: true }]);
});

test('individual historical creation, read-back, durable audit and exact retry', async () => {
  const email = jest.spyOn(EmailService.prototype, 'sendAttendanceNotificationEmail');
  const result: any = await call('mark_attendance', input());
  expect(result.results[0].outcome).toBe('created');
  const row = await Attendance.findOne().lean();
  expect(row.attendanceDay).toBe('2026-10-08');
  expect(row.date.toISOString()).toBe('2026-10-08T00:00:00.000Z');
  expect(String(row.markedBy)).toBe(String(actorId));
  const audit = await Audit.findOne({ reason: 'attendance_transaction' }).lean();
  expect(audit.clientId).toBe('synthetic-client');
  expect(audit.attendanceChanges[0].recordId).toEqual(row._id);
  expect((await call('mark_attendance', input()) as any).results[0].outcome).toBe('already_exists');
  expect((await call('mark_attendance', { ...input(), status: 'absent', inTime: undefined, outTime: undefined }).catch(e => e.code))).toBe('invalid_arguments');
  const { inTime, outTime, ...absent } = input();
  expect((await call('mark_attendance', { ...absent, status: 'absent' }) as any).results[0].outcome).toBe('conflict');
  expect(await Attendance.countDocuments()).toBe(1);
  expect(email).not.toHaveBeenCalled();
});

test('bulk dry run, duplicate input, conflicts and partial validation results', async () => {
  const args = validationInput();
  args.records.push({ ...args.records[0], studentId: String(otherStudent) }, args.records[0]);
  const dry: any = await call('bulk_mark_attendance', { ...args, dryRun: true });
  expect(dry.results.map(r => r.outcome)).toEqual(['valid', 'valid', 'validation_failed']);
  expect(await Attendance.countDocuments()).toBe(0);
  const saved: any = await call('bulk_mark_attendance', args);
  expect(saved.results.map(r => r.outcome)).toEqual(['created', 'created', 'validation_failed']);
  expect((await call('bulk_mark_attendance', args) as any).results.map(r => r.outcome)).toEqual(['already_exists', 'already_exists', 'validation_failed']);
  expect(await Attendance.countDocuments()).toBe(2);
});

test('concurrent identical and conflicting creates never duplicate', async () => {
  const attempts: any[] = await Promise.all(Array.from({ length: 6 }, () => call('mark_attendance', input())));
  expect(attempts.filter(r => r.results[0].outcome === 'created')).toHaveLength(1);
  expect(attempts.filter(r => r.results[0].outcome === 'already_exists')).toHaveLength(5);
  expect(await Attendance.countDocuments()).toBe(1);
  await Attendance.deleteMany({});
  const competing: any[] = await Promise.all([call('mark_attendance', input()), call('mark_attendance', { ...input(), inTime: '10:00' })]);
  expect(competing.map(r => r.results[0].outcome).sort()).toEqual(['conflict', 'created']);
});

test('explicit update checks revisions, tenant, batch and clears omitted times', async () => {
  const result: any = await call('mark_attendance', input());
  const row = result.results[0].record;
  const args = { recordId: row.recordId, expectedRevision: row.revision, status: 'leave' };
  const updated: any = await call('update_attendance', args);
  expect(updated.outcome).toBe('updated');
  expect(updated.record.inTime).toBe('');
  await expect(call('update_attendance', args)).rejects.toThrow('stale_attendance');
  await expect(call('update_attendance', { ...args, recordId: String(oid()) })).rejects.toThrow('permission_denied');
  await expect(call('update_attendance', { ...args, expectedRevision: updated.record.revision },
    { ...identity, user: { ...identity.user, tenantId: oid() } })).rejects.toThrow('permission_denied');
  const audit = await Audit.findOne({ tool: 'codebegun_update_attendance' }).lean();
  expect(audit.attendanceChanges[0].before.status).toBe('present');
  expect(audit.attendanceChanges[0].after.status).toBe('leave');
});

test('audit failure rolls back individual, bulk and update writes', async () => {
  await call('mark_attendance', input());
  await Attendance.deleteMany({});
  jest.spyOn(Audit, 'create').mockRejectedValue(new Error('audit unavailable'));
  await expect(call('mark_attendance', input())).rejects.toThrow('audit unavailable');
  expect(await Attendance.countDocuments()).toBe(0);
  await expect(call('bulk_mark_attendance', validationInput())).rejects.toThrow('audit unavailable');
  expect(await Attendance.countDocuments()).toBe(0);
  jest.restoreAllMocks();
  const created: any = await call('mark_attendance', input());
  jest.spyOn(Audit, 'create').mockRejectedValue(new Error('audit unavailable'));
  await expect(call('update_attendance', { recordId: created.results[0].record.recordId,
    expectedRevision: created.results[0].record.revision, status: 'leave' })).rejects.toThrow('audit unavailable');
  expect((await Attendance.findOne().lean()).status).toBe('present');
});

test.each(['absent', 'leave'])('historical %s creates never call notification service', async status => {
  const email = jest.spyOn(EmailService.prototype, 'sendAttendanceNotificationEmail');
  const { inTime, outTime, ...args } = input();
  expect((await call('mark_attendance', { ...args, status }) as any).results[0].outcome).toBe('created');
  expect(email).not.toHaveBeenCalled();
});

test.each([
  { date: '2026-02-30' }, { date: '2099-01-01' }, { inTime: '25:00' }, { outTime: '08:00' },
  { outTime: '09:00' }, { status: 'unknown' }, { tenantId: String(tenantId) }, { markedBy: String(actorId) },
  { studentId: 'bad' }, { batchId: 'bad' }, { inTime: null },
])('rejects invalid input or reports invalid times %j', async override => {
  try {
    const result: any = await call('mark_attendance', { ...input(), ...override });
    expect(result.results[0].outcome).toBe('validation_failed');
  } catch (e: any) { expect(['invalid_arguments', 'invalid_attendance_date', 'future_attendance_date']).toContain(e.code); }
  expect(await Attendance.countDocuments()).toBe(0);
});

test('invalid membership, foreign students/batches and assigned batch restrictions', async () => {
  expect((await call('mark_attendance', { ...input(), studentId: String(oid()) }) as any).results[0].reason).toBe('student_not_in_batch');
  await User.updateOne({ _id: studentId }, { $set: { batchId: oid() } });
  expect((await call('mark_attendance', input()) as any).results[0].reason).toBe('student_not_in_batch');
  expect((await call('mark_attendance', { ...input(), batchId: String(oid()) }) as any).results[0].outcome).toBe('permission_denied');
  const staff = { ...identity, user: { ...identity.user, role: 'STAFF', _id: oid() } };
  expect((await call('mark_attendance', input(), staff) as any).results[0].outcome).toBe('permission_denied');
  await User.updateOne({ _id: studentId }, { $set: { batchId, tenantId: oid() } });
  expect((await call('mark_attendance', input()) as any).results[0].reason).toBe('student_not_in_batch');
  expect(await Attendance.countDocuments()).toBe(0);
});

test('students, read tokens, missing explicit/native permissions and disabled module deny writes', async () => {
  for (const who of [{ ...identity, user: { ...identity.user, role: 'STUDENT' } },
    { ...identity, permissions: scopes }, { ...identity, permissions: ['mcp_connect', 'mark_attendance'] },
    { ...identity, modules: { attendance: false } }]) {
    await expect(call('mark_attendance', input(), who)).rejects.toThrow('permission_denied');
  }
  await expect(call('mark_attendance', input(), identity, ['mcp_connect', 'mcp_attendance_read'])).rejects.toThrow('permission_denied');
});

test('read validation supplies revisions, uses no writes and bulk sizes/nested fields are bounded', async () => {
  await call('mark_attendance', input());
  const result: any = await call('validate_attendance', validationInput(), identity, ['mcp_connect', 'mcp_attendance_read']);
  expect(result.results[0].existing[0].revision).toMatch(/^[a-f0-9]{64}$/);
  expect(await Audit.countDocuments()).toBe(1);
  for (const records of [[], Array(51).fill(validationInput().records[0]), [{ ...validationInput().records[0], tenantId }]]) {
    expect(() => validateArguments(candidate('validate_attendance'), { ...validationInput(), records })).toThrow('invalid_arguments');
  }
  expect(() => validateArguments(candidate('bulk_mark_attendance'), { ...validationInput(), dryRun: 'true' })).toThrow('invalid_arguments');
});

test('IST boundaries include legacy UTC/IST dates; ambiguous historical duplicates block creation', async () => {
  expect(attendanceDate('2026-10-08').start.toISOString()).toBe('2026-10-07T18:30:00.000Z');
  await Attendance.collection.insertOne({ tenantId, studentId, batchId, date: new Date('2026-10-07T18:30:00Z'), status: 'present' });
  expect((await call('validate_attendance', validationInput()) as any).results[0].outcome).toBe('conflict');
  await expect(call('mark_attendance', input())).rejects.toThrow('attendance_migration_required');
  await Attendance.collection.insertOne({ tenantId, studentId, batchId, date: new Date('2026-10-08T00:00:00Z'), status: 'present' });
  expect((await inspectAttendanceMigration()).duplicates).toHaveLength(1);
  await expect(prepareAttendanceMigration('synthetic-migration')).rejects.toThrow('attendance_history_requires_review');
  expect(await Attendance.countDocuments()).toBe(2);
});

test('safe key backfill is repeatable and native document/leave upserts participate in uniqueness', async () => {
  await Attendance.collection.insertOne({ tenantId, studentId, batchId, date: new Date('2026-10-08T00:00:00Z'), status: 'present' });
  await prepareAttendanceMigration('synthetic-migration');
  await prepareAttendanceMigration('synthetic-migration');
  expect((await Attendance.findOne().lean()).attendanceDay).toBe('2026-10-08');
  await expect(Attendance.create({ tenantId, studentId, batchId, date: new Date('2026-10-07T18:30:00Z'), status: 'present', markedBy: actorId })).rejects.toMatchObject({ code: 11000 });
  await Attendance.findOneAndUpdate({ tenantId, studentId: otherStudent, batchId, date: new Date('2026-10-08') },
    { $set: { status: 'leave', markedBy: actorId }, $setOnInsert: { date: new Date('2026-10-08') } }, { upsert: true });
  expect((await Attendance.findOne({ studentId: otherStudent }).lean()).attendanceDay).toBe('2026-10-08');
});

test('write scope is excluded from read-only expansion consent', () => {
  const client: any = { scopes: [...scopes, 'offline_access'] };
  const offered = readConsentOffer(identity, client, ['mcp_connect']);
  expect(offered).toContain('mcp_attendance_read');
  expect(offered).not.toContain('mcp_attendance_write');
  expect(canUseTool(identity, scopes, candidate('update_attendance'))).toBe(true);
});


test.each(['UTC', 'Asia/Kolkata', 'America/Los_Angeles'])('attendance dates do not depend on server timezone %s', async timezone => {
  const old = process.env.TZ;
  try {
    process.env.TZ = timezone;
    const created: any = await call('mark_attendance', input());
    expect(created.results[0].record.date.toISOString()).toBe('2026-10-08T00:00:00.000Z');
    expect((await call('validate_attendance', validationInput()) as any).results[0].outcome).toBe('already_exists');
  } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; }
});

test('competing explicit corrections allow one revision winner and audit only that change', async () => {
  const created: any = await call('mark_attendance', input());
  const row = created.results[0].record;
  const args = { recordId: row.recordId, expectedRevision: row.revision };
  const results = await Promise.allSettled([
    call('update_attendance', { ...args, status: 'leave' }),
    call('update_attendance', { ...args, status: 'absent' }),
  ]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  const failure: any = results.find(r => r.status === 'rejected');
  expect(failure.reason.code).toBe('stale_attendance');
  expect(await Audit.countDocuments({ tool: 'codebegun_update_attendance' })).toBe(1);
  const current: any = (await call('validate_attendance', validationInput()) as any).results[0].existing[0];
  await expect(call('update_attendance', { recordId: row.recordId, expectedRevision: current.revision, status: 'present' },
    { ...identity, user: { ...identity.user, role: 'STAFF', _id: oid() } })).rejects.toThrow('permission_denied');
});
