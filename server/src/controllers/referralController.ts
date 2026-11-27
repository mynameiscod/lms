import mongoose from 'mongoose';
import { Request, Response } from 'express';
import User from '../models/User';
import Fee from '../models/Fee';
import { Referral, ReferralCode, ReferralPayout, REFERRAL_STATUSES } from '../models/Referral';
import * as svc from '../services/referralService';

/**
 * LMS REFER & EARN over HTTP: the public referral link, the student's Refer & Earn page and the
 * admin Referrals screen. The rules are in services/referralService.ts.
 */

const fail = (res: Response, e: any) => {
  if (e instanceof svc.ReferralError) return res.status(e.http).json({ success: false, code: e.code, message: e.message });
  console.error('[referral]', e);
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};
const ok = (res: Response, data: any) => res.json({ success: true, data });
const oid = (v: any) => new mongoose.Types.ObjectId(String(v));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tenantOf = (req: Request) => String((req as any).tenantId || (req as any).user?.tenantId || '');

const me = async (req: Request) => {
  const id = (req as any).user?.id;
  return id ? User.findById(id).select('firstName lastName email phone role tenantId batchId isActive lmsDemo').lean() : null;
};
const adminWho = async (req: Request) => {
  const u: any = await me(req);
  return { id: String(u?._id || ''), name: u ? [u.firstName, u.lastName === '-' ? '' : u.lastName].filter(Boolean).join(' ') || u.email : 'Admin' };
};
const maskPhone = (p?: string) => (p && p.length >= 4 ? `••••••${p.slice(-4)}` : '');

/* ═══════════════════════════════ PUBLIC ═══════════════════════════════ */

export const publicInfo = async (req: Request, res: Response) => {
  try {
    const { _referrer, ...info } = await svc.publicCodeInfo(req.params.code);
    ok(res, info);
  } catch (e) { fail(res, e); }
};

export const publicSubmit = async (req: Request, res: Response) => {
  try {
    const info = await svc.publicCodeInfo(req.params.code);
    if (!info.open || !info._referrer) throw new svc.ReferralError(403, 'OFF', 'Referrals are not open right now. Please contact the institute directly.');
    const b = req.body || {};
    const referrer: any = await User.findById(info._referrer._id).lean();
    await svc.createReferral({ referrer, name: b.name, phone: b.mobile ?? b.phone, email: b.email, course: b.course, via: 'link' });
    ok(res, { institute: info.institute.name });
  } catch (e: any) {
    // To a stranger, "already a student / already enquired" is still a friendly message, never a 500.
    fail(res, e);
  }
};

/* ═══════════════════════════════ STUDENT ═══════════════════════════════ */

export const myPage = async (req: Request, res: Response) => {
  try {
    const user: any = await me(req);
    if (!user) return res.status(401).json({ success: false, message: 'Please log in again.' });
    const program = await svc.getProgram(String(user.tenantId));
    const elig = await svc.referrerEligibility(user);
    const existingCode: any = await ReferralCode.findOne({ userId: user._id }).lean();
    // A code is made only for someone who can refer; a student who left keeps theirs to withdraw.
    const codeDoc: any = existingCode || (elig.ok ? await svc.ensureCode(user) : null);
    const [bal, refs, payouts] = await Promise.all([
      svc.balanceOf(user._id),
      Referral.find({ referrerId: user._id }).sort({ createdAt: -1 }).limit(200)
        .select('friendName friendPhone course status rewardAmount holdUntil earnedAt createdAt rejectedReason').lean(),
      ReferralPayout.find({ referrerId: user._id }).sort({ createdAt: -1 }).limit(50)
        .select('amount details status reference paidAt rejectedReason createdAt').lean(),
    ]);
    ok(res, {
      eligible: elig.ok,
      reason: elig.reason || null,
      program: { enabled: program.enabled, rewardAmount: program.rewardAmount, holdDays: program.holdDays, minPayout: program.minPayout, courses: program.courses, terms: program.terms },
      code: codeDoc?.code || null,
      firstName: user.firstName,
      stats: bal,
      referrals: refs.map((r: any) => ({ ...r, friendPhone: maskPhone(r.friendPhone) })),
      payouts: payouts.map((p: any) => ({ ...p, details: svc.maskDetails(p.details) })),
      payoutDetails: svc.maskDetails(codeDoc?.payoutDetails),
      hasSavedBank: codeDoc?.payoutDetails?.method === 'bank',
    });
  } catch (e) { fail(res, e); }
};

