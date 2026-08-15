import mongoose from 'mongoose';
import PassportProgress from '../models/PassportProgress';
import User from '../models/User';
import Tenant from '../models/Tenant';
import { XpLedger, GamificationConfig } from '../models/GamificationModels';
import {
  LeaderboardScope, LeaderboardPeriod, isScopeSupported, SCOPE_UNAVAILABLE_REASON,
  DEFAULT_TOP_N, MAX_TOP_N, LEADERBOARD_EXCLUDED_ROLES,
} from '../data/gamificationPolicy';

/**
 * Who is ahead, and by how much.
 *
 * RANK IS EARNED BY ENGAGEMENT, NOT BY ABILITY. The score is XP and only XP. Ranking
 * students by Skill DNA or readiness would publish a private measurement of what somebody
 * can do, turn a diagnostic into a public exam, and give the students most in need of help
 * the most public evidence of it. Coins do not rank either — they are money-adjacent, and
 * a leaderboard is not a rich list.
 *
 * IT DOES NOT LIE ABOUT LOCATION. District and state ranking are not implemented because
 * the data does not exist: there is no district field anywhere in this repository, and state
 * is free text a student typed. Both report `available: false` rather than a plausible
 * number, and rank is null rather than 0 — a zero reads as "last", which is a worse answer
 * than "we cannot tell you".
 *
 * IT DOES NOT LOAD THE WORLD. Ranks come from aggregation and a count, never from pulling
 * every participant into Node and sorting — which is what the previous tenant-only board did
 * and would not survive the scale this is built for.
 */

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  college: string | null;
  xp: number;
  me: boolean;
}

export interface LeaderboardResult {
  available: true;
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  myRank: number | null;
  myXp: number;
  participantCount: number;
}

export interface LeaderboardUnavailable {
  available: false;
  scope: string;
  period: string;
  reason: string;
  myRank: null;
}

export type LeaderboardOutcome = LeaderboardResult | LeaderboardUnavailable;

const toId = (id: string): any =>
  mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;

/** Start of the current week (Monday) and month, in the UTC day terms the product uses. */
export function periodStart(period: LeaderboardPeriod, now: Date): Date | null {
  if (period === 'ALL_TIME') return null;
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === 'MONTHLY') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const dow = (d.getUTCDay() + 6) % 7;                 // Monday = 0
  return new Date(d.getTime() - dow * 86400000);
}

/**
 * Which tenants a scope covers.
 *
 * COLLEGE is the student's own tenant, and only when that tenant IS a college — grouping by
 * the free-text college name on a profile would split one institution into every spelling
 * anybody typed, which is worse than no ranking at all.
 *
 * GLOBAL covers tenants that have opted IN. Nobody's students are entered into a
 * cross-tenant board by default.
 */
async function tenantsFor(scope: LeaderboardScope, tenantId: string): Promise<string[] | null> {
  if (scope === 'COLLEGE') {
    const tenant: any = await Tenant.findById(tenantId).select('type isActive').lean();
    if (!tenant || tenant.type !== 'college') return null;
    return [tenantId];
  }

  const opted = await GamificationConfig
    .find({ 'leaderboard.globalEnabled': true }).select('tenantId').lean() as any[];
  const ids = opted.map(c => c.tenantId);
  // A tenant that has not opted in cannot see a global board either — participation is
  // mutual, not a one-way window into everybody else's students.
  return ids.includes(tenantId) ? ids : null;
}

/**
 * The eligibility filter, in one place.
 *
 * Students only: admins, instructors and staff hold accounts with progress records too, and
 * a member of staff sitting at rank 3 makes the whole board look rigged.
 */
const eligibleUserStage = () => ([
  {
    $lookup: {
      from: 'users', localField: 'studentId', foreignField: '_id',
      as: 'user',
      pipeline: [{ $project: { firstName: 1, lastName: 1, role: 1, isActive: 1, tenantId: 1 } }],
    },
  },
  { $unwind: '$user' },
  { $match: { 'user.role': { $nin: LEADERBOARD_EXCLUDED_ROLES }, 'user.isActive': { $ne: false } } },
]);

