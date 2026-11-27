/**
 * Placement Desk — reports, eligibility suggestions, student history, public summary, export.
 * Models: models/PlacementDesk.ts. Outcomes and feedback are admin-only; the public summary
 * carries company-level counts only, never a name or a feedback line.
 */
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import Batch from '../models/Batch';
import {
  PlacementDeskDrive, PlacementDeskCandidate,
  ATTENDED_STATUSES, OFFER_STATUSES, PENDING_STATUSES, CandidateStatus,
} from '../models/PlacementDesk';

const oid = (v: any) => new mongoose.Types.ObjectId(String(v));
export const isDay = (s: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
export const istDayOf = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
export const istDateOf = (day: string) => new Date(`${day}T00:00:00+05:30`);

/** Default range: the current month so far (IST). */
export function resolveRange(from?: any, to?: any): { from: string; to: string } {
  const today = istDayOf(new Date());
  const f = isDay(from) ? String(from) : `${today.slice(0, 7)}-01`;
  const t = isDay(to) ? String(to) : today;
  return f <= t ? { from: f, to: t } : { from: t, to: f };
}

export interface Counts { total: number; attended: number; noShow: number; offers: number; rejected: number; pending: number; joined: number; notMarked: number }
export const emptyCounts = (): Counts => ({ total: 0, attended: 0, noShow: 0, offers: 0, rejected: 0, pending: 0, joined: 0, notMarked: 0 });

export function addTo(c: Counts, status: CandidateStatus) {
  c.total += 1;
  if (ATTENDED_STATUSES.includes(status)) c.attended += 1;
  if (OFFER_STATUSES.includes(status)) c.offers += 1;
  if (PENDING_STATUSES.includes(status)) c.pending += 1;
  if (status === 'no_show') c.noShow += 1;
  if (status === 'rejected') c.rejected += 1;
  if (status === 'joined') c.joined += 1;
  if (status === 'eligible') c.notMarked += 1;
}

/** Full admin report for a date range (by drive day). */
export async function buildReport(tenantId: string, fromIn?: any, toIn?: any) {
  const { from, to } = resolveRange(fromIn, toIn);
  const tid = oid(tenantId);
  const drives: any[] = await PlacementDeskDrive.find({ tenantId: tid, day: { $gte: from, $lte: to } }).sort({ day: -1, createdAt: -1 }).lean();
  const cands: any[] = drives.length
    ? await PlacementDeskCandidate.find({ tenantId: tid, driveId: { $in: drives.map((d) => d._id) } })
      .select('driveId name kind status roundReached offerCtc companyFeedback internalRemarks college').lean()
    : [];

  const byDrive = new Map<string, any[]>();
  for (const c of cands) { const k = String(c.driveId); (byDrive.get(k) || byDrive.set(k, []).get(k)!).push(c); }

  const totals = { ...emptyCounts(), companies: 0, drives: drives.filter((d) => d.status !== 'cancelled').length, cancelled: 0, highestOffer: 0 };
  const companies = new Set<string>();
  const officers = new Map<string, any>();
  const days = new Map<string, any>();

  const driveRows = drives.map((d) => {
    const list = byDrive.get(String(d._id)) || [];
    const counts = emptyCounts();
    list.forEach((c) => addTo(counts, c.status));
    if (d.status === 'cancelled') totals.cancelled += 1;
    else companies.add(String(d.companyId));
    list.forEach((c) => {
      addTo(totals, c.status);
      if (OFFER_STATUSES.includes(c.status) && c.offerCtc) totals.highestOffer = Math.max(totals.highestOffer, c.offerCtc);
    });

    const ok = d.officerId ? String(d.officerId) : 'none';
    const o = officers.get(ok) || { officerId: d.officerId ? String(d.officerId) : null, name: d.officerName || 'Not set', drives: 0, companies: new Set<string>(), attended: 0, offers: 0 };
    if (d.status !== 'cancelled') { o.drives += 1; o.companies.add(String(d.companyId)); }
    o.attended += counts.attended; o.offers += counts.offers;
    officers.set(ok, o);

    const dy = days.get(d.day) || { day: d.day, drives: 0, attended: 0, offers: 0, rejected: 0 };
    if (d.status !== 'cancelled') dy.drives += 1;
    dy.attended += counts.attended; dy.offers += counts.offers; dy.rejected += counts.rejected;
    days.set(d.day, dy);

    return {
      _id: String(d._id), day: d.day, companyId: String(d.companyId), companyName: d.companyName, role: d.role,
      jobType: d.jobType, mode: d.mode, packageMin: d.packageMin ?? null, packageMax: d.packageMax ?? null,
      bond: d.bond?.required ? d.bond : null, officerName: d.officerName || '', status: d.status, counts,
      feedback: list
        .filter((c) => c.companyFeedback || c.internalRemarks || c.status !== 'eligible')
        .map((c) => ({ name: c.name, kind: c.kind, status: c.status, roundReached: c.roundReached || '', offerCtc: c.offerCtc ?? null, companyFeedback: c.companyFeedback || '', internalRemarks: c.internalRemarks || '' })),
    };
  });
  totals.companies = companies.size;

  return {
    from, to, totals,
    drives: driveRows,
    byOfficer: [...officers.values()].map((o) => ({ ...o, companies: o.companies.size })).sort((a, b) => b.offers - a.offers || b.drives - a.drives),
    byDay: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
  };
}

/** Public summary: company-level counts only. No names, no feedback, no contacts. */
export async function publicSummary(tenantId: string, fromIn?: any, toIn?: any) {
  const r = await buildReport(tenantId, fromIn, toIn);
  return {
    from: r.from, to: r.to,
    totals: { companies: r.totals.companies, drives: r.totals.drives, attended: r.totals.attended, offers: r.totals.offers, joined: r.totals.joined, highestOffer: r.totals.highestOffer },
    drives: r.drives.filter((d) => d.status !== 'cancelled').map((d) => ({
      day: d.day, companyName: d.companyName, role: d.role, jobType: d.jobType,
      packageMin: d.packageMin, packageMax: d.packageMax, attended: d.counts.attended, offers: d.counts.offers,
    })),
  };
}

/**
 * LMS students for a drive, with how they match its eligibility. Missing profile data is
 * 'unknown' rather than a fail, so an incomplete profile never hides a good candidate.
 */
export async function eligibleStudents(tenantId: string, drive: any, opts: { batchId?: string } = {}) {
  const el = drive.eligibility || {};
  const q: any = { tenantId: oid(tenantId), role: 'STUDENT', isActive: { $ne: false } };
  const batchFilter = opts.batchId ? [opts.batchId] : (el.batchIds || []).map(String);
  if (batchFilter.length) q.$or = [{ batchId: { $in: batchFilter.map(oid) } }, { placementBatchIds: { $in: batchFilter.map(oid) } }];
  const users: any[] = await User.find(q).select('firstName lastName email phone batchId').lean();
  const profiles: any[] = await StudentProfile.find({ tenantId: oid(tenantId), userId: { $in: users.map((u) => u._id) } })
    .select('userId education.degree').lean();
  const prof = new Map(profiles.map((p) => [String(p.userId), p.education?.degree || {}]));
  const batches: any[] = await Batch.find({ _id: { $in: [...new Set(users.map((u) => String(u.batchId || '')).filter(Boolean))].map(oid) } }).select('name').lean();
  const bname = new Map(batches.map((b) => [String(b._id), b.name]));
  const already = new Set((await PlacementDeskCandidate.find({ driveId: drive._id, studentId: { $exists: true } }).distinct('studentId')).map(String));

  const years: number[] = el.passoutYears || [];
  const degrees: string[] = (el.degrees || []).map((x: string) => x.toLowerCase());
  return users.map((u) => {
    const dg: any = prof.get(String(u._id)) || {};
    const checks: ('yes' | 'no' | 'unknown')[] = [];
    const reasons: string[] = [];
    if (years.length) {
      if (!dg.graduationYear) { checks.push('unknown'); reasons.push('passout year missing'); }
      else if (years.includes(dg.graduationYear)) checks.push('yes');
      else { checks.push('no'); reasons.push(`passout ${dg.graduationYear}`); }
    }
    if (degrees.length) {
      const text = `${dg.name || ''} ${dg.branch || ''}`.toLowerCase();
      if (!text.trim()) { checks.push('unknown'); reasons.push('degree missing'); }
      else if (degrees.some((d) => text.includes(d))) checks.push('yes');
      else { checks.push('no'); reasons.push(dg.name || 'degree'); }
    }
    if (el.minPercent) {
      if (dg.percentage == null) { checks.push('unknown'); reasons.push('% missing'); }
      else if (dg.percentage >= el.minPercent) checks.push('yes');
      else { checks.push('no'); reasons.push(`${dg.percentage}%`); }
    }
    const match = checks.includes('no') ? 'no' : checks.includes('unknown') ? 'unknown' : 'yes';
    return {
      _id: String(u._id), name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email, email: u.email, phone: u.phone,
      batchName: bname.get(String(u.batchId)) || '', degree: [dg.name, dg.branch].filter(Boolean).join(' · '),
      passoutYear: dg.graduationYear ?? null, percent: dg.percentage ?? null,
      match, reasons, added: already.has(String(u._id)),
    };
  }).sort((a, b) => ['yes', 'unknown', 'no'].indexOf(a.match) - ['yes', 'unknown', 'no'].indexOf(b.match) || a.name.localeCompare(b.name));
}

/** Admin-only placement history of one LMS student. */
export async function studentHistory(tenantId: string, studentId: string) {
  const rows: any[] = await PlacementDeskCandidate.find({ tenantId: oid(tenantId), studentId: oid(studentId) }).sort({ day: -1 }).lean();
  const drives: any[] = await PlacementDeskDrive.find({ _id: { $in: rows.map((r) => r.driveId) } })
    .select('companyName role day packageMin packageMax officerName status').lean();
  const dmap = new Map(drives.map((d) => [String(d._id), d]));
  const counts = emptyCounts();
  rows.forEach((r) => addTo(counts, r.status));
  return {
    counts,
    rows: rows.map((r) => {
      const d: any = dmap.get(String(r.driveId)) || {};
      return {
        _id: String(r._id), driveId: String(r.driveId), day: r.day, companyName: d.companyName || '', role: d.role || '',
        packageMin: d.packageMin ?? null, packageMax: d.packageMax ?? null, officerName: d.officerName || '',
        status: r.status, roundReached: r.roundReached || '', offerCtc: r.offerCtc ?? null,
        companyFeedback: r.companyFeedback || '', internalRemarks: r.internalRemarks || '',
      };
    }),
  };
}

const STATUS_LABEL: Record<string, string> = {
  eligible: 'Not marked', attended: 'Attended', no_show: 'No-show', in_process: 'In process', offered: 'Offered',
  rejected: 'Rejected', offer_accepted: 'Offer accepted', offer_declined: 'Offer declined', joined: 'Joined',
};
const pkg = (a: any, b: any) => (a != null || b != null ? `${a ?? '?'}–${b ?? '?'} LPA` : '');

/** Excel workbook of the report: Summary, Drives, Candidates (with feedback). */
export async function reportWorkbook(tenantId: string, fromIn?: any, toIn?: any): Promise<{ buffer: Buffer; filename: string }> {
  const r = await buildReport(tenantId, fromIn, toIn);
  const t = r.totals;
  const summary = [
    ['Placement Desk report', `${r.from} to ${r.to}`], [],
    ['Companies brought', t.companies], ['Drives held', t.drives], ['Drives cancelled', t.cancelled],
    ['Candidates put up', t.total], ['Attended', t.attended], ['No-show', t.noShow],
    ['Offers released', t.offers], ['Rejected', t.rejected], ['Result pending', t.pending], ['Joined', t.joined],
    ['Highest offer (LPA)', t.highestOffer || ''], [],
    ['Placement officer', 'Drives', 'Companies', 'Attended', 'Offers'],
    ...r.byOfficer.map((o) => [o.name, o.drives, o.companies, o.attended, o.offers]),
  ];
  const drives = [
    ['Date', 'Company', 'Role', 'Package', 'Bond', 'Officer', 'Status', 'Put up', 'Attended', 'No-show', 'Offers', 'Rejected', 'Pending'],
    ...r.drives.map((d) => [d.day, d.companyName, d.role, pkg(d.packageMin, d.packageMax), d.bond ? `${d.bond.months || '?'} months${d.bond.amount ? ` / ₹${d.bond.amount}` : ''}` : 'No',
      d.officerName, d.status, d.counts.total, d.counts.attended, d.counts.noShow, d.counts.offers, d.counts.rejected, d.counts.pending]),
  ];
  const cands = [
    ['Date', 'Company', 'Role', 'Candidate', 'Type', 'Status', 'Round reached', 'Offer (LPA)', 'Company feedback', 'Our remarks'],
    ...r.drives.flatMap((d) => d.feedback.map((f: any) => [d.day, d.companyName, d.role, f.name, f.kind === 'external' ? 'Outside' : 'Student',
      STATUS_LABEL[f.status] || f.status, f.roundReached, f.offerCtc ?? '', f.companyFeedback, f.internalRemarks])),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(drives), 'Drives');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cands), 'Candidates');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return { buffer, filename: `placement-desk-${r.from}-to-${r.to}.xlsx` };
}
