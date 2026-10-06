import mongoose from 'mongoose';
import WhatsAppChatMessage from '../models/WhatsAppChatMessage';
import WhatsAppThread from '../models/WhatsAppThread';
import WhatsAppTemplate from '../models/WhatsAppTemplate';
import { getWhatsAppCredentialCandidates, waPost, normalizeTo } from './assessmentOtpService';
import { recordSend, explainWaError } from './whatsAppDeliveryService';
import { recordOutbound } from './whatsAppChatStore';
import { sendTemplateTo, WaTemplateError } from './whatsAppTemplateService';
import { templateShape } from './whatsAppTemplateShape';

/**
 * Reading and answering a person's WhatsApp conversation from the platform.
 *
 * Meta's rule drives the reply box: free text only within 24 hours of the person's last message
 * (the customer-service window); outside it only an approved template may be sent. The window is
 * computed here from the stored inbound time, never taken from the client.
 */

export const WINDOW_MS = 24 * 60 * 60 * 1000;
const oid = (id: string) => new mongoose.Types.ObjectId(id);

export class ChatError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const phoneOf = (raw: string) => {
  const p = normalizeTo(String(raw || ''));
  if (p.length < 12) throw new ChatError('Invalid phone number');
  return p;
};

export function windowOf(lastInboundAt?: Date | null) {
  if (!lastInboundAt) return { open: false, closesAt: null as Date | null };
  const closesAt = new Date(new Date(lastInboundAt).getTime() + WINDOW_MS);
  return { open: closesAt.getTime() > Date.now(), closesAt };
}

/** One thread: newest messages (paged backwards with `before`), the reply window, bot state. */
export async function getThread(tenantId: string, rawPhone: string, opts: { before?: string; limit?: number } = {}) {
  const phone = phoneOf(rawPhone);
  const limit = Math.min(Math.max(opts.limit || 50, 1), 200);
  const q: any = { tenantId: oid(tenantId), phone };
  if (opts.before && !isNaN(Date.parse(opts.before))) q.createdAt = { $lt: new Date(opts.before) };
  const [rows, thread] = await Promise.all([
    WhatsAppChatMessage.find(q).sort({ createdAt: -1 }).limit(limit)
      .populate('sentBy', 'firstName lastName').lean(),
    WhatsAppThread.findOne({ tenantId: oid(tenantId), phone }).populate('lastStaffReplyBy', 'firstName lastName').lean(),
  ]);
  const messages = rows.reverse().map((m: any) => ({
    _id: String(m._id), direction: m.direction, kind: m.kind, body: m.body, templateName: m.templateName,
    hasMedia: !!m.media?.storedKey, mediaMime: m.media?.mime, mediaName: m.media?.fileName,
    status: m.status, error: m.status === 'failed' && m.error ? explainWaError(undefined, m.error) : undefined,
    source: m.source, createdAt: m.createdAt,
    sentBy: m.sentBy ? [m.sentBy.firstName, m.sentBy.lastName].filter(Boolean).join(' ') : undefined,
  }));
  const t: any = thread;
  return {
    phone,
    messages,
    hasMore: rows.length === limit,
    window: windowOf(t?.lastInboundAt),
    botPaused: !!t?.botPaused,
    unreadCount: t?.unreadCount || 0,
    contactName: t?.contactName,
    lastStaffReply: t?.lastStaffReplyAt ? {
      at: t.lastStaffReplyAt,
      by: t.lastStaffReplyBy ? [t.lastStaffReplyBy.firstName, t.lastStaffReplyBy.lastName].filter(Boolean).join(' ') : undefined,
    } : null,
  };
}

/** Taking over a chat pauses the qualification bot for that person (decided 2026-10-06). */
async function pauseBot(tenantId: string, phone: string) {
  await WhatsAppThread.updateOne({ tenantId: oid(tenantId), phone }, { $set: { botPaused: true } }, { upsert: true });
}

