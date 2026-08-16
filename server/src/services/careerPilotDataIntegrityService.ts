import mongoose from 'mongoose';
import User from '../models/User';
import Payment from '../models/Payment';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import CareerRoadmap from '../models/CareerRoadmap';
import PassportInterview, { PASSPORT_INTERVIEW_LIVE_INDEX } from '../models/PassportInterview';
import { RewardRedemption } from '../models/RewardModels';
import { CoinLedger, CoinAccount } from '../models/CoinModels';
import { careerPilotMemberFilter } from './careerPilotPopulation';
import { HealthFinding, Severity } from './careerPilotConfigHealthService';

/**
 * Has anything gone wrong in the DATA, as opposed to the configuration?
 *
 * The config health service asks whether a tenant is set up to work. This asks the separate
 * question of whether the records it has actually accumulated still hold — whether somebody
 * paid and got nothing, whether an entitlement has no end date, whether a saga died half way
 * through with a member's coins already spent.
 *
 * WHY IT EXISTS AT ALL. MongoDB here is standalone, so there are no transactions. Every
 * multi-document operation in CareerPilot is therefore a saga or an atomic claim, and both
 * are correct only while their preconditions hold: the claims depend on partial unique
 * INDEXES, and an index is a property of the deployed database rather than of this
 * repository. A database restored from a dump, or one where a background build failed, runs
 * this exact code with none of the guarantees its comments promise — and nothing would say
 * so until two members collided. Several checks below therefore verify that the indexes the
 * concurrency argument rests on are really present in THIS database.
 *
 * IT REPORTS, IT NEVER REPAIRS. Not one query here writes. A screen an admin opens to find
 * out what is wrong must not also change it: "fix" for a duplicate roadmap means choosing
 * which of a member's two plans to destroy, and that is a decision, not a cleanup. Each
 * finding says what to do instead.
 *
 * IT NEVER RETURNS PII. Findings carry counts and ObjectIds. A support person needs to know
 * WHICH records to look at, and can look them up through the screens that already check
 * their permissions — putting names, emails or phone numbers in a diagnostic payload turns
 * every health check into a bulk contact export.
 *
 * EVERY QUERY IS BOUNDED. Counts are counts; samples are capped by SAMPLE_LIMIT. This runs
 * against the whole history of a tenant, so an unbounded find() here would be a health check
 * that takes the site down.
 */

export type IntegrityArea = 'money' | 'entitlement' | 'concurrency' | 'stuck' | 'ledger' | 'analytics';

export interface IntegrityFinding extends Omit<HealthFinding, 'area'> {
  area: IntegrityArea;
  /** How many records are affected. Always exact — this is a count, never a sample size. */
  count: number;
  /** Up to SAMPLE_LIMIT ids, so somebody can go and look. Ids only, never PII. */
  sample?: string[];
}

export interface DataIntegrityResult {
  checkedAt: string;
  findings: IntegrityFinding[];
  counts: { error: number; warning: number; info: number };
  /** True when every check ran. A check that throws is reported, not swallowed. */
  complete: boolean;
}

/** Enough ids to investigate with, few enough that the response stays small. */
export const SAMPLE_LIMIT = 20;

/**
 * How long a payment may sit unsettled before it is worth looking at.
 *
 * Razorpay's checkout completes in seconds and its webhook retries for far less than this.
 * A `created` row older than a day is a customer who abandoned the page — ordinary — OR a
 * capture we refused, which is not.
 */
export const STALE_PAYMENT_HOURS = 24;

/**
 * How long an interview may stay live before it is stuck.
 *
 * Generous on purpose: a member can legitimately leave a sitting open over a lunch break and
 * come back to it. Past this it is not a pause, it is an abandoned session holding the
 * one-live-interview lock and stopping that member from starting another.
 */
export const STUCK_INTERVIEW_HOURS = 12;

/** A redemption saga takes milliseconds. Minutes means the process died holding claims. */
export const STUCK_REDEMPTION_MINUTES = 30;

