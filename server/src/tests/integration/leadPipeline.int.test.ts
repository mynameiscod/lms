/**
 * Pipeline settings (stages → sub-stages → reasons): tenant isolation, delete safety, the
 * milestone keeping legacy flags in step, and the additive starter set. Real database.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

const values: Record<string, string> = {};
jest.mock('../../services/settingsService', () => ({
  getStr: (k: string, fallback = '') => values[k] ?? fallback,
  getNum: (k: string, fallback: number) => (values[k] ? Number(values[k]) : fallback),
  setMany: jest.fn(),
}));

import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import LeadSubStage from '../../models/LeadSubStage';
import LeadReason from '../../models/LeadReason';
import * as ctl from '../../controllers/leadPipelineController';
import { STARTER_PIPELINE } from '../../config/leadStarterPipeline';

const T = new mongoose.Types.ObjectId();
const OTHER = new mongoose.Types.ObjectId();
const U = new mongoose.Types.ObjectId();

/** Call a controller the way Express would and return { status, body }. */
async function call(fn: any, { params = {}, body = {}, tenantId = T }: any = {}) {
  let status = 200; let json: any;
  const res: any = { status(s: number) { status = s; return res; }, json(b: any) { json = b; return res; } };
  await fn({ params, body, tenantId: String(tenantId), user: { id: String(U), role: 'TENANT_ADMIN' } }, res);
  return { status, body: json };
}

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });
beforeEach(async () => {
  await clearCollections();
  for (const k of Object.keys(values)) delete values[k];
});

const stage = (over: any = {}) => LeadStage.create({ tenantId: T, name: 'New Lead', order: 0, color: '#000000', isActive: true, isDefault: true, ...over } as any);

describe('stages', () => {
  it('setting a milestone keeps category and isLostStage in step', async () => {
    const s = await stage({ name: 'Closed', isDefault: false });
    const r = await call(ctl.updateStage, { params: { id: String(s._id) }, body: { milestone: 'lost' } });
    expect(r.status).toBe(200);
    const saved: any = await LeadStage.findById(s._id).lean();
    expect(saved).toMatchObject({ milestone: 'lost', category: 'lost', isLostStage: true });

    await call(ctl.updateStage, { params: { id: String(s._id) }, body: { milestone: 'qualified' } });
    expect(await LeadStage.findById(s._id).lean()).toMatchObject({ category: 'qualified', isLostStage: false });
  });

  it('rejects an unknown milestone', async () => {
    const s = await stage();
    const r = await call(ctl.updateStage, { params: { id: String(s._id) }, body: { milestone: 'won' } });
    expect(r.status).toBe(400);
  });

  it('will not delete a stage leads are in, the landing stage, or one Outpero uses', async () => {
    const landing = await stage();
    const busy = await stage({ name: 'Busy', isDefault: false, order: 1 });
    const outpero = await stage({ name: 'With Outpero', isDefault: false, order: 2 });
    values.OUTPERO_SENT_STAGE = String(outpero._id);
    await Lead.create({ tenantId: T, name: 'A', phone: '9000000001', stageId: busy._id, createdBy: U, courseInterest: [] } as any);

    for (const s of [landing, busy, outpero]) {
      const r = await call(ctl.deleteStage, { params: { id: String(s._id) } });
      expect(r.status).toBe(400);
    }
    expect(await LeadStage.countDocuments({ tenantId: T })).toBe(3);
  });

  it('deleting an empty stage removes its sub-stages and reasons', async () => {
    await stage();
    const s = await stage({ name: 'Temp', isDefault: false, order: 1 });
    const sub = await LeadSubStage.create({ tenantId: T, stageId: s._id, name: 'x' });
    await LeadReason.create({ tenantId: T, stageId: s._id, subStageId: sub._id, name: 'y' });
    const r = await call(ctl.deleteStage, { params: { id: String(s._id) } });
    expect(r.status).toBe(200);
    expect(await LeadSubStage.countDocuments({ stageId: s._id })).toBe(0);
    expect(await LeadReason.countDocuments({ stageId: s._id })).toBe(0);
  });

  it('cannot switch off the landing stage; moving the landing stage leaves exactly one', async () => {
    const a = await stage();
    const b = await stage({ name: 'Second', isDefault: true, order: 1 });
    expect((await call(ctl.updateStage, { params: { id: String(a._id) }, body: { isActive: false } })).status).toBe(400);
    await call(ctl.setLandingStage, { params: { id: String(b._id) } });
    expect(await LeadStage.countDocuments({ tenantId: T, isDefault: true })).toBe(1);
    expect((await LeadStage.findById(b._id).lean() as any).isDefault).toBe(true);
  });
});

