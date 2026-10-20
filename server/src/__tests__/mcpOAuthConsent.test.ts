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

test('a partial read request can explicitly approve additional usable reads', () => {
  const requested = ['mcp_connect', 'mcp_students_read'];
  expect(readConsentOffer(identity, client, requested)).toEqual(scopes);
  expect(acceptReadConsent(scopes, identity, client, requested)).toBe(scopes.join(' '));
  expect(requested).toEqual(['mcp_connect', 'mcp_students_read']);
});

test('the old three-tool request offers all eight domains after reviewed access expansion', () => {
  const expanded = ['mcp_connect', 'mcp_students_read', 'mcp_batches_read', 'mcp_attendance_read',
    'mcp_assessments_read', 'mcp_finance_read', 'mcp_placements_read', 'mcp_leads_read', 'mcp_calls_read'];
  identity.permissions = [...expanded, 'manage_all_users', 'view_courses', 'view_attendance',
    'view_exams', 'view_fees', 'view_placement', 'manage_leads'];
  identity.modules = { courses: true, attendance: true, feeManagement: true, placement: true, leads: true };
  client.scopes = [...expanded, 'offline_access'];
  expect(readConsentOffer(identity, client, scopes.slice(0, 3))).toEqual(client.scopes);
});

test('requests already covering all usable reads have no expansion offer', () => {
  for (const requested of [scopes, scopes.slice(0, 3)]) {
    expect(readConsentOffer(identity, client, requested)).toEqual([]);
    expect(() => acceptReadConsent(scopes, identity, client, requested)).toThrow('invalid_scope');
  }
});

test('partial-request offers omit offline access unless the client allows it', () => {
  client.scopes = scopes.slice(0, 3);
  expect(readConsentOffer(identity, client, ['mcp_connect', 'mcp_students_read'])).toEqual(client.scopes);
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
