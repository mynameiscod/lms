/**
 * Sales Teams for every institute (2026-11-25). "Sales Teams" was a super-admin-only permission, so a
 * new institute with CRM access could never set up teams. It is now a Leads permission that the
 * institute admin holds by default and can give to their own roles. Teams stay inside one institute.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import { SalesTeam } from '../../models/SalesTeam';
import * as svc from '../../services/salesTeamService';
import { PERMISSION_GROUPS, ROLE_PERMISSIONS, SUPER_ADMIN_GRANTED, permissionsOf } from '../../middleware/roleGuard';
import { getAvailablePermissions } from '../../controllers/roleController';

jest.setTimeout(240_000);
const db = () => mongoose.connection.db!;
const tenantA = new mongoose.Types.ObjectId();
const tenantB = new mongoose.Types.ObjectId();

async function person(tenantId: mongoose.Types.ObjectId, name: string, role = 'STAFF') {
  const _id = new mongoose.Types.ObjectId();
  await db().collection('users').insertOne({ _id, tenantId, role, firstName: name, lastName: 'K', email: `${name}@x.in`, isActive: true });
  return String(_id);
}

describe('Sales Teams permission', () => {
  beforeAll(async () => { await startMongo(); await SalesTeam.syncIndexes(); });
  afterAll(stopMongo);

  it('is a Leads permission, not a super-admin-only one', () => {
    expect(PERMISSION_GROUPS.leads.permissions.map(p => p.key)).toContain('manage_sales_teams');
    expect((PERMISSION_GROUPS as any).sharedPlatform.permissions.map((p: any) => p.key)).not.toContain('manage_sales_teams');
    expect(SUPER_ADMIN_GRANTED).not.toContain('manage_sales_teams');
  });

  it('an institute admin holds it by default; staff do not', async () => {
    expect(ROLE_PERMISSIONS.TENANT_ADMIN).toContain('manage_sales_teams');
    expect(await permissionsOf({ role: 'TENANT_ADMIN', tenantId: tenantA })).toContain('manage_sales_teams');
    expect(await permissionsOf({ role: 'STAFF', tenantId: tenantA })).not.toContain('manage_sales_teams');
  });

  it('an institute admin sees it on the Roles screen under Leads', async () => {
    const res: any = { status() { return this; }, json(b: any) { this.body = b; return this; } };
    await getAvailablePermissions({ user: { role: 'TENANT_ADMIN' }, tenantId: String(tenantA) } as any, res);
    const groups = res.body.data;
    const leads = (Array.isArray(groups) ? groups.find((g: any) => g.key === 'leads' || g.label === 'Lead Management') : groups.leads);
    expect(leads.permissions.map((p: any) => p.key)).toContain('manage_sales_teams');
  });

  it('teams stay inside their institute', async () => {
    const mgrA = await person(tenantA, 'mgrA');
    const bdaA = await person(tenantA, 'bdaA');
    const bdaB = await person(tenantB, 'bdaB');
    // Someone from another institute cannot be put in a team.
    await expect(svc.saveTeam(String(tenantA), { name: 'Team A', managerId: mgrA, memberIds: [bdaB] }, '')).rejects.toThrow(/active staff of this institute/);
    await svc.saveTeam(String(tenantA), { name: 'Team A', managerId: mgrA, memberIds: [bdaA] }, '');
    expect(await svc.listTeams(String(tenantA))).toHaveLength(1);
    expect(await svc.listTeams(String(tenantB))).toHaveLength(0);
  });
});
