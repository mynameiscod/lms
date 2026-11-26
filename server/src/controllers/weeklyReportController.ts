import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { weeklyReportService, resolveWeek } from '../services/weeklyReportService';
import { getWeeklyReportEmailHtml } from '../services/weeklyReportEmailTemplate';
import WeeklyReportLog from '../models/WeeklyReportLog';
import WeeklyReportSetting from '../models/WeeklyReportSetting';
import Batch from '../models/Batch';
import User from '../models/User';
import { estimateCost, purposeTemplate, waCostPerMessage } from '../services/purposeMessaging';
import { channelsOf, deliver, sendMany, allBatchStudents } from '../services/weeklyReportSender';
import { getPeriodReport, getBatchPeriodSummaries, searchStudents, parseRange, periodReportXlsx, periodFileName, PeriodRangeError, ReportCopy } from '../services/periodReportService';
import { periodReportPdf } from '../services/periodReportPdf';
import { startExport, exportStatus, exportFile } from '../services/reportExportService';

// GET /weekly-reports/summaries?batchId=&weekStart=
// Per-student score/grade for a batch+week, plus whether/when each was already sent.
export const getBatchSummaries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { batchId, weekStart } = req.query as { batchId?: string; weekStart?: string };
    if (!batchId) return res.status(400).json({ success: false, message: 'batchId is required' });

    const { start, end, label } = resolveWeek(weekStart);
    const summaries = await weeklyReportService.getBatchSummaries(tenantId, batchId, weekStart);

    // Attach last-sent info for this exact week
    const logs = await WeeklyReportLog.find({ tenantId, batchId, weekStart: start })
      .sort({ sentAt: -1 })
      .select('studentId sentAt status channel')
      .lean();
    const lastSent: Record<string, { sentAt: Date; status: string; channels: string[] }> = {};
    logs.forEach(l => {
      const id = l.studentId.toString();
      if (!lastSent[id]) lastSent[id] = { sentAt: l.sentAt, status: l.status, channels: [] };
      const ch = `${l.channel || 'email'}${l.status === 'sent' ? '' : ' (failed)'}`;
      if (!lastSent[id].channels.includes(ch)) lastSent[id].channels.push(ch);
    });

    res.json({
      success: true,
      data: {
        week: { startISO: start.toISOString(), endISO: end.toISOString(), label },
        students: summaries.map(s => ({ ...s, lastSent: lastSent[s.id] || null })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load summaries' });
  }
};

// GET /weekly-reports/student/:studentId?weekStart=  → structured report data
export const getStudentReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { studentId } = req.params;
    const { weekStart } = req.query as { weekStart?: string };
    const report = await weeklyReportService.getReport(studentId, tenantId, weekStart);
    if (!report) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load report' });
  }
};

// GET /weekly-reports/student/:studentId/preview?weekStart=  → rendered HTML (for iframe preview)
export const getStudentReportHtml = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { studentId } = req.params;
    const { weekStart } = req.query as { weekStart?: string };
    const report = await weeklyReportService.getReport(studentId, tenantId, weekStart);
    if (!report) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: { html: getWeeklyReportEmailHtml(report) } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to render report' });
  }
};

// POST /weekly-reports/send  { studentId, weekStart }  → send to one student
export const sendToStudent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { studentId, weekStart, channels } = req.body as { studentId: string; weekStart?: string; channels?: string[] };
    if (!studentId) return res.status(400).json({ success: false, message: 'studentId is required' });
    const chosen = channelsOf(channels);
    if (chosen.includes('whatsapp') && !purposeTemplate(tenantId, 'WEEKLY_REPORT') && chosen.length === 1) {
      return res.status(400).json({ success: false, message: 'No WhatsApp template is assigned for "Weekly learning report" (WhatsApp Templates → Where used).' });
    }

    const report = await weeklyReportService.getReport(studentId, tenantId, weekStart);
    if (!report) return res.status(404).json({ success: false, message: 'Student not found' });

    const { start, label } = resolveWeek(weekStart);
    const results = await deliver(tenantId, report, chosen, start, label, req.user?.id);
    const failed = Object.entries(results).filter(([, r]) => !r.ok);
    if (failed.length === Object.keys(results).length) {
      return res.status(502).json({ success: false, message: failed.map(([c, r]) => `${c}: ${r.error}`).join(' · ') });
    }
    const sent = Object.entries(results).filter(([, r]) => r.ok).map(([c]) => c).join(' + ');
    res.json({ success: true, message: `Report sent to ${report.student.name} by ${sent}${failed.length ? ` (${failed.map(([c, r]) => `${c} failed: ${r.error}`).join('; ')})` : ''}`, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to send report' });
  }
};

