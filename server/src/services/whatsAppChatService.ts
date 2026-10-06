import mongoose from 'mongoose';
import WhatsAppChatMessage from '../models/WhatsAppChatMessage';
import WhatsAppThread from '../models/WhatsAppThread';
import WhatsAppTemplate from '../models/WhatsAppTemplate';
import { getWhatsAppCredentialCandidates, waPost, normalizeTo } from './assessmentOtpService';
import { recordSend, explainWaError } from './whatsAppDeliveryService';
import { recordOutbound } from './whatsAppChatStore';
import { sendTemplateTo, WaTemplateError } from './whatsAppTemplateService';
import { templateShape } from './whatsAppTemplateShape';
import { autoAssign } from './whatsAppChatInbox';
import { emitWaThread } from '../realtime/whatsAppChatRealtime';
import * as bunny from './bunnyStorageService';

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
    WhatsAppThread.findOne({ tenantId: oid(tenantId), phone }).populate('lastStaffReplyBy', 'firstName lastName').populate('assignedTo', 'firstName lastName email').lean(),
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
    assignedTo: t?.assignedTo ? { _id: String(t.assignedTo._id), name: [t.assignedTo.firstName, t.assignedTo.lastName].filter(Boolean).join(' ') || t.assignedTo.email } : null,
    links: {
      placementId: t?.links?.placementId ? String(t.links.placementId) : undefined, placementName: t?.links?.placementName,
      leadId: t?.links?.leadId ? String(t.links.leadId) : undefined, leadName: t?.links?.leadName,
      userId: t?.links?.userId ? String(t.links.userId) : undefined, userName: t?.links?.userName,
    },
    lastStaffReply: t?.lastStaffReplyAt ? {
      at: t.lastStaffReplyAt,
      by: t.lastStaffReplyBy ? [t.lastStaffReplyBy.firstName, t.lastStaffReplyBy.lastName].filter(Boolean).join(' ') : undefined,
    } : null,
  };
}

/**
 * A staff reply takes the conversation over: the qualification bot pauses for that person and,
 * if nobody owns the chat yet, the replier does (both decided 2026-10-06).
 */
async function takeOver(tenantId: string, phone: string, userId: string) {
  await WhatsAppThread.updateOne({ tenantId: oid(tenantId), phone }, { $set: { botPaused: true } }, { upsert: true });
  await autoAssign(tenantId, phone, userId);
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
  if (result.ok) await takeOver(tenantId, phone, userId);
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
  await takeOver(tenantId, phone, userId);
  return { ok: true };
}

export async function setBotPaused(tenantId: string, rawPhone: string, paused: boolean) {
  const phone = phoneOf(rawPhone);
  await WhatsAppThread.updateOne({ tenantId: oid(tenantId), phone }, { $set: { botPaused: !!paused } }, { upsert: true });
  emitWaThread(tenantId, { phone, reason: 'bot' });
  return { botPaused: !!paused };
}

export async function markRead(tenantId: string, rawPhone: string) {
  const phone = phoneOf(rawPhone);
  const r = await WhatsAppThread.updateOne({ tenantId: oid(tenantId), phone, unreadCount: { $gt: 0 } }, { $set: { unreadCount: 0 } });
  if (r.modifiedCount) emitWaThread(tenantId, { phone, reason: 'read' });
}

// ── Sending a file ───────────────────────────────────────────────────────────

