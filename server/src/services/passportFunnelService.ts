import mongoose from 'mongoose';
import User from '../models/User';
import { careerPilotMemberFilter } from './careerPilotPopulation';
import PassportAttempt from '../models/PassportAttempt';
import Payment from '../models/Payment';
import PassportProgress from '../models/PassportProgress';

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

/** Gone quiet, as milliseconds, so the pipeline can compare without a date helper. */
const QUIET_MS = QUIET_DAYS * 86_400_000;

/**
 * Most rows one call will return.
 *
 * Counts and totals are always exact — they come from a $group over the whole tenant, not
 * from these rows. This caps only the LIST, because a caller works a page of names, and a
 * response carrying ten thousand phone numbers is a payload nobody reads and a privacy
 * surface nobody asked for.
 */
export const MAX_FUNNEL_ROWS = 2000;

export interface FunnelOptions {
  /** Restrict the returned rows to one stage. Counts still cover every stage. */
  stage?: StageKey;
  limit?: number;
  skip?: number;
}

/**
 * The tenant, in the two shapes this join needs.
 *
 * User and Payment store `tenantId` as an ObjectId; PassportAttempt and PassportProgress
 * store it as a string. Mongoose used to hide that by casting per model — an aggregation
 * casts nothing, so each stage has to be handed the type its own collection actually
 * stores. Getting it wrong matches nothing and reads as "this member never paid" rather
 * than as an error, which is precisely why the integration suite exists.
 */
const tenantKeys = (tenantId: string) => ({
  asString: String(tenantId),
  asObjectId: mongoose.isValidObjectId(tenantId)
    ? new mongoose.Types.ObjectId(String(tenantId))
    : null,
});

/**
 * Classify every member into exactly one stage — in the database.
 *
 * WHY THIS IS A PIPELINE NOW. It used to load every member, then every attempt, payment and
 * progress row belonging to them, and join the four in memory: four unbounded reads and an
 * O(members) reduce per request, with each member's whole XP log scanned to find its newest
 * entry. At the current size that is fine, and the original said so. At the ten thousand
 * members this product is being launched for it is a slow request that gets slower every
 * month, on a screen an admin keeps open all day.
 *
 * THE CLASSIFICATION IS UNCHANGED. Same stages, same precedence, same quiet threshold, same
 * fallbacks for members who predate `verifiedAt`. It is written as a $switch instead of an
 * if-chain and returns the same answer for the same data — asserted member by member by the
 * integration suite that was written against the previous implementation and not touched.
 *
 * INDEXES IT LEANS ON: `users {tenantId}`, and `{tenantId, studentId}` on each of
 * passportattempts, payments and passportprogresses. All already exist — every one of those
 * collections is queried that way elsewhere.
 */
