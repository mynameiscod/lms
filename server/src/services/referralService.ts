import mongoose from 'mongoose';
import User from '../models/User';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import Fee from '../models/Fee';
import Tenant from '../models/Tenant';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import {
  Referral, ReferralCode, ReferralPayout, ReferralProgram, REFERRAL_DEFAULTS,
  IPayoutDetails, ReferralStatus,
} from '../models/Referral';
import { normalizePhone, mobileError } from '../utils/phone';
import { createNotifications } from '../notifications/notificationService';

/**
 * LMS REFER & EARN — the rules. See models/Referral.ts for the flow and the statuses.
 * The controller only speaks HTTP; everything that decides money is here.
 *
 *   • Every enrolled LMS student can refer (not demo accounts, not CareerPilot-only members).
 *   • The friend must be new: not a student, not an existing lead, not already referred, not the referrer.
 *   • Reward = the institute's amount (₹1500), earned when the friend has paid the FULL fee, after the hold.
 *   • A refund during the hold sends the referral back to "joined". Earned is final.
 *   • Payouts: UPI or bank, one open request at a time, marked paid by an admin with the reference.
 */

export class ReferralError extends Error {
  constructor(public http: number, public code: string, message: string) { super(message); }
}

const oid = (v: any) => new mongoose.Types.ObjectId(String(v));
const ACTIVE: ReferralStatus[] = ['pending', 'joined', 'on_hold'];
const DAY = 24 * 60 * 60 * 1000;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nameOf = (u: any) => [u?.firstName, u?.lastName === '-' ? '' : u?.lastName].filter(Boolean).join(' ').trim() || u?.email || 'Student';
const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const phoneRe = (ten: string) => ({ $regex: `${esc(ten)}$` });

/* ═══════════════════════════════ Program ═══════════════════════════════ */

export type ProgramView = typeof REFERRAL_DEFAULTS & { tenantId: string };

export async function getProgram(tenantId: string): Promise<ProgramView> {
  const doc: any = await ReferralProgram.findOne({ tenantId: oid(tenantId) }).lean();
  return {
    tenantId: String(tenantId),
    enabled: doc?.enabled ?? REFERRAL_DEFAULTS.enabled,
    rewardAmount: doc?.rewardAmount ?? REFERRAL_DEFAULTS.rewardAmount,
    holdDays: doc?.holdDays ?? REFERRAL_DEFAULTS.holdDays,
    minPayout: doc?.minPayout ?? REFERRAL_DEFAULTS.minPayout,
    courses: doc?.courses?.length ? doc.courses : REFERRAL_DEFAULTS.courses,
    terms: doc?.terms ?? REFERRAL_DEFAULTS.terms,
  };
}