/** What WhatsApp accepts, and as which message type. Size limits are Meta's. */
const MEDIA_TYPES: Record<string, { type: 'image' | 'document' | 'audio' | 'video'; maxMb: number }> = {
  'image/jpeg': { type: 'image', maxMb: 5 }, 'image/png': { type: 'image', maxMb: 5 },
  'application/pdf': { type: 'document', maxMb: 25 },
  'application/msword': { type: 'document', maxMb: 25 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { type: 'document', maxMb: 25 },
  'application/vnd.ms-excel': { type: 'document', maxMb: 25 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { type: 'document', maxMb: 25 },
  'application/vnd.ms-powerpoint': { type: 'document', maxMb: 25 },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { type: 'document', maxMb: 25 },
  'text/plain': { type: 'document', maxMb: 25 },
  'audio/mpeg': { type: 'audio', maxMb: 16 }, 'audio/ogg': { type: 'audio', maxMb: 16 }, 'audio/aac': { type: 'audio', maxMb: 16 }, 'audio/mp4': { type: 'audio', maxMb: 16 },
  'video/mp4': { type: 'video', maxMb: 16 },
};
/** Our own ceiling on what the server holds in memory for one upload (Meta allows larger documents). */
export const MEDIA_UPLOAD_LIMIT_BYTES = 25 * 1024 * 1024;

export async function sendMedia(
  tenantId: string, userId: string, rawPhone: string,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number }, caption?: string,
) {
  const phone = phoneOf(rawPhone);
  const spec = MEDIA_TYPES[file.mimetype];
  if (!spec) throw new ChatError('WhatsApp cannot send this kind of file. Use a PDF, Word/Excel/PowerPoint file, JPEG/PNG photo, MP3/OGG audio or MP4 video.');
  if (file.size > spec.maxMb * 1024 * 1024) throw new ChatError(`That file is too large — the limit for ${spec.type === 'image' ? 'photos' : `${spec.type}s`} is ${spec.maxMb} MB.`);
  const thread = await WhatsAppThread.findOne({ tenantId: oid(tenantId), phone }).select('lastInboundAt').lean();
  if (!windowOf((thread as any)?.lastInboundAt).open) {
    throw new ChatError('The 24-hour reply window is closed — files can only be sent after the person writes to you.', 409);
  }
  const creds = await getWhatsAppCredentialCandidates(tenantId);
  if (!creds.length) throw new ChatError('WhatsApp is not configured for this institute.');
  const cap = String(caption || '').trim().slice(0, 1024);
  const fileName = String(file.originalname || 'file').replace(/[\r\n"]/g, '').slice(0, 120);

  let result: { ok: boolean; error?: string; errorCode?: number; messageId?: string } = { ok: false, error: 'send failed' };
  for (const c of creds) {
    // Upload to Meta first (media id), then send a message pointing at it — same phone number id for both.
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', file.mimetype);
    form.append('file', new Blob([file.buffer], { type: file.mimetype }), fileName);
    const up = await fetch(`https://graph.facebook.com/v18.0/${c.phoneNumberId}/media`, {
      method: 'POST', headers: { Authorization: `Bearer ${c.accessToken}` }, body: form,
    })
      .then(async (r) => ({ ok: r.ok, body: (await r.json().catch(() => null)) as any }))
      .catch((e: any) => ({ ok: false, body: { error: { message: e?.message } } as any }));
    if (!up.ok || !up.body?.id) {
      result = { ok: false, error: up.body?.error?.message || 'Upload to WhatsApp failed', errorCode: up.body?.error?.code };
      continue;
    }
    const payload: any = { id: up.body.id };
    if (cap && spec.type !== 'audio') payload.caption = cap;
    if (spec.type === 'document') payload.filename = fileName;
    result = await waPost(c, { messaging_product: 'whatsapp', to: phone, type: spec.type, [spec.type]: payload });
    if (result.ok) break;
  }
  await recordSend({ tenantId, to: phone, templateName: `(chat ${spec.type})`, source: 'test', sentBy: userId, result });

  // Keep our own copy so the chat can show it later (Meta's copy cannot be read back).
  let storedKey: string | undefined;
  if (result.ok && bunny.isBunnyStorageConfigured()) {
    const ext = (fileName.split('.').pop() || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 8);
    const key = `whatsapp-media/${tenantId}/out-${(result.messageId || String(Date.now())).replace(/[^a-zA-Z0-9_-]/g, '')}.${ext}`;
    storedKey = await bunny.uploadFile(key, file.buffer, file.mimetype).then(() => key).catch(() => undefined);
  }
  const msg = await recordOutbound(tenantId, phone, {
    kind: spec.type, body: cap, wamid: result.messageId, ok: result.ok, error: result.error, sentBy: userId, source: 'chat',
    media: { mime: file.mimetype, fileName, storedKey, size: file.size },
  });
  if (!result.ok) throw new ChatError(explainWaError(result.errorCode, result.error), 502);
  await takeOver(tenantId, phone, userId);
  return msg;
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
