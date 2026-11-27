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

/**
 * Puts a message that REALLY went out on the lead's timeline, under the person who sent it.
 * Called only after Meta accepted the send, so the timeline never claims a WhatsApp that did not happen.
 * Never throws: a logging problem must not make a delivered message look failed.
 */
export async function logLeadWhatsApp(tenantId: string, userId: string, phone: string, description: string) {
  try {
    const ten = last10(phone);
    if (ten.length < 10) return;
    const lead: any = await Lead.findOne({ tenantId: oid(tenantId), phone: new RegExp(`${ten}$`) }).sort({ createdAt: -1 }).select('_id activities').lean();
    if (!lead) return;
    const now = new Date();
    // A "WhatsApp opened" entry from the button press (already counted in Team Activity) is completed by the
    // first message sent from the chat, so opening and then sending is one action, not two.
    let open = -1;
    (lead.activities || []).forEach((a: any, i: number) => {
      if (userId && a.type === 'whatsapp' && a.metadata?.opened === true && String(a.createdBy) === String(userId) && now.getTime() - new Date(a.createdAt).getTime() < 30 * 60 * 1000) open = i;
    });
    if (open >= 0) {
      await Lead.updateOne({ _id: lead._id }, { $set: { [`activities.${open}.description`]: description.slice(0, 500), [`activities.${open}.metadata`]: { opened: false } } });
      return;
    }
    await Lead.updateOne({ _id: lead._id }, { $push: { activities: { type: 'whatsapp', description: description.slice(0, 500), createdBy: userId ? oid(userId) : undefined, createdAt: now } } });
  } catch (e: any) {
    console.warn('[wa-chat] could not log the message on the lead:', e?.message);
  }
}

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
 * Notify the owner of the conversation (the lead's counsellor when it is a lead), or — when nobody owns it — everyone who can chat.
 * A burst of messages from one person rings once per 10 minutes.
 */
export async function notifyInbound(tenantId: string, phone: string, preview: string) {
  const t: any = await WhatsAppThread.findOne({ tenantId: oid(tenantId), phone })
    .select('assignedTo lastNotifiedAt contactName links').lean();
  if (!t) return;
  if (t.lastNotifiedAt && Date.now() - new Date(t.lastNotifiedAt).getTime() < NOTIFY_GAP_MS) return;
  const owner = (await effectiveOwner(tenantId, t)).id;
  const recipients = owner ? [owner] : (await chatStaff(tenantId)).map((s) => s._id);
  if (!recipients.length) return;
  const who = t.links?.placementName || t.links?.leadName || t.links?.userName || t.contactName || `+${phone}`;
  await createNotifications(tenantId, recipients, 'general', `💬 WhatsApp from ${who}`, preview || 'New message', `/whatsapp-inbox?phone=${phone}`);
  await WhatsAppThread.updateOne({ _id: t._id }, { $set: { lastNotifiedAt: new Date() } });
  for (const r of recipients) emitWaUser(r, 'wa:notify', { phone, who });
}

// ── One owner ────────────────────────────────────────────────────────────────

/**
 * Who owns a conversation (decided 2026-11-19): when the number belongs to a lead that has a
 * counsellor, that counsellor — the chat follows the lead. Otherwise whoever owns the chat itself.
 */
export async function effectiveOwner(tenantId: string, t: { assignedTo?: any; links?: { leadId?: any } } | null): Promise<{ id: string | null; from: 'lead' | 'chat' | null }> {
  if (t?.links?.leadId) {
    const lead: any = await Lead.findOne({ _id: t.links.leadId, tenantId: oid(tenantId) }).select('assignedTo').lean();
    if (lead?.assignedTo) return { id: String(lead.assignedTo), from: 'lead' };
  }
  if (t?.assignedTo) return { id: String(t.assignedTo), from: 'chat' };
  return { id: null, from: null };
}

async function setLeadCounsellor(tenantId: string, leadId: any, toUserId: string | null, actorId: string) {
  const now = new Date();
  const who = toUserId ? fullName(await User.findById(toUserId).select('firstName lastName').lean()) || 'a team member' : null;
  await Lead.updateOne({ _id: leadId, tenantId: oid(tenantId) }, {
    $set: toUserId
      ? { assignedTo: oid(toUserId), 'assignment.assignedTo': oid(toUserId), 'assignment.assignedAt': now }
      : { assignedTo: null },
    $push: { activities: { type: 'assignment', description: toUserId ? `Counsellor set to ${who} from the WhatsApp inbox` : 'Counsellor removed from the WhatsApp inbox', createdBy: mongoose.isValidObjectId(actorId) ? oid(actorId) : undefined, createdAt: now } },
  });
}

// ── What is happening in a conversation ─────────────────────────────────────

const BOT_LIVE_MS = 48 * 60 * 60 * 1000;

/** Numbers an automation is talking to right now: a workflow run in progress, or the old bot mid-questions. */
export async function automationPhones(tenantId: string): Promise<string[]> {
  const { WorkflowRun } = await import('../models/Workflow');
  const WhatsAppConversationState = (await import('../models/WhatsAppConversationState')).default;
  const [runs, bot, paused] = await Promise.all([
    WorkflowRun.distinct('phone', { tenantId: oid(tenantId), status: { $in: ['running', 'waiting'] }, phone: { $nin: [null, ''] } }),
    WhatsAppConversationState.distinct('phone', { tenantId: String(tenantId), conversationStep: 'in_progress', lastMessageAt: { $gte: new Date(Date.now() - BOT_LIVE_MS) } }),
    WhatsAppThread.distinct('phone', { tenantId: oid(tenantId), botPaused: true }),
  ]);
  const stopped = new Set(paused.map(String));
  return Array.from(new Set([...runs.map(String), ...bot.map(String).filter((p) => !stopped.has(p))]));
}

export type InboxStatus = 'needs_reply' | 'automation' | 'waiting_lead' | 'idle';

// ── The inbox list ───────────────────────────────────────────────────────────

export type InboxFilter = 'all' | 'needs_reply' | 'automation' | 'unread' | 'mine' | 'unassigned' | 'placement' | 'lead' | 'student';
export interface InboxQuery {
  filter?: InboxFilter; q?: string; page?: number; limit?: number;
  owner?: string; stageId?: string; source?: string; type?: 'lead' | 'placement' | 'student' | 'not_sales' | ''; window?: 'open' | 'closing' | 'closed' | '';
  access?: { placement: boolean; leads: boolean };
}

const EPOCH = new Date(0);
const DAY = 24 * 60 * 60 * 1000;
const CLOSING_MS = 3 * 60 * 60 * 1000;

export async function listInbox(tenantId: string, userId: string, opts: InboxQuery) {
  const tid = oid(tenantId);
  // Older threads (from before linking existed) get their records worked out once, so filters are right.
  const unlinked = await WhatsAppThread.find({ tenantId: tid, linkedAt: { $exists: false } }).select('phone').limit(300).lean();
  for (const u of unlinked as any[]) await linkThread(tenantId, u.phone).catch(() => {});

  const match: any = { tenantId: tid };
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

  const auto = await automationPhones(tenantId);
  const now = Date.now();
  const me = oid(userId);

  const base: any[] = [
    { $match: match },
    { $lookup: {
      from: 'leads', let: { lid: '$links.leadId' },
      pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$lid'] } } }, { $project: { assignedTo: 1, stageId: 1, source: 1, priority: 1, lastContactedAt: 1 } }],
      as: 'lead',
    } },
    { $addFields: { lead: { $arrayElemAt: ['$lead', 0] } } },
    { $addFields: {
      owner: { $ifNull: ['$lead.assignedTo', { $ifNull: ['$assignedTo', null] }] },
      // Answered in the chat, marked handled, or the counsellor contacted the lead (a call) after they wrote.
      seenAt: { $max: [{ $ifNull: ['$lastStaffReplyAt', EPOCH] }, { $ifNull: ['$handledAt', EPOCH] }, { $ifNull: ['$lead.lastContactedAt', EPOCH] }] },
      auto: { $in: ['$phone', auto] },
    } },
    { $addFields: {
      needsReply: { $and: [{ $gt: [{ $ifNull: ['$lastInboundAt', EPOCH] }, '$seenAt'] }, { $not: ['$auto'] }] },
    } },
  ];

  const f: any = {};
  switch (opts.filter) {
    case 'needs_reply': f.needsReply = true; break;
    case 'automation': f.auto = true; break;
    case 'unread': f.unreadCount = { $gt: 0 }; break;
    case 'mine': f.owner = me; break;
    case 'unassigned': f.owner = null; break;
    case 'placement': f['links.placementId'] = { $exists: true }; break;
    case 'lead': f['links.leadId'] = { $exists: true }; break;
    case 'student': f['links.userId'] = { $exists: true }; break;
    default: break;
  }
  if (opts.owner === 'none') f.owner = null;
  else if (opts.owner && mongoose.isValidObjectId(opts.owner)) f.owner = oid(opts.owner);
  if (opts.stageId && mongoose.isValidObjectId(opts.stageId)) f['lead.stageId'] = oid(opts.stageId);
  if (opts.source) f['lead.source'] = String(opts.source).toLowerCase().slice(0, 60);
  if (opts.type === 'lead') f['links.leadId'] = { $exists: true };
  if (opts.type === 'placement') f['links.placementId'] = { $exists: true };
  if (opts.type === 'student') f['links.userId'] = { $exists: true };
  if (opts.type === 'not_sales') { f['replyContext.kind'] = { $in: ['hiring', 'wishes', 'update'] }; f['links.leadId'] = { $exists: false }; }
  if (opts.window === 'open') f.lastInboundAt = { $gt: new Date(now - DAY) };
  if (opts.window === 'closing') f.lastInboundAt = { $gt: new Date(now - DAY), $lte: new Date(now - DAY + CLOSING_MS) };
  if (opts.window === 'closed') f.$or = [{ lastInboundAt: { $lte: new Date(now - DAY) } }, { lastInboundAt: null }];

  const limit = Math.min(Math.max(opts.limit || 30, 1), 100);
  const page = Math.max(opts.page || 1, 1);

  const [out] = await WhatsAppThread.aggregate([
    ...base,
    { $facet: {
      rows: [
        { $match: f },
        // Waiting for us first (oldest wait first would bury new ones, so newest activity first within each group).
        { $addFields: { rank: { $cond: ['$needsReply', 2, { $cond: [{ $gt: ['$unreadCount', 0] }, 1, 0] }] } } },
        { $sort: { rank: -1, lastMessageAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $lookup: { from: 'users', localField: 'owner', foreignField: '_id', as: 'ownerDoc', pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }] } },
        { $lookup: { from: 'leadstages', localField: 'lead.stageId', foreignField: '_id', as: 'stageDoc', pipeline: [{ $project: { name: 1, color: 1 } }] } },
      ],
      total: [{ $match: f }, { $count: 'n' }],
      counts: [{ $group: {
        _id: null,
        all: { $sum: 1 },
        needs_reply: { $sum: { $cond: ['$needsReply', 1, 0] } },
        automation: { $sum: { $cond: ['$auto', 1, 0] } },
        unread: { $sum: { $cond: [{ $gt: ['$unreadCount', 0] }, 1, 0] } },
        mine: { $sum: { $cond: [{ $eq: ['$owner', me] }, 1, 0] } },
        unassigned: { $sum: { $cond: [{ $eq: ['$owner', null] }, 1, 0] } },
      } }],
    } },
  ]);

  const statusOf = (t: any): InboxStatus => {
    if (t.auto) return 'automation';
    if (t.needsReply) return 'needs_reply';
    if (t.lastOutboundAt || t.lastStaffReplyAt) return 'waiting_lead';
    return 'idle';
  };
  const c = out?.counts?.[0] || {};
  return {
    rows: (out?.rows || []).map((t: any) => ({
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
      status: statusOf(t),
      waitingSince: t.needsReply ? t.lastInboundAt : undefined,
      assignedTo: t.ownerDoc?.[0] ? { _id: String(t.ownerDoc[0]._id), name: fullName(t.ownerDoc[0]) || t.ownerDoc[0].email } : null,
      ownerFrom: t.lead?.assignedTo ? 'lead' : t.assignedTo ? 'chat' : null,
      replyTo: !t.links?.leadId && t.replyContext?.kind && t.replyContext.kind !== 'sales' ? { kind: t.replyContext.kind, templateName: t.replyContext.templateName || '' } : null,
      lead: t.lead ? {
        stage: t.stageDoc?.[0] ? { name: t.stageDoc[0].name, color: t.stageDoc[0].color } : null,
        source: t.lead.source || '',
        priority: t.lead.priority || '',
      } : null,
    })),
    total: out?.total?.[0]?.n || 0,
    page,
    limit,
    counts: {
      all: c.all || 0, needs_reply: c.needs_reply || 0, automation: c.automation || 0,
      unread: c.unread || 0, mine: c.mine || 0, unassigned: c.unassigned || 0,
    },
  };
}

