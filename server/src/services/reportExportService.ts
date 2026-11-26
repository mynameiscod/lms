/**
 * "Excel — everyone" for the custom-range report (2026-11-26): one .xlsx with a row per student
 * across one batch or every active batch, with filter buttons, frozen headers and coloured scores,
 * plus one sheet each for every quiz, assignment, interview and drive in the period.
 *
 * It takes a few seconds per student, so it runs in the background: start → poll progress →
 * download. Staff only (it is under the Weekly Reports permission), so drive results are included.
 */
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import User from '../models/User';
import Batch from '../models/Batch';
import ReportExport from '../models/ReportExport';
import { weeklyReportService, ymd } from './weeklyReportService';
import type { WeeklyReportData, GlanceItem } from './weeklyReportService';
import { parseRange, driveLog, DriveLogRow, PeriodRangeError } from './periodReportService';
import { polishXlsx, xlsxCol } from './xlsxPolish';

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const STALE_MS = 10 * 60_000;
const WORD: Record<string, string> = { done: 'Done', partial: 'Partly done', missed: 'Missed', pending: 'Not due yet', none: 'Nothing set' };

interface Row { batch: string; report: WeeklyReportData; drives: DriveLogRow[] }

/** Students in scope: every active student of one batch, or of every active batch. */
async function studentsInScope(tenantId: string, scope: string) {
  const batchFilter: any = { tenantId, isActive: true };
  if (scope !== 'all') {
    if (!mongoose.isValidObjectId(scope)) throw new PeriodRangeError('Pick a batch.');
    batchFilter._id = scope;
  }
  const batches: any[] = await Batch.find(batchFilter).select('name').lean();
  if (!batches.length) throw new PeriodRangeError(scope === 'all' ? 'There are no active batches.' : 'That batch was not found.');
  const names = new Map(batches.map((b) => [String(b._id), String(b.name || '')]));
  const users: any[] = await User.find({ tenantId, role: 'STUDENT', isActive: true, batchId: { $in: batches.map((b) => b._id) } })
    .select('firstName lastName batchId').lean();
  users.sort((a, b) => (names.get(String(a.batchId)) || '').localeCompare(names.get(String(b.batchId)) || '')
    || `${a.firstName} ${a.lastName || ''}`.localeCompare(`${b.firstName} ${b.lastName || ''}`));
  return { users, names, scopeName: scope === 'all' ? 'All batches' : names.get(scope) || 'Batch' };
}

/** Start an export. Returns the existing one when the same person already has the same one running. */
export async function startExport(tenantId: string, userId: string | undefined, scope: string, from: string, to: string) {
  const { start, end } = parseRange(from, to);
  const { users, names, scopeName } = await studentsInScope(tenantId, scope);
  if (!users.length) throw new PeriodRangeError('No active students in that selection.');

  const same = await ReportExport.findOne({ tenantId, createdBy: userId, scope, from, to, status: 'running', updatedAt: { $gt: new Date(Date.now() - STALE_MS) } }).lean();
  if (same) return same;

  const job = await ReportExport.create({ tenantId, createdBy: userId, scope, scopeName, from, to, total: users.length });
  build(String(job._id), tenantId, users, names, start, end, scopeName).catch(async (e) => {
    console.error('[REPORT EXPORT] failed', String(job._id), e?.message);
    await ReportExport.updateOne({ _id: job._id }, { $set: { status: 'failed', error: e?.message || 'Could not build the file' } }).catch(() => null);
  });
  return job.toObject();
}

