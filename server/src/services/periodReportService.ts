/**
 * The custom-range student report (2026-11-26): everything the weekly report shows, for any
 * From–To dates up to 12 months, plus a week-by-week breakdown and every item listed.
 *
 * It is the weekly report's own calculation (weeklyReportService.build) run over the range, so the
 * two never disagree. Two copies:
 *   staff   — drive results and company feedback included;
 *   student — only the drives they attended, no results (as in the weekly email).
 */
import * as XLSX from 'xlsx';
import User from '../models/User';
import { PlacementDeskCandidate, PlacementDeskDrive } from '../models/PlacementDesk';
import { weeklyReportService, weightedScore, ymd } from './weeklyReportService';
import type { WeeklyReportData, GlanceItem, WorkItem } from './weeklyReportService';
import { labScore } from './weeklyReportLabs';

export type ReportCopy = 'staff' | 'student';
export const MAX_RANGE_DAYS = 366;

export class PeriodRangeError extends Error {}

const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** 'YYYY-MM-DD' From/To → local start/end. To is clipped to today; at most 12 months. */
export function parseRange(from?: string, to?: string): { start: Date; end: Date; label: string; days: number } {
  const ok = (x?: string) => !!x && /^\d{4}-\d{2}-\d{2}$/.test(x) && !isNaN(Date.parse(`${x}T00:00:00`));
  if (!ok(from) || !ok(to)) throw new PeriodRangeError('Pick a From and a To date.');
  const start = new Date(`${from}T00:00:00`);
  let end = new Date(`${to}T23:59:59.999`);
  const today = new Date(); today.setHours(23, 59, 59, 999);
  if (end > today) end = today;
  if (start > end) throw new PeriodRangeError('The From date must be on or before the To date (and not in the future).');
  const days = Math.round((new Date(end).setHours(0, 0, 0, 0) - start.getTime()) / 86_400_000) + 1;
  if (days > MAX_RANGE_DAYS) throw new PeriodRangeError('Pick a range of 12 months or less.');
  return { start, end, label: `${fmtDate(start)} – ${fmtDate(end)}`, days };
}

export interface WeekRow {
  start: string; end: string; label: string;
  score: number; hasData: boolean;
  classes: { present: number; total: number };
  quizzes: { done: number; set: number; missed: number };
  assignments: { done: number; set: number; missed: number };
  interviews: { taken: number; absent: number };
  communication: { done: number; expected: number; active: number };
  thinking: { done: number; expected: number; active: number };
  drives: number;
}

export interface DriveLogRow {
  company: string; role: string; day: string; mode: string;
  /** Staff copy only. */
  status?: string; roundReached?: string; offerCtc?: number | null; companyFeedback?: string;
}

export interface PeriodReport extends WeeklyReportData {
  copy: ReportCopy;
  days: number;
  weeks: WeekRow[];
  driveLog: DriveLogRow[];
}

const STATUS_LABEL: Record<string, string> = {
  eligible: 'Put forward', attended: 'Attended', no_show: 'Did not attend', in_process: 'In process', offered: 'Offered',
  rejected: 'Not selected', offer_accepted: 'Offer accepted', offer_declined: 'Offer declined', joined: 'Joined',
};
const MODES: Record<string, string> = { on_campus: 'On campus', virtual: 'Online', walk_in: 'Walk-in', at_company: 'At the company' };
const shortDay = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const avgOf = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);