export async function saveProgram(tenantId: string, body: any, byId: string): Promise<ProgramView> {
  const set: any = { updatedBy: byId ? oid(byId) : undefined };
  if (body.enabled !== undefined) set.enabled = !!body.enabled;
  const num = (v: any, field: string, max: number) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > max) throw new ReferralError(400, 'BAD_VALUE', `${field} must be between 0 and ${max.toLocaleString('en-IN')}.`);
    return Math.round(n);
  };
  if (body.rewardAmount !== undefined) set.rewardAmount = num(body.rewardAmount, 'Reward', 100000);
  if (body.holdDays !== undefined) set.holdDays = num(body.holdDays, 'Hold days', 365);
  if (body.minPayout !== undefined) set.minPayout = num(body.minPayout, 'Minimum withdrawal', 1000000);
  if (Array.isArray(body.courses)) {
    const seen = new Set<string>();
    set.courses = body.courses.map((c: any) => String(c || '').trim().slice(0, 80)).filter((c: string) => {
      const k = c.toLowerCase();
      if (!c || seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 40);
  }
  if (body.terms !== undefined) set.terms = String(body.terms || '').slice(0, 4000);
  await ReferralProgram.updateOne({ tenantId: oid(tenantId) }, { $set: set }, { upsert: true });
  return getProgram(tenantId);
}

/* ═══════════════════════════════ Who can refer ═══════════════════════════════ */

/** An enrolled LMS student: a batch, a learning plan, or a fee record. Demo accounts never. */
export async function referrerEligibility(user: any): Promise<{ ok: boolean; reason?: string }> {
  if (!user || user.role !== 'STUDENT') return { ok: false, reason: 'Refer & Earn is for students.' };
  if (user.lmsDemo?.at) return { ok: false, reason: 'Refer & Earn opens once you join a course.' };
  if (user.isActive === false) return { ok: false, reason: 'Your account is not active.' };
  if (user.batchId) return { ok: true };
  const [plan, fee] = await Promise.all([
    CurriculumEnrollment.exists({ studentId: user._id, enrolledBy: { $ne: 'lms-demo' } } as any),
    Fee.exists({ studentId: user._id }),
  ]);
  if (plan || fee) return { ok: true };
  return { ok: false, reason: 'Refer & Earn opens once you are enrolled in a course.' };
}

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function makeCode(firstName: string) {
  const prefix = String(firstName || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) || 'CB';
  let tail = '';
  for (let i = 0; i < 4; i++) tail += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `${prefix}${tail}`;
}

export async function ensureCode(user: any) {
  const existing: any = await ReferralCode.findOne({ userId: user._id }).lean();
  if (existing) return existing;
  for (let i = 0; i < 8; i++) {
    try {
      const doc = await ReferralCode.create({ tenantId: user.tenantId, userId: user._id, code: makeCode(user.firstName) });
      return doc.toObject();
    } catch (e: any) {
      if (e?.code !== 11000) throw e;
      // Either the code was taken (try another) or this user's code was made by a parallel request.
      const mine: any = await ReferralCode.findOne({ userId: user._id }).lean();
      if (mine) return mine;
    }
  }
  throw new ReferralError(500, 'NO_CODE', 'Could not make your referral code. Please try again.');
}

/* ═══════════════════════════════ Creating a referral ═══════════════════════════════ */

async function firstStageId(tenantOid: mongoose.Types.ObjectId) {
  let stage: any = await LeadStage.findOne({ tenantId: tenantOid, $or: [{ name: /new/i }, { order: 1 }] } as any).sort({ order: 1 }).select('_id').lean();
  if (!stage) stage = await LeadStage.findOne({ tenantId: tenantOid }).sort({ order: 1 }).select('_id').lean();
  return stage?._id as mongoose.Types.ObjectId | undefined;
}
async function anyAdminId(tenantOid: mongoose.Types.ObjectId) {
  const a: any = await User.findOne({ tenantId: tenantOid, role: { $in: ['TENANT_ADMIN', 'SUPER_ADMIN'] }, 'lmsDemo.at': { $exists: false } }).select('_id').lean();
  return a?._id as mongoose.Types.ObjectId | undefined;
}

export interface NewReferral {
  referrer: any;              // the referrer's User document (lean is fine)
  name: string;
  phone: string;
  email?: string;
  course?: string;
  via: 'link' | 'app' | 'admin';
  /** An admin adding it: an existing lead or student on that number is linked instead of refused. */
  byAdmin?: { id: string; name: string };
}

export async function createReferral(input: NewReferral) {
  const { referrer, via, byAdmin } = input;
  const tenantOid = oid(referrer.tenantId);
  const program = await getProgram(String(tenantOid));
  if (!program.enabled && !byAdmin) throw new ReferralError(403, 'OFF', 'Refer & Earn is not open right now.');

  const name = String(input.name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  if (name.length < 2) throw new ReferralError(400, 'NAME', "Enter your friend's name.");
  const phoneErr = mobileError(input.phone);
  if (phoneErr) throw new ReferralError(400, 'PHONE', phoneErr);
  const ten = normalizePhone(input.phone);
  const email = String(input.email || '').trim().toLowerCase().slice(0, 120) || undefined;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ReferralError(400, 'EMAIL', 'That email does not look right.');
  const course = String(input.course || '').trim().slice(0, 80) || undefined;

  if (normalizePhone(referrer.phone) === ten) throw new ReferralError(400, 'SELF', 'You cannot refer your own number.');

  const [taken, student, lead] = await Promise.all([
    Referral.findOne({ tenantId: tenantOid, activeKey: ten }).select('referrerId').lean(),
    User.findOne({ tenantId: tenantOid, role: 'STUDENT', phone: phoneRe(ten), 'lmsDemo.at': { $exists: false } } as any).select('_id').lean(),
    Lead.findOne({ tenantId: tenantOid, phone: phoneRe(ten) } as any).select('_id referral').lean(),
  ]);
  if (taken) {
    const mine = String((taken as any).referrerId) === String(referrer._id);
    // On the public link the person typing is the friend, not the referrer.
    if (via === 'link') throw new ReferralError(409, 'ALREADY_REFERRED', 'This number has already been referred. A counsellor will be in touch.');
    throw new ReferralError(409, 'ALREADY_REFERRED', mine ? 'You have already referred this number.' : 'Someone has already referred this number.');
  }
  if (student && String((student as any)._id) === String(referrer._id)) throw new ReferralError(400, 'SELF', 'You cannot refer yourself.');
  if (!byAdmin) {
    if (student) throw new ReferralError(409, 'ALREADY_STUDENT', 'This number already belongs to a student, so it cannot be referred.');
    if (lead) throw new ReferralError(409, 'ALREADY_LEAD', 'This number has already enquired with us, so it cannot count as a referral.');
  }

  const referrerName = nameOf(referrer);
  const codeDoc: any = await ensureCode(referrer);
  const by = byAdmin ? byAdmin.name : via === 'link' ? 'Referral link' : referrerName;
  let ref: any;
  try {
    ref = await Referral.create({
      tenantId: tenantOid,
      referrerId: referrer._id,
      referrerName,
      code: codeDoc.code,
      friendName: name,
      friendPhone: ten,
      friendEmail: email,
      course,
      activeKey: ten,
      via,
      studentId: student ? (student as any)._id : undefined,
      status: 'pending',
      history: [{ at: new Date(), status: 'pending', note: byAdmin ? 'Added by admin' : via === 'link' ? 'Signed up from the referral link' : 'Referred in the app', by }],
    });
  } catch (e: any) {
    if (e?.code === 11000) throw new ReferralError(409, 'ALREADY_REFERRED', 'Someone has already referred this number.');
    throw e;
  }

  // The CRM side. Best effort: the referral stands even if the lead could not be made.
  try {
    const tag = { referralId: ref._id, referrerId: referrer._id, referrerName, code: codeDoc.code };
    const note = `🤝 Referred by ${referrerName} (Refer & Earn, code ${codeDoc.code})${course ? ` · ${course}` : ''}`;
    if (lead) {
      const createdBy = byAdmin?.id ? oid(byAdmin.id) : (await anyAdminId(tenantOid));
      await Lead.updateOne({ _id: (lead as any)._id }, {
        $set: { referral: tag },
        ...(createdBy ? { $push: { activities: { type: 'note', description: note, createdBy, createdAt: new Date(), metadata: { source: 'referral' } } } } : {}),
      } as any);
      ref.leadId = (lead as any)._id;
    } else {
      const [stageId, adminId] = await Promise.all([firstStageId(tenantOid), anyAdminId(tenantOid)]);
      if (stageId) {
        const createdBy = byAdmin?.id ? oid(byAdmin.id) : adminId || new mongoose.Types.ObjectId();
        const created = await Lead.create({
          tenantId: tenantOid,
          name,
          phone: ten,
          email,
          source: 'referral',
          stageId,
          priority: 'warm',
          createdBy,
          courseInterest: course ? [course] : [],
          referral: tag,
          sourceDetails: { platform: 'website', landingPage: 'refer_and_earn' },
          activities: [{ type: 'created', description: note, createdBy, createdAt: new Date(), metadata: { source: 'referral' } }],
        } as any);
        ref.leadId = created._id;
      }
    }
    if (ref.leadId) await Referral.updateOne({ _id: ref._id }, { $set: { leadId: ref.leadId } });
  } catch (e: any) {
    console.error('[referral] lead sync failed:', e?.message);
  }

  if (via === 'link') {
    notify(String(tenantOid), String(referrer._id), '🤝 Your friend signed up', `${name} signed up from your referral link. You earn ${rupees(program.rewardAmount)} when they join and pay the full fee.`);
  }
  // A student already on that number (admin path): bring the status up to date now.
  if (ref.studentId) await syncReferral(ref._id);
  return ref;
}

/* ═══════════════════════════════ Keeping status in step with fees ═══════════════════════════════ */

function notify(tenantId: string, userId: string, title: string, message: string) {
  createNotifications(tenantId, [userId], 'general', title, message, '/refer-and-earn')
    .catch((e: any) => console.error('[referral] notification failed:', e?.message));
}

/** Full fee paid = every fee record of the student is paid off (net of discount), and there is at least one. */
async function feeState(tenantId: any, studentId: any) {
  const fees: any[] = await Fee.find({ tenantId, studentId }).select('totalAmount discount paidAmount').lean();
  let net = 0;
  let paid = 0;
  let allPaid = true;
  let any = false;
  for (const f of fees) {
    const n = Math.max(0, (f.totalAmount || 0) - (f.discount || 0));
    if (n <= 0) continue;
    any = true;
    net += n;
    paid += Math.min(n, f.paidAmount || 0);
    if ((f.paidAmount || 0) < n) allPaid = false;
  }
  return { net, paid, fullyPaid: any && allPaid };
}

/**
 * Bring one referral's status up to date. Safe to run any number of times, from any instance:
 * every write is conditional on the status it read.
 */
export async function syncReferral(referralId: any, now = new Date()): Promise<ReferralStatus | null> {
  const ref: any = await Referral.findById(referralId).lean();
  if (!ref || !ACTIVE.includes(ref.status)) return ref?.status ?? null;

  let studentId = ref.studentId;
  if (!studentId && ref.leadId) {
    const lead: any = await Lead.findById(ref.leadId).select('convertedStudentId').lean();
    studentId = lead?.convertedStudentId;
  }
  if (!studentId) {
    const u: any = await User.findOne({ tenantId: ref.tenantId, role: 'STUDENT', phone: phoneRe(ref.friendPhone), 'lmsDemo.at': { $exists: false } } as any).select('_id').lean();
    studentId = u?._id;
  }

  const set: any = {};
  const unset: any = {};
  const history: any[] = [];
  let next: ReferralStatus = ref.status;

  if (studentId && String(studentId) === String(ref.referrerId)) {
    next = 'rejected';
    Object.assign(set, { rejectedAt: now, rejectedReason: 'Self-referral' });
    unset.activeKey = 1;
    history.push({ at: now, status: 'rejected', note: 'Self-referral', by: 'System' });
  } else if (studentId) {
    if (!ref.studentId) set.studentId = studentId;
    if (next === 'pending') {
      next = 'joined';
      set.joinedAt = now;
      history.push({ at: now, status: 'joined', note: 'Became a student', by: 'System' });
    }
    const fee = await feeState(ref.tenantId, studentId);
    if (fee.fullyPaid && next === 'joined') {
      const program = await getProgram(String(ref.tenantId));
      next = 'on_hold';
      set.qualifiedAt = now;
      set.holdUntil = new Date(now.getTime() + program.holdDays * DAY);
      set.rewardAmount = program.rewardAmount;
      history.push({ at: now, status: 'on_hold', note: `Full fee paid. ${rupees(program.rewardAmount)} unlocks after ${program.holdDays} days`, by: 'System' });
    } else if (!fee.fullyPaid && next === 'on_hold') {
      next = 'joined';
      unset.qualifiedAt = 1;
      unset.holdUntil = 1;
      history.push({ at: now, status: 'joined', note: 'Fee is no longer fully paid (refund or change), so the hold stopped', by: 'System' });
    }
    const holdUntil: Date | undefined = set.holdUntil || ref.holdUntil;
    if (next === 'on_hold' && fee.fullyPaid && holdUntil && now >= new Date(holdUntil)) {
      next = 'earned';
      set.earnedAt = now;
      history.push({ at: now, status: 'earned', note: 'Hold period over', by: 'System' });
    }
  }

  if (next === ref.status && !set.studentId) return ref.status;
  set.status = next;
  const res = await Referral.updateOne(
    { _id: ref._id, status: ref.status },
    { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}), ...(history.length ? { $push: { history: { $each: history } } } : {}) },
  );
  if (!res.modifiedCount || next === ref.status) return next;

  const tId = String(ref.tenantId);
  const rId = String(ref.referrerId);
  const amount = set.rewardAmount ?? ref.rewardAmount;
  if (next === 'joined' && ref.status === 'pending') notify(tId, rId, '🎓 Your friend joined', `${ref.friendName} joined. Your reward is on its way once the full fee is paid.`);
  if (next === 'on_hold') notify(tId, rId, '⏳ Reward on hold', `${ref.friendName} paid the full fee. Your ${rupees(amount)} unlocks on ${new Date(set.holdUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`);
  if (next === 'earned') notify(tId, rId, '🎉 Reward unlocked', `${rupees(amount)} for referring ${ref.friendName} is now yours. Withdraw it from Refer & Earn.`);
  return next;
}

