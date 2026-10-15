import { authenticateClient } from '../mcp/oauthEngine';
import { tokenDigest } from '../mcp/oauthSecurity';
const secret = 'test-secret-with-at-least-32-random-bytes';
const saved = { ...process.env };
beforeAll(() => {
  process.env.MCP_ISSUER_URL = 'https://lms.example';
  process.env.MCP_RESOURCE_URL = 'https://lms.example/mcp';
  process.env.MCP_OAUTH_CLIENTS = JSON.stringify([
    { id: 'public-client', name: 'Public', applicationType: 'web', redirectUris: ['https://assistant.example/cb'], scopes: ['mcp_connect'], tokenEndpointAuthMethod: 'none' },
    { id: 'secret-client', name: 'Confidential', applicationType: 'web', redirectUris: ['https://assistant.example/cb'], scopes: ['mcp_connect'], tokenEndpointAuthMethod: 'client_secret_basic', secretHash: tokenDigest(secret) },
  ]);
});
afterAll(() => { process.env = saved; });
const req = (authorization?: string) => ({ headers: { ...(authorization ? { authorization } : {}) } } as any);
const basic = (id: string, password: string) => 'Basic ' + Buffer.from(`${id}:${password}`).toString('base64');
test('public clients use registered client id without a secret', () => {
  expect(authenticateClient(req(), { client_id: 'public-client' }).id).toBe('public-client');
});
test('confidential clients must authenticate even with PKCE', () => {
  expect(() => authenticateClient(req(), { client_id: 'secret-client', code_verifier: 'a'.repeat(43) })).toThrow('invalid_client');
  expect(authenticateClient(req(basic('secret-client', secret)), {}).id).toBe('secret-client');
  expect(() => authenticateClient(req(basic('secret-client', 'wrong')), {})).toThrow('invalid_client');
});
test('rejects mixed credentials and unsupported authentication methods', () => {
  expect(() => authenticateClient(req(basic('secret-client', secret)), { client_id: 'secret-client' })).toThrow();
  expect(() => authenticateClient(req(), { client_id: 'secret-client', client_secret: secret })).toThrow();
  expect(() => authenticateClient(req('Bearer x'), { client_id: 'public-client' })).toThrow();
  expect(() => authenticateClient(req(basic('public-client', 'secret')), {})).toThrow();
});
