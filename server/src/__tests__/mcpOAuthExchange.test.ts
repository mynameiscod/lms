import request from 'supertest';
import express from 'express';
import crypto from 'crypto';

const mockFindOne = jest.fn();
const mockConsume = jest.fn();
const mockTokenCreate = jest.fn();
jest.mock('../models/McpOAuthCode', () => ({
  __esModule: true, default: { findOne: (...args: any[]) => mockFindOne(...args), findOneAndUpdate: (...args: any[]) => mockConsume(...args) }
}));
jest.mock('../models/McpOAuthAccessToken', () => ({
  __esModule: true, default: { create: (...args: any[]) => mockTokenCreate(...args) }
}));

import oauthRoutes from '../mcp/oauthRoutes';
const app = express();
app.use(express.json());
app.use('/mcp-oauth', oauthRoutes);
const verifier = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
const redirect = 'https://client.example.com/callback';
const clientId = 'codebegun-test-client';
const code = 'c'.repeat(50);
const send = (extra: Record<string, unknown> = {}) => request(app).post('/mcp-oauth/token').send({
  grant_type: 'authorization_code', code, client_id: clientId,
  redirect_uri: redirect, code_verifier: verifier, ...extra,
});

describe('MCP OAuth code exchange', () => {
  const savedEnv = { node: process.env.NODE_ENV, clients: process.env.MCP_OAUTH_CLIENT_IDS };
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.MCP_OAUTH_CLIENT_IDS = clientId;
    mockFindOne.mockResolvedValue({
      _id: 'code-id', challenge, redirectUri: redirect,
      userId: '507f1f77bcf86cd799439011', tenantId: '507f1f77bcf86cd799439012',
      audience: 'https://mcp.example.com/mcp',
    });
    mockConsume.mockResolvedValue({
      _id: 'code-id', userId: '507f1f77bcf86cd799439011',
      tenantId: '507f1f77bcf86cd799439012', audience: 'https://mcp.example.com/mcp',
    });
    mockTokenCreate.mockResolvedValue({});
  });
  afterAll(() => {
    if (savedEnv.node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = savedEnv.node;
    if (savedEnv.clients === undefined) delete process.env.MCP_OAUTH_CLIENT_IDS;
    else process.env.MCP_OAUTH_CLIENT_IDS = savedEnv.clients;
  });
  test('rejects an unregistered client', async () => {
    expect((await send({ client_id: 'unregistered-client' })).body.error).toBe('invalid_client');
    expect(mockFindOne).not.toHaveBeenCalled();
  });
  test('rejects an incorrect PKCE verifier', async () => {
    expect((await send({ code_verifier: verifier + 'x' })).body.error).toBe('invalid_grant');
    expect(mockConsume).not.toHaveBeenCalled();
  });
  test('rejects expired or unknown authorization codes', async () => {
    mockFindOne.mockResolvedValue(null);
    expect((await send()).body.error).toBe('invalid_grant');
    expect(mockTokenCreate).not.toHaveBeenCalled();
  });
  test('rejects a replayed code', async () => {
    mockConsume.mockResolvedValue(null);
    expect((await send()).body.error).toBe('invalid_grant');
    expect(mockTokenCreate).not.toHaveBeenCalled();
  });
  test('issues a short-lived bearer after valid one-time exchange', async () => {
    const r = await send();
    expect(r.status).toBe(200);
    expect(r.body.token_type).toBe('Bearer');
    expect(r.body.expires_in).toBe(900);
    expect(r.body.access_token).toHaveLength(43);
    expect(mockTokenCreate).toHaveBeenCalledTimes(1);
    expect(mockTokenCreate.mock.calls[0][0].tokenHash).not.toBe(r.body.access_token);
  });
  test('is unavailable in production', async () => {
    process.env.NODE_ENV = 'production';
    expect((await send()).status).toBe(404);
  });
});