/** After a fee changes, or a lead becomes a student. */
export async function syncForStudent(studentId: string) {
  const u: any = await User.findById(studentId).select('tenantId phone').lean();
  if (!u) return;
  const ten = normalizePhone(u.phone);
  const or: any[] = [{ studentId: u._id }];
  if (ten) or.push({ activeKey: ten });
  const refs = await Referral.find({ tenantId: u.tenantId, status: { $in: ACTIVE }, $or: or }).select('_id').lean();
  for (const r of refs) await syncReferral(r._id);
}

/** Every open referral. Hourly, and after boot. */
export async function sweepReferrals(now = new Date()) {
  const cursor = Referral.find({ status: { $in: ACTIVE } }).select('_id').lean().cursor();
  let changed = 0;
  for await (const r of cursor) {
    try {
      const before = await Referral.findById(r._id).select('status').lean();
      const after = await syncReferral(r._id, now);
      if (after && before && (before as any).status !== after) changed++;
    } catch (e: any) {
      console.error('[referral] sync failed', String(r._id), e?.message);
    }
  }
  if (changed) console.log(`🤝 Refer & Earn: ${changed} referral(s) moved on`);
  return changed;
}

export function startReferralScheduler() {
  const run = () => sweepReferrals().catch((e) => console.error('[referral] sweep failed', e?.message));
  setTimeout(run, 90 * 1000).unref?.();
  const h = setInterval(run, 60 * 60 * 1000);
  h.unref?.();
  console.log('🤝 Refer & Earn scheduler started (hourly)');
  return h;
}

