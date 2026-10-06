import mongoose from 'mongoose';
import WhatsAppChatMessage, { IWhatsAppChatMessage, WaChatKind, WaChatStatus } from '../models/WhatsAppChatMessage';
import WhatsAppThread from '../models/WhatsAppThread';
import { normalizeTo } from './assessmentOtpService';
import * as bunny from './bunnyStorageService';
import { emitWaThread } from '../realtime/whatsAppChatRealtime';
import { refreshLinks, notifyInbound } from './whatsAppChatInbox';

/**
 * Writing the conversation record. Kept free of sending logic so the template service, the webhook
 * and the chat service can all record into it without importing each other.
 */

const GRAPH = 'https://graph.facebook.com/v18.0';
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;
const oid = (id: string) => new mongoose.Types.ObjectId(id);

const preview = (kind: WaChatKind, body: string) => {
  const icon: Partial<Record<WaChatKind, string>> = { image: '📷 Photo', document: '📄 Document', audio: '🎤 Voice note', video: '🎬 Video', sticker: 'Sticker', location: '📍 Location', contacts: '👤 Contact' };
  const text = (body || '').replace(/\s+/g, ' ').trim();
  return (icon[kind] ? `${icon[kind]}${text ? ` · ${text}` : ''}` : text).slice(0, 120);
};

/** Fill a template's {{n}} with the values actually sent, so the thread shows what the person read. */
export function renderTemplateBody(body: string, values: string[]): string {
  return String(body || '').replace(/\{\{(\d+)\}\}/g, (m, n) => values[Number(n) - 1] ?? m);
}

/** The parts of a Meta inbound message we keep, by type. */
export function parseInbound(m: any): { kind: WaChatKind; body: string; media?: { metaMediaId: string; mime?: string; fileName?: string }; botText: string } {
  switch (m?.type) {
    case 'text': return { kind: 'text', body: m.text?.body || '', botText: m.text?.body || '' };
    case 'interactive': {
      const t = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
      return { kind: 'button', body: t, botText: t };
    }
    case 'button': return { kind: 'button', body: m.button?.text || '', botText: m.button?.text || '' };
    case 'image': case 'document': case 'audio': case 'video': case 'sticker': {
      const p = m[m.type] || {};
      return { kind: m.type, body: p.caption || '', media: { metaMediaId: p.id, mime: p.mime_type, fileName: p.filename }, botText: '' };
    }
    case 'location': {
      const l = m.location || {};
      return { kind: 'location', body: [l.name, l.address, `https://maps.google.com/?q=${l.latitude},${l.longitude}`].filter(Boolean).join(' · '), botText: '' };
    }
    case 'contacts': return { kind: 'contacts', body: (m.contacts || []).map((c: any) => [c.name?.formatted_name, c.phones?.[0]?.phone].filter(Boolean).join(' ')).join(', '), botText: '' };
    case 'reaction': return { kind: 'text', body: `Reacted ${m.reaction?.emoji || ''}`.trim(), botText: '' };
    default: return { kind: 'unsupported', body: 'A message type WhatsApp does not let us read here.', botText: '' };
  }
}

