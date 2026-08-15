import { Request, Response } from 'express';
import { RewardDefinition, RewardRedemption } from '../models/RewardModels';
import {
  loadStudentRewardContext, evaluateRewardEligibility,
} from '../services/rewardEligibilityService';
import { redeemReward } from '../services/rewardRedemptionService';
import { refusalMessage } from '../data/rewardPolicy';

/**
 * The student's side of rewards.
 *
 * THE STUDENT SENDS A REWARD KEY AND AN INTENT TOKEN. Nothing else. Not the coin cost, not
 * the budget cost, not the stock, not their own eligibility — every one is loaded server-side
 * from configuration. A request that could name its own price is a request that will.
 *
 * BUSINESS COST IS NEVER SERIALISED HERE. What a reward costs the company is not the
 * student's business, and publishing it would invite arbitrage between coin price and rupee
 * value — the exact confusion the two-price model exists to prevent.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');

/** GET /passport/me/rewards — the catalogue, with this student's standing against each. */
export const getRewardCatalogue = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const rewards = await RewardDefinition
      .find({ tenantId, active: true, studentVisible: true })
      .sort({ displayOrder: 1, name: 1 });

    // ONE context for the whole catalogue. Twenty rewards must not mean twenty balance
    // lookups, twenty badge queries and twenty budget reads.
    const ctx = await loadStudentRewardContext(tenantId, studentId);

    res.json({
      rewards: rewards.map(r => {
        const e = evaluateRewardEligibility(r, ctx);
        return {
          key: r.key,
          name: r.name,
          description: r.description,
          type: r.type,
          iconKey: r.iconKey,
          imageUrl: r.imageUrl,
          coinCost: r.coinCost,
          // budgetCostPaise is deliberately absent.
          stockMode: r.stockMode,
          stockAvailable: r.stockMode === 'LIMITED' ? r.stockAvailable : null,
          availableUntil: r.availableUntil,
          instructions: r.instructions,
          eligibility: {
            eligible: e.eligible,
            reasons: e.reasons,
            messages: e.reasons.map(refusalMessage),
            coinsShort: e.coinsShort,
            remainingStudentLimit: e.remainingStudentLimit,
          },
        };
      }),
      student: {
        coins: ctx.coins.spendable,
        coinBalance: ctx.coins.balance,
        expiredCoins: ctx.coins.expired,
        minRedemption: ctx.coins.minRedemption,
        // XP and level are shown so a student can see what gates a reward — never spent.
        xp: ctx.xp,
        level: ctx.level,
        canSpend: ctx.canSpend,
      },
    });
  } catch (e: any) {
    console.error('[rewards] catalogue:', e?.message || e);
    res.status(500).json({ message: 'Could not load rewards.' });
  }
};

/**
 * POST /passport/me/rewards/:key/redeem
 *
 * The intent token distinguishes a genuine second redemption of a repeatable reward from a
 * double-clicked button. A client that sends the same token twice gets one redemption; a
 * client that wants another reward sends a new one.
 */
export const redeemRewardForMe = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const rewardKey = String(req.params.key || '').toUpperCase();
    const intentToken = String(req.body?.intentToken || '').trim().slice(0, 80);
    if (!intentToken) return res.status(400).json({ code: 'INVALID_STATE', message: 'Missing redemption intent.' });

    const result = await redeemReward({ tenantId, studentId, rewardKey, intentToken });

    if (!result.ok) {
      const code = result.refused || 'REWARD_UNAVAILABLE';
      const status = code === 'REWARD_NOT_FOUND' ? 404 : 409;
      return res.status(status).json({
        code,
        reasons: result.reasons || [code],
        message: refusalMessage(code),
      });
    }

    const r: any = result.redemption;
    res.status(201).json({
      redemption: {
        id: String(r._id),
        rewardKey: r.rewardKey,
        rewardName: r.rewardName,
        coinCost: r.coinCost,
        status: r.status,
        requestedAt: r.requestedAt,
      },
      message: r.status === 'RESERVED'
        ? 'Reward reserved. We will update the status once it has been processed.'
        : 'Your reward is being processed.',
    });
  } catch (e: any) {
    console.error('[rewards] redeem:', e?.message || e);
    res.status(500).json({ message: 'Could not complete that redemption. Your coins were not taken.' });
  }
};

/** GET /passport/me/redemptions — the caller's own history, including cancellations. */
export const getMyRedemptions = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

    const rows = await RewardRedemption.find({ tenantId, studentId })
      .sort({ requestedAt: -1 }).limit(limit).lean() as any[];

    res.json({
      redemptions: rows.map(r => ({
        id: String(r._id),
        rewardKey: r.rewardKey,
        rewardName: r.rewardName,
        rewardType: r.rewardType,
        // The cost AS PAID. A later price change does not rewrite somebody's history.
        coinCost: r.coinCost,
        status: r.status,
        requestedAt: r.requestedAt,
        fulfilledAt: r.fulfilledAt,
        cancelledAt: r.cancelledAt,
        fulfillmentReference: r.fulfillmentReference,
        // Refunded coins are stated plainly, so a cancellation is not a mystery.
        refunded: r.status === 'CANCELLED' ? r.coinCost : 0,
      })),
    });
  } catch (e: any) {
    console.error('[rewards] my redemptions:', e?.message || e);
    res.status(500).json({ message: 'Could not load your redemptions.' });
  }
};