/* ═══════════════════════════════ Balance & payouts ═══════════════════════════════ */

export async function balanceOf(referrerId: any) {
  const rid = oid(referrerId);
  const [refAgg, payAgg] = await Promise.all([
    Referral.aggregate([{ $match: { referrerId: rid } }, { $group: { _id: '$status', n: { $sum: 1 }, amount: { $sum: '$rewardAmount' } } }]),
    ReferralPayout.aggregate([{ $match: { referrerId: rid, status: { $in: ['requested', 'paid'] } } }, { $group: { _id: '$status', amount: { $sum: '$amount' } } }]),
  ]);
  const r = (s: string) => refAgg.find((x: any) => x._id === s) || { n: 0, amount: 0 };
  const p = (s: string) => payAgg.find((x: any) => x._id === s)?.amount || 0;
  const earned = r('earned').amount;
  const paidOut = p('paid');
  const requested = p('requested');
  return {
    invited: refAgg.reduce((a: number, x: any) => a + x.n, 0),
    pending: r('pending').n,
    joined: r('joined').n,
    onHold: r('on_hold').n,
    onHoldAmount: r('on_hold').amount,
    earnedCount: r('earned').n,
    rejected: r('rejected').n,
    earned,
    paidOut,
    requested,
    available: Math.max(0, earned - paidOut - requested),
  };
}

