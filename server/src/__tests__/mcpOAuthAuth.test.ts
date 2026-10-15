import { mcpOAuthAuth } from '../mcp/oauthAuth';

jest.mock('../models/McpOAuthAccessToken', () => ({
  __esModule: true, default: { findOne: jest.fn() }
}));
jest.mock('../models/User', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../models/Role', () => ({ __esModule: true, default: { exists: jest.fn() } }));
jest.mock('../middleware/roleGuard', () => ({ permissionsOf: jest.fn() }));

describe('OAuth MCP resource authorization', () => {
  const previous = process.env.MCP_RESOURCE_URL;
  beforeEach(() => { process.env.MCP_RESOURCE_URL = 'https://mcp.codebegun.com/mcp'; });
  afterAll(() => {
    if (previous === undefined) delete process.env.MCP_RESOURCE_URL;
    else process.env.MCP_RESOURCE_URL = previous;
  });
  test('rejects a missing bearer credential', async () => {
    const status = jest.fn().mockReturnThis();
    const set = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const next = jest.fn();
    await mcpOAuthAuth({ headers: {} } as any, { status, set, json } as any, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
  test('fails closed if OAuth resource URL is not configured', async () => {
    delete process.env.MCP_RESOURCE_URL;
    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const next = jest.fn();
    await mcpOAuthAuth({ headers: { authorization: 'Bearer ' + 'a'.repeat(43) } } as any, { status, json } as any, next);
    expect(status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });
});
