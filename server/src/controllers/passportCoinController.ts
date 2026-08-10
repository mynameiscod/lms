import { Request, Response } from 'express';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import { CoinConfig, CoinRule, CoinLedger, CoinAccount, COIN_EVENTS } from '../models/CoinModels';
import { membershipActive } from '../services/passportEntitlementService';
import {
  getCoinConfig, ensureCoinRules, getAccount, listLedger, earnableRules, invalidateCoinCache,
} from '../services/coinService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

// ─── Member ──────────────────────────────────────────────────────────────────

/**
 * GET /passport/coins — balance, how to earn more, and recent movements.
 *
 * `redeemable` is the important field. Free members ACCRUE coins but cannot spend them
 * until they pay: unredeemed coins cost nothing, and a visible balance they cannot touch
 * yet is a far better conversion prompt than an empty screen.
 */
export const myCoins = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);

    const [cfg, account, ledger, earn, user] = await Promise.all([
      getCoinConfig(tenantId),
      getAccount(tenantId, studentId),
      listLedger(tenantId, studentId, 50),
      earnableRules(tenantId),
      User.findById(studentId).select('passport').lean() as any,
    ]);

    const paid = membershipActive(user?.passport);

    res.json({
      enabled: cfg.enabled,
      balance: account.balance,
      lifetimeEarned: account.lifetimeEarned,
      lifetimeSpent: account.lifetimeSpent,
      // Redemption itself lands in a later phase; the flag is already honest about why
      // the button will be disabled when it arrives.
      redeemable: paid,
      minRedemption: cfg.minRedemption,
      monthlyEarnCap: cfg.monthlyEarnCap,
      expiryMonths: cfg.expiryMonths,
      earnRules: earn,
      history: ledger.map((l: any) => ({
        at: l.createdAt, coins: l.coins, eventKey: l.eventKey,
        note: l.note || '', balanceAfter: l.balanceAfter,
      })),
    });
  } catch (e: any) {
    console.error('[coins] myCoins:', e);
    res.status(500).json({ message: e.message || 'Could not load your coins' });
  }
};

// ─── Admin ───────────────────────────────────────────────────────────────────

/** GET /passport/coins/admin — config + every rule, for the admin screen. */
export const getAdmin = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [cfg, rules, pcfg] = await Promise.all([
      getCoinConfig(tenantId),
      ensureCoinRules(tenantId),
      PassportConfig.findOne({ tenantId }).lean() as any,
    ]);

    // A quick read on how much the economy has actually issued, so the admin is not
    // tuning numbers blind.
    const [issued, members] = await Promise.all([
      CoinLedger.aggregate([
        { $match: { tenantId, coins: { $gt: 0 } } },
        { $group: { _id: null, coins: { $sum: '$coins' }, awards: { $sum: 1 } } },
      ]),
      CoinAccount.countDocuments({ tenantId, lifetimeEarned: { $gt: 0 } }),
    ]);

    const totalIssued = issued[0]?.coins || 0;
    const priceInr = pcfg?.priceInr ?? 1599;

    res.json({
      config: cfg,
      rules: Array.from(rules.values())
        .sort((a, b) => a.eventKey.localeCompare(b.eventKey))
        .map(r => ({
          eventKey: r.eventKey, label: r.label, coins: r.coins,
          dailyCap: r.dailyCap, monthlyCap: r.monthlyCap, enabled: r.enabled,
        })),
      knownEvents: COIN_EVENTS.map(e => ({ key: e.key, label: e.label })),
      stats: {
        totalIssued,
        awards: issued[0]?.awards || 0,
        earningMembers: members,
        // The number that actually matters: what issuance would cost if every coin were
        // redeemed against the worst-value (1:1) reward, per earning member per year.
        worstCaseInrPerMember: members > 0
          ? +((totalIssued / (cfg.coinsPerRupee || 100)) / members).toFixed(2)
          : 0,
        membershipPriceInr: priceInr,
        budgetInrPerMember: cfg.annualRealCostBudgetInr,
      },
    });
  } catch (e: any) {
    console.error('[coins] getAdmin:', e);
    res.status(500).json({ message: e.message || 'Could not load coin settings' });
  }
};

