import { Request, Response } from 'express';
import PassportProgress from '../models/PassportProgress';
import {
  XpRule, XpLedger, BadgeDefinition, StudentBadge, GamificationConfig, XpTaskOverride,
} from '../models/GamificationModels';
import {
  loadXpPricing, invalidateXpPricing, cleanXp, overrideKey,
} from '../services/xpPricingService';
import { ensureGamificationDefaults } from '../services/gamificationEngine';
import { getLeaderboard, rankSummary } from '../services/leaderboardService';
import { levelFromXp } from '../services/passportGamificationService';
import { liveStreak } from '../services/passportXpService';
import { conversionStatus } from '../services/xpConversionService';
import {
  TASK_XP_TYPES, TASK_XP_MAX,
  XP_EVENTS, LEADERBOARD_PERIODS, LeaderboardScope, LeaderboardPeriod,
  DEFAULT_TOP_N, isScopeSupported,
} from '../data/gamificationPolicy';

/**
 * Reading a student's engagement standing, and configuring what drives it.
 *
 * STUDENTS READ, THEY DO NOT AWARD. There is deliberately no endpoint through which a client
 * can grant XP, a badge, a streak day or a rank. Awards happen inside trusted server flows
 * that already proved the work was done; anything else would make the leaderboard a
 * measure of who read the API docs.
 *
 * NOTHING HERE IS A CAPABILITY. XP, levels, badges and rank say how much somebody has
 * engaged. They say nothing about what they can do, and this payload carries no readiness,
 * no skill score and no assessment result to imply otherwise.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');

/** GET /passport/me/gamification — the caller's own standing. */
export const getMyGamification = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    // First read installs the shipped defaults, the same insert-missing discipline Modules
    // 3-5 use. An admin's edits and anything they disabled are never touched.
    await ensureGamificationDefaults(tenantId);

    const [progress, earned, definitions, ranks, conversion] = await Promise.all([
      PassportProgress.findOne({ tenantId, studentId }).select('xp streak longestStreak lastCompletedDate').lean() as any,
      StudentBadge.find({ tenantId, studentId }).sort({ awardedAt: -1 }).lean() as any,
      BadgeDefinition.find({ tenantId, active: true }).sort({ displayOrder: 1 }).lean() as any,
      rankSummary(tenantId, studentId),
      // Decoration: Home's coin tile says what XP can become. A failure here never costs the page.
      conversionStatus(tenantId, studentId).catch(() => null),
    ]);

    const xp = progress?.xp || 0;
    const held = new Map((earned as any[]).map(b => [b.badgeKey, b.awardedAt]));

    res.json({
      xp,
      // Reuses the existing level curve rather than inventing a second progression.
      level: levelFromXp(xp),
      // The streak as it stands today (Home and the top bar show the same): the stored number only
      // changes when XP is earned, so a lapsed streak kept showing here.
      streak: progress ? liveStreak(progress) : 0,
      longestStreak: progress?.longestStreak || 0,
      badges: (definitions as any[]).map(d => ({
        key: d.key, name: d.name, description: d.description, iconKey: d.iconKey,
        earned: held.has(d.key),
        awardedAt: held.get(d.key) || null,
      })),
      earnedCount: held.size,
      ranks,
      /** XP → coins, when switched on: the rate and what this member could convert now. */
      conversion: conversion?.enabled ? {
        xpPerCoin: conversion.xpPerCoin, availableXp: conversion.availableXp,
        coinsAvailable: conversion.coinsAvailable, xpToNextCoin: conversion.xpToNextCoin,
      } : null,
    });
  } catch (e: any) {
    console.error('[gamification] me:', e?.message || e);
    res.status(500).json({ message: 'Could not load your progress.' });
  }
};

/**
 * GET /passport/me/gamification/xp-history — where a balance came from.
 *
 * The ledger, newest first. "Why do I have 8,420 XP?" should be answerable by the student
 * who asked, not only by an admin reading the database.
 */
export const getMyXpHistory = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

    const rows = await XpLedger.find({ tenantId, studentId })
      .select('eventKey amount at sourceType').sort({ at: -1 }).limit(limit).lean() as any[];

    res.json({ entries: rows.map(r => ({
      eventKey: r.eventKey, amount: r.amount, at: r.at, sourceType: r.sourceType,
    })) });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not load your XP history.' });
  }
};

/** GET /passport/me/leaderboard?scope=&period= */
export const getMyLeaderboard = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const scope = String(req.query.scope || 'COLLEGE').toUpperCase() as LeaderboardScope;
    const period = String(req.query.period || 'ALL_TIME').toUpperCase() as LeaderboardPeriod;
    if (!LEADERBOARD_PERIODS.includes(period)) {
      return res.status(400).json({ message: 'Unknown period.' });
    }

    /**
     * The student names a SCOPE, never a group.
     *
     * Their college and their tenant come from stored context, so there is no parameter
     * through which somebody could ask for another college's board.
     */
    const cfg: any = await GamificationConfig.findOne({ tenantId }).lean();
    const board = await getLeaderboard({
      tenantId, studentId, scope, period,
      limit: Math.min(Number(req.query.limit) || (cfg?.leaderboard?.topN ?? DEFAULT_TOP_N), 100),
    });

    res.json(board);
  } catch (e: any) {
    console.error('[gamification] leaderboard:', e?.message || e);
    res.status(500).json({ message: 'Could not load the leaderboard.' });
  }
};

