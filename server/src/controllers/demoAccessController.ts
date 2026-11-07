import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import DemoPlan from '../models/DemoPlan';
import { isDemoPassport, DEMO_YEAR_KEYS } from '../data/demoPolicy';
import { planProblems } from './demoPlanController';
import { applyDemoYear, demoContext } from '../services/demoService';

/**
 * Giving and ending demo access (Super Admin, from the member's profile), and the demo account's
 * own controls (which year it shows).
 *
 * Giving access does two things. It opens membership the way an admin grant does — `active`, with
 * no end date the admin did not choose — so every membership, trial and section lock already in the
 * product opens without learning about demos. And it writes `passport.demo`, which the remaining
 * gates (day order, limits, cooldowns) and the content lists read. What the account had before is
 * kept on the marker, so Full reset can put it back exactly.
 */

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const actorOf = (req: Request) => {
  const a: any = (req as any).user || {};
  return { id: String(a.id || a._id || ''), name: [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email || 'admin' };
};
/** A demo runs until a super admin ends it. Membership needs a date, so it is one far away. */
const DEMO_UNTIL = new Date('2099-12-31T00:00:00.000Z');

/** GET /passport/members/:userId/demo — the account's demo, and the plans that can be given. */
export const memberDemo = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const u: any = await User.findOne({ _id: req.params.userId, tenantId }).select('passport').lean();
    if (!u) return res.status(404).json({ message: 'Member not found' });
    const plans: any[] = await DemoPlan.find({ active: true }).sort({ name: 1 }).lean();
    const ctx = await demoContext(String(u._id), u.passport || null);
    res.json({
      demo: ctx ? { ...ctx, at: u.passport.demo.at, byName: u.passport.demo.byName || '', note: u.passport.demo.note || '' } : null,
      plans: plans.map((p) => ({ id: String(p._id), name: p.name, missing: planProblems(p) })),
      paid: paidRunning(u.passport),
    });
  } catch (e: any) {
    console.error('[demo] member:', e?.message || e);
    res.status(500).json({ message: 'Could not load the demo access.' });
  }
};

/** A paying member's own membership is never turned into a demo. */
const paidRunning = (p: any) => p?.product === 'career_passport' && !!p?.active
  && !isDemoPassport(p) && (!p?.expiresAt || new Date(p.expiresAt).getTime() > Date.now());

/** POST /passport/members/:userId/demo — { planId, note } gives demo access. */
export const giveDemo = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const planId = String(req.body?.planId || '');
    if (!mongoose.isValidObjectId(planId)) return res.status(400).json({ message: 'Choose a demo plan.' });
    const [u, plan]: any[] = await Promise.all([
      User.findOne({ _id: req.params.userId, tenantId }).select('passport role').lean(),
      DemoPlan.findById(planId).lean(),
    ]);
    if (!u) return res.status(404).json({ message: 'Member not found' });
    if (!u.passport?.product) return res.status(400).json({ message: 'Only a CareerPilot account can be a demo account.' });
    if (!plan || !plan.active) return res.status(404).json({ message: 'That demo plan is not available.' });
    const missing = planProblems(plan);
    if (missing.length) return res.status(409).json({ message: `The plan is not ready: ${missing[0]}`, missing });
    if (paidRunning(u.passport)) {
      return res.status(409).json({ message: 'This member has a paid membership that is running. Demo access is for dedicated demo accounts only.' });
    }

    // The skill check comes first in a demo: the roadmap of every year is built from it.
    const { buildFoundationProfile } = await import('../services/foundationProfileService');
    const { summary } = await buildFoundationProfile(tenantId, String(u._id));
    if (!summary.measured) {
      return res.status(409).json({ message: 'This account has not taken the skill check yet. Take it first, then give demo access.' });
    }

    const actor = actorOf(req);
    const now = new Date();
    const p = u.passport || {};
    const previous = isDemoPassport(p) ? p.demo.previous : {
      active: !!p.active, expiresAt: p.expiresAt || null, product: p.product || null,
      stage: p.stage || null, track: p.careerTrack?.key || null,
    };
    const set: any = {
      'passport.active': true,
      'passport.expiresAt': DEMO_UNTIL,
      'passport.demo': {
        planId: plan._id, planName: plan.name, year: plan.startYear,
        by: actor.id, byName: actor.name, at: now,
        note: String(req.body?.note || '').trim().slice(0, 200),
        previous,
      },
    };
    if (!p.activatedAt) set['passport.activatedAt'] = now;
    await User.updateOne({ _id: u._id, tenantId }, { $set: set });

    // The journey clock starts as it does for a paid member, so a demo is not a second kind of member.
    const PassportProgress = (await import('../models/PassportProgress')).default;
    await PassportProgress.updateOne(
      { tenantId, studentId: u._id },
      { $setOnInsert: { tenantId, studentId: u._id, startDate: p.activatedAt || now } },
      { upsert: true },
    );

    const year = await applyDemoYear(tenantId, String(u._id), plan.startYear);
    res.json({ given: true, year: plan.startYear, roadmap: year });
  } catch (e: any) {
    console.error('[demo] give:', e?.message || e);
    res.status(500).json({ message: 'Could not give demo access.' });
  }
};

