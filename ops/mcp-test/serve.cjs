'use strict';
const settings = require('./settings.cjs');
settings.configure();
const mongoose = require('mongoose');
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
const express = require('express');
const { assertMcpReady } = require('../../server/dist/mcp/bootstrap');
const mcp = require('../../server/dist/mcp').default;

async function main() {
  await mongoose.connect(settings.uri(), { serverSelectionTimeoutMS: 10000 });
  await assertMcpReady();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.get('/healthz', (_req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ staging: true }));
  // The SAME router and LMS credential/permission services used by server/src/app.ts.
  // No alternate OAuth implementation; no LMS cron jobs, mailers or calling workers.
  app.use(mcp);
  app.use((_req, res) => res.status(404).end());
  const server = app.listen(5000, '0.0.0.0', () => console.log('Synthetic MCP test service listening on 5000'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    server.close(() => mongoose.disconnect().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
main().catch(() => { console.error('MCP test startup failed; check preparation, client configuration and database availability.'); process.exit(1); });
