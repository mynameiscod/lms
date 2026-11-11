/**
 * Load the written Thinking Lab questions (seeds/thinkingBank/*.json) into the shared bank.
 *
 *   node dist/scripts/seedThinkingBank.js                    report, writes nothing
 *   node dist/scripts/seedThinkingBank.js --apply            add new questions as DRAFTS for review
 *   node dist/scripts/seedThinkingBank.js --apply --publish  add them PUBLISHED (approved by whoever runs this)
 *   ... --type=math                                          one type only
 *
 * Each question carries a seedKey, so running it again adds only what is new and refreshes questions
 * nobody has edited since. A question an admin has edited in Problem Bank → Thinking Lab is never
 * overwritten, and a published question is never moved back to draft.
 *
 * The JSON files are imported (not read from disk) so the build copies them into dist.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ThinkingQuestion from '../models/ThinkingQuestion';
import { cleanQuestion, createQuestion } from '../services/thinkingBankService';
import { publishProblems } from '../data/thinkingBankPolicy';
import math from '../seeds/thinkingBank/math.json';
import logical from '../seeds/thinkingBank/logical.json';
import critical from '../seeds/thinkingBank/critical.json';
import coding from '../seeds/thinkingBank/coding.json';
// The 2026-11 expansion (+640): one file per writer batch, joined to their type below.
import math2a from '../seeds/thinkingBank/math2a.json';
import math2b from '../seeds/thinkingBank/math2b.json';
import math2c from '../seeds/thinkingBank/math2c.json';
import math2d from '../seeds/thinkingBank/math2d.json';
import logical2a from '../seeds/thinkingBank/logical2a.json';
import logical2b from '../seeds/thinkingBank/logical2b.json';
import logical2c from '../seeds/thinkingBank/logical2c.json';
import logical2d from '../seeds/thinkingBank/logical2d.json';
import critical2a from '../seeds/thinkingBank/critical2a.json';
import critical2b from '../seeds/thinkingBank/critical2b.json';
import critical2c from '../seeds/thinkingBank/critical2c.json';
import coding2a from '../seeds/thinkingBank/coding2a.json';
import coding2b from '../seeds/thinkingBank/coding2b.json';
import coding2c from '../seeds/thinkingBank/coding2c.json';

dotenv.config();

export const SEED_FILES: Record<string, any[]> = {
  math: [...(math as any[]), ...(math2a as any[]), ...(math2b as any[]), ...(math2c as any[]), ...(math2d as any[])],
  logical: [...(logical as any[]), ...(logical2a as any[]), ...(logical2b as any[]), ...(logical2c as any[]), ...(logical2d as any[])],
  critical: [...(critical as any[]), ...(critical2a as any[]), ...(critical2b as any[]), ...(critical2c as any[])],
  coding: [...(coding as any[]), ...(coding2a as any[]), ...(coding2b as any[]), ...(coding2c as any[])],
};
const SEEDER = 'seed';

(async () => {
  const apply = process.argv.includes('--apply');
  const publish = process.argv.includes('--publish');
  const only = (process.argv.find((a) => a.startsWith('--type=')) || '').split('=')[1] || '';
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  console.log(`\nSEED THINKING LAB QUESTIONS${only ? ` · ${only}` : ''}\n${apply ? (publish ? 'APPLYING · published' : 'APPLYING · as drafts') : 'DRY RUN — pass --apply to write'}\n`);

  let added = 0, refreshed = 0, kept = 0, invalid = 0;
  for (const [type, rows] of Object.entries(SEED_FILES)) {
    if (only && only !== type) continue;
    const existing = new Map((await ThinkingQuestion.find({ seedKey: { $in: rows.map((r) => r.seedKey) } }).lean() as any[]).map((q) => [q.seedKey, q]));
    let n = 0;
    for (const raw of rows) {
      const data = cleanQuestion({ ...raw, type });
      const problems = publishProblems(data);
      if (problems.length) { invalid++; console.log(`  ! ${raw.seedKey}: ${problems.join(' ')}`); continue; }
      const have: any = existing.get(raw.seedKey);
      if (have && have.updatedBy && have.updatedBy !== SEEDER) { kept++; continue; }   // an admin edited it
      n++;
      if (!apply) { if (have) refreshed++; else added++; continue; }
      if (have) {
        await ThinkingQuestion.updateOne({ _id: have._id }, { $set: { ...data, updatedBy: SEEDER, ...(publish && have.status === 'DRAFT' ? { status: 'PUBLISHED', approvedAt: new Date(), approvedBy: SEEDER } : {}) } });
        refreshed++;
      } else {
        await createQuestion({ ...data, seedKey: raw.seedKey, source: 'seed', status: publish ? 'PUBLISHED' : 'DRAFT', createdBy: SEEDER, updatedBy: SEEDER, ...(publish ? { approvedAt: new Date(), approvedBy: SEEDER } : {}) });
        added++;
      }
    }
    console.log(`  ${type.padEnd(9)} ${rows.length} in the file`);
  }
  console.log(`\n${apply ? '' : 'WOULD BE: '}added ${added} · refreshed ${refreshed} · kept (edited by an admin) ${kept}${invalid ? ` · ${invalid} not valid (listed above)` : ''}`);
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error('ERR', e?.message || e);
  try { await mongoose.disconnect(); } catch { /* closing */ }
  process.exit(1);
});