/**
 * One page of a leaderboard, plus where the caller stands.
 *
 * ALL_TIME reads the running balance on PassportProgress, which is what it is for. Weekly
 * and monthly are summed from the XP ledger's timestamps, because the balance cannot say
 * WHEN it was earned and the capped activity log cannot reach back far enough to be trusted.
 */
export async function getLeaderboard(input: {
  tenantId: string;
  studentId: string;
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  limit?: number;
  now?: Date;
}): Promise<LeaderboardOutcome> {
  const now = input.now || new Date();
  const limit = Math.min(MAX_TOP_N, Math.max(1, input.limit || DEFAULT_TOP_N));

  if (!isScopeSupported(input.scope)) {
    return {
      available: false, scope: input.scope, period: input.period, myRank: null,
      reason: SCOPE_UNAVAILABLE_REASON[input.scope] || 'That ranking is not available yet.',
    };
  }

  const tenantIds = await tenantsFor(input.scope, input.tenantId);
  if (!tenantIds || !tenantIds.length) {
    return {
      available: false, scope: input.scope, period: input.period, myRank: null,
      reason: input.scope === 'COLLEGE'
        ? SCOPE_UNAVAILABLE_REASON.COLLEGE
        : 'Global ranking is switched off for your institution.',
    };
  }

  const since = periodStart(input.period, now);
  const rows = since
    ? await periodRanking(tenantIds, since, limit)
    : await allTimeRanking(tenantIds, limit);

  const myXp = since
    ? await myPeriodXp(input.tenantId, input.studentId, since)
    : await myAllTimeXp(input.tenantId, input.studentId);

  const [participantCount, ahead] = await Promise.all([
    countParticipants(tenantIds, since),
    // Competition ranking: everyone strictly ahead, plus one. Two students on the same XP
    // therefore share a rank and the next student is pushed down — 1, 1, 3.
    myXp > 0 ? countAhead(tenantIds, since, myXp) : Promise.resolve(-1),
  ]);

  const names = await namesFor(rows.map(r => r.studentId));

  let lastXp: number | null = null;
  let lastRank = 0;
  const entries: LeaderboardEntry[] = rows.map((r, i) => {
    // Ties share a rank; the next distinct score takes the positional rank.
    if (lastXp === null || r.xp < lastXp) { lastRank = i + 1; lastXp = r.xp; }
    const u = names.get(String(r.studentId));
    return {
      rank: lastRank,
      studentId: String(r.studentId),
      name: u?.name || 'Member',
      college: u?.college || null,
      xp: r.xp,
      me: String(r.studentId) === String(input.studentId),
    };
  });

  return {
    available: true,
    scope: input.scope,
    period: input.period,
    entries,
    myRank: myXp > 0 ? ahead + 1 : null,
    myXp,
    participantCount,
  };
}

async function allTimeRanking(tenantIds: string[], limit: number) {
  return PassportProgress.aggregate([
    { $match: { tenantId: { $in: tenantIds }, xp: { $gt: 0 } } },
    { $sort: { xp: -1, studentId: 1 } },
    ...eligibleUserStage(),
    { $limit: limit },
    { $project: { _id: 0, studentId: '$studentId', xp: '$xp' } },
  ]);
}

async function periodRanking(tenantIds: string[], since: Date, limit: number) {
  return XpLedger.aggregate([
    { $match: { tenantId: { $in: tenantIds }, at: { $gte: since } } },
    { $group: { _id: '$studentId', xp: { $sum: '$amount' } } },
    { $match: { xp: { $gt: 0 } } },
    { $sort: { xp: -1, _id: 1 } },
    { $set: { studentId: '$_id' } },
    ...eligibleUserStage(),
    { $limit: limit },
    { $project: { _id: 0, studentId: '$studentId', xp: '$xp' } },
  ]);
}