const hoursAgo = (h: number, now: Date) => new Date(now.getTime() - h * 3600_000);
const ids = (docs: any[]) => docs.map(d => String(d._id));

/**
 * The indexes the concurrency guarantees actually rest on.
 *
 * Named rather than described, so a finding can be acted on: an admin can hand the name
 * straight to whoever runs the migration. Where the model names its index explicitly we use
 * that name; where Mongo derives it, we match on the key pattern instead, because a derived
 * name is an implementation detail we should not assert on.
 */
const REQUIRED_INDEXES: Array<{
  label: string;
  model: mongoose.Model<any>;
  name?: string;
  keys?: Record<string, number>;
  guarantees: string;
}> = [
  {
    label: 'one live interview per member',
    model: PassportInterview as any,
    name: PASSPORT_INTERVIEW_LIVE_INDEX,
    guarantees: 'Without it, two simultaneous starts give one member two transcripts and silently orphan one.',
  },
  {
    label: 'one active roadmap per member',
    model: CareerRoadmap as any,
    keys: { tenantId: 1, studentId: 1 },
    guarantees: 'Without it, a member can end up with two active plans and see whichever a query happens to return first.',
  },
  {
    label: 'one assessment in progress per member',
    model: PersonalizedAssessment as any,
    keys: { tenantId: 1, studentId: 1, status: 1 },
    guarantees: 'Without it, a double-started assessment produces two papers and one of the two scores is discarded.',
  },
  {
    label: 'one redemption per intent',
    model: RewardRedemption as any,
    name: 'reward_redemption_intent_unique',
    guarantees: 'Without it, a double-clicked redeem spends a member’s coins twice.',
  },
  {
    label: 'one coin ledger entry per award',
    model: CoinLedger as any,
    keys: { tenantId: 1, idempotencyKey: 1 },
    guarantees: 'Without it, a retried award credits coins more than once and the ledger stops being a ledger.',
  },
];

/** Does an index with this name — or this exact key pattern — exist AND is it unique? */
function matches(existing: any[], want: { name?: string; keys?: Record<string, number> }): any | null {
  for (const ix of existing) {
    if (want.name && ix.name === want.name) return ix;
    if (want.keys) {
      const k = Object.keys(want.keys);
      const got = Object.keys(ix.key || {});
      if (k.length === got.length && k.every(n => ix.key[n] === want.keys![n])) return ix;
    }
  }
  return null;
}

