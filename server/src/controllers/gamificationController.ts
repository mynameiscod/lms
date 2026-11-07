import { Request, Response } from 'express';
import PassportProgress from '../models/PassportProgress';
import {
  XpRule, XpLedger, BadgeDefinition, StudentBadge, GamificationConfig, XpTaskOverride,
} from '../models/GamificationModels';
import {
  loadXpPricing, invalidateXpPricing, cleanXp, overrideKey,
} from '../services/xpPricingService';
import { ensureGamificationDefaults } from '../services/gamificationEngine';
import { labStreakSettings, LAB_FREEZE_EVERY_MAX, LAB_FREEZE_HOLD_MAX } from '../data/labStreakPolicy';
import { getLeaderboard, rankSummary } from '../services/leaderboardService';
import { levelFromXp } from '../services/passportGamificationService';
import { levelNamesFor, invalidateLevelNames } from '../services/levelNameService';
import { ruleSentence } from '../services/badgeService';
import { liveStreak } from '../services/passportXpService';
import { conversionStatus } from '../services/xpConversionService';
import { CoinLedger } from '../models/CoinModels';
import { RewardDefinition, RewardRedemption } from '../models/RewardModels';
import { budgetSummary, periodKey } from '../services/rewardBudgetService';
import { getCoinConfig } from '../services/coinService';
import { XP_CONVERSION_EVENT } from '../services/xpConversionService';
import { paiseToRupees } from '../data/rewardPolicy';
import {
  TASK_XP_TYPES, TASK_XP_MAX,
  XP_EVENTS, LEADERBOARD_PERIODS, LeaderboardScope, LeaderboardPeriod,
  DEFAULT_TOP_N, isScopeSupported,
  BADGE_CONDITIONS, isBadgeCondition, DEFAULT_LEVEL_NAMES, MAX_NAMED_LEVELS, LEVEL_NAME_MAX,
} from '../data/gamificationPolicy';
import { xpToReachLevel } from '../services/passportGamificationService';

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
      level: levelFromXp(xp, await levelNamesFor(tenantId)),
      // The streak as it stands today (Home and the top bar show the same): the stored number only
      // changes when XP is earned, so a lapsed streak kept showing here.
      streak: progress ? liveStreak(progress) : 0,
      longestStreak: progress?.longestStreak || 0,
      badges: (definitions as any[]).map(d => ({
        key: d.key, name: d.name, description: d.description, iconKey: d.iconKey, color: d.color,
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

    const [rules, badges, cfg, pricing, overrides, holders] = await Promise.all([
      XpRule.find({ tenantId }).sort({ eventKey: 1 }).lean() as any,
      BadgeDefinition.find({ tenantId }).sort({ displayOrder: 1, createdAt: 1 }).lean() as any,
      GamificationConfig.findOne({ tenantId }).lean() as any,
      loadXpPricing(tenantId),
      XpTaskOverride.find({ tenantId }).sort({ updatedAt: -1 }).lean() as any,
      StudentBadge.aggregate([{ $match: { tenantId } }, { $group: { _id: '$badgeKey', n: { $sum: 1 } } }]),
    ]);
    const earnedBy = new Map<string, number>((holders as any[]).map(h => [h._id, h.n]));

    res.json({
      rules,
      badges: (badges as any[]).map(badgeRow(earnedBy)),
      /** The rules a badge can use, in words. */
      badgeConditions: BADGE_CONDITIONS,
      levels: levelsPayload(cfg?.levelNames),
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
      /** Thinking Lab and Communication Lab streak freezes. */
      labStreak: { ...labStreakSettings(cfg?.labStreak), everyMax: LAB_FREEZE_EVERY_MAX, holdMax: LAB_FREEZE_HOLD_MAX },
      supportedScopes: ['COLLEGE', 'GLOBAL'],
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

// ── badges and levels ───────────────────────────────────────────────────────

const badgeRow = (earnedBy: Map<string, number>) => (d: any) => ({
  key: d.key, name: d.name, description: d.description || '', iconKey: d.iconKey, color: d.color || '#f59e0b',
  active: !!d.active, conditionType: d.conditionType,
  threshold: d.conditionConfig?.threshold || 1, eventKey: d.conditionConfig?.eventKey || null,
  displayOrder: d.displayOrder,
  /** The rule in words — what a member sees when the description is empty. */
  rule: ruleSentence(d.conditionType, d.conditionConfig?.threshold || 1, d.conditionConfig?.eventKey),
  earnedBy: earnedBy.get(d.key) || 0,
});

const HEX = /^#[0-9a-f]{6}$/i;
const ICON = /^bi-[a-z0-9-]{1,50}$/;

/**
 * The editable part of a badge, checked: the fields to $set (and to $unset, as undefined), or why
 * not. `creating` demands the fields a new badge must have.
 */
function badgePatch(b: any, creating: boolean): { patch: Record<string, any> } | { error: string } {
  const patch: Record<string, any> = {};
  if (b.name !== undefined || creating) {
    const name = String(b.name || '').trim().slice(0, 60);
    if (!name) return { error: 'Give the badge a name.' };
    patch.name = name;
  }
  if (b.description !== undefined) patch.description = String(b.description || '').trim().slice(0, 300);
  if (b.iconKey !== undefined) {
    if (!ICON.test(String(b.iconKey))) return { error: 'Pick an icon for the badge.' };
    patch.iconKey = String(b.iconKey);
  }
  if (b.color !== undefined) {
    if (!HEX.test(String(b.color))) return { error: 'Pick a colour for the badge.' };
    patch.color = String(b.color).toLowerCase();
  }
  if (b.active !== undefined) patch.active = !!b.active;

  if (b.conditionType !== undefined || creating) {
    const type = String(b.conditionType || '');
    if (!isBadgeCondition(type)) return { error: 'Choose what the member has to do.' };
    patch.conditionType = type;
    if (type === 'EVENT_COUNT') {
      const ev = String(b.eventKey || '').toUpperCase();
      if (!XP_EVENTS.some(e => e.key === ev)) return { error: 'Choose which activity is counted.' };
      patch['conditionConfig.eventKey'] = ev;
    } else {
      patch['conditionConfig.eventKey'] = undefined;
    }
  }
  if (b.threshold !== undefined || creating) {
    const n = Number(b.threshold);
    const cond = BADGE_CONDITIONS.find(c => c.type === (patch.conditionType || b.conditionType));
    const max = cond?.max ?? 1_000_000;
    if (!Number.isInteger(n) || n < 1 || n > max) return { error: `The target must be a whole number from 1 to ${max.toLocaleString('en-IN')}.` };
    patch['conditionConfig.threshold'] = n;
  }
  return { patch };
}

/** A key for a new badge from its name, unique in the tenant. Keys never change once given. */
async function newBadgeKey(tenantId: string, name: string): Promise<string> {
  const base = (name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'BADGE').slice(0, 40);
  for (let i = 0; i < 50; i++) {
    const key = i ? `${base}_${i + 1}` : base;
    if (!(await BadgeDefinition.exists({ tenantId, key }))) return key;
  }
  return `${base}_${Date.now().toString(36).toUpperCase()}`;
}

const adminBadges = async (tenantId: string) => {
  const [badges, holders] = await Promise.all([
    BadgeDefinition.find({ tenantId }).sort({ displayOrder: 1, createdAt: 1 }).lean() as any,
    StudentBadge.aggregate([{ $match: { tenantId } }, { $group: { _id: '$badgeKey', n: { $sum: 1 } } }]),
  ]);
  return (badges as any[]).map(badgeRow(new Map((holders as any[]).map(h => [h._id, h.n]))));
};

/** POST /passport/gamification/admin/badges — a new badge with its rule. */
export const createBadge = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const checked = badgePatch(req.body || {}, true);
    if ('error' in checked) return res.status(400).json({ message: checked.error });
    const p = checked.patch;
    const last: any = await BadgeDefinition.findOne({ tenantId }).sort({ displayOrder: -1 }).select('displayOrder').lean();
    await BadgeDefinition.create({
      tenantId,
      key: await newBadgeKey(tenantId, p.name),
      name: p.name,
      description: p.description || '',
      iconKey: p.iconKey || 'bi-award-fill',
      color: p.color || '#f59e0b',
      active: p.active ?? true,
      conditionType: p.conditionType,
      conditionConfig: { threshold: p['conditionConfig.threshold'], eventKey: p['conditionConfig.eventKey'] },
      displayOrder: (last?.displayOrder || 0) + 10,
      updatedBy: String((req as any).user?.id || ''),
    });
    res.json({ badges: await adminBadges(tenantId) });
  } catch (e: any) {
    console.error('[gamification] create badge:', e?.message || e);
    res.status(500).json({ message: 'Could not create that badge.' });
  }
};

/**
 * PUT /passport/gamification/admin/badges/:key
 *
 * Everything but the KEY may change — awards reference it. A member who already earned the badge
 * keeps it when the rule changes; a member who now meets it is awarded the next time they look.
 */
export const updateBadge = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const key = String(req.params.key).toUpperCase();
    const checked = badgePatch(req.body || {}, false);
    if ('error' in checked) return res.status(400).json({ message: checked.error });
    const set: Record<string, any> = { updatedBy: String((req as any).user?.id || '') };
    const unset: Record<string, ''> = {};
    for (const [k, v] of Object.entries(checked.patch)) {
      if (v === undefined) unset[k] = ''; else set[k] = v;
    }

    const badge = await BadgeDefinition.findOneAndUpdate(
      { tenantId, key }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true },
    );
    if (!badge) return res.status(404).json({ message: 'Badge not found.' });
    res.json({ badges: await adminBadges(tenantId) });
  } catch (e: any) {
    console.error('[gamification] update badge:', e?.message || e);
    res.status(500).json({ message: 'Could not save that badge.' });
  }
};

