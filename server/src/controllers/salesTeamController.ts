import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { permissionsOf } from '../middleware/roleGuard';
import * as svc from '../services/salesTeamService';
import * as report from '../services/salesLeadReport';
import { istDay } from '../utils/istTime';

/** SALES TEAMS over HTTP. Rules and numbers live in services/salesTeamService.ts. */

const fail = (res: Response, e: any) => {
  if (e instanceof svc.SalesError) return res.status(e.http).json({ success: false, message: e.message });
  console.error('[sales-teams]', e);
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};
const ok = (res: Response, data: any) => res.json({ success: true, data });

async function viewer(req: AuthenticatedRequest): Promise<svc.Viewer> {
  const u = req.user!;
  const perms = await permissionsOf(u as any);
  return { userId: String(u.id), tenantId: String(req.tenantId || u.tenantId), isAdmin: u.role === 'SUPER_ADMIN' || perms.includes('manage_sales_teams') };
}
const wrap = (fn: (req: AuthenticatedRequest, v: svc.Viewer) => Promise<any>) => async (req: AuthenticatedRequest, res: Response) => {
  try { ok(res, await fn(req, await viewer(req))); } catch (e) { fail(res, e); }
};
const adminOnly = (fn: (req: AuthenticatedRequest, v: svc.Viewer) => Promise<any>) => wrap(async (req, v) => {
  if (!v.isAdmin) throw new svc.SalesError(403, 'Only an admin with the Sales Teams permission can manage sales teams.');
  return fn(req, v);
});

/** What this person is in Sales Teams: drives the menu. */
export const me = wrap(async (_req, v) => {
  const [managed, member] = await Promise.all([svc.managedTeams(v.tenantId, v.userId), svc.memberTeam(v.tenantId, v.userId)]);
  return {
    isAdmin: v.isAdmin,
    managerOf: managed.map((t: any) => ({ _id: String(t._id), name: t.name, color: t.color })),
    memberOf: member ? { _id: String(member._id), name: (member as any).name, color: (member as any).color } : null,
    today: istDay(),
  };
});

export const adminTeams = adminOnly((_req, v) => svc.listTeams(v.tenantId));
export const adminStaff = adminOnly((_req, v) => svc.staffOptions(v.tenantId));
export const adminCreate = adminOnly(async (req, v) => { await svc.saveTeam(v.tenantId, req.body || {}, v.userId); return svc.listTeams(v.tenantId); });
export const adminUpdate = adminOnly(async (req, v) => { await svc.saveTeam(v.tenantId, req.body || {}, v.userId, req.params.id); return svc.listTeams(v.tenantId); });
export const adminRemove = adminOnly(async (req, v) => { await svc.removeTeam(v.tenantId, req.params.id); return svc.listTeams(v.tenantId); });
export const adminOverview = adminOnly((req, v) => svc.overview(v.tenantId, String(req.query.day || '')));

export const teamDay = wrap((req, v) => svc.teamDay(v, req.params.id, String(req.query.day || '')));
export const saveTargets = wrap((req, v) => svc.saveTargets(v, req.params.id, req.body || {}));
export const memberDay = wrap((req, v) => svc.memberDay(v, req.params.userId, String(req.query.day || '')));
export const review = wrap((req, v) => svc.reviewMember(v, req.params.userId, req.body || {}));

export const myDay = wrap((req, v) => svc.memberDay(v, v.userId, String(req.query.day || '')));
export const myNote = wrap((req, v) => svc.saveNote(v, req.body || {}));
export const myHistory = wrap((_req, v) => svc.myHistory(v));

// Lead report (stages, sub-stages, follow-ups, probables) — services/salesLeadReport.ts
export const leadReport = wrap((req, v) => report.leadReport(v, { ...(req.query as any), exportAll: req.query.export === '1' }));
export const probableBatches = wrap((_req, v) => report.probableBatches(v));
export const markProbable = wrap((req, v) => report.markProbable(v, req.params.leadId, req.body || {}));
export const unmarkProbable = wrap((req, v) => report.unmarkProbable(v, req.params.leadId));
