import User from '../models/User';
import PassportAttempt from '../models/PassportAttempt';
import Payment from '../models/Payment';
import PassportProgress from '../models/PassportProgress';
import { membershipActive } from './passportEntitlementService';

/**
 * Where every member stopped, and what to do about it.
 *
 * A member sits in exactly ONE stage — the furthest point they reached — because the
 * question this answers is "who do I call today", and a person who appears in four
 * buckets gets called four times.
 *
 * The stages are ordered by how much the person has already invested. Someone who opened
 * the payment sheet and walked away is a warmer call than someone who never finished
 * their OTP, and the screen sorts on that rather than on volume.
 */

export type StageKey =
  | 'unverified' | 'no_assessment'
  | 'scored_unpaid' | 'checkout_abandoned' | 'active' | 'quiet' | 'expired';

/**
 * NOT A STAGE: "started the assessment but did not finish".
 *
 * A PassportAttempt is written only on SUBMIT — it is the result, not a session — so a
 * half-finished assessment leaves no server-side trace and cannot be counted. Adding a
 * bucket for it would mean showing a number that is always zero. If that cohort matters
 * commercially, the assessment needs to persist progress as it goes.
 */

export interface StageDef {
  key: StageKey;
  label: string;
  /** What actually happened, in the member's terms. */
  meaning: string;
  /** The one thing worth saying to them. */
  action: string;
  /** Ranked by how close the person is to paying — 1 is hottest. */
  heat: number;
}

export const STAGES: StageDef[] = [
  { key: 'checkout_abandoned', heat: 1,
    label: 'Opened checkout, did not pay',
    meaning: 'They reached Razorpay and stopped. They had their card out.',
    action: 'Call the same day. Ask what stopped them — price, or the payment failed.' },
  { key: 'scored_unpaid', heat: 2,
    label: 'Got their score, never bought',
    meaning: 'They finished the free assessment and saw their result. They know the gap.',
    action: 'Lead with their score and what the paid roadmap fixes. The biggest pool.' },
  { key: 'no_assessment', heat: 3,
    label: 'Verified, never started',
    meaning: 'They own the account but have not taken the free assessment.',
    action: 'Remind them the assessment is free and takes 10 minutes.' },
  { key: 'unverified', heat: 4,
    label: 'Never finished signing up',
    meaning: 'They filled the form but never entered the OTP. The account is a shell.',
    action: 'Check the number is real. Often a typo, or WhatsApp never arrived.' },
  { key: 'quiet', heat: 5,
    label: 'Paid, then went quiet',
    meaning: 'A paying member with no activity for 14+ days. This is churn forming.',
    action: 'Re-engage before renewal. They are the easiest revenue to lose.' },
  { key: 'expired', heat: 6,
    label: 'Membership expired',
    meaning: 'They paid once and the year ran out.',
    action: 'Renewal offer, with what they achieved last year.' },
  { key: 'active', heat: 7,
    label: 'Paid and active',
    meaning: 'Nothing to do. Here so the numbers add up.',
    action: 'Leave them alone.' },
];

/** No activity for this many days counts as "gone quiet". */
const QUIET_DAYS = 14;

export interface FunnelRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  stage: StageKey;
  /** Days since the last thing they did — how cold the lead is. */
  stuckDays: number;
  joinedAt: Date;
  lastTouch: Date;
  careerScore?: number | null;
  pathway?: string | null;
  /** Present only for checkout_abandoned: what they nearly paid. */
  pendingAmountInr?: number;
}

const days = (from: Date | null | undefined, now: number) =>
  from ? Math.max(0, Math.floor((now - new Date(from).getTime()) / 86400000)) : 0;

/**
 * Classify every CareerPilot member into exactly one stage.
 *
 * Everything is loaded per collection and joined in memory rather than per-member
 * queries: at 39 members either works, at 100,000 the per-member version is 400,000
 * round trips.
 */
