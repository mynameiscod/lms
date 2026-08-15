import { Request, Response } from 'express';
import { RewardDefinition, RewardRedemption } from '../models/RewardModels';
import {
  fulfillRedemption, cancelRedemption, resumeRedemption, findStrandedRedemptions,
} from '../services/rewardRedemptionService';
import { budgetSummary, periodKey } from '../services/rewardBudgetService';
import { getCoinConfig } from '../services/coinService';
import AuditLog from '../models/AuditLog';
import {
  REWARD_TYPES, STOCK_MODES, FULFILLMENT_TYPES, paiseToRupees, refusalMessage,
} from '../data/rewardPolicy';

/**
 * Running the reward catalogue and the redemption queue.
 *
 * FULFILMENT IS FINANCIALLY MEANINGFUL, so every state change here goes through the saga
 * service rather than writing fields directly. An admin may fulfil, cancel, annotate and
 * recover; an admin may not hand-edit a snapshot, a reservation flag, a coin balance or a
 * budget counter, because those are the numbers the whole economy reconciles against.
 *
 * TENANT SCOPED THROUGHOUT. Every query and every transition carries the caller's tenant, so
 * one tenant's admin cannot fulfil another's redemption.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const adminOf = (req: Request): string => String((req as any).user?.id || '');

/** Best-effort audit. A failed log must never block a fulfilment that already happened. */
const audit = async (req: Request, action: string, details: Record<string, any>) => {
  try {
    await AuditLog.create({
      tenantId: tenantOf(req),
      userId: adminOf(req),
      action,
      details,
      timestamp: new Date(),
    } as any);
  } catch { /* observability is not worth failing a transition over */ }
};

// ── catalogue ───────────────────────────────────────────────────────────────

/** GET /passport/rewards/admin — the full catalogue, with the economics an admin needs. */
export const listRewardsAdmin = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [rewards, budget, coinCfg] = await Promise.all([
      RewardDefinition.find({ tenantId }).sort({ displayOrder: 1, name: 1 }).lean() as any,
      budgetSummary(tenantId, periodKey(new Date())),
      getCoinConfig(tenantId),
    ]);

    res.json({
      rewards: (rewards as any[]).map(r => ({
        ...r,
        // Labelled unambiguously — "cost" alone means two different things here.
        studentCostCoins: r.coinCost,
        businessCostRupees: paiseToRupees(r.budgetCostPaise),
      })),
      // Shown, not duplicated: these policies live in the coin config and stay there.
      policy: {
        minRedemption: coinCfg.minRedemption,
        annualRealCostBudgetInr: coinCfg.annualRealCostBudgetInr,
        expiryMonths: coinCfg.expiryMonths,
        freeMembersAccrue: coinCfg.freeMembersAccrue,
      },
      budget,
      vocabulary: { types: REWARD_TYPES, stockModes: STOCK_MODES, fulfillmentTypes: FULFILLMENT_TYPES },
    });
  } catch (e: any) {
    console.error('[rewards-admin] list:', e?.message || e);
    res.status(500).json({ message: 'Could not load the reward catalogue.' });
  }
};

const numeric = (v: any, min = 0) => Math.max(min, Math.floor(Number(v) || 0));

