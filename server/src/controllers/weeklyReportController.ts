import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { weeklyReportService, resolveWeek } from '../services/weeklyReportService';
import { getWeeklyReportEmailHtml } from '../services/weeklyReportEmailTemplate';
import { EmailService } from '../services/emailService';
import WeeklyReportLog from '../models/WeeklyReportLog';
import Batch from '../models/Batch';

const SUBJECT = 'Your Weekly Learning Report — CodeBegun';

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
      .select('studentId sentAt status')
      .lean();
    const lastSent: Record<string, { sentAt: Date; status: string }> = {};
    logs.forEach(l => { const id = l.studentId.toString(); if (!lastSent[id]) lastSent[id] = { sentAt: l.sentAt, status: l.status }; });

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
    const { studentId, weekStart } = req.body as { studentId: string; weekStart?: string };
    if (!studentId) return res.status(400).json({ success: false, message: 'studentId is required' });

    const report = await weeklyReportService.getReport(studentId, tenantId, weekStart);
    if (!report) return res.status(404).json({ success: false, message: 'Student not found' });

    const { start } = resolveWeek(weekStart);
    const mailer = new EmailService(tenantId);
    const ok = await mailer.sendGenericEmail(report.student.email, SUBJECT, getWeeklyReportEmailHtml(report));

    await WeeklyReportLog.create({
      tenantId, studentId, batchId: report.student.batchId || undefined,
      weekStart: start, email: report.student.email, score: report.overall.score,
      status: ok ? 'sent' : 'failed', sentBy: req.user?.id,
    });

    if (!ok) return res.status(502).json({ success: false, message: 'Email failed to send' });
    res.json({ success: true, message: `Report sent to ${report.student.email}` });
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
    const { batchId, weekStart } = req.body as { batchId: string; weekStart?: string };
    if (!batchId) return res.status(400).json({ success: false, message: 'batchId is required' });

    const students = await weeklyReportService.getBatchStudents(tenantId, batchId);
    if (!students.length) return res.status(400).json({ success: false, message: 'No active students in this batch' });

    const { start } = resolveWeek(weekStart);
    const sentBy = req.user?.id;

    // Respond right away — bulk sending happens in the background.
    res.json({ success: true, message: `Sending reports to ${students.length} student(s)…`, data: { queued: students.length } });

    (async () => {
      const mailer = new EmailService(tenantId);
      for (const s of students) {
        try {
          const report = await weeklyReportService.getReport(s._id.toString(), tenantId, weekStart);
          if (!report) continue;
          const ok = await mailer.sendGenericEmail(report.student.email, SUBJECT, getWeeklyReportEmailHtml(report));
          await WeeklyReportLog.create({
            tenantId, studentId: s._id, batchId, weekStart: start,
            email: report.student.email, score: report.overall.score,
            status: ok ? 'sent' : 'failed', sentBy,
          });
        } catch (e: any) {
          console.error('[WEEKLY REPORT] batch send error for', s.email, e?.message);
        }
      }
      console.log(`[WEEKLY REPORT] batch send complete for batch ${batchId} (${students.length} students)`);
    })().catch(e => console.error('[WEEKLY REPORT] batch send crashed:', e?.message));
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to start batch send' });
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
