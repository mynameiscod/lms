import mongoose from 'mongoose';
import WhatsAppMessageLog, { WaMessageStatus } from '../models/WhatsAppMessageLog';

/**
 * WhatsApp delivery tracking: record each template send, then apply Meta's status reports to it,
 * so the Templates screen can say "Delivered" or "Failed — <why>" instead of nothing.
 */

/**
 * Meta's error codes, said the way an admin needs them: what happened and what to do.
 * https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 */
const EXPLAIN: Record<number, string> = {
  131049: 'Meta held this marketing message back to protect the recipient (per-person marketing limit). Use a UTILITY template for results and notices, or try again after they message you.',
  131050: 'The recipient has turned off marketing messages from businesses.',
  131026: 'Not deliverable: the number is not on WhatsApp, has an outdated app, or has not accepted the latest terms.',
  131047: 'More than 24 hours since the person last messaged you — only an approved template can be sent.',
  131021: 'The recipient is the same number as the sender.',
  131056: 'Too many messages to this number in a short time. Wait and retry.',
  131048: 'Spam rate limit hit: too many messages were blocked or reported. Slow down and review the template.',
  131051: 'Unsupported message type.',
  131052: 'Media in the message could not be downloaded.',
  131053: 'Media in the message could not be uploaded.',
  130472: 'Meta is running an experiment on this number and did not deliver marketing messages to it.',
  130429: 'Meta’s sending rate limit was reached. Retry later.',
  131000: 'Meta could not send the message (generic error). Retry; if it repeats, check the template and the account.',
  131008: 'A required template value was missing.',
  131009: 'A template value was not valid.',
  132000: 'The number of template values does not match the approved template.',
  132001: 'The template does not exist in this language, or is not approved yet.',
  132005: 'The filled-in text is too long for this template.',
  132007: 'The filled-in text breaks a WhatsApp content policy.',
  132015: 'The template is paused because of low quality.',
  132016: 'The template is disabled because of low quality.',
  131042: 'WhatsApp billing problem: Meta could not charge the payment method, so it is blocking ALL template messages (OTPs, broadcasts, stage messages). Fix: Meta Business Manager → Billing & payments → Payment activity: pay the failed bill, or fix/replace the card under Payment methods. Sending resumes shortly after payment.',
  368: 'The WhatsApp account is temporarily restricted for policy violations.',
  190: 'The WhatsApp access token has expired or is invalid — reconnect WhatsApp in Settings.',
};
export const explainWaError = (code?: number, fallback?: string): string =>
  (code && EXPLAIN[code]) || fallback || 'Meta did not say why.';

/** sent → delivered → read only ever moves forward; a late "sent" must not undo "read". */
const RANK: Record<WaMessageStatus, number> = { accepted: 0, sent: 1, delivered: 2, read: 3, failed: 1 };

export async function recordSend(input: {
  tenantId: string; to: string; templateName: string; templateId?: any;
  source: 'test' | 'broadcast' | 'system'; broadcastId?: any; sentBy?: string;
  result: { ok: boolean; messageId?: string; error?: string; errorCode?: number };
}): Promise<void> {
  const { result } = input;
  try {
    await WhatsAppMessageLog.create({
      tenantId: input.tenantId,
      to: input.to,
      templateName: input.templateName,
      templateId: input.templateId,
      source: input.source,
      broadcastId: input.broadcastId,
      sentBy: input.sentBy && mongoose.Types.ObjectId.isValid(input.sentBy) ? input.sentBy : undefined,
      ...(result.ok
        ? { wamid: result.messageId, status: 'accepted' as const }
        : { status: 'failed' as const, errorCode: result.errorCode, errorTitle: 'Refused by Meta', errorDetail: result.error, statusAt: new Date() }),
    });
  } catch (e: any) {
    // Logging must never fail a send.
    console.error('[wa-delivery] could not record send:', e?.message);
  }
}

type MetaStatus = {
  id: string; status: string; timestamp?: string; recipient_id?: string;
  errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>;
};

/** Apply the `statuses` array of a Meta webhook. Unknown wamids (other senders) are ignored. */
export async function applyDeliveryStatuses(statuses: MetaStatus[]): Promise<number> {
  let updated = 0;
  for (const s of statuses || []) {
    const status = s.status as WaMessageStatus;
    if (!s.id || !['sent', 'delivered', 'read', 'failed'].includes(status)) continue;
    const row = await WhatsAppMessageLog.findOne({ wamid: s.id });
    if (!row) continue;
    const at = s.timestamp ? new Date(Number(s.timestamp) * 1000) : new Date();
    if (status === 'failed') {
      // A failure after delivery is not possible; one after "sent" is the normal shape of it.
      if (row.status === 'delivered' || row.status === 'read') continue;
      const err = s.errors?.[0];
      row.status = 'failed';
      row.errorCode = err?.code;
      row.errorTitle = err?.title || err?.message;
      row.errorDetail = err?.error_data?.details;
    } else {
      if (row.status !== 'failed' && RANK[status] <= RANK[row.status]) continue;
      if (row.status === 'failed') continue;
      row.status = status;
    }
    row.statusAt = at;
    await row.save();
    updated++;
  }
  return updated;
}

/**
 * The last 24 hours at a glance: how many messages went out, how many failed, and why, so an admin
 * sees a problem (a dead token, an unapproved template, a spike of unreachable numbers) without
 * scrolling the list.
 */
