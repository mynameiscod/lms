import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Tenant from '../models/Tenant';
import Payment from '../models/Payment';
import PassportProgress from '../models/PassportProgress';
import PassportResume from '../models/PassportResume';
import PassportInterview from '../models/PassportInterview';
import ProblemSubmission from '../models/ProblemSubmission';
import StudentProfile from '../models/StudentProfile';
import { levelFromXp } from '../services/passportGamificationService';
import { liveStreak } from '../services/passportXpService';
import { spendableBalance } from '../services/coinSpendService';
import { computeProfileCompleteness } from '../utils/profileCompleteness';
import { getUserTimeline } from '../services/careerPilotActivityService';
import { inferAttribution } from '../services/attributionInference';

/**
 * A plain-words answer to "how did this member find us", from the stored first/last touch. Paid ad
 * click ids win, then UTM tags, then the referring site, else Direct.
 */
function sourceLabel(t: any): string {
  if (!t) return 'Unknown';
  if (t.gclid) return 'Google Ads click';
  if (t.fbclid) return 'Meta (Facebook/Instagram) ad click';
  if (t.utm_source) return [t.utm_source, t.utm_medium].filter(Boolean).join(' / ');
  if (t.referrer) return `Referred by ${String(t.referrer).split('/')[0]}`;
  return 'Direct (typed the link, a bookmark or an untagged share)';
}

/**
 * GET /passport/admin/students/:studentId/profile — one CareerPilot member, for staff.
 *
 * The admin "profile" page read only the LMS StudentProfile, which most members never fill in
 * (their answers live on the account, from CareerPilot setup) — so for most members it said
 * "Profile not found". This is the member's own picture: account, CareerPilot setup, membership
 * and payments, progress, coins, resume, and the LMS profile when there is one. Skill DNA, role
 * readiness and the roadmap come from their existing admin endpoints.
 *
 * Staff see members of their own institute. The platform super admin may open any member, and
 * every figure is then read from that member's institute.
 */
