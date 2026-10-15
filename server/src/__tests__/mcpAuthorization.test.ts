import request from 'supertest';
import express from 'express';
import mcpRouter from '../mcp/router';

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: '507f1f77bcf86cd799439011', tenantId: '507f1f77bcf86cd799439012', role: 'INSTRUCTOR' };
    next();
  }
}));
jest.mock('../middleware/tenantResolver', () => ({
  tenantResolver: (req: any, _res: any, next: any) => {
    req.tenantId = req.user.tenantId;
    next();
  }
}));
jest.mock('../middleware/roleGuard', () => ({ permissionsOf: jest.fn().mockResolvedValue([]) }));
jest.mock('../models/Role', () => ({ __esModule: true, default: { exists: jest.fn() } }));

const app = express();
app.use(express.json());
app.use('/mcp', mcpRouter);

describe('MCP authorization', () => {
  test('denies initialize without mcp_connect', async () => {
    const r = await request(app).post('/mcp').send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    expect(r.body.error.code).toBe(-32003);
  });
  test('denies tool listing without mcp_connect', async () => {
    const r = await request(app).post('/mcp').send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect(r.body.error.code).toBe(-32003);
  });
  test('rejects malformed JSON-RPC envelope', async () => {
    const r = await request(app).post('/mcp').send({ method: 'tools/list', id: 3 });
    expect(r.body.error.code).toBe(-32600);
  });
  test('rejects unauthenticated notification without access', async () => {
    const r = await request(app).post('/mcp').send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(r.status).toBe(403);
  });
});
