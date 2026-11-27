/**
 * Sending weekly reports — one student, a batch, every batch, or the Monday automatic run all
 * come through here, so each send is logged the same way and a batch send skips the same people.
 */
import WeeklyReportLog from '../models/WeeklyReportLog';
import User from '../models/User';
import Batch from '../models/Batch';
import { EmailService } from './emailService';
import { weeklyReportService, resolveWeek } from './weeklyReportService';
import type { WeeklyReportData } from './weeklyReportService';
import { getWeeklyReportEmailHtml, getWeeklyReportEmailText } from './weeklyReportEmailTemplate';
import { sendByPurpose } from './purposeMessaging';

export type Channel = 'email' | 'whatsapp';

export const channelsOf = (raw: unknown): Channel[] => {
  const list = Array.isArray(raw) ? raw : ['email'];
  const out = list.filter((c): c is Channel => c === 'email' || c === 'whatsapp');
  return out.length ? [...new Set(out)] : ['email'];
};

export const weeklyReportSubject = (r: WeeklyReportData) =>
  r.overall.hasData
    ? `Your weekly report: ${r.overall.score}/100 (${r.period.label}) — CodeBegun`
    : `Your weekly report (${r.period.label}) — CodeBegun`;

const labLine = (r: WeeklyReportData) => {
  const part = (name: string, w: WeeklyReportData['communication'] | WeeklyReportData['thinking']) =>
    w.expectedDays ? `${name} ${w.doneDays}/${w.expectedDays}` : w.activeDays ? `${name} ${w.activeDays}d` : '';
  return [part('Speaking', r.communication), part('Thinking', r.thinking)].filter(Boolean).join(' · ');
};

/**
 * WhatsApp carries the headline; the full report is the email. The template's parameter count is
 * fixed by Meta, so the labs ride on the last parameter (the score) rather than a new one.
 */
export const whatsappBody = (r: WeeklyReportData, weekLabel: string) => {
  const labs = labLine(r);
  return [
    r.student.firstName || 'there',
    weekLabel,
    r.practice ? `${r.practice.metDays} of ${r.practice.countedDays}` : 'not tracked',
    r.practice ? `${r.practice.pct}%` : '-',
    `${r.overall.score}/100${labs ? ` · Labs: ${labs}` : ''}`,
  ];
};

/** Send one student's report on the chosen channels and log each channel separately. */
export async function deliver(
  tenantId: string, report: WeeklyReportData, channels: Channel[], weekStart: Date, weekLabel: string,
  sentBy?: string, mailer?: EmailService,
) {
  const results: Record<string, { ok: boolean; error?: string }> = {};
  if (channels.includes('email')) {
    const ok = await (mailer || new EmailService(tenantId))
      .sendGenericEmail(report.student.email, weeklyReportSubject(report), getWeeklyReportEmailHtml(report), getWeeklyReportEmailText(report))
      .catch(() => false);
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

/** Active students of every active batch of the institute. */
export async function allBatchStudents(tenantId: string) {
  const batches = await Batch.find({ tenantId, isActive: true }).select('_id').lean();
  if (!batches.length) return [];
  return User.find({ tenantId, role: 'STUDENT', isActive: true, batchId: { $in: batches.map((b: any) => b._id) } })
    .select('_id email phone').lean();
}

export interface SendManyResult { total: number; sent: number; failed: number; skippedEmpty: number; skippedAlreadySent: number }

/**
 * Send to many students one after another (the email service throttles itself).
 *  - skipEmpty: leave out students with no activity and nothing expected that week;
 *  - skipAlreadySent: leave out students who already got this week's report on every chosen channel.
 */
export async function sendMany(
  tenantId: string, studentIds: string[],
  opts: { weekStart?: string; channels: Channel[]; sentBy?: string; skipEmpty?: boolean; skipAlreadySent?: boolean; label?: string },
): Promise<SendManyResult> {
  const { start, label } = resolveWeek(opts.weekStart);
  const out: SendManyResult = { total: studentIds.length, sent: 0, failed: 0, skippedEmpty: 0, skippedAlreadySent: 0 };

  let done = new Map<string, Set<string>>();
  if (opts.skipAlreadySent) {
    const logs = await WeeklyReportLog.find({ tenantId, weekStart: start, status: 'sent' }).select('studentId channel').lean();
    done = new Map();
    for (const l of logs) {
      const k = String(l.studentId);
      if (!done.has(k)) done.set(k, new Set());
      done.get(k)!.add(l.channel || 'email');
    }
  }

  const mailer = new EmailService(tenantId);
  for (const id of studentIds) {
    try {
      const had = done.get(String(id));
      const channels = had ? opts.channels.filter((c) => !had.has(c)) : opts.channels;
      if (!channels.length) { out.skippedAlreadySent++; continue; }
      const report = await weeklyReportService.getReport(String(id), tenantId, opts.weekStart);
      if (!report) continue;
      if (opts.skipEmpty && report.isEmpty) { out.skippedEmpty++; continue; }
      const res = await deliver(tenantId, report, channels, start, label, opts.sentBy, mailer);
      if (Object.values(res).some((r) => r.ok)) out.sent++; else out.failed++;
      if (channels.includes('whatsapp')) await new Promise((ok) => setTimeout(ok, 150));
    } catch (e: any) {
      out.failed++;
      console.error('[WEEKLY REPORT] send error for', id, e?.message);
    }
  }
  console.log(`[WEEKLY REPORT] ${opts.label || 'send'} done for ${tenantId}:`, JSON.stringify(out));
  return out;
}
