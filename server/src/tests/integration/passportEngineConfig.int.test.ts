/**
 * Phase 27 — the curriculum engine switches, through the real Admin handlers and a real database.
 *
 * The switches existed on PassportConfig and the Admin endpoint silently discarded them. These
 * tests hold what the supported path now promises: an Admin can save them, a malformed or
 * foreign value is refused with nothing written, the tenant comes from the verified identity and
 * never from the request, the saved values are what the engine resolver then reads, and a member
 * without MANAGE cannot reach the handler at all.
 */

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import PassportConfig from '../../models/PassportConfig';
import * as passport from '../../controllers/passportController';
import { resolveCurriculumEngine } from '../../services/curriculumEngineService';
import { roleGuard } from '../../middleware/roleGuard';

const TENANT = '507f1f77bcf86cd799439d11';
const OTHER = '507f1f77bcf86cd799439d22';

const capture = () => {
  const res: any = { statusCode: 200, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
};

/** A request as authMiddleware and tenantMiddleware would leave it for this admin. */
const asAdmin = (body: any = {}, overrides: any = {}) => ({
  user: { id: '507f1f77bcf86cd799439d99', tenantId: TENANT, role: 'TENANT_ADMIN' },
  tenantId: TENANT, headers: {}, params: {}, query: {}, body, ...overrides,
} as any);

let seq = 0;
const student = (tenantId: string, stage: string, role = 'STUDENT') => {
  seq += 1;
  return User.create({
    tenantId, firstName: `Eng${seq}`, lastName: 'X', email: `eng${seq}@example.com`,
    phone: `9811${String(seq).padStart(6, '0')}`, password: 'x', role, passport: { stage },
  } as any);
};

beforeAll(async () => { await startMongo(); });
afterAll(stopMongo);
beforeEach(clearCollections);

describe('saving the engine switches through the Admin handler', () => {
  it('persists valid values and returns the effective engine', async () => {
    const s = await student(TENANT, 'foundation');
    const res = capture();
    await passport.updateConfig(asAdmin({
      megaCurriculumStages: ['Foundation'], megaCurriculumStudentIds: [String(s._id)], megaCurriculumEnabled: false,
    }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.engine.foundationMode).toBe('UNIT');
    expect(res.body.engine.stages.find((x: any) => x.stage === 'build').mode).toBe('TOPIC');
    const stored = await PassportConfig.findOne({ tenantId: TENANT }).lean() as any;
    expect(stored.megaCurriculumStages).toEqual(['foundation']);
    expect(stored.megaCurriculumStudentIds).toEqual([String(s._id)]);
    expect(stored.megaCurriculumEnabled).toBe(false);
  });

  it('returns the effective values on GET', async () => {
    await passport.updateConfig(asAdmin({ megaCurriculumStages: ['foundation'] }), capture());
    const res = capture();
    await passport.getConfig(asAdmin(), res);
    expect(res.body.engine).toMatchObject({ foundationMode: 'UNIT', megaCurriculumStages: ['foundation'] });
  });

  it('still saves the ordinary fields alongside, and drops nothing it recognises', async () => {
    const res = capture();
    await passport.updateConfig(asAdmin({ enabled: true, megaCurriculumEnabled: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.config.enabled).toBe(true);
    expect(res.body.config.megaCurriculumEnabled).toBe(true);
  });

  it.each([
    ['a non-boolean switch', { megaCurriculumEnabled: 'yes' }],
    ['stages that are not a list', { megaCurriculumStages: 'foundation' }],
    ['a stage that does not exist', { megaCurriculumStages: ['year9'] }],
    ['a stage with no Learning Unit curriculum', { megaCurriculumStages: ['build'] }],
    ['a malformed student id', { megaCurriculumStudentIds: ['not-an-id'] }],
    ['student ids that are not a list', { megaCurriculumStudentIds: '507f1f77bcf86cd799439d99' }],
  ])('refuses %s and writes nothing', async (_label, body) => {
    const res = capture();
    await passport.updateConfig(asAdmin({ ...body, enabled: true }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
    expect(await PassportConfig.countDocuments({})).toBe(0);
  });

  it('refuses a pilot id that is another tenant’s student, or not a student at all', async () => {
    const foreign = await student(OTHER, 'foundation');
    const admin = await student(TENANT, 'foundation', 'TENANT_ADMIN');
    for (const id of [foreign._id, admin._id]) {
      const res = capture();
      await passport.updateConfig(asAdmin({ megaCurriculumStudentIds: [String(id)] }), res);
      expect(res.statusCode).toBe(400);
    }
    expect(await PassportConfig.countDocuments({})).toBe(0);
  });

  it('acts on the tenant in the verified identity, whatever the request names', async () => {
    const res = capture();
    await passport.updateConfig(asAdmin(
      { megaCurriculumStages: ['foundation'], tenantId: OTHER },
      { tenantId: OTHER, headers: { 'x-tenant-id': OTHER } },
    ), res);
    expect(res.statusCode).toBe(200);
    expect(await PassportConfig.countDocuments({ tenantId: OTHER })).toBe(0);
    expect(await PassportConfig.countDocuments({ tenantId: TENANT })).toBe(1);
  });
});

describe('the resolver reads what the Admin saved', () => {
  it('moves the enabled stage onto UNIT and leaves everyone else on TOPIC', async () => {
    const foundation = await student(TENANT, 'foundation');
    const build = await student(TENANT, 'build');
    const elsewhere = await student(OTHER, 'foundation');

    expect((await resolveCurriculumEngine({ tenantId: TENANT, studentId: String(foundation._id) })).engine).toBe('TOPIC');

    await passport.updateConfig(asAdmin({ megaCurriculumStages: ['foundation'] }), capture());

    expect((await resolveCurriculumEngine({ tenantId: TENANT, studentId: String(foundation._id) })).engine).toBe('UNIT');
    expect((await resolveCurriculumEngine({ tenantId: TENANT, studentId: String(build._id) })).engine).toBe('TOPIC');
    expect((await resolveCurriculumEngine({ tenantId: OTHER, studentId: String(elsewhere._id) })).engine).toBe('TOPIC');
  });
});

describe('who may change the engine', () => {
  const guarded = async (role: string, customRoleId: any = null) => {
    const req: any = { user: { id: new mongoose.Types.ObjectId().toString(), tenantId: TENANT, role, customRoleId }, headers: {} };
    const res = capture();
    let reached = false;
    await roleGuard(['manage_passport'])(req, res, () => { reached = true; });
    return { reached, status: res.statusCode };
  };

  it('refuses a student at the MANAGE guard', async () => {
    expect(await guarded('STUDENT')).toEqual({ reached: false, status: 403 });
  });

  it('lets a tenant admin through', async () => {
    expect((await guarded('TENANT_ADMIN')).reached).toBe(true);
  });
});
