/**
 * leadLifecycleService.changeStage — the one way a lead changes stage. Real database; the
 * Google Sheet push and WhatsApp drip side effects are stood in for.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

jest.mock('../../services/settingsService', () => ({
  getStr: (_k: string, fallback = '') => fallback,
  getNum: (_k: string, fallback: number) => fallback,
  setMany: jest.fn(),
}));
const sheetPush = jest.fn().mockResolvedValue(undefined);
const drip = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/googleSheetSyncService', () => ({ pushLeadStageChange: (...a: any[]) => sheetPush(...a) }));
jest.mock('../../services/whatsAppDripService', () => ({ scheduleDripOnStageEntry: (...a: any[]) => drip(...a) }));

import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import LeadSubStage from '../../models/LeadSubStage';
import LeadReason from '../../models/LeadReason';
import LeadStageHistory from '../../models/LeadStageHistory';
import FollowUpReminder from '../../models/FollowUpReminder';
import { changeStage, LifecycleError, milestoneStamps } from '../../services/leadLifecycleService';

const T = new mongoose.Types.ObjectId();
const OTHER = new mongoose.Types.ObjectId();
const ADMIN = { id: String(new mongoose.Types.ObjectId()), role: 'TENANT_ADMIN' };
const STAFF = { id: String(new mongoose.Types.ObjectId()), role: 'STAFF' };

let fresh: any, contacting: any, qualified: any, lost: any, enrolled: any;
let noAnswer: any, notInterested: any, feeHigh: any, other: any;

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });
beforeEach(async () => {
  await clearCollections();
  sheetPush.mockClear(); drip.mockClear();
  const mk = (name: string, order: number, extra: any = {}) =>
    LeadStage.create({ tenantId: T, name, order, color: '#000000', isActive: true, ...extra } as any);
  fresh = await mk('New Lead', 0, { milestone: 'new', isDefault: true });
  contacting = await mk('Contacting', 1, { milestone: 'contacting' });
  qualified = await mk('Qualified', 2, { milestone: 'qualified' });
  enrolled = await mk('Enrolled', 3, { milestone: 'enrolled', isFinal: true });
  lost = await mk('Lost', 4, { milestone: 'lost', isLostStage: true, category: 'lost' });
  noAnswer = await LeadSubStage.create({ tenantId: T, stageId: contacting._id, name: 'No answer', requiresFollowUp: true });
  notInterested = await LeadSubStage.create({ tenantId: T, stageId: lost._id, name: 'Not interested', requiresReason: true });
  feeHigh = await LeadReason.create({ tenantId: T, stageId: lost._id, subStageId: notInterested._id, name: 'Fee too high' });
  other = await LeadReason.create({ tenantId: T, stageId: lost._id, subStageId: notInterested._id, name: 'Other', requiresDetail: true });
});

const newLead = () => Lead.create({ tenantId: T, name: 'Ravi', phone: '9876543210', stageId: fresh._id, createdBy: ADMIN.id, courseInterest: [] } as any);
const move = (lead: any, over: any) => changeStage({ tenantId: String(T), leadId: String(lead._id), actor: ADMIN, source: 'manual', ...over });
const expectError = async (p: Promise<any>, code?: string) => {
  const e = await p.then(() => null, (err) => err);
  expect(e).toBeInstanceOf(LifecycleError);
  if (code) expect(e.code).toBe(code);
  return e;
};
const future = () => new Date(Date.now() + 86_400_000).toISOString();

describe('validation', () => {
  it('requires a sub-stage when the stage has them (single manual move), not for bulk', async () => {
    const lead = await newLead();
    await expectError(move(lead, { stageId: String(contacting._id) }), 'SUB_STAGE_REQUIRED');
    const r = await move(lead, { stageId: String(contacting._id), source: 'bulk' });
    expect(r.status).toBe('moved');
  });

  it('requires the follow-up a sub-stage asks for, and creates the follow-up task', async () => {
    const lead = await newLead();
    await expectError(move(lead, { stageId: String(contacting._id), subStageId: String(noAnswer._id) }), 'FOLLOW_UP_REQUIRED');
    const when = future();
    await move(lead, { stageId: String(contacting._id), subStageId: String(noAnswer._id), nextFollowUp: when });
    const saved: any = await Lead.findById(lead._id).lean();
    expect(String(saved.subStageId)).toBe(String(noAnswer._id));
    expect(new Date(saved.nextFollowUp).toISOString()).toBe(when);
    expect(await FollowUpReminder.countDocuments({ leadId: lead._id, tenantId: T })).toBe(1);
  });

  it('requires a reason from the sub-stage list, and details for an "Other" reason', async () => {
    const lead = await newLead();
    await expectError(move(lead, { stageId: String(lost._id), subStageId: String(notInterested._id) }), 'REASON_REQUIRED');
    await expectError(move(lead, { stageId: String(lost._id), subStageId: String(notInterested._id), reasonId: String(other._id) }), 'DETAIL_REQUIRED');
    const r = await move(lead, { stageId: String(lost._id), subStageId: String(notInterested._id), reasonId: String(other._id), reasonDetail: 'Moved city' });
    expect(r.status).toBe('moved');
  });

  it('rejects a sub-stage of another stage, a reason of another sub-stage, and another institute’s stage', async () => {
    const lead = await newLead();
    await expectError(move(lead, { stageId: String(qualified._id), subStageId: String(noAnswer._id) }));
    await expectError(move(lead, { stageId: String(contacting._id), subStageId: String(noAnswer._id), reasonId: String(feeHigh._id), nextFollowUp: future() }));
    const foreign = await LeadStage.create({ tenantId: OTHER, name: 'Theirs', order: 0, color: '#000000' } as any);
    const e = await expectError(move(lead, { stageId: String(foreign._id) }));
    expect(e.status).toBe(404);
  });

  it('keeps the legacy rule: "Not Interested" needs a typed reason', async () => {
    const ni = await LeadStage.create({ tenantId: T, name: 'Not Interested', order: 9, color: '#000000' } as any);
    const lead = await newLead();
    await expectError(move(lead, { stageId: String(ni._id) }), 'REASON_REQUIRED');
    await move(lead, { stageId: String(ni._id), reasonText: 'Too far' });
    expect((await Lead.findById(lead._id).lean() as any).notInterestedReason).toBe('Too far');
  });
});

describe('approval, history, milestones', () => {
  it('a counsellor moving to a lost stage waits for approval with the full request kept', async () => {
    const lead = await newLead();
    const r = await changeStage({ tenantId: String(T), leadId: String(lead._id), actor: STAFF, source: 'manual',
      stageId: String(lost._id), subStageId: String(notInterested._id), reasonId: String(feeHigh._id), note: 'Asked twice' });
    expect(r.status).toBe('pending_approval');
    const saved: any = await Lead.findById(lead._id).lean();
    expect(String(saved.stageId)).toBe(String(fresh._id));
    expect(saved.pendingApproval).toMatchObject({ stageName: 'Lost', note: 'Asked twice' });
    expect(String(saved.pendingApproval.reasonId)).toBe(String(feeHigh._id));

    // the approval applies it, without asking again
    const a = await changeStage({ tenantId: String(T), leadId: String(lead._id), actor: ADMIN, source: 'approval',
      stageId: String(lost._id), subStageId: String(notInterested._id), reasonId: String(feeHigh._id), note: 'Asked twice' });
    expect(a.status).toBe('moved');
    const after: any = await Lead.findById(lead._id).lean();
    expect(after.pendingApproval?.stageId).toBeUndefined();
    expect(after.lostReason).toBe('Fee too high');
  });

  it('writes one history row per stage change with the detail, and runs side effects', async () => {
    const lead = await newLead();
    await move(lead, { stageId: String(lost._id), subStageId: String(notInterested._id), reasonId: String(feeHigh._id), note: 'n' });
    const rows: any[] = await LeadStageHistory.find({ leadId: lead._id }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ stageName: 'Lost', subStageName: 'Not interested', reasonName: 'Fee too high', note: 'n', source: 'manual' });
    expect(String(rows[0].fromStageId)).toBe(String(fresh._id));
    expect(sheetPush).toHaveBeenCalledTimes(1);
    expect(drip).toHaveBeenCalledWith(String(T), String(lead._id), 'Lost');
    const acts: any[] = (await Lead.findById(lead._id).lean() as any).activities;
    expect(acts.some(a => a.type === 'status_change' && a.description.startsWith('Stage changed from "New Lead" to "Lost"'))).toBe(true);
    expect(acts.some(a => a.type === 'note' && a.description === 'n')).toBe(true);
  });

  it('stamps milestones once; jumping ahead stamps the implied steps; reopening does not restamp', async () => {
    const lead = await newLead();
    await move(lead, { stageId: String(qualified._id) });
    let m: any = (await Lead.findById(lead._id).lean() as any).milestones;
    expect(m.contactingAt && m.connectedAt && m.qualifiedAt).toBeTruthy();
    expect(m.enrolledAt).toBeUndefined();
    const firstQualified = new Date(m.qualifiedAt).getTime();

    await move(lead, { stageId: String(lost._id), subStageId: String(notInterested._id), reasonId: String(feeHigh._id) });
    await move(lead, { stageId: String(qualified._id), source: 'reopen' });
    m = (await Lead.findById(lead._id).lean() as any).milestones;
    expect(new Date(m.qualifiedAt).getTime()).toBe(firstQualified);
    expect(m.lostAt).toBeTruthy();
    const reopened: any = await Lead.findById(lead._id).lean();
    expect(reopened.lostAt).toBeUndefined(); // no longer reads as lost
  });

  it('changing only the sub-stage records an activity but no new history row', async () => {
    const lead = await newLead();
    await move(lead, { stageId: String(contacting._id), source: 'bulk' });
    const busy = await LeadSubStage.create({ tenantId: T, stageId: contacting._id, name: 'Busy' });
    await move(lead, { stageId: String(contacting._id), subStageId: String(busy._id) });
    expect(await LeadStageHistory.countDocuments({ leadId: lead._id })).toBe(1);
    const acts: any[] = (await Lead.findById(lead._id).lean() as any).activities;
    expect(acts.some(a => a.description.startsWith('Sub-stage set in "Contacting"'))).toBe(true);
  });

  it('respects the lead scope passed in (a counsellor cannot move someone else’s lead)', async () => {
    const lead = await newLead();
    const e = await expectError(changeStage({ tenantId: String(T), leadId: String(lead._id), actor: STAFF, source: 'manual',
      stageId: String(qualified._id), scope: { assignedTo: new mongoose.Types.ObjectId() } }));
    expect(e.status).toBe(404);
  });
});

describe('milestoneStamps', () => {
  it('never overwrites an existing stamp', () => {
    const at = new Date();
    const set = milestoneStamps({ contactingAt: new Date(0) }, 'connected', at);
    expect(set).toEqual({ 'milestones.connectedAt': at });
  });
  it('nurture and lost stamp only themselves', () => {
    const at = new Date();
    expect(Object.keys(milestoneStamps({}, 'lost', at))).toEqual(['milestones.lostAt']);
    expect(Object.keys(milestoneStamps({}, 'nurture', at))).toEqual(['milestones.nurtureAt']);
    expect(milestoneStamps({}, 'new', at)).toEqual({});
  });
});

describe('old, unrelated bad data on a lead', () => {
  it('does not block a move (broken legacy meeting activity + an out-of-range enum)', async () => {
    const lead: any = await newLead();
    // What the old createMeeting bug stored, plus a value an import once wrote.
    await Lead.collection.updateOne({ _id: lead._id }, {
      $push: { activities: { type: 'meeting', note: 'demo', performedBy: ADMIN.id, createdAt: new Date() } } as any,
      $set: { priority: 'HOT' },
    });
    const r = await move(lead, { stageId: String(lost._id), subStageId: String(notInterested._id), reasonId: String(feeHigh._id), source: 'bulk', note: 'cleanup' });
    expect(r.status).toBe('moved');
    const saved: any = await Lead.findById(lead._id).lean();
    expect(String(saved.stageId)).toBe(String(lost._id));
    expect(String(saved.reasonId)).toBe(String(feeHigh._id));
    expect(saved.milestones.lostAt).toBeTruthy();
    expect(saved.activities.some((a: any) => a.type === 'status_change' && a.description.startsWith('Stage changed from "New Lead" to "Lost"'))).toBe(true);
    expect(saved.activities.some((a: any) => a.type === 'note' && a.description === 'cleanup')).toBe(true);
    expect(saved.activities.some((a: any) => a.note === 'demo')).toBe(true); // the old entry is left as it was
    expect(await LeadStageHistory.countDocuments({ leadId: lead._id })).toBe(1);
  });

  it('trims over-long text instead of failing the move', async () => {
    const lead: any = await newLead();
    await move(lead, { stageId: String(qualified._id), reasonText: 'r', reasonDetail: 'x'.repeat(5000) });
    const saved: any = await Lead.findById(lead._id).lean();
    expect(String(saved.stageId)).toBe(String(qualified._id));
    expect(saved.reasonDetail.length).toBe(1000);
  });
});

describe('a sub-stage that requires a reason but has none listed', () => {
  it('accepts a typed reason instead of blocking', async () => {
    const placements = await LeadSubStage.create({ tenantId: T, stageId: qualified._id, name: 'Looking for Placements', requiresReason: true });
    const lead: any = await newLead();
    const e = await move(lead, { stageId: String(qualified._id), subStageId: String(placements._id), source: 'bulk' }).catch((x: any) => x);
    expect(e).toBeInstanceOf(LifecycleError);
    expect(e.message).toBe('Type a reason for "Looking for Placements"');
    const r = await move(lead, { stageId: String(qualified._id), subStageId: String(placements._id), source: 'bulk', reasonText: 'Placement-only programme' });
    expect(r.status).toBe('moved');
    expect((await Lead.findById(lead._id).lean() as any).notInterestedReason).toBe('Placement-only programme');
  });

  it('still insists on the list once reasons exist', async () => {
    const lead: any = await newLead();
    const e = await move(lead, { stageId: String(lost._id), subStageId: String(notInterested._id), reasonText: 'typed' }).catch((x: any) => x);
    expect(e.code).toBe('REASON_REQUIRED');
    expect(e.message).toBe('Pick a reason for "Not interested"');
  });
});