export async function buildFunnel(tenantId: string): Promise<{
  rows: FunnelRow[];
  counts: Record<StageKey, number>;
  totals: { members: number; paid: number; revenueInr: number; unverifiedShare: number };
}> {
  const now = Date.now();

  const users: any[] = await User.find({ tenantId, passport: { $exists: true, $ne: null } })
    .select('firstName lastName email phone createdAt passport').lean();

  const ids = users.map(u => u._id);

  const [attempts, payments, progresses] = await Promise.all([
    // Written on submit, so its existence means the assessment was COMPLETED.
    PassportAttempt.find({ tenantId, studentId: { $in: ids } })
      .select('studentId createdAt careerScore').lean(),
    Payment.find({ tenantId, studentId: { $in: ids }, purpose: 'passport_membership' })
      .select('studentId status amount createdAt').lean(),
    PassportProgress.find({ tenantId, studentId: { $in: ids } })
      .select('studentId updatedAt xpLog completed practice').lean(),
  ]);

  /** When each member last COMPLETED an assessment. */
  const scoredAt = new Map<string, Date>();
  for (const a of attempts as any[]) {
    const k = String(a.studentId);
    const prev = scoredAt.get(k);
    if (!prev || +new Date(a.createdAt) > +new Date(prev)) scoredAt.set(k, a.createdAt);
  }

  const payOf = new Map<string, { paid: boolean; lastCreated: Date | null; amount: number }>();
  for (const p of payments as any[]) {
    const k = String(p.studentId);
    const cur = payOf.get(k) || { paid: false, lastCreated: null, amount: 0 };
    if (p.status === 'paid') cur.paid = true;
    else if (!cur.lastCreated || +new Date(p.createdAt) > +new Date(cur.lastCreated)) {
      cur.lastCreated = p.createdAt;
      cur.amount = Math.round((p.amount || 0) / 100);
    }
    payOf.set(k, cur);
  }

  const activityOf = new Map<string, Date>();
  for (const g of progresses as any[]) {
    const stamps = [
      g.updatedAt,
      ...(g.xpLog || []).map((x: any) => x.at),
      ...(g.completed || []).map((x: any) => x.at),
      ...(g.practice || []).map((x: any) => x.at),
    ].filter(Boolean).map((d: any) => +new Date(d));
    if (stamps.length) activityOf.set(String(g.studentId), new Date(Math.max(...stamps)));
  }

  const rows: FunnelRow[] = users.map(u => {
    const k = String(u._id);
    const p = u.passport || {};
    const scored = scoredAt.get(k);
    const pay = payOf.get(k);
    const lastActivity = activityOf.get(k) || null;

    // Ordered by investment: the furthest point reached wins.
    let stage: StageKey;
    let lastTouch: Date = u.createdAt;

    if (membershipActive(p)) {
      const seen = lastActivity || p.lastSeenAt || p.activatedAt || u.createdAt;
      stage = days(seen, now) >= QUIET_DAYS ? 'quiet' : 'active';
      lastTouch = seen;
    } else if (pay?.paid) {
      // Paid at some point, but the membership is no longer active.
      stage = 'expired';
      lastTouch = p.expiresAt || p.activatedAt || u.createdAt;
    } else if (pay?.lastCreated) {
      stage = 'checkout_abandoned';
      lastTouch = pay.lastCreated;
    } else if (scored || p.careerScore != null) {
      stage = 'scored_unpaid';
      lastTouch = scored || p.lastSeenAt || u.createdAt;
    } else if (p.verifiedAt || p.passwordSet || p.lastSeenAt) {
      // verifiedAt only exists from the day it shipped, so passwordSet and lastSeenAt
      // stand in for anyone older who demonstrably got past the OTP.
      stage = 'no_assessment';
      lastTouch = p.lastSeenAt || p.verifiedAt || u.createdAt;
    } else {
      stage = 'unverified';
      lastTouch = u.createdAt;
    }

    return {
      id: k,
      name: `${u.firstName || ''} ${u.lastName === '-' ? '' : (u.lastName || '')}`.trim() || '(no name)',
      email: u.email || '',
      phone: u.phone || '',
      stage,
      stuckDays: days(lastTouch, now),
      joinedAt: u.createdAt,
      lastTouch,
      careerScore: p.careerScore ?? null,
      pathway: p.pathway ?? null,
      ...(stage === 'checkout_abandoned' ? { pendingAmountInr: pay?.amount || 0 } : {}),
    };
  });

  const counts = STAGES.reduce((o, s) => ({ ...o, [s.key]: 0 }), {} as Record<StageKey, number>);
  rows.forEach(r => { counts[r.stage]++; });

  const paidRows = payments.filter((p: any) => p.status === 'paid');
  return {
    rows,
    counts,
    totals: {
      members: rows.length,
      paid: paidRows.length,
      revenueInr: Math.round(paidRows.reduce((s: number, p: any) => s + (p.amount || 0), 0) / 100),
      unverifiedShare: rows.length ? Math.round((counts.unverified / rows.length) * 100) : 0,
    },
  };
}