async function build(jobId: string, tenantId: string, users: any[], names: Map<string, string>, start: Date, end: Date, scopeName: string) {
  const label = parseRange(ymd(start), ymd(end)).label;
  const rows: Row[] = new Array(users.length);
  let next = 0, done = 0, lastSave = 0;
  const worker = async () => {
    while (next < users.length) {
      const i = next++;
      const u = users[i];
      const report = await weeklyReportService.build(String(u._id), tenantId, start, end, label, true).catch(() => null);
      if (report) {
        const drives = await driveLog(tenantId, String(u._id), start, end, 'staff', report.drives).catch(() => []);
        rows[i] = { batch: names.get(String(u.batchId)) || '', report, drives };
      }
      done++;
      if (done - lastSave >= 5 || done === users.length) {
        lastSave = done;
        await ReportExport.updateOne({ _id: jobId }, { $set: { done } });
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);

  const file = workbook(rows.filter(Boolean), label, scopeName);
  if (file.length > MAX_FILE_BYTES) throw new Error('The file is too big. Pick one batch or a shorter range.');
  const fileName = `progress_${scopeName.replace(/[^\w-]+/g, '-')}_${ymd(start)}_to_${ymd(end)}.xlsx`;
  await ReportExport.updateOne({ _id: jobId }, { $set: { status: 'done', done: users.length, file, fileName } });
}

/** Progress of an export (marks one a restart left behind as failed). */
export async function exportStatus(tenantId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  const job: any = await ReportExport.findOne({ _id: id, tenantId }).lean();
  if (!job) return null;
  if (job.status === 'running' && Date.now() - new Date(job.updatedAt).getTime() > STALE_MS) {
    await ReportExport.updateOne({ _id: id }, { $set: { status: 'failed', error: 'The server restarted while building the file. Please start it again.' } });
    job.status = 'failed'; job.error = 'The server restarted while building the file. Please start it again.';
  }
  return { id: String(job._id), status: job.status, done: job.done, total: job.total, fileName: job.fileName || '', error: job.error || '', scopeName: job.scopeName, from: job.from, to: job.to };
}

export async function exportFile(tenantId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  const job: any = await ReportExport.findOne({ _id: id, tenantId, status: 'done' }).select('+file fileName').lean();
  if (!job?.file) return null;
  return { fileName: job.fileName as string, file: Buffer.from(job.file.buffer || job.file) };
}

// ── the workbook ─────────────────────────────────────────────────────────
const dayDate = (ymdStr: string) => (/^\d{4}-\d{2}-\d{2}$/.test(ymdStr) ? new Date(`${ymdStr}T00:00:00`) : ymdStr || '');
const num = (v: number | null | undefined) => (typeof v === 'number' && isFinite(v) ? v : '');
const g = (r: WeeklyReportData, key: string): GlanceItem | undefined => r.glance.find((x) => x.key === key);

export function workbook(rows: Row[], label: string, scopeName: string): Buffer {
  const wb = XLSX.utils.book_new();
  const add = (name: string, aoa: any[][], widths: number[]) => {
    // '' → a truly blank cell, so Excel's filters list it as (Blanks) rather than as text.
    const clean = aoa.map((r) => r.map((v) => (v === '' ? null : v)));
    const ws = XLSX.utils.aoa_to_sheet(clean, { cellDates: true, dateNF: 'dd mmm yyyy' } as any);
    ws['!cols'] = widths.map((w) => ({ wch: w }));
    if (aoa.length > 1) ws['!autofilter'] = { ref: `A1:${xlsxCol(aoa[0].length - 1)}${aoa.length}` };
    XLSX.utils.book_append_sheet(wb, ws, name);
    return { cols: aoa[0].length, rows: aoa.length };
  };

  // 1. Students — numbers you can filter, plus the status words.
  const head = [
    'Batch', 'Student', 'Email', 'Score', 'Grade', 'Areas missed',
    'Attendance %', 'Classes attended', 'Classes held',
    'Quizzes set', 'Quizzes done', 'Quizzes missed', 'Quiz average %',
    'Assignments set', 'Assignments submitted', 'Assignments missed', 'Assignment average %',
    'Interviews taken', 'Interviews absent', 'Interview average %',
    'Speaking days expected', 'Speaking days done', 'Speaking days missed', 'Recordings', 'Speaking AI score',
    'Thinking days expected', 'Thinking days done', 'Thinking days missed', 'Thinking solved', 'Thinking average score',
    'Drives attended',
    'Classes', 'Quizzes', 'Assignments', 'Mock interview', 'Communication Lab', 'Thinking Lab',
  ];
  const students = rows.map(({ batch, report: r }) => [
    batch, r.student.name, r.student.email, r.overall.hasData ? r.overall.score : '', r.overall.hasData ? r.overall.grade : '',
    r.glance.filter((x) => x.state === 'missed').length,
    r.attendance.totalClasses ? r.attendance.percentage : '', r.attendance.present, r.attendance.totalClasses,
    r.quizzes.assigned, r.quizzes.attempted, r.quizzes.missed, r.quizzes.attempted ? r.quizzes.avgScore : '',
    r.assignments.assigned, r.assignments.submitted, r.assignments.missed, r.assignments.scoredCount ? r.assignments.avgScore : '',
    r.interview.taken, r.interview.absent, r.interview.taken ? r.interview.avgScore : '',
    r.communication.expectedDays, r.communication.doneDays, r.communication.missedDays, r.communication.recordings, num(r.communication.avgScore),
    r.thinking.expectedDays, r.thinking.doneDays, r.thinking.missedDays, r.thinking.solved, num(r.thinking.avgScore),
    r.drives.length,
    ...['classes', 'quizzes', 'assignments', 'interview', 'communication', 'thinking'].map((k) => WORD[g(r, k)?.state || 'none']),
  ]);
  const s1 = add('Students', [head, ...students], [18, 22, 28, 7, 7, 8, 9, 9, 8, 8, 8, 8, 9, 9, 10, 9, 10, 9, 9, 9, 10, 9, 9, 9, 9, 10, 9, 9, 8, 9, 8, 12, 12, 12, 12, 14, 12]);
  const last = Math.max(2, s1.rows);
  const col = (name: string) => xlsxCol(head.indexOf(name));
  const rng = (name: string) => `${col(name)}2:${col(name)}${last}`;

  // 2–5. One row per item, so you can filter e.g. every missed quiz.
  const workSheet = (title: string, pick: (r: WeeklyReportData) => WeeklyReportData['quizzes']['items']) => add(title, [
    ['Batch', 'Student', 'Email', title === 'Quizzes' ? 'Quiz' : 'Assignment', 'Day', 'Due', 'Status', 'Score %'],
    ...rows.flatMap(({ batch, report: r }) => pick(r).map((i) => [
      batch, r.student.name, r.student.email, i.title, dayDate(i.date), i.dueAt ? new Date(i.dueAt) : '',
      i.status === 'done' ? 'Done' : i.status === 'missed' ? 'Missed' : 'Open', num(i.score),
    ])),
  ], [18, 22, 28, 34, 12, 14, 9, 8]);
  const s2 = workSheet('Quizzes', (r) => r.quizzes.items);
  const s3 = workSheet('Assignments', (r) => r.assignments.items);
  const s4 = add('Interviews', [
    ['Batch', 'Student', 'Email', 'Day', 'Type', 'Title', 'Attendance', 'Score %', 'Mentor remarks'],
    ...rows.flatMap(({ batch, report: r }) => r.interview.items.map((x) => [
      batch, r.student.name, r.student.email, dayDate(x.date), x.kind, x.title, x.absent ? 'Absent' : 'Attended', num(x.score), x.remarks,
    ])),
  ], [18, 22, 28, 12, 14, 26, 10, 8, 50]);
  const s5 = add('Drives', [
    ['Batch', 'Student', 'Email', 'Day', 'Company', 'Role', 'Held', 'Result', 'Round reached', 'Offer (LPA)', 'Company feedback'],
    ...rows.flatMap(({ batch, report: r, drives }) => drives.map((d) => [
      batch, r.student.name, r.student.email, dayDate(d.day), d.company, d.role, d.mode, d.status || '', d.roundReached || '', num(d.offerCtc ?? null), d.companyFeedback || '',
    ])),
  ], [18, 22, 28, 12, 22, 24, 12, 16, 14, 10, 50]);
  add('About', [
    ['Student progress report'], [],
    ['Period', label], ['Students', scopeName], ['Generated', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })], ['Students in file', rows.length], [],
    ['How to read it'],
    ['Students', 'One row per student. Use the filter buttons on the header row, e.g. Score less than 50, or Communication Lab = Missed.'],
    ['Score', 'Quizzes 25, assignments 25, attendance 15, interviews 15, each lab 10 — only areas that applied in the period count. Empty = nothing was scored.'],
    ['Lab days expected', 'Days the batch had a challenge set; else the Daily Practice Pass working days; else 0 (nothing marked missed).'],
    ['Quizzes / Assignments / Interviews / Drives', 'One row per item in the period, across every student.'],
    ['Drive results', 'Staff copy: includes results, offers and company feedback. Do not share this file with students.'],
  ], [26, 110]);

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellDates: true } as any) as Buffer;
  const hdr = (n: number) => `A1:${xlsxCol(n - 1)}1`;
  return polishXlsx(buf, [
    {
      sheet: 1, freezeCols: 2, freezeRows: 1, header: hdr(s1.cols),
      scores: [rng('Score'), rng('Quiz average %'), rng('Assignment average %'), rng('Interview average %'), rng('Speaking AI score'), rng('Thinking average score'), rng('Attendance %')],
      statuses: [`${col('Classes')}2:${col('Thinking Lab')}${last}`],
      badCounts: [rng('Areas missed'), rng('Quizzes missed'), rng('Assignments missed'), rng('Interviews absent'), rng('Speaking days missed'), rng('Thinking days missed')],
    },
    { sheet: 2, freezeCols: 2, freezeRows: 1, header: hdr(s2.cols), scores: [`H2:H${Math.max(2, s2.rows)}`], statuses: [`G2:G${Math.max(2, s2.rows)}`] },
    { sheet: 3, freezeCols: 2, freezeRows: 1, header: hdr(s3.cols), scores: [`H2:H${Math.max(2, s3.rows)}`], statuses: [`G2:G${Math.max(2, s3.rows)}`] },
    { sheet: 4, freezeCols: 2, freezeRows: 1, header: hdr(s4.cols), scores: [`H2:H${Math.max(2, s4.rows)}`] },
    { sheet: 5, freezeCols: 2, freezeRows: 1, header: hdr(s5.cols) },
  ]);
}
