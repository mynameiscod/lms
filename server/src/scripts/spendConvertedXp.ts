/**
 * Take XP that was already converted into coins off members' XP balances.
 *
 * WHY. Converting XP into coins used to leave XP untouched, so a member who converted still showed
 * the same XP, level and rank. Conversions now spend the XP (xpConversionService.spendConvertedXp);
 * this applies the same to every conversion made before that change.
 *
 * Each past conversion (a CoinLedger 'xp_converted' row) becomes a negative XP_CONVERTED row in the
 * XP ledger and comes off PassportProgress.xp. The row is keyed like a live conversion, so a
 * conversion already recorded is skipped and the script can be run again safely.
 *
 * DRY RUN unless --apply.
 *
 *   npx ts-node src/scripts/spendConvertedXp.ts [<tenantId>] [--apply]
 *   node dist/scripts/spendConvertedXp.js [<tenantId>] [--apply]      # in the container
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { CoinLedger } from '../models/CoinModels';
import { XpLedger } from '../models/GamificationModels';
import { XP_CONVERSION_EVENT, spendConvertedXp } from '../services/xpConversionService';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const onlyTenant = args.find(a => !a.startsWith('--')) || '';
  await mongoose.connect(uri);

  const rows = await CoinLedger.find({ ...(onlyTenant ? { tenantId: onlyTenant } : {}), eventKey: XP_CONVERSION_EVENT })
    .select('tenantId studentId idempotencyKey meta createdAt').sort({ createdAt: 1 }).lean() as any[];
  console.log(`\n=== Spend converted XP (${apply ? 'APPLY' : 'DRY RUN'}) — ${rows.length} conversion(s) ===`);

  let todo = 0, done = 0, already = 0, skipped = 0, xp = 0;
  const members = new Set<string>();
  for (const r of rows) {
    const key = String(r.idempotencyKey || '');
    const m = /^xp_convert:([a-f0-9]{24}):(\d+)$/i.exec(key);
    const xpUsed = Math.round(Number(r.meta?.xpUsed) || 0);
    if (!m || xpUsed <= 0) { skipped++; console.log(`  skipped (unreadable row) ${r._id}`); continue; }
    const studentId = String(r.studentId);
    const before = Number(m[2]);
    const exists = await XpLedger.exists({ tenantId: r.tenantId, studentId: r.studentId, idempotencyKey: key });
    if (exists) { already++; continue; }
    todo++; xp += xpUsed; members.add(`${r.tenantId}:${studentId}`);
    if (apply && await spendConvertedXp(r.tenantId, studentId, before, xpUsed, r.createdAt || new Date())) done++;
  }

  console.log(`  conversions ${apply ? 'applied' : 'to apply'}: ${apply ? done : todo} (${xp.toLocaleString('en-IN')} XP, ${members.size} member(s))`);
  console.log(`  already applied: ${already}`);
  if (skipped) console.log(`  skipped: ${skipped}`);
  if (!apply) console.log('\nDry run — nothing written. Run again with --apply.');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
