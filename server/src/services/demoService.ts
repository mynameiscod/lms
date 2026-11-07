import mongoose from 'mongoose';
import DemoPlan from '../models/DemoPlan';
import User from '../models/User';
import { DEMO_YEARS, DEMO_YEAR_KEYS, DemoYearConfig, demoYearOf, isDemoPassport } from '../data/demoPolicy';

/**
 * Demo accounts at run time: which plan and year an account is on, and moving it between years.
 *
 * Every demo branch elsewhere in the server asks one of two questions — "is this account a demo?"
 * (isDemoPassport on the passport it already loaded) and "what does this year show?" (demoContext).
 */

/** Plans change rarely and are read on many requests; a short cache keeps a demo page cheap. */
const planCache = new Map<string, { at: number; plan: any }>();
const PLAN_TTL_MS = 15_000;
export const __clearDemoCache = () => planCache.clear();

/** Is there a live database? Unit tests mock models and never connect. */
const connected = () => mongoose.connection?.readyState === 1;

export async function demoPlan(planId: string): Promise<any | null> {
  const hit = planCache.get(planId);
  if (hit && Date.now() - hit.at < PLAN_TTL_MS) return hit.plan;
  const plan = mongoose.isValidObjectId(planId) ? await DemoPlan.findById(planId).lean().catch(() => null) : null;
  planCache.set(planId, { at: Date.now(), plan });
  return plan;
}

export interface DemoContext {
  planId: string;
  planName: string;
  year: string;
  /** The year's settings, or null when the plan has since switched this year off. */
  config: DemoYearConfig | null;
  /** The years the plan has on, in order — what the Year switch offers. */
  years: { key: string; year: number; label: string }[];
}

/** The demo an account is on, or null for everyone else. Reads the user unless given the passport. */
export async function demoContext(userId: string, passport?: any): Promise<DemoContext | null> {
  let p = passport;
  if (p === undefined) {
    // No database (unit tests with mocked models): nobody is a demo.
    if (!connected() || !mongoose.isValidObjectId(userId)) return null;
    try {
      const u: any = await User.findById(userId).select('passport.demo').lean();
      p = u?.passport;
    } catch { return null; }
  }
  if (!isDemoPassport(p)) return null;
  const plan = await demoPlan(String(p.demo.planId));
  if (!plan) return null;
  const year = DEMO_YEAR_KEYS.includes(p.demo.year) ? p.demo.year : plan.startYear;
  return {
    planId: String(plan._id), planName: plan.name, year,
    config: demoYearOf(plan, year),
    years: DEMO_YEARS.filter((y) => plan.years?.[y.key]?.enabled).map((y) => ({ key: y.key, year: y.year, label: y.label })),
  };
}

/** True when this user is on a demo. For the places that only hold a user id. */
export async function isDemoUser(userId: string): Promise<boolean> {
  // Fails closed to "not a demo": a demo check must never break, or slow, an ordinary student's request.
  if (!connected() || !mongoose.isValidObjectId(userId)) return false;
  try {
    const u: any = await User.findById(userId).select('passport.demo.planId').lean();
    return isDemoPassport(u?.passport);
  } catch { return false; }
}

/**
 * Show this year: the account becomes a student of that year, on the plan's track, and its roadmap
 * for the year is built if it does not exist yet. A roadmap already built for the year is kept, so
 * moving back and forth between years is instant and keeps what was done in each.
 */
export async function applyDemoYear(tenantId: string, userId: string, year: string): Promise<{ ok: boolean; message?: string; journey?: string }> {
  const u: any = await User.findOne({ _id: userId, tenantId }).select('passport').lean();
  if (!u || !isDemoPassport(u.passport)) return { ok: false, message: 'This account is not a demo account.' };
  const plan = await demoPlan(String(u.passport.demo.planId));
  const cfg = demoYearOf(plan, year);
  if (!plan || !cfg) return { ok: false, message: 'This year is not part of the demo plan.' };

  const set: any = { 'passport.stage': year, 'passport.demo.year': year };
  if (cfg.track) set['passport.careerTrack'] = { key: cfg.track, chosenAt: new Date(), chosenBy: 'demo' };
  await User.updateOne({ _id: userId, tenantId }, { $set: set, ...(cfg.track ? {} : { $unset: { 'passport.careerTrack': 1 } }) });

  // A year shown before keeps its roadmap exactly as it was: no recomposition on the way back.
  const LearningCurriculum = (await import('../models/LearningCurriculum')).default;
  const { FOUNDATION_JOURNEY_KIND } = await import('./foundationJourneyService');
  const built = await LearningCurriculum.exists({
    tenantId, personalizedFor: new mongoose.Types.ObjectId(userId), adaptiveStage: year, journeyKind: FOUNDATION_JOURNEY_KIND,
  });
  if (built) return { ok: true, journey: 'KEPT' };

  const { applyFoundationTrigger } = await import('./foundationJourneyTriggerService');
  const out = await applyFoundationTrigger({ tenantId, studentId: userId, trigger: 'SIGNIFICANT_MASTERY_CHANGE', stageKey: year });
  if (out.action === 'NOT_READY' || out.action === 'REFUSED') {
    return { ok: false, journey: out.action, message: out.reason === 'NO_SKILL_EVIDENCE'
      ? 'This account has no skill check yet, so no roadmap can be built. Take the skill check first.'
      : `The ${DEMO_YEARS.find((y) => y.key === year)?.label} roadmap could not be built (${out.reason}).` };
  }
  return { ok: true, journey: out.action };
}

/**
 * "Every day is done", for the day ladder only.
 *
 * A demo account opens any roadmap day in any order. The ladder asks one question of the days
 * behind — is it finished? — so answering yes for every day opens them all without touching the
 * ladder itself, and the real completed days (what the screen shows as done) are left alone.
 */
export const ALL_DAYS_OPEN: Set<number> = new Proxy(new Set<number>(), {
  get(target, prop) {
    if (prop === 'has') return () => true;
    const v = (target as any)[prop];
    return typeof v === 'function' ? v.bind(target) : v;
  },
});

/** The set the day ladder should read for this learner: every day for a demo, the real ones otherwise. */
export async function ladderDays(userId: string, completed: Set<number>): Promise<Set<number>> {
  return (await isDemoUser(userId)) ? ALL_DAYS_OPEN : completed;
}
