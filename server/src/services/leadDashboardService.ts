/**
 * Lead Dashboard data — one call for the tiles, funnel, trend, follow-up tasks and tab counts.
 *
 * Two kinds of numbers, on purpose:
 *  - PERIOD numbers (tiles, funnel, trend, and the All / My leads / Lost tabs) count leads
 *    CREATED in the chosen dates. "Reached" = Lead.milestones.<x>At is set (first reach, so a
 *    reopened lead counts once; a lead that jumped ahead counts for the steps it skipped).
 *  - WORK-QUEUE numbers (follow-up tasks and the Due today / Overdue / Nurture tabs) are
 *    "right now", whatever the dates — an overdue follow-up on a lead from last month is still
 *    overdue. Lost / enrolled leads are left out of the follow-up numbers.
 * Everything is limited to the leads the viewer may see (lead scope).
 */
import mongoose from 'mongoose';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import { milestoneFromLegacy } from '../config/leadMilestones';

const DAY = 86_400_000;
const MAX_TREND_LEADS = 50_000;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : null);

export const DASHBOARD_FUNNEL = [
  { key: 'new', label: 'New Lead', field: null },
  { key: 'connected', label: 'Connected', field: 'connectedAt' },
  { key: 'qualified', label: 'Qualified', field: 'qualifiedAt' },
  { key: 'demoAttended', label: 'Demo Attended', field: 'demoAttendedAt' },
  { key: 'seatReserved', label: 'Seat Reserved', field: 'seatReservedAt' },
  { key: 'enrolled', label: 'Enrolled', field: 'enrolledAt' },
] as const;

export interface DashboardInput { tenantId: string; scope: Record<string, any>; userId: string; from?: Date; to?: Date }

/** IST calendar-day start for a date. */
const istDayStart = (d: Date) => { const ist = new Date(d.getTime() + 330 * 60_000); ist.setUTCHours(0, 0, 0, 0); return new Date(ist.getTime() - 330 * 60_000); };

