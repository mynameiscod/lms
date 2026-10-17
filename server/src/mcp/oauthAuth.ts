import { Response, NextFunction, Request } from 'express';
import McpOAuthAccessToken from '../models/McpOAuthAccessToken';
import { mcpConfig, McpError } from './oauthPolicy';
import { tokenDigest } from './oauthSecurity';
import { activeGrant } from './oauthEngine';
import { audit } from './audit';
import { rateLimit } from './rateLimit';

export function challenge(error?: string) {
  return `Bearer resource_metadata="${mcpConfig().issuer}/.well-known/oauth-protected-resource/mcp", scope="mcp_connect"${error ? `, error="${error}"` : ''}`;
}

/** OAuth is the only transport credential, in every environment. No LMS JWT bypass. */
export async function mcpOAuthAuth(req: Request, res: Response, next: NextFunction) {
  let identity: any = {};
  try {
    const config = mcpConfig();
    const bearer = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(req.headers.authorization || '');
    if (!bearer || Object.keys(req.query).length) throw new McpError('invalid_token', 401);
    const token = await McpOAuthAccessToken.findOne({ tokenHash: tokenDigest(bearer[1]), issuer: config.issuer,
      audience: config.resource, revokedAt: null, expiresAt: { $gt: new Date() } }).lean();
    if (!token) throw new McpError('invalid_token', 401);
    identity = { userId: token.userId, tenantId: token.tenantId, clientId: token.clientId };
    const context = await activeGrant(token.grantId);
    if (String(token.userId) !== String(context.grant.userId) || String(token.tenantId) !== String(context.grant.tenantId) ||
        token.clientId !== context.grant.clientId || !token.scopes.includes('mcp_connect') ||
        !token.scopes.every(s => context.grant.scopes.includes(s))) throw new McpError('invalid_token', 401);
    await rateLimit(`mcp-user:${token.tenantId}:${token.userId}`, 120);
    res.locals.mcp = { ...context, scopes: token.scopes, clientId: token.clientId };
    return next();
  } catch (error) {
    let status = error instanceof McpError ? error.status : 503;
    if (status === 400 || (error instanceof McpError && error.code === 'invalid_client')) status = 401;
    const code = status === 403 ? 'insufficient_scope' : status === 429 ? 'rate_limit_exceeded' : status === 401 ? 'invalid_token' : 'authorization_unavailable';
    try { await audit('mcp_auth', status >= 500 ? 'failed' : 'denied', code, identity, res.locals.requestId); }
    catch { status = 503; }
    if (status === 401 || status === 403) res.set('WWW-Authenticate', challenge(code));
    if (status === 429) res.set('Retry-After', '60');
    return res.status(status).json({ error: status === 503 ? 'authorization_unavailable' : code });
  }
}