/**
 * DELETE /passport/gamification/admin/badges/:key
 *
 * Only a badge nobody has earned. Taking a badge back from members is not something a tidy-up
 * should do by accident — one that has been earned can be switched off instead.
 */
export const deleteBadge = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const key = String(req.params.key).toUpperCase();
    const earned = await StudentBadge.countDocuments({ tenantId, badgeKey: key });
    if (earned) {
      return res.status(409).json({ message: `${earned} member${earned === 1 ? ' has' : 's have'} earned this badge, so it can't be deleted. Switch it off to hide it instead.` });
    }
    const r = await BadgeDefinition.deleteOne({ tenantId, key });
    if (!r.deletedCount) return res.status(404).json({ message: 'Badge not found.' });
    res.json({ badges: await adminBadges(tenantId) });
  } catch (e: any) {
    console.error('[gamification] delete badge:', e?.message || e);
    res.status(500).json({ message: 'Could not delete that badge.' });
  }
};

/** PUT /passport/gamification/admin/badges-order — body { keys: [...] }, the order members see. */
export const reorderBadges = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const keys: string[] = Array.isArray(req.body?.keys) ? req.body.keys.map((k: any) => String(k).toUpperCase()) : [];
    if (!keys.length) return res.status(400).json({ message: 'Which order?' });
    await BadgeDefinition.bulkWrite(keys.map((key, i) => ({
      updateOne: { filter: { tenantId, key }, update: { $set: { displayOrder: (i + 1) * 10 } } },
    })));
    res.json({ badges: await adminBadges(tenantId) });
  } catch (e: any) {
    console.error('[gamification] reorder badges:', e?.message || e);
    res.status(500).json({ message: 'Could not save that order.' });
  }
};

