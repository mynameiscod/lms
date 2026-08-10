import mongoose from 'mongoose';
import {
  CoinConfig, CoinRule, CoinLedger, CoinAccount, COIN_EVENTS,
  ICoinConfig, ICoinRule, ICoinAccount,
} from '../models/CoinModels';

/**
 * Awarding and accounting for CareerPilot coins.
 *
 * Design rules that matter:
 *
 *  1. AWARDS NEVER THROW INTO THE CALLER. A coin is a nice-to-have bolted onto flows that
 *     already work. If the ledger is down, a member must still finish their mission, their
 *     interview and their practice problem. Every entry point swallows its own errors.
 *
 *  2. EVERY AWARD IS IDEMPOTENT. The caller supplies a key describing the thing that
 *     happened ("mission:2026-08-10:day12:key"), not the attempt. A retry, a double-click
 *     and a re-delivered webhook all collapse to one row via a unique index.
 *
 *  3. CAPS ARE COUNTED FROM THE LEDGER, not from a counter that can drift.
 *
 *  4. AMOUNTS ARE DATA. Nothing here hardcodes what an action is worth; it reads the rule.
 *     An admin changing a number takes effect on the next award, with no deploy.
 */

const RULE_TTL_MS = 60_000;
type RuleCache = { at: number; rules: Map<string, ICoinRule> };
const ruleCache = new Map<string, RuleCache>();
const configCache = new Map<string, { at: number; cfg: ICoinConfig }>();

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

/** Config for a tenant, creating defaults on first use. Cached briefly. */
export async function getCoinConfig(tenantId: string): Promise<ICoinConfig> {
  const hit = configCache.get(tenantId);
  if (hit && Date.now() - hit.at < RULE_TTL_MS) return hit.cfg;

  let cfg = await CoinConfig.findOne({ tenantId });
  if (!cfg) cfg = await CoinConfig.create({ tenantId });
  configCache.set(tenantId, { at: Date.now(), cfg });
  return cfg;
}

/**
 * Every known event exists as a row, seeded on first use — most at zero and disabled.
 *
 * This is what makes "admin can change it any time" true rather than aspirational: the
 * switch for every behaviour the product already emits is present from day one, so
 * enabling one is an edit, not a release.
 */
export async function ensureCoinRules(tenantId: string): Promise<Map<string, ICoinRule>> {
  const hit = ruleCache.get(tenantId);
  if (hit && Date.now() - hit.at < RULE_TTL_MS) return hit.rules;

  const existing = await CoinRule.find({ tenantId });
  const byKey = new Map(existing.map(r => [r.eventKey, r]));

  const missing = COIN_EVENTS.filter(e => !byKey.has(e.key));
  if (missing.length) {
    const created = await CoinRule.insertMany(
      missing.map(e => ({
        tenantId, eventKey: e.key, label: e.label,
        coins: e.coins, dailyCap: e.dailyCap, monthlyCap: 0, enabled: e.enabled,
      })),
      // Two requests can race here on a cold tenant; the unique index settles it and the
      // loser should not take the request down with it.
      { ordered: false },
    ).catch(() => [] as any[]);
    for (const r of created as any[]) byKey.set(r.eventKey, r);
  }

  ruleCache.set(tenantId, { at: Date.now(), rules: byKey });
  return byKey;
}

/** Drop caches so an admin edit is visible immediately rather than within a minute. */
export function invalidateCoinCache(tenantId: string): void {
  ruleCache.delete(tenantId);
  configCache.delete(tenantId);
}

export async function getAccount(tenantId: string, studentId: string): Promise<ICoinAccount> {
  // Upsert rather than find-then-create: two awards arriving together for a member with no
  // account would both miss on the read, and the second create would hit the unique index
  // and throw — silently costing that award.
  return CoinAccount.findOneAndUpdate(
    { tenantId, studentId },
    { $setOnInsert: { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 } },
    { new: true, upsert: true },
  ) as any;
}

async function countInWindow(
  tenantId: string, studentId: string, eventKey: string, since: Date,
): Promise<number> {
  return CoinLedger.countDocuments({
    tenantId, studentId, eventKey, coins: { $gt: 0 }, createdAt: { $gte: since },
  });
}

async function coinsEarnedThisMonth(tenantId: string, studentId: string): Promise<number> {
  const rows = await CoinLedger.aggregate([
    {
      $match: {
        tenantId,
        studentId: new mongoose.Types.ObjectId(studentId),
        coins: { $gt: 0 },
        createdAt: { $gte: startOfMonth() },
        // Referral income is funded by the revenue it brought in, so it is deliberately
        // NOT metered against the monthly activity cap.
        eventKey: { $ne: 'referral_converted' },
      },
    },
    { $group: { _id: null, total: { $sum: '$coins' } } },
  ]);
  return rows[0]?.total || 0;
}