const NUMERIC_CONFIG = [
  'coinsPerRupee', 'monthlyEarnCap', 'annualRealCostBudgetInr',
  'expiryMonths', 'minRedemption', 'referrerCoins', 'refereeCoins', 'referralMonthlyCap',
] as const;

/** PUT /passport/coins/admin/config */
export const saveConfig = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const body = req.body || {};
    const patch: Record<string, any> = {};

    for (const k of NUMERIC_CONFIG) {
      if (body[k] === undefined) continue;
      const v = Number(body[k]);
      // Reject rather than coerce: a NaN quietly stored as 0 would silently switch off a
      // cap, and nothing downstream would look wrong until the bill arrived.
      if (!Number.isFinite(v) || v < 0) {
        return res.status(400).json({ message: `${k} must be a number of 0 or more.` });
      }
      patch[k] = Math.round(v);
    }
    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
    if (typeof body.freeMembersAccrue === 'boolean') patch.freeMembersAccrue = body.freeMembersAccrue;

    // A zero rate would divide by zero in every cost projection.
    if (patch.coinsPerRupee !== undefined && patch.coinsPerRupee < 1) {
      return res.status(400).json({ message: 'Coins per rupee must be at least 1.' });
    }

    const cfg = await CoinConfig.findOneAndUpdate({ tenantId }, { $set: patch }, { new: true, upsert: true });
    invalidateCoinCache(tenantId);
    res.json({ config: cfg });
  } catch (e: any) {
    console.error('[coins] saveConfig:', e);
    res.status(500).json({ message: e.message || 'Could not save coin settings' });
  }
};

/**
 * PUT /passport/coins/admin/rules — save every rule in one call.
 *
 * The whole table is submitted together because the amounts are related: raising one
 * without seeing the rest is how a monthly cap quietly stops binding.
 */
export const saveRules = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const rows = Array.isArray(req.body?.rules) ? req.body.rules : [];
    if (!rows.length) return res.status(400).json({ message: 'No rules supplied.' });

    const known = new Set(COIN_EVENTS.map(e => e.key));
    const ops: any[] = [];

    for (const r of rows) {
      const eventKey = String(r?.eventKey || '');
      // Only events something in the code actually emits. A rule for an event nobody
      // fires would sit in the admin screen looking functional and never pay out.
      if (!known.has(eventKey as any)) continue;

      const coins = Number(r.coins);
      const dailyCap = Number(r.dailyCap);
      const monthlyCap = Number(r.monthlyCap);
      if ([coins, dailyCap, monthlyCap].some(v => !Number.isFinite(v) || v < 0)) {
        return res.status(400).json({ message: `Invalid numbers for ${eventKey}.` });
      }

      ops.push({
        updateOne: {
          filter: { tenantId, eventKey },
          update: {
            $set: {
              coins: Math.round(coins),
              dailyCap: Math.round(dailyCap),
              monthlyCap: Math.round(monthlyCap),
              enabled: !!r.enabled,
              ...(r.label ? { label: String(r.label).slice(0, 80) } : {}),
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length) await CoinRule.bulkWrite(ops);
    invalidateCoinCache(tenantId);

    const rules = await CoinRule.find({ tenantId }).sort({ eventKey: 1 }).lean();
    res.json({ rules });
  } catch (e: any) {
    console.error('[coins] saveRules:', e);
    res.status(500).json({ message: e.message || 'Could not save coin rules' });
  }
};

/** GET /passport/coins/admin/ledger — recent movements across all members. */
export const adminLedger = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const rows = await CoinLedger.find({ tenantId })
      .sort({ createdAt: -1 }).limit(200)
      .populate('studentId', 'firstName lastName email')
      .lean() as any[];

    res.json({
      entries: rows.map(r => ({
        at: r.createdAt, coins: r.coins, eventKey: r.eventKey, note: r.note || '',
        balanceAfter: r.balanceAfter,
        member: r.studentId
          ? `${r.studentId.firstName || ''} ${r.studentId.lastName || ''}`.trim() || r.studentId.email
          : '(deleted)',
      })),
    });
  } catch (e: any) {
    console.error('[coins] adminLedger:', e);
    res.status(500).json({ message: e.message || 'Could not load the coin ledger' });
  }
};