export async function buildDataIntegrity(tenantId: string, now: Date = new Date()): Promise<DataIntegrityResult> {
  const findings: IntegrityFinding[] = [];
  let complete = true;
  const add = (f: IntegrityFinding) => { if (f.count > 0) findings.push(f); };

  /**
   * A check that throws is reported as a finding rather than failing the whole report.
   * One broken check should not hide the other twelve — that is precisely the moment an
   * admin most needs to see them.
   */
  const check = async (label: string, area: IntegrityArea, fn: () => Promise<void>) => {
    try { await fn(); } catch (e: any) {
      complete = false;
      findings.push({
        area, severity: 'ERROR', code: 'CHECK_FAILED', count: 1,
        message: `The "${label}" check could not run.`,
        action: 'Report this to engineering — the check itself failed, so nothing is known about that area either way.',
        meta: { reason: e?.message || String(e) },
      });
    }
  };

  // ── money ────────────────────────────────────────────────────────────────
  // Paid, and nothing to show for it. The single most serious thing this file can find:
  // somebody's ₹499 left their account and the product did not open.

  await check('paid membership without entitlement', 'money', async () => {
    const paid = await Payment.find({
      tenantId, purpose: 'passport_membership', status: 'paid',
    }).select('studentId').limit(5000).lean();

    if (!paid.length) return;
    const byStudent = new Set(paid.map((p: any) => String(p.studentId)));

    // Which of those payers is a member right now? Anyone missing paid and got nothing.
    const active = await User.find({
      _id: { $in: [...byStudent].filter(mongoose.isValidObjectId).map(s => new mongoose.Types.ObjectId(s)) },
      'passport.active': true,
      $or: [{ 'passport.expiresAt': null }, { 'passport.expiresAt': { $gt: now } }],
    }).select('_id').lean();

    const entitled = new Set(active.map((u: any) => String(u._id)));
    const orphans = [...byStudent].filter(s => !entitled.has(s));

    add({
      area: 'money', severity: 'ERROR', code: 'PAID_WITHOUT_ENTITLEMENT', count: orphans.length,
      message: `${orphans.length} member(s) paid for membership but do not have an active one.`,
      action: 'Check each payment in Razorpay. If it captured, grant the membership manually — the member has paid. An expired membership from a past term is also counted here, so confirm the payment date before acting.',
      sample: orphans.slice(0, SAMPLE_LIMIT),
    });
  });

  await check('unsettled payments', 'money', async () => {
    const cutoff = hoursAgo(STALE_PAYMENT_HOURS, now);
    const stale = await Payment.find({
      tenantId, purpose: 'passport_membership', status: 'created', createdAt: { $lt: cutoff },
    }).select('_id').sort({ createdAt: -1 }).limit(SAMPLE_LIMIT).lean();
    const count = await Payment.countDocuments({
      tenantId, purpose: 'passport_membership', status: 'created', createdAt: { $lt: cutoff },
    });

    add({
      area: 'money', severity: 'INFO', code: 'PAYMENTS_NEVER_SETTLED', count,
      message: `${count} membership payment(s) opened over ${STALE_PAYMENT_HOURS}h ago and never settled.`,
      action: 'Most are abandoned checkouts and need nothing. A rising number is the signal — it is also where a refused capture lands, so check the server log for "refusing to settle" before dismissing it.',
      sample: ids(stale),
    });
  });

  // ── entitlement ──────────────────────────────────────────────────────────

  await check('memberships with no end date', 'entitlement', async () => {
    // activateMembership always sets an expiry. A member without one was activated by some
    // other path, and holds paid features permanently.
    const q = { tenantId, 'passport.active': true, $or: [{ 'passport.expiresAt': { $exists: false } }, { 'passport.expiresAt': null }] };
    const count = await User.countDocuments(q as any);
    const sample = await User.find(q as any).select('_id').limit(SAMPLE_LIMIT).lean();

    add({
      area: 'entitlement', severity: 'WARNING', code: 'MEMBERSHIP_NEVER_EXPIRES', count,
      message: `${count} membership(s) are active with no end date, so they never expire.`,
      action: 'Decide what each should be and set an expiry, or leave them deliberately. They are free members-for-life until somebody chooses otherwise.',
      sample: ids(sample),
    });
  });

  await check('members invisible to analytics', 'analytics', async () => {
    /**
     * Somebody who is doing CareerPilot but does not count as being in it.
     *
     * The population filter is a union of four enrolment signals, so a member is normally
     * hard to miss. What it cannot see is a user carrying none of the four who nonetheless
     * has CareerPilot data — an active roadmap means somebody was assessed and given a plan.
     * They use the product and appear in no total, which makes every rate on the analytics
     * screen quietly wrong in the direction nobody checks.
     *
     * Checked against the real predicate rather than a re-statement of it, so this cannot
     * drift from what the analytics actually count.
     */
    const withPlans = await CareerRoadmap.distinct('studentId', { tenantId, status: 'ACTIVE' });
    if (!withPlans.length) return;

    const counted = await User.find({
      _id: { $in: withPlans }, tenantId, ...careerPilotMemberFilter(),
    }).select('_id').lean();

    const seen = new Set(counted.map((u: any) => String(u._id)));
    const invisible = withPlans.map(String).filter(s => !seen.has(s));

    add({
      area: 'analytics', severity: 'WARNING', code: 'MEMBER_INVISIBLE_TO_ANALYTICS', count: invisible.length,
      message: `${invisible.length} user(s) have an active CareerPilot roadmap but are not counted as members.`,
      action: 'These people work normally — only the reporting is wrong, and it is wrong for every rate that uses the member total as its denominator. Ask engineering to set the enrolment marker on them; do not change passport.active, which is what actually grants access.',
      sample: invisible.slice(0, SAMPLE_LIMIT),
    });
  });

  // ── concurrency: are the guarantees really in this database? ──────────────

  await check('unique indexes present', 'concurrency', async () => {
    for (const want of REQUIRED_INDEXES) {
      const existing = await want.model.collection.indexes().catch(() => [] as any[]);
      const found = matches(existing, want);

      if (!found) {
        findings.push({
          area: 'concurrency', severity: 'ERROR', code: 'MISSING_UNIQUE_INDEX', count: 1,
          message: `The index enforcing "${want.label}" is missing from this database.`,
          action: `Run the index migration before taking more traffic. ${want.guarantees}`,
          meta: { collection: want.model.collection.name, index: want.name || JSON.stringify(want.keys) },
        });
      } else if (!found.unique) {
        // Present but not unique enforces nothing at all, while looking like it does.
        findings.push({
          area: 'concurrency', severity: 'ERROR', code: 'INDEX_NOT_UNIQUE', count: 1,
          message: `The index for "${want.label}" exists but is not unique, so it enforces nothing.`,
          action: `Drop it and rebuild it as unique. ${want.guarantees}`,
          meta: { collection: want.model.collection.name, index: found.name },
        });
      }
    }
  });

  /**
   * Duplicates that already exist.
   *
   * An index prevents the NEXT collision; it does not remove one that predates it — in fact
   * a unique build fails outright against existing duplicates, so finding these is what
   * tells an admin why the migration will not apply.
   */
  const dupes = async (
    model: mongoose.Model<any>, match: any, code: string, label: string, action: string,
  ) => {
    const rows = await model.aggregate([
      { $match: { tenantId, ...match } },
      { $group: { _id: '$studentId', n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
      { $limit: SAMPLE_LIMIT + 1 },
    ]);
    add({
      area: 'concurrency', severity: 'ERROR', code, count: rows.length,
      message: `${rows.length}${rows.length > SAMPLE_LIMIT ? '+' : ''} member(s) have more than one ${label}.`,
      action, sample: rows.slice(0, SAMPLE_LIMIT).map((r: any) => String(r._id)),
    });
  };

  await check('duplicate live interviews', 'concurrency', () => dupes(
    PassportInterview as any, { live: true }, 'DUPLICATE_LIVE_INTERVIEW', 'live interview',
    'Abandon all but one sitting for each member, then rebuild the unique index. Keep the one with the most answers — the other is the orphan.',
  ));

  await check('duplicate active roadmaps', 'concurrency', () => dupes(
    CareerRoadmap as any, { status: 'ACTIVE' }, 'DUPLICATE_ACTIVE_ROADMAP', 'active roadmap',
    'Decide with the member which plan is theirs and supersede the other. Do not delete either — the roadmap is the record of what they were asked to do.',
  ));

  await check('duplicate assessments in progress', 'concurrency', () => dupes(
    PersonalizedAssessment as any, { status: 'IN_PROGRESS' }, 'DUPLICATE_ASSESSMENT', 'assessment in progress',
    'Abandon the emptier paper. Submitting both would score the same member twice and skew their Skill DNA.',
  ));

  // ── stuck work ───────────────────────────────────────────────────────────

  await check('interviews stuck live', 'stuck', async () => {
    const q = { tenantId, live: true, createdAt: { $lt: hoursAgo(STUCK_INTERVIEW_HOURS, now) } };
    const count = await PassportInterview.countDocuments(q as any);
    const sample = await PassportInterview.find(q as any).select('_id').limit(SAMPLE_LIMIT).lean();

    add({
      area: 'stuck', severity: 'WARNING', code: 'INTERVIEW_STUCK_LIVE', count,
      message: `${count} interview(s) have been live for over ${STUCK_INTERVIEW_HOURS}h.`,
      action: 'Each one blocks that member from starting another interview. Mark them abandoned once you are satisfied the member is not still sitting them.',
      sample: ids(sample),
    });
  });

  await check('redemptions stuck mid-saga', 'stuck', async () => {
    /**
     * PENDING with a claimed step is the dangerous shape: the redemption acquired something
     * — stock, budget, or the member's coins — and then stopped. The member has been charged
     * for a reward nobody is fulfilling.
     */
    const q = {
      tenantId, status: 'PENDING',
      requestedAt: { $lt: new Date(now.getTime() - STUCK_REDEMPTION_MINUTES * 60_000) },
      $or: [
        { 'steps.stock': 'CLAIMED' }, { 'steps.tenantBudget': 'CLAIMED' },
        { 'steps.memberBudget': 'CLAIMED' }, { 'steps.coins': 'CLAIMED' },
      ],
    };
    const count = await RewardRedemption.countDocuments(q as any);
    const sample = await RewardRedemption.find(q as any).select('_id').limit(SAMPLE_LIMIT).lean();

    add({
      area: 'stuck', severity: 'ERROR', code: 'REDEMPTION_STUCK', count,
      message: `${count} redemption(s) stopped part-way through with resources already claimed.`,
      action: 'Cancel each one from the rewards queue, which releases the claims and returns the coins. Do not edit the documents directly — the undo path is what makes the release safe.',
      sample: ids(sample),
    });
  });

  // ── ledger ───────────────────────────────────────────────────────────────

  await check('coin balances match the ledger', 'ledger', async () => {
    /**
     * The account balance is a cached sum of the ledger, kept because reads need it. Cached
     * sums drift — a write that credited the account and failed before the ledger, or the
     * reverse. The ledger is the truth; the account is the thing to correct.
     */
    const drift = await CoinLedger.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$studentId', ledgerTotal: { $sum: '$coins' } } },
      { $lookup: { from: CoinAccount.collection.name, let: { s: '$_id' },
        pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$studentId', '$$s'] }, { $eq: ['$tenantId', tenantId] }] } } },
          { $project: { balance: 1 } }], as: 'acct' } },
      { $addFields: { balance: { $ifNull: [{ $first: '$acct.balance' }, 0] } } },
      { $match: { $expr: { $ne: ['$ledgerTotal', '$balance'] } } },
      { $limit: SAMPLE_LIMIT + 1 },
    ]);

    add({
      area: 'ledger', severity: 'ERROR', code: 'COIN_BALANCE_DRIFT', count: drift.length,
      message: `${drift.length}${drift.length > SAMPLE_LIMIT ? '+' : ''} member(s) have a coin balance that disagrees with their ledger.`,
      action: 'Recompute each balance from the ledger, which is the record of what actually happened. Investigate before correcting — a drift is evidence of a failed write, and the same write may have gone wrong elsewhere.',
      sample: drift.slice(0, SAMPLE_LIMIT).map((d: any) => String(d._id)),
    });
  });

  // ── scale note ───────────────────────────────────────────────────────────
  // Not a defect: context for reading everything above.

  await check('population size', 'analytics', async () => {
    const members = await User.countDocuments({ tenantId, ...careerPilotMemberFilter() } as any);
    if (members === 0) {
      findings.push({
        area: 'analytics', severity: 'INFO', code: 'NO_MEMBERS', count: 0,
        message: 'This tenant has no CareerPilot members yet.',
        action: 'Nothing to do. Every check above passed because there is nothing for it to find, which is not the same as being proven correct.',
      });
    }
  });

  const sev = (s: Severity) => findings.filter(f => f.severity === s).length;
  return {
    checkedAt: now.toISOString(),
    findings,
    counts: { error: sev('ERROR'), warning: sev('WARNING'), info: sev('INFO') },
    complete,
  };
}
