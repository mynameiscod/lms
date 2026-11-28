import { mcpConfig, registeredClient, parseScopes, scalarParameters, SCOPE_LABELS } from '../mcp/oauthPolicy';

const client = { id: 'test-client', name: 'Assistant', applicationType: 'web', tokenEndpointAuthMethod: 'none',
  redirectUris: ['https://assistant.example/callback'], scopes: Object.keys(SCOPE_LABELS) };
const saved = { ...process.env };
beforeEach(() => {
  process.env.MCP_ISSUER_URL = 'https://lms.example';
  process.env.MCP_RESOURCE_URL = 'https://lms.example/mcp';
  process.env.MCP_OAUTH_CLIENTS = JSON.stringify([client]);
  delete process.env.MCP_ALLOWED_ORIGINS;
});
afterAll(() => { process.env = saved; });

describe('MCP configuration and OAuth policy', () => {
  test('uses explicit pre-registration and exact resource', () => {
    expect(registeredClient(client.id).id).toBe(client.id);
    expect(mcpConfig().resource).toBe('https://lms.example/mcp');
    expect(() => registeredClient('not-registered')).toThrow('invalid_client');
  });
  test.each(['http://lms.example', 'https://lms.example/path', 'https://user:pass@lms.example', 'https://lms.example/'])('rejects unsafe issuer %s', issuer => {
    process.env.MCP_ISSUER_URL = issuer;
    expect(() => mcpConfig()).toThrow('mcp_not_configured');
  });
  test('has no production localhost exception', () => {
    process.env.NODE_ENV = 'production';
    process.env.MCP_ISSUER_URL = 'http://localhost:5000';
    process.env.MCP_RESOURCE_URL = 'http://localhost:5000/mcp';
    expect(() => mcpConfig()).toThrow('mcp_not_configured');
    process.env.NODE_ENV = 'test';
  });
  test.each([
    { redirectUris: ['https://*.example/cb'] }, { redirectUris: ['http://example/cb'] },
    { redirectUris: ['https://example/cb#fragment'] }, { tokenEndpointAuthMethod: 'client_secret_post' },
    { tokenEndpointAuthMethod: 'client_secret_basic', secretHash: 'weak' }, { scopes: ['mcp_connect', 'mcp_write'] },
  ])('rejects malformed client metadata %j', override => {
    process.env.MCP_OAUTH_CLIENTS = JSON.stringify([{ ...client, ...override }]);
    expect(() => mcpConfig()).toThrow('mcp_not_configured');
  });
  test('rejects duplicates, empty registration and wildcard origins', () => {
    process.env.MCP_OAUTH_CLIENTS = JSON.stringify([client, client]);
    expect(() => mcpConfig()).toThrow();
    process.env.MCP_OAUTH_CLIENTS = '[]';
    expect(() => mcpConfig()).toThrow();
    process.env.MCP_OAUTH_CLIENTS = JSON.stringify([client]);
    process.env.MCP_ALLOWED_ORIGINS = '*';
    expect(() => mcpConfig()).toThrow();
  });
  test('validates scopes without granting more authority', () => {
    expect(parseScopes('mcp_connect offline_access mcp_connect', client as any)).toEqual(['mcp_connect', 'offline_access']);
    expect(() => parseScopes('mcp_connect mcp_write', client as any)).toThrow('invalid_scope');
    expect(() => parseScopes('offline_access', client as any)).toThrow('invalid_scope');
    expect(() => parseScopes('mcp_connect\nmcp_students_read', client as any)).toThrow('invalid_scope');
  });
  test.each([{ client_id: ['a', 'b'] }, { client_id: { $ne: null } }, { unexpected: 'x' }])('rejects parameter pollution %j', value => {
    expect(() => scalarParameters(value, ['client_id'])).toThrow('invalid_request');
  });
});
