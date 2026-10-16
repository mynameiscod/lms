import express from 'express';
import request from 'supertest';
import { createHash } from 'crypto';
import oauthRouter from '../mcp/oauthRoutes';
import Session from '../models/McpOAuthSession';
import * as auditStore from '../mcp/audit';
import { SCOPE_LABELS } from '../mcp/oauthPolicy';

const saved = { ...process.env };
const issuer = 'https://lms.example';
const redirect = 'https://chatgpt.com/connector_platform_oauth_redirect';
const clientId = 'chatgpt-route-test';
const parameters = {
  response_type: 'code', client_id: clientId, redirect_uri: redirect,
  scope: Object.keys(SCOPE_LABELS).join(' '), state: 'route-test-state', resource: `${issuer}/mcp`,
  code_challenge: createHash('sha256').update('test-verifier-' + 'a'.repeat(43)).digest('base64url'),
  code_challenge_method: 'S256',
};
const app = express();
app.use('/mcp-oauth', oauthRouter);

beforeAll(() => {
  process.env.MCP_ISSUER_URL = issuer;
  process.env.MCP_RESOURCE_URL = `${issuer}/mcp`;
  delete process.env.MCP_ALLOWED_ORIGINS;
  process.env.MCP_OAUTH_CLIENTS = JSON.stringify([{
    id: clientId, name: 'ChatGPT test', applicationType: 'web', redirectUris: [redirect],
    scopes: Object.keys(SCOPE_LABELS), tokenEndpointAuthMethod: 'none',
  }]);
});
beforeEach(() => {
  jest.spyOn(Session, 'create').mockResolvedValue({} as any);
  jest.spyOn(auditStore, 'audit').mockResolvedValue(undefined);
});
afterAll(() => { process.env = saved; });

test.each([undefined, 'en-US', 'te-IN fr-CA en'])('shows the login page with optional ui_locales=%s', async uiLocales => {
  const query = { ...parameters, ...(uiLocales === undefined ? {} : { ui_locales: uiLocales }) };
  const result = await request(app).get('/mcp-oauth/authorize').query(query);
  expect(result.status).toBe(200);
  expect(result.text).toContain('Sign in to CodeBegun');
  expect(result.headers['set-cookie'][0]).toContain('HttpOnly');
  expect(Session.create).toHaveBeenCalledWith(expect.objectContaining({ parameters }));
  expect((Session.create as jest.Mock).mock.calls[0][0].parameters).not.toHaveProperty('ui_locales');
});

test.each([
  { name: 'duplicate', suffix: 'ui_locales=en-US&ui_locales=te-IN' },
  { name: 'structured', suffix: 'ui_locales[language]=en-US' },
  { name: 'oversized', suffix: `ui_locales=${'a'.repeat(4097)}` },
])('rejects $name locale hints', async ({ suffix }) => {
  const result = await request(app).get(`/mcp-oauth/authorize?${new URLSearchParams(parameters)}&${suffix}`);
  expect(result.status).toBe(400);
  expect(result.body).toEqual({ error: 'invalid_request' });
  expect(Session.create).not.toHaveBeenCalled();
});

test('a locale hint cannot bypass PKCE validation', async () => {
  const result = await request(app).get('/mcp-oauth/authorize').query({
    ...parameters, ui_locales: 'en-US', code_challenge_method: 'plain',
  });
  expect(result.status).toBe(400);
  expect(result.body).toEqual({ error: 'invalid_request' });
  expect(Session.create).not.toHaveBeenCalled();
});