function classifyPipeline(tenantId: string, now: Date): any[] {
  const { asString, asObjectId } = tenantKeys(tenantId);
  if (!asObjectId) return [];      // an id no user can carry; the tenant is simply empty

  /** One member's newest submitted assessment. Its existence means they were scored. */
  const attemptLookup = {
    $lookup: {
      from: PassportAttempt.collection.name,
      let: { uid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$studentId', '$$uid'] }, tenantId: asString } },
        { $group: { _id: null, at: { $max: '$createdAt' } } },
      ],
      as: 'attempt',
    },
  };

  /**
   * Payments, reduced to the three facts the classification needs: whether any completed,
   * how many did and for how much — counted per ROW, as before, so a member who paid twice
   * contributes twice to the revenue line — and the newest one that did not.
   */
  const paymentLookup = {
    $lookup: {
      from: Payment.collection.name,
      let: { uid: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$studentId', '$$uid'] },
            tenantId: asObjectId,
            purpose: 'passport_membership',
          },
        },
        {
          $group: {
            _id: null,
            paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
            paidSum: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
            pending: {
              $push: {
                $cond: [
                  { $ne: ['$status', 'paid'] },
                  { at: '$createdAt', amount: '$amount' },
                  '$$REMOVE',
                ],
              },
            },
          },
        },
        {
          $project: {
            paidCount: 1,
            paidSum: 1,
            // The newest unpaid attempt: what they nearly paid, and when they walked away.
            pending: {
              $reduce: {
                input: '$pending',
                initialValue: null,
                in: {
                  $cond: [
                    { $or: [{ $eq: ['$$value', null] }, { $gt: ['$$this.at', '$$value.at'] }] },
                    '$$this',
                    '$$value',
                  ],
                },
              },
            },
          },
        },
      ],
      as: 'pay',
    },
  };

  /**
   * When this member last did anything.
   *
   * The newest of the progress row's own timestamp and every entry in its XP, completion
   * and practice logs — the same set the in-memory version reduced with Math.max.
   */
  const progressLookup = {
    $lookup: {
      from: PassportProgress.collection.name,
      let: { uid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$studentId', '$$uid'] }, tenantId: asString } },
        {
          $project: {
            at: {
              $max: {
                $concatArrays: [
                  [{ $ifNull: ['$updatedAt', null] }],
                  { $ifNull: [{ $map: { input: '$xpLog', in: '$$this.at' } }, []] },
                  { $ifNull: [{ $map: { input: '$completed', in: '$$this.at' } }, []] },
                  { $ifNull: [{ $map: { input: '$practice', in: '$$this.at' } }, []] },
                ],
              },
            },
          },
        },
        { $group: { _id: null, at: { $max: '$at' } } },
      ],
      as: 'activity',
    },
  };

  const facts = {
    $addFields: {
      p: { $ifNull: ['$passport', {}] },
      scoredAt: { $arrayElemAt: ['$attempt.at', 0] },
      paidCount: { $ifNull: [{ $arrayElemAt: ['$pay.paidCount', 0] }, 0] },
      paidSum: { $ifNull: [{ $arrayElemAt: ['$pay.paidSum', 0] }, 0] },
      pendingAt: { $arrayElemAt: ['$pay.pending.at', 0] },
      pendingAmount: { $arrayElemAt: ['$pay.pending.amount', 0] },
      lastActivity: { $arrayElemAt: ['$activity.at', 0] },
    },
  };

  /** membershipActive(): flagged active AND not past expiry. */
  const membership = {
    $addFields: {
      live: {
        $and: [
          { $eq: ['$p.active', true] },
          {
            $or: [
              { $eq: [{ $ifNull: ['$p.expiresAt', null] }, null] },
              { $gte: ['$p.expiresAt', now] },
            ],
          },
        ],
      },
      // For a live member: the newest of activity, lastSeenAt, activatedAt, joined.
      seen: {
        $ifNull: [
          '$lastActivity',
          { $ifNull: ['$p.lastSeenAt', { $ifNull: ['$p.activatedAt', '$createdAt'] }] },
        ],
      },
    },
  };

  /** True when this member has been scored, either by an attempt row or a stored score. */
  const wasScored = {
    $or: [
      { $ne: [{ $ifNull: ['$scoredAt', null] }, null] },
      { $ne: [{ $ifNull: ['$p.careerScore', null] }, null] },
    ],
  };

  /** True when they demonstrably got past the OTP, however old their account is. */
  const wasVerified = {
    $or: [
      { $ne: [{ $ifNull: ['$p.verifiedAt', null] }, null] },
      { $eq: ['$p.passwordSet', true] },
      { $ne: [{ $ifNull: ['$p.lastSeenAt', null] }, null] },
    ],
  };

  const hasPending = { $ne: [{ $ifNull: ['$pendingAt', null] }, null] };
  const hasPaid = { $gt: ['$paidCount', 0] };

  /**
   * The stage, in the same order of investment the if-chain used: a live membership beats a
   * completed payment, which beats an abandoned checkout, which beats a score, which beats
   * mere verification.
   */
  const stage = {
    $addFields: {
      stage: {
        $switch: {
          branches: [
            {
              case: '$live',
              then: { $cond: [{ $gte: [{ $subtract: [now, '$seen'] }, QUIET_MS] }, 'quiet', 'active'] },
            },
            { case: hasPaid, then: 'expired' },
            { case: hasPending, then: 'checkout_abandoned' },
            { case: wasScored, then: 'scored_unpaid' },
            { case: wasVerified, then: 'no_assessment' },
          ],
          default: 'unverified',
        },
      },
    },
  };

  /** The date each stage measures staleness from — again, exactly as before. */
  const lastTouch = {
    $addFields: {
      lastTouch: {
        $switch: {
          branches: [
            { case: '$live', then: '$seen' },
            {
              case: hasPaid,
              then: { $ifNull: ['$p.expiresAt', { $ifNull: ['$p.activatedAt', '$createdAt'] }] },
            },
            { case: hasPending, then: '$pendingAt' },
            {
              case: wasScored,
              then: { $ifNull: ['$scoredAt', { $ifNull: ['$p.lastSeenAt', '$createdAt'] }] },
            },
            {
              case: wasVerified,
              then: { $ifNull: ['$p.lastSeenAt', { $ifNull: ['$p.verifiedAt', '$createdAt'] }] },
            },
          ],
          default: '$createdAt',
        },
      },
    },
  };

  return [
    // Real CareerPilot members only. `passport: { $exists: true }` counted every LMS
    // student, because the nested defaults materialise the subdocument on every user.
    { $match: { tenantId: asObjectId, ...careerPilotMemberFilter() } },
    attemptLookup, paymentLookup, progressLookup,
    facts, membership, stage, lastTouch,
  ];
}