/** The level ladder for the admin: each level's name and the XP that reaches it. */
const levelsPayload = (saved?: string[]) => {
  const names = Array.isArray(saved) && saved.length ? saved : DEFAULT_LEVEL_NAMES;
  return {
    names,
    defaults: DEFAULT_LEVEL_NAMES,
    custom: !!(saved && saved.length),
    max: MAX_NAMED_LEVELS,
    nameMax: LEVEL_NAME_MAX,
    /** XP to reach level 1..max+1, so the screen can show it beside each name. */
    xpToReach: Array.from({ length: MAX_NAMED_LEVELS + 1 }, (_, i) => xpToReachLevel(i + 1)),
  };
};

/**
 * PUT /passport/gamification/admin/levels — body { names: [...] }, level 1 first; [] restores the
 * shipped names. Names only: the XP each level needs is fixed, because rewards are gated on level.
 */
export const updateLevelNames = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const raw = req.body?.names;
    if (!Array.isArray(raw)) return res.status(400).json({ message: 'Send the list of level names.' });
    if (raw.length > MAX_NAMED_LEVELS) return res.status(400).json({ message: `Up to ${MAX_NAMED_LEVELS} levels can be named.` });
    const names = raw.map((n: any) => String(n ?? '').trim().slice(0, LEVEL_NAME_MAX));
    const blank = names.findIndex((n: string) => !n);
    if (blank >= 0) return res.status(400).json({ message: `Level ${blank + 1} needs a name.` });

    const cfg = await GamificationConfig.findOneAndUpdate(
      { tenantId },
      { $set: { levelNames: names, updatedBy: String((req as any).user?.id || '') } },
      { new: true, upsert: true },
    ).lean() as any;
    invalidateLevelNames(tenantId);
    res.json({ levels: levelsPayload(cfg?.levelNames) });
  } catch (e: any) {
    console.error('[gamification] level names:', e?.message || e);
    res.status(500).json({ message: 'Could not save the level names.' });
  }
};