/** POST /passport/rewards/admin */
export const createReward = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const b = req.body || {};
    const key = String(b.key || '').trim().toUpperCase();

    if (!key || !String(b.name || '').trim()) {
      return res.status(400).json({ message: 'A reward needs a key and a name.' });
    }
    if (!REWARD_TYPES.includes(b.type)) {
      return res.status(400).json({ message: `Unknown reward type: ${b.type}` });
    }
    if (numeric(b.coinCost) < 1) {
      return res.status(400).json({ message: 'A reward must cost at least one coin.' });
    }

    const created = await RewardDefinition.create({
      tenantId, key,
      name: String(b.name).trim(),
      description: String(b.description || '').trim(),
      type: b.type,
      iconKey: b.iconKey || 'bi-gift-fill',
      imageUrl: b.imageUrl,
      coinCost: numeric(b.coinCost, 1),
      budgetCostPaise: numeric(b.budgetCostPaise),
      // Never active on creation. A financial liability is switched on deliberately.
      active: false,
      studentVisible: b.studentVisible !== false,
      stockMode: STOCK_MODES.includes(b.stockMode) ? b.stockMode : 'UNLIMITED',
      stockAvailable: numeric(b.stockAvailable),
      perStudentLimit: numeric(b.perStudentLimit),
      totalRedemptionLimit: numeric(b.totalRedemptionLimit),
      minimumXp: numeric(b.minimumXp),
      minimumLevel: numeric(b.minimumLevel),
      requiredBadgeKeys: Array.isArray(b.requiredBadgeKeys) ? b.requiredBadgeKeys.map(String) : [],
      availableFrom: b.availableFrom ? new Date(b.availableFrom) : undefined,
      availableUntil: b.availableUntil ? new Date(b.availableUntil) : undefined,
      fulfillmentType: 'MANUAL',
      instructions: b.instructions,
      displayOrder: numeric(b.displayOrder) || 100,
      createdBy: adminOf(req),
    });

    await audit(req, 'reward.created', { rewardKey: key, coinCost: created.coinCost, budgetCostPaise: created.budgetCostPaise });
    res.status(201).json({ reward: created });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'A reward with that key already exists.' });
    console.error('[rewards-admin] create:', e?.message || e);
    res.status(500).json({ message: e?.message || 'Could not create that reward.' });
  }
};

/**
 * PUT /passport/rewards/admin/:key
 *
 * The KEY is immutable — redemptions reference it, and renaming it would orphan history.
 * Changing a price affects FUTURE redemptions only; existing ones carry their snapshot.
 */
export const updateReward = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const key = String(req.params.key).toUpperCase();
    const b = req.body || {};
    const patch: any = { updatedBy: adminOf(req) };

    for (const f of ['name', 'description', 'iconKey', 'imageUrl', 'instructions']) {
      if (b[f] !== undefined) patch[f] = String(b[f]);
    }
    if (b.type !== undefined && REWARD_TYPES.includes(b.type)) patch.type = b.type;
    if (b.coinCost !== undefined) patch.coinCost = numeric(b.coinCost, 1);
    if (b.budgetCostPaise !== undefined) patch.budgetCostPaise = numeric(b.budgetCostPaise);
    if (b.active !== undefined) patch.active = !!b.active;
    if (b.studentVisible !== undefined) patch.studentVisible = !!b.studentVisible;
    if (b.stockMode !== undefined && STOCK_MODES.includes(b.stockMode)) patch.stockMode = b.stockMode;
    if (b.stockAvailable !== undefined) patch.stockAvailable = numeric(b.stockAvailable);
    if (b.perStudentLimit !== undefined) patch.perStudentLimit = numeric(b.perStudentLimit);
    if (b.totalRedemptionLimit !== undefined) patch.totalRedemptionLimit = numeric(b.totalRedemptionLimit);
    if (b.minimumXp !== undefined) patch.minimumXp = numeric(b.minimumXp);
    if (b.minimumLevel !== undefined) patch.minimumLevel = numeric(b.minimumLevel);
    if (Array.isArray(b.requiredBadgeKeys)) patch.requiredBadgeKeys = b.requiredBadgeKeys.map(String);
    if (b.displayOrder !== undefined) patch.displayOrder = numeric(b.displayOrder) || 100;
    if (b.availableFrom !== undefined) patch.availableFrom = b.availableFrom ? new Date(b.availableFrom) : null;
    if (b.availableUntil !== undefined) patch.availableUntil = b.availableUntil ? new Date(b.availableUntil) : null;

    const reward = await RewardDefinition.findOneAndUpdate({ tenantId, key }, { $set: patch }, { new: true });
    if (!reward) return res.status(404).json({ message: 'Reward not found.' });

    await audit(req, 'reward.updated', { rewardKey: key, changed: Object.keys(patch) });
    res.json({ reward });
  } catch (e: any) {
    console.error('[rewards-admin] update:', e?.message || e);
    res.status(500).json({ message: 'Could not update that reward.' });
  }
};