// POST /weekly-reports/send-batch  { batchId, weekStart }  → send to every student in the batch
// Responds immediately; sends run in the background (the email service self-throttles ~3s/send)
// and each result is logged so the UI can reflect sent status on refresh.
export const sendToBatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { batchId, weekStart, channels } = req.body as { batchId: string; weekStart?: string; channels?: string[] };
    if (!batchId) return res.status(400).json({ success: false, message: 'batchId is required' });
    const chosen = channelsOf(channels);
    if (chosen.includes('whatsapp') && !purposeTemplate(tenantId, 'WEEKLY_REPORT')) {
      return res.status(400).json({ success: false, message: 'No WhatsApp template is assigned for "Weekly learning report" (WhatsApp Templates → Where used). Untick WhatsApp or assign one.' });
    }

    const students = await weeklyReportService.getBatchStudents(tenantId, batchId);
    if (!students.length) return res.status(400).json({ success: false, message: 'No active students in this batch' });

    res.json({ success: true, message: `Sending reports to ${students.length} student(s) by ${chosen.join(' + ')}… Students with nothing this week are skipped.`, data: { queued: students.length } });

    // In the background (the email service self-throttles); each result is logged so the page
    // shows the sent status on refresh.
    sendMany(tenantId, students.map((s: any) => String(s._id)), {
      weekStart, channels: chosen, sentBy: req.user?.id, skipEmpty: true, label: `batch ${batchId}`,
    }).catch(e => console.error('[WEEKLY REPORT] batch send crashed:', e?.message));
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to start batch send' });
  }
};

// POST /weekly-reports/send-all  { weekStart, channels } → every active student of every active
// batch. Skips students with nothing this week and those who already got this week's report.
export const sendToAll = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { weekStart, channels } = req.body as { weekStart?: string; channels?: string[] };
    const chosen = channelsOf(channels);
    if (chosen.includes('whatsapp') && !purposeTemplate(tenantId, 'WEEKLY_REPORT')) {
      return res.status(400).json({ success: false, message: 'No WhatsApp template is assigned for "Weekly learning report" (WhatsApp Templates → Where used). Untick WhatsApp or assign one.' });
    }
    const students = await allBatchStudents(tenantId);
    if (!students.length) return res.status(400).json({ success: false, message: 'No active students in any active batch' });

    res.json({
      success: true,
      message: `Sending reports to up to ${students.length} student(s) across all batches by ${chosen.join(' + ')}… Students with nothing this week, and those who already got this week's report, are skipped.`,
      data: { queued: students.length },
    });
    sendMany(tenantId, students.map((s: any) => String(s._id)), {
      weekStart, channels: chosen, sentBy: req.user?.id, skipEmpty: true, skipAlreadySent: true, label: 'all batches',
    }).catch(e => console.error('[WEEKLY REPORT] send-all crashed:', e?.message));
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to start sending' });
  }
};

// GET /weekly-reports/settings — the institute's automatic Monday send.
export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const row: any = await WeeklyReportSetting.findOne({ tenantId: req.tenantId! }).lean();
    res.json({ success: true, data: {
      autoSend: !!row?.autoSend,
      channels: row?.channels?.length ? row.channels : ['email'],
      lastAutoWeek: row?.lastAutoWeek || null,
      lastAutoAt: row?.lastAutoAt || null,
      lastAutoResult: row?.lastAutoResult || null,
      whatsappTemplateReady: !!purposeTemplate(req.tenantId!, 'WEEKLY_REPORT'),
    } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load settings' });
  }
};

// PUT /weekly-reports/settings  { autoSend, channels }
export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { autoSend, channels } = req.body as { autoSend?: boolean; channels?: string[] };
    const chosen = channelsOf(channels);
    if (autoSend && chosen.includes('whatsapp') && !purposeTemplate(tenantId, 'WEEKLY_REPORT')) {
      return res.status(400).json({ success: false, message: 'No WhatsApp template is assigned for "Weekly learning report". Untick WhatsApp or assign one first.' });
    }
    const set: any = { autoSend: !!autoSend, channels: chosen, updatedBy: req.user?.id };
    // Switching on mid-week must not send last week's report straight away when it was already
    // handled by hand: the first automatic run is next Monday.
    if (autoSend) {
      const prev: any = await WeeklyReportSetting.findOne({ tenantId }).select('autoSend').lean();
      if (!prev?.autoSend) {
        const { start } = resolveWeek();
        set.lastAutoWeek = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      }
    }
    await WeeklyReportSetting.updateOne({ tenantId }, { $set: set }, { upsert: true });
    res.json({ success: true, message: autoSend ? 'Automatic Monday reports are on. The first ones go out next Monday morning.' : 'Automatic Monday reports are off.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to save settings' });
  }
};

