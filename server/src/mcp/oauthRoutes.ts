import express, { Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import McpOAuthSession from '../models/McpOAuthSession';
import McpOAuthGrant from '../models/McpOAuthGrant';
import McpOAuthAccessToken from '../models/McpOAuthAccessToken';
import McpOAuthRefreshToken from '../models/McpOAuthRefreshToken';
import { authenticateLmsCredentials } from '../services/lmsCredentials';
import { generateOpaqueToken, registeredRedirect, tokenDigest, validPkceChallenge } from './oauthSecurity';
import { McpError, mcpConfig, parseScopes, registeredClient, scalarParameters, SCOPE_LABELS } from './oauthPolicy';
import { authenticateClient, exchangeToken, issueCode, revokeGrant, inTransaction } from './oauthEngine';
import { identityFor } from './identity';
import { audit } from './audit';
import { ipKey, rateLimit } from './rateLimit';

export const oauthRouter = express.Router();
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const field = (name: string, value: string) => `<input type="hidden" name="${name}" value="${esc(value)}">`;
const cookieName = () => mcpConfig().secure ? '__Secure-codebegun-mcp' : 'codebegun-mcp';
const cookieOptions = () => ({ httpOnly: true, secure: mcpConfig().secure, sameSite: 'lax' as const, path: '/mcp-oauth', maxAge: 10 * 60 * 1000 });
function clearSessionCookie(res: Response) {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(cookieName(), options);
}

function page(res: Response, title: string, content: string, status = 200) {
  return res.status(status).type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | CodeBegun</title><style>body{margin:0;background:#f4f7fb;font:16px/1.6 system-ui;color:#16233e}main{max-width:560px;margin:6vh auto;padding:32px;background:white;border-radius:16px;box-shadow:0 12px 40px #051d6414}h1{color:#051d64;font-size:26px}label{display:block;margin:14px 0}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #9cacbd;border-radius:6px;font:inherit}button{padding:12px 20px;margin:12px 8px 0 0;background:#051d64;color:white;border:0;border-radius:6px;font:inherit;cursor:pointer}button.secondary{background:#e8edf4;color:#051d64}.brand{color:#339aad;font-weight:700}.error{color:#a32121}article{border-top:1px solid #dae1eb;padding:16px 0}small{overflow-wrap:anywhere}@media(max-width:640px){main{margin:16px;padding:24px}}</style></head><body><main><div class="brand">CodeBegun</div><h1>${esc(title)}</h1>${content}</main></body></html>`);
}

/** Sanitized protocol failures and a mandatory audit write; never log the request body or URL. */
export function endpoint(tool: string, fn: (req: Request, res: Response) => Promise<any>) {
  return async (req: Request, res: Response) => {
    try { await fn(req, res); }
    catch (error) {
      const known = error instanceof McpError;
      const code = known ? error.code : 'temporarily_unavailable';
      let status = known ? error.status : 503;
      try { await audit(tool, status >= 500 ? 'failed' : 'denied', code, {}, res.locals.requestId); }
      catch { status = 503; }
      if (status === 429) res.set('Retry-After', '60');
      if (status === 401 && code === 'invalid_client') res.set('WWW-Authenticate', 'Basic realm="CodeBegun OAuth"');
      res.status(status).json({ error: status === 503 ? 'temporarily_unavailable' : code });
    }
  };
}

function authorizationParameters(query: unknown) {
  const params = scalarParameters(query, ['response_type', 'client_id', 'redirect_uri', 'scope', 'state', 'resource', 'code_challenge', 'code_challenge_method', 'ui_locales']);
  // ChatGPT sends this optional UI language hint. Our login currently uses
  // English; accept the bounded scalar without saving or acting on the hint.
  delete params.ui_locales;
  const config = mcpConfig();
  const client = registeredClient(params.client_id);
  if (params.response_type !== 'code') throw new McpError('unsupported_response_type');
  if (!registeredRedirect(params.redirect_uri, client.redirectUris)) throw new McpError('invalid_request');
  if (params.resource !== config.resource) throw new McpError('invalid_target');
  if (params.code_challenge_method !== 'S256' || !validPkceChallenge(params.code_challenge)) throw new McpError('invalid_request');
  if (params.state && (params.state.length > 1024 || /[^\x20-\x7e]/.test(params.state))) throw new McpError('invalid_request');
  params.scope = parseScopes(params.scope || 'mcp_connect', client).join(' ');
  return { params, client };
}

async function newSession(res: Response, purpose: 'authorize' | 'connections', parameters: Record<string, string> = {}) {
  const token = generateOpaqueToken();
  const csrf = generateOpaqueToken();
  await McpOAuthSession.create({ tokenHash: tokenDigest(token), csrfHash: tokenDigest(csrf), purpose, parameters,
    expiresAt: new Date(Date.now() + 600000) });
  res.cookie(cookieName(), token, cookieOptions());
  return csrf;
}

function sessionToken(req: Request) {
  const matches = (req.headers.cookie || '').split(';').map(c => c.trim()).filter(c => c.startsWith(`${cookieName()}=`));
  if (matches.length !== 1) throw new McpError('invalid_session', 403);
  const token = matches[0].slice(cookieName().length + 1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new McpError('invalid_session', 403);
  return token;
}

async function browserSession(req: Request, authenticated = false) {
  // CSRF tokens are mandatory; when Origin is sent it must be exactly first-party.
  if (req.headers.origin && req.headers.origin !== mcpConfig().issuer) throw new McpError('invalid_origin', 403);
  if (req.headers['sec-fetch-site'] === 'cross-site') throw new McpError('invalid_origin', 403);
  const session = await McpOAuthSession.findOne({ tokenHash: tokenDigest(sessionToken(req)), expiresAt: { $gt: new Date() } }).lean();
  if (!session || typeof req.body.csrf !== 'string' || req.body.csrf.length > 128 ||
      !timingSafeEqual(Buffer.from(tokenDigest(req.body.csrf)), Buffer.from(session.csrfHash))) throw new McpError('invalid_session', 403);
  if (authenticated && !session.userId) throw new McpError('invalid_session', 403);
  return session;
}

function loginPage(res: Response, csrf: string, clientName?: string) {
  return page(res, 'Sign in to CodeBegun', `<p>${clientName ? `Connect <strong>${esc(clientName)}</strong> using your existing LMS account.` : 'Sign in to manage your connected AI assistants.'}</p><form method="post" action="/mcp-oauth/login">${field('csrf', csrf)}<label>Email<input type="email" name="email" autocomplete="username" required maxlength="254"></label><label>Password<input type="password" name="password" autocomplete="current-password" required maxlength="256"></label><button type="submit">Continue</button></form><p><small>Your password stays with CodeBegun. The assistant receives access only after you approve.</small></p>`);
}

async function connectionsPage(res: Response, identity: Awaited<ReturnType<typeof identityFor>>, csrf: string) {
  const grants = await McpOAuthGrant.find({ userId: identity.user._id, tenantId: identity.user.tenantId, revokedAt: null,
    expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).limit(100).lean();
  const clients = mcpConfig().clients;
  return page(res, 'Connected assistants', `<p>${esc(identity.user.email)} · ${esc(identity.tenant.name)}</p>${grants.length ? grants.map(g => `<article><strong>${esc(clients.find(c => c.id === g.clientId)?.name || g.clientId)}</strong><p>${g.scopes.map(s => esc(SCOPE_LABELS[s] || s)).join('<br>')}</p><small>Expires ${g.expiresAt.toISOString()}</small><form method="post" action="/mcp-oauth/disconnect">${field('csrf', csrf)}${field('grant_id', String(g._id))}<button>Disconnect</button></form></article>`).join('') : '<p>No active connections.</p>'}<form method="post" action="/mcp-oauth/disconnect">${field('csrf', csrf)}${field('grant_id', 'all')}<button class="secondary">Disconnect all assistants</button></form><form method="post" action="/mcp-oauth/logout">${field('csrf', csrf)}<button class="secondary">Sign out</button></form>`);
}

oauthRouter.get('/authorize', endpoint('oauth_authorize', async (req, res) => {
  const { params, client } = authorizationParameters(req.query);
  const csrf = await newSession(res, 'authorize', params);
  await audit('oauth_authorize', 'allowed', 'started', { clientId: client.id }, res.locals.requestId);
  return loginPage(res, csrf, client.name);
}));

oauthRouter.get('/connections', endpoint('oauth_connections', async (_req, res) => {
  const csrf = await newSession(res, 'connections');
  return loginPage(res, csrf);
}));

oauthRouter.post('/login', endpoint('oauth_login', async (req, res) => {
  const body = scalarParameters(req.body, ['csrf', 'email', 'password']);
  const browser = await browserSession(req);
  if (browser.userId || !body.email || body.email.length > 254 || !body.password || body.password.length > 256) throw new McpError('invalid_request');
  await rateLimit(`login-ip:${ipKey(req)}`, 20, 900);
  await rateLimit(`login-account:${body.email.trim().toLowerCase()}`, 10, 900);
  let credentials;
  try { credentials = await authenticateLmsCredentials(body.email.trim().toLowerCase(), body.password); }
  catch (error: any) {
    if (!['Invalid credentials', 'Your account has been deactivated. Please contact your administrator.',
      'Your institute\'s account is not active. Please contact the platform administrator.'].includes(error.message)) throw error;
    throw new McpError('invalid_credentials', 401);
  }
  const identity = await identityFor(credentials.user._id, credentials.user.tenantId);
  if (identity.credentialVersion !== tokenDigest(credentials.user.password)) throw new McpError('invalid_credentials', 401);
  const token = generateOpaqueToken();
  const csrf = generateOpaqueToken();
  const updated = await McpOAuthSession.findOneAndUpdate({ _id: browser._id, tokenHash: browser.tokenHash, userId: null }, {
    $set: { tokenHash: tokenDigest(token), csrfHash: tokenDigest(csrf), userId: identity.user._id,
      tenantId: identity.user.tenantId, credentialVersion: identity.credentialVersion, expiresAt: new Date(Date.now() + 600000) },
  }, { new: true });
  if (!updated) throw new McpError('invalid_session', 403);
  await audit('oauth_login', 'allowed', 'authenticated', { userId: identity.user._id, tenantId: identity.user.tenantId }, res.locals.requestId);
  res.cookie(cookieName(), token, cookieOptions());
  if (browser.purpose === 'connections') return connectionsPage(res, identity, csrf);
  const { params, client } = authorizationParameters(browser.parameters);
  if (!params.scope.split(' ').every(s => s === 'offline_access' || identity.permissions.includes(s))) throw new McpError('invalid_scope', 403);
  return page(res, 'Approve assistant access', `<p><strong>${esc(client.name)}</strong> wants to access <strong>${esc(identity.tenant.name)}</strong> as ${esc(identity.user.email)}.</p><ul>${params.scope.split(' ').map(s => `<li>${esc(SCOPE_LABELS[s])}</li>`).join('')}</ul><p>Your current LMS permissions and record restrictions apply to every request. You can disconnect at any time.</p><form method="post" action="/mcp-oauth/consent">${field('csrf', csrf)}<button name="decision" value="approve">Allow access</button><button class="secondary" name="decision" value="deny">Deny</button></form>`);
}));

oauthRouter.post('/consent', endpoint('oauth_consent', async (req, res) => {
  const body = scalarParameters(req.body, ['csrf', 'decision']);
  const browser = await browserSession(req, true);
  if (browser.purpose !== 'authorize' || !['approve', 'deny'].includes(body.decision)) throw new McpError('invalid_request');
  const { params, client } = authorizationParameters(browser.parameters);
  const location = await inTransaction(async session => {
    const consumed = await McpOAuthSession.findOneAndDelete({ _id: browser._id, tokenHash: browser.tokenHash, expiresAt: { $gt: new Date() } }, { session });
    if (!consumed) throw new McpError('invalid_session', 403);
    const identity = await identityFor(browser.userId, browser.tenantId, session);
    if (identity.credentialVersion !== browser.credentialVersion) throw new McpError('invalid_session', 403);
    if (body.decision === 'deny') {
      const url = new URL(params.redirect_uri);
      url.searchParams.set('error', 'access_denied');
      url.searchParams.set('iss', mcpConfig().issuer);
      if (params.state) url.searchParams.set('state', params.state);
      await audit('oauth_consent', 'denied', 'user_denied', { userId: browser.userId, tenantId: browser.tenantId, clientId: client.id }, res.locals.requestId, session);
      return url.toString();
    }
    return issueCode(params, client, identity, session);
  });
  clearSessionCookie(res);
  return res.redirect(303, location);
}));

oauthRouter.post('/token', endpoint('oauth_token', async (req, res) => {
  if (!req.is('application/x-www-form-urlencoded')) throw new McpError('invalid_request');
  const body = scalarParameters(req.body, ['grant_type', 'code', 'client_id', 'redirect_uri', 'code_verifier', 'resource', 'refresh_token', 'scope']);
  const client = authenticateClient(req, body);
  await rateLimit(`token-client:${client.id}:${ipKey(req)}`, 60);
  const result = await exchangeToken(body, client);
  return res.status(result.status).json(result.body);
}));

oauthRouter.post('/revoke', endpoint('oauth_revoke', async (req, res) => {
  if (!req.is('application/x-www-form-urlencoded')) throw new McpError('invalid_request');
  const body = scalarParameters(req.body, ['token', 'token_type_hint', 'client_id']);
  const client = authenticateClient(req, body);
  if (!body.token || body.token.length > 512) throw new McpError('invalid_request');
  // RFC 7009: unknown tokens and wrong-owner tokens receive the same empty 200.
  await inTransaction(async session => {
    const query = { tokenHash: tokenDigest(body.token), clientId: client.id };
    const token = await McpOAuthRefreshToken.findOne(query).session(session).lean() ||
      await McpOAuthAccessToken.findOne(query).session(session).lean();
    if (token) await revokeGrant(token.grantId, session);
    await audit('oauth_revoke', 'allowed', 'revocation_processed', { clientId: client.id }, res.locals.requestId, session);
  });
  return res.status(200).end();
}));

oauthRouter.post('/disconnect', endpoint('oauth_disconnect', async (req, res) => {
  const body = scalarParameters(req.body, ['csrf', 'grant_id']);
  const browser = await browserSession(req, true);
  if (browser.purpose !== 'connections' || (body.grant_id !== 'all' && !/^[a-f0-9]{24}$/.test(body.grant_id || ''))) throw new McpError('invalid_request');
  const identity = await identityFor(browser.userId, browser.tenantId);
  if (identity.credentialVersion !== browser.credentialVersion) throw new McpError('invalid_session', 403);
  await inTransaction(async session => {
    await McpOAuthGrant.updateMany({ userId: browser.userId, tenantId: browser.tenantId, revokedAt: null,
      ...(body.grant_id === 'all' ? {} : { _id: body.grant_id }) }, { $set: { revokedAt: new Date() }, $inc: { version: 1 } }, { session });
    await audit('oauth_disconnect', 'allowed', 'disconnected', { userId: browser.userId, tenantId: browser.tenantId }, res.locals.requestId, session);
  });
  return connectionsPage(res, identity, body.csrf);
}));

oauthRouter.post('/logout', endpoint('oauth_logout', async (req, res) => {
  scalarParameters(req.body, ['csrf']);
  const browser = await browserSession(req);
  await McpOAuthSession.deleteOne({ _id: browser._id, tokenHash: browser.tokenHash });
  clearSessionCookie(res);
  return page(res, 'Signed out', '<p>You have signed out of connection management.</p>');
}));
export default oauthRouter;
