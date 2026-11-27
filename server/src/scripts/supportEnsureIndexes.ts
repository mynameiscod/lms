/**
 * Creates the Help & Support indexes. Safe to run on production and to run again.
 *
 *   node dist/scripts/supportEnsureIndexes.js            (production container)
 *   npx ts-node src/scripts/supportEnsureIndexes.ts      (development)
 *
 * It only CREATES what the models declare (Model.createIndexes). It never drops an index, which
 * is why it is not syncIndexes: an index someone added by hand for a slow query stays put.
 * The text index on SupportFaq is what Help Center search and the assistant's retrieval use.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import SupportTicket from '../models/SupportTicket';
import SupportMessage from '../models/SupportMessage';
import SupportChatSession from '../models/SupportChatSession';
import SupportFaq from '../models/SupportFaq';
import SupportAuditLog from '../models/SupportAuditLog';
import SupportConfiguration from '../models/SupportConfiguration';
import SupportCounter from '../models/SupportCounter';
import SupportSearchLog from '../models/SupportSearchLog';
import SupportFaqVote from '../models/SupportFaqVote';
import SupportIncident from '../models/SupportIncident';
import SupportRelease from '../models/SupportRelease';
import SupportErrorGroup from '../models/SupportErrorGroup';
import SupportMetricCounter from '../models/SupportMetricCounter';

dotenv.config();

export const SUPPORT_MODELS = [SupportTicket, SupportMessage, SupportChatSession, SupportFaq, SupportAuditLog, SupportConfiguration, SupportCounter, SupportSearchLog, SupportFaqVote, SupportIncident, SupportRelease, SupportErrorGroup, SupportMetricCounter];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  for (const m of SUPPORT_MODELS) {
    await m.createIndexes();
    const names = (await m.collection.indexes()).map(i => i.name).join(', ');
    console.log(`${m.modelName.padEnd(22)} ${names}`);
  }
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async (e) => { console.error('FAILED', e?.message || e); await mongoose.disconnect(); process.exit(1); });
}
