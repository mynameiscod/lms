import mongoose from 'mongoose';
import WhatsAppThread from '../models/WhatsAppThread';
import WhatsAppBroadcast from '../models/WhatsAppBroadcast';
import WhatsAppMessageLog from '../models/WhatsAppMessageLog';
import Lead from '../models/Lead';
import { normalizeTo } from './assessmentOtpService';
import { archiveLeadIds } from './leadArchiveService';

/**
 * Not every WhatsApp we send is sales. A hiring message, festival wishes or an update to students
 * gets replies too — and those people must not be welcomed by the qualification bot, asked about
 * courses, or turned into CRM leads (found 2026-11-19: a hiring broadcast created 11 leads and
 * 52 bot messages). Each broadcast says what it is for; replies to a non-sales one land in the
 * inbox for a person to answer, and nothing automatic happens.
 */

export type BroadcastPurpose = 'sales' | 'hiring' | 'wishes' | 'update';
export const PURPOSES: Record<BroadcastPurpose, { label: string; reply: string }> = {
  sales: { label: 'Sales / admissions', reply: 'Replies are treated as leads: the bot may answer and a lead is created.' },
  hiring: { label: 'Hiring / jobs', reply: 'Replies go to the inbox only — no bot, no lead.' },
  wishes: { label: 'Wishes / greetings', reply: 'Replies go to the inbox only — no bot, no lead.' },
  update: { label: 'Update to students / participants', reply: 'Replies go to the inbox only — no bot, no lead.' },
};
export const isPurpose = (v: any): v is BroadcastPurpose => typeof v === 'string' && v in PURPOSES;

/** How long replies to a non-sales message stay "not a lead". */
export const REPLY_CONTEXT_DAYS = 30;
const DAY = 24 * 3600 * 1000;
const oid = (id: any) => new mongoose.Types.ObjectId(String(id));
const tailRx = (p: string) => new RegExp(`${String(p).replace(/\D/g, '').slice(-10)}$`);

/** Remember on each recipient's conversation that our last message to them was not sales. */
export async function markRepliesNotLeads(
  tenantId: string, phones: string[], ctx: { kind: BroadcastPurpose; templateName: string; broadcastId?: any },
) {
  if (ctx.kind === 'sales') return 0;
  const until = new Date(Date.now() + REPLY_CONTEXT_DAYS * DAY);
  const ops = Array.from(new Set(phones.map((p) => normalizeTo(p)).filter((p) => p && p.length >= 12))).map((phone) => ({
    updateOne: {
      filter: { tenantId: oid(tenantId), phone },
      update: { $set: { replyContext: { kind: ctx.kind, templateName: ctx.templateName, broadcastId: ctx.broadcastId ? oid(ctx.broadcastId) : undefined, until } } },
      upsert: true,
    },
  }));
  for (let i = 0; i < ops.length; i += 500) await WhatsAppThread.bulkWrite(ops.slice(i, i + 500), { ordered: false });
  return ops.length;
}

/**
 * Should an incoming message from this number be left to a person (no bot, no workflows, no new
 * lead)? Yes when they are not an active lead AND either we recently sent them a non-sales
 * broadcast, or the number belongs to a student / placement candidate.
 */
export async function quietReason(tenantId: string, rawPhone: string): Promise<{ kind: string; label: string } | null> {
  const phone = normalizeTo(rawPhone);
  const t: any = await WhatsAppThread.findOne({ tenantId: oid(tenantId), phone }).select('replyContext links').lean();
  const ctx = t?.replyContext && t.replyContext.until && new Date(t.replyContext.until).getTime() > Date.now() ? t.replyContext : null;
  const known = !t?.links?.leadId && (t?.links?.userId || t?.links?.placementId);
  if (!ctx && !known) return null;
  const isLead = await Lead.exists({ tenantId: oid(tenantId), phone: tailRx(phone), archivedAt: null });
  if (isLead) return null;
  if (ctx) return { kind: ctx.kind, label: `Reply to your ${PURPOSES[ctx.kind as BroadcastPurpose]?.label.toLowerCase() || 'message'} "${ctx.templateName}"` };
  return { kind: t.links.userId ? 'student' : 'placement', label: t.links.userId ? 'Existing student' : 'Placement candidate' };
}

async function recipientsOf(tenantId: string, broadcastId: string) {
  return (await WhatsAppMessageLog.distinct('to', { tenantId: oid(tenantId), broadcastId: oid(broadcastId) })).map(String);
}

/** Leads that replies to this broadcast created (WhatsApp leads made after it went out). */
export async function replyLeads(tenantId: string, broadcastId: string) {
  if (!mongoose.isValidObjectId(broadcastId)) return [];
  const b: any = await WhatsAppBroadcast.findOne({ _id: broadcastId, tenantId: oid(tenantId) }).select('createdAt').lean();
  if (!b) return [];
  const to = await recipientsOf(tenantId, broadcastId);
  if (!to.length) return [];
  const tens = Array.from(new Set(to.map((p) => p.slice(-10))));
  const leads: any[] = await Lead.find({
    tenantId: oid(tenantId), source: 'whatsapp', archivedAt: null, createdAt: { $gte: b.createdAt },
    $or: tens.map((t) => ({ phone: new RegExp(`${t}$`) })),
  }).select('name phone createdAt').sort({ createdAt: 1 }).limit(2000).lean();
  return leads.map((l) => ({ _id: String(l._id), name: l.name, phone: l.phone, createdAt: l.createdAt }));
}

/** Say (after the fact) what a broadcast was for; non-sales marks every recipient's chat. */
export async function setBroadcastPurpose(tenantId: string, broadcastId: string, purpose: BroadcastPurpose) {
  const b: any = await WhatsAppBroadcast.findOneAndUpdate({ _id: broadcastId, tenantId: oid(tenantId) }, { $set: { purpose } }, { new: true }).lean();
  if (!b) return null;
  const to = await recipientsOf(tenantId, broadcastId);
  if (purpose === 'sales') {
    await WhatsAppThread.updateMany({ tenantId: oid(tenantId), 'replyContext.broadcastId': oid(broadcastId) }, { $unset: { replyContext: 1 } });
  } else {
    await markRepliesNotLeads(tenantId, to, { kind: purpose, templateName: b.templateName, broadcastId });
  }
  return { purpose, recipients: to.length, leads: await replyLeads(tenantId, broadcastId) };
}

/** Archive the leads that replies to a non-sales broadcast created (restorable from Lead Archive). */
export async function archiveReplyLeads(tenantId: string, userId: string, broadcastId: string) {
  const b: any = await WhatsAppBroadcast.findOne({ _id: broadcastId, tenantId: oid(tenantId) }).select('templateName purpose').lean();
  if (!b) return { archived: 0 };
  const leads = await replyLeads(tenantId, broadcastId);
  if (!leads.length) return { archived: 0 };
  return archiveLeadIds(tenantId, userId, leads.map((l) => l._id), `Replied to the ${PURPOSES[b.purpose as BroadcastPurpose]?.label.toLowerCase() || 'non-sales'} WhatsApp "${b.templateName}" — not a lead`);
}
