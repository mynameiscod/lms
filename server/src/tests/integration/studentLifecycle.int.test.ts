/**
 * Student lifecycle (2026-11-26): Course completed status + history, the 365-day access window with
 * admin extensions, and closing a batch (report, complete / move students, hidden from lists).
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import User from '../../models/User';
import Batch from '../../models/Batch';
import * as life from '../../services/studentLifecycleService';
import * as rules from '../../services/studentRulesService';
import { BatchService } from '../../services/batchService';
const batchService = new BatchService();

jest.setTimeout(240_000);
const tid = String(new mongoose.Types.ObjectId());
const admin = String(new mongoose.Types.ObjectId());
const DAY = 86_400_000;

let batchId = '';
let nextBatchId = '';
const mk = async (email: string, extra: any = {}) =>
  String((await User.create({ tenantId: tid, email, password: 'x'.repeat(12), firstName: email.split('@')[0], lastName: 'S', role: 'STUDENT', batchId, batchJoinedDate: new Date(), isActive: true, ...extra } as any))._id);
const fresh = (id: string) => User.findById(id).lean<any>();

describe('Student lifecycle', () => {
  beforeAll(async () => {
    await startMongo();
    const now = Date.now();
    batchId = String((await Batch.create({ tenantId: tid, name: 'Java Jan', startDate: new Date(now - 200 * DAY), endDate: new Date(now - 5 * DAY), isActive: true } as any))._id);
    nextBatchId = String((await Batch.create({ tenantId: tid, name: 'Java Dec', startDate: new Date(now), endDate: new Date(now + 120 * DAY), isActive: true } as any))._id);
    await rules.getRules(tid, true);
  });
  afterAll(stopMongo);

  it('course completed keeps login, records a history, and needs a reason', async () => {
    const s = await mk('done@x.test');
    await expect(life.setStatus(tid, s, { status: 'completed' }, admin)).rejects.toThrow(/reason/);
    await life.setStatus(tid, s, { status: 'completed', reason: 'Course finished', note: 'All modules done' }, admin);
    let u = await fresh(s);
    expect(u.studentStatus).toBe('completed');
    expect(u.isActive).toBe(true);
    await life.setStatus(tid, s, { status: 'discontinued', reason: 'Got a job' }, admin);
    u = await fresh(s);
    expect(u.isActive).toBe(false);
    expect(u.studentStatusHistory.map((h: any) => h.status)).toEqual(['completed', 'discontinued']);
    expect(u.studentStatusHistory[0].note).toBe('All modules done');
  });

  it('several students at once', async () => {
    const a = await mk('bulk1@x.test');
    const b = await mk('bulk2@x.test');
    expect((await life.setStatusMany(tid, [a, b], { status: 'completed', reason: 'Course finished' }, admin)).updated).toBe(2);
    expect((await fresh(b)).studentStatus).toBe('completed');
  });

  it('access: 365 days from the FIRST join, extendable to an exact date, ends login after', async () => {
    const joined = new Date(Date.now() - 400 * DAY);
    const s = await mk('old@x.test', { batchJoinedDate: joined });
    let a = await life.accessEnded(await fresh(s));
    expect(a.ended).toBe(true);
    expect(life.accessEndedMessage(a.until!)).toMatch(/access ended on/);

    await expect(life.setAccess(tid, s, '2099-01-31', '', admin)).rejects.toThrow(/why/);
    await life.setAccess(tid, s, new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10), 'Placement still in progress', admin);
    let u = await fresh(s);
    expect((await life.accessEnded(u)).ended).toBe(false);
    expect(u.accessHistory).toHaveLength(1);
    expect(new Date(u.lmsJoinedAt).getTime()).toBe(joined.getTime()); // first join pinned

    // Back to the default window → ended again.
    await life.setAccess(tid, s, null, 'Extension withdrawn', admin);
    u = await fresh(s);
    expect(u.accessUntil).toBeUndefined();
    expect((await life.accessEnded(u)).ended).toBe(true);

    // A recent student is fine; a student with no batch (CareerPilot-only) is never limited.
    expect((await life.accessEnded(await fresh(await mk('new@x.test')))).ended).toBe(false);
    expect((await life.accessEnded(await fresh(await mk('cp@x.test', { batchId: undefined, batchJoinedDate: joined })))).ended).toBe(false);
  });

  it('a batch move keeps the access window counting from the first join', async () => {
    const joined = new Date(Date.now() - 100 * DAY);
    const s = await mk('mover@x.test', { batchJoinedDate: joined });
    const preview = await life.closePreview(tid, batchId);
    const actions: Record<string, 'move' | 'keep'> = {};
    for (const st of preview.students) actions[st.id] = st.id === s ? 'move' : 'keep';
    // (closing happens in the next test; here just check pinning on move)
    await life.pinJoinDates({ _id: s });
    await User.updateOne({ _id: s }, { $set: { batchId: nextBatchId, batchJoinedDate: new Date() } });
    const u = await fresh(s);
    expect(new Date(life.accessStartOf(u)!).getTime()).toBe(joined.getTime());
    await User.updateOne({ _id: s }, { $set: { batchId } }); // put back for the close test
  });

  it('closing a batch: report, complete / move students, then hidden from lists; reopen brings it back', async () => {
    const stay = await mk('stay@x.test');
    const finish = await mk('finish@x.test');
    const move = await mk('move@x.test');
    await User.updateOne({ _id: finish }, { $set: { placement: { status: 'placed' } } });

    const before = await life.closePreview(tid, batchId);
    expect(before.moveTargets.map((t) => t.name)).toEqual(['Java Dec']);
    await expect(life.closeBatch(tid, batchId, { actions: { [move]: 'move' } }, admin)).rejects.toThrow(/batch to move/);

    const r = await life.closeBatch(tid, batchId, {
      closedOn: new Date().toISOString().slice(0, 10), notes: 'Good batch', discountedCount: 3,
      actions: { [stay]: 'keep', [finish]: 'complete', [move]: 'move' }, moveTo: nextBatchId,
    }, admin);
    expect(r.moved).toBe(1);
    expect(r.completed).toBe(1);
    expect(r.closeReport.counts.moved).toBe(1);
    expect(r.closeReport.counts.placed).toBeGreaterThanOrEqual(1);
    expect(r.closeReport.discountedCount).toBe(3);

    expect((await fresh(finish)).studentStatus).toBe('completed');
    expect(String((await fresh(move)).batchId)).toBe(nextBatchId);
    expect(String((await fresh(stay)).batchId)).toBe(batchId);

    const open = await batchService.getBatchesByTenant(tid);
    expect(open.map((b: any) => b.name)).toEqual(['Java Dec']);
    const closed = await life.closedBatches(tid);
    expect(closed[0].closeReport.notes).toBe('Good batch');
    await expect(life.closeBatch(tid, batchId, {}, admin)).rejects.toThrow(/already closed/);

    await life.reopenBatch(tid, batchId);
    expect((await batchService.getBatchesByTenant(tid)).length).toBe(2);
  });

  it('access reminder: off by default; lists students ending within the window', async () => {
    const s = await mk('ending@x.test', { batchJoinedDate: new Date(Date.now() - 355 * DAY), phone: '9000000099' });
    const plan = await life.accessReminderPlan(tid);
    expect(plan.rules.reminderEnabled).toBe(false);
    expect(plan.due.map((d) => d.id)).toContain(s);
    expect(await life.runAccessReminders(tid)).toEqual({ sent: 0, failed: 0, skipped: 0 });
  });
});
