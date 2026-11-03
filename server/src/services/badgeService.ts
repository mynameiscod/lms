import mongoose from 'mongoose';
import PassportProgress from '../models/PassportProgress';
import PassportInterview from '../models/PassportInterview';
import PassportResume from '../models/PassportResume';
import CareerRoadmap from '../models/CareerRoadmap';
import { BadgeDefinition, StudentBadge, XpLedger } from '../models/GamificationModels';
import { BADGE_CONDITIONS, BadgeConditionType, XP_EVENTS } from '../data/gamificationPolicy';
import { memberLibraryStats } from './problemLibraryService';
import { journeyCompletion } from './foundationJourneyXpService';

/**
 * Badges, as the admin defined them (XP & Rewards → Badges).
 *
 * A badge is a rule — "finish 5 mock interviews" — over a number this product already measures.
 * This file gathers those numbers and decides who has earned what. The engine calls it after
 * events; the dashboard calls it with the figures it has already counted, which also awards a
 * badge an admin created after the member had already qualified for it.
 *
 * Imported LAZILY by gamificationEngine: foundationJourneyXpService imports the engine, so a
 * static import back would be a cycle.
 */

/** Where a definition's number is kept: one key per type, and per event for EVENT_COUNT. */
export const metricKeyOf = (def: { conditionType: string; conditionConfig?: { eventKey?: string } }): string =>
  def.conditionType === 'EVENT_COUNT'
    ? `EVENT_COUNT:${def.conditionConfig?.eventKey}`
    : def.conditionType;

export type KnownMetrics = Partial<Record<BadgeConditionType, number>>;

const toId = (id: string): any => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);

/**
 * Every number the given badges need, in as few queries as they require.
 * A figure passed in `known` (the dashboard has already counted it) is used as it is.
 */
