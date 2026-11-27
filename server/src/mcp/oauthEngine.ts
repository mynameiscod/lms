import OAuth2Server from '@node-oauth/oauth2-server';
import mongoose, { ClientSession } from 'mongoose';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import McpOAuthGrant from '../models/McpOAuthGrant';
import McpOAuthCode from '../models/McpOAuthCode';
import McpOAuthAccessToken from '../models/McpOAuthAccessToken';
import McpOAuthRefreshToken from '../models/McpOAuthRefreshToken';
import { McpClient, McpError, mcpConfig, registeredClient } from './oauthPolicy';
import { generateOpaqueToken, registeredRedirect, tokenDigest } from './oauthSecurity';
import { identityFor, McpIdentity } from './identity';
import { audit } from './audit';

export const ACCESS_SECONDS = 900;
export const REFRESH_SECONDS = 7 * 86400;
export const GRANT_SECONDS = 30 * 86400;
export const transactionOptions = { readConcern: { level: 'snapshot' as const }, writeConcern: { w: 'majority' as const }, maxCommitTimeMS: 10000 };

// Mongoose 7's driver returns a commit result, not the callback value.
export async function inTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  let result: T;
  await mongoose.connection.transaction(async session => { result = await work(session); }, transactionOptions);
  return result!;
}

export function authenticateClient(req: Request, body: Record<string, string>): McpClient {
  const header = req.headers.authorization;
  let id = body.client_id;
  let secret: string | undefined;
  if (header) {
    if (!/^Basic [A-Za-z0-9+/]+=*$/.test(header) || header.length > 2048 || body.client_secret || body.client_id) throw new McpError('invalid_client', 401);
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const colon = decoded.indexOf(':');
    if (colon < 1) throw new McpError('invalid_client', 401);
    try {
      id = decodeURIComponent(decoded.slice(0, colon).replace(/\+/g, ' '));
      secret = decodeURIComponent(decoded.slice(colon + 1).replace(/\+/g, ' '));
    } catch { throw new McpError('invalid_client', 401); }
  }
  const client = registeredClient(id);
  if (client.tokenEndpointAuthMethod === 'client_secret_basic') {
    if (!secret || !timingSafeEqual(Buffer.from(tokenDigest(secret)), Buffer.from(client.secretHash!))) throw new McpError('invalid_client', 401);
  } else if (header || body.client_secret) throw new McpError('invalid_client', 401);
  return client;
}

export async function activeGrant(id: any, session?: ClientSession, lock = false) {
  const config = mcpConfig();
  const filter = { _id: id, issuer: config.issuer, audience: config.resource, revokedAt: null, expiresAt: { $gt: new Date() } };
  const grant = lock
    ? await McpOAuthGrant.findOneAndUpdate(filter, { $inc: { version: 1 } }, { new: true, session }).lean()
    : await McpOAuthGrant.findOne(filter).session(session || null).lean();
  if (!grant) throw new McpError('invalid_grant');
  const client = registeredClient(grant.clientId);
  const identity = await identityFor(grant.userId, grant.tenantId, session);
  if (identity.credentialVersion !== grant.credentialVersion ||
      !grant.scopes.every(s => client.scopes.includes(s))) throw new McpError('invalid_grant');
  return { grant, identity };
}

export async function revokeGrant(id: any, session?: ClientSession) {
  await McpOAuthGrant.updateOne({ _id: id, revokedAt: null }, { $set: { revokedAt: new Date() }, $inc: { version: 1 } }, { session });
}

