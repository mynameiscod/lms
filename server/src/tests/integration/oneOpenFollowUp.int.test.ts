/**
 * One open follow-up per lead (2026-11-24). Scheduling a follow-up used to add a task next to the old
 * ones, so "Mark this follow-up done" still left "2 more follow-ups scheduled". A new follow-up now
 * replaces the open ones, and marking one done closes them all.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import Lead from '../../models/Lead';
import FollowUpReminder from '../../models/FollowUpReminder';
import { completeFollowUp, createFollowUp, quickSchedule } from '../../controllers/followUpController';

jest.setTimeout(240_000);
const tid = new mongoose.Types.ObjectId();
const uid = new mongoose.Types.ObjectId();
const H = 3600_000;

const run = async (fn: any, req: any) => {
  const res: any = { statusCode: 200, body: null, status(c: number) { this.statusCode = c; return this; }, json(b: any) { this.body = b; return this; } };
  await fn({ tenantId: String(tid), userId: String(uid), params: {}, body: {}, ...req } as any, res);
  return res;
};
const newLead = (phone: string) => new Lead({ tenantId: tid, name: 'Kavya', phone, source: 'walkin', stageId: new mongoose.Types.ObjectId(), createdBy: uid, assignedTo: uid } as any).save();
const schedule = (leadId: any, at: Date) => run(createFollowUp, { body: { leadId: String(leadId), type: 'call', title: 'Follow up', scheduledAt: at.toISOString() } });
const open = (leadId: any) => FollowUpReminder.find({ leadId, status: { $in: ['scheduled', 'pending', 'rescheduled'] } }).lean();

describe('one open follow-up per lead', () => {
  beforeAll(startMongo);
  afterAll(stopMongo);

  it('a new follow-up replaces the older open ones and becomes the lead\'s next follow-up', async () => {
    const lead: any = await newLead('9000000201');
    await schedule(lead._id, new Date(Date.now() - 26 * H)); // an overdue one from yesterday
    await schedule(lead._id, new Date(Date.now() + 2 * H));
    const later = new Date(Date.now() + 26 * H);
    const res = await schedule(lead._id, later);
    expect(res.statusCode).toBe(201);
    const left: any[] = await open(lead._id);
    expect(left).toHaveLength(1);
    expect(new Date(left[0].scheduledAt).getTime()).toBe(later.getTime());
    const replaced: any[] = await FollowUpReminder.find({ leadId: lead._id, status: 'cancelled' }).lean();
    expect(replaced).toHaveLength(2);
    expect(replaced[0].notes).toContain('Replaced');
    expect(new Date((await Lead.findById(lead._id).lean() as any).nextFollowUp).getTime()).toBe(later.getTime());
  });

  it('quick schedule replaces too', async () => {
    const lead: any = await newLead('9000000202');
    await schedule(lead._id, new Date(Date.now() + 5 * H));
    await run(quickSchedule, { body: { leadId: String(lead._id), quickType: 'call_in_1_hour' } });
    expect(await open(lead._id)).toHaveLength(1);
  });

  it('marking done closes every open follow-up and clears the next follow-up', async () => {
    const lead: any = await newLead('9000000203');
    // Older duplicates already in the database (made before this fix).
    const a: any = await FollowUpReminder.create({ tenantId: tid, leadId: lead._id, assignedTo: uid, createdBy: uid, type: 'call', title: 'Old 1', scheduledAt: new Date(Date.now() - 48 * H) } as any);
    await FollowUpReminder.create({ tenantId: tid, leadId: lead._id, assignedTo: uid, createdBy: uid, type: 'call', title: 'Old 2', scheduledAt: new Date(Date.now() - 24 * H) } as any);
    await FollowUpReminder.create({ tenantId: tid, leadId: lead._id, assignedTo: uid, createdBy: uid, type: 'call', title: 'Old 3', scheduledAt: new Date(Date.now() + 24 * H) } as any);
    await Lead.updateOne({ _id: lead._id }, { $set: { nextFollowUp: a.scheduledAt } });

    const res = await run(completeFollowUp, { params: { id: String(a._id) }, body: { outcome: 'done' } });
    expect(res.statusCode).toBe(200);
    expect(await open(lead._id)).toHaveLength(0);
    expect(await FollowUpReminder.countDocuments({ leadId: lead._id, status: 'completed' })).toBe(1); // only the one marked done counts as done work
    expect((await Lead.findById(lead._id).lean() as any).nextFollowUp).toBeFalsy();
  });

  it('another lead\'s follow-ups are left alone', async () => {
    const one: any = await newLead('9000000204');
    const two: any = await newLead('9000000205');
    await schedule(two._id, new Date(Date.now() + 3 * H));
    await schedule(one._id, new Date(Date.now() + 4 * H));
    expect(await open(two._id)).toHaveLength(1);
  });
});
