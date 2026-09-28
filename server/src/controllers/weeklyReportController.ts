import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { weeklyReportService, resolveWeek } from '../services/weeklyReportService';
import { getWeeklyReportEmailHtml } from '../services/weeklyReportEmailTemplate';
import { EmailService } from '../services/emailService';
import WeeklyReportLog from '../models/WeeklyReportLog';
import Batch from '../models/Batch';
import User from '../models/User';
import { estimateCost, purposeTemplate, sendByPurpose, waCostPerMessage } from '../services/purposeMessaging';
import type { WeeklyReportData } from '../services/weeklyReportService';

type Channel = 'email' | 'whatsapp';
const channelsOf = (raw: unknown): Channel[] => {
  const list = Array.isArray(raw) ? raw : ['email'];
  const out = list.filter((c): c is Channel => c === 'email' || c === 'whatsapp');
  return out.length ? out : ['email'];
};

/** WhatsApp carries the headline; the full report is the email. */
const whatsappBody = (r: WeeklyReportData, weekLabel: string) => [
  r.student.firstName || 'there',
  weekLabel,
  r.practice ? `${r.practice.metDays} of ${r.practice.countedDays}` : 'not tracked',
  r.practice ? `${r.practice.pct}%` : '-',
  `${r.overall.score}/100`,
];

/** Send one student's report on the chosen channels and log each channel separately. */
async function deliver(tenantId: string, report: WeeklyReportData, channels: Channel[], weekStart: Date, weekLabel: string, sentBy?: string, mailer?: EmailService) {
  const results: Record<string, { ok: boolean; error?: string }> = {};
  if (channels.includes('email')) {
    const ok = await (mailer || new EmailService(tenantId)).sendGenericEmail(report.student.email, SUBJECT, getWeeklyReportEmailHtml(report)).catch(() => false);
    results.email = { ok: !!ok, error: ok ? undefined : 'Email failed to send' };
    await WeeklyReportLog.create({
      tenantId, studentId: report.student.id, batchId: report.student.batchId || undefined, weekStart,
      email: report.student.email, score: report.overall.score, status: ok ? 'sent' : 'failed', channel: 'email', sentBy,
    });
  }
  if (channels.includes('whatsapp')) {
    const u: any = await User.findById(report.student.id).select('phone').lean();
    const r = await sendByPurpose(tenantId, u?.phone || '', 'WEEKLY_REPORT', whatsappBody(report, weekLabel));
    results.whatsapp = r;
    await WeeklyReportLog.create({
      tenantId, studentId: report.student.id, batchId: report.student.batchId || undefined, weekStart,
      email: report.student.email, phone: u?.phone, score: report.overall.score,
      status: r.ok ? 'sent' : 'failed', channel: 'whatsapp', error: r.ok ? undefined : r.error, sentBy,
    });
  }
  return results;
}

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

    const { start, label } = resolveWeek(weekStart);
    const sentBy = req.user?.id;

    res.json({ success: true, message: `Sending reports to ${students.length} student(s) by ${chosen.join(' + ')}…`, data: { queued: students.length } });

    (async () => {
      const mailer = new EmailService(tenantId);
      for (const s of students) {
        try {
          const report = await weeklyReportService.getReport(s._id.toString(), tenantId, weekStart);
          if (!report) continue;
          await deliver(tenantId, report, chosen, start, label, sentBy, mailer);
          if (chosen.includes('whatsapp')) await new Promise((ok) => setTimeout(ok, 150));
        } catch (e: any) {
          console.error('[WEEKLY REPORT] batch send error for', s.email, e?.message);
        }
      }
      console.log(`[WEEKLY REPORT] batch send complete for batch ${batchId} (${students.length} students, ${chosen.join('+')})`);
    })().catch(e => console.error('[WEEKLY REPORT] batch send crashed:', e?.message));
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to start batch send' });
  }
};

// GET /weekly-reports/estimate?batchId= — who each channel would reach, and the WhatsApp cost.
export const estimateBatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { batchId } = req.query as { batchId?: string };
    if (!batchId) return res.status(400).json({ success: false, message: 'batchId is required' });
    const students = await User.find({ tenantId, role: 'STUDENT', isActive: true, batchId }).select('email phone').lean();
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