export async function getMemberProfile(req: Request, res: Response) {
  try {
    const caller: any = (req as any).user || {};
    const { studentId } = req.params;
    if (!mongoose.isValidObjectId(studentId)) return res.status(400).json({ success: false, message: 'That is not a member id.' });
    const sid = new mongoose.Types.ObjectId(studentId);

    const superAdmin = caller.role === 'SUPER_ADMIN';
    const user: any = await User.findOne({ _id: sid, ...(superAdmin ? {} : { tenantId: caller.tenantId }) })
      .select('firstName lastName email phone role isActive createdAt updatedAt tenantId batchId passport profilePicture').lean();
    if (!user) return res.status(404).json({ success: false, message: 'Member not found.' });
    const tenantId = String(user.tenantId);

    const [tenant, payments, progress, coins, resume, lmsProfile, interviews, practiceSolved] = await Promise.all([
      Tenant.findById(tenantId).select('name slug').lean() as any,
      Payment.find({ tenantId, studentId: sid }).sort({ createdAt: -1 }).limit(25)
        .select('purpose amount currency status createdAt paidAt orderId refund').lean() as any,
      PassportProgress.findOne({ tenantId, studentId: sid }).lean() as any,
      spendableBalance(tenantId, studentId).catch(() => null),
      PassportResume.findOne({ tenantId, studentId: sid }).select('score.total scoredAt updatedAt').lean() as any,
      StudentProfile.findOne({ userId: sid, tenantId: user.tenantId }).lean() as any,
      PassportInterview.aggregate([
        { $match: { tenantId, studentId: sid } },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
      ProblemSubmission.distinct('problemId', { tenantId, userId: studentId, verdict: 'AC' }),
    ]);

    const p = user.passport || {};
    const xp = progress?.xp || 0;
    // Joined before sources were captured live: reconstruct from their payment or first visits.
    const live = p.attribution?.first_touch || p.attribution?.last_touch;
    const inferred = live ? null : await inferAttribution(tenantId, studentId).catch(() => null);
    const ivBy: Record<string, number> = {};
    for (const r of interviews as any[]) ivBy[r._id] = r.n;
    const clean = (v: any) => String(v ?? '').trim().replace(/^-+$/, '');

    res.json({
      success: true,
      data: {
        account: {
          id: String(user._id),
          name: `${clean(user.firstName)} ${clean(user.lastName)}`.trim() || user.email,
          email: user.email,
          phone: user.phone || null,
          isActive: user.isActive !== false,
          joinedAt: user.createdAt,
          lastSeenAt: p.lastSeenAt || null,
          profilePicture: user.profilePicture || null,
          tenant: { id: tenantId, name: tenant?.name || '', slug: tenant?.slug || '' },
          alsoLmsStudent: !!user.batchId,
        },
        joined: {
          /** Where every CareerPilot account is created: the join form, then an OTP on WhatsApp. */
          via: 'CareerPilot join form (/careerpilot/join) — OTP verified',
          source: sourceLabel(live || inferred?.touch),
          firstTouch: p.attribution?.first_touch || inferred?.touch || null,
          lastTouch: p.attribution?.last_touch || null,
          /** 'activity' | 'payment' when the source was pieced together after signup rather than captured live. */
          reconstructed: p.attributionReconstructed || inferred?.from || null,
          verifiedAt: p.verifiedAt || null,
        },
        setup: {
          stage: p.stage || null,
          program: p.program || p.degree || null,
          branch: p.branch || null,
          yearOfStudy: p.yearOfStudy || null,
          graduationMonth: p.graduationMonth || null,
          graduationYear: p.graduationYear || null,
          graduated: !!p.graduated,
          background: p.background || null,
          primaryRole: p.primaryRole || p.targetRole || null,
          secondaryRole: p.secondaryRole || null,
          careerTrack: p.careerTrack || null,
          preferredLanguages: p.preferredLanguages || [],
          college: p.college || p.collegeName || null,
          city: p.city || null,
          onboarded: !!p.onboarded,
          setupCompletedAt: p.contextCompletedAt || null,
          verifiedAt: p.verifiedAt || null,
        },
        membership: {
          active: !!p.active,
          product: p.product || null,
          activatedAt: p.activatedAt || null,
          expiresAt: p.expiresAt || null,
          complimentary: p.grant?.at ? { reason: p.grant.reason || '', byName: p.grant.byName || '', at: p.grant.at, days: p.grant.days || null } : null,
        },
        payments: (payments as any[]).map((x) => ({
          purpose: x.purpose, amountInr: Math.round((x.amount || 0) / 100), currency: x.currency || 'INR', status: x.status,
          createdAt: x.createdAt, paidAt: x.paidAt || null, orderId: x.orderId || '', refunded: !!x.refund?.amount,
        })),
        progress: {
          xp,
          level: levelFromXp(xp),
          streak: progress ? liveStreak(progress) : 0,
          longestStreak: progress?.longestStreak || 0,
          lastActiveDay: progress?.lastCompletedDate || null,
          coins: coins ? { balance: coins.balance, spendable: coins.spendable } : null,
          practiceSolved: (practiceSolved as any[]).length,
          interviews: { completed: ivBy.completed || 0, started: Object.values(ivBy).reduce((a, b) => a + b, 0) },
        },
        resume: resume ? { score: resume.score?.total ?? null, scoredAt: resume.scoredAt || null, updatedAt: resume.updatedAt } : null,
        lmsProfile: lmsProfile ? { completeness: lmsProfile.profileCompletionPercentage ?? computeProfileCompleteness(lmsProfile), updatedAt: lmsProfile.updatedAt } : null,
      },
    });
  } catch (e: any) {
    console.error('[member-profile]', e?.message || e);
    res.status(500).json({ success: false, message: 'Could not load this member.' });
  }
}

/**
 * GET /passport/admin/students/:studentId/activity — everything one member has done, newest first.
 * SUPER_ADMIN only (route guard). Read from the member's own tenant, so a super admin can open any.
 */
export async function getMemberActivity(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    if (!mongoose.isValidObjectId(studentId)) return res.status(400).json({ success: false, message: 'That is not a member id.' });
    const user: any = await User.findById(studentId).select('tenantId').lean();
    if (!user) return res.status(404).json({ success: false, message: 'Member not found.' });
    const kinds = String(req.query.kinds || '').split(',').map(k => k.trim()).filter(k => ['page', 'action', 'api', 'error'].includes(k));
    const data = await getUserTimeline(String(user.tenantId), studentId, {
      before: req.query.before ? String(req.query.before) : undefined,
      limit: Number(req.query.limit) || 150,
      kinds,
    });
    res.json({ success: true, data });
  } catch (e: any) {
    console.error('[member-activity]', e?.message || e);
    res.status(500).json({ success: false, message: "Could not load this member's activity." });
  }
}
