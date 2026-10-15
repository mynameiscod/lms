import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import User from '../models/User';
import Role from '../models/Role';
import McpOAuthAccessToken from '../models/McpOAuthAccessToken';
import { tokenDigest } from './oauthSecurity';
import { permissionsOf } from '../middleware/roleGuard';

/**
 * OAuth resource authentication, separate from ordinary LMS session JWTs.
 * Tokens are opaque, audience-bound, expiring and revocable. No token issuer
 * is exposed until a complete authorization-code + PKCE flow is available.
 */
export async function mcpOAuthAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const bearer = /^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(req.headers.authorization || '');
  if (!bearer) return res.status(401).set('WWW-Authenticate', 'Bearer').json({ error: 'invalid_token' });
  const audience = process.env.MCP_RESOURCE_URL;
  if (!audience || !audience.startsWith('https://')) return res.status(503).json({ error: 'mcp_not_configured' });
  try {
    const token = await McpOAuthAccessToken.findOne({
      tokenHash: tokenDigest(bearer[1]), audience,
      revokedAt: { $exists: false }, expiresAt: { $gt: new Date() },
    }).lean();
    if (!token) return res.status(401).set('WWW-Authenticate', 'Bearer error="invalid_token"').json({ error: 'invalid_token' });
    const user = await User.findOne({ _id: token.userId, tenantId: token.tenantId, isActive: true })
      .select('role customRoleId tenantId email isActive').lean();
    if (!user) return res.status(401).json({ error: 'invalid_token' });
    if (user.customRoleId) {
      const role = await Role.exists({ _id: user.customRoleId, tenantId: token.tenantId });
      if (!role) return res.status(403).json({ error: 'invalid_role' });
    }
    const permissions = await permissionsOf({ role: user.role, customRoleId: user.customRoleId });
    if (!permissions.includes('mcp_connect')) return res.status(403).json({ error: 'insufficient_scope' });
    req.user = {
      id: String(user._id), email: user.email, role: user.role,
      tenantId: String(token.tenantId), customRoleId: user.customRoleId ? String(user.customRoleId) : null,
    };
    return next();
  } catch {
    return res.status(503).json({ error: 'authorization_unavailable' });
  }
}