/** Meta media URLs expire within minutes, so a photo/PDF is copied to our storage when it arrives. */
async function storeMedia(tenantId: string, wamid: string, media: { metaMediaId: string; mime?: string; fileName?: string }, accessToken: string) {
  if (!bunny.isBunnyStorageConfigured() || !media.metaMediaId || !accessToken) return media;
  try {
    const metaRes = await fetch(`${GRAPH}/${media.metaMediaId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!metaRes.ok) return media;
    const info: any = await metaRes.json();
    if (info?.file_size && info.file_size > MAX_MEDIA_BYTES) return { ...media, size: info.file_size };
    const fileRes = await fetch(info.url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!fileRes.ok) return media;
    const buf = Buffer.from(await fileRes.arrayBuffer());
    const mime = info.mime_type || media.mime || 'application/octet-stream';
    const ext = (media.fileName?.split('.').pop() || mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 8);
    const storedKey = `whatsapp-media/${tenantId}/${wamid.replace(/[^a-zA-Z0-9_-]/g, '')}.${ext}`;
    await bunny.uploadFile(storedKey, buf, mime);
    return { ...media, mime, storedKey, size: buf.length };
  } catch (e: any) {
    console.warn('[wa-chat] media copy failed', e?.message);
    return media;
  }
}

/** Store one message a person sent us. Returns null when Meta re-delivered one we already have. */
export async function recordInbound(tenantId: string, m: any, contactName: string | undefined, accessToken: string) {
  const phone = normalizeTo(m.from);
  const parsed = parseInbound(m);
  const at = m.timestamp ? new Date(Number(m.timestamp) * 1000) : new Date();
  if (m.id && await WhatsAppChatMessage.exists({ wamid: m.id })) return null;
  const media = parsed.media ? await storeMedia(tenantId, m.id || String(Date.now()), parsed.media, accessToken) : undefined;
  let doc: IWhatsAppChatMessage;
  try {
    doc = await WhatsAppChatMessage.create({
      tenantId: oid(tenantId), phone, direction: 'in', kind: parsed.kind, body: parsed.body, media,
      wamid: m.id, status: 'received', source: 'person', createdAt: at,
    });
  } catch (e: any) {
    if (e?.code === 11000) return null; // a concurrent retry beat us to it
    throw e;
  }
  const thread: any = await WhatsAppThread.findOneAndUpdate(
    { tenantId: oid(tenantId), phone },
    {
      $set: { lastInboundAt: at, lastMessageAt: at, lastPreview: preview(parsed.kind, parsed.body), ...(contactName ? { contactName } : {}) },
      $inc: { unreadCount: 1 },
    },
    { upsert: true, new: true },
  ).select('linkedAt').lean();
  // Which records share the number (for inbox filters), then live update + the bell. None of it may lose the message.
  await refreshLinks(tenantId, phone, thread?.linkedAt);
  emitWaThread(tenantId, { phone, reason: 'in' });
  await notifyInbound(tenantId, phone, preview(parsed.kind, parsed.body)).catch((e) => console.warn('[wa-chat] notify failed', e?.message));
  return { doc, botText: parsed.botText };
}

/** Store one message we sent (chat reply, template, broadcast, bot). Never throws — sending matters more. */
export async function recordOutbound(tenantId: string, rawPhone: string, f: {
  kind?: WaChatKind; body: string; templateName?: string; wamid?: string; ok: boolean; error?: string;
  sentBy?: string; source: IWhatsAppChatMessage['source'];
  media?: { mime?: string; fileName?: string; storedKey?: string; size?: number };
}) {
  try {
    const phone = normalizeTo(rawPhone);
    if (!phone || phone.length < 10 || !mongoose.isValidObjectId(tenantId)) return null;
    const now = new Date();
    const doc = await WhatsAppChatMessage.create({
      tenantId: oid(tenantId), phone, direction: 'out', kind: f.kind || 'text', body: f.body, templateName: f.templateName,
      media: f.media, wamid: f.wamid, status: (f.ok ? 'accepted' : 'failed') as WaChatStatus, error: f.ok ? undefined : f.error,
      sentBy: f.sentBy && mongoose.isValidObjectId(f.sentBy) ? oid(f.sentBy) : undefined, source: f.source,
    });
    const staff = f.source === 'chat' && f.sentBy && mongoose.isValidObjectId(f.sentBy);
    await WhatsAppThread.updateOne(
      { tenantId: oid(tenantId), phone },
      { $set: { lastMessageAt: now, lastPreview: preview(f.kind || 'text', f.body), ...(staff ? { lastStaffReplyAt: now, lastStaffReplyBy: oid(f.sentBy!) } : {}) } },
      { upsert: true },
    );
    emitWaThread(tenantId, { phone, reason: 'out' });
    return doc;
  } catch (e: any) {
    console.warn('[wa-chat] could not record outbound message', e?.message);
    return null;
  }
}

const RANK: Record<string, number> = { accepted: 0, sent: 1, delivered: 2, read: 3 };

/** Meta's delivery reports, applied to chat messages by wamid (ticks in the Chat tab). */
export async function applyChatStatuses(statuses: { id?: string; status?: string; errors?: any[] }[]) {
  for (const s of statuses || []) {
    if (!s.id || !['sent', 'delivered', 'read', 'failed'].includes(String(s.status))) continue;
    const row = await WhatsAppChatMessage.findOne({ wamid: s.id }).select('status tenantId phone');
    if (!row || row.status === 'failed') continue;
    const before = row.status;
    if (s.status === 'failed') {
      if (row.status === 'delivered' || row.status === 'read') continue;
      const e = s.errors?.[0];
      await WhatsAppChatMessage.updateOne({ _id: row._id }, { $set: { status: 'failed', error: e?.title || e?.message || 'failed' } });
    } else if ((RANK[s.status!] ?? -1) > (RANK[row.status] ?? -1)) {
      await WhatsAppChatMessage.updateOne({ _id: row._id }, { $set: { status: s.status } });
    }
    if (before !== s.status) emitWaThread(String(row.tenantId), { phone: row.phone, reason: 'status' });
  }
}

export async function isBotPaused(tenantId: string, rawPhone: string): Promise<boolean> {
  const t = await WhatsAppThread.findOne({ tenantId: oid(tenantId), phone: normalizeTo(rawPhone) }).select('botPaused').lean();
  return !!t?.botPaused;
}
