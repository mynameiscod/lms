import PassportProgress from '../models/PassportProgress';
import CareerRoadmap from '../models/CareerRoadmap';
import {
  XpRule, XpLedger, BadgeDefinition, StudentBadge, IXpRule,
} from '../models/GamificationModels';
import { ymd } from './passportMissionService';
import {
  XP_EVENTS, xpEvent, XpRefusal, BADGE_TRIGGERS, BadgeConditionType,
  STREAK_MILESTONES, streakMilestoneFor, BADGE_SEEDS,
} from '../data/gamificationPolicy';

/**
 * The one place XP is awarded.
 *
 * EVERY CAREERPILOT AWARD COMES THROUGH HERE. Scattering `addXp(progress, 30)` across
 * controllers is how a product ends up unable to answer what an activity is worth, or to
 * change it without a deploy. A caller states what the student DID; this decides what that
 * is worth, whether it has already been counted, and whether it moves anything else.
 *
 * XP IS NOT A CAPABILITY SIGNAL. Nothing in this file writes StudentSkillProfile,
 * StudentSkillEvidence, a readiness figure or a roadmap. A student can earn every point the
 * system offers and be exactly as ready for their target role as before — which is the
 * distinction the whole product rests on.
 *
 * XP IS NOT MONEY. It never touches CoinAccount, CoinLedger or the reward budget. Coins
 * remain the redeemable currency with their own engine; there is deliberately no conversion.
 *
 * DETERMINISTIC. No AI, no randomness. The same event on the same day is worth the same to
 * every student with the same configuration.
 */

export interface GamificationEvent {
  tenantId: string;
  studentId: string;
  eventKey: string;
  /** What produced it — 'mission', 'assessment'. Part of the award's identity. */
  sourceType: string;
  /** The specific thing. A mission key, an assessment id. */
  sourceId: string;
  metadata?: Record<string, any>;
  /**
   * What this specific thing is worth, when the caller knows better than the tenant rule.
   *
   * The rule still decides WHETHER anything is paid — enabled, not already claimed, inside
   * the daily cap — and this only replaces the amount. That split matters: an override that
   * bypassed the rule would let a caller pay for a disabled event or blow through a cap that
   * exists to stop farming.
   *
   * Undefined means "use the rule's amount", so every existing caller is unchanged. Zero is
   * honoured as a real choice; a negative is ignored rather than deducted, because nothing
   * in this ledger is meant to take XP away.
   */
  xpOverride?: number | null;
  now?: Date;
}

export interface GamificationAward {
  awarded: number;
  refused?: XpRefusal;
  xpTotal: number;
  streak: number;
  longestStreak: number;
  /** Badges earned as a result of this event. Usually empty. */
  badges: string[];
  /** Set when a streak milestone paid a bonus, so a caller can celebrate it. */
  streakBonus?: number;
}

/**
 * The rule for one event.
 *
 * Falls back to the shipped default when nothing is configured, which is what keeps §122's
 * promise: a tenant that has never opened the admin screen keeps the exact behaviour it has
 * today rather than silently dropping to zero XP.
 */
export async function resolveRule(tenantId: string, eventKey: string): Promise<IXpRule | null> {
  const configured = await XpRule.findOne({ tenantId, eventKey }).lean() as any;
  if (configured) return configured;

  const fallback = xpEvent(eventKey);
  if (!fallback) return null;
  return {
    tenantId, eventKey,
    enabled: true,
    xp: fallback.defaultXp,
    dailyLimit: fallback.defaultDailyLimit,
    uniqueSource: fallback.uniqueSource,
    streakQualifying: fallback.streakQualifying,
  } as any;
}

/**
 * The award's identity.
 *
 * Describes the EVENT, not the request — the convention CoinLedger already proved. A
 * double-clicked button, a retried call and a redelivered job all produce this same string,
 * and the unique index refuses everything after the first.
 */
export const xpIdempotencyKey = (e: { eventKey: string; sourceType: string; sourceId: string }): string =>
  `${e.eventKey}:${e.sourceType}:${e.sourceId}`;