export interface AwardResult {
  awarded: number;
  balance: number;
  /** Why nothing was given, when awarded is 0. Useful in logs, never shown to a member. */
  reason?: 'disabled' | 'zero' | 'daily_cap' | 'monthly_cap' | 'earn_cap' | 'duplicate' | 'error';
}

/**
 * Give a member coins for something they did.
 *
 * `idempotencyKey` must describe the EVENT, not the request — "practice:<problemId>", not
 * a random uuid — or a retry mints a second award.
 */
export async function awardCoins(opts: {
  tenantId: string;
  studentId: string;
  eventKey: string;
  idempotencyKey: string;
  note?: string;
  meta?: Record<string, any>;
  /** Overrides the rule's amount. Only for referral payouts, which come from config. */
  coinsOverride?: number;
}): Promise<AwardResult> {
  try {
    const { tenantId, studentId, eventKey } = opts;
    const cfg = await getCoinConfig(tenantId);
    if (!cfg.enabled) return { awarded: 0, balance: 0, reason: 'disabled' };

    const rules = await ensureCoinRules(tenantId);
    const rule = rules.get(eventKey);
    if (!rule || !rule.enabled) return { awarded: 0, balance: 0, reason: 'disabled' };

    const coins = opts.coinsOverride ?? rule.coins;
    if (coins <= 0) return { awarded: 0, balance: 0, reason: 'zero' };

    if (rule.dailyCap > 0 && await countInWindow(tenantId, studentId, eventKey, startOfDay()) >= rule.dailyCap) {
      return { awarded: 0, balance: 0, reason: 'daily_cap' };
    }
    if (rule.monthlyCap > 0 && await countInWindow(tenantId, studentId, eventKey, startOfMonth()) >= rule.monthlyCap) {
      return { awarded: 0, balance: 0, reason: 'monthly_cap' };
    }

    // The economy-wide brake. Referral is exempt (see coinsEarnedThisMonth).
    let grant = coins;
    if (eventKey !== 'referral_converted' && cfg.monthlyEarnCap > 0) {
      const earned = await coinsEarnedThisMonth(tenantId, studentId);
      const room = cfg.monthlyEarnCap - earned;
      if (room <= 0) return { awarded: 0, balance: 0, reason: 'earn_cap' };
      grant = Math.min(grant, room);      // partial award rather than none, at the boundary
    }

    const account = await getAccount(tenantId, studentId);
    // Indicative only. The ledger row is written BEFORE the balance moves, because the
    // unique idempotency key is what makes an award exactly-once — and a guard has to be
    // in place before the thing it guards. Under simultaneous awards this snapshot can
    // therefore lag by one; the authoritative balance is the account's $inc below, and a
    // true balance is always recoverable by summing the ledger.
    const balanceAfter = account.balance + grant;

    try {
      await CoinLedger.create({
        tenantId, studentId, eventKey,
        coins: grant,
        balanceAfter,
        idempotencyKey: opts.idempotencyKey,
        note: opts.note,
        meta: opts.meta,
        expiresAt: cfg.expiryMonths > 0
          ? new Date(Date.now() + cfg.expiryMonths * 30 * 86400000)
          : null,
      });
    } catch (e: any) {
      // Duplicate key = this exact event was already paid. Not an error; the correct
      // outcome. Anything else is real and should not silently look like success.
      if (e?.code === 11000) return { awarded: 0, balance: account.balance, reason: 'duplicate' };
      throw e;
    }

    // $inc rather than save(): two awards landing together must both count, and a
    // read-modify-write would lose one.
    const updated = await CoinAccount.findOneAndUpdate(
      { tenantId, studentId },
      { $inc: { balance: grant, lifetimeEarned: grant } },
      { new: true, upsert: true },
    );

    return { awarded: grant, balance: updated?.balance ?? balanceAfter };
  } catch (e: any) {
    // Never propagate: a coin must not cost a member their mission.
    console.error('[coins] award failed:', opts.eventKey, e?.message || e);
    return { awarded: 0, balance: 0, reason: 'error' };
  }
}

/** Recent movements for the member's own history view. */
export async function listLedger(tenantId: string, studentId: string, limit = 50) {
  return CoinLedger.find({ tenantId, studentId })
    .sort({ createdAt: -1 })
    .limit(Math.min(200, Math.max(1, limit)))
    .lean();
}

/**
 * What a member can currently earn, for the "how do I get coins" panel.
 *
 * Built from the rules rather than hardcoded in the UI, so a rule an admin switches off
 * stops being advertised at the same moment it stops paying.
 */
export async function earnableRules(tenantId: string) {
  const rules = await ensureCoinRules(tenantId);
  return Array.from(rules.values())
    .filter(r => r.enabled && r.coins > 0)
    .sort((a, b) => b.coins - a.coins)
    .map(r => ({ eventKey: r.eventKey, label: r.label, coins: r.coins, dailyCap: r.dailyCap }));
}
