/**
 * Phase 27 — a direction change reaches the planner, and nothing else pretends to be one.
 *
 * DIRECTION_CHANGED had a trigger and a replanner and no publisher. It is now announced from the
 * one place a student changes where they are heading — saving their career context — and only
 * when the RESOLVED direction moves. Re-saving the same role, or changing minutes per day, must
 * not rebuild a plan.
 */

const leanChain = (value: any): any => ({ select: () => leanChain(value), lean: async () => value });

/** Passports returned by successive User.findOne calls: before the save, then after it. */
let passports: any[] = [];
jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findOne: () => {
      const next = passports.length > 1 ? passports.shift() : passports[0];
      return leanChain(next === undefined ? null : { passport: next });
    },
  },
}));
jest.mock('../models/PassportConfig', () => ({
  __esModule: true,
  default: { findOne: () => leanChain(null) },
}));

const updateCareerContext = jest.fn();
jest.mock('../services/careerContextService', () => ({
  __esModule: true,
  getCareerContext: jest.fn(),
  updateCareerContext: (...a: any[]) => updateCareerContext(...a),
}));
jest.mock('../services/careerRoleService', () => ({
  __esModule: true,
  getSelectableCareerRoles: async () => [],
}));

const publish = jest.fn(async (_e: any) => undefined);
jest.mock('../services/adaptiveCurriculumEvents', () => ({
  __esModule: true,
  publish: (e: any) => publish(e),
}));

import { updateMyCareerContext } from '../controllers/careerContextController';

const TENANT = 't1';
const STUDENT = '64b0000000000000000000cc';

const capture = () => {
  const res: any = { statusCode: 200, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
};
const save = (body: any) => updateMyCareerContext(
  { user: { id: STUDENT, tenantId: TENANT }, tenantId: TENANT, body } as any, capture(),
);

beforeEach(() => {
  publish.mockClear();
  updateCareerContext.mockReset().mockResolvedValue({ context: { career: { domain: 'software' } } });
});

describe('saving career context', () => {
  it('announces a direction change when the student picks a role in a different direction', async () => {
    passports = [{ primaryRole: 'NOT_SURE' }, { primaryRole: 'FRONTEND_ENGINEER' }];
    await save({ primaryRole: 'FRONTEND_ENGINEER' });
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0][0]).toMatchObject({
      name: 'DIRECTION_CHANGED', tenantId: TENANT, studentId: STUDENT, meta: { origin: 'CAREER_CONTEXT' },
    });
  });

  it('announces nothing when the same direction is saved again', async () => {
    passports = [{ primaryRole: 'FRONTEND_ENGINEER' }, { primaryRole: 'FRONTEND_ENGINEER' }];
    await save({ primaryRole: 'FRONTEND_ENGINEER' });
    expect(publish).not.toHaveBeenCalled();
  });

  it('announces nothing for a change a plan is not built from', async () => {
    passports = [{ primaryRole: 'NOT_SURE' }, { primaryRole: 'NOT_SURE' }];
    await save({ minutesPerDay: 90 });
    expect(publish).not.toHaveBeenCalled();
  });

  it('announces nothing for a role the service refused', async () => {
    updateCareerContext.mockResolvedValue({ context: { career: { domain: 'software' } }, invalid: 'Not offered.' });
    passports = [{ primaryRole: 'NOT_SURE' }, { primaryRole: 'NOT_SURE' }];
    const res = capture();
    await updateMyCareerContext({ user: { id: STUDENT, tenantId: TENANT }, tenantId: TENANT, body: { primaryRole: 'X' } } as any, res);
    expect(res.statusCode).toBe(400);
    expect(publish).not.toHaveBeenCalled();
  });
});
