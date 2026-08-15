import { Request, Response } from 'express';
import { GamificationConfig } from '../models/GamificationModels';
import {
  budgetSummary, periodKey, eligibleRevenuePaise, getConfig,
} from '../services/rewardBudgetService';
import { REWARD_BUDGET_MODES, paiseToRupees, budgetFromRevenue } from '../data/gamificationPolicy';

/**
 * How much reward value a tenant is willing to owe.
 *
 * ADMIN ONLY, AND DELIBERATELY SO. This is a financial control, not a student feature —
 * nothing here is reachable by a member, and no amount configured on this screen is visible
 * to one. XP is unaffected in either direction: raising the budget awards nobody anything,
 * and setting it to zero takes nobody's points away.
 *
 * PAISE THROUGHOUT. The API speaks integer paise and offers a rupee value alongside for
 * display only. Every accepted amount is floored to an integer before it is stored.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');

const withRupees = (summary: any) => ({
  ...summary,
  display: {
    revenueBase: paiseToRupees(summary.revenueBasePaise),
    calculatedBudget: paiseToRupees(summary.calculatedBudgetPaise),
    cap: paiseToRupees(summary.capPaise),
    effectiveBudget: paiseToRupees(summary.effectiveBudgetPaise),
    reserved: paiseToRupees(summary.reservedPaise),
    redeemed: paiseToRupees(summary.redeemedPaise),
    available: paiseToRupees(summary.availablePaise),
    averageReward: paiseToRupees(summary.averageRewardPaise),
  },
});

/** GET /passport/gamification/admin/reward-budget?period=YYYY-MM */
export const getRewardBudget = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const period = String(req.query.period || periodKey(new Date()));

    const [summary, cfg] = await Promise.all([
      budgetSummary(tenantId, period),
      getConfig(tenantId),
    ]);

    res.json({
      summary: withRupees(summary),
      policy: cfg.reward,
      modes: REWARD_BUDGET_MODES,
    });
  } catch (e: any) {
    console.error('[reward-budget] get:', e?.message || e);
    res.status(500).json({ message: 'Could not load the reward budget.' });
  }
};

/**
 * PUT /passport/gamification/admin/reward-budget
 *
 * `effectiveFrom` is the important one. Without it, switching rewards on would make every
 * membership ever sold count toward a budget somebody has to honour, and every point ever
 * earned eligible to draw on it. It is stored as given and never inferred.
 */
export const updateRewardBudget = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const b = req.body || {};
    const patch: any = { updatedBy: String((req as any).user?.id || '') };

    if (b.enabled !== undefined) patch['reward.enabled'] = !!b.enabled;

    if (b.mode !== undefined) {
      if (!REWARD_BUDGET_MODES.includes(b.mode)) {
        return res.status(400).json({ message: `Unknown budget mode: ${b.mode}` });
      }
      patch['reward.mode'] = b.mode;
    }

    // Amounts arrive in paise and are floored — a fractional paisa is not a thing, and
    // rounding one into existence is how ledgers stop reconciling.
    if (b.manualBudgetPaise !== undefined) {
      patch['reward.manualBudgetPaise'] = Math.max(0, Math.floor(Number(b.manualBudgetPaise) || 0));
    }
    if (b.capPaise !== undefined) {
      patch['reward.capPaise'] = Math.max(0, Math.floor(Number(b.capPaise) || 0));
    }
    if (b.basisPoints !== undefined) {
      // 10,000 basis points is 100%. Anything above it would be paying out more than the
      // revenue it is drawn from.
      patch['reward.basisPoints'] = Math.min(10000, Math.max(0, Math.floor(Number(b.basisPoints) || 0)));
    }
    if (b.effectiveFrom !== undefined) {
      const d = b.effectiveFrom ? new Date(b.effectiveFrom) : null;
      if (d && Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid effective date.' });
      patch['reward.effectiveFrom'] = d;
    }

    await GamificationConfig.updateOne({ tenantId }, { $set: patch }, { upsert: true });

    const summary = await budgetSummary(tenantId, periodKey(new Date()));
    res.json({ summary: withRupees(summary), policy: (await getConfig(tenantId)).reward });
  } catch (e: any) {
    console.error('[reward-budget] update:', e?.message || e);
    res.status(500).json({ message: 'Could not save the reward budget.' });
  }
};

/**
 * POST /passport/gamification/admin/reward-budget/preview
 *
 * What a policy WOULD produce against real paid membership revenue, without saving it.
 * Committing a percentage without seeing the number it yields is how a business discovers
 * its liability after the fact.
 */
export const previewRewardBudget = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const period = String(req.body?.period || periodKey(new Date()));
    const basisPoints = Math.min(10000, Math.max(0, Math.floor(Number(req.body?.basisPoints) || 0)));
    const capPaise = Math.max(0, Math.floor(Number(req.body?.capPaise) || 0));
    const effectiveFrom = req.body?.effectiveFrom ? new Date(req.body.effectiveFrom) : null;

    const revenueBasePaise = await eligibleRevenuePaise(tenantId, period, effectiveFrom);
    const calculated = budgetFromRevenue(revenueBasePaise, basisPoints);
    const effective = capPaise > 0 ? Math.min(calculated, capPaise) : calculated;

    res.json({
      period,
      revenueBasePaise, basisPoints,
      calculatedBudgetPaise: calculated,
      capPaise,
      effectiveBudgetPaise: effective,
      display: {
        revenueBase: paiseToRupees(revenueBasePaise),
        calculatedBudget: paiseToRupees(calculated),
        effectiveBudget: paiseToRupees(effective),
      },
    });
  } catch (e: any) {
    console.error('[reward-budget] preview:', e?.message || e);
    res.status(500).json({ message: 'Could not preview that budget.' });
  }
};