export async function badgeMetricsFor(
  tenantId: string, studentId: string, defs: any[], known: KnownMetrics = {},
): Promise<Record<string, number>> {
  const out: Record<string, number> = { ...known };
  const need = (t: BadgeConditionType) => out[t] === undefined && defs.some(d => d.conditionType === t);

  if (need('XP_TOTAL') || need('STREAK')) {
    const p: any = await PassportProgress.findOne({ tenantId, studentId }).select('xp streak longestStreak').lean();
    if (out.XP_TOTAL === undefined) out.XP_TOTAL = p?.xp || 0;
    // A streak REACHED: the longest the member has held, so a badge is not missed by a lapse.
    if (out.STREAK === undefined) out.STREAK = Math.max(p?.streak || 0, p?.longestStreak || 0);
  }

  if (need('PROBLEMS_SOLVED')) {
    const [lib, p]: any[] = await Promise.all([
      memberLibraryStats(tenantId, studentId).catch(() => ({ solved: 0 })),
      PassportProgress.findOne({ tenantId, studentId }).select('solvedProblems').lean(),
    ]);
    // The same count the dashboard shows: the Problem Bank plus the old built-in exercises.
    out.PROBLEMS_SOLVED = (lib?.solved || 0) + (p?.solvedProblems || []).length;
  }

  if (need('MOCK_INTERVIEWS')) {
    out.MOCK_INTERVIEWS = await PassportInterview.countDocuments({ tenantId, studentId, status: 'completed' });
  }

  if (need('DAYS_COMPLETED')) {
    out.DAYS_COMPLETED = (await journeyCompletion(tenantId, studentId))?.completedDays || 0;
  }

  if (need('RESUME_SCORE')) {
    const r: any = await PassportResume.findOne({ tenantId, studentId }).select('score').lean();
    out.RESUME_SCORE = r?.score?.total || 0;
  }

  if (need('ROADMAP_PERCENT')) {
    out.ROADMAP_PERCENT = await roadmapPercent(tenantId, studentId);
  }

  const eventKeys = [...new Set(defs
    .filter(d => d.conditionType === 'EVENT_COUNT')
    .map(d => d.conditionConfig?.eventKey).filter(Boolean))] as string[];
  if (eventKeys.length) {
    const counts = await XpLedger.aggregate([
      { $match: { tenantId, studentId: toId(studentId), eventKey: { $in: eventKeys } } },
      { $group: { _id: '$eventKey', n: { $sum: 1 } } },
    ]);
    for (const key of eventKeys) out[`EVENT_COUNT:${key}`] = counts.find((c: any) => c._id === key)?.n || 0;
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

/** Record one award. A second evaluation racing this one hits the unique index, which is fine. */
export async function awardBadge(tenantId: string, studentId: string, def: any, now = new Date()): Promise<boolean> {
  try {
    await StudentBadge.create({ tenantId, studentId, badgeKey: def.key, awardedAt: now, source: def.conditionType });
    return true;
  } catch (e: any) {
    if (e?.code === 11000) return false;
    throw e;
  }
}

/** The rule in words, for a badge whose admin left the description empty. */
export function ruleSentence(type: string, threshold: number, eventKey?: string): string {
  const n = threshold.toLocaleString('en-IN');
  const plural = (one: string, many: string) => (threshold === 1 ? one : many);
  switch (type) {
    case 'PROBLEMS_SOLVED': return `Solve ${n} practice ${plural('problem', 'problems')}`;
    case 'MOCK_INTERVIEWS': return `Finish ${n} mock ${plural('interview', 'interviews')}`;
    case 'DAYS_COMPLETED':  return `Complete ${n} journey ${plural('day', 'days')}`;
    case 'STREAK':          return `Hit a ${n}-day streak`;
    case 'XP_TOTAL':        return `Earn ${n} XP`;
    case 'RESUME_SCORE':    return `Score ${n}+ on your resume`;
    case 'ROADMAP_PERCENT': return `Complete ${n}% of your roadmap`;
    case 'EVENT_COUNT': {
      const ev = XP_EVENTS.find(e => e.key === eventKey);
      return `${ev ? ev.name : 'Do it'} ${n} ${plural('time', 'times')}`;
    }
    default: return BADGE_CONDITIONS.find(c => c.type === type)?.label || '';
  }
}

export interface MemberBadge {
  key: string; label: string; icon: string; color: string; hint: string;
  earned: boolean; progress: number; earnedAt: string | null;
}

/**
 * The member's badge board: every active badge, earned or with progress toward it.
 *
 * A member who now meets a rule is awarded on the spot, so a badge an admin adds today is held
 * by everybody who already qualified, not only by whoever does the next thing. A badge once
 * earned stays earned, even if the admin later raises its bar.
 */
export async function memberBadges(tenantId: string, studentId: string, known: KnownMetrics = {}): Promise<MemberBadge[]> {
  const [defs, held] = await Promise.all([
    BadgeDefinition.find({ tenantId, active: true }).sort({ displayOrder: 1, createdAt: 1 }).lean() as any,
    StudentBadge.find({ tenantId, studentId }).select('badgeKey awardedAt').lean() as any,
  ]);
  const heldAt = new Map<string, Date>((held as any[]).map(b => [b.badgeKey, b.awardedAt]));
  const metrics = await badgeMetricsFor(tenantId, studentId, (defs as any[]).filter(d => !heldAt.has(d.key)), known);

  const now = new Date();
  const out: MemberBadge[] = [];
  for (const d of defs as any[]) {
    const need = Math.max(1, d.conditionConfig?.threshold || 1);
    const have = metrics[metricKeyOf(d)] ?? 0;
    let earnedAt = heldAt.get(d.key) || null;
    if (!earnedAt && have >= need) {
      await awardBadge(tenantId, studentId, d, now).catch(() => false);
      earnedAt = now;
    }
    out.push({
      key: d.key,
      label: d.name,
      icon: d.iconKey || 'bi-award-fill',
      color: d.color || '#f59e0b',
      hint: d.description || ruleSentence(d.conditionType, need, d.conditionConfig?.eventKey),
      earned: !!earnedAt,
      progress: earnedAt ? 1 : Math.min(1, have / need),
      earnedAt: earnedAt ? new Date(earnedAt).toISOString() : null,
    });
  }
  return out;
}
