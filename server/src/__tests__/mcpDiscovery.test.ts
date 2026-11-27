import express from 'express';
import request from 'supertest';
import mcp from '../mcp';
import McpOAuthAccessToken from '../models/McpOAuthAccessToken';
import * as oauthEngine from '../mcp/oauthEngine';
import * as auditStore from '../mcp/audit';
import * as limiter from '../mcp/rateLimit';

const saved = { ...process.env };
const issuer = 'https://production.example';
const resourceScopes = ['mcp_connect', 'mcp_students_read', 'mcp_batches_read'];
const app = express().use(mcp);
const userId = '111111111111111111111111';
const tenantId = '222222222222222222222222';
let tokenScopes: string[];
let identity: any;
const send = (token = false) => {
  const r = request(app).post('/mcp').send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
  return token ? r.set('Authorization', 'Bearer ' + 'a'.repeat(43)) : r;
};
const challengeScopes = (r: any) => /(?:^|,\s*)scope="([^"]+)"/.exec(r.headers['www-authenticate'] || '')?.[1].split(' ');

beforeEach(() => {
  process.env.MCP_ENABLED = 'true';
  process.env.MCP_ISSUER_URL = issuer;
  process.env.MCP_RESOURCE_URL = issuer + '/mcp';
  process.env.MCP_OAUTH_CLIENTS = JSON.stringify([{ id: 'production-client', name: 'Production', applicationType: 'web',
    redirectUris: ['https://assistant.example/callback'], tokenEndpointAuthMethod: 'none', scopes: [...resourceScopes, 'offline_access'] }]);
  tokenScopes = [...resourceScopes];
  identity = { user: { _id: userId, tenantId, role: 'SUPER_ADMIN' }, tenant: {}, modules: { courses: true },
    permissions: [...resourceScopes, 'manage_all_users', 'view_courses'] };
  jest.spyOn(limiter, 'rateLimit').mockResolvedValue(undefined);
  jest.spyOn(auditStore, 'audit').mockResolvedValue(undefined);
  jest.spyOn(McpOAuthAccessToken, 'findOne').mockImplementation(() => ({ lean: async () => ({ userId, tenantId,
    grantId: 'grant', clientId: 'production-client', scopes: tokenScopes }) } as any));
  jest.spyOn(oauthEngine, 'activeGrant').mockImplementation(async () => ({ identity,
    grant: { userId, tenantId, clientId: 'production-client', scopes: [...resourceScopes, 'offline_access'] } } as any));
});
afterAll(() => { process.env = saved; });

test('following the unauthenticated challenge discovers the three configured production tools', async () => {
  const denied = await send();
  expect(denied.status).toBe(401);
  tokenScopes = challengeScopes(denied)!;
  const listed = await send(true);
  expect(listed.status).toBe(200);
  expect(listed.body.result.tools.map((t: any) => t.name)).toEqual([
    'codebegun_student_count', 'codebegun_students', 'codebegun_batches',
  ]);
  expect(listed.body.result.tools.map((t: any) => t.securitySchemes)).toEqual([
    [{ type: 'oauth2', scopes: ['mcp_connect', 'mcp_students_read'] }],
    [{ type: 'oauth2', scopes: ['mcp_connect', 'mcp_students_read'] }],
    [{ type: 'oauth2', scopes: ['mcp_connect', 'mcp_batches_read'] }],
  ]);
});

test.each(['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp'])(
  'resource metadata advertises only configured resource scopes: %s', async path => {
    const result = await request(app).get(path);
    expect(result.status).toBe(200);
    expect(result.body.scopes_supported).toEqual(resourceScopes);
    expect(challengeScopes(await send())).toEqual(result.body.scopes_supported);
    const authorizationServer = await request(app).get('/.well-known/oauth-authorization-server');
    expect(authorizationServer.body.scopes_supported).toContain('offline_access');
  });

test('a legacy connect-only grant receives a scope challenge instead of an empty tool catalog', async () => {
  tokenScopes = ['mcp_connect'];
  const result = await send(true);
  expect(result.status).toBe(403);
  expect(result.body.error.message).toBe('insufficient_scope');
  expect(challengeScopes(result)).toEqual(resourceScopes);
  expect(tokenScopes).toEqual(['mcp_connect']); // Reauthorization, never a silent grant expansion.
});

test('scope recovery respects current native permissions and enabled modules', async () => {
  tokenScopes = ['mcp_connect'];
  identity.modules.courses = false;
  expect(challengeScopes(await send(true))).toEqual(['mcp_connect', 'mcp_students_read']);
  identity.permissions = ['mcp_connect'];
  const result = await send(true);
  expect(result.status).toBe(200);
  expect(result.body.result.tools).toEqual([]);
  expect(result.headers['www-authenticate']).toBeUndefined();
});