const shapeRow = (d: any, now: number): FunnelRow => {
  const p = d.p || {};
  const last = d.lastTouch || d.createdAt;
  return {
    id: String(d._id),
    name: `${d.firstName || ''} ${d.lastName === '-' ? '' : (d.lastName || '')}`.trim() || '(no name)',
    email: d.email || '',
    phone: d.phone || '',
    stage: d.stage,
    stuckDays: days(last, now),
    joinedAt: d.createdAt,
    lastTouch: last,
    careerScore: p.careerScore ?? null,
    pathway: p.pathway ?? null,
    ...(d.stage === 'checkout_abandoned'
      ? { pendingAmountInr: Math.round((d.pendingAmount || 0) / 100) }
      : {}),
  };
};

/**
 * Classify every member into exactly one stage, and count them.
 *
 * Counts and totals are exact and cover the whole tenant. The row LIST is capped — see
 * MAX_FUNNEL_ROWS — and can be narrowed to one stage, because that is what a caller working
 * through a page of names actually needs.
 */
export async function buildFunnel(tenantId: string, opts: FunnelOptions = {}): Promise<{
  rows: FunnelRow[];
  counts: Record<StageKey, number>;
  totals: { members: number; paid: number; revenueInr: number; unverifiedShare: number };
}> {
  const now = new Date();
  const nowMs = now.getTime();
  const base = classifyPipeline(tenantId, now);

  const counts = STAGES.reduce((o, s) => ({ ...o, [s.key]: 0 }), {} as Record<StageKey, number>);
  if (!base.length) {
    return { rows: [], counts, totals: { members: 0, paid: 0, revenueInr: 0, unverifiedShare: 0 } };
  }

  const limit = Math.min(MAX_FUNNEL_ROWS, Math.max(1, opts.limit ?? MAX_FUNNEL_ROWS));
  const skip = Math.max(0, opts.skip ?? 0);

  /**
   * One pass, two answers.
   *
   * $facet runs the count and the page over the same classified set, so the list a caller
   * pages through and the totals above it can never disagree — which two separate round
   * trips would eventually allow.
   */
  const [result] = await User.aggregate([
    ...base,
    {
      $facet: {
        counts: [{ $group: { _id: '$stage', n: { $sum: 1 } } }],
        money: [
          {
            $group: {
              _id: null,
              // Per payment ROW, as before: two payments by one member are two rows here.
              paid: { $sum: '$paidCount' },
              revenuePaise: { $sum: '$paidSum' },
            },
          },
        ],
        rows: [
          ...(opts.stage ? [{ $match: { stage: opts.stage } }] : []),
          // Coldest first. Sorted newest-first, a caller works the same fresh names every
          // morning and nobody ever rings the person who has been stuck for a month.
          { $sort: { lastTouch: 1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              firstName: 1, lastName: 1, email: 1, phone: 1, createdAt: 1,
              stage: 1, lastTouch: 1, pendingAmount: 1,
              'p.careerScore': 1, 'p.pathway': 1,
            },
          },
        ],
      },
    },
  ]).allowDiskUse(true);

  for (const c of result?.counts || []) {
    if (c._id in counts) counts[c._id as StageKey] = c.n;
  }
  const money = result?.money?.[0] || { paid: 0, revenuePaise: 0 };
  const members = Object.values(counts).reduce((a: number, b: number) => a + b, 0);

  return {
    rows: (result?.rows || []).map((d: any) => shapeRow(d, nowMs)),
    counts,
    totals: {
      members,
      paid: money.paid || 0,
      revenueInr: Math.round((money.revenuePaise || 0) / 100),
      unverifiedShare: members ? Math.round((counts.unverified / members) * 100) : 0,
    },
  };
}

/** Counts and totals only — the board itself needs no member list at all. */
export async function funnelCounts(tenantId: string) {
  const { counts, totals } = await buildFunnel(tenantId, { limit: 1 });
  return { counts, totals };
}
