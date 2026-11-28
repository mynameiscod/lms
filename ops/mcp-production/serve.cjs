'use strict';
const settings = require('./settings.cjs');
const config = settings.load();
const mongoose = require('mongoose');
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
const express = require('express');
const { assertMcpReady } = require('../../server/dist/mcp/bootstrap');
const mcp = require('../../server/dist/mcp').default;

async function main() {
  await mongoose.connect(settings.uri(config), { serverSelectionTimeoutMS: 10000, maxPoolSize: 15 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (hello.setName !== config.replica || hello.hosts?.join() !== config.hostname + ':27017') throw Error('topology');
  await assertMcpReady();
  const app = express();
  app.disable('x-powered-by');
  // One host Nginx proxy; it replaces all forwarded address/protocol headers.
  app.set('trust proxy', 1);
  app.get('/healthz', async (_req, res) => {
    try {
      await mongoose.connection.db.admin().command({ ping: 1 }, { maxTimeMS: 2000 });
      res.json({ ready: true });
    } catch { res.status(503).json({ ready: false }); }
  });
  // The production LMS router, credential verifier and authorization policies.
  // This process does not import the LMS app or start its jobs/integrations.
  app.use(mcp);
  app.use((_req, res) => res.status(404).end());
  const server = app.listen(5000, '0.0.0.0', () => console.log('Production MCP ready.'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    server.close(() => mongoose.disconnect().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
main().catch(() => { console.error('Production MCP startup failed; review configuration, privileges and storage.'); process.exit(1); });
