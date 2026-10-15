import express, { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import mcpRouter from './router';
import oauthRouter, { endpoint } from './oauthRoutes';
import { McpError, mcpConfig, SCOPE_LABELS } from './oauthPolicy';
import { ipKey, rateLimit } from './rateLimit';
import { audit } from './audit';

const router = express.Router();
// Mounted BEFORE the LMS CORS, request logger, error logger and body parser.
// OAuth codes, state, credentials and token responses must never enter those logs.
router.use((req: Request, res: Response, next: NextFunction) => {
  if (!(req.path === '/mcp' || req.path.startsWith('/mcp/') || req.path === '/mcp-oauth' || req.path.startsWith('/mcp-oauth/') ||
    req.path === '/.well-known/oauth-authorization-server' || req.path === '/.well-known/oauth-protected-resource' ||
    req.path === '/.well-known/oauth-protected-resource/mcp')) return next('router');
  res.locals.requestId = randomUUID();
  res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache', 'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'X-Request-ID': res.locals.requestId,
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" });
  if (process.env.MCP_ENABLED !== 'true') return res.status(404).end();
  return endpoint('mcp_transport', async (request, response) => {
    const config = mcpConfig();
    if (process.env.NODE_ENV === 'production' && (!request.secure || request.get('host') !== config.host)) throw new McpError('invalid_transport', 400);
    const origin = request.headers.origin;
    if (origin && !config.origins.includes(origin)) throw new McpError('invalid_origin', 403);
    response.vary('Origin');
    if (origin) response.set('Access-Control-Allow-Origin', origin);
    response.set({ 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, MCP-Protocol-Version',
      'Access-Control-Expose-Headers': 'WWW-Authenticate, X-Request-ID, Retry-After' });
    await rateLimit(`mcp-ip:${ipKey(request)}`, 300);
    if (request.method === 'OPTIONS') return response.status(204).end();
    next();
  })(req, res);
});
router.use(express.json({ limit: '32kb', strict: true }));
router.use(express.urlencoded({ extended: false, limit: '16kb', parameterLimit: 20 }));
router.get('/.well-known/oauth-authorization-server', endpoint('oauth_metadata', async (_req, res) => {
  const { issuer } = mcpConfig();
  return res.json({ issuer, authorization_endpoint: `${issuer}/mcp-oauth/authorize`, token_endpoint: `${issuer}/mcp-oauth/token`,
    revocation_endpoint: `${issuer}/mcp-oauth/revoke`, response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'], code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_basic'], revocation_endpoint_auth_methods_supported: ['none', 'client_secret_basic'],
    scopes_supported: Object.keys(SCOPE_LABELS), authorization_response_iss_parameter_supported: true });
}));
router.get(['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp'], endpoint('resource_metadata', async (_req, res) => {
  const { resource, issuer } = mcpConfig();
  return res.json({ resource, authorization_servers: [issuer], scopes_supported: ['mcp_connect'], bearer_methods_supported: ['header'],
    resource_name: 'CodeBegun Universal MCP' });
}));
router.use('/mcp-oauth', oauthRouter);
router.use('/mcp', mcpRouter);
router.use((_req, res) => res.status(404).json({ error: 'not_found' }));
router.use(async (error: any, _req: Request, res: Response, _next: NextFunction) => {
  let status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 503;
  try { await audit('mcp_transport', status === 503 ? 'failed' : 'denied', status === 503 ? 'unavailable' : 'invalid_body', {}, res.locals.requestId); }
  catch { status = 503; }
  return res.status(status).json({ error: status === 503 ? 'temporarily_unavailable' : 'invalid_request' });
});
export default router;
