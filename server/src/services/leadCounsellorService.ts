/**
 * Who can own (be assigned) leads — the "counsellors" every lead screen lists.
 *
 * Owner decision (2026-11-07): Super Admin, Tenant Admin ("System Admin"), and staff whose
 * custom role's NAME contains "BDM" (BDM, Senior BDM, BDM Lead…). Everyone else — trainers,
 * placement staff, plain staff — is hidden from counsellor lists and cannot be assigned leads.
 */
import mongoose from 'mongoose';
import User from '../models/User';
import Role from '../models/Role';

const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN'];
const COUNSELLOR_ROLE_NAME = /bdm/i;

async function bdmRoleIds(tenantId: string): Promise<mongoose.Types.ObjectId[]> {
  const roles = await Role.find({ $or: [{ tenantId: new mongoose.Types.ObjectId(tenantId) }, { tenantId: null }] }).select('name').lean();
  return roles.filter((r: any) => COUNSELLOR_ROLE_NAME.test(r.name || '')).map((r: any) => r._id);
}

/** Active counsellors of an institute, admins first, then by name. */
export async function listCounsellors(tenantId: string) {
  const roleIds = await bdmRoleIds(tenantId);
  const users = await User.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    isActive: { $ne: false },
    $or: [{ role: { $in: ADMIN_ROLES } }, ...(roleIds.length ? [{ customRoleId: { $in: roleIds } }] : [])],
  }).select('firstName lastName email role customRoleId').populate('customRoleId', 'name').lean();
  const rank = (u: any) => (u.role === 'SUPER_ADMIN' ? 0 : u.role === 'TENANT_ADMIN' ? 1 : 2);
  return users
    .map((u: any) => ({
      _id: String(u._id), firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role,
      roleName: u.customRoleId?.name || (u.role === 'SUPER_ADMIN' ? 'Super Admin' : u.role === 'TENANT_ADMIN' ? 'System Admin' : u.role),
    }))
    .sort((a, b) => rank(a) - rank(b) || `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
}

/** Can this user be assigned leads? */
export async function isCounsellor(tenantId: string, userId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return false;
  const u: any = await User.findOne({ _id: userId, tenantId: new mongoose.Types.ObjectId(tenantId), isActive: { $ne: false } }).select('role customRoleId').lean();
  if (!u) return false;
  if (ADMIN_ROLES.includes(u.role)) return true;
  if (!u.customRoleId) return false;
  const role: any = await Role.findById(u.customRoleId).select('name').lean();
  return COUNSELLOR_ROLE_NAME.test(role?.name || '');
}

export const COUNSELLOR_RULE_TEXT = 'Only Super Admin, System Admin and staff with a BDM role can be assigned leads.';