function cleanDetails(d: any): IPayoutDetails {
  const method = d?.method === 'bank' ? 'bank' : d?.method === 'upi' ? 'upi' : null;
  if (!method) throw new ReferralError(400, 'METHOD', 'Choose UPI or bank account.');
  if (method === 'upi') {
    const upiId = String(d.upiId || '').trim();
    if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.]{1,63}$/.test(upiId)) throw new ReferralError(400, 'UPI', 'Enter a valid UPI ID, like name@okaxis.');
    return { method, upiId };
  }
  const holderName = String(d.holderName || '').trim().slice(0, 100);
  const accountNumber = String(d.accountNumber || '').replace(/\s/g, '');
  const ifsc = String(d.ifsc || '').trim().toUpperCase();
  const bankName = String(d.bankName || '').trim().slice(0, 100) || undefined;
  if (holderName.length < 2) throw new ReferralError(400, 'HOLDER', 'Enter the account holder name.');
  if (!/^\d{9,18}$/.test(accountNumber)) throw new ReferralError(400, 'ACCOUNT', 'The account number should be 9 to 18 digits.');
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) throw new ReferralError(400, 'IFSC', 'Enter a valid IFSC code, like SBIN0001234.');
  return { method, holderName, accountNumber, ifsc, bankName };
}

/** For screens: the account number shortened to its last 4 digits. */
export function maskDetails(d?: IPayoutDetails | null) {
  if (!d) return null;
  return d.method === 'bank' ? { ...d, accountNumber: d.accountNumber ? `••••${d.accountNumber.slice(-4)}` : '' } : { ...d };
}

