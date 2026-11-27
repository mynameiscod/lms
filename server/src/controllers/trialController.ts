import { Request, Response } from 'express';
import mongoose from 'mongoose';
import TrialPlan from '../models/TrialPlan';
import User from '../models/User';
import PassportProgress from '../models/PassportProgress';
import { TRIAL_ITEMS, TRIAL_MAX_DAYS, TRIAL_MAX_PICKED, cleanTrialItems, trialActive } from '../data/trialPolicy';
import { membershipActive } from '../services/passportEntitlementService';
import { trialStatus } from '../services/trialService';
import { searchLibraryForAdmin, libraryProblemsByIds } from '../services/problemLibraryService';

/**
 * CareerPilot → Trial plans, and giving one to a chosen student.
 *
 * A plan says how long a trial runs and what it opens (data/trialPolicy.ts). Giving it COPIES the
 * plan onto the member, so a plan edited or deleted later never changes a trial already running.
 */

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const actorOf = (req: Request) => {
  const a: any = (req as any).user || {};
  return { id: a.id || a._id, name: [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email || 'admin' };
};

const planRow = (p: any, running = 0, problems: any[] = []) => ({
  id: String(p._id), name: p.name, description: p.description || '', days: p.days,
  items: p.items || {}, active: !!p.active, running, updatedAt: p.updatedAt,
  /** The problems the plan names, as admins see them; empty = the first N of the library. */
  practiceProblems: problems,
});

/** Each plan's named problems, looked up in one go. */
async function problemsOf(tenantId: string, plans: any[]): Promise<Map<string, any[]>> {
  const all = plans.flatMap(p => (p.practiceProblemIds || []).map(String));
  const rows = all.length ? await libraryProblemsByIds(tenantId, all) : [];
  const byId = new Map(rows.map(r => [r.id, r]));
  return new Map(plans.map(p => [String(p._id), (p.practiceProblemIds || []).map(String).filter((i: string) => byId.has(i)).map((i: string) => byId.get(i))]));
}

/** GET /passport/trial-plans/problems?q= — library problems an admin can put in a plan. */
export const searchProblems = async (req: Request, res: Response) => {
  try {
    res.json({ problems: await searchLibraryForAdmin(tenantOf(req), String(req.query.q || '')) });
  } catch (e: any) {
    console.error('[trial] problems:', e?.message || e);
    res.status(500).json({ message: 'Could not search the problems.' });
  }
};

/** Who is on a trial of each plan right now. */
async function runningByPlan(tenantId: string): Promise<Map<string, number>> {
  const now = new Date();
  const rows: any[] = await User.aggregate([
    { $match: { tenantId: mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId,
      'passport.trial.startedAt': { $lte: now }, 'passport.trial.endsAt': { $gt: now }, 'passport.trial.endedAt': null } },
    { $group: { _id: '$passport.trial.planId', n: { $sum: 1 } } },
  ]).catch(() => []);
  return new Map(rows.map(r => [String(r._id), r.n]));
}

/** GET /passport/trial-plans — the plans, and what a plan can open. */
export const listPlans = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [plans, running] = await Promise.all([
      TrialPlan.find({ tenantId }).sort({ createdAt: 1 }).lean(),
      runningByPlan(tenantId),
    ]);
    const problems = await problemsOf(tenantId, plans as any[]);
    res.json({
      plans: (plans as any[]).map(p => planRow(p, running.get(String(p._id)) || 0, problems.get(String(p._id)))),
      maxPicked: TRIAL_MAX_PICKED,
      catalogue: TRIAL_ITEMS.map(i => ({ key: i.key, label: i.label, icon: i.icon, unit: i.limit?.unit || null, hint: i.limit?.hint || null })),
      maxDays: TRIAL_MAX_DAYS,
    });
  } catch (e: any) {
    console.error('[trial] list:', e?.message || e);
    res.status(500).json({ message: 'Could not load the trial plans.' });
  }
};

/**
 * A plan from the admin's form. When it names practice problems, each must be one members can
 * open now, and the practice limit becomes how many were named.
 */
async function cleanPlan(tenantId: string, b: any): Promise<{ plan: any } | { error: string }> {
  const name = String(b?.name || '').trim().slice(0, 60);
  if (!name) return { error: 'Give the plan a name.' };
  const days = Number(b?.days);
  if (!Number.isInteger(days) || days < 1 || days > TRIAL_MAX_DAYS) return { error: `A trial runs for 1 to ${TRIAL_MAX_DAYS} days.` };
  const items = cleanTrialItems(b?.items);
  if ('error' in items) return { error: items.error };
  if (!Object.values(items.items).some(s => s?.on)) return { error: 'Switch on at least one thing the trial opens.' };

  const asked: string[] = Array.isArray(b?.practiceProblemIds) ? [...new Set<string>(b.practiceProblemIds.map(String))] : [];
  let practiceProblemIds: mongoose.Types.ObjectId[] = [];
  if (items.items.practice?.on && asked.length) {
    if (asked.length > TRIAL_MAX_PICKED) return { error: `A plan can name up to ${TRIAL_MAX_PICKED} problems.` };
    const found = await libraryProblemsByIds(tenantId, asked);
    if (found.length !== asked.length) {
      return { error: 'Some chosen problems are no longer in the CareerPilot practice library. Remove them and save again.' };
    }
    practiceProblemIds = found.map(p => new mongoose.Types.ObjectId(p.id));
    items.items.practice = { on: true, limit: found.length };
  }
  return { plan: { name, description: String(b?.description || '').trim().slice(0, 300), days, items: items.items, practiceProblemIds, active: b?.active !== false } };
}