describe('sub-stages and reasons', () => {
  it('cannot attach to another institute’s stage or sub-stage', async () => {
    const foreign = await LeadStage.create({ tenantId: OTHER, name: 'Theirs', order: 0, color: '#000000' } as any);
    const r1 = await call(ctl.createSubStage, { body: { stageId: String(foreign._id), name: 'x' } });
    expect(r1.status).toBe(404);
    const foreignSub = await LeadSubStage.create({ tenantId: OTHER, stageId: foreign._id, name: 'x' });
    const r2 = await call(ctl.createReason, { body: { subStageId: String(foreignSub._id), name: 'y' } });
    expect(r2.status).toBe(404);
  });

  it('copies the stage onto a reason, rejects duplicates case-insensitively, appends in order', async () => {
    const s = await stage();
    const sub = (await call(ctl.createSubStage, { body: { stageId: String(s._id), name: 'No answer' } })).body.data;
    const sub2 = (await call(ctl.createSubStage, { body: { stageId: String(s._id), name: 'Busy' } })).body.data;
    expect(sub2.order).toBe(sub.order + 1);
    const dup = await call(ctl.createSubStage, { body: { stageId: String(s._id), name: 'no ANSWER' } });
    expect(dup.status).toBe(400);
    const reason = (await call(ctl.createReason, { body: { subStageId: String(sub._id), name: 'Fee too high' } })).body.data;
    expect(String(reason.stageId)).toBe(String(s._id));
  });

  it('will not delete a sub-stage or reason a lead uses', async () => {
    const s = await stage();
    const sub = await LeadSubStage.create({ tenantId: T, stageId: s._id, name: 'x' });
    const reason = await LeadReason.create({ tenantId: T, stageId: s._id, subStageId: sub._id, name: 'y' });
    await Lead.create({ tenantId: T, name: 'A', phone: '9000000002', stageId: s._id, subStageId: sub._id, reasonId: reason._id, createdBy: U, courseInterest: [] } as any);
    expect((await call(ctl.deleteReason, { params: { id: String(reason._id) } })).status).toBe(400);
    expect((await call(ctl.deleteSubStage, { params: { id: String(sub._id) } })).status).toBe(400);
  });
});

describe('starter pipeline', () => {
  it('adds everything once, reuses a same-named stage without changing it, and is safe to run twice', async () => {
    const mine = await stage({ name: 'new lead', color: '#123456', order: 0 }); // same name, different case
    const first = await call(ctl.addStarterPipeline);
    expect(first.status).toBe(200);
    expect(first.body.data.stagesReused).toBe(1);
    expect(first.body.data.stagesCreated).toBe(STARTER_PIPELINE.length - 1);

    const reused: any = await LeadStage.findById(mine._id).lean();
    expect(reused).toMatchObject({ name: 'new lead', color: '#123456', isDefault: true, milestone: 'new' });

    const second = await call(ctl.addStarterPipeline);
    expect(second.body.data).toEqual({ stagesCreated: 0, stagesReused: STARTER_PIPELINE.length, subStagesCreated: 0, reasonsCreated: 0 });

    const lost: any = await LeadStage.findOne({ tenantId: T, name: 'Lost' }).lean();
    expect(lost).toMatchObject({ milestone: 'lost', isLostStage: true, category: 'lost' });
    expect(await LeadStage.countDocuments({ tenantId: T, isDefault: true })).toBe(1);
  });

  it('getPipeline nests sub-stages and reasons and shows lead counts', async () => {
    await call(ctl.addStarterPipeline);
    const r = await call(ctl.getPipeline);
    const lost = r.body.data.stages.find((s: any) => s.name === 'Lost');
    expect(lost.subStages.length).toBe(3);
    expect(lost.subStages[0].reasons.length).toBeGreaterThan(0);
    expect(r.body.data.milestones.map((m: any) => m.value)).toContain('seat_reserved');
  });
});