/** Every Mon–Sun week touching the range, clipped to it, with each area counted in that week. */
export function weekBreakdown(r: WeeklyReportData, start: Date, end: Date): WeekRow[] {
  const rows: WeekRow[] = [];
  const first = new Date(start); first.setHours(0, 0, 0, 0);
  const dow = first.getDay();
  first.setDate(first.getDate() + (dow === 0 ? -6 : 1 - dow));
  const lastYmd = ymd(end);
  const work = (items: WorkItem[], a: string, b: string) => {
    const xs = items.filter((i) => i.date >= a && i.date <= b);
    const done = xs.filter((i) => i.status === 'done');
    return { set: xs.length, done: done.length, missed: xs.filter((i) => i.status === 'missed').length, avg: avgOf(done.map((i) => i.score).filter((x): x is number => typeof x === 'number')) };
  };
  const lab = (w: WeeklyReportData['communication'] | WeeklyReportData['thinking'], a: string, b: string) => {
    const ds = w.days.filter((d) => d.date >= a && d.date <= b);
    const scores = w.scores.filter((x) => x.date >= a && x.date <= b).map((x) => x.score);
    const expected = ds.filter((d) => d.expected).length;
    const done = ds.filter((d) => d.expected && d.done).length;
    return { expected, done, active: ds.filter((d) => d.done).length, score: labScore({ expectedDays: expected, doneDays: done, avgScore: scores.length ? avgOf(scores) : null } as any) };
  };
  for (let ws = new Date(first); ymd(ws) <= lastYmd; ws.setDate(ws.getDate() + 7)) {
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    const a = ymd(ws < start ? start : ws), b = ymd(we > end ? end : we);
    const cls = r.attendance.log.filter((x) => x.date >= a && x.date <= b);
    const present = cls.filter((x) => x.status === 'present').length;
    const q = work(r.quizzes.items, a, b), w = work(r.assignments.items, a, b);
    const iv = r.interview.items.filter((x) => x.date >= a && x.date <= b);
    const ivScores = iv.map((x) => x.score).filter((x): x is number => typeof x === 'number');
    const c = lab(r.communication, a, b), t = lab(r.thinking, a, b);
    const { score, hasData } = weightedScore({
      quiz: q, work: w,
      attendancePct: cls.length ? Math.round((present / cls.length) * 100) : null,
      interviewAvg: ivScores.length ? avgOf(ivScores) : null,
      comm: c.score, think: t.score,
    });
    const da = new Date(`${a}T00:00:00`), db = new Date(`${b}T00:00:00`);
    rows.push({
      start: a, end: b, label: `${shortDay(da)} – ${shortDay(db)}`, score, hasData,
      classes: { present, total: cls.length },
      quizzes: { done: q.done, set: q.set, missed: q.missed },
      assignments: { done: w.done, set: w.set, missed: w.missed },
      interviews: { taken: iv.filter((x) => !x.absent).length, absent: iv.filter((x) => x.absent).length },
      communication: { done: c.done, expected: c.expected, active: c.active },
      thinking: { done: t.done, expected: t.expected, active: t.active },
      drives: r.drives.filter((d) => d.day >= a && d.day <= b).length,
    });
  }
  return rows;
}

/** Staff: every drive the student was put forward for, with the result. Student: attended only. */
async function driveLog(tenantId: string, studentId: string, start: Date, end: Date, copy: ReportCopy, attended: WeeklyReportData['drives']): Promise<DriveLogRow[]> {
  if (copy === 'student') return attended.map((d) => ({ ...d }));
  const cands: any[] = await PlacementDeskCandidate.find({ tenantId, studentId, day: { $gte: ymd(start), $lte: ymd(end) } })
    .select('driveId day status roundReached offerCtc companyFeedback').lean();
  if (!cands.length) return [];
  const drives: any[] = await PlacementDeskDrive.find({ _id: { $in: cands.map((c) => c.driveId) }, status: { $ne: 'cancelled' } })
    .select('companyName role day mode').lean();
  const byId = new Map(drives.map((d) => [String(d._id), d]));
  return cands
    .filter((c) => byId.has(String(c.driveId)))
    .map((c) => {
      const d = byId.get(String(c.driveId));
      return {
        company: String(d.companyName || ''), role: String(d.role || ''), day: String(d.day || c.day || ''), mode: MODES[d.mode] || '',
        status: STATUS_LABEL[c.status] || c.status, roundReached: c.roundReached || '', offerCtc: typeof c.offerCtc === 'number' ? c.offerCtc : null,
        companyFeedback: c.companyFeedback || '',
      };
    })
    .sort((x, y) => x.day.localeCompare(y.day));
}