const myAllTimeXp = async (tenantId: string, studentId: string): Promise<number> => {
  const p: any = await PassportProgress.findOne({ tenantId, studentId }).select('xp').lean();
  return p?.xp || 0;
};

const myPeriodXp = async (tenantId: string, studentId: string, since: Date): Promise<number> => {
  const [row] = await XpLedger.aggregate([
    { $match: { tenantId, studentId: toId(studentId), at: { $gte: since } } },
    { $group: { _id: null, xp: { $sum: '$amount' } } },
  ]);
  return row?.xp || 0;
};

/** How many students are strictly ahead — one number, not a page of rows. */
async function countAhead(tenantIds: string[], since: Date | null, myXp: number): Promise<number> {
  if (!since) {
    const [row] = await PassportProgress.aggregate([
      { $match: { tenantId: { $in: tenantIds }, xp: { $gt: myXp } } },
      ...eligibleUserStage(),
      { $count: 'n' },
    ]);
    return row?.n || 0;
  }
  const [row] = await XpLedger.aggregate([
    { $match: { tenantId: { $in: tenantIds }, at: { $gte: since } } },
    { $group: { _id: '$studentId', xp: { $sum: '$amount' } } },
    { $match: { xp: { $gt: myXp } } },
    { $set: { studentId: '$_id' } },
    ...eligibleUserStage(),
    { $count: 'n' },
  ]);
  return row?.n || 0;
}

async function countParticipants(tenantIds: string[], since: Date | null): Promise<number> {
  if (!since) {
    const [row] = await PassportProgress.aggregate([
      { $match: { tenantId: { $in: tenantIds }, xp: { $gt: 0 } } },
      ...eligibleUserStage(),
      { $count: 'n' },
    ]);
    return row?.n || 0;
  }
  const [row] = await XpLedger.aggregate([
    { $match: { tenantId: { $in: tenantIds }, at: { $gte: since } } },
    { $group: { _id: '$studentId', xp: { $sum: '$amount' } } },
    { $match: { xp: { $gt: 0 } } },
    { $set: { studentId: '$_id' } },
    ...eligibleUserStage(),
    { $count: 'n' },
  ]);
  return row?.n || 0;
}

/**
 * Display identity only.
 *
 * A name and, where the tenant is a college, its name. No email, no phone, no scores, no
 * readiness — a leaderboard is a public surface and everything on it is published.
 */
async function namesFor(ids: any[]): Promise<Map<string, { name: string; college: string | null }>> {
  if (!ids.length) return new Map();
  const users = await User.find({ _id: { $in: ids } })
    .select('firstName lastName tenantId').lean() as any[];

  const tenantIds = [...new Set(users.map(u => String(u.tenantId)).filter(Boolean))];
  const tenants = tenantIds.length
    ? await Tenant.find({ _id: { $in: tenantIds }, type: 'college' }).select('name').lean() as any[]
    : [];
  const collegeOf = new Map(tenants.map(t => [String(t._id), t.name]));

  return new Map(users.map(u => [
    String(u._id),
    {
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Member',
      college: collegeOf.get(String(u.tenantId)) || null,
    },
  ]));
}

/** Every scope, with the ones that cannot be answered marked honestly. */
export async function rankSummary(tenantId: string, studentId: string, now: Date = new Date()) {
  const scopes: LeaderboardScope[] = ['COLLEGE', 'GLOBAL', 'DISTRICT', 'STATE'];
  const out: Record<string, any> = {};

  for (const scope of scopes) {
    if (!isScopeSupported(scope)) {
      out[scope.toLowerCase()] = { available: false, rank: null, reason: SCOPE_UNAVAILABLE_REASON[scope] };
      continue;
    }
    const board = await getLeaderboard({
      tenantId, studentId, scope, period: 'ALL_TIME', limit: 1, now,
    });
    out[scope.toLowerCase()] = board.available
      ? { available: true, rank: board.myRank, participants: board.participantCount }
      : { available: false, rank: null, reason: (board as LeaderboardUnavailable).reason };
  }

  return out;
}