/** PUT /passport/gamification/admin/lab-streak  { freezeEvery, freezeMax } */
export const updateLabStreak = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const every = Number(req.body?.freezeEvery), max = Number(req.body?.freezeMax);
    if (!Number.isInteger(every) || every < 0 || every > LAB_FREEZE_EVERY_MAX) return res.status(400).json({ message: `Earn a freeze every 0 to ${LAB_FREEZE_EVERY_MAX} days (0 switches freezes off).` });
    if (!Number.isInteger(max) || max < 0 || max > LAB_FREEZE_HOLD_MAX) return res.status(400).json({ message: `A member can hold 0 to ${LAB_FREEZE_HOLD_MAX} freezes.` });
    const cfg = await GamificationConfig.findOneAndUpdate(
      { tenantId },
      { $set: { labStreak: { freezeEvery: every, freezeMax: max }, updatedBy: String((req as any).user?.id || '') } },
      { new: true, upsert: true },
    ).lean() as any;
    res.json({ labStreak: { ...labStreakSettings(cfg?.labStreak), everyMax: LAB_FREEZE_EVERY_MAX, holdMax: LAB_FREEZE_HOLD_MAX } });
  } catch (e: any) {
    console.error('[gamification] lab streak:', e?.message || e);
    res.status(500).json({ message: 'Could not save the lab streak settings.' });
  }
};

/** PUT /passport/gamification/admin/leaderboard */
export const updateLeaderboardSettings = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const b = req.body || {};
    const patch: any = { updatedBy: String((req as any).user?.id || '') };

    for (const flag of ['collegeEnabled', 'weeklyEnabled', 'monthlyEnabled', 'allTimeEnabled']) {
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

/**
 * GET /passport/gamification/admin/overview — the XP & Rewards page's figures, this month.
 *
 * Read-only sums over the ledgers; each figure is independent, so one failing shows as null
 * rather than taking the page's header down.
 */
export const getAdminOverview = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const safe = <T,>(p: Promise<T>) => p.catch(() => null);

    const [xp, converted, waiting, liveRewards, budget, coinCfg] = await Promise.all([
      safe(XpLedger.aggregate([
        { $match: { tenantId, at: { $gte: monthStart }, amount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$amount' }, members: { $addToSet: '$studentId' } } },
        { $project: { total: 1, members: { $size: '$members' } } },
      ])),
      safe(CoinLedger.aggregate([
        { $match: { tenantId, eventKey: XP_CONVERSION_EVENT, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, coins: { $sum: '$coins' }, members: { $addToSet: '$studentId' } } },
        { $project: { coins: 1, members: { $size: '$members' } } },
      ])),
      safe(RewardRedemption.countDocuments({ tenantId, status: 'RESERVED' })),
      safe(RewardDefinition.countDocuments({ tenantId, active: true })),
      safe(budgetSummary(tenantId, periodKey(now))),
      safe(getCoinConfig(tenantId)),
    ]);

    res.json({
      xpThisMonth: xp ? { total: (xp as any[])[0]?.total || 0, members: (xp as any[])[0]?.members || 0 } : null,
      conversion: coinCfg ? {
        enabled: !!(coinCfg.enabled && coinCfg.xpConversionEnabled),
        xpPerCoin: coinCfg.xpPerCoin || 100,
        coinsThisMonth: (converted as any[] | null)?.[0]?.coins || 0,
        members: (converted as any[] | null)?.[0]?.members || 0,
      } : null,
      waiting,
      liveRewards,
      store: budget ? {
        open: !!budget.enabled,
        budgetRupees: paiseToRupees(budget.effectiveBudgetPaise),
        leftRupees: paiseToRupees(budget.availablePaise),
      } : null,
    });
  } catch (e: any) {
    console.error('[gamification] overview:', e?.message || e);
    res.status(500).json({ message: 'Could not load the overview.' });
  }
};

export { isScopeSupported };