const startOfDay = (now: Date): Date => {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Award XP for something a student actually did.
 *
 * Order matters. The LEDGER is written first, because it is the record that can refuse a
 * duplicate; only once it has accepted the row is the balance moved. If the balance update
 * were to fail, the ledger still holds the truth and rebuildXpBalance can repair it — the
 * reverse order would allow a balance to move with nothing explaining why.
 */
export async function processGamificationEvent(event: GamificationEvent): Promise<GamificationAward> {
  const now = event.now || new Date();
  const { tenantId, studentId, eventKey } = event;

  const empty = async (refused: XpRefusal): Promise<GamificationAward> => {
    const p: any = await PassportProgress.findOne({ tenantId, studentId })
      .select('xp streak longestStreak').lean();
    return {
      awarded: 0, refused,
      xpTotal: p?.xp || 0, streak: p?.streak || 0, longestStreak: p?.longestStreak || 0,
      badges: [],
    };
  };

  const rule = await resolveRule(tenantId, eventKey);
  if (!rule) return empty('unknown_event');
  if (!rule.enabled) return empty('disabled');
  if (!rule.xp || rule.xp <= 0) return empty('zero');

  /**
   * The amount actually paid.
   *
   * Read AFTER the rule checks above, never instead of them: the rule owns whether this
   * event pays at all, and the override owns only how much. A finite, non-negative number
   * wins; anything else falls back to the rule so a bad value cannot silently zero a
   * student's award.
   */
  const amount = (typeof event.xpOverride === 'number'
    && Number.isFinite(event.xpOverride)
    && event.xpOverride >= 0)
    ? Math.round(event.xpOverride)
    : rule.xp;
  if (amount <= 0) return empty('zero');

  // A cap is an advisory read: under a genuine race two awards could straddle it by one
  // event. That is an acceptable rounding error on an engagement score, and the guarantee
  // that actually matters — never twice for the same thing — is enforced by the index below.
  if (rule.dailyLimit > 0) {
    const [today] = await XpLedger.aggregate([
      { $match: { tenantId, studentId: toId(studentId), eventKey, at: { $gte: startOfDay(now) } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    // Capped on what would actually be paid, not on the rule's nominal amount — an
    // override above the rate must not slip past a limit set to bound the day.
    if ((today?.total || 0) + amount > rule.dailyLimit) return empty('daily_cap');
  }

  const idempotencyKey = xpIdempotencyKey(event);

  try {
    await XpLedger.create({
      tenantId, studentId, eventKey,
      sourceType: event.sourceType, sourceId: event.sourceId,
      idempotencyKey, amount, metadata: event.metadata, at: now,
    });
  } catch (e: any) {
    // Already counted. Not an error — a student clicking twice is normal.
    if (e?.code === 11000) return empty('duplicate');
    throw e;
  }

  // The balance moves only after the ledger accepted the row. `$inc` is atomic, so racing
  // awards for DIFFERENT events both land rather than overwriting each other.
  const today = ymd(now);
  await PassportProgress.updateOne(
    { tenantId, studentId },
    {
      $inc: { xp: amount },
      // The existing capped log keeps feeding the activity chart, unchanged. The ledger is
      // the durable record; this stays exactly what it always was.
      $push: { xpLog: { $each: [{ at: now, amount, source: eventKey }], $slice: -400 } },
      $setOnInsert: { startDate: now },
    },
    { upsert: true },
  );

  const streakResult = rule.streakQualifying
    ? await touchStreak(tenantId, studentId, today, now)
    : { streak: 0, longestStreak: 0, advanced: false };

  const after: any = await PassportProgress.findOne({ tenantId, studentId })
    .select('xp streak longestStreak').lean();

  const badges: string[] = [];
  let streakBonus: number | undefined;

  // A milestone bonus is itself an XP award and goes through this same function, so it is
  // ledgered, idempotent and visible in the breakdown like everything else.
  if (streakResult.advanced) {
    const milestone = streakMilestoneFor(streakResult.streak);
    if (milestone && milestone.bonusXp > 0) {
      const bonus = await awardStreakBonus(tenantId, studentId, milestone.days, milestone.bonusXp, now);
      if (bonus > 0) streakBonus = bonus;
    }
    badges.push(...await evaluateBadges(tenantId, studentId, ['STREAK'], now));
  }

  badges.push(...await evaluateBadges(tenantId, studentId, BADGE_TRIGGERS.XP, now));

  const final: any = await PassportProgress.findOne({ tenantId, studentId })
    .select('xp streak longestStreak').lean();

  return {
    awarded: amount,
    xpTotal: final?.xp ?? after?.xp ?? 0,
    streak: final?.streak || 0,
    longestStreak: final?.longestStreak || 0,
    badges: [...new Set(badges)],
    streakBonus,
  };
}

const toId = (id: string): any => {
  const mongoose = require('mongoose');
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
};

/**
 * Move the streak on, at most once a day.
 *
 * The filter carries `lastCompletedDate: { $ne: today }`, so of any number of qualifying
 * events arriving together exactly one advances the streak — the same discipline the
 * mission completion uses, for the same reason.
 *
 * The rule itself is unchanged from what the product already does: a consecutive day
 * continues the run, any gap starts a new one.
 */
async function touchStreak(
  tenantId: string, studentId: string, today: string, now: Date,
): Promise<{ streak: number; longestStreak: number; advanced: boolean }> {
  const doc: any = await PassportProgress.findOne({ tenantId, studentId })
    .select('streak longestStreak lastCompletedDate').lean();
  if (!doc) return { streak: 0, longestStreak: 0, advanced: false };

  if (doc.lastCompletedDate === today) {
    return { streak: doc.streak || 0, longestStreak: doc.longestStreak || 0, advanced: false };
  }

  const yesterday = ymd(new Date(now.getTime() - 86400000));
  const streak = doc.lastCompletedDate === yesterday ? (doc.streak || 0) + 1 : 1;
  const longestStreak = Math.max(doc.longestStreak || 0, streak);

  const res: any = await PassportProgress.updateOne(
    { tenantId, studentId, lastCompletedDate: { $ne: today } },
    { $set: { streak, longestStreak, lastCompletedDate: today } },
  );

  const advanced = (res?.modifiedCount ?? res?.nModified ?? 0) === 1;
  return { streak, longestStreak, advanced };
}

/**
 * A milestone bonus, ledgered like any other award and payable once per student.
 *
 * The key names the milestone and nothing else, which is right: reaching seven days is the
 * same event whoever reaches it. What makes it payable to each student exactly once is the
 * ledger's unique index being scoped to the student — see XP_LEDGER_UNIQUE_INDEX. While
 * that index was tenant-wide this function paid the first student in a tenant and refused
 * every other one, permanently.
 */
async function awardStreakBonus(
  tenantId: string, studentId: string, days: number, bonusXp: number, now: Date,
): Promise<number> {
  const idempotencyKey = `STREAK_MILESTONE:streak:${days}`;
  try {
    await XpLedger.create({
      tenantId, studentId, eventKey: 'STREAK_MILESTONE',
      sourceType: 'streak', sourceId: String(days),
      idempotencyKey, amount: bonusXp, at: now,
    });
  } catch (e: any) {
    if (e?.code === 11000) return 0;       // this milestone has already paid out
    throw e;
  }

  await PassportProgress.updateOne(
    { tenantId, studentId },
    {
      $inc: { xp: bonusXp },
      $push: { xpLog: { $each: [{ at: now, amount: bonusXp, source: 'STREAK_MILESTONE' }], $slice: -400 } },
    },
  );
  return bonusXp;
}

// ── badges ──────────────────────────────────────────────────────────────────

/**
 * Check only the badges a given event could possibly have unlocked.
 *
 * Evaluating every definition on every request would put a fan-out of counts behind an
 * action a student takes dozens of times a day. XP events can only move XP and event-count
 * badges; a streak change can only move streak badges.
 */
export async function evaluateBadges(
  tenantId: string,
  studentId: string,
  conditionTypes: BadgeConditionType[],
  now: Date = new Date(),
): Promise<string[]> {
  if (!conditionTypes.length) return [];

  const definitions = await BadgeDefinition
    .find({ tenantId, active: true, conditionType: { $in: conditionTypes } })
    .lean() as any[];
  if (!definitions.length) return [];

  const already = await StudentBadge.find({ tenantId, studentId }).select('badgeKey').lean() as any[];
  const held = new Set(already.map(b => b.badgeKey));
  const pending = definitions.filter(d => !held.has(d.key));
  if (!pending.length) return [];

  const metrics = await badgeMetrics(tenantId, studentId, pending);
  const earned: string[] = [];

  for (const def of pending) {
    const value = metrics[metricKeyOf(def)];
    if (value === undefined || value < def.conditionConfig.threshold) continue;

    try {
      await StudentBadge.create({
        tenantId, studentId, badgeKey: def.key, awardedAt: now,
        source: def.conditionType,
      });
      earned.push(def.key);
    } catch (e: any) {
      // Two evaluations decided at once. The index made the second a no-op, which is the
      // outcome we wanted — one badge, not two.
      if (e?.code !== 11000) throw e;
    }
  }

  return earned;
}

const metricKeyOf = (def: any): string =>
  def.conditionType === 'EVENT_COUNT'
    ? `EVENT_COUNT:${def.conditionConfig.eventKey}`
    : def.conditionType;

/** Every number the pending badges need, gathered in as few queries as they require. */
async function badgeMetrics(
  tenantId: string, studentId: string, pending: any[],
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const types = new Set(pending.map(d => d.conditionType));

  if (types.has('XP_TOTAL') || types.has('STREAK')) {
    const p: any = await PassportProgress.findOne({ tenantId, studentId })
      .select('xp streak').lean();
    out.XP_TOTAL = p?.xp || 0;
    out.STREAK = p?.streak || 0;
  }

  if (types.has('EVENT_COUNT')) {
    const eventKeys = [...new Set(pending
      .filter(d => d.conditionType === 'EVENT_COUNT')
      .map(d => d.conditionConfig.eventKey).filter(Boolean))];
    if (eventKeys.length) {
      const counts = await XpLedger.aggregate([
        { $match: { tenantId, studentId: toId(studentId), eventKey: { $in: eventKeys } } },
        { $group: { _id: '$eventKey', n: { $sum: 1 } } },
      ]);
      for (const key of eventKeys) {
        out[`EVENT_COUNT:${key}`] = counts.find((c: any) => c._id === key)?.n || 0;
      }
    }
  }

  if (types.has('ROADMAP_PERCENT')) {
    out.ROADMAP_PERCENT = await roadmapPercent(tenantId, studentId);
  }

  return out;
}

/**
 * How much of the active roadmap's planned time has been completed.
 *
 * Read from the completion records Module 10 already writes — this is plan progress, and
 * emphatically not a skill or readiness figure.
 */
async function roadmapPercent(tenantId: string, studentId: string): Promise<number> {
  const roadmap: any = await CareerRoadmap.findOne({ tenantId, studentId, status: 'ACTIVE' })
    .select('capacity').lean();
  const planned = roadmap?.capacity?.plannedMinutes || 0;
  if (!planned) return 0;

  const progress: any = await PassportProgress.findOne({ tenantId, studentId })
    .select('completed').lean();
  const done = (progress?.completed || [])
    .filter((c: any) => c.careerpilot)
    .reduce((n: number, c: any) => n + (c.careerpilot.minutes || 0), 0);

  return Math.min(100, Math.round((done / planned) * 100));
}

/** Re-check roadmap badges. Called after roadmap progress changes, not on every request. */
export const evaluateRoadmapBadges = (tenantId: string, studentId: string, now?: Date) =>
  evaluateBadges(tenantId, studentId, BADGE_TRIGGERS.ROADMAP, now);

// ── seeding and repair ──────────────────────────────────────────────────────

/**
 * Install the shipped defaults, without ever undoing an admin's decision.
 *
 * Insert-missing only: an edited amount stays edited, and a rule somebody deliberately
 * disabled stays disabled. Safe to run repeatedly, which is what lets it be called on first
 * use rather than needing a migration.
 */
export async function ensureGamificationDefaults(tenantId: string): Promise<{ rules: number; badges: number }> {
  const existingRules = await XpRule.find({ tenantId }).select('eventKey').lean() as any[];
  const haveRule = new Set(existingRules.map(r => r.eventKey));
  const newRules = XP_EVENTS.filter(e => !haveRule.has(e.key)).map(e => ({
    tenantId, eventKey: e.key, enabled: true, xp: e.defaultXp,
    dailyLimit: e.defaultDailyLimit, uniqueSource: e.uniqueSource,
    streakQualifying: e.streakQualifying,
  }));
  if (newRules.length) await XpRule.insertMany(newRules, { ordered: false }).catch(() => { /* raced */ });

  const existingBadges = await BadgeDefinition.find({ tenantId }).select('key').lean() as any[];
  const haveBadge = new Set(existingBadges.map(b => b.key));
  const newBadges = BADGE_SEEDS.filter(b => !haveBadge.has(b.key)).map(b => ({
    tenantId, key: b.key, name: b.name, description: b.description,
    iconKey: b.iconKey, active: true,
    conditionType: b.conditionType, conditionConfig: b.conditionConfig,
    displayOrder: b.displayOrder,
  }));
  if (newBadges.length) await BadgeDefinition.insertMany(newBadges, { ordered: false }).catch(() => { /* raced */ });

  return { rules: newRules.length, badges: newBadges.length };
}

/**
 * Recompute a balance from the ledger.
 *
 * Internal repair only, never exposed to students. It exists because the ledger and the
 * balance are two writes: if the second ever fails, this is the path back to agreement
 * rather than a support ticket nobody can answer.
 */
export async function rebuildXpBalance(tenantId: string, studentId: string): Promise<number> {
  const [sum] = await XpLedger.aggregate([
    { $match: { tenantId, studentId: toId(studentId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const total = Math.max(0, sum?.total || 0);
  await PassportProgress.updateOne({ tenantId, studentId }, { $set: { xp: total } });
  return total;
}

export { STREAK_MILESTONES };
