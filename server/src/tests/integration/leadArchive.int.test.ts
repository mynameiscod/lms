/**
 * Leads → Archive: filter, preview, archive in the background, restore, revive on a new enquiry,
 * and the permanent delete three years after archiving. Real database.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import LeadArchiveRun from '../../models/LeadArchiveRun';
import FollowUpReminder from '../../models/FollowUpReminder';
import OutperoCall from '../../models/OutperoCall';
import WhatsAppThread from '../../models/WhatsAppThread';
import User from '../../models/User';
import * as svc from '../../services/leadArchiveService';

const T = new mongoose.Types.ObjectId();
let admin: any; let lost: any; let fresh: any;
const DAY = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * DAY);

const mk = (o: any = {}) => Lead.create({
  tenantId: T, name: o.name || 'Lead', phone: o.phone || `98${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`,
  source: o.source || 'meta_form', stageId: o.stageId || lost._id, createdBy: admin._id, courseInterest: [], ...o,
});
const waitRun = async (id: unknown) => {
  for (let i = 0; i < 200; i++) {
    const r: any = await LeadArchiveRun.findById(id).lean();
    if (r && r.status !== 'running') return r;
    await new Promise((r2) => setTimeout(r2, 50));
  }
  throw new Error('run did not finish');
};

beforeAll(startMongo);
afterAll(stopMongo);
beforeEach(async () => {
  await clearCollections();
  admin = await User.create({ tenantId: T, firstName: 'Ad', lastName: 'Min', email: 'admin@x.com', password: 'x', role: 'TENANT_ADMIN' } as any);
  lost = await LeadStage.create({ tenantId: T, name: 'Lost', order: 9, createdBy: admin._id } as any);
  fresh = await LeadStage.create({ tenantId: T, name: 'New Lead', order: 1, createdBy: admin._id } as any);
});

describe('filters and protection', () => {
  it('refuses a run with no filter at all', async () => {
    await expect(svc.previewArchive(String(T), {})).rejects.toThrow(/at least one filter/);
  });

  it('previews what will be archived and what is protected', async () => {
    await mk({ name: 'old lost', createdAt: ago(400) });
    await mk({ name: 'old lost 2', createdAt: ago(300) });
    await mk({ name: 'converted', convertedStudentId: new mongoose.Types.ObjectId(), createdAt: ago(400) });
    await mk({ name: 'paid', paymentStatus: 'deposit_paid', createdAt: ago(400) });
    await mk({ name: 'follow-up booked', nextFollowUp: new Date(Date.now() + DAY), createdAt: ago(400) });
    await mk({ name: 'touched last week', telecallerMetrics: { lastActionAt: ago(3) } as any, createdAt: ago(400) });
    await mk({ name: 'in an AI call', outpero: { status: 'pending' } as any, createdAt: ago(400) });
    const withReminder = await mk({ name: 'demo reminder', createdAt: ago(400) });
    await FollowUpReminder.create({ tenantId: T, leadId: withReminder._id, scheduledAt: new Date(Date.now() + 2 * DAY), type: 'demo', title: 'Demo', assignedTo: admin._id, createdBy: admin._id, status: 'scheduled' } as any);
    await mk({ name: 'new stage', stageId: fresh._id, createdAt: ago(400) });

    // "touched last week" is not inactive for 180 days, so the filter itself leaves it out.
    const p = await svc.previewArchive(String(T), { stageIds: [String(lost._id)], inactiveDays: 180 });
    expect(p.matched).toBe(7);
    expect(p.willArchive).toBe(2);
    expect(p.protected).toBe(5);
    // Without the inactivity filter, recently touched leads are still protected.
    const q = await svc.previewArchive(String(T), { stageIds: [String(lost._id)] });
    expect(q.matched).toBe(8);
    expect(q.willArchive).toBe(2);
    expect(p.sample.map((l: any) => l.name).sort()).toEqual(['old lost', 'old lost 2']);
  });

  it('archives in the background, out of the working list, and restores the whole run', async () => {
    for (let i = 0; i < 7; i++) await mk({ name: `L${i}`, createdAt: ago(200) });
    const run = await svc.startArchive(String(T), String(admin._id), { stageIds: [String(lost._id)], reason: 'Old lost leads' });
    const done = await waitRun(run._id);
    expect(done).toMatchObject({ status: 'done', processed: 7, kind: 'archive' });
    expect(await Lead.countDocuments({ tenantId: T, archivedAt: null })).toBe(0);
    expect((await Lead.findOne({ name: 'L0' }).lean() as any).archiveReason).toBe('Old lost leads');

    const list = await svc.listArchived(String(T), { search: 'L3' });
    expect(list.rows.map((r: any) => r.name)).toEqual(['L3']);

    const back = await svc.restore(String(T), String(admin._id), { runId: String(run._id) });
    expect(back.restored).toBe(7);
    expect(await Lead.countDocuments({ tenantId: T, archivedAt: null })).toBe(7);
    expect(await LeadArchiveRun.countDocuments({ kind: 'restore', undoesRunId: run._id })).toBe(1);
  });

  it('archives every duplicate but the most recently worked one', async () => {
    await mk({ name: 'older', phone: '+91 98765 43210', createdAt: ago(50), telecallerMetrics: { lastActionAt: ago(40) } as any });
    await mk({ name: 'newest', phone: '9876543210', createdAt: ago(30), telecallerMetrics: { lastActionAt: ago(20) } as any });
    await mk({ name: 'unique', phone: '9123456789' });
    const p = await svc.previewArchive(String(T), { duplicatesOnly: true });
    expect(p.sample.map((l: any) => l.name)).toEqual(['older']);
  });
});

describe('a returning person', () => {
  it('brings the archived lead back with a note', async () => {
    const l = await mk({ archivedAt: ago(10), archiveReason: 'x' });
    expect(await svc.reviveIfArchived(l._id, 'new Meta lead form')).toBe(true);
    const after: any = await Lead.findById(l._id).lean();
    expect(after.archivedAt).toBeNull();
    expect(after.archiveReason).toBeUndefined();
    expect(after.activities.at(-1).description).toMatch(/Restored from archive — new Meta lead form/);
    expect(await svc.reviveIfArchived(l._id, 'again')).toBe(false);
  });
});

describe('permanent delete after three years', () => {
  it('deletes only leads archived 3+ years ago, with what exists only for them', async () => {
    const old = await mk({ name: 'ancient', archivedAt: ago(3 * 366) });
    await mk({ name: 'recent archive', archivedAt: ago(400) });
    await mk({ name: 'active' });
    await FollowUpReminder.create({ tenantId: T, leadId: old._id, scheduledAt: ago(1100), type: 'call', title: 'x', assignedTo: admin._id, createdBy: admin._id, status: 'completed' } as any);
    await OutperoCall.create({ tenantId: T, callId: 'c1', leadId: old._id } as any);
    const thread = await WhatsAppThread.create({ tenantId: T, phone: '919800000000', leadId: old._id } as any).catch(() => null);

    const pre = await svc.previewPurge(String(T));
    expect(pre.count).toBe(1);
    await expect(svc.startPurge(String(T), String(admin._id), 5)).rejects.toThrow(/Type the number/);

    const run = await svc.startPurge(String(T), String(admin._id), 1);
    expect(await waitRun(run._id)).toMatchObject({ status: 'done', processed: 1, kind: 'purge' });
    expect((await Lead.find({ tenantId: T }).lean()).map((l: any) => l.name).sort()).toEqual(['active', 'recent archive']);
    expect(await FollowUpReminder.countDocuments({ leadId: old._id })).toBe(0);
    expect(await OutperoCall.countDocuments({ leadId: old._id })).toBe(0);
    if (thread) expect((await WhatsAppThread.findById(thread._id).lean() as any).leadId).toBeUndefined();
  });
});
