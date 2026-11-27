import 'dotenv/config';
import mongoose from 'mongoose';
import { mcpModels, assertMcpReady } from '../mcp/bootstrap';
import Code from '../models/McpOAuthCode';
import { mcpConfig } from '../mcp/oauthPolicy';

/** Explicit operator action; never called automatically by application startup. */
async function main() {
  mcpConfig();
  const uri = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGO_URL or MONGODB_URI');
  await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 10000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('MongoDB replica set or sharded cluster required');
  // Only the obsolete prototype TTL is dropped. No LMS indexes/data are changed.
  await Code.createCollection();
  for (const index of await Code.collection.indexes()) {
    if (index.key.expiresAt && index.expireAfterSeconds !== undefined) await Code.collection.dropIndex(index.name);
  }
  // Prototype records have no grant and can never authenticate. Preserve them with a bounded cleanup TTL.
  await Code.updateMany({ purgeAt: { $exists: false } }, { $set: { purgeAt: new Date() } });
  for (const model of mcpModels) await model.createIndexes();
  process.env.MCP_ENABLED = 'true';
  await assertMcpReady();
  console.log('MCP configuration, transaction support and indexes verified. No service was deployed or enabled.');
}
main().catch(() => { console.error('MCP preparation failed. Check configuration, database permissions, replica set and indexes.'); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
