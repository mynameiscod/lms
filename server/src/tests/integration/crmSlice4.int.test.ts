/**
 * CRM slice 4: list filters + sort, milestone summary, follow-up queue, scope.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
jest.mock('../../services/settingsService', () => ({
  getStr: (_k: string, f = '') => f, getNum: (_k: string, f: number) => f, setMany: jest.fn(),
}));

import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import User from '../../models/User';
import { getLeads, getMilestoneSummary, getFollowUpQueue } from '../../controllers/leadController';

const T = new mongoose.Types.ObjectId();
let admin: any, staff: any, other: any;

async function call(fn: any, user: any, query: any = {}) {
  let status = 200; let body: any;
  const res: any = { status(s: number) { status = s; return res; }, json(b: any) { body = b; return res; } };
  await fn({ query, params: {}, tenantId: String(T), user: { id: String(user._id), role: user.role }, app: { get: () => null } }, res);
  return { status, body };
}

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });
let fresh: any, qualified: any, lost: any;
beforeEach(async () => {
  await clearCollections();
  const mkUser = (email: string, role: string) => User.collection.insertOne({ tenantId: T, email, role, firstName: email, lastName: 'x', isActive: true }).then(r => ({ _id: r.insertedId, role }));
  admin = await mkUser('a@x.in', 'TENANT_ADMIN');
  staff = await mkUser('s@x.in', 'STAFF');
  other = await mkUser('o@x.in', 'STAFF');
  const mk = (name: string, order: number, extra: any) => LeadStage.create({ tenantId: T, name, order, color: '#000000', isActive: true, ...extra } as any);
  fresh = await mk('New', 0, { milestone: 'new', isDefault: true });
  qualified = await mk('Qualified', 1, { milestone: 'qualified' });
  lost = await mk('Not Interested', 2, { category: 'lost', isLostStage: true }); // legacy stage: milestone guessed
  const day = 86_400_000; const now = Date.now();
  const lead = (name: string, stageId: any, extra: any = {}) =>
    Lead.create({ tenantId: T, name, phone: String(Math.random()).slice(2, 12), stageId, createdBy: admin._id, courseInterest: ['Java'], ...extra } as any);
  await lead('Overdue', fresh._id, { nextFollowUp: new Date(now - 2 * day), assignedTo: staff._id, lastContactedAt: new Date(now - 3 * day) });
  await lead('Today', qualified._id, { nextFollowUp: new Date(new Date().setHours(23, 0, 0, 0)), assignedTo: staff._id, lastContactedAt: new Date(now - day) });
  await lead('Upcoming', qualified._id, { nextFollowUp: new Date(now + 3 * day), assignedTo: other._id });
  await lead('Unowned', fresh._id, {});
  await lead('Closed overdue', lost._id, { nextFollowUp: new Date(now - 5 * day) });
  await lead('Nurture due', fresh._id, { 'nurture.reactivateAt': new Date(now + day) } as any);
});

describe('list', () => {
  it('filters by milestone (including a guessed legacy stage) and follow-up state', async () => {
    const q = await call(getLeads, admin, { milestone: 'qualified' });
    expect(q.body.data.leads.map((l: any) => l.name).sort()).toEqual(['Today', 'Upcoming']);
    const lostL = await call(getLeads, admin, { milestone: 'lost' });
    expect(lostL.body.data.leads.map((l: any) => l.name)).toEqual(['Closed overdue']);
    const over = await call(getLeads, admin, { followUp: 'overdue' });
    expect(over.body.data.leads.map((l: any) => l.name).sort()).toEqual(['Closed overdue', 'Overdue']);
  });

  it('sorts by a whitelisted field and ignores unknown ones', async () => {
    const r = await call(getLeads, admin, { sort: 'lastContactedAt', dir: 'desc', followUp: '' });
    expect(r.body.data.leads[0].name).toBe('Today');
    const bad = await call(getLeads, admin, { sort: '$where', dir: 'asc' });
    expect(bad.status).toBe(200);
  });
});

describe('milestone summary + queue', () => {
  it('counts milestones and excludes closed leads from overdue', async () => {
    const r = await call(getMilestoneSummary, admin);
    expect(r.body.data.total).toBe(6);
    expect(r.body.data.milestones).toMatchObject({ new: 3, qualified: 2, lost: 1 });
    expect(r.body.data.overdue).toBe(1);
    expect(r.body.data.unassigned).toBe(2); // Unowned + Nurture due (closed lead excluded)
  });

  it('queue tabs return the right leads, and a counsellor only sees their own', async () => {
    const names = async (tab: string, user = admin) => (await call(getFollowUpQueue, user, { tab })).body.data.leads.map((l: any) => l.name);
    expect(await names('overdue')).toEqual(['Overdue']);
    expect(await names('today')).toEqual(['Today']);
    expect(await names('upcoming')).toEqual(['Upcoming']);
    expect((await names('unassigned')).sort()).toEqual(['Nurture due', 'Unowned']);
    expect(await names('nurture')).toEqual(['Nurture due']);
    expect(await names('upcoming', staff)).toEqual([]); // belongs to the other counsellor
    expect(await names('today', staff)).toEqual(['Today']);
  });

  it('queue returns every tab count and honours search + page size', async () => {
    const r = await call(getFollowUpQueue, admin, { tab: 'today', limit: '5' });
    expect(r.body.data.counts).toMatchObject({ today: 1, overdue: 1, upcoming: 1, unassigned: 2, nurture: 1 });
    expect(r.body.data.limit).toBe(5);
    const s = await call(getFollowUpQueue, admin, { tab: 'unassigned', search: 'Unowned' });
    expect(s.body.data.leads.map((l: any) => l.name)).toEqual(['Unowned']);
    expect(s.body.data.counts.unassigned).toBe(1);
    const u = await call(getFollowUpQueue, admin, { tab: 'today', assignedTo: 'unassigned' });
    expect(u.body.data.counts.today).toBe(0);
  });
});
