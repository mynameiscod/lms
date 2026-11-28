import express from 'express';
import request from 'supertest';
import router from '../mcp/router';
import User from '../models/User';
import * as auditStore from '../mcp/audit';
import { LMS_USERS_FILTER } from '../services/learnerAudience';

// Exercise the real protocol router, tool validation and tenant query builder;
// OAuth identity resolution and database I/O have their own integration coverage.
jest.mock('../mcp/oauthAuth', () => ({
  mcpOAuthAuth: (_req: any, _res: any, next: any) => next(),
}));

const tenantId = '111111111111111111111111';
let context: any;
const app = express();
app.use(express.json());
app.use((_req, res, next) => { res.locals.mcp = context; next(); });
app.use('/mcp', router);
const send = (method: string, params?: any) => request(app).post('/mcp').send({ jsonrpc: '2.0', id: 1, method, params });
const call = (extra: any = {}) => send('tools/call', { name: 'codebegun_student_count', arguments: {}, ...extra });

beforeEach(() => {
  context = { clientId: 'protocol-test', scopes: ['mcp_connect', 'mcp_students_read'], identity: {
    user: { _id: '222222222222222222222222', tenantId, role: 'TENANT_ADMIN' }, tenant: {}, modules: {},
    permissions: ['mcp_connect', 'mcp_students_read', 'view_enrolled_students'],
  } };
  jest.spyOn(User, 'countDocuments').mockReturnValue({ maxTimeMS: jest.fn().mockResolvedValue(2) } as any);
  jest.spyOn(auditStore, 'audit').mockResolvedValue(undefined);
});

test.each([undefined, {}, { progressToken: 0 }, { progressToken: 'call-1' },
  { 'openai/locale': 'en-US', 'com.example/context': { value: 'opaque' } },
])('tool calls accept optional protocol metadata %j', async metadata => {
  const result = await call(metadata === undefined ? {} : { _meta: metadata });
  expect(result.body.error).toBeUndefined();
  expect(JSON.parse(result.body.result.content[0].text)).toEqual({ count: 2 });
});

test('tool discovery accepts metadata and still filters by granted scope', async () => {
  const result = await send('tools/list', { _meta: { progressToken: 0, 'openai/locale': 'en-US' } });
  expect(result.body.error).toBeUndefined();
  expect(result.body.result.tools.map((tool: any) => tool.name)).toEqual(['codebegun_student_count', 'codebegun_students']);
});

test('metadata cannot change the tenant query or enter responses and audits', async () => {
  const result = await call({ _meta: { tenantId: 'foreign-tenant', arguments: { studentId: 'foreign-student' },
    scopes: ['mcp_calls_read'], 'com.example/private': 'do-not-log-metadata' } });
  expect(result.body.error).toBeUndefined();
  expect(User.countDocuments).toHaveBeenCalledWith({ $and: [{ tenantId }, {}, { role: 'STUDENT', isActive: true }, LMS_USERS_FILTER] });
  expect(JSON.stringify((auditStore.audit as jest.Mock).mock.calls)).not.toContain('do-not-log-metadata');
  expect(result.text).not.toContain('do-not-log-metadata');
});

test('metadata cannot restore a missing current LMS permission', async () => {
  context.identity.permissions = [];
  const result = await call({ _meta: { permissions: ['mcp_students_read', 'view_enrolled_students'] } });
  expect(result.body.error).toEqual({ code: -32003, message: 'permission_denied' });
  expect(User.countDocuments).not.toHaveBeenCalled();
});

test.each([null, [], 'en-US', { progressToken: null }, { progressToken: false }, { progressToken: {} }])(
  'rejects malformed protocol metadata %j', async metadata => {
    for (const result of [await call({ _meta: metadata }), await send('tools/list', { _meta: metadata })]) {
      expect(result.body.error).toEqual({ code: -32602, message: 'invalid_params' });
    }
    expect(User.countDocuments).not.toHaveBeenCalled();
  });

test('metadata support does not permit extra tool arguments or request parameters', async () => {
  const argument = await call({ arguments: { _meta: { tenantId: 'foreign' } } });
  expect(argument.body.error).toEqual({ code: -32602, message: 'invalid_arguments' });
  for (const extra of [{ tenantId: 'foreign' }, { task: { ttl: 1000 } }]) {
    expect((await call(extra)).body.error).toEqual({ code: -32602, message: 'invalid_params' });
  }
  expect(User.countDocuments).not.toHaveBeenCalled();
});
