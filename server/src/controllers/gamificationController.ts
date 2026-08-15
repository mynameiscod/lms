import { Request, Response } from 'express';
import PassportProgress from '../models/PassportProgress';
import {
  XpRule, XpLedger, BadgeDefinition, StudentBadge, GamificationConfig,
} from '../models/GamificationModels';
import { ensureGamificationDefaults } from '../services/gamificationEngine';
import { getLeaderboard, rankSummary } from '../services/leaderboardService';
import { levelFromXp } from '../services/passportGamificationService';
import {
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

    const [progress, earned, definitions, ranks] = await Promise.all([
      PassportProgress.findOne({ tenantId, studentId }).select('xp streak longestStreak').lean() as any,
      StudentBadge.find({ tenantId, studentId }).sort({ awardedAt: -1 }).lean() as any,
      BadgeDefinition.find({ tenantId, active: true }).sort({ displayOrder: 1 }).lean() as any,
      rankSummary(tenantId, studentId),
    ]);

    const xp = progress?.xp || 0;
    const held = new Map((earned as any[]).map(b => [b.badgeKey, b.awardedAt]));

    res.json({
      xp,
      // Reuses the existing level curve rather than inventing a second progression.
      level: levelFromXp(xp),
      streak: progress?.streak || 0,
      longestStreak: progress?.longestStreak || 0,
      badges: (definitions as any[]).map(d => ({
        key: d.key, name: d.name, description: d.description, iconKey: d.iconKey,
        earned: held.has(d.key),
        awardedAt: held.get(d.key) || null,
      })),
      earnedCount: held.size,
      ranks,
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

    const [rules, badges, cfg] = await Promise.all([
      XpRule.find({ tenantId }).sort({ eventKey: 1 }).lean() as any,
      BadgeDefinition.find({ tenantId }).sort({ displayOrder: 1 }).lean() as any,
      GamificationConfig.findOne({ tenantId }).lean() as any,
    ]);

    res.json({
      rules,
      badges,
      settings: cfg?.leaderboard || null,
      // The catalogue, so the screen can explain what each event means without hardcoding it.
      events: XP_EVENTS.map(e => ({
        key: e.key, name: e.name, description: e.description, defaultXp: e.defaultXp,
      })),
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

export { isScopeSupported };
