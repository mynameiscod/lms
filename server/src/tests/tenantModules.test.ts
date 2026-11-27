const tenantDocs = new Map<string, any>();
jest.mock('../models/Tenant', () => ({
  __esModule: true,
  default: { findById: jest.fn((id: string) => ({ select: () => ({ lean: async () => tenantDocs.get(String(id)) || null }) })) },
}));

import jwt from 'jsonwebtoken';
import { effectiveModules, moduleForApiPath, ALL_MODULES, ORIGINAL_MODULES, ADMIN_MODULES } from '../config/tenantModules';
import { moduleGate, invalidateModuleCache } from '../middleware/moduleGate';
import { jwtSecret } from '../config/secrets';

const allOff = Object.fromEntries(ORIGINAL_MODULES.map((k) => [k, false]));
// What a NEW institute is saved with (authService.registerOrganizationFull): every module, off.
const newInstitute = Object.fromEntries(ALL_MODULES.map((k) => [k, false]));

describe('effectiveModules', () => {
  it('keeps everything for an institute with every original module on (CodeBegun)', () => {
    const m = effectiveModules({});
    expect(ALL_MODULES.every((k) => m[k])).toBe(true);
  });

  it('gives an institute created with every module off none of them', () => {
    const m = effectiveModules(newInstitute);
    expect(ALL_MODULES.some((k) => m[k])).toBe(false);
  });

  it('keeps the institute-admin menu ON for an institute that existed before it had switches', () => {
    const m = effectiveModules(allOff);
    for (const k of ADMIN_MODULES) expect([k, m[k]]).toEqual([k, true]);
    // ...until the platform administrator switches one off.
    expect(effectiveModules({ ...allOff, employees: false }).employees).toBe(false);
    expect(effectiveModules({ ...allOff, employees: false }).expenses).toBe(true);
  });

  it('new modules follow their parent until set, then their own value', () => {
    expect(effectiveModules({ ...allOff, placement: true }).placementProgram).toBe(true);
    expect(effectiveModules({ ...allOff, placement: true, placementProgram: false }).placementProgram).toBe(false);
    expect(effectiveModules({ leads: false, whatsapp: true }).whatsapp).toBe(true);
  });
});

describe('moduleForApiPath', () => {
  it('maps feature APIs to their module and leaves core alone', () => {
    expect(moduleForApiPath('/leads/123')).toBe('leads');
    expect(moduleForApiPath('/lead-stages')).toBe('leads');
    expect(moduleForApiPath('/whatsapp-chat/inbox')).toBe('whatsapp');
    expect(moduleForApiPath('/placement-program/abc')).toBe('placementProgram');
    expect(moduleForApiPath('/hackathon-exams/x')).toBe('hackathons');
    for (const core of ['/auth/login', '/users/1', '/batches', '/dashboard', '/notifications', '/tenants/1', '/public/battles', '/whatsapp/webhook', '/payments/x']) {
      expect(moduleForApiPath(core)).toBeNull();
    }
  });
});

describe('institute-admin tools are gated on the server too', () => {
  it('maps their APIs to a module, and leaves the shared people/batch/role APIs alone', () => {
    expect(moduleForApiPath('/employees/1')).toBe('employees');
    expect(moduleForApiPath('/employee-portal/me')).toBe('employees');
    expect(moduleForApiPath('/employee-activity')).toBe('employees');
    expect(moduleForApiPath('/company-expenses/ledger')).toBe('expenses');
    expect(moduleForApiPath('/employee-expenses/9')).toBe('expenses');
    expect(moduleForApiPath('/ai-usage/summary')).toBe('aiSpend');
    expect(moduleForApiPath('/admin/logs')).toBe('apiLogs');
    expect(moduleForApiPath('/tenant-integrations/razorpay')).toBe('integrations');
    expect(moduleForApiPath('/concerns/5')).toBe('concerns');
    for (const shared of ['/users', '/roles', '/batches', '/notifications']) expect(moduleForApiPath(shared)).toBeNull();
  });
});

describe('moduleGate', () => {
  const T = '69c7723868202a8e4616ef3d';
  const token = (role: string, tenantId = T) => jwt.sign({ id: 'u1', role, tenantId }, jwtSecret());
  const run = async (path: string, auth?: string) => {
    const res: any = { statusCode: 200 };
    res.status = (c: number) => { res.statusCode = c; return res; };
    res.json = (b: any) => { res.body = b; return res; };
    const next = jest.fn();
    await moduleGate({ path, headers: auth ? { authorization: `Bearer ${auth}` } : {} } as any, res, next);
    return { res, next };
  };
  beforeEach(() => { tenantDocs.clear(); invalidateModuleCache(); });

  it('refuses a disabled module with 403 MODULE_DISABLED', async () => {
    tenantDocs.set(T, { modules: { ...allOff } });
    const { res, next } = await run('/leads', token('TENANT_ADMIN'));
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('MODULE_DISABLED');
  });

  it('allows an enabled module, core paths, the super admin and unauthenticated (public) calls', async () => {
    tenantDocs.set(T, { modules: { ...allOff, leads: true } });
    expect((await run('/leads', token('STAFF'))).next).toHaveBeenCalled();
    expect((await run('/users/1', token('STAFF'))).next).toHaveBeenCalled();
    expect((await run('/placement-program', token('SUPER_ADMIN'))).next).toHaveBeenCalled();
    expect((await run('/placement-program'))).toMatchObject({ next: expect.any(Function) });
    expect((await run('/placement-program')).next).toHaveBeenCalled();
  });

  it('fails open when the institute cannot be read', async () => {
    const { next } = await run('/leads', token('STAFF', '000000000000000000000000'));
    expect(next).toHaveBeenCalled();
  });
});
