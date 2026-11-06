/**
 * CRM automation: off by default, tasks created once per situation, retry limit stops
 * (never marks lost), demo reminders fire once, nurture reactivation, tenant isolation.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
jest.mock('../../services/settingsService', () => ({
  getStr: (_k: string, f = '') => f, getNum: (_k: string, f: number) => f, setMany: jest.fn(),
}));

import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import FollowUpReminder from '../../models/FollowUpReminder';
import Meeting from '../../models/Meeting';
import LeadAutomationConfig from '../../models/LeadAutomationConfig';
import { ensureDefaults } from '../../services/leadPicklistService';
import { sweepTenant, onCallLogged, mergeRules, onMeetingNoShow } from '../../services/leadAutomationService';

const T = new mongoose.Types.ObjectId();
const OTHER = new mongoose.Types.ObjectId();
const OWNER = new mongoose.Types.ObjectId();
const H = 3600_000;
let open: any, lost: any, seat: any, io: any, emitted: any[];

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });
beforeEach(async () => {
  await clearCollections();
  emitted = [];
  io = { to: () => ({ emit: (_e: string, p: any) => emitted.push(p) }) };
  open = await LeadStage.create({ tenantId: T, name: 'Contacting', order: 0, color: '#000000', milestone: 'contacting' } as any);
  lost = await LeadStage.create({ tenantId: T, name: 'Lost', order: 1, color: '#000000', milestone: 'lost' } as any);
  seat = await LeadStage.create({ tenantId: T, name: 'Seat Reserved', order: 2, color: '#000000', milestone: 'seat_reserved' } as any);
});

const lead = (extra: any = {}) => Lead.create({ tenantId: T, name: 'Ravi', phone: String(Math.random()).slice(2, 12), stageId: open._id, createdBy: OWNER, assignedTo: OWNER, courseInterest: [], ...extra } as any);
const enable = (rules: any) => LeadAutomationConfig.create({ tenantId: T, rules: mergeRules(rules) });

it('does nothing while every rule is off', async () => {
  await lead({ createdAt: new Date(Date.now() - 2 * H) });
  const d = await sweepTenant(String(T), io);
  expect(Object.values(d).every(n => n === 0)).toBe(true);
  expect(await FollowUpReminder.countDocuments({})).toBe(0);
});

it('first-contact SLA creates one task per untouched open lead, once', async () => {
  await enable({ firstContactSla: { enabled: true, minutes: 15 } });
  const late = await lead({ createdAt: new Date(Date.now() - H) });
  await lead({ createdAt: new Date(Date.now() - H), lastContactedAt: new Date() }); // already contacted
  await lead({ createdAt: new Date(Date.now() - H), stageId: lost._id }); // closed
  await lead({ createdAt: new Date(Date.now() - 60_000) }); // too new
  expect((await sweepTenant(String(T), io)).firstContact).toBe(1);
  expect((await sweepTenant(String(T), io)).firstContact).toBe(0);
  const task: any = await FollowUpReminder.findOne({ leadId: late._id }).lean();
  expect(task).toMatchObject({ title: 'First contact overdue', priority: 'urgent' });
  expect((await Lead.findById(late._id).lean() as any).nextFollowUp).toBeTruthy();
});

it('call retry schedules the next try, then stops at the limit with a note — and never closes the lead', async () => {
  await enable({ callRetry: { enabled: true, maxAttempts: 2 } });
  await ensureDefaults(String(T), 'call_outcome'); // not_answered → retry after 3 h
  const l: any = await lead();
  const push = async (outcome: string) => {
    const id = new mongoose.Types.ObjectId();
    await Lead.updateOne({ _id: l._id }, { $push: { activities: { _id: id, type: 'call', description: 'c', createdBy: OWNER, callOutcome: outcome } } });
    await onCallLogged(String(T), l._id, outcome, id);
  };
  await push('not_answered');
  const t1: any = await FollowUpReminder.findOne({ leadId: l._id }).lean();
  expect(t1.title).toMatch(/Call again/);
  expect(new Date(t1.scheduledAt).getTime()).toBeGreaterThan(Date.now() + 2.5 * H);

  await Lead.updateOne({ _id: l._id }, { $unset: { nextFollowUp: 1 } });
  await push('not_answered');
  const after: any = await Lead.findById(l._id).lean();
  expect(after.activities.some((a: any) => /Automatic retries stopped/.test(a.description))).toBe(true);
  expect(String(after.stageId)).toBe(String(open._id));
  expect(await FollowUpReminder.countDocuments({ leadId: l._id })).toBe(1);
});

it('a connected call never schedules a retry', async () => {
  await enable({ callRetry: { enabled: true, maxAttempts: 5 } });
  await ensureDefaults(String(T), 'call_outcome');
  const l: any = await lead();
  await onCallLogged(String(T), l._id, 'connected', new mongoose.Types.ObjectId());
  expect(await FollowUpReminder.countDocuments({})).toBe(0);
});

it('demo reminder fires once; no-show and seat-reserved and nurture create their tasks', async () => {
  await enable({ demoReminder: { enabled: true, hoursBefore: 2 }, noShowFollowUp: { enabled: true, hoursAfter: 24 },
    seatReservedFollowUp: { enabled: true, days: 2 }, nurtureReactivation: { enabled: true } });
  const l: any = await lead();
  const m: any = await Meeting.create({ tenantId: String(T), leadId: l._id, type: 'online_demo', title: 'Demo', scheduledAt: new Date(Date.now() + H), createdBy: String(OWNER) });
  expect((await sweepTenant(String(T), io)).demoReminders).toBe(1);
  expect((await sweepTenant(String(T), io)).demoReminders).toBe(0);
  expect(emitted.some(p => /Demo soon/.test(p.title))).toBe(true);

  await onMeetingNoShow(String(T), m);
  await onMeetingNoShow(String(T), m);
  expect(await FollowUpReminder.countDocuments({ automationKey: `noshow:${m._id}` })).toBe(1);

  await lead({ stageId: seat._id, stageEnteredAt: new Date(Date.now() - 3 * 24 * H) });
  await lead({ 'nurture.reactivateAt': new Date(Date.now() - H) } as any);
  const d = await sweepTenant(String(T), io);
  expect(d.seatReserved).toBe(1);
  expect(d.nurture).toBe(1);
});

it('another institute’s settings never touch this institute', async () => {
  await LeadAutomationConfig.create({ tenantId: OTHER, rules: mergeRules({ firstContactSla: { enabled: true, minutes: 5 } }) });
  await lead({ createdAt: new Date(Date.now() - H) });
  expect((await sweepTenant(String(T), io)).firstContact).toBe(0);
});

it('mergeRules clamps numbers and ignores unknown keys', () => {
  const r: any = mergeRules({ firstContactSla: { enabled: true, minutes: 1 }, bogus: { enabled: true }, callRetry: { maxAttempts: 999 } });
  expect(r.firstContactSla).toEqual({ enabled: true, minutes: 5 });
  expect(r.callRetry.maxAttempts).toBe(20);
  expect(r.bogus).toBeUndefined();
});