export const myRefer = async (req: Request, res: Response) => {
  try {
    const user: any = await me(req);
    const elig = await svc.referrerEligibility(user);
    if (!elig.ok) throw new svc.ReferralError(403, 'NOT_ELIGIBLE', elig.reason || 'Refer & Earn is not open for you.');
    const full: any = await User.findById(user._id).lean();
    const b = req.body || {};
    const ref: any = await svc.createReferral({ referrer: full, name: b.name, phone: b.mobile ?? b.phone, email: b.email, course: b.course, via: 'app' });
    ok(res, { id: ref._id });
  } catch (e) { fail(res, e); }
};

export const myWithdraw = async (req: Request, res: Response) => {
  try {
    const user: any = await me(req);
    if (!user || user.role !== 'STUDENT' || user.lmsDemo?.at) throw new svc.ReferralError(403, 'NOT_ELIGIBLE', 'Refer & Earn is for students.');
    const b = req.body || {};
    // "Use my saved bank account": the full number never travels back to the browser, so take it from the saved copy.
    if (b.useSaved) {
      const codeDoc: any = await ReferralCode.findOne({ userId: user._id }).lean();
      if (!codeDoc?.payoutDetails) throw new svc.ReferralError(400, 'NO_SAVED', 'Enter your payout details.');
      b.details = codeDoc.payoutDetails;
    }
    const p: any = await svc.requestPayout(user, b);
    ok(res, { id: p._id, amount: p.amount });
  } catch (e) { fail(res, e); }
};

/* ═══════════════════════════════ ADMIN ═══════════════════════════════ */

export const adminGetProgram = async (req: Request, res: Response) => {
  try { ok(res, await svc.getProgram(tenantOf(req))); } catch (e) { fail(res, e); }
};

export const adminSaveProgram = async (req: Request, res: Response) => {
  try { ok(res, await svc.saveProgram(tenantOf(req), req.body || {}, (req as any).user?.id)); } catch (e) { fail(res, e); }
};