/** One model instance per request; no request identity is kept in global mutable state. */
function engine(client: McpClient, session: ClientSession, resource: string, issuer: string, consentGrant?: any) {
  let currentGrant = consentGrant;
  const oauthClient = { id: client.id, grants: ['authorization_code', 'refresh_token'], redirectUris: client.redirectUris };
  const invalid = () => new OAuth2Server.InvalidGrantError('Invalid grant');
  async function loadGrant(id: any) {
    try {
      const result = await activeGrant(id, session, true);
      if (result.grant.clientId !== client.id || result.grant.audience !== resource || result.grant.issuer !== issuer) throw invalid();
      currentGrant = result.grant;
      return result;
    } catch (e) {
      if (e instanceof McpError) throw invalid();
      throw e;
    }
  }
  const model: any = {
    // Credentials were verified by authenticateClient before the library is called.
    getClient: async (id: string) => id === client.id ? oauthClient : false,
    validateRedirectUri: async (uri: string) => registeredRedirect(uri, client.redirectUris),
    validateScope: async (_user: any, _client: any, scopes: string[]) =>
      scopes?.every(s => currentGrant.scopes.includes(s)) ? scopes : false,
    generateAccessToken: generateOpaqueToken,
    generateRefreshToken: generateOpaqueToken,
    generateAuthorizationCode: generateOpaqueToken,
    saveAuthorizationCode: async (code: any, _client: any, user: any) => {
      await McpOAuthCode.create([{
        codeHash: tokenDigest(code.authorizationCode), clientId: client.id,
        userId: currentGrant.userId, tenantId: currentGrant.tenantId,
        grantId: currentGrant._id, scopes: code.scope, audience: resource, issuer,
        redirectUri: code.redirectUri, challenge: code.codeChallenge,
        expiresAt: code.expiresAt, purgeAt: currentGrant.expiresAt,
      }], { session });
      return { ...code, client: oauthClient, user };
    },
    getAuthorizationCode: async (raw: string) => {
      const code = await McpOAuthCode.findOne({ codeHash: tokenDigest(raw), clientId: client.id, audience: resource, issuer }).session(session).lean();
      if (!code) return false;
      await loadGrant(code.grantId);
      if (code.consumedAt) { await revokeGrant(code.grantId, session); throw invalid(); }
      return { authorizationCode: raw, expiresAt: code.expiresAt, redirectUri: code.redirectUri,
        codeChallenge: code.challenge, codeChallengeMethod: 'S256', scope: code.scopes,
        client: oauthClient, user: { id: String(code.userId) } };
    },
    revokeAuthorizationCode: async (code: any) => {
      const consumed = await McpOAuthCode.updateOne({ codeHash: tokenDigest(code.authorizationCode), consumedAt: null,
        expiresAt: { $gt: new Date() } }, { $set: { consumedAt: new Date() } }, { session });
      return consumed.modifiedCount === 1;
    },
    getRefreshToken: async (raw: string) => {
      const token = await McpOAuthRefreshToken.findOne({ tokenHash: tokenDigest(raw), clientId: client.id }).session(session).lean();
      if (!token) return false;
      await loadGrant(token.grantId);
      if (token.usedAt) { await revokeGrant(token.grantId, session); throw invalid(); }
      return { refreshToken: raw, refreshTokenExpiresAt: token.expiresAt, scope: token.scopes,
        client: oauthClient, user: { id: String(currentGrant.userId) } };
    },
    revokeToken: async (token: any) => {
      const used = await McpOAuthRefreshToken.updateOne({ tokenHash: tokenDigest(token.refreshToken), usedAt: null,
        expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } }, { session });
      return used.modifiedCount === 1;
    },
    saveToken: async (token: any, _client: any, user: any) => {
      // Re-evaluate role permissions at exchange time, not only when consent was shown.
      const identity = await identityFor(currentGrant.userId, currentGrant.tenantId, session);
      const scopes = token.scope.filter((s: string) => s === 'offline_access' || identity.permissions.includes(s));
      if (!scopes.includes('mcp_connect')) throw invalid();
      const accessTokenExpiresAt = new Date(Math.min(token.accessTokenExpiresAt.getTime(), currentGrant.expiresAt.getTime()));
      await McpOAuthAccessToken.create([{
        tokenHash: tokenDigest(token.accessToken), userId: currentGrant.userId, tenantId: currentGrant.tenantId,
        clientId: client.id, grantId: currentGrant._id, issuer, audience: resource, scopes, expiresAt: accessTokenExpiresAt,
      }], { session });
      let refreshToken: string | undefined;
      let refreshTokenExpiresAt: Date | undefined;
      if (scopes.includes('offline_access')) {
        refreshToken = token.refreshToken;
        refreshTokenExpiresAt = new Date(Math.min(Date.now() + REFRESH_SECONDS * 1000, currentGrant.expiresAt.getTime()));
        await McpOAuthRefreshToken.create([{ tokenHash: tokenDigest(refreshToken), clientId: client.id,
          grantId: currentGrant._id, scopes, expiresAt: refreshTokenExpiresAt, purgeAt: currentGrant.expiresAt }], { session });
      }
      await audit('oauth_token', 'allowed', 'issued', {
        userId: currentGrant.userId, tenantId: currentGrant.tenantId, clientId: client.id,
      }, undefined, session);
      return { accessToken: token.accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, scope: scopes, client: oauthClient, user };
    },
  };
  return new OAuth2Server({ model, accessTokenLifetime: ACCESS_SECONDS, refreshTokenLifetime: REFRESH_SECONDS,
    authorizationCodeLifetime: 300, requirePKCE: true, enablePlainPKCE: false,
    requireClientAuthentication: { authorization_code: false, refresh_token: false }, allowEmptyState: true } as any);
}

