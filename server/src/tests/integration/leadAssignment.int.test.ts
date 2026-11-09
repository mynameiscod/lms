/**
 * leadAssignmentService — the one engine that gives new leads a counsellor. Real database.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
jest.mock('../../services/settingsService', () => ({
  getStr: (_k: string, fallback = '') => fallback,
  getNum: (_k: string, fallback: number) => fallback,
  setMany: jest.fn(),
}));

import Lead from '../../models/Lead';
import User from '../../models/User';
import LeadScoringConfig from '../../models/LeadScoringConfig';
import LeadAssignmentConfig from '../../models/LeadAssignmentConfig';
import { assignLead, getAssignmentConfig, saveAssignmentConfig } from '../../services/leadAssignmentService';

const T = new mongoose.Types.ObjectId();
const STAGE = new mongoose.Types.ObjectId();
const TID = String(T);
let A = '', B = '', C = '', TRAINER = '';

const mkUser = async (email: string, role: string) => String((await User.collection.insertOne({ tenantId: T, email, firstName: email.split('@')[0], role, isActive: true } as any)).insertedId);
// Created with an owner so the create hook leaves it alone; then cleared, so each test drives assignLead itself.
const lead = async (over: any = {}) => {
  const l: any = await Lead.create({ tenantId: T, name: 'Ravi', phone: String(9000000000 + Math.floor(Math.random() * 99999999)), source: 'meta_form', courseInterest: [], stageId: STAGE, createdBy: A, assignedTo: A, ...over } as any);
  await Lead.updateOne({ _id: l._id }, { $set: { assignedTo: null, 'assignment.assignedTo': null } });
  return String(l._id);
};
const ownerOf = async (id: string) => String(((await Lead.findById(id).lean()) as any)?.assignedTo || '');
const save = (input: any) => saveAssignmentConfig(TID, input, A);

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });
beforeEach(async () => {
  await clearCollections();
  A = await mkUser('kavitha@x.in', 'TENANT_ADMIN');
  B = await mkUser('ameesha@x.in', 'TENANT_ADMIN');
  C = await mkUser('third@x.in', 'TENANT_ADMIN');
  TRAINER = await mkUser('trainer@x.in', 'STAFF'); // not a counsellor
});

it('carries over what Lead Scoring was doing on first read', async () => {
  await LeadScoringConfig.create({ tenantId: T, isActive: true, assignmentMode: 'round_robin', roundRobinMembers: [A, B] } as any);
  const c = await getAssignmentConfig(TID);
  expect(c.mode).toBe('round_robin');
  expect(c.members.map(m => String(m.userId))).toEqual([A, B]);
});

it('manual assigns nobody', async () => {
  await save({ mode: 'manual', members: [{ userId: A }], rules: [] });
  const id = await lead();
  expect(await assignLead(TID, id)).toBeNull();
  expect(await ownerOf(id)).toBe('');
});

it('round robin rotates in order, skips someone on leave, and keeps an existing owner', async () => {
  await save({ mode: 'round_robin', members: [{ userId: A }, { userId: B }, { userId: C, available: false }], rules: [] });
  const got = [];
  for (let i = 0; i < 4; i++) got.push(await assignLead(TID, await lead()));
  expect(got).toEqual([A, B, A, B]);
  const owned = await lead();
  await Lead.updateOne({ _id: owned }, { $set: { assignedTo: C } });
  expect(await assignLead(TID, owned)).toBe(C);
});

it('only counsellors can be members', async () => {
  await save({ mode: 'round_robin', members: [{ userId: TRAINER }, { userId: A }], rules: [] });
  const c = await LeadAssignmentConfig.findOne({ tenantId: T }).lean() as any;
  expect(c.members.map((m: any) => String(m.userId))).toEqual([A]);
});

it('a daily cap stops new leads for that person today', async () => {
  await save({ mode: 'round_robin', members: [{ userId: A, maxPerDay: 1 }, { userId: B }], rules: [] });
  const got = [];
  for (let i = 0; i < 4; i++) got.push(await assignLead(TID, await lead()));
  expect(got.filter(x => x === A)).toHaveLength(1);
  expect(got.filter(x => x === B)).toHaveLength(3);
});

it('rules: first match by source/course wins, everything else falls back to round robin', async () => {
  await save({
    mode: 'rules', members: [{ userId: A }, { userId: B }, { userId: C }],
    rules: [
      { name: 'Website', sources: ['website'], members: [C] },
      { name: 'Java', courses: ['java'], members: [B] },
    ],
  });
  expect(await assignLead(TID, await lead({ source: 'website' }))).toBe(C);
  expect(await assignLead(TID, await lead({ courseInterest: ['Java Fullstack'] }))).toBe(B);
  expect(await assignLead(TID, await lead({ source: 'whatsapp' }))).toBe(A); // no rule → round robin over all
});

it('a rule needs counsellors and something to match', async () => {
  await expect(save({ mode: 'rules', members: [{ userId: A }], rules: [{ name: 'Empty', sources: ['website'], members: [] }] })).rejects.toThrow(/no counsellors/);
  await expect(save({ mode: 'rules', members: [{ userId: A }], rules: [{ name: 'Any', members: [A] }] })).rejects.toThrow(/source or a course/);
  await expect(save({ mode: 'round_robin', members: [], rules: [] })).rejects.toThrow(/at least one counsellor/);
});

it('never gives a not-interested / wrong-number / opt-out AI result to a counsellor', async () => {
  await save({ mode: 'round_robin', members: [{ userId: A }], rules: [] });
  expect(await assignLead(TID, await lead(), { afterCall: true, aiOutcome: 'not_interested' })).toBeNull();
  expect(await assignLead(TID, await lead({ aiFeedback: { outcome: 'wrong_number' } }), { afterCall: true })).toBeNull();
  expect(await assignLead(TID, await lead({ aiFeedback: { doNotContact: true } }), { afterCall: true })).toBeNull();
  expect(await assignLead(TID, await lead(), { afterCall: true, aiOutcome: 'interested' })).toBe(A);
});

it('a new website lead is assigned by the create hook (it used to be missed)', async () => {
  await save({ mode: 'round_robin', members: [{ userId: B }], rules: [] });
  const l: any = await Lead.create({ tenantId: T, name: 'Web', phone: '9123456780', source: 'website', courseInterest: [], stageId: STAGE, createdBy: A } as any);
  let owner = '';
  for (let i = 0; i < 50 && !owner; i++) { await new Promise(r => setTimeout(r, 100)); owner = await ownerOf(String(l._id)); }
  expect(owner).toBe(B);
});
