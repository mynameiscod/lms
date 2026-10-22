import mongoose from 'mongoose';
import Code from '../models/McpOAuthCode';
import Access from '../models/McpOAuthAccessToken';
import Grant from '../models/McpOAuthGrant';
import Refresh from '../models/McpOAuthRefreshToken';
import Session from '../models/McpOAuthSession';
import Audit from '../models/McpAuditEvent';
import { McpRateLimit } from './rateLimit';
import { mcpConfig } from './oauthPolicy';

export const mcpModels = [Code, Access, Grant, Refresh, Session, Audit, McpRateLimit];

/** Startup validation is read-only. Operators explicitly prepare indexes before enabling MCP. */
export async function assertMcpReady() {
  if (process.env.MCP_ENABLED !== 'true') return;
  mcpConfig();
  if (mongoose.connection.readyState !== 1) throw new Error('MCP requires an available MongoDB connection');
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('MCP requires MongoDB transactions (replica set or sharded cluster)');
  for (const model of mcpModels) {
    const indexes = await model.collection.indexes();
    for (const [keys, options] of model.schema.indexes()) {
      if (!indexes.some(i => JSON.stringify(i.key) === JSON.stringify(keys) &&
        (!options.unique || i.unique === true) &&
        (options.expireAfterSeconds === undefined || i.expireAfterSeconds === options.expireAfterSeconds))) {
        throw new Error(`MCP indexes missing for ${model.modelName}; run mcp:prepare before enabling`);
      }
    }
    if (model.modelName === 'McpOAuthCode' && indexes.some(i => i.expireAfterSeconds !== undefined && i.key.expiresAt)) {
      throw new Error('MCP prototype code TTL index must be migrated with mcp:prepare');
    }
  }
}