export async function issueCode(parameters: Record<string, string>, client: McpClient, identity: McpIdentity, session: ClientSession) {
  const config = mcpConfig();
  const scopes = parameters.scope.split(' ');
  if (!scopes.every(s => s === 'offline_access' || identity.permissions.includes(s))) throw new McpError('invalid_scope');
  const [grant] = await McpOAuthGrant.create([{
    userId: identity.user._id, tenantId: identity.user.tenantId, clientId: client.id,
    issuer: config.issuer, audience: config.resource, scopes, credentialVersion: identity.credentialVersion,
    expiresAt: new Date(Date.now() + GRANT_SECONDS * 1000),
  }], { session });
  const response = new OAuth2Server.Response();
  await engine(client, session, config.resource, config.issuer, grant).authorize(
    new OAuth2Server.Request({ method: 'GET', query: parameters, headers: {} }), response,
    { authenticateHandler: { handle: async () => ({ id: String(identity.user._id) }) } },
  );
  const location = new URL(response.headers.location);
  location.searchParams.set('iss', config.issuer);
  await audit('oauth_consent', 'allowed', 'granted', { userId: grant.userId, tenantId: grant.tenantId, clientId: client.id }, undefined, session);
  return location.toString();
}

export async function exchangeToken(body: Record<string, string>, client: McpClient) {
  const config = mcpConfig();
  if (!['authorization_code', 'refresh_token'].includes(body.grant_type)) throw new McpError('unsupported_grant_type');
  if (body.resource !== config.resource) throw new McpError('invalid_target');
  // The library owns grant/PKCE validation; our adapter owns persistence and family replay detection.
  return inTransaction(async session => {
    const response = new OAuth2Server.Response();
    try {
      await engine(client, session, config.resource, config.issuer).token(new OAuth2Server.Request({
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded',
          'content-length': String(Buffer.byteLength(new URLSearchParams({ ...body, client_id: client.id }).toString())) }, query: {},
        body: { ...body, client_id: client.id },
      }), response);
      return { status: 200, body: response.body };
    } catch (error: any) {
      // Commit deliberate consumption/replay revocation on protocol errors. DB or audit failures
      // throw through the transaction and roll back; never return a token after partial persistence.
      if (!(error instanceof OAuth2Server.OAuthError) || error.code >= 500) throw (error as any).inner || error;
      const code = ['invalid_grant', 'invalid_request', 'invalid_scope', 'invalid_client'].includes(error.name) ? error.name : 'invalid_grant';
      await audit('oauth_token', 'denied', code, { clientId: client.id }, undefined, session);
      return { status: 400, body: { error: code } };
    }
  });
}