// ── admin ───────────────────────────────────────────────────────────────────

/** GET /passport/gamification/admin — rules, badges and settings for this tenant. */
export const getAdminGamification = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    await ensureGamificationDefaults(tenantId);

    const [rules, badges, cfg, pricing, overrides] = await Promise.all([
      XpRule.find({ tenantId }).sort({ eventKey: 1 }).lean() as any,
      BadgeDefinition.find({ tenantId }).sort({ displayOrder: 1 }).lean() as any,
      GamificationConfig.findOne({ tenantId }).lean() as any,
      loadXpPricing(tenantId),
      XpTaskOverride.find({ tenantId }).sort({ updatedAt: -1 }).lean() as any,
    ]);

    res.json({
      rules,
      badges,
      settings: cfg?.leaderboard || null,
      // The catalogue, so the screen can explain what each event means without hardcoding it.
      events: XP_EVENTS.map(e => ({
        key: e.key, name: e.name, description: e.description, defaultXp: e.defaultXp,
      })),
      /** What each type of journey task pays, and what it paid before anybody changed it. */
      taskTypes: TASK_XP_TYPES.map(t => ({ key: t.key, label: t.label, defaultXp: t.defaultXp, xp: pricing.byType[t.key] })),
      /** Tasks an admin priced one by one. */
      taskOverrides: (overrides as any[]).map(o => ({
        refKind: o.refKind, refId: o.refId, xp: o.xp, title: o.title || '', updatedAt: o.updatedAt,
      })),
      taskXpMax: TASK_XP_MAX,
      supportedScopes: ['COLLEGE', 'GLOBAL'],
      unsupportedScopes: ['DISTRICT', 'STATE'],
    });
  } catch (e: any) {
    console.error('[gamification] admin:', e?.message || e);
    res.status(500).json({ message: 'Could not load gamification settings.' });
  }
};

/** PUT /passport/gamification/admin/rules/:eventKey */
export const updateXpRule = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const eventKey = String(req.params.eventKey).toUpperCase();
    if (!XP_EVENTS.some(e => e.key === eventKey)) {
      return res.status(400).json({ message: `Unknown event: ${eventKey}` });
    }

    const patch: any = { updatedBy: String((req as any).user?.id || '') };
    if (req.body?.enabled !== undefined) patch.enabled = !!req.body.enabled;
    if (req.body?.xp !== undefined) patch.xp = Math.max(0, Number(req.body.xp) || 0);
    if (req.body?.dailyLimit !== undefined) patch.dailyLimit = Math.max(0, Number(req.body.dailyLimit) || 0);
    if (req.body?.streakQualifying !== undefined) patch.streakQualifying = !!req.body.streakQualifying;

    const rule = await XpRule.findOneAndUpdate(
      { tenantId, eventKey }, { $set: patch }, { new: true, upsert: true },
    );
    // The day bonus and the task switch are rules; the price list reads them.
    invalidateXpPricing(tenantId);
    res.json({ rule });
  } catch (e: any) {
    console.error('[gamification] update rule:', e?.message || e);
    res.status(500).json({ message: 'Could not save that rule.' });
  }
};

/**
 * PUT /passport/gamification/admin/badges/:key
 *
 * Presentation and the threshold may change. The KEY may not — awards reference it, and
 * renaming it would orphan every badge already earned.
 */
export const updateBadge = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const key = String(req.params.key).toUpperCase();

    const patch: any = { updatedBy: String((req as any).user?.id || '') };
    if (req.body?.name !== undefined) patch.name = String(req.body.name).slice(0, 60);
    if (req.body?.description !== undefined) patch.description = String(req.body.description).slice(0, 300);
    if (req.body?.iconKey !== undefined) patch.iconKey = String(req.body.iconKey).slice(0, 60);
    if (req.body?.active !== undefined) patch.active = !!req.body.active;
    if (req.body?.threshold !== undefined) {
      patch['conditionConfig.threshold'] = Math.max(1, Number(req.body.threshold) || 1);
    }

    const badge = await BadgeDefinition.findOneAndUpdate({ tenantId, key }, { $set: patch }, { new: true });
    if (!badge) return res.status(404).json({ message: 'Badge not found.' });
    res.json({ badge });
  } catch (e: any) {
    console.error('[gamification] update badge:', e?.message || e);
    res.status(500).json({ message: 'Could not save that badge.' });
  }
};

