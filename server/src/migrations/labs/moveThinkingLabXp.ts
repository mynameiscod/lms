/**
 * Move each CareerPilot member's old Thinking Lab XP into their main XP. Run once per environment.
 *
 *   node dist/migrations/labs/moveThinkingLabXp.js              report, writes nothing
 *   node dist/migrations/labs/moveThinkingLabXp.js --apply      move it
 *   node dist/migrations/labs/moveThinkingLabXp.js <tenantId> [--apply]   one institute only
 *   ... --student=<userId>                                             one member only
 *
 * The Thinking Lab used to keep its own XP (StudentGameStats.xpTotal). Members now earn lab XP through
 * the main engine (labRewardService), so what they earned before is added to the main total once:
 * one ledger row per member (THINKING_LAB_XP_MOVED), keyed so a second run cannot pay it again.
 *
 * Written as a backfill, so it is not XP "earned since conversion started" and cannot be turned into
 * coins (xpConversionService skips backfills). The old lab coins are not moved: they were never real
 * coins. LMS students are not touched — they keep the lab's own XP.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StudentGameStats from '../../models/StudentGameStats';
import User from '../../models/User';
import PassportProgress from '../../models/PassportProgress';
import { XpLedger } from '../../models/GamificationModels';
import { isCareerPilotMember } from '../../services/careerPilotPopulation';

dotenv.config();

export const MOVED_EVENT = 'THINKING_LAB_XP_MOVED';
const KEY = `${MOVED_EVENT}:backfill:thinking-lab`;

(async () => {
  const tenantArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const apply = process.argv.includes('--apply');
  const student = (process.argv.find((a) => a.startsWith('--student=')) || '').split('=')[1] || '';
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  console.log(`\nMOVE THINKING LAB XP  ·  ${tenantArg ? `tenant ${tenantArg}` : 'every tenant'}`);
  console.log(apply ? 'APPLYING\n' : 'DRY RUN — pass --apply to write\n');

  const rows: any[] = await StudentGameStats.find({
    ...(tenantArg ? { tenantId: tenantArg } : {}), ...(student ? { studentId: student } : {}), xpTotal: { $gt: 0 }, xpMovedAt: { $exists: false },
  }).select('tenantId studentId xpTotal updatedAt').lean();
  const users = new Map((await User.find({ _id: { $in: rows.map((r) => r.studentId) } })
    .select('batchId passport.product passport.active passport.activatedAt passport.verifiedAt').lean() as any[])
    .map((u) => [String(u._id), u]));

  let members = 0, moved = 0, already = 0, xp = 0, lms = 0;
  for (const r of rows) {
    const u = users.get(String(r.studentId));
    // Same rule the lab uses to decide who earns the new way (thinkingLabController.isMemberView).
    if (!u || u.batchId || !isCareerPilotMember(u.passport)) { lms++; continue; }
    members++;
    const amount = Math.round(r.xpTotal);
    if (!apply) { xp += amount; continue; }
    const tenantId = String(r.tenantId);
    try {
      await XpLedger.create({
        tenantId, studentId: r.studentId, eventKey: MOVED_EVENT, sourceType: 'backfill', sourceId: 'thinking-lab',
        idempotencyKey: KEY, amount, metadata: { from: 'StudentGameStats.xpTotal' }, at: r.updatedAt || new Date(),
      });
    } catch (e: any) {
      if (e?.code === 11000) { already++; await StudentGameStats.updateOne({ _id: r._id }, { $set: { xpMovedAt: new Date() } }); continue; }
      throw e;
    }
    await PassportProgress.updateOne({ tenantId, studentId: r.studentId }, { $inc: { xp: amount }, $setOnInsert: { startDate: new Date() } }, { upsert: true });
    await StudentGameStats.updateOne({ _id: r._id }, { $set: { xpMovedAt: new Date() } });
    moved++; xp += amount;
  }

  console.log(`  lab stats with XP, not yet moved: ${rows.length}`);
  console.log(`  CareerPilot members:              ${members}`);
  console.log(`  LMS students (left as they are):  ${lms}`);
  console.log(apply
    ? `\nMOVED ${xp.toLocaleString('en-IN')} XP for ${moved} member(s)${already ? `; ${already} had been moved before` : ''}.`
    : `\nWOULD MOVE ${xp.toLocaleString('en-IN')} XP for ${members} member(s).`);
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error('ERR', e?.message || e);
  try { await mongoose.disconnect(); } catch { /* closing */ }
  process.exit(1);
});