export async function getPeriodReport(tenantId: string, studentId: string, from: string, to: string, copy: ReportCopy): Promise<PeriodReport | null> {
  const { start, end, label, days } = parseRange(from, to);
  const base = await weeklyReportService.build(studentId, tenantId, start, end, label, true);
  if (!base) return null;
  return {
    ...base,
    copy,
    days,
    weeks: weekBreakdown(base, start, end),
    driveLog: await driveLog(tenantId, studentId, start, end, copy, base.drives),
  };
}

export interface PeriodSummary { id: string; name: string; email: string; score: number; grade: string; hasData: boolean; glance: GlanceItem[]; isEmpty: boolean; drivesAttended: number }

/** "Who did what" for a whole batch over the range. A few students at a time to stay quick. */
export async function getBatchPeriodSummaries(tenantId: string, batchId: string, from: string, to: string): Promise<PeriodSummary[]> {
  const { start, end, label } = parseRange(from, to);
  const students = await weeklyReportService.getBatchStudents(tenantId, batchId);
  const out: PeriodSummary[] = new Array(students.length);
  let next = 0;
  const worker = async () => {
    while (next < students.length) {
      const i = next++;
      const s: any = students[i];
      const r = await weeklyReportService.build(String(s._id), tenantId, start, end, label, true).catch(() => null);
      out[i] = {
        id: String(s._id), name: `${s.firstName} ${s.lastName || ''}`.trim(), email: s.email,
        score: r?.overall.score ?? 0, grade: r?.overall.grade ?? 'D', hasData: r?.overall.hasData ?? false,
        glance: r?.glance ?? [], isEmpty: r?.isEmpty ?? true, drivesAttended: r?.drives.length ?? 0,
      };
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return out;
}

/** Active students of the institute matching a name or email (for the student picker). */
export async function searchStudents(tenantId: string, q: string) {
  const term = String(q || '').trim().slice(0, 60);
  const filter: any = { tenantId, role: 'STUDENT', isActive: true };
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const parts = term.split(/\s+/);
    filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx },
      ...(parts.length > 1 ? [{ firstName: new RegExp(parts[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), lastName: new RegExp(parts.slice(1).join(' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }] : [])];
  }
  const rows: any[] = await User.find(filter).select('firstName lastName email batchId').populate('batchId', 'name').sort({ firstName: 1 }).limit(20).lean();
  return rows.map((u) => ({ id: String(u._id), name: `${u.firstName} ${u.lastName || ''}`.trim(), email: u.email, batchName: u.batchId?.name || '' }));
}

// ── Excel ────────────────────────────────────────────────────────────────
const word: Record<string, string> = { done: 'Done', partial: 'Partly done', missed: 'Missed', pending: 'Not due yet', none: 'Nothing set' };
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

export function periodReportXlsx(r: PeriodReport): Buffer {
  const wb = XLSX.utils.book_new();
  const sheet = (name: string, rows: any[][], widths: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = widths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  sheet('Summary', [
    ['Student', r.student.name], ['Email', r.student.email], ['Batch', r.student.batchName], ['Period', r.period.label],
    ['Copy', r.copy === 'staff' ? 'Staff (includes drive results)' : 'Student copy'], [],
    ['Overall score', r.overall.hasData ? `${r.overall.score}/100` : 'No score'], ['Grade', r.overall.hasData ? r.overall.grade : ''], [],
    ['Area', 'Status', 'Detail'],
    ...r.glance.map((g) => [g.label, word[g.state], g.detail]),
    ['Placement drives', r.drives.length ? 'Attended' : 'None', `${r.drives.length} attended`],
  ], [22, 30, 30]);
  sheet('Week by week', [
    ['Week', 'Score', 'Classes', 'Quizzes', 'Assignments', 'Interviews', 'Communication Lab', 'Thinking Lab', 'Drives'],
    ...r.weeks.map((w) => [
      w.label, w.hasData ? w.score : '', w.classes.total ? `${w.classes.present}/${w.classes.total}` : '',
      w.quizzes.set ? `${w.quizzes.done}/${w.quizzes.set}` : '', w.assignments.set ? `${w.assignments.done}/${w.assignments.set}` : '',
      w.interviews.taken || w.interviews.absent ? `${w.interviews.taken} taken${w.interviews.absent ? `, ${w.interviews.absent} absent` : ''}` : '',
      w.communication.expected ? `${w.communication.done}/${w.communication.expected} days` : w.communication.active ? `${w.communication.active} days practised` : '',
      w.thinking.expected ? `${w.thinking.done}/${w.thinking.expected} days` : w.thinking.active ? `${w.thinking.active} days practised` : '',
      w.drives || '',
    ]),
  ], [16, 8, 10, 10, 13, 18, 20, 18, 8]);
  const workRows = (items: WorkItem[]) => items.map((i) => [i.title, i.date, dt(i.dueAt), word[i.status] === 'Not due yet' ? 'Open' : word[i.status], i.score ?? '', dt(i.doneAt)]);
  sheet('Quizzes', [['Quiz', 'Day', 'Due', 'Status', 'Score %', 'Taken on'], ...workRows(r.quizzes.items)], [34, 12, 22, 10, 8, 22]);
  sheet('Assignments', [['Assignment', 'Day', 'Due', 'Status', 'Score %', 'Submitted on'], ...workRows(r.assignments.items)], [34, 12, 22, 10, 8, 22]);
  sheet('Attendance', [['Day', 'Status'], ...r.attendance.log.map((x) => [x.date, x.status])], [12, 10]);
  sheet('Interviews', [['Day', 'Type', 'Title', 'Score %', 'Attendance', 'Mentor remarks'],
    ...r.interview.items.map((x) => [x.date, x.kind, x.title, x.score ?? '', x.absent ? 'Absent' : 'Attended', x.remarks])], [12, 14, 28, 8, 10, 50]);
  const scoreOn = (scores: { date: string; score: number }[], d: string) => { const xs = scores.filter((s) => s.date === d).map((s) => s.score); return xs.length ? avgOf(xs) : ''; };
  sheet('Communication Lab', [['Day', 'Expected', 'Done', 'AI score'],
    ...r.communication.days.filter((d) => d.expected || d.done).map((d) => [d.date, d.expected ? 'Yes' : 'No', d.done ? 'Yes' : 'No', scoreOn(r.communication.scores, d.date)])], [12, 10, 8, 10]);
  sheet('Thinking Lab', [['Day', 'Expected', 'Done', 'Score'],
    ...r.thinking.days.filter((d) => d.expected || d.done).map((d) => [d.date, d.expected ? 'Yes' : 'No', d.done ? 'Yes' : 'No', scoreOn(r.thinking.scores, d.date)])], [12, 10, 8, 10]);
  sheet('Drives', r.copy === 'staff'
    ? [['Day', 'Company', 'Role', 'Held', 'Result', 'Round reached', 'Offer (LPA)', 'Company feedback'],
      ...r.driveLog.map((d) => [d.day, d.company, d.role, d.mode, d.status || '', d.roundReached || '', d.offerCtc ?? '', d.companyFeedback || ''])]
    : [['Day', 'Company', 'Role', 'Held'], ...r.driveLog.map((d) => [d.day, d.company, d.role, d.mode])],
  [12, 24, 26, 14, 16, 16, 10, 50]);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export const periodFileName = (r: PeriodReport, ext: string) =>
  `report_${r.student.name.replace(/[^\w-]+/g, '-')}_${ymd(new Date(r.period.startISO))}_to_${ymd(new Date(r.period.endISO))}${r.copy === 'student' ? '_student-copy' : ''}.${ext}`;