/** POST /passport/trial-plans */
export const createPlan = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const c = await cleanPlan(tenantId, req.body);
    if ('error' in c) return res.status(400).json({ message: c.error });
    const p = await TrialPlan.create({ tenantId, ...c.plan, updatedBy: String(actorOf(req).id || '') });
    res.status(201).json({ plan: planRow(p.toObject(), 0, (await problemsOf(tenantId, [p.toObject()])).get(String(p._id))) });
  } catch (e: any) {
    console.error('[trial] create:', e?.message || e);
    res.status(500).json({ message: 'Could not save the plan.' });
  }
};

/** PUT /passport/trial-plans/:id — changes new trials only; running ones keep their copy. */
export const updatePlan = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const c = await cleanPlan(tenantId, req.body);
    if ('error' in c) return res.status(400).json({ message: c.error });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Plan not found.' });
    const p = await TrialPlan.findOneAndUpdate({ _id: req.params.id, tenantId },
      { $set: { ...c.plan, updatedBy: String(actorOf(req).id || '') } }, { new: true }).lean();
    if (!p) return res.status(404).json({ message: 'Plan not found.' });
    res.json({ plan: planRow(p, 0, (await problemsOf(tenantId, [p])).get(String((p as any)._id))) });
  } catch (e: any) {
    console.error('[trial] update:', e?.message || e);
    res.status(500).json({ message: 'Could not save the plan.' });
  }
};

/** DELETE /passport/trial-plans/:id — running trials carry their own copy and are not affected. */
export const deletePlan = async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Plan not found.' });
    const r = await TrialPlan.deleteOne({ _id: req.params.id, tenantId: tenantOf(req) });
    if (!r.deletedCount) return res.status(404).json({ message: 'Plan not found.' });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not delete the plan.' });
  }
};

/**
 * POST /passport/members/:userId/trial — body { planId, reason }. Starts now, for the plan's days.
 *
 * Refused for a member who already has full access (paid or complimentary): a trial would only
 * take things away. A running trial must be ended before another is given.
 */
export const startTrial = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(404).json({ message: 'Member not found.' });
    const reason = String(req.body?.reason || '').trim().slice(0, 200);
    if (!reason) return res.status(400).json({ message: 'Give a reason, e.g. "college demo". It is what makes the trial traceable later.' });
    const planId = String(req.body?.planId || '');
    const plan: any = mongoose.isValidObjectId(planId) ? await TrialPlan.findOne({ _id: planId, tenantId }).lean() : null;
    if (!plan) return res.status(400).json({ message: 'Choose a trial plan.' });
    if (!plan.active) return res.status(400).json({ message: 'That plan is switched off. Switch it on in Trial plans first.' });

    const u: any = await User.findOne({ _id: userId, tenantId }).select('passport firstName').lean();
    if (!u) return res.status(404).json({ message: 'Member not found.' });
    if (membershipActive(u.passport)) {
      return res.status(409).json({ message: `${u.firstName || 'This member'} already has full access, so a trial would only take things away.` });
    }
    if (trialActive(u.passport)) {
      return res.status(409).json({ message: `${u.firstName || 'This member'} is already on a trial. End it first to give a different one.` });
    }

    const now = new Date();
    const actor = actorOf(req);
    await User.updateOne({ _id: userId, tenantId }, { $set: { 'passport.trial': {
      planId: plan._id, planName: plan.name, startedAt: now, endsAt: new Date(now.getTime() + plan.days * 86400000),
      items: plan.items, by: actor.id, byName: actor.name, reason,
      // Named problems are fixed now; otherwise the first N are chosen when Practice is first opened.
      practiceIds: plan.items?.practice?.on ? (plan.practiceProblemIds || []) : [],
      practicePicked: !!(plan.items?.practice?.on && plan.practiceProblemIds?.length),
    } } });

    // The same start-up a granted membership gets: a progress row, and the journey if classes are on.
    await PassportProgress.updateOne(
      { tenantId, studentId: userId },
      { $setOnInsert: { tenantId, studentId: new mongoose.Types.ObjectId(userId), startDate: u.passport?.activatedAt || now } },
      { upsert: true },
    );
    if (plan.items?.journey?.on) {
      const { generateJourneyOnMembership } = await import('../services/foundationMembershipService');
      await generateJourneyOnMembership(tenantId, userId);
    }

    res.json({ ok: true, trial: await trialStatus(tenantId, userId) });
  } catch (e: any) {
    console.error('[trial] start:', e?.message || e);
    res.status(500).json({ message: 'Could not start the trial.' });
  }
};

/** DELETE /passport/members/:userId/trial — end it now. Everything the member did stays. */
export const endTrial = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(404).json({ message: 'Member not found.' });
    const r = await User.updateOne(
      { _id: req.params.userId, tenantId, 'passport.trial.startedAt': { $exists: true } },
      { $set: { 'passport.trial.endedAt': new Date() } },
    );
    if (!r.matchedCount) return res.status(404).json({ message: 'This member has no trial.' });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not end the trial.' });
  }
};

/** GET /passport/members/:userId/trial — the running trial and its usage, for the admin. */
export const memberTrial = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(404).json({ message: 'Member not found.' });
    const u: any = await User.findOne({ _id: req.params.userId, tenantId }).select('passport.trial passport.active passport.expiresAt').lean();
    if (!u) return res.status(404).json({ message: 'Member not found.' });
    const t = u.passport?.trial;
    res.json({
      trial: await trialStatus(tenantId, req.params.userId, u.passport),
      last: t?.startedAt ? {
        planName: t.planName, startedAt: t.startedAt, endsAt: t.endsAt, endedAt: t.endedAt || null,
        convertedAt: t.convertedAt || null, byName: t.byName || '', reason: t.reason || '',
      } : null,
    });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not load the trial.' });
  }
};