export async function requestPayout(user: any, body: any) {
  const codeDoc: any = await ReferralCode.findOne({ userId: user._id }).lean();
  if (!codeDoc) throw new ReferralError(400, 'NO_CODE', 'You have no referral rewards yet.');
  const program = await getProgram(String(user.tenantId));
  const bal = await balanceOf(user._id);
  const amount = Math.round(Number(body.amount ?? bal.available));
  if (!Number.isFinite(amount) || amount <= 0) throw new ReferralError(400, 'AMOUNT', 'Enter the amount to withdraw.');
  if (amount > bal.available) throw new ReferralError(400, 'AMOUNT', `You can withdraw up to ${rupees(bal.available)}.`);
  if (amount < Math.min(program.minPayout, bal.available) || bal.available < 1) {
    throw new ReferralError(400, 'AMOUNT', `The smallest withdrawal is ${rupees(program.minPayout)}.`);
  }
  const details = cleanDetails(body.details || body);
  const name = nameOf(user);
  let payout: any;
  try {
    payout = await ReferralPayout.create({ tenantId: user.tenantId, referrerId: user._id, referrerName: name, amount, details, status: 'requested', openKey: String(user._id) });
  } catch (e: any) {
    if (e?.code === 11000) throw new ReferralError(409, 'OPEN_REQUEST', 'You already have a withdrawal waiting. You can ask again once it is paid.');
    throw e;
  }
  await ReferralCode.updateOne({ _id: codeDoc._id }, { $set: { payoutDetails: details } });
  // Tell the institute's admins there is money to send.
  User.find({ tenantId: user.tenantId, role: 'TENANT_ADMIN', isActive: { $ne: false } }).select('_id').limit(20).lean()
    .then((admins: any[]) => admins.length && createNotifications(user.tenantId, admins.map((a) => String(a._id)), 'general', '💸 Referral withdrawal requested', `${name} asked to withdraw ${rupees(amount)} (${details.method === 'upi' ? 'UPI' : 'bank'}).`, '/admin/referrals'))
    .catch(() => {});
  return payout;
}

export async function markPayoutPaid(tenantId: string, payoutId: string, body: any, by: { id: string; name: string }) {
  const reference = String(body.reference || '').trim().slice(0, 120);
  if (reference.length < 3) throw new ReferralError(400, 'REFERENCE', 'Enter the UPI / bank transaction reference.');
  const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
  if (Number.isNaN(paidAt.getTime())) throw new ReferralError(400, 'DATE', 'That date is not valid.');
  const p: any = await ReferralPayout.findOneAndUpdate(
    { _id: oid(payoutId), tenantId: oid(tenantId), status: 'requested' },
    { $set: { status: 'paid', reference, paidAt, paidBy: by.id ? oid(by.id) : undefined, paidByName: by.name }, $unset: { openKey: 1 } },
    { new: true },
  ).lean();
  if (!p) throw new ReferralError(404, 'NOT_OPEN', 'This withdrawal is not waiting any more.');
  notify(tenantId, String(p.referrerId), '✅ Referral payout sent', `${rupees(p.amount)} was sent to your ${p.details?.method === 'upi' ? 'UPI ID' : 'bank account'}. Reference: ${reference}.`);
  return p;
}

export async function rejectPayout(tenantId: string, payoutId: string, reason: string, by: { id: string; name: string }) {
  const why = String(reason || '').trim().slice(0, 300);
  if (why.length < 3) throw new ReferralError(400, 'REASON', 'Say why, so the student knows what to fix.');
  const p: any = await ReferralPayout.findOneAndUpdate(
    { _id: oid(payoutId), tenantId: oid(tenantId), status: 'requested' },
    { $set: { status: 'rejected', rejectedReason: why, paidBy: by.id ? oid(by.id) : undefined, paidByName: by.name }, $unset: { openKey: 1 } },
    { new: true },
  ).lean();
  if (!p) throw new ReferralError(404, 'NOT_OPEN', 'This withdrawal is not waiting any more.');
  notify(tenantId, String(p.referrerId), '⚠️ Withdrawal not sent', `Your withdrawal of ${rupees(p.amount)} was not sent: ${why}. The amount is back in your balance.`);
  return p;
}

/* ═══════════════════════════════ Admin decisions ═══════════════════════════════ */

