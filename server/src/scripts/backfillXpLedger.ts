/**
 * Bring the XP ledger up to every member's balance.
 *
 * WHY. Missions, practice, resume scoring and problem delivery used to add XP to the balance and
 * xpLog only, never to the ledger. The weekly and monthly leaderboards, the admin activity counts
 * and rebuildXpBalance read the ledger, so that XP was missing from all of them. New awards are
 * written to the ledger now (PassportProgress post-save); this writes the old ones.
 *
 * For each member:
 *   1. every xpLog entry from those awards becomes a ledger row at its real time (keys are stable,
 *      so a row already there is skipped and the script can be run again);
 *   2. XP the ledger still cannot explain — earned before xpLog existed, or trimmed out of it —
 *      becomes one OPENING_BALANCE row dated when the member started, so it counts all-time but
 *      never in this week's or this month's board.
 * After it, a member's ledger adds up to their balance. Balances are not changed.
 *
 * DRY RUN unless --apply.
 *
 *   npx ts-node src/scripts/backfillXpLedger.ts [<tenantId>] [--apply]
 *   node dist/scripts/backfillXpLedger.js [<tenantId>] [--apply]      # in the container
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import PassportProgress, { legacyXpLedgerRows, insertLegacyXpRows } from '../models/PassportProgress';
import { XpLedger } from '../models/GamificationModels';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const onlyTenant = args.find(a => !a.startsWith('--')) || '';
  await mongoose.connect(uri);

  const members = await PassportProgress.find({ ...(onlyTenant ? { tenantId: onlyTenant } : {}), xp: { $gt: 0 } })
    .select('tenantId studentId xp xpLog startDate createdAt').lean() as any[];
  console.log(`\n=== Backfill XP ledger (${apply ? 'APPLY' : 'DRY RUN'}) — ${members.length} member(s) with XP ===`);

  let logRows = 0, written = 0, openings = 0, openingXp = 0, alreadyEven = 0;
  for (const p of members) {
    const rows = legacyXpLedgerRows(p);
    const existing = new Set((await XpLedger.find({
      tenantId: p.tenantId, studentId: p.studentId, idempotencyKey: { $in: rows.map(r => r.idempotencyKey) },
    }).select('idempotencyKey').lean() as any[]).map(r => r.idempotencyKey));
    const missing = rows.filter(r => !existing.has(r.idempotencyKey));
    logRows += missing.length;
    if (apply) written += await insertLegacyXpRows(missing);

    const [sum] = await XpLedger.aggregate([
      { $match: { tenantId: p.tenantId, studentId: p.studentId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const ledger = (sum?.total || 0) + (apply ? 0 : missing.reduce((t, r) => t + r.amount, 0));
    const gap = (p.xp || 0) - ledger;
    if (gap <= 0) { alreadyEven++; continue; }
    openings++; openingXp += gap;
    if (apply) {
      await XpLedger.updateOne(
        { tenantId: p.tenantId, studentId: p.studentId, idempotencyKey: `opening:${p._id}` },
        { $setOnInsert: {
          eventKey: 'OPENING_BALANCE', sourceType: 'backfill', sourceId: String(p._id), amount: gap,
          at: p.startDate || p.createdAt || new Date(0),
        } },
        { upsert: true },
      );
    }
  }

  console.log(`  xpLog awards ${apply ? 'written' : 'to write'}: ${apply ? written : logRows}`);
  console.log(`  opening balances ${apply ? 'written' : 'to write'}: ${openings} (${openingXp} XP)`);
  console.log(`  members already adding up: ${alreadyEven}`);
  if (!apply) console.log('\nDry run — nothing written. Run again with --apply.');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
