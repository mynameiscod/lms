import mongoose from 'mongoose';
import WhatsAppThread from '../models/WhatsAppThread';
import WhatsAppQuickReply from '../models/WhatsAppQuickReply';
import PlacementCandidate from '../models/PlacementCandidate';
import Lead from '../models/Lead';
import User from '../models/User';
import { permissionsOf } from '../middleware/roleGuard';
import { createNotifications } from '../notifications/notificationService';
import { emitWaThread, emitWaUser } from '../realtime/whatsAppChatRealtime';

/**
 * The shared WhatsApp inbox: every conversation of an institute in one list, who owns each one,
 * which records the number belongs to, saved quick replies, and the bell when someone writes in.
 */

const oid = (id: string) => new mongoose.Types.ObjectId(id);
const last10 = (phone: string) => String(phone || '').replace(/\D/g, '').slice(-10);
const fullName = (u: any) => [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
const RELINK_MS = 6 * 60 * 60 * 1000;
const NOTIFY_GAP_MS = 10 * 60 * 1000;

export class InboxError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

// ── Which records share this number ─────────────────────────────────────────

/** Placement candidate, lead and student with this number, stored on the thread for filtering. */
export async function linkThread(tenantId: string, phone: string) {
  const ten = last10(phone);
  if (ten.length < 10) return;
  const tid = oid(tenantId);
  const tail = new RegExp(`${ten}$`);
  const [pc, lead, user]: any[] = await Promise.all([
    PlacementCandidate.findOne({ tenantId: tid, mobile: ten }).select('name').lean(),
    Lead.findOne({ tenantId: tid, phone: tail }).sort({ createdAt: -1 }).select('name').lean(),
    User.findOne({ tenantId: tid, phone: tail, role: 'STUDENT' }).select('firstName lastName').lean(),
  ]);
  const links = {
    ...(pc ? { placementId: pc._id, placementName: pc.name } : {}),
    ...(lead ? { leadId: lead._id, leadName: lead.name } : {}),
    ...(user ? { userId: user._id, userName: fullName(user) } : {}),
  };
  await WhatsAppThread.updateOne({ tenantId: tid, phone }, { $set: { links, linkedAt: new Date() } });
}

/** Re-link a thread whose links are missing or stale (a lead may have been created since). */
export async function refreshLinks(tenantId: string, phone: string, linkedAt?: Date | null) {
  if (linkedAt && Date.now() - new Date(linkedAt).getTime() < RELINK_MS) return;
  await linkThread(tenantId, phone).catch((e) => console.warn('[wa-inbox] link failed', e?.message));
}

// ── Who can chat ─────────────────────────────────────────────────────────────

const staffCache = new Map<string, { at: number; rows: { _id: string; name: string }[] }>();

/** Active staff of the institute who hold the chat permission — assignees and notification recipients. */
export async function chatStaff(tenantId: string): Promise<{ _id: string; name: string }[]> {
  const hit = staffCache.get(tenantId);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.rows;
  const users: any[] = await User.find({
    tenantId: oid(tenantId), isActive: { $ne: false }, role: { $in: ['TENANT_ADMIN', 'INSTRUCTOR', 'STAFF', 'ATTENDANCE_ADMIN'] },
  }).select('firstName lastName email role customRoleId').limit(500).lean();
  const rows: { _id: string; name: string }[] = [];
  for (const u of users) {
    const perms = await permissionsOf({ role: u.role, customRoleId: u.customRoleId });
    if (perms.includes('chat_whatsapp')) rows.push({ _id: String(u._id), name: fullName(u) || u.email });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  staffCache.set(tenantId, { at: Date.now(), rows });
  return rows;
}

// ── Bell when someone writes in ─────────────────────────────────────────────

/**
 * Notify the owner of the conversation, or — when nobody owns it — everyone who can chat.
 * A burst of messages from one person rings once per 10 minutes.
 */
export async function notifyInbound(tenantId: string, phone: string, preview: string) {
  const t: any = await WhatsAppThread.findOne({ tenantId: oid(tenantId), phone })
    .select('assignedTo lastNotifiedAt contactName links').lean();
  if (!t) return;
  if (t.lastNotifiedAt && Date.now() - new Date(t.lastNotifiedAt).getTime() < NOTIFY_GAP_MS) return;
  const recipients = t.assignedTo ? [String(t.assignedTo)] : (await chatStaff(tenantId)).map((s) => s._id);
  if (!recipients.length) return;
  const who = t.links?.placementName || t.links?.leadName || t.links?.userName || t.contactName || `+${phone}`;
  await createNotifications(tenantId, recipients, 'general', `💬 WhatsApp from ${who}`, preview || 'New message', `/whatsapp-inbox?phone=${phone}`);
  await WhatsAppThread.updateOne({ _id: t._id }, { $set: { lastNotifiedAt: new Date() } });
  for (const r of recipients) emitWaUser(r, 'wa:notify', { phone, who });
}

// ── The inbox list ───────────────────────────────────────────────────────────

export type InboxFilter = 'all' | 'unread' | 'mine' | 'unassigned' | 'placement' | 'lead' | 'student';

export async function listInbox(
  tenantId: string, userId: string,
  opts: { filter?: InboxFilter; q?: string; page?: number; limit?: number; access?: { placement: boolean; leads: boolean } },
) {
  const tid = oid(tenantId);
  // Older threads (from before linking existed) get their records worked out once, so filters are right.
  const unlinked = await WhatsAppThread.find({ tenantId: tid, linkedAt: { $exists: false } }).select('phone').limit(300).lean();
  for (const u of unlinked as any[]) await linkThread(tenantId, u.phone).catch(() => {});

  const match: any = { tenantId: tid };
  switch (opts.filter) {
    case 'unread': match.unreadCount = { $gt: 0 }; break;
    case 'mine': match.assignedTo = oid(userId); break;
    case 'unassigned': match.assignedTo = null; break;
    case 'placement': match['links.placementId'] = { $exists: true }; break;
    case 'lead': match['links.leadId'] = { $exists: true }; break;
    case 'student': match['links.userId'] = { $exists: true }; break;
    default: break;
  }
  // Hide conversations that belong only to a module this person cannot open.
  const and: any[] = [];
  if (opts.access && !opts.access.placement) {
    and.push({ $or: [{ 'links.placementId': { $exists: false } }, { 'links.leadId': { $exists: true } }, { 'links.userId': { $exists: true } }] });
  }
  if (opts.access && !opts.access.leads) {
    and.push({ $or: [{ 'links.leadId': { $exists: false } }, { 'links.placementId': { $exists: true } }, { 'links.userId': { $exists: true } }] });
  }
  if (and.length) match.$and = and;

  const q = String(opts.q || '').trim();
  if (q) {
    const digits = q.replace(/\D/g, '');
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [
      ...(digits.length >= 4 ? [{ phone: new RegExp(digits) }] : []),
      { contactName: rx }, { 'links.placementName': rx }, { 'links.leadName': rx }, { 'links.userName': rx }, { lastPreview: rx },
    ];
  }
  const limit = Math.min(Math.max(opts.limit || 30, 1), 100);
  const page = Math.max(opts.page || 1, 1);

  const [rows, total, counts] = await Promise.all([
    WhatsAppThread.aggregate([
      { $match: match },
      { $addFields: { hasUnread: { $cond: [{ $gt: ['$unreadCount', 0] }, 1, 0] } } },
      { $sort: { hasUnread: -1, lastMessageAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $lookup: { from: 'users', localField: 'assignedTo', foreignField: '_id', as: 'assignee' } },
      { $project: { 'assignee.password': 0, 'assignee.passport': 0 } },
    ]),
    WhatsAppThread.countDocuments(match),
    WhatsAppThread.aggregate([
      { $match: { tenantId: tid } },
      { $group: {
        _id: null,
        unread: { $sum: { $cond: [{ $gt: ['$unreadCount', 0] }, 1, 0] } },
        mine: { $sum: { $cond: [{ $eq: ['$assignedTo', oid(userId)] }, 1, 0] } },
        unassigned: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$assignedTo', null] }, null] }, 1, 0] } },
        all: { $sum: 1 },
      } },
    ]),
  ]);

  return {
    rows: rows.map((t: any) => ({
      phone: t.phone,
      name: t.links?.placementName || t.links?.leadName || t.links?.userName || t.contactName || '',
      contactName: t.contactName,
      links: {
        placementId: t.links?.placementId ? String(t.links.placementId) : undefined,
        leadId: t.links?.leadId ? String(t.links.leadId) : undefined,
        userId: t.links?.userId ? String(t.links.userId) : undefined,
      },
      lastPreview: t.lastPreview || '',
      lastMessageAt: t.lastMessageAt,
      lastInboundAt: t.lastInboundAt,
      unreadCount: t.unreadCount || 0,
      assignedTo: t.assignee?.[0] ? { _id: String(t.assignee[0]._id), name: fullName(t.assignee[0]) || t.assignee[0].email } : null,
    })),
    total,
    page,
    limit,
    counts: counts[0] ? { all: counts[0].all, unread: counts[0].unread, mine: counts[0].mine, unassigned: counts[0].unassigned } : { all: 0, unread: 0, mine: 0, unassigned: 0 },
  };
}

// ── Assignment ───────────────────────────────────────────────────────────────

/**
 * Anyone who can chat may take an unowned conversation or let go of their own. Moving a
 * conversation between other people needs `isAdmin` (an institute admin or template manager).
 */
export async function assignThread(tenantId: string, actor: { id: string; isAdmin: boolean }, phone: string, toUserId: string | null) {
  const t: any = await WhatsAppThread.findOne({ tenantId: oid(tenantId), phone }).select('assignedTo').lean();
  if (!t) throw new InboxError('Conversation not found', 404);
  const current = t.assignedTo ? String(t.assignedTo) : null;
  const selfAction = (!current && toUserId === actor.id) || (current === actor.id && (toUserId === null || toUserId === actor.id));
  if (!selfAction && !actor.isAdmin) throw new InboxError('Only an admin can move a conversation that belongs to someone else.', 403);
  if (toUserId) {
    if (!mongoose.isValidObjectId(toUserId)) throw new InboxError('Choose a team member');
    const staff = await chatStaff(tenantId);
    if (!staff.some((s) => s._id === toUserId)) throw new InboxError('That person cannot use WhatsApp chat — tick it on their role first.');
  }
  await WhatsAppThread.updateOne({ _id: t._id }, { $set: { assignedTo: toUserId ? oid(toUserId) : null, assignedAt: new Date() } });
  emitWaThread(tenantId, { phone, reason: 'assign' });
  if (toUserId && toUserId !== actor.id) {
    await createNotifications(tenantId, [toUserId], 'general', '💬 A WhatsApp chat was assigned to you', `+${phone}`, `/whatsapp-inbox?phone=${phone}`).catch(() => {});
    emitWaUser(toUserId, 'wa:notify', { phone, who: `+${phone}`, assigned: true });
  }
  return { assignedTo: toUserId };
}

/** The first person to reply owns the conversation (decided 2026-10-06) — unless someone already does. */
export async function autoAssign(tenantId: string, phone: string, userId?: string) {
  if (!userId || !mongoose.isValidObjectId(userId)) return;
  const r = await WhatsAppThread.updateOne(
    { tenantId: oid(tenantId), phone, $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }] },
    { $set: { assignedTo: oid(userId), assignedAt: new Date() } },
  );
  if (r.modifiedCount) emitWaThread(tenantId, { phone, reason: 'assign' });
}

// ── Quick replies ────────────────────────────────────────────────────────────

export const listQuickReplies = (tenantId: string) =>
  WhatsAppQuickReply.find({ tenantId: oid(tenantId) }).select('title body').sort({ title: 1 }).lean();

export async function saveQuickReply(tenantId: string, userId: string, id: string | null, input: { title?: string; body?: string }) {
  const title = String(input.title || '').trim();
  const body = String(input.body || '').trim();
  if (!title || !body) throw new InboxError('A quick reply needs a title and a message');
  if (title.length > 60) throw new InboxError('Keep the title under 60 characters');
  if (body.length > 4096) throw new InboxError('WhatsApp allows at most 4096 characters');
  if (id) {
    if (!mongoose.isValidObjectId(id)) throw new InboxError('Not found', 404);
    const r = await WhatsAppQuickReply.findOneAndUpdate({ _id: id, tenantId: oid(tenantId) }, { $set: { title, body } }, { new: true }).lean();
    if (!r) throw new InboxError('Not found', 404);
    return r;
  }
  if (await WhatsAppQuickReply.countDocuments({ tenantId: oid(tenantId) }) >= 200) throw new InboxError('At most 200 quick replies');
  return WhatsAppQuickReply.create({ tenantId: oid(tenantId), title, body, createdBy: oid(userId) });
}

export async function deleteQuickReply(tenantId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new InboxError('Not found', 404);
  await WhatsAppQuickReply.deleteOne({ _id: id, tenantId: oid(tenantId) });
}