export async function rejectReferral(tenantId: string, id: string, reason: string, by: { id: string; name: string }) {
  const why = String(reason || '').trim().slice(0, 300);
  if (why.length < 3) throw new ReferralError(400, 'REASON', 'Say why this referral does not count.');
  const ref: any = await Referral.findOne({ _id: oid(id), tenantId: oid(tenantId) }).lean();
  if (!ref) throw new ReferralError(404, 'NOT_FOUND', 'Referral not found.');
  if (ref.status === 'rejected') return ref;
  if (ref.status === 'earned') {
    const bal = await balanceOf(ref.referrerId);
    if (bal.available < (ref.rewardAmount || 0)) {
      throw new ReferralError(409, 'ALREADY_WITHDRAWN', 'This reward has already been withdrawn (or is being withdrawn), so it cannot be cancelled here.');
    }
  }
  const now = new Date();
  const res = await Referral.updateOne({ _id: ref._id, status: ref.status }, {
    $set: { status: 'rejected', rejectedAt: now, rejectedReason: why },
    $unset: { activeKey: 1 },
    $push: { history: { at: now, status: 'rejected', note: why, by: by.name } },
  });
  if (!res.modifiedCount) throw new ReferralError(409, 'CHANGED', 'This referral just changed. Refresh and try again.');
  notify(tenantId, String(ref.referrerId), 'Referral not counted', `Your referral of ${ref.friendName} does not count: ${why}.`);
  return Referral.findById(ref._id).lean();
}

export async function restoreReferral(tenantId: string, id: string, by: { id: string; name: string }) {
  const ref: any = await Referral.findOne({ _id: oid(id), tenantId: oid(tenantId) }).lean();
  if (!ref) throw new ReferralError(404, 'NOT_FOUND', 'Referral not found.');
  if (ref.status !== 'rejected') return ref;
  const now = new Date();
  try {
    await Referral.updateOne({ _id: ref._id, status: 'rejected' }, {
      $set: { status: 'pending', activeKey: ref.friendPhone },
      $unset: { rejectedAt: 1, rejectedReason: 1, qualifiedAt: 1, holdUntil: 1, earnedAt: 1 },
      $push: { history: { at: now, status: 'pending', note: 'Restored', by: by.name } },
    });
  } catch (e: any) {
    if (e?.code === 11000) throw new ReferralError(409, 'ALREADY_REFERRED', 'Another referral for this number is active, so this one cannot be restored.');
    throw e;
  }
  await syncReferral(ref._id);
  return Referral.findById(ref._id).lean();
}

/** Admin adds a referral by the referrer's code (walk-in, or the friend forgot the link). */
export async function adminAddReferral(tenantId: string, body: any, by: { id: string; name: string }) {
  const code = String(body.code || '').trim().toUpperCase();
  const codeDoc: any = code ? await ReferralCode.findOne({ code, tenantId: oid(tenantId) }).lean() : null;
  let referrer: any = codeDoc ? await User.findById(codeDoc.userId).lean() : null;
  if (!referrer && body.referrerId) referrer = await User.findOne({ _id: oid(body.referrerId), tenantId: oid(tenantId), role: 'STUDENT' }).lean();
  if (!referrer) throw new ReferralError(404, 'NO_REFERRER', 'No student has that referral code.');
  return createReferral({ referrer, name: body.name, phone: body.phone, email: body.email, course: body.course, via: 'admin', byAdmin: by });
}

/* ═══════════════════════════════ Public link ═══════════════════════════════ */

export async function publicCodeInfo(code: string) {
  const c = String(code || '').trim().toUpperCase();
  const codeDoc: any = /^[A-Z0-9]{4,12}$/.test(c) ? await ReferralCode.findOne({ code: c }).lean() : null;
  if (!codeDoc) throw new ReferralError(404, 'NO_CODE', 'This referral link is not valid. Check it with the friend who sent it.');
  const [user, tenant, program]: any[] = await Promise.all([
    User.findById(codeDoc.userId).select('firstName lastName tenantId isActive role').lean(),
    Tenant.findById(codeDoc.tenantId).select('name logo branding').lean(),
    getProgram(String(codeDoc.tenantId)),
  ]);
  const open = !!(program.enabled && user && user.isActive !== false && user.role === 'STUDENT');
  return {
    open,
    code: c,
    referrerFirstName: user?.firstName || 'Your friend',
    institute: { name: tenant?.branding?.portalTitle || tenant?.name || 'CodeBegun', logo: tenant?.logo || null },
    courses: program.courses,
    _referrer: user,
  };
}