/**
 * DELETE /passport/members/:userId/demo — end demo access. The account goes back to the membership,
 * year and track it had before; what it did as a demo stays (Full reset clears that).
 */
export const endDemo = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const u: any = await User.findOne({ _id: req.params.userId, tenantId }).select('passport').lean();
    if (!u) return res.status(404).json({ message: 'Member not found' });
    if (!isDemoPassport(u.passport)) return res.json({ ended: false });
    await restorePrevious(tenantId, String(u._id), u.passport.demo.previous);
    res.json({ ended: true });
  } catch (e: any) {
    console.error('[demo] end:', e?.message || e);
    res.status(500).json({ message: 'Could not end demo access.' });
  }
};

/** Put back what the account was before its demo, and take the demo off it. */
export async function restorePrevious(tenantId: string, userId: string, prev: any) {
  const set: any = { 'passport.active': !!prev?.active };
  const unset: any = { 'passport.demo': 1 };
  if (prev?.expiresAt) set['passport.expiresAt'] = prev.expiresAt; else unset['passport.expiresAt'] = 1;
  if (prev?.stage) set['passport.stage'] = prev.stage;
  if (prev?.track) set['passport.careerTrack'] = { key: prev.track, chosenAt: new Date(), chosenBy: 'demo-end' };
  else unset['passport.careerTrack'] = 1;
  await User.updateOne({ _id: userId, tenantId }, { $set: set, $unset: unset });
}

// ── The demo account itself ──────────────────────────────────────────────────────────────────

/** GET /passport/me/demo — this account's demo (plan, year, the years it can show), or null. */
export const myDemo = async (req: Request, res: Response) => {
  try {
    const me: any = (req as any).user || {};
    const ctx = await demoContext(String(me.id || me._id));
    res.json({ demo: ctx ? { planName: ctx.planName, year: ctx.year, years: ctx.years, landingDay: ctx.config?.landingDay || 1 } : null });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not load the demo.' });
  }
};

/** POST /passport/me/demo/year — { year } shows another year of the plan. */
export const switchMyDemoYear = async (req: Request, res: Response) => {
  try {
    const me: any = (req as any).user || {};
    const year = String(req.body?.year || '');
    if (!DEMO_YEAR_KEYS.includes(year)) return res.status(400).json({ message: 'Choose a year.' });
    const out = await applyDemoYear(tenantOf(req), String(me.id || me._id), year);
    if (!out.ok) return res.status(409).json({ message: out.message });
    res.json({ year, roadmap: out.journey });
  } catch (e: any) {
    console.error('[demo] year:', e?.message || e);
    res.status(500).json({ message: 'Could not switch the year.' });
  }
};

// ── Reset between visits ─────────────────────────────────────────────────────────────────────

const resetKind = (raw: any) => (raw === 'full' ? 'full' : raw === 'progress' ? 'progress' : null);

/** POST /passport/members/:userId/demo/reset — { kind: 'progress' | 'full' } (Super Admin). */
export const resetMemberDemo = async (req: Request, res: Response) => {
  try {
    const kind = resetKind(req.body?.kind);
    if (!kind) return res.status(400).json({ message: 'Choose Reset progress or Full reset.' });
    const { resetDemoAccount } = await import('../services/demoResetService');
    const out = await resetDemoAccount(tenantOf(req), String(req.params.userId), kind);
    if (!out.ok) return res.status(409).json({ message: out.message });
    res.json({ reset: kind, cleared: out.cleared });
  } catch (e: any) {
    console.error('[demo] reset:', e?.message || e);
    res.status(500).json({ message: 'Could not reset the demo account.' });
  }
};

/** POST /passport/me/demo/reset — the same, from the demo account's own Demo bar. */
export const resetMyDemo = async (req: Request, res: Response) => {
  try {
    const kind = resetKind(req.body?.kind);
    if (!kind) return res.status(400).json({ message: 'Choose Reset progress or Full reset.' });
    const me: any = (req as any).user || {};
    const { resetDemoAccount } = await import('../services/demoResetService');
    const out = await resetDemoAccount(tenantOf(req), String(me.id || me._id), kind);
    if (!out.ok) return res.status(409).json({ message: out.message });
    res.json({ reset: kind });
  } catch (e: any) {
    console.error('[demo] reset (self):', e?.message || e);
    res.status(500).json({ message: 'Could not reset the demo.' });
  }
};
