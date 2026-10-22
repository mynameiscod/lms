import { acceptReadConsent, readConsentOffer } from '../mcp/oauthConsent';
import { McpClient } from '../mcp/oauthPolicy';

const scopes = ['mcp_connect', 'mcp_students_read', 'mcp_batches_read', 'offline_access'];
let identity: any;
let client: McpClient;
beforeEach(() => {
  identity = { user: { role: 'SUPER_ADMIN' }, tenant: {}, modules: { courses: true },
    permissions: ['mcp_connect', 'mcp_students_read', 'mcp_batches_read', 'manage_all_users', 'view_courses'] };
  client = { id: 'production-client', name: 'Production', applicationType: 'web',
    redirectUris: ['https://assistant.example/callback'], tokenEndpointAuthMethod: 'none', scopes: [...scopes] };
});

test.each([['mcp_connect'], ['mcp_connect', 'offline_access']].map(requested => ({ requested })))('connect-only request $requested offers only registered and usable reads', ({ requested }) => {
  expect(readConsentOffer(identity, client, requested)).toEqual(scopes);
});

test('a specific read request retains its chosen scope instead of offering more access', () => {
  expect(readConsentOffer(identity, client, ['mcp_connect', 'mcp_students_read'])).toEqual([]);
  expect(() => acceptReadConsent(scopes, identity, client, ['mcp_connect', 'mcp_students_read'])).toThrow('invalid_scope');
});

test('read offers honor client registration, native permissions, role opt-in and enabled modules', () => {
  client.scopes = ['mcp_connect', 'mcp_students_read'];
  expect(readConsentOffer(identity, client, ['mcp_connect'])).toEqual(client.scopes);
  client.scopes = [...scopes];
  identity.modules.courses = false;
  expect(readConsentOffer(identity, client, ['mcp_connect'])).toEqual(['mcp_connect', 'mcp_students_read', 'offline_access']);
  identity.permissions = identity.permissions.filter((p: string) => p !== 'manage_all_users');
  expect(readConsentOffer(identity, client, ['mcp_connect'])).toEqual([]);
  identity.modules.courses = true;
  identity.permissions = ['mcp_connect', 'view_courses', 'manage_all_users'];
  expect(readConsentOffer(identity, client, ['mcp_connect'])).toEqual([]);
});

test.each([undefined, [], ['mcp_connect'], ['mcp_connect', 'offline_access'],
  ['mcp_connect', 'mcp_finance_read'], ['mcp_connect', { scope: 'mcp_students_read' }]].map(offered => ({ offered })))('rejects an absent or invalid stored offer $offered', ({ offered }) => {
  expect(() => acceptReadConsent(offered, identity, client, ['mcp_connect'])).toThrow('invalid_scope');
});

test('new permissions after the consent page cannot enlarge its stored offer', () => {
  const offered = ['mcp_connect', 'mcp_students_read'];
  expect(acceptReadConsent(offered, identity, client, ['mcp_connect'])).toBe(offered.join(' '));
});

test.each(['client', 'module', 'role', 'native'])('rejects an offer when its %s permission is removed before consent', source => {
  const offered = readConsentOffer(identity, client, ['mcp_connect']);
  if (source === 'client') client.scopes = client.scopes.filter(s => s !== 'mcp_students_read');
  if (source === 'module') identity.modules.courses = false;
  if (source === 'role') identity.permissions = identity.permissions.filter((p: string) => p !== 'mcp_students_read');
  if (source === 'native') identity.permissions = identity.permissions.filter((p: string) => p !== 'manage_all_users');
  expect(() => acceptReadConsent(offered, identity, client, ['mcp_connect'])).toThrow('invalid_scope');
});
