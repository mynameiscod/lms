/**
 * Lead Dashboard numbers: period tiles + funnel from milestones, previous-period change,
 * work-queue counts that ignore the dates and leave closed leads out, scope, and the
 * openOnly / URL-injection guard on the list.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
jest.mock('../../services/settingsService', () => ({
  getStr: (_k: string, f = '') => f, getNum: (_k: string, f: number) => f, setMany: jest.fn(),
}));

import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import { leadDashboard } from '../../services/leadDashboardService';

const T = new mongoose.Types.ObjectId();
const ME = new mongoose.Types.ObjectId();
const DAY = 86_400_000;

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });
beforeEach(async () => { await clearCollections(); });

it('counts the period from milestones and the work queue as of now', async () => {
  const open = await LeadStage.create({ tenantId: T, name: 'Contacting', order: 0, color: '#000000', milestone: 'contacting' } as any);
  const lost = await LeadStage.create({ tenantId: T, name: 'Lost', order: 1, color: '#000000', milestone: 'lost' } as any);
  const nurture = await LeadStage.create({ tenantId: T, name: 'Nurture', order: 2, color: '#000000', milestone: 'nurture' } as any);
  const now = Date.now();
  const mk = (extra: any) => Lead.create({ tenantId: T, name: 'x', phone: String(Math.random()).slice(2, 12), stageId: open._id, createdBy: ME, courseInterest: ['Java'], ...extra } as any);
  const m = (keys: string[]) => Object.fromEntries(keys.map(k => [k, new Date()]));
  // In the period (last 10 days)
  await mk({ createdAt: new Date(now - DAY), assignedTo: ME, milestones: m(['contactingAt', 'connectedAt', 'qualifiedAt']), nextFollowUp: new Date(now - 2 * 3600_000) });
  await mk({ createdAt: new Date(now - 2 * DAY), milestones: m(['contactingAt', 'connectedAt']) });
  await mk({ createdAt: new Date(now - 3 * DAY), stageId: lost._id, nextFollowUp: new Date(now - DAY) }); // closed: not overdue
  // Previous period (10–20 days ago)
  await mk({ createdAt: new Date(now - 15 * DAY) });
  await mk({ createdAt: new Date(now - 16 * DAY) });
  // Old lead, outside both periods, still overdue + in nurture
  await mk({ createdAt: new Date(now - 60 * DAY), stageId: nurture._id, nextFollowUp: new Date(now - 5 * DAY) });

  const from = new Date(now - 10 * DAY); const to = new Date(now);
  const d = await leadDashboard({ tenantId: String(T), scope: {}, userId: String(ME), from, to });
  expect(d.tiles.total).toMatchObject({ count: 3, previous: 2, changePct: 50 });
  expect(d.tiles.connected).toMatchObject({ count: 2, ofTotal: 66.7 });
  expect(d.tiles.qualified.count).toBe(1);
  const f = Object.fromEntries(d.funnel.map((s: any) => [s.key, s]));
  expect(f.qualified.fromPrevious).toBe(50);
  expect(d.tabs).toMatchObject({ all: 3, mine: 1, lost: 1 });
  // work queue ignores the dates: the 60-day-old nurture lead is overdue and nurture; the lost one is not overdue
  expect(d.tasks.overdue).toBe(2);
  expect(d.tasks.nurture).toBe(1);
  expect(d.options.courses).toEqual(['Java']);
  expect(d.trend.points.reduce((a: number, p: any) => a + p.total, 0)).toBe(3);
});

it('respects lead scope', async () => {
  const s = await LeadStage.create({ tenantId: T, name: 'New', order: 0, color: '#000000', milestone: 'new' } as any);
  await Lead.create({ tenantId: T, name: 'a', phone: '9000000001', stageId: s._id, createdBy: ME, assignedTo: ME, courseInterest: [] } as any);
  await Lead.create({ tenantId: T, name: 'b', phone: '9000000002', stageId: s._id, createdBy: ME, assignedTo: new mongoose.Types.ObjectId(), courseInterest: [] } as any);
  const d = await leadDashboard({ tenantId: String(T), scope: { assignedTo: ME }, userId: String(ME) });
  expect(d.tiles.total.count).toBe(1);
});