export async function leadDashboard({ tenantId, scope, userId, from, to }: DashboardInput) {
  const tid = new mongoose.Types.ObjectId(tenantId);
  const base: any = { tenantId: tid, ...scope, archivedAt: null };
  const created = from || to ? { createdAt: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } } : {};
  const period = { ...base, ...created };

  const stages = await LeadStage.find({ tenantId: tid }).select('milestone category isLostStage').lean();
  const idsFor = (m: string) => stages.filter((s: any) => milestoneFromLegacy(s) === m).map((s: any) => s._id);
  const closed = [...idsFor('lost'), ...idsFor('enrolled')];
  const open = { ...base, stageId: { $nin: closed } };

  const now = new Date();
  const today = istDayStart(now);
  const tomorrow = new Date(today.getTime() + DAY);
  const in7 = new Date(today.getTime() + 8 * DAY);

  // Previous period of the same length, for the "vs previous period" change.
  let prevTotalP: Promise<number | null> = Promise.resolve(null);
  if (from && to) {
    const len = to.getTime() - from.getTime();
    prevTotalP = Lead.countDocuments({ ...base, createdAt: { $gte: new Date(from.getTime() - len - 1), $lt: from } });
  }

  const [total, prevTotal, reached, mine, lost, dueToday, overdue, upcoming7, nurture, courses, campaigns] = await Promise.all([
    Lead.countDocuments(period),
    prevTotalP,
    Promise.all(DASHBOARD_FUNNEL.map(s => (s.field ? Lead.countDocuments({ ...period, [`milestones.${s.field}`]: { $exists: true } }) : Promise.resolve(-1)))),
    Lead.countDocuments({ ...period, assignedTo: new mongoose.Types.ObjectId(userId) }),
    Lead.countDocuments({ ...period, stageId: { $in: idsFor('lost') } }),
    Lead.countDocuments({ ...open, nextFollowUp: { $gte: today, $lt: tomorrow } }),
    Lead.countDocuments({ ...open, nextFollowUp: { $lt: now } }),
    Lead.countDocuments({ ...open, nextFollowUp: { $gte: tomorrow, $lt: in7 } }),
    Lead.countDocuments({ ...base, stageId: { $in: idsFor('nurture') } }),
    Lead.distinct('courseInterest', { tenantId: tid, archivedAt: null }),
    Lead.distinct('sourceDetails.campaignName', { tenantId: tid, archivedAt: null }),
  ]);

  const counts = DASHBOARD_FUNNEL.map((s, i) => (s.field ? reached[i] : total));
  const funnel = DASHBOARD_FUNNEL.map((s, i) => ({
    key: s.key, label: s.label, count: counts[i],
    ofTotal: pct(counts[i], total),
    // Step conversion: share of the previous step that reached this one.
    fromPrevious: i === 0 ? null : pct(counts[i], counts[i - 1]),
  }));

  // ── trend: leads created per bucket, and how many of those reached Qualified ──
  const trendFrom = from || (await Lead.findOne(period).sort({ createdAt: 1 }).select('createdAt').lean() as any)?.createdAt || new Date(now.getTime() - 30 * DAY);
  const trendTo = to || now;
  const spanDays = Math.max(1, Math.ceil((trendTo.getTime() - trendFrom.getTime()) / DAY));
  const unit: 'day' | 'week' | 'month' = spanDays <= 14 ? 'day' : spanDays <= 120 ? 'week' : 'month';
  const buckets: { label: string; start: Date; end: Date; total: number; qualified: number }[] = [];
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', ...opts });
  let cursor = istDayStart(trendFrom);
  while (cursor <= trendTo && buckets.length < 60) {
    let end: Date;
    if (unit === 'day') end = new Date(cursor.getTime() + DAY);
    else if (unit === 'week') end = new Date(cursor.getTime() + 7 * DAY);
    else { const ist = new Date(cursor.getTime() + 330 * 60_000); end = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, 1) - 330 * 60_000); }
    const last = new Date(Math.min(end.getTime(), trendTo.getTime() + 1) - 1);
    const label = unit === 'day' ? fmt(cursor, { day: 'numeric', month: 'short' })
      : unit === 'week' ? `${fmt(cursor, { day: 'numeric', month: 'short' })}–${fmt(last, { day: 'numeric' })}`
      : fmt(cursor, { month: 'short', year: '2-digit' });
    buckets.push({ label, start: cursor, end, total: 0, qualified: 0 });
    cursor = end;
  }
  const trendLeads = await Lead.find({ ...base, createdAt: { $gte: trendFrom, $lte: trendTo } })
    .select('createdAt milestones.qualifiedAt').limit(MAX_TREND_LEADS).lean();
  for (const l of trendLeads as any[]) {
    const t = new Date(l.createdAt).getTime();
    const b = buckets.find(x => t >= x.start.getTime() && t < x.end.getTime());
    if (!b) continue;
    b.total++;
    if (l.milestones?.qualifiedAt) b.qualified++;
  }

  const tile = (key: string) => { const f = funnel.find(x => x.key === key)!; return { count: f.count, ofTotal: f.ofTotal }; };
  return {
    range: { from: from || null, to: to || null },
    tiles: {
      total: { count: total, previous: prevTotal, changePct: prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : null },
      connected: tile('connected'), qualified: tile('qualified'), demoAttended: tile('demoAttended'),
      seatReserved: tile('seatReserved'), enrolled: tile('enrolled'),
    },
    funnel,
    trend: { unit, points: buckets.map(b => ({ label: b.label, start: b.start, total: b.total, qualified: b.qualified })) },
    tasks: { dueToday, overdue, upcoming7, nurture },
    tabs: { all: total, mine, dueToday, overdue, nurture, lost },
    options: {
      courses: (courses as any[]).filter(Boolean).map(String).sort().slice(0, 200),
      campaigns: (campaigns as any[]).filter(Boolean).map(String).sort().slice(0, 200),
    },
  };
}
