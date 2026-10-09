import mongoose from 'mongoose';
import Tenant from '../models/Tenant';
import User from '../models/User';
import AiUsage from '../models/AiUsage';
import * as settings from './settingsService';
import { istToday, ymd } from '../utils/planSchedule';

/**
 * Plan limits per institute, set by the platform administrator (Tenant Management → Plan &
 * limits). Blank = unlimited; the platform owner (CodeBegun) is never limited.
 *
 *   maxStudents         — students the institute may have (active or not)
 *   maxStaff            — admins, instructors and staff
 *   aiBudgetInrMonthly  — AI spend per calendar month, in ₹, across every AI feature
 *
 * Every institute's AI, live classes and storage run on the platform's accounts, so without these
 * a college could run up CodeBegun's AI bill without limit.
 */

export interface TenantLimits { maxStudents?: number | null; maxStaff?: number | null; aiBudgetInrMonthly?: number | null }

export class LimitError extends Error {
  code = 'LIMIT_REACHED';
  constructor(message: string, public status = 403) { super(message); }
}

const STAFF_ROLES = ['TENANT_ADMIN', 'INSTRUCTOR', 'STAFF', 'ATTENDANCE_ADMIN', 'PLACEMENT_OFFICER'];
const oid = (id: string) => new mongoose.Types.ObjectId(id);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

const limitCache = new Map<string, { at: number; limits: TenantLimits }>();
export function invalidateLimits(tenantId?: string) {
  if (tenantId) { limitCache.delete(String(tenantId)); spendCache.delete(String(tenantId)); } else { limitCache.clear(); spendCache.clear(); }
}

export async function getLimits(tenantId: string): Promise<TenantLimits> {
  if (settings.isPlatformOwner(tenantId)) return {};
  const hit = limitCache.get(tenantId);
  if (hit && Date.now() - hit.at < 60_000) return hit.limits;
  const t: any = await Tenant.findById(tenantId).select('limits').lean().catch(() => null);
  const limits: TenantLimits = {
    maxStudents: num(t?.limits?.maxStudents), maxStaff: num(t?.limits?.maxStaff), aiBudgetInrMonthly: num(t?.limits?.aiBudgetInrMonthly),
  };
  limitCache.set(tenantId, { at: Date.now(), limits });
  return limits;
}

export async function saveLimits(tenantId: string, input: Record<string, unknown>): Promise<TenantLimits> {
  const clean = (v: unknown) => (v === '' || v === null || v === undefined ? null : Math.max(0, Math.floor(Number(v))));
  const set: Record<string, number | null> = {};
  for (const k of ['maxStudents', 'maxStaff', 'aiBudgetInrMonthly']) {
    if (k in (input || {})) {
      const v = clean(input[k]);
      if (v !== null && !Number.isFinite(v)) throw new LimitError(`${k} must be a number.`, 400);
      set[`limits.${k}`] = v;
    }
  }
  await Tenant.updateOne({ _id: oid(tenantId) }, { $set: set });
  invalidateLimits(tenantId);
  return getLimits(tenantId);
}

// ── Seats ─────────────────────────────────────────────────────────────────────

/** Refuse adding `count` users of `role` when the institute's plan is full. */
export async function assertSeats(tenantId: string, role: string, count = 1): Promise<void> {
  if (!tenantId || !mongoose.isValidObjectId(String(tenantId))) return;
  const limits = await getLimits(String(tenantId));
  const isStudent = role === 'STUDENT' || role === 'GUEST';
  const max = isStudent ? limits.maxStudents : STAFF_ROLES.includes(role) ? limits.maxStaff : null;
  if (max === null || max === undefined) return;
  const current = await User.countDocuments({ tenantId: oid(String(tenantId)), role: isStudent ? { $in: ['STUDENT', 'GUEST'] } : { $in: STAFF_ROLES } });
  if (current + count > max) {
    throw new LimitError(isStudent
      ? `Your plan allows ${max} students and you have ${current}. Contact the platform administrator to raise it.`
      : `Your plan allows ${max} staff accounts and you have ${current}. Contact the platform administrator to raise it.`);
  }
}

// ── AI budget ─────────────────────────────────────────────────────────────────

const spendCache = new Map<string, { at: number; inr: number }>();
const monthStart = () => ymd(istToday()).slice(0, 7) + '-01';

/** AI spend this calendar month (IST), in ₹. Cached for a minute. */
export async function aiSpendThisMonth(tenantId: string): Promise<number> {
  const hit = spendCache.get(tenantId);
  if (hit && Date.now() - hit.at < 60_000) return hit.inr;
  const rows = await AiUsage.aggregate([
    { $match: { tenantId: oid(tenantId), date: { $gte: monthStart() } } },
    { $group: { _id: null, inr: { $sum: '$costInr' } } },
  ]).catch(() => []);
  const inr = Math.round(((rows as any[])[0]?.inr || 0) * 100) / 100;
  spendCache.set(tenantId, { at: Date.now(), inr });
  return inr;
}

/** Throws once an institute has used its monthly AI budget. No institute (system work) → allowed. */
export async function assertAiBudget(tenantId?: string): Promise<void> {
  if (!tenantId || !mongoose.isValidObjectId(String(tenantId))) return;
  const { aiBudgetInrMonthly } = await getLimits(String(tenantId));
  if (aiBudgetInrMonthly === null || aiBudgetInrMonthly === undefined) return;
  const spent = await aiSpendThisMonth(String(tenantId));
  if (spent >= aiBudgetInrMonthly) {
    throw new LimitError(`This month's AI budget (₹${aiBudgetInrMonthly}) is used up. AI features resume on the 1st, or the platform administrator can raise the budget.`);
  }
}

/** For the Tenant Management panel: limits next to what is used. */
export async function limitsWithUsage(tenantId: string) {
  const tid = oid(tenantId);
  const [limits, students, staff, ai] = await Promise.all([
    getLimits(tenantId),
    User.countDocuments({ tenantId: tid, role: { $in: ['STUDENT', 'GUEST'] } }),
    User.countDocuments({ tenantId: tid, role: { $in: STAFF_ROLES } }),
    aiSpendThisMonth(tenantId),
  ]);
  return { limits, usage: { students, staff, aiSpendInrThisMonth: ai }, unlimited: settings.isPlatformOwner(tenantId) };
}