/** PUT /passport/gamification/admin/leaderboard */
export const updateLeaderboardSettings = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const b = req.body || {};
    const patch: any = { updatedBy: String((req as any).user?.id || '') };

    for (const flag of ['collegeEnabled', 'globalEnabled', 'weeklyEnabled', 'monthlyEnabled', 'allTimeEnabled']) {
      if (b[flag] !== undefined) patch[`leaderboard.${flag}`] = !!b[flag];
    }
    if (b.topN !== undefined) {
      patch['leaderboard.topN'] = Math.min(100, Math.max(10, Number(b.topN) || DEFAULT_TOP_N));
    }

    const cfg = await GamificationConfig.findOneAndUpdate(
      { tenantId }, { $set: patch }, { new: true, upsert: true },
    );
    res.json({ settings: cfg.leaderboard });
  } catch (e: any) {
    console.error('[gamification] leaderboard settings:', e?.message || e);
    res.status(500).json({ message: 'Could not save those settings.' });
  }
};

// ── task XP ─────────────────────────────────────────────────────────────────

const taskTypeRows = async (tenantId: string) => {
  const pricing = await loadXpPricing(tenantId);
  return TASK_XP_TYPES.map(t => ({ key: t.key, label: t.label, defaultXp: t.defaultXp, xp: pricing.byType[t.key] }));
};

/**
 * PUT /passport/gamification/admin/task-xp — what each type of journey task pays.
 *
 * Body: { byType: { video: 5, quiz: 20, ... } }. Only known types are kept; a type left out keeps its
 * price. Applies to XP earned from now on — XP already paid is never re-priced.
 */
export const updateTaskXp = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const byType = req.body?.byType || {};
    const patch: any = { updatedBy: String((req as any).user?.id || '') };
    for (const t of TASK_XP_TYPES) {
      if (byType[t.key] === undefined) continue;
      const xp = cleanXp(byType[t.key]);
      if (xp === null) return res.status(400).json({ message: `${t.label}: enter a whole number from 0 to ${TASK_XP_MAX}.` });
      patch[`taskXp.${t.key}`] = xp;
    }
    await GamificationConfig.findOneAndUpdate({ tenantId }, { $set: patch }, { upsert: true });
    invalidateXpPricing(tenantId);
    res.json({ taskTypes: await taskTypeRows(tenantId) });
  } catch (e: any) {
    console.error('[gamification] task xp:', e?.message || e);
    res.status(500).json({ message: 'Could not save the task XP.' });
  }
};

/**
 * GET /passport/gamification/task-prices — the price list, for the Content Builder.
 *
 * The builder shows every task's "+N XP" from this, so it can never disagree with what a member is paid.
 */
export const getTaskPrices = async (req: Request, res: Response) => {
  try {
    const pricing = await loadXpPricing(tenantOf(req));
    res.json({
      byType: pricing.byType,
      overrides: Object.fromEntries(pricing.overrides),
      dayBonus: pricing.dayBonus,
      tasksEnabled: pricing.tasksEnabled,
      max: TASK_XP_MAX,
    });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not load the XP prices.' });
  }
};

const refOf = (b: any): { refKind: 'content' | 'module'; refId: string } | null => {
  const refKind = b?.refKind === 'module' ? 'module' : b?.refKind === 'content' ? 'content' : null;
  const refId = String(b?.refId || '').trim();
  if (!refKind || !/^[a-f0-9]{24}$/i.test(refId)) return null;
  return { refKind, refId };
};

/**
 * PUT /passport/gamification/task-prices/override — what ONE task pays, wherever it appears.
 *
 * Body: { refKind: 'content'|'module', refId, xp, title? }. Reaches every member's open days at once,
 * because the price is read when the task is paid, not copied onto the day.
 */
export const setTaskOverride = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const ref = refOf(req.body);
    if (!ref) return res.status(400).json({ message: 'Which task? refKind and refId are required.' });
    const xp = cleanXp(req.body?.xp);
    if (xp === null) return res.status(400).json({ message: `Enter a whole number from 0 to ${TASK_XP_MAX}.` });
    await XpTaskOverride.findOneAndUpdate(
      { tenantId, ...ref },
      { $set: { xp, title: String(req.body?.title || '').slice(0, 200), updatedBy: String((req as any).user?.id || '') } },
      { upsert: true },
    );
    invalidateXpPricing(tenantId);
    res.json({ key: overrideKey(ref.refKind, ref.refId), xp });
  } catch (e: any) {
    console.error('[gamification] task override:', e?.message || e);
    res.status(500).json({ message: 'Could not save that task XP.' });
  }
};

/** DELETE /passport/gamification/task-prices/override?refKind=&refId= — back to its type's price. */
export const clearTaskOverride = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const ref = refOf(req.query);
    if (!ref) return res.status(400).json({ message: 'Which task? refKind and refId are required.' });
    await XpTaskOverride.deleteOne({ tenantId, ...ref });
    invalidateXpPricing(tenantId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not reset that task XP.' });
  }
};

export { isScopeSupported };
