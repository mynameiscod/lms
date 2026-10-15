import { ClientSession } from 'mongoose';
import User from '../models/User';
import Tenant from '../models/Tenant';
import Role from '../models/Role';
import { ROLE_PERMISSIONS } from '../middleware/roleGuard';
import { effectiveModules } from '../config/tenantModules';
import { McpError } from './oauthPolicy';
import { tokenDigest } from './oauthSecurity';

export async function identityFor(userId: any, tenantId: any, session?: ClientSession) {
  const user = await User.findOne({ _id: userId, tenantId, isActive: true })
    .select('email firstName lastName role tenantId batchId customRoleId leadDataScope password').session(session || null).lean();
  const tenant = user && await Tenant.findOne({ _id: tenantId, isActive: true })
    .select('name modules studentFeatures').session(session || null).lean();
  if (!user || !tenant) throw new McpError('invalid_token', 401);
  // Do not use permissionsOf's legacy fallback for missing/deleted custom roles.
  const role = user.customRoleId && await Role.findOne({ _id: user.customRoleId, tenantId }).session(session || null).lean();
  if (user.customRoleId && !role) throw new McpError('insufficient_scope', 403);
  const permissions: string[] = role ? role.permissions : ROLE_PERMISSIONS[user.role] || [];
  if (!permissions.includes('mcp_connect') || user.role === 'GUEST') throw new McpError('insufficient_scope', 403);
  const credentialVersion = tokenDigest(user.password);
  delete user.password;
  return { user, tenant, permissions, credentialVersion, modules: effectiveModules(tenant.modules as any) };
}
export type McpIdentity = Awaited<ReturnType<typeof identityFor>>;
