/**
 * Admissions report: cohort funnel from first-reach milestones, step and overall rates,
 * counsellor rows, cost per lead from synced spend, open-lead aging.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
jest.mock('../../services/settingsService', () => ({
  getStr: (_k: string, f = '') => f, getNum: (_k: string, f: number) => f, getCredential: () => '', setMany: jest.fn(),
}));

import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import AdSpendDaily from '../../models/AdSpendDaily';
import { admissionsReport } from '../../services/admissionsReportService';

const T = new mongoose.Types.ObjectId();
const U = new mongoose.Types.ObjectId();

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });
beforeEach(async () => { await clearCollections(); });

it('builds the funnel from milestones, with clear denominators and cost per lead', async () => {
  const open = await LeadStage.create({ tenantId: T, name: 'Contacting', order: 0, color: '#000000', milestone: 'contacting' } as any);
  const lost = await LeadStage.create({ tenantId: T, name: 'Lost', order: 1, color: '#000000', milestone: 'lost' } as any);
  const now = new Date();
  const ms = (keys: string[]) => Object.fromEntries(keys.map(k => [k, now]));
  const mk = (milestones: any, extra: any = {}) => Lead.create({
    tenantId: T, name: 'x', phone: String(Math.random()).slice(2, 12), stageId: open._id, createdBy: U, courseInterest: [],
    milestones, sourceDetails: { campaignName: 'Java Oct', metaCampaignId: 'c1' }, ...extra,
  } as any);
  await mk({});
  await mk(ms(['contactingAt']));
  await mk(ms(['contactingAt', 'connectedAt', 'qualifiedAt']));
  await mk(ms(['contactingAt', 'connectedAt', 'qualifiedAt', 'enrolledAt']), { stageId: open._id });
  await mk(ms(['contactingAt', 'lostAt']), { stageId: lost._id });
  // The IST calendar day (spend days are IST).
  const istToday = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  await AdSpendDaily.create({ tenantId: T, day: istToday, date: now, campaignId: 'c1', campaignName: 'Java Oct', adId: 'a1', spend: 1000, impressions: 1, clicks: 1, currency: 'INR' } as any).catch(() => {});

  const r = await admissionsReport({ tenantId: String(T), from: new Date(Date.now() - 86_400_000), to: new Date(Date.now() + 60_000), scope: {} });
  const f = Object.fromEntries(r.funnel.map((s: any) => [s.key, s]));
  expect(r.cohort).toBe(5);
  expect(f.contacting.count).toBe(4);
  expect(f.contacting.fromPrevious).toBe(80);
  expect(f.qualified.count).toBe(2);
  expect(f.qualified.fromPrevious).toBe(100); // 2 of 2 connected
  expect(f.enrolled.ofCohort).toBe(20);
  expect(r.lost).toBe(1);
  expect(r.counsellors[0]).toMatchObject({ name: 'Unassigned', leads: 5, enrolled: 1 });
  expect(r.cost.hasSpend).toBe(true);
  expect(r.cost.spend).toBe(1000);
  expect(r.cost.costPerLead).toBe(200);
  expect(r.cost.costPerEnrolment).toBe(1000);
  expect(r.open.total).toBe(4); // the lost lead is closed
});

it('compares with the previous period, buckets leads per day and filters by course', async () => {
  const s = await LeadStage.create({ tenantId: T, name: 'New', order: 0, color: '#000000', milestone: 'new' } as any);
  const day = 86_400_000; const now = Date.now();
  const mk = (createdAt: Date, extra: any = {}) => Lead.create({ tenantId: T, name: 'x', phone: String(Math.random()).slice(2, 12), stageId: s._id, createdBy: U, courseInterest: ['Java Full Stack'], createdAt, ...extra } as any);
  // this period (last 10 days): 4 leads, 2 qualified, 1 enrolled; first contact 2 h and 4 h
  await mk(new Date(now - 1 * day), { milestones: { qualifiedAt: new Date(), enrolledAt: new Date() }, telecallerMetrics: { firstActionAt: new Date(now - 1 * day + 2 * 3600_000) } });
  await mk(new Date(now - 2 * day), { milestones: { qualifiedAt: new Date() }, telecallerMetrics: { firstActionAt: new Date(now - 2 * day + 4 * 3600_000) } });
  await mk(new Date(now - 2 * day));
  await mk(new Date(now - 3 * day), { courseInterest: ['Python'] });
  // previous period (10–20 days ago): 2 leads, 1 qualified; first contact 8 h
  await mk(new Date(now - 12 * day), { milestones: { qualifiedAt: new Date() }, telecallerMetrics: { firstActionAt: new Date(now - 12 * day + 8 * 3600_000) } });
  await mk(new Date(now - 13 * day));

  const r: any = await admissionsReport({ tenantId: String(T), from: new Date(now - 10 * day), to: new Date(now), scope: {} });
  expect(r.comparison.previous).toMatchObject({ total: 2, qualified: 1, enrolled: 0 });
  expect(r.comparison.totalChangePct).toBe(100);
  expect(r.comparison.qualifiedChangePct).toBe(100);
  expect(r.comparison.enrolledChangePct).toBeNull(); // nothing to compare with
  expect(r.comparison.conversionChangePp).toBe(25); // 25% now vs 0% before
  expect(r.comparison.firstContactChangePct).toBe(-50); // 4 h median now vs 8 h → faster
  expect(r.trend.unit).toBe('day');
  expect(r.trend.points.reduce((a: number, p: any) => a + p.count, 0)).toBe(4);

  const java: any = await admissionsReport({ tenantId: String(T), from: new Date(now - 10 * day), to: new Date(now), scope: {}, course: 'java' });
  expect(java.cohort).toBe(3);
});