/** What to do about the common failures, in plain words (shown under each reason). */
const ADVICE: Record<number, string> = {
  131049: 'Send results, reminders and notices as UTILITY templates. Send MARKETING only to people who wrote to you recently or asked for updates, and never the same promotion twice in a week (keep "Skip people already sent" ticked).',
  131050: 'They switched off marketing from businesses. Stop sending them marketing; utility messages still work.',
  131026: 'Check the number first: an Indian mobile is +91 followed by 10 digits. If the format is right, the person is not on WhatsApp (or must update the app) — call or SMS instead.',
  130472: 'Nothing to fix. Meta keeps a small random group out of marketing messages as an experiment. Use a UTILITY template for anything important.',
  131047: 'Their 24-hour window has closed. Send an approved template instead of a free-text reply.',
  131048: 'Too many people blocked or reported recent messages. Slow down, send to fewer people, and make the template clearly useful.',
  132001: 'The template is not approved in this language yet. Sync from Meta and pick an approved one.',
  131042: 'Pay the failed WhatsApp bill in Meta Business Manager → Billing & payments.',
  190: 'Reconnect WhatsApp: the access token has expired.',
};
const DAY_MS = 24 * 3600 * 1000;
const VALID_IN = /^91[6-9]\d{9}$/;

/**
 * Sends over the last `days` days at a glance: totals by outcome, the change against the period
 * before, and the most common failure reasons with what to do about each.
 */
export async function deliverySummary(tenantId: string, days = 1) {
  const span = Math.min(Math.max(Math.round(days) || 1, 1), 90) * DAY_MS;
  const tid = new mongoose.Types.ObjectId(tenantId);
  const since = new Date(Date.now() - span);
  const match = { tenantId: tid, createdAt: { $gte: since } };
  const [byStatus, prevTotal, failedRows, failedTo] = await Promise.all([
    WhatsAppMessageLog.aggregate([{ $match: match }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    WhatsAppMessageLog.countDocuments({ tenantId: tid, createdAt: { $gte: new Date(since.getTime() - span), $lt: since } }),
    WhatsAppMessageLog.aggregate([
      { $match: { ...match, status: 'failed' } },
      { $group: { _id: { code: '$errorCode', title: '$errorTitle', detail: '$errorDetail' }, count: { $sum: 1 }, last: { $max: '$createdAt' }, templates: { $addToSet: '$templateName' } } },
      { $sort: { count: -1 } }, { $limit: 6 },
    ]),
    WhatsAppMessageLog.distinct('to', { ...match, status: 'failed' }),
  ]);
  const n = (k: string) => (byStatus.find((r: any) => r._id === k) as any)?.n || 0;
  const reasons = failedRows.map((r: any) => ({
    code: r._id.code, count: r.count, last: r.last,
    reason: explainWaError(r._id.code, r._id.title || r._id.detail),
    advice: (r._id.code && ADVICE[r._id.code]) || '',
    templates: (r.templates || []).slice(0, 4),
  }));
  const total = byStatus.reduce((t: number, r: any) => t + r.n, 0);
  return {
    days: span / DAY_MS,
    total, prevTotal,
    delivered: n('delivered') + n('read'),
    read: n('read'),
    failed: n('failed'),
    pending: n('accepted') + n('sent'),
    /** Failed numbers that are not a valid Indian mobile (+91 and 10 digits starting 6–9). */
    badNumbers: (failedTo as string[]).filter((p) => String(p).startsWith('91') && !VALID_IN.test(String(p))).length,
    reasons,
  };
}

/** Recent sends for the Templates screen, newest first, with a plain-English reason on failures. */
export async function listMessages(tenantId: string, q: { phone?: string; templateId?: string; limit?: number; status?: string; source?: string; days?: number; q?: string }) {
  const filter: any = { tenantId };
  if (q.status === 'delivered') filter.status = { $in: ['delivered', 'read'] };
  else if (q.status === 'pending') filter.status = { $in: ['accepted', 'sent'] };
  else if (['failed', 'read'].includes(String(q.status))) filter.status = q.status;
  if (['test', 'broadcast', 'system'].includes(String(q.source))) filter.source = q.source;
  if (q.days && Number(q.days) > 0) filter.createdAt = { $gte: new Date(Date.now() - Math.min(Number(q.days), 365) * DAY_MS) };
  const text = String(q.q || '').trim();
  if (text) {
    const digits = text.replace(/\D/g, '');
    filter.$or = [
      { templateName: { $regex: text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      ...(digits.length >= 4 ? [{ to: { $regex: digits } }] : []),
    ];
  }
  if (q.templateId && mongoose.Types.ObjectId.isValid(q.templateId)) filter.templateId = q.templateId;
  if (q.phone) {
    const digits = String(q.phone).replace(/\D/g, '').slice(-10);
    if (digits) filter.to = { $regex: `${digits}$` };
  }
  const rows = await WhatsAppMessageLog.find(filter)
    .sort({ createdAt: -1 }).limit(Math.min(Math.max(Number(q.limit) || 50, 1), 1000)).lean();
  return rows.map((r: any) => ({
    ...r,
    reason: r.status === 'failed' ? explainWaError(r.errorCode, r.errorTitle || r.errorDetail) : undefined,
  }));
}
