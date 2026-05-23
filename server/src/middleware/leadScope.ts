import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import User from '../models/User';
import Role from '../models/Role';
import { ROLE_PERMISSIONS } from './roleGuard';

export type DataScope = 'ALL' | 'TEAM' | 'OWN';

/**
 * Resolve the user's effective lead data scope.
 * Priority: user.leadDataScope (explicit) > custom role inference > base role inference
 *
 * ALL  — sees every lead in the tenant (Admin)
 * TEAM — sees leads assigned to self + users who report to them (Manager)
 * OWN  — sees only leads assigned to self (Telecaller)
 */
export async function resolveLeadScope(req: AuthenticatedRequest): Promise<DataScope> {
  const user = req.user!;

  // 1. Explicit scope override on user document
  // Fetch fresh user to get leadDataScope
  const fullUser = await User.findById(user.id).select('leadDataScope role customRoleId').lean();
  if (fullUser?.leadDataScope) {
    return fullUser.leadDataScope as DataScope;
  }

  // 2. Check effective permissions to infer scope
  let permissions: string[];
  if (fullUser?.customRoleId) {
    const customRole = await Role.findById(fullUser.customRoleId);
    permissions = customRole?.permissions || [];
  } else {
    permissions = ROLE_PERMISSIONS[user.role] || [];
  }

  // manage_leads = full admin = ALL
  if (permissions.includes('manage_leads')) return 'ALL';
  // assign_leads = manager-level = TEAM
  if (permissions.includes('assign_leads')) return 'TEAM';
  // view_leads or any lead permission = OWN
  return 'OWN';
}

/**
 * Build a MongoDB filter condition that restricts lead visibility by scope.
 * Returns an object to merge into the query filter.
 */
export async function buildLeadScopeFilter(req: AuthenticatedRequest): Promise<Record<string, any>> {
  const scope = await resolveLeadScope(req);

  if (scope === 'ALL') {
    // Admin: see everything in tenant
    return {};
  }

  if (scope === 'TEAM') {
    // Manager: see leads assigned to self + direct reports
    const teamMembers = await User.find({
      tenantId: req.tenantId,
      managerId: req.user!.id,
      isActive: true
    }).select('_id').lean();

    const teamIds = teamMembers.map(m => m._id);
    teamIds.push(new mongoose.Types.ObjectId(String(req.user!.id)) as any); // include self

    return { assignedTo: { $in: teamIds } };
  }

  // OWN: only leads assigned to this user
  return { assignedTo: new mongoose.Types.ObjectId(String(req.user!.id)) };
}

/**
 * Middleware that attaches leadScope and leadScopeFilter to the request
 * so controllers can use them without re-computing.
 */
export const attachLeadScope = () => {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const scope = await resolveLeadScope(req);
      const scopeFilter = await buildLeadScopeFilter(req);
      (req as any).leadScope = scope;
      (req as any).leadScopeFilter = scopeFilter;
      next();
    } catch (error) {
      next(error);
    }
  };
};