// ── redemption queue ────────────────────────────────────────────────────────

/** GET /passport/rewards/admin/redemptions — paginated; never the whole collection. */
export const listRedemptions = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const q: any = { tenantId };
    if (req.query.status) q.status = String(req.query.status).toUpperCase();
    if (req.query.rewardKey) q.rewardKey = String(req.query.rewardKey).toUpperCase();

    const [rows, total, counts] = await Promise.all([
      RewardRedemption.find(q).sort({ requestedAt: -1 }).skip(skip).limit(limit).lean() as any,
      RewardRedemption.countDocuments(q),
      RewardRedemption.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      redemptions: rows,
      total,
      counts: Object.fromEntries((counts as any[]).map(c => [c._id, c.n])),
    });
  } catch (e: any) {
    console.error('[rewards-admin] redemptions:', e?.message || e);
    res.status(500).json({ message: 'Could not load redemptions.' });
  }
};

/** POST /passport/rewards/admin/redemptions/:id/fulfill */
export const fulfill = async (req: Request, res: Response) => {
  try {
    const result = await fulfillRedemption({
      tenantId: tenantOf(req),
      redemptionId: String(req.params.id),
      adminId: adminOf(req),
      fulfillmentReference: req.body?.fulfillmentReference,
      notes: req.body?.notes,
    });

    if (!result.ok) {
      // A second click lands here: the first already moved it out of RESERVED.
      return res.status(409).json({ code: result.refused, message: refusalMessage(result.refused || 'INVALID_STATE') });
    }

    await audit(req, 'reward.fulfilled', {
      redemptionId: String(req.params.id), rewardKey: result.redemption?.rewardKey,
    });
    res.json({ redemption: result.redemption });
  } catch (e: any) {
    console.error('[rewards-admin] fulfill:', e?.message || e);
    res.status(500).json({ message: 'Could not fulfil that redemption.' });
  }
};

/** POST /passport/rewards/admin/redemptions/:id/cancel — refunds coins and releases both budgets. */
export const cancel = async (req: Request, res: Response) => {
  try {
    const result = await cancelRedemption({
      tenantId: tenantOf(req),
      redemptionId: String(req.params.id),
      adminId: adminOf(req),
      reason: req.body?.reason,
    });

    if (!result.ok) {
      return res.status(409).json({ code: result.refused, message: refusalMessage(result.refused || 'INVALID_STATE') });
    }

    await audit(req, 'reward.cancelled', {
      redemptionId: String(req.params.id), rewardKey: result.redemption?.rewardKey,
      reason: req.body?.reason,
    });
    res.json({ redemption: result.redemption });
  } catch (e: any) {
    console.error('[rewards-admin] cancel:', e?.message || e);
    res.status(500).json({ message: 'Could not cancel that redemption.' });
  }
};

/**
 * GET/POST recovery for redemptions stranded mid-saga.
 *
 * The only sanctioned way to touch a PENDING redemption: it re-runs the saga, which either
 * finishes acquiring what is missing or gives back what was taken. An admin cannot flip the
 * reservation flags by hand, because those flags are what makes the compensation correct.
 */
export const listStranded = async (req: Request, res: Response) => {
  try {
    const rows = await findStrandedRedemptions(tenantOf(req));
    res.json({ stranded: rows });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not load stranded redemptions.' });
  }
};

export const recover = async (req: Request, res: Response) => {
  try {
    const redemption: any = await RewardRedemption.findOne({
      _id: String(req.params.id), tenantId: tenantOf(req),
    });
    if (!redemption) return res.status(404).json({ message: 'Redemption not found.' });

    const result = await resumeRedemption(redemption);
    await audit(req, 'reward.recovered', {
      redemptionId: String(req.params.id), outcome: result.ok ? 'reserved' : (result.refused || 'compensated'),
    });

    res.json({ ok: result.ok, redemption: result.redemption, refused: result.refused });
  } catch (e: any) {
    console.error('[rewards-admin] recover:', e?.message || e);
    res.status(500).json({ message: 'Could not recover that redemption.' });
  }
};
