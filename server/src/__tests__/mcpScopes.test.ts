import request from 'supertest';
import express from 'express';

const USER_ID = '507f1f77bcf86cd799439011';
const TENANT_ID = '507f1f77bcf86cd799439012';
const BATCH_ID = '507f1f77bcf86cd799439013';
const mockIdentity = { id: USER_ID, tenantId: TENANT_ID, role: 'INSTRUCTOR' };
const mockPermissions = jest.fn();
const mockBatches = jest.fn();
const mockAttendanceAggregate = jest.fn();
const mockExamAggregate = jest.fn();
const mockFeeAggregate = jest.fn();
const mockUserCount = jest.fn();
const mockCallAggregate = jest.fn();

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => { req.user = { ...mockIdentity }; next(); }
}));
jest.mock('../middleware/tenantResolver', () => ({
  tenantResolver: (req: any, _res: any, next: any) => { req.tenantId = req.user.tenantId; next(); }
}));
jest.mock('../middleware/roleGuard', () => ({ permissionsOf: (...args: any[]) => mockPermissions(...args) }));
jest.mock('../models/Role', () => ({ __esModule: true, default: { exists: jest.fn(), findOne: jest.fn() } }));
jest.mock('../models/Batch', () => ({
  __esModule: true, default: { find: (...args: any[]) => ({ distinct: () => mockBatches(...args) }) }
}));
jest.mock('../models/Attendance', () => ({
  __esModule: true, default: { aggregate: (...args: any[]) => mockAttendanceAggregate(...args) }
}));
jest.mock('../models/Exam', () => ({
  __esModule: true, default: { aggregate: (...args: any[]) => mockExamAggregate(...args) }
}));
jest.mock('../models/Fee', () => ({
  __esModule: true, default: { aggregate: (...args: any[]) => mockFeeAggregate(...args) }
}));
jest.mock('../models/User', () => ({
  __esModule: true, default: { countDocuments: (...args: any[]) => mockUserCount(...args) }
}));
jest.mock('../models/OutperoCall', () => ({
  __esModule: true, default: { aggregate: (...args: any[]) => mockCallAggregate(...args), find: jest.fn() }
}));
jest.mock('../models/Lead', () => ({ __esModule: true, default: { aggregate: jest.fn() } }));

import mcpRouter from '../mcp/router';
const app = express();
app.use(express.json());
app.use('/mcp', mcpRouter);
const invoke = (name: string, args: object = {}) => request(app).post('/mcp')
  .send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });

describe('MCP domain permission and tenant scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdentity.role = 'INSTRUCTOR';
    mockPermissions.mockResolvedValue(['mcp_connect', 'mcp_attendance_read', 'mcp_assessments_read', 'mcp_students_read']);
    mockBatches.mockResolvedValue([BATCH_ID]);
    mockAttendanceAggregate.mockResolvedValue([{ _id: 'present', count: 2 }]);
    mockExamAggregate.mockResolvedValue([{ _id: 'pass', count: 2 }]);
    mockFeeAggregate.mockResolvedValue([]);
    mockCallAggregate.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(2);
  });

  test('authorized instructor sees only their own attendance batches and tenant', async () => {
    const r = await invoke('codebegun_attendance_summary', { days: 7 });
    expect(r.body.error).toBeUndefined();
    const pipeline = mockAttendanceAggregate.mock.calls[0][0];
    expect(String(pipeline[0].$match.tenantId)).toBe(TENANT_ID);
    expect(pipeline[0].$match.batchId.$in).toEqual([BATCH_ID]);
    expect(pipeline[0].$match.date.$gte).toBeInstanceOf(Date);
  });

  test('instructor exam query stays within assigned batches', async () => {
    const r = await invoke('codebegun_exam_summary');
    expect(r.body.error).toBeUndefined();
    const match = mockExamAggregate.mock.calls[0][0][0].$match;
    expect(String(match.tenantId)).toBe(TENANT_ID);
    expect(match.batchId.$in).toEqual([BATCH_ID]);
  });

  test('instructor without assigned batches cannot read academic aggregates', async () => {
    mockBatches.mockResolvedValue([]);
    const r = await invoke('codebegun_attendance_summary');
    expect(r.body.error.code).toBe(-32003);
    expect(mockAttendanceAggregate).not.toHaveBeenCalled();
  });

  test('instructor cannot read finance or calls even with a domain permission', async () => {
    mockPermissions.mockResolvedValue(['mcp_connect', 'mcp_finance_read', 'mcp_calls_read']);
    expect((await invoke('codebegun_fee_summary')).body.error.code).toBe(-32003);
    expect((await invoke('codebegun_call_summary')).body.error.code).toBe(-32003);
    expect(mockFeeAggregate).not.toHaveBeenCalled();
    expect(mockCallAggregate).not.toHaveBeenCalled();
  });

  test('permission revocation takes effect on next request', async () => {
    expect((await invoke('codebegun_student_count')).body.error).toBeUndefined();
    mockPermissions.mockResolvedValue(['mcp_connect']);
    expect((await invoke('codebegun_student_count')).body.error.code).toBe(-32003);
    expect(mockUserCount).toHaveBeenCalledTimes(1);
  });

  test('student count includes tenant and assigned batch filter', async () => {
    const r = await invoke('codebegun_student_count');
    expect(r.body.error).toBeUndefined();
    expect(mockUserCount).toHaveBeenCalledWith({
      tenantId: TENANT_ID, role: 'STUDENT', isActive: true, batchId: { $in: [BATCH_ID] }
    });
  });

  test('admin attendance query uses tenant scope without instructor batch restriction', async () => {
    mockIdentity.role = 'TENANT_ADMIN';
    const r = await invoke('codebegun_attendance_summary');
    expect(r.body.error).toBeUndefined();
    const match = mockAttendanceAggregate.mock.calls[0][0][0].$match;
    expect(String(match.tenantId)).toBe(TENANT_ID);
    expect(match.batchId).toBeUndefined();
    expect(mockBatches).not.toHaveBeenCalled();
  });

  test('invalid date window is rejected before a database aggregate', async () => {
    expect((await invoke('codebegun_attendance_summary', { days: 1000 })).body.error.code).toBe(-32602);
    expect(mockAttendanceAggregate).not.toHaveBeenCalled();
  });
});
