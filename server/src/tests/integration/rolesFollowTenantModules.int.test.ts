/**
 * The Roles screen follows the institute's modules (2026-11-25). An institute given only Leads / CRM saw
 * every permission on the platform when making a role. An institute admin is now offered, and can save,
 * only the permissions of modules their institute has; the super admin still sees everything.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import Tenant from '../../models/Tenant';
import Role from '../../models/Role';
import { getAvailablePermissions, createRole, updateRole } from '../../controllers/roleController';
import { invalidateModuleCache } from '../../middleware/moduleGate';
import { PERMISSION_GROUPS } from '../../middleware/roleGuard';
import { GROUP_MODULE, PERMISSION_MODULE } from '../../config/permissionModules';
import { ALL_MODULES } from '../../config/tenantModules';

jest.setTimeout(240_000);

/** Groups that belong to no module on purpose: offered to every institute. */
const CORE_GROUPS = ['users', 'reports', 'admin', 'operations', 'support', 'sharedPlatform', 'mcp'];

const call = async (fn: any, req: any) => {
  const res: any = { statusCode: 200, body: null, status(c: number) { this.statusCode = c; return this; }, json(b: any) { this.body = b; return this; } };
  await fn({ params: {}, body: {}, ...req }, res);
  return res;
};
const keysOf = (groups: any) => Object.values(groups).flatMap((g: any) => g.permissions.map((p: any) => p.key));

describe('Roles follow the institute\'s modules', () => {
  let crmOnly: string;
  const admin = () => ({ user: { role: 'TENANT_ADMIN' }, tenantId: crmOnly });

  beforeAll(async () => {
    await startMongo();
    // Every module off, then Leads / CRM on with Sales Teams switched off.
    const modules: any = Object.fromEntries(ALL_MODULES.map((k) => [k, false]));
    Object.assign(modules, { leads: true, rolesManagement: true, crmPipeline: true, crmReports: true, crmSalesTeams: false });
    const t: any = await Tenant.collection.insertOne({ name: 'Acme Admissions', slug: `acme-${Date.now()}`, isActive: true, modules } as any);
    crmOnly = String(t.insertedId);
    invalidateModuleCache();
  });
  afterAll(stopMongo);

  it('every permission group is tied to a module or is core on purpose', () => {
    for (const g of Object.keys(PERMISSION_GROUPS)) expect([g, !!GROUP_MODULE[g] || CORE_GROUPS.includes(g)]).toEqual([g, true]);
    for (const m of [...Object.values(GROUP_MODULE), ...Object.values(PERMISSION_MODULE)]) expect(ALL_MODULES).toContain(m);
  });

  it('a CRM-only institute\'s admin is offered CRM and core permissions only', async () => {
    const res = await call(getAvailablePermissions, admin());
    const groups = res.body.data;
    expect(Object.keys(groups)).toEqual(expect.arrayContaining(['leads', 'users']));
    for (const g of ['courses', 'quizzes', 'fees', 'whatsapp', 'careerPassport', 'placement', 'employees']) expect(groups[g]).toBeUndefined();
    const keys = keysOf(groups);
    expect(keys).toEqual(expect.arrayContaining(['view_leads', 'edit_leads', 'manage_lead_stages', 'view_lead_analytics', 'manage_roles']));
    expect(keys).not.toContain('manage_sales_teams'); // Sales Teams is switched off for them
    expect(keys).not.toContain('archive_leads'); // Archive too
    expect(keys).not.toContain('create_courses');
  });

  it('the super admin still sees every group', async () => {
    const res = await call(getAvailablePermissions, { user: { role: 'SUPER_ADMIN' }, tenantId: crmOnly });
    expect(res.body.data.courses).toBeDefined();
    expect(keysOf(res.body.data)).toContain('manage_sales_teams');
  });

  it('a permission of a module they do not have cannot be saved; one already on the role stays', async () => {
    const created = await call(createRole, { ...admin(), body: { name: 'Counsellor', permissions: ['view_leads', 'create_courses', 'manage_sales_teams'] } });
    expect(created.statusCode).toBe(201);
    const id = String(created.body.data._id);
    expect((await Role.findById(id).lean() as any).permissions.sort()).toEqual(['view_leads']);

    // An older role that already holds a course permission keeps it when the admin edits the role.
    await Role.updateOne({ _id: id }, { $set: { permissions: ['view_leads', 'create_courses'] } });
    await call(updateRole, { ...admin(), params: { roleId: id }, body: { permissions: ['view_leads', 'edit_leads'] } });
    expect((await Role.findById(id).lean() as any).permissions.sort()).toEqual(['create_courses', 'edit_leads', 'view_leads']);
  });
});