/** Choices for the inbox filter dropdowns. */
export async function inboxOptions(tenantId: string) {
  const LeadStage = (await import('../models/LeadStage')).default;
  const tid = oid(tenantId);
  const [staff, stages, sources] = await Promise.all([
    chatStaff(tenantId),
    LeadStage.find({ tenantId: tid }).select('name color order').sort({ order: 1 }).lean(),
    Lead.distinct('source', { tenantId: tid }),
  ]);
  return {
    staff,
    stages: (stages as any[]).map((s) => ({ _id: String(s._id), name: s.name, color: s.color })),
    sources: (sources as any[]).filter(Boolean).map(String).sort(),
  };
}

/** "Done — no reply needed" (they were called, or the message needs no answer). */
export async function markHandled(tenantId: string, phone: string, userId: string) {
  const r = await WhatsAppThread.updateOne({ tenantId: oid(tenantId), phone }, { $set: { handledAt: new Date(), handledBy: oid(userId), unreadCount: 0 } });
  if (!r.matchedCount) throw new InboxError('Conversation not found', 404);
  emitWaThread(tenantId, { phone, reason: 'read' });
}

// ── Assignment ───────────────────────────────────────────────────────────────

/**
 * Anyone who can chat may take an unowned conversation or let go of their own. Moving a
 * conversation between other people needs `isAdmin` (an institute admin or template manager).
 * When the number is a lead, the lead's counsellor changes too — one owner for both.
 */