// GET /weekly-reports/estimate?batchId= — who each channel would reach, and the WhatsApp cost.
export const estimateBatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { batchId } = req.query as { batchId?: string };
    if (!batchId) return res.status(400).json({ success: false, message: 'batchId is required' });
    const students: any[] = batchId === 'all'
      ? await allBatchStudents(tenantId)
      : await User.find({ tenantId, role: 'STUDENT', isActive: true, batchId }).select('email phone').lean();
    const withPhone = students.filter((u: any) => u.phone).length;
    res.json({ success: true, data: {
      students: students.length,
      withEmail: students.filter((u: any) => u.email).length,
      withPhone,
      whatsappTemplateReady: !!purposeTemplate(tenantId, 'WEEKLY_REPORT'),
      costPerMessageInr: waCostPerMessage(tenantId),
      whatsappCostInr: estimateCost(tenantId, withPhone),
    } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to estimate' });
  }
};

// GET /weekly-reports/batches — active batches for the tenant (picker)
export const getBatches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const batches = await Batch.find({ tenantId, isActive: true }).select('name').sort({ name: 1 }).lean();
    res.json({ success: true, data: batches });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load batches' });
  }
};

// ── Custom-range student report (2026-11-26) ─────────────────────────────
// GET /weekly-reports/students?q=  → student picker
export const searchStudentsForReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ success: true, data: await searchStudents(req.tenantId!, String(req.query.q || '')) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to search students' });
  }
};

const copyOf = (v: unknown): ReportCopy => (v === 'student' ? 'student' : 'staff');
const rangeFail = (res: Response, err: any, fallback: string) =>
  err instanceof PeriodRangeError
    ? res.status(400).json({ success: false, message: err.message })
    : res.status(500).json({ success: false, message: err?.message || fallback });

// GET /weekly-reports/period/student/:studentId?from=&to=&copy=staff|student[&format=pdf|xlsx]
export const getStudentPeriodReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from, to, copy, format } = req.query as Record<string, string | undefined>;
    if (!/^[a-f0-9]{24}$/i.test(req.params.studentId)) return res.status(404).json({ success: false, message: 'Student not found' });
    const report = await getPeriodReport(req.tenantId!, req.params.studentId, from || '', to || '', copyOf(copy));
    if (!report) return res.status(404).json({ success: false, message: 'Student not found' });
    if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${periodFileName(report, 'xlsx')}"`);
      return res.send(periodReportXlsx(report));
    }
    if (format === 'pdf') {
      const pdf = await periodReportPdf(req.tenantId!, report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${periodFileName(report, 'pdf')}"`);
      return res.send(pdf);
    }
    res.json({ success: true, data: report });
  } catch (err: any) {
    rangeFail(res, err, 'Failed to build the report');
  }
};

// GET /weekly-reports/period/batch?batchId=&from=&to=  → "who did what" over the range
export const getBatchPeriodReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId, from, to } = req.query as Record<string, string | undefined>;
    if (!batchId) return res.status(400).json({ success: false, message: 'batchId is required' });
    const { label } = parseRange(from, to);
    res.json({ success: true, data: { label, students: await getBatchPeriodSummaries(req.tenantId!, batchId, from || '', to || '') } });
  } catch (err: any) {
    rangeFail(res, err, 'Failed to build the batch report');
  }
};

// ── Excel for everyone (2026-11-26) ──────────────────────────────────────
// POST /weekly-reports/period/export  { scope: 'all' | batchId, from, to } → starts building
export const startPeriodExport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { scope, from, to } = req.body as { scope?: string; from?: string; to?: string };
    const job: any = await startExport(req.tenantId!, req.user?.id, String(scope || 'all'), String(from || ''), String(to || ''));
    res.json({ success: true, data: { id: String(job._id), status: job.status, done: job.done, total: job.total } });
  } catch (err: any) {
    rangeFail(res, err, 'Could not start the export');
  }
};

// GET /weekly-reports/period/export/:id → progress
export const getPeriodExport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const s = await exportStatus(req.tenantId!, req.params.id);
    if (!s) return res.status(404).json({ success: false, message: 'Export not found' });
    res.json({ success: true, data: s });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to read the export' });
  }
};

// GET /weekly-reports/period/export/:id/file → the .xlsx
export const downloadPeriodExport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const f = await exportFile(req.tenantId!, req.params.id);
    if (!f) return res.status(404).json({ success: false, message: 'The file is not ready or has expired' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${f.fileName}"`);
    res.send(f.file);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Download failed' });
  }
};
