/**
 * CRM slice 3: option lists, qualification gate, nurture reactivation, demo attendance.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
jest.mock('../../services/settingsService', () => ({
  getStr: (_k: string, f = '') => f, getNum: (_k: string, f: number) => f, setMany: jest.fn(),
}));
jest.mock('../../services/googleSheetSyncService', () => ({ pushLeadStageChange: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../services/whatsAppDripService', () => ({ scheduleDripOnStageEntry: jest.fn().mockResolvedValue(undefined) }));

import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import LeadPicklist from '../../models/LeadPicklist';
import LeadStageHistory from '../../models/LeadStageHistory';
import QualificationQuestionConfig from '../../models/QualificationQuestionConfig';
import { getList, validCallOutcomeCodes } from '../../services/leadPicklistService';
import { changeStage, LifecycleError } from '../../services/leadLifecycleService';
import { recordMeetingOutcome } from '../../services/leadDemoService';

const T = new mongoose.Types.ObjectId();
const OTHER = new mongoose.Types.ObjectId();
const ADMIN = { id: String(new mongoose.Types.ObjectId()), role: 'TENANT_ADMIN' };

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });
beforeEach(async () => { await clearCollections(); });

const stage = (name: string, milestone: string, order: number) =>
  LeadStage.create({ tenantId: T, name, order, color: '#000000', milestone, isActive: true } as any);
const lead = (stageId: any, extra: any = {}) =>
  Lead.create({ tenantId: T, name: 'Asha', phone: '9000000000', stageId, createdBy: ADMIN.id, courseInterest: [], ...extra } as any);

describe('option lists', () => {
  it('seeds defaults once, keeps the institute’s edits, and validates per institute', async () => {
    const first = await getList(String(T), 'call_outcome');
    expect(first.find((o: any) => o.code === 'connected')).toBeTruthy();
    await LeadPicklist.create({ tenantId: T, list: 'call_outcome', code: 'asked_whatsapp', label: 'Asked to WhatsApp', order: 99 });
    await LeadPicklist.deleteOne({ tenantId: T, list: 'call_outcome', code: 'callback_requested' }); // a deleted built-in comes back (system), nothing else re-seeds
    const again = await getList(String(T), 'call_outcome');
    expect(again.some((o: any) => o.code === 'asked_whatsapp')).toBe(true);
    expect(again.some((o: any) => o.code === 'callback_requested')).toBe(true);

    expect((await validCallOutcomeCodes(String(T))).has('asked_whatsapp')).toBe(true);
    expect((await validCallOutcomeCodes(String(OTHER))).has('asked_whatsapp')).toBe(false);
    expect((await validCallOutcomeCodes(String(OTHER))).has('busy')).toBe(true);
  });
});

describe('qualification gate', () => {
  it('blocks the first move into a qualified stage until required answers exist, and keeps the evidence', async () => {
    const fresh = await stage('New', 'new', 0);
    const qualified = await stage('Qualified', 'qualified', 1);
    await QualificationQuestionConfig.create({
      tenantId: T, isActive: true,
      questions: [
        { id: 'q1', question: 'Graduation year?', category: 'education', answerType: 'number', order: 0, required: false, enabled: true, requiredForQualified: true },
        { id: 'q2', question: 'Laptop?', category: 'technical', answerType: 'boolean', order: 1, required: false, enabled: true },
      ],
    } as any);
    const l: any = await lead(fresh._id);
    const e = await changeStage({ tenantId: String(T), leadId: String(l._id), stageId: String(qualified._id), actor: ADMIN, source: 'manual' }).catch(x => x);
    expect(e).toBeInstanceOf(LifecycleError);
    expect(e.code).toBe('QUALIFICATION_REQUIRED');
    expect(e.message).toContain('Graduation year?');

    await Lead.updateOne({ _id: l._id }, { $set: { 'qualificationAnswers.q1': { questionId: 'q1', answer: 2024 } } });
    const r = await changeStage({ tenantId: String(T), leadId: String(l._id), stageId: String(qualified._id), actor: ADMIN, source: 'manual' });
    expect(r.status).toBe('moved');
    const row: any = await LeadStageHistory.findOne({ leadId: l._id, stageName: 'Qualified' }).lean();
    expect(row.qualificationEvidence).toEqual([{ questionId: 'q1', question: 'Graduation year?', answer: 2024 }]);
  });

  it('does not block a bulk move (moving old leads by hand)', async () => {
    const fresh = await stage('New', 'new', 0);
    const qualified = await stage('Qualified', 'qualified', 1);
    await QualificationQuestionConfig.create({ tenantId: T, isActive: true, questions: [{ id: 'q1', question: 'Year?', category: 'education', answerType: 'number', order: 0, required: false, enabled: true, requiredForQualified: true }] } as any);
    const l: any = await lead(fresh._id);
    const r = await changeStage({ tenantId: String(T), leadId: String(l._id), stageId: String(qualified._id), actor: ADMIN, source: 'bulk' });
    expect(r.status).toBe('moved');
  });
});

describe('nurture', () => {
  it('remembers the reactivation date and clears it when the lead moves on', async () => {
    const fresh = await stage('New', 'new', 0);
    const nurture = await stage('Nurture', 'nurture', 1);
    const l: any = await lead(fresh._id);
    const when = new Date(Date.now() + 30 * 86_400_000);
    await changeStage({ tenantId: String(T), leadId: String(l._id), stageId: String(nurture._id), nextFollowUp: when, actor: ADMIN, source: 'manual' });
    expect(new Date((await Lead.findById(l._id).lean() as any).nurture.reactivateAt).getTime()).toBe(when.getTime());
    await changeStage({ tenantId: String(T), leadId: String(l._id), stageId: String(fresh._id), actor: ADMIN, source: 'manual' });
    expect((await Lead.findById(l._id).lean() as any).nurture?.reactivateAt).toBeUndefined();
  });
});

describe('demo attendance', () => {
  it('attended stamps demoAttendedAt once and logs the timeline; other institutes are untouched', async () => {
    const fresh = await stage('New', 'new', 0);
    const l: any = await lead(fresh._id);
    const meeting: any = { _id: new mongoose.Types.ObjectId(), leadId: l._id, type: 'online_demo', status: 'completed', scheduledAt: new Date(), feedback: 'Liked the projects' };
    await recordMeetingOutcome(String(T), meeting, { status: 'scheduled', scheduledAt: meeting.scheduledAt }, ADMIN.id);
    const first: any = await Lead.findById(l._id).lean();
    expect(first.milestones.demoAttendedAt).toBeTruthy();
    expect(first.activities.some((a: any) => a.type === 'meeting' && /Demo attended\. Feedback: Liked the projects/.test(a.description))).toBe(true);

    await recordMeetingOutcome(String(T), { ...meeting, _id: new mongoose.Types.ObjectId() }, { status: 'scheduled', scheduledAt: meeting.scheduledAt }, ADMIN.id);
    const second: any = await Lead.findById(l._id).lean();
    expect(new Date(second.milestones.demoAttendedAt).getTime()).toBe(new Date(first.milestones.demoAttendedAt).getTime());

    await recordMeetingOutcome(String(OTHER), meeting, { status: 'scheduled', scheduledAt: meeting.scheduledAt }, ADMIN.id);
    expect((await Lead.findById(l._id).lean() as any).activities.length).toBe(second.activities.length);
  });
});