export async function assignThread(tenantId: string, actor: { id: string; isAdmin: boolean }, phone: string, toUserId: string | null) {
  const t: any = await WhatsAppThread.findOne({ tenantId: oid(tenantId), phone }).select('assignedTo links').lean();
  if (!t) throw new InboxError('Conversation not found', 404);
  const current = (await effectiveOwner(tenantId, t)).id;
  const selfAction = (!current && toUserId === actor.id) || (current === actor.id && (toUserId === null || toUserId === actor.id));
  if (!selfAction && !actor.isAdmin) throw new InboxError('Only an admin can move a conversation that belongs to someone else.', 403);
  if (toUserId) {
    if (!mongoose.isValidObjectId(toUserId)) throw new InboxError('Choose a team member');
    const staff = await chatStaff(tenantId);
    if (!staff.some((s) => s._id === toUserId)) throw new InboxError('That person cannot use WhatsApp chat — tick it on their role first.');
  }
  await WhatsAppThread.updateOne({ _id: t._id }, { $set: { assignedTo: toUserId ? oid(toUserId) : null, assignedAt: new Date() } });
  if (t.links?.leadId && current !== toUserId) await setLeadCounsellor(tenantId, t.links.leadId, toUserId, actor.id);
  emitWaThread(tenantId, { phone, reason: 'assign' });
  if (toUserId && toUserId !== actor.id) {
    await createNotifications(tenantId, [toUserId], 'general', '💬 A WhatsApp chat was assigned to you', `+${phone}`, `/whatsapp-inbox?phone=${phone}`).catch(() => {});
    emitWaUser(toUserId, 'wa:notify', { phone, who: `+${phone}`, assigned: true });
  }
  return { assignedTo: toUserId };
}

/**
 * The first person to reply owns the conversation (decided 2026-10-06) — unless someone already
 * does. A lead without a counsellor gets the replier as counsellor too.
 */
export async function autoAssign(tenantId: string, phone: string, userId?: string) {
  if (!userId || !mongoose.isValidObjectId(userId)) return;
  const t: any = await WhatsAppThread.findOne({ tenantId: oid(tenantId), phone }).select('assignedTo links').lean();
  if (!t) return;
  if ((await effectiveOwner(tenantId, t)).id) return;
  await WhatsAppThread.updateOne({ _id: t._id }, { $set: { assignedTo: oid(userId), assignedAt: new Date() } });
  if (t.links?.leadId) await setLeadCounsellor(tenantId, t.links.leadId, userId, userId);
  emitWaThread(tenantId, { phone, reason: 'assign' });
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
