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

/** Recent sends for the Templates screen, newest first, with a plain-English reason on failures. */
export async function listMessages(tenantId: string, q: { phone?: string; templateId?: string; limit?: number }) {
  const filter: any = { tenantId };
  if (q.templateId && mongoose.Types.ObjectId.isValid(q.templateId)) filter.templateId = q.templateId;
  if (q.phone) {
    const digits = String(q.phone).replace(/\D/g, '').slice(-10);
    if (digits) filter.to = { $regex: `${digits}$` };
  }
  const rows = await WhatsAppMessageLog.find(filter)
    .sort({ createdAt: -1 }).limit(Math.min(Math.max(Number(q.limit) || 50, 1), 200)).lean();
  return rows.map((r: any) => ({
    ...r,
    reason: r.status === 'failed' ? explainWaError(r.errorCode, r.errorTitle || r.errorDetail) : undefined,
  }));
}
