import mongoose from 'mongoose';
import { CoinAccount, CoinLedger } from '../models/CoinModels';
import { XpLedger } from '../models/GamificationModels';
import { getCoinConfig, getAccount, coinsEarnedThisMonth } from './coinService';

/**
 * Turning XP into coins — the member's choice, at the admin's rate.
 *
 * XP IS NEVER TAKEN AWAY. Level, rank and leaderboards read XP, and converting must not move
 * them. So a member converts from a separate allowance: XP earned since conversion started
 * (CoinConfig.xpConversionStartsAt), less what they already converted (CoinAccount.xpConverted).
 *
 * ONLY WHOLE COINS. 250 XP at 100 XP a coin buys 2 coins and leaves 50 XP waiting for the next.
 *
 * EXACTLY ONCE. The account's xpConverted is moved with a compare-and-set on its old value, so two
 * clicks at once cannot both spend the same XP; the ledger row is keyed on that same old value, so
 * a retried request cannot mint a second row. If the ledger write fails, the XP is given back.
 *
 * The monthly earn cap still applies: a conversion is limited to the room left this month, and the
 * XP it could not use stays convertible for next month.
 */

export const XP_CONVERSION_EVENT = 'xp_converted';

export interface ConversionStatus {
  enabled: boolean;
  xpPerCoin: number;
  startsAt: Date | null;
  /** XP earned since conversion started. */
  earnedXp: number;
  /** XP already turned into coins. */
  convertedXp: number;
  /** XP left to convert. */
  availableXp: number;
  /** Whole coins that XP buys now, before the monthly cap. */
  coinsAvailable: number;
  /** Coins this month's cap still allows; null when there is no cap. */
  monthlyRoom: number | null;
  /** XP still needed for the next coin. */
  xpToNextCoin: number;
}

const earnedSince = async (tenantId: string, studentId: string, since: Date): Promise<number> => {
  const rows = await XpLedger.aggregate([
    {
      $match: {
        tenantId,
        studentId: new mongoose.Types.ObjectId(studentId),
        at: { $gte: since },
        amount: { $gt: 0 },
        // A backfill re-records history; it is not XP earned since conversion started.
        sourceType: { $ne: 'backfill' },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return rows[0]?.total || 0;
};

export async function conversionStatus(tenantId: string, studentId: string): Promise<ConversionStatus> {
  const cfg = await getCoinConfig(tenantId);
  const xpPerCoin = Math.max(1, Math.round(Number(cfg.xpPerCoin) || 100));
  const startsAt = cfg.xpConversionStartsAt || null;
  const enabled = !!(cfg.enabled && cfg.xpConversionEnabled && startsAt);
  const account = await getAccount(tenantId, studentId);
  const convertedXp = Number((account as any).xpConverted) || 0;
  const earnedXp = startsAt ? await earnedSince(tenantId, studentId, startsAt) : 0;
  const availableXp = Math.max(0, earnedXp - convertedXp);
  const coinsAvailable = Math.floor(availableXp / xpPerCoin);
  const monthlyRoom = cfg.monthlyEarnCap > 0
    ? Math.max(0, cfg.monthlyEarnCap - await coinsEarnedThisMonth(tenantId, studentId))
    : null;
  return {
    enabled, xpPerCoin, startsAt, earnedXp, convertedXp, availableXp, coinsAvailable, monthlyRoom,
    xpToNextCoin: xpPerCoin - (availableXp % xpPerCoin),
  };
}

export type ConversionRefusal = 'disabled' | 'nothing_to_convert' | 'earn_cap' | 'busy';

export interface ConversionResult {
  ok: boolean;
  refused?: ConversionRefusal;
  coins: number;
  xpUsed: number;
  balance: number;
  status: ConversionStatus;
}

/**
 * Convert XP into coins. `coins` asks for that many; omitted, it converts as many as possible.
 */
export async function convertXp(tenantId: string, studentId: string, coins?: number): Promise<ConversionResult> {
  const status = await conversionStatus(tenantId, studentId);
  const refuse = async (refused: ConversionRefusal): Promise<ConversionResult> => {
    const acct = await getAccount(tenantId, studentId);
    return { ok: false, refused, coins: 0, xpUsed: 0, balance: acct.balance, status };
  };
  if (!status.enabled) return refuse('disabled');

  let grant = status.coinsAvailable;
  if (coins !== undefined && Number.isFinite(coins)) grant = Math.min(grant, Math.max(0, Math.floor(coins)));
  if (status.monthlyRoom !== null) {
    if (status.monthlyRoom <= 0 && grant > 0) return refuse('earn_cap');
    grant = Math.min(grant, status.monthlyRoom);
  }
  if (grant <= 0) return refuse('nothing_to_convert');

  const xpUsed = grant * status.xpPerCoin;
  const before = status.convertedXp;

  // Claim the XP: succeeds only if nobody converted since we read the account.
  const sid = new mongoose.Types.ObjectId(studentId);
  const claimed = await CoinAccount.findOneAndUpdate(
    before > 0
      ? { tenantId, studentId: sid, xpConverted: before }
      : { tenantId, studentId: sid, $or: [{ xpConverted: 0 }, { xpConverted: { $exists: false } }] },
    { $inc: { xpConverted: xpUsed } },
    { new: true },
  );
  if (!claimed) return refuse('busy');

  const cfg = await getCoinConfig(tenantId);
  try {
    await CoinLedger.create({
      tenantId, studentId: sid,
      eventKey: XP_CONVERSION_EVENT,
      coins: grant,
      balanceAfter: claimed.balance + grant,
      // The XP position this conversion started from — unique per member, so a replay is refused.
      idempotencyKey: `xp_convert:${studentId}:${before}`,
      note: `${xpUsed.toLocaleString('en-IN')} XP converted`,
      meta: { xpUsed, xpPerCoin: status.xpPerCoin },
      expiresAt: cfg.expiryMonths > 0 ? new Date(Date.now() + cfg.expiryMonths * 30 * 86400000) : null,
    });
  } catch (e: any) {
    // Give the XP back: the claim moved, the coins did not.
    await CoinAccount.updateOne({ tenantId, studentId: sid }, { $inc: { xpConverted: -xpUsed } });
    if (e?.code === 11000) return refuse('busy');
    throw e;
  }

  const updated = await CoinAccount.findOneAndUpdate(
    { tenantId, studentId: sid },
    { $inc: { balance: grant, lifetimeEarned: grant } },
    { new: true },
  );

  return {
    ok: true, coins: grant, xpUsed, balance: updated?.balance ?? claimed.balance + grant,
    status: await conversionStatus(tenantId, studentId),
  };
}