export const adminSummary = async (req: Request, res: Response) => {
  try {
    const t = oid(tenantOf(req));
    const [byStatus, payouts, top] = await Promise.all([
      Referral.aggregate([{ $match: { tenantId: t } }, { $group: { _id: '$status', n: { $sum: 1 }, amount: { $sum: '$rewardAmount' } } }]),
      ReferralPayout.aggregate([{ $match: { tenantId: t } }, { $group: { _id: '$status', n: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
      Referral.aggregate([
        { $match: { tenantId: t, status: { $in: ['joined', 'on_hold', 'earned'] } } },
        { $group: { _id: '$referrerId', name: { $first: '$referrerName' }, code: { $first: '$code' }, joined: { $sum: 1 }, earned: { $sum: { $cond: [{ $eq: ['$status', 'earned'] }, '$rewardAmount', 0] } } } },
        { $sort: { joined: -1, earned: -1 } },
        { $limit: 5 },
      ]),
    ]);
    const s = (k: string) => byStatus.find((x: any) => x._id === k) || { n: 0, amount: 0 };
    const p = (k: string) => payouts.find((x: any) => x._id === k) || { n: 0, amount: 0 };
    ok(res, {
      counts: Object.fromEntries(REFERRAL_STATUSES.map((k) => [k, s(k).n])),
      total: byStatus.reduce((a: number, x: any) => a + x.n, 0),
      onHoldAmount: s('on_hold').amount,
      earnedAmount: s('earned').amount,
      paidOut: p('paid').amount,
      requested: { n: p('requested').n, amount: p('requested').amount },
      top,
    });
  } catch (e) { fail(res, e); }
};

export const adminList = async (req: Request, res: Response) => {
  try {
    const t = oid(tenantOf(req));
    const q: any = { tenantId: t };
    const status = String(req.query.status || 'all');
    if ((REFERRAL_STATUSES as readonly string[]).includes(status)) q.status = status;
    const search = String(req.query.search || '').trim();
    if (search) {
      const re = new RegExp(esc(search), 'i');
      q.$or = [{ friendName: re }, { friendPhone: re }, { referrerName: re }, { code: re }, { course: re }];
    }
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = 50;
    const [rows, total] = await Promise.all([
      Referral.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Referral.countDocuments(q),
    ]);
    // Fee progress for the friends who are students: what the admin checks before anything else.
    const sids = rows.map((r: any) => r.studentId).filter(Boolean);
    const fees: any[] = sids.length ? await Fee.find({ tenantId: t, studentId: { $in: sids } }).select('studentId totalAmount discount paidAmount').lean() : [];
    const feeBy = new Map<string, { net: number; paid: number }>();
    for (const f of fees) {
      const k = String(f.studentId);
      const a = feeBy.get(k) || { net: 0, paid: 0 };
      const n = Math.max(0, (f.totalAmount || 0) - (f.discount || 0));
      a.net += n;
      a.paid += Math.min(n, f.paidAmount || 0);
      feeBy.set(k, a);
    }
    ok(res, {
      rows: rows.map((r: any) => ({ ...r, fee: r.studentId ? feeBy.get(String(r.studentId)) || { net: 0, paid: 0 } : null })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (e) { fail(res, e); }
};

export const adminAdd = async (req: Request, res: Response) => {
  try {
    const ref: any = await svc.adminAddReferral(tenantOf(req), req.body || {}, await adminWho(req));
    ok(res, { id: ref._id });
  } catch (e) { fail(res, e); }
};

export const adminReject = async (req: Request, res: Response) => {
  try { ok(res, await svc.rejectReferral(tenantOf(req), req.params.id, (req.body || {}).reason, await adminWho(req))); } catch (e) { fail(res, e); }
};

export const adminRestore = async (req: Request, res: Response) => {
  try { ok(res, await svc.restoreReferral(tenantOf(req), req.params.id, await adminWho(req))); } catch (e) { fail(res, e); }
};

export const adminRecheck = async (req: Request, res: Response) => {
  try {
    const ref: any = await Referral.findOne({ _id: oid(req.params.id), tenantId: oid(tenantOf(req)) }).select('_id').lean();
    if (!ref) throw new svc.ReferralError(404, 'NOT_FOUND', 'Referral not found.');
    await svc.syncReferral(ref._id);
    ok(res, await Referral.findById(ref._id).lean());
  } catch (e) { fail(res, e); }
};

export const adminPayouts = async (req: Request, res: Response) => {
  try {
    const q: any = { tenantId: oid(tenantOf(req)) };
    const status = String(req.query.status || 'requested');
    if (['requested', 'paid', 'rejected'].includes(status)) q.status = status;
    const rows: any[] = await ReferralPayout.find(q).sort({ createdAt: status === 'requested' ? 1 : -1 }).limit(500).lean();
    const users: any[] = rows.length ? await User.find({ _id: { $in: rows.map((r) => r.referrerId) } }).select('phone email').lean() : [];
    const byId = new Map(users.map((u) => [String(u._id), u]));
    // Full details here: whoever holds manage_referrals is the person sending the money.
    ok(res, rows.map((r) => ({ ...r, phone: byId.get(String(r.referrerId))?.phone || '', email: byId.get(String(r.referrerId))?.email || '' })));
  } catch (e) { fail(res, e); }
};

export const adminPayoutPaid = async (req: Request, res: Response) => {
  try { ok(res, await svc.markPayoutPaid(tenantOf(req), req.params.id, req.body || {}, await adminWho(req))); } catch (e) { fail(res, e); }
};

export const adminPayoutReject = async (req: Request, res: Response) => {
  try { ok(res, await svc.rejectPayout(tenantOf(req), req.params.id, (req.body || {}).reason, await adminWho(req))); } catch (e) { fail(res, e); }
};
