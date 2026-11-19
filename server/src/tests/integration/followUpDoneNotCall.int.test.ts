/**
 * "Mark this follow-up done" (2026-11-19) logged a call on the lead, so the call count went up for a
 * call nobody made. A completion is a call only when call details come with it.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import Lead from '../../models/Lead';
import FollowUpReminder from '../../models/FollowUpReminder';
import { completeFollowUp } from '../../controllers/followUpController';

jest.setTimeout(240_000);
const tid = new mongoose.Types.ObjectId();
const uid = new mongoose.Types.ObjectId();

const call = async (id: string, body: any) => {
  const res: any = { statusCode: 200, body: null, status(c: number) { this.statusCode = c; return this; }, json(b: any) { this.body = b; return this; } };
  await completeFollowUp({ tenantId: String(tid), userId: String(uid), params: { id }, body } as any, res);
  return res;
};

async function leadWithCallFollowUp(phone: string) {
  const lead: any = await new Lead({ tenantId: tid, name: 'Vishnu', phone, source: 'walkin', stageId: new mongoose.Types.ObjectId(), createdBy: uid } as any).save();
  const fu: any = await FollowUpReminder.create({ tenantId: tid, leadId: lead._id, assignedTo: uid, createdBy: uid, type: 'call', title: 'Follow-up with Vishnu', scheduledAt: new Date() } as any);
  return { lead, fu };
}

describe('completing a follow-up', () => {
  beforeAll(startMongo);
  afterAll(stopMongo);

  it('"mark done" without call details is a note, not a call', async () => {
    const { lead, fu } = await leadWithCallFollowUp('9000000101');
    const res = await call(String(fu._id), { outcome: 'done' });
    expect(res.statusCode).toBe(200);
    const after: any = await Lead.findById(lead._id).lean();
    expect(after.activities.filter((a: any) => a.type === 'call')).toHaveLength(0);
    const last = after.activities[after.activities.length - 1];
    expect(last.type).toBe('note');
    expect(last.description).toContain('Follow-up done');
    expect(after.lastContactedAt).toBeUndefined();
    expect((await FollowUpReminder.findById(fu._id).lean() as any).status).toBe('completed');
  });

  it('a completion that carries the call itself is still a call', async () => {
    const { lead, fu } = await leadWithCallFollowUp('9000000102');
    await call(String(fu._id), { outcome: 'connected', callDuration: 95 });
    const after: any = await Lead.findById(lead._id).lean();
    expect(after.activities.filter((a: any) => a.type === 'call')).toHaveLength(1);
    expect(after.lastContactedAt).toBeTruthy();
  });
});