export async function sendText(tenantId: string, userId: string, rawPhone: string, text: string) {
  const phone = phoneOf(rawPhone);
  const body = String(text || '').trim();
  if (!body) throw new ChatError('Type a message');
  if (body.length > 4096) throw new ChatError('WhatsApp allows at most 4096 characters per message');
  const thread = await WhatsAppThread.findOne({ tenantId: oid(tenantId), phone }).select('lastInboundAt').lean();
  if (!windowOf((thread as any)?.lastInboundAt).open) {
    throw new ChatError('The 24-hour reply window is closed — WhatsApp only allows an approved template now.', 409);
  }
  const creds = await getWhatsAppCredentialCandidates(tenantId);
  if (!creds.length) throw new ChatError('WhatsApp is not configured for this institute.');
  let result: { ok: boolean; error?: string; errorCode?: number; messageId?: string } = { ok: false, error: 'send failed' };
  for (const c of creds) {
    result = await waPost(c, { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body, preview_url: true } });
    if (result.ok) break;
  }
  await recordSend({ tenantId, to: phone, templateName: '(chat reply)', source: 'test', sentBy: userId, result });
  const msg = await recordOutbound(tenantId, phone, { body, wamid: result.messageId, ok: result.ok, error: result.error, sentBy: userId, source: 'chat' });
  if (result.ok) await pauseBot(tenantId, phone);
  if (!result.ok) throw new ChatError(explainWaError(result.errorCode, result.error) || result.error || 'WhatsApp refused the message', 502);
  return msg;
}

export async function sendTemplate(tenantId: string, userId: string, rawPhone: string, templateId: string, values: string[], buttonParam?: string) {
  const phone = phoneOf(rawPhone);
  if (!mongoose.isValidObjectId(templateId)) throw new ChatError('Choose a template');
  const t = await WhatsAppTemplate.findOne({ _id: templateId, tenantId });
  if (!t) throw new ChatError('Template not found', 404);
  if (t.status !== 'APPROVED') throw new ChatError(`Template is ${t.status} — Meta only sends APPROVED templates.`);
  try {
    // sendTemplateTo records the delivery log AND the conversation row itself.
    const r = await sendTemplateTo(tenantId, t, phone, { body: values, urlButtonParam: buttonParam, log: { source: 'test', sentBy: userId } });
    if (!r.ok) throw new ChatError(explainWaError(r.errorCode, r.error) || r.error || 'WhatsApp refused the template', 502);
  } catch (e: any) {
    if (e instanceof WaTemplateError) throw new ChatError(e.message, e.status);
    throw e;
  }
  await pauseBot(tenantId, phone);
  return { ok: true };
}

export async function setBotPaused(tenantId: string, rawPhone: string, paused: boolean) {
  const phone = phoneOf(rawPhone);
  await WhatsAppThread.updateOne({ tenantId: oid(tenantId), phone }, { $set: { botPaused: !!paused } }, { upsert: true });
  return { botPaused: !!paused };
}

export async function markRead(tenantId: string, rawPhone: string) {
  await WhatsAppThread.updateOne({ tenantId: oid(tenantId), phone: phoneOf(rawPhone) }, { $set: { unreadCount: 0 } });
}

/** Unread counts for a page of records, keyed by the 10-digit mobile the caller passed. */
export async function unreadFor(tenantId: string, mobiles: string[]) {
  const map = new Map(mobiles.slice(0, 200).map((m) => [normalizeTo(m), m]));
  const rows = await WhatsAppThread.find({ tenantId: oid(tenantId), phone: { $in: [...map.keys()] }, unreadCount: { $gt: 0 } })
    .select('phone unreadCount').lean();
  const out: Record<string, number> = {};
  for (const r of rows as any[]) out[map.get(r.phone) || r.phone] = r.unreadCount;
  return out;
}

/** The stored copy of a photo/PDF/voice note a person sent. */
export async function mediaOf(tenantId: string, messageId: string) {
  if (!mongoose.isValidObjectId(messageId)) throw new ChatError('Not found', 404);
  const m: any = await WhatsAppChatMessage.findOne({ _id: messageId, tenantId: oid(tenantId) }).select('media').lean();
  if (!m?.media?.storedKey) throw new ChatError('This file was not saved (too large, or storage is not configured).', 404);
  return m.media as { storedKey: string; mime?: string; fileName?: string };
}

/** Approved templates the reply box can offer when the window is closed. */
export async function approvedTemplates(tenantId: string) {
  const rows = await WhatsAppTemplate.find({ tenantId, status: 'APPROVED', category: { $ne: 'AUTHENTICATION' } })
    .select('name language category body header bodyExamples buttons').sort({ name: 1 }).lean();
  return rows.map((t: any) => ({ _id: String(t._id), name: t.name, category: t.category, body: t.body, bodyExamples: t.bodyExamples || [], shape: templateShape(t) }));
}
