import mongoose from 'mongoose';
import SupportTicket, { ISupportTicket } from '../models/SupportTicket';
import SupportMessage from '../models/SupportMessage';
import SupportAuditLog from '../models/SupportAuditLog';
import SupportChatSession from '../models/SupportChatSession';
import User from '../models/User';
import Tenant from '../models/Tenant';
import {
  SupportActor, can, ticketScope, canViewTicket, canWriteOnTicket, canTransition, statusAfterRequesterReply,
  reopenDecision, pickAllowed, TICKET_STATUSES, TICKET_PRIORITIES, TICKET_CATEGORIES, SUPPORT_MODULES,
  TicketStatus, TicketPriority, LIMITS,
} from '../data/supportPolicy';
import { audit, effectiveSupportConfig, resolveSupportActor, EffectiveSupportConfig } from './supportAccess';
import { nextTicketNumber } from './supportTicketNumber';
import { notifySupport } from './supportNotify';
import { StoredAttachment } from './supportAttachments';
import { redactText } from '../utils/redact';
import { linkTicket, errorsForTicket } from './supportMonitoring';

/**
 * Help & Support tickets. Every function takes the actor (built from the login by
 * requireSupport) and never an identity from the request body. Reads are scoped in the query
 * (ticketScope); a ticket outside the actor's reach is reported as not found, so its existence
 * is not given away either.
 */
export class SupportError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

const notFound = () => new SupportError(404, 'Ticket not found.');
const isId = (v: unknown): v is string => typeof v === 'string' && mongoose.isValidObjectId(v) && /^[a-f0-9]{24}$/i.test(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | undefined => (list as readonly string[]).includes(String(v)) ? v as T : undefined;
const SAFE_REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;
/** Seconds within which the same subject and text from the same person is the same ticket. */
const DUPLICATE_WINDOW_MS = 2 * 60_000;

export interface RequestCtx { requestId?: string; userAgent?: string }

const cleanText = (v: unknown, max: number): string => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, max);
/** A page of the app, as a path: no query string, no host, nothing that is not a path character. */
export const cleanRoute = (v: unknown): string | undefined => {
  const s = String(v ?? '').split(/[?#]/)[0].trim();
  return /^\/[\w\-/.:]{0,199}$/.test(s) ? s : undefined;
};

// ── Shaping what each audience sees ─────────────────────────────────────────

export interface SlaView {
  firstResponse: SlaClock | null;
  resolution: SlaClock | null;
}
export interface SlaClock { targetMinutes: number; dueAt: Date; met: boolean | null; elapsedPct: number }

/**
 * Progress against the organisation's targets, or null when none is set. The clock runs from
 * creation and does not pause while waiting on the member (documented in the Phase 8 docs).
 */
export function slaFor(t: Pick<ISupportTicket, 'priority' | 'createdAt' | 'firstResponseAt' | 'resolvedAt'>, cfg: EffectiveSupportConfig, now = new Date()): SlaView | null {
  if (!cfg.slaConfigured) return null;
  const clock = (target: number | null, doneAt?: Date | null): SlaClock | null => {
    if (target == null) return null;
    const start = new Date(t.createdAt).getTime();
    const dueAt = new Date(start + target * 60_000);
    const end = doneAt ? new Date(doneAt).getTime() : now.getTime();
    return { targetMinutes: target, dueAt, met: doneAt ? end <= dueAt.getTime() : (now > dueAt ? false : null), elapsedPct: Math.min(100, Math.max(0, Math.round(((end - start) / (target * 60_000)) * 100))) };
  };
  return {
    firstResponse: clock(cfg.firstResponseMinutes[t.priority], t.firstResponseAt),
    resolution: clock(cfg.resolutionMinutes[t.priority], t.resolvedAt),
  };
}

const nameOf = (u: any) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || 'User' : null);

/** The ticket as its requester (or a coordinator) sees it: no assignee, no diagnostics of staff interest. */
function memberView(t: any, cfg: EffectiveSupportConfig | null, actor: SupportActor) {
  const reopen = cfg ? reopenDecision(cfg.reopen, t) : { ok: false };
  return {
    id: String(t._id),
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    description: t.description,
    module: t.module,
    category: t.category,
    source: t.source,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    lastActivityAt: t.lastActivityAt,
    firstResponseAt: t.firstResponseAt,
    resolvedAt: t.resolvedAt,
    closedAt: t.closedAt,
    reopenCount: t.reopenCount,
    context: t.context ? { route: t.context.route, requestId: t.context.requestId } : undefined,
    diagnosticsConsent: !!t.diagnosticsConsent,
    canReopen: String(t.requesterId?._id || t.requesterId) === actor.userId && reopen.ok,
    canReply: canWriteOnTicket(actor, { tenantId: t.tenantId, requesterId: t.requesterId?._id || t.requesterId }) && statusAfterRequesterReply(t.status) !== null,
    sla: cfg ? slaFor(t, cfg) : null,
  };
}

/** The staff view adds who, where, assignment, escalation and the consented diagnostics. */
function staffView(t: any, cfg: EffectiveSupportConfig | null, actor: SupportActor, tenantName?: string) {
  const base = memberView(t, cfg, actor);
  const requester = t.requesterId && typeof t.requesterId === 'object' && t.requesterId.firstName !== undefined ? t.requesterId : null;
  const assignee = t.assigneeId && typeof t.assigneeId === 'object' && t.assigneeId.firstName !== undefined ? t.assigneeId : null;
  return {
    ...base,
    canReply: can(actor, 'work'),
    tenant: { id: String(t.tenantId), name: tenantName },
    requester: { id: String(requester?._id || t.requesterId), name: nameOf(requester), email: requester?.email, role: t.requesterRole },
    assignee: t.assigneeId ? { id: String(assignee?._id || t.assigneeId), name: nameOf(assignee) } : null,
    escalated: !!t.escalated,
    escalatedAt: t.escalatedAt,
    context: t.context,
    diagnostics: t.diagnosticsConsent ? t.diagnostics : undefined,
    chatSessionId: t.chatSessionId ? String(t.chatSessionId) : null,
  };
}

const viewFor = (t: any, cfg: EffectiveSupportConfig | null, actor: SupportActor, tenantName?: string) =>
  can(actor, 'readInternal') ? staffView(t, cfg, actor, tenantName) : memberView(t, cfg, actor);

// ── Creating ────────────────────────────────────────────────────────────────

export const CREATE_FIELDS = ['subject', 'description', 'module', 'category', 'route', 'relatedRequestId', 'diagnosticsConsent', 'diagnostics', 'chatSessionId'] as const;

export async function createTicket(actor: SupportActor, body: unknown, ctx: RequestCtx) {
  const b = pickAllowed(body, CREATE_FIELDS);
  const subject = cleanText(b.subject, LIMITS.subject + 1);
  const description = cleanText(b.description, LIMITS.body + 1);
  if (subject.length < 3) throw new SupportError(400, 'Please add a short subject (at least 3 characters).');
  if (subject.length > LIMITS.subject) throw new SupportError(400, `Keep the subject under ${LIMITS.subject} characters.`);
  if (!description) throw new SupportError(400, 'Please describe the problem.');
  if (description.length > LIMITS.body) throw new SupportError(400, `Keep the description under ${LIMITS.body} characters.`);

  // The same request sent twice (a double click, a retry after a slow network) is one ticket.
  const recent = await SupportTicket.findOne({
    tenantId: actor.tenantId, requesterId: actor.userId, subject, description,
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
  }).lean();
  if (recent) return { ticket: memberView(recent, null, actor), duplicate: true };

  const consent = b.diagnosticsConsent === true;
  const diagSummary = consent && typeof b.diagnostics === 'string' ? redactText(cleanText(b.diagnostics, 4000)) : '';

  let chatSessionId: string | null = null;
  if (b.chatSessionId != null) {
    if (!isId(b.chatSessionId)) throw new SupportError(400, 'That conversation could not be found.');
    const session = await SupportChatSession.findOne({ _id: b.chatSessionId, userId: actor.userId, tenantId: actor.tenantId }).select('_id ticketId').lean();
    if (!session) throw new SupportError(400, 'That conversation could not be found.');
    if (session.ticketId) {
      const existing = await SupportTicket.findById(session.ticketId).lean();
      if (existing) return { ticket: memberView(existing, null, actor), duplicate: true };
    }
    chatSessionId = String(session._id);
  }

  const related = typeof b.relatedRequestId === 'string' && SAFE_REQUEST_ID.test(b.relatedRequestId) ? b.relatedRequestId : undefined;
  const t = await SupportTicket.create({
    tenantId: actor.tenantId,
    ticketNumber: await nextTicketNumber(),
    requesterId: actor.userId,
    requesterRole: actor.role,
    subject,
    description,
    module: oneOf(SUPPORT_MODULES, b.module) || 'other',
    category: oneOf(TICKET_CATEGORIES, b.category) || 'other',
    source: chatSessionId ? 'ai_chat' : 'help_center',
    context: { route: cleanRoute(b.route), requestId: related || ctx.requestId },
    diagnosticsConsent: consent,
    diagnostics: consent ? { summary: [diagSummary, ctx.userAgent ? `Browser: ${cleanText(ctx.userAgent, 300)}` : ''].filter(Boolean).join('\n') || undefined, capturedAt: new Date() } : undefined,
    chatSessionId,
  });
  if (chatSessionId) await SupportChatSession.updateOne({ _id: chatSessionId }, { $set: { ticketId: t._id, status: 'escalated' } });

  await audit({ actor, entity: 'ticket', entityId: t._id, tenantId: t.tenantId, action: 'created', requestId: ctx.requestId, changes: { status: { to: 'open' } } });
  linkTicket(t._id, related);
  notifySupport({ event: 'created', tenantId: actor.tenantId, ticketId: String(t._id), ticketNumber: t.ticketNumber, to: [actor.userId], audience: 'member' });
  return { ticket: memberView(t.toObject(), null, actor), duplicate: false };
}

// ── Reading ─────────────────────────────────────────────────────────────────

export interface Page { page: number; limit: number }
export const pageOf = (q: any, max = 100): Page => ({
  page: Math.max(1, Math.min(10_000, Number.parseInt(String(q?.page ?? '1'), 10) || 1)),
  limit: Math.max(1, Math.min(max, Number.parseInt(String(q?.limit ?? '20'), 10) || 20)),
});

export async function myTickets(actor: SupportActor, q: any) {
  const { page, limit } = pageOf(q, 50);
  const filter: any = { tenantId: actor.tenantId, requesterId: actor.userId };
  const status = oneOf(TICKET_STATUSES, q?.status);
  if (status) filter.status = status;
  const [rows, total] = await Promise.all([
    SupportTicket.find(filter).sort({ lastActivityAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SupportTicket.countDocuments(filter),
  ]);
  return { tickets: rows.map(t => memberView(t, null, actor)), total, page, limit };
}

/** Loads a ticket the actor may see, or throws not found. */
async function loadInReach(actor: SupportActor, id: unknown) {
  if (!isId(id)) throw notFound();
  const t = await SupportTicket.findOne({ _id: id, ...ticketScope(actor) });
  if (!t || !canViewTicket(actor, t)) throw notFound();
  return t;
}

const REQUESTER_TIMELINE = new Set(['created', 'status', 'reopened']);

export async function ticketDetail(actor: SupportActor, id: unknown, ctx: RequestCtx) {
  const t = await loadInReach(actor, id);
  const staff = can(actor, 'readInternal');
  const msgFilter: any = { ticketId: t._id };
  // Internal notes are excluded in the query itself, not filtered afterwards.
  if (!staff) msgFilter.visibility = 'public';
  const [cfg, messages, trail, populated, tenant] = await Promise.all([
    effectiveSupportConfig(String(t.tenantId)),
    SupportMessage.find(msgFilter).sort({ createdAt: 1 }).populate(staff ? { path: 'authorId', select: 'firstName lastName' } : undefined as any).lean(),
    SupportAuditLog.find({ entity: 'ticket', entityId: t._id, ...(staff ? {} : { action: { $in: [...REQUESTER_TIMELINE] } }) }).sort({ createdAt: 1 }).limit(200).lean(),
    staff ? SupportTicket.findById(t._id).populate('requesterId', 'firstName lastName email').populate('assigneeId', 'firstName lastName').lean() : t.toObject(),
    staff && actor.allTenants ? Tenant.findById(t.tenantId).select('name').lean() : null,
  ]);

  if (actor.allTenants && String(t.tenantId) !== actor.tenantId) {
    await audit({ actor, entity: 'ticket', entityId: t._id, tenantId: t.tenantId, action: 'view', requestId: ctx.requestId });
  }

  // Staff see the technical side: error groups linked by request id, and others nearby in time.
  const errors = staff ? await errorsForTicket({ _id: t._id, module: t.module, createdAt: t.createdAt }).catch(() => ({ linked: [], possiblyRelated: [] })) : undefined;

  return {
    ticket: viewFor(populated, cfg, actor, (tenant as any)?.name),
    errors,
    messages: messages.map((m: any) => ({
      id: String(m._id),
      authorKind: m.authorKind,
      // Members see "you" and "Support"; staff see names.
      author: m.authorKind === 'requester' ? (staff ? 'Requester' : 'You') : m.authorKind === 'system' ? 'CareerPilot' : (staff ? nameOf(m.authorId) || 'Support' : 'Support team'),
      visibility: m.visibility,
      body: m.body,
      attachments: (m.attachments || []).map((a: any) => ({ id: String(a._id), name: a.name, mime: a.mime, size: a.size })),
      createdAt: m.createdAt,
    })),
    timeline: trail.map((a: any) => ({
      action: a.action,
      at: a.createdAt,
      by: staff ? a.actorKind : (String(a.actorId) === actor.userId ? 'you' : 'support'),
      changes: staff ? a.changes : a.changes?.status ? { status: a.changes.status } : undefined,
    })),
  };
}

// ── Writing on a ticket ─────────────────────────────────────────────────────

/** Throws not found unless the actor may write on this ticket. Checked before any upload is kept. */
export async function assertCanWrite(actor: SupportActor, id: unknown): Promise<void> {
  const t = await loadInReach(actor, id);
  if (!canWriteOnTicket(actor, t)) throw notFound();
}

export const MESSAGE_FIELDS = ['body', 'internal', 'requestInfo', 'resolve'] as const;

export async function addMessage(actor: SupportActor, id: unknown, body: unknown, files: StoredAttachment[], ctx: RequestCtx) {
  const t = await loadInReach(actor, id);
  if (!canWriteOnTicket(actor, t)) throw notFound();
  const b = pickAllowed(body, MESSAGE_FIELDS);
  const text = cleanText(b.body, LIMITS.body + 1);
  if (!text) throw new SupportError(400, 'Please write a message.');
  if (text.length > LIMITS.body) throw new SupportError(400, `Keep the message under ${LIMITS.body} characters.`);

  const asStaff = can(actor, 'work');
  const isRequester = String(t.requesterId) === actor.userId;
  const internal = asStaff && (b.internal === true || b.internal === 'true');
  const before = t.status;
  let next: TicketStatus = t.status;

  if (asStaff && !isRequester) {
    if (!internal) {
      if (!t.firstResponseAt) t.firstResponseAt = new Date();
      const want: TicketStatus | null = b.resolve === true || b.resolve === 'true' ? 'resolved'
        : b.requestInfo === true || b.requestInfo === 'true' ? 'waiting_on_user'
        : t.status === 'open' ? 'in_progress' : null;
      if (want && want !== t.status) {
        if (!canTransition(actor, t.status, want)) throw new SupportError(409, `A ${t.status.replace(/_/g, ' ')} ticket cannot move to ${want.replace(/_/g, ' ')}.`);
        next = want;
      }
    }
  } else {
    const after = statusAfterRequesterReply(t.status);
    if (after === null) throw new SupportError(409, 'This ticket is resolved. Reopen it if the problem is back.', 'RESOLVED');
    next = after;
  }

  const msg = await SupportMessage.create({
    tenantId: t.tenantId,
    ticketId: t._id,
    authorId: actor.userId,
    authorKind: asStaff && !isRequester ? 'staff' : 'requester',
    visibility: internal ? 'internal' : 'public',
    body: text,
    attachments: files,
  });

  t.lastActivityAt = new Date();
  if (next !== before) applyStatus(t, next);
  await t.save();

  if (internal) await audit({ actor, entity: 'message', entityId: msg._id, tenantId: t.tenantId, action: 'internal_note', requestId: ctx.requestId });
  if (next !== before) await audit({ actor, entity: 'ticket', entityId: t._id, tenantId: t.tenantId, action: 'status', requestId: ctx.requestId, changes: { status: { from: before, to: next } } });

  if (!internal) {
    if (asStaff && !isRequester) {
      const event = next === 'waiting_on_user' ? 'info_requested' : next === 'resolved' ? 'resolved' : 'staff_replied';
      notifySupport({ event, tenantId: String(t.tenantId), ticketId: String(t._id), ticketNumber: t.ticketNumber, to: [String(t.requesterId)], actorId: actor.userId, audience: 'member' });
    } else if (t.assigneeId) {
      void notifyAssignee(t, 'staff_replied', actor.userId);
    }
  }
  return { id: String(msg._id), status: t.status };
}

/** Status side effects in one place: resolution and closing stamps. */
function applyStatus(t: ISupportTicket, next: TicketStatus) {
  t.status = next;
  if (next === 'resolved') t.resolvedAt = new Date();
  if (next === 'closed') { t.closedAt = new Date(); if (!t.resolvedAt) t.resolvedAt = t.closedAt; }
  if (next === 'open' || next === 'in_progress' || next === 'waiting_on_user') { t.resolvedAt = null; t.closedAt = null; }
}

/** Staff notices go to the assignee in THEIR tenant, which for the support HQ is not the ticket's. */
async function notifyAssignee(t: ISupportTicket, event: 'assigned' | 'staff_replied' | 'reopened', actorId: string) {
  try {
    const a: any = await User.findById(t.assigneeId).select('tenantId').lean();
    if (!a) return;
    notifySupport({ event, tenantId: String(a.tenantId), ticketId: String(t._id), ticketNumber: t.ticketNumber, to: [String(t.assigneeId)], actorId, audience: 'staff' });
  } catch { /* a notice is never worth an error */ }
}

export async function reopenTicket(actor: SupportActor, id: unknown, body: unknown, ctx: RequestCtx) {
  const t = await loadInReach(actor, id);
  if (String(t.requesterId) !== actor.userId) throw notFound();
  const cfg = await effectiveSupportConfig(String(t.tenantId));
  const d = reopenDecision(cfg.reopen, t);
  if (d.ok === false) {
    const why = { not_resolved: 'This ticket is still open.', disabled: 'Resolved tickets cannot be reopened here. Please raise a new ticket.', window: 'This ticket was resolved too long ago to reopen. Please raise a new ticket.', limit: 'This ticket has been reopened the maximum number of times. Please raise a new ticket.' }[d.reason];
    throw new SupportError(409, why, d.reason.toUpperCase());
  }
  const reason = cleanText(pickAllowed(body, ['reason'] as const).reason, LIMITS.body);
  const before = t.status;
  applyStatus(t, 'open');
  t.reopenCount += 1;
  t.lastActivityAt = new Date();
  await t.save();
  if (reason) await SupportMessage.create({ tenantId: t.tenantId, ticketId: t._id, authorId: actor.userId, authorKind: 'requester', visibility: 'public', body: reason });
  await audit({ actor, entity: 'ticket', entityId: t._id, tenantId: t.tenantId, action: 'reopened', requestId: ctx.requestId, changes: { status: { from: before, to: 'open' } } });
  if (t.assigneeId) void notifyAssignee(t, 'reopened', actor.userId);
  return { status: t.status, reopenCount: t.reopenCount };
}

// ── Staff: changing a ticket ─────────────────────────────────────────────────

export const UPDATE_FIELDS = ['status', 'priority', 'assigneeId', 'escalated'] as const;

/** Whether this user can be given tickets of this tenant. */
async function assignableTo(actor: SupportActor, ticketTenantId: string, assigneeId: string): Promise<boolean> {
  const u: any = await User.findById(assigneeId).select('role tenantId customRoleId isActive').lean();
  if (!u || u.isActive === false) return false;
  const a = await resolveSupportActor({ id: String(u._id), role: u.role, tenantId: String(u.tenantId), customRoleId: u.customRoleId ? String(u.customRoleId) : null });
  if (!can(a, 'work')) return false;
  if (!a.allTenants && a.tenantId !== ticketTenantId) return false;
  // A college's own agent can only hand work to someone in that college.
  if (!actor.allTenants && a.tenantId !== actor.tenantId) return false;
  return true;
}

export async function updateTicket(actor: SupportActor, id: unknown, body: unknown, ctx: RequestCtx) {
  if (!can(actor, 'work')) throw new SupportError(403, 'You do not have access to this.');
  const t = await loadInReach(actor, id);
  const b = pickAllowed(body, UPDATE_FIELDS);
  const changes: Record<string, { from?: unknown; to?: unknown }> = {};

  if (b.status !== undefined) {
    const to = oneOf(TICKET_STATUSES, b.status);
    if (!to) throw new SupportError(400, 'Unknown status.');
    if (to !== t.status) {
      if (!canTransition(actor, t.status, to)) throw new SupportError(409, `A ${t.status.replace(/_/g, ' ')} ticket cannot move to ${to.replace(/_/g, ' ')}.`);
      changes.status = { from: t.status, to };
      applyStatus(t, to);
    }
  }
  if (b.priority !== undefined) {
    const p = oneOf(TICKET_PRIORITIES, b.priority);
    if (!p) throw new SupportError(400, 'Unknown priority.');
    if (p !== t.priority) { changes.priority = { from: t.priority, to: p }; t.priority = p as TicketPriority; }
  }
  if (b.assigneeId !== undefined) {
    const to = b.assigneeId === null || b.assigneeId === '' ? null : b.assigneeId === 'me' ? actor.userId : b.assigneeId;
    if (to !== null && !isId(to)) throw new SupportError(400, 'Unknown assignee.');
    if (to !== null && !(await assignableTo(actor, String(t.tenantId), String(to)))) throw new SupportError(400, 'That person cannot be assigned this ticket.');
    if (String(t.assigneeId || '') !== String(to || '')) { changes.assignee = { from: t.assigneeId ? String(t.assigneeId) : null, to }; t.assigneeId = to as any; }
  }
  if (b.escalated !== undefined) {
    const esc = b.escalated === true || b.escalated === 'true';
    if (esc !== t.escalated) { changes.escalated = { from: t.escalated, to: esc }; t.escalated = esc; t.escalatedAt = esc ? new Date() : null; }
  }
  if (!Object.keys(changes).length) return { changed: false, status: t.status };

  t.lastActivityAt = new Date();
  await t.save();
  for (const [field, c] of Object.entries(changes)) {
    await audit({ actor, entity: 'ticket', entityId: t._id, tenantId: t.tenantId, action: field === 'assignee' ? 'assigned' : field, requestId: ctx.requestId, changes: { [field]: c } });
  }
  if (changes.assignee?.to) void notifyAssignee(t, 'assigned', actor.userId);
  if (changes.status?.to === 'resolved' || changes.status?.to === 'waiting_on_user') {
    notifySupport({ event: changes.status.to === 'resolved' ? 'resolved' : 'info_requested', tenantId: String(t.tenantId), ticketId: String(t._id), ticketNumber: t.ticketNumber, to: [String(t.requesterId)], actorId: actor.userId, audience: 'member' });
  }
  return { changed: true, status: t.status, changes: Object.keys(changes) };
}

export async function bulkUpdate(actor: SupportActor, body: unknown, ctx: RequestCtx) {
  if (!can(actor, 'work')) throw new SupportError(403, 'You do not have access to this.');
  const b = pickAllowed(body, ['ids', 'update'] as const);
  const ids = Array.isArray(b.ids) ? [...new Set(b.ids.map(String))] : [];
  if (!ids.length || ids.length > 100) throw new SupportError(400, 'Choose between 1 and 100 tickets.');
  const update = pickAllowed(b.update, UPDATE_FIELDS);
  if (!Object.keys(update).length) throw new SupportError(400, 'Nothing to change.');
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const id of ids) {
    try { await updateTicket(actor, id, update, ctx); results.push({ id, ok: true }); }
    catch (e: any) { results.push({ id, ok: false, error: e instanceof SupportError ? e.message : 'Could not update.' }); }
  }
  return { results, updated: results.filter(r => r.ok).length };
}

// ── Staff: the queue ─────────────────────────────────────────────────────────

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 }, oldest: { createdAt: 1 },
  urgent: { priorityRank: -1, createdAt: 1 }, activity: { lastActivityAt: -1 },
};
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Builds the queue filter from the query string; every value is checked against a list. */
export function queueFilter(actor: SupportActor, q: any): Record<string, unknown> {
  const f: any = { ...ticketScope(actor) };
  const list = <T extends string>(all: readonly T[], v: unknown) => String(v ?? '').split(',').map(s => s.trim()).filter(s => (all as readonly string[]).includes(s));
  const st = list(TICKET_STATUSES, q.status); if (st.length) f.status = { $in: st };
  const pr = list(TICKET_PRIORITIES, q.priority); if (pr.length) f.priority = { $in: pr };
  const mo = list(SUPPORT_MODULES, q.module); if (mo.length) f.module = { $in: mo };
  const ca = list(TICKET_CATEGORIES, q.category); if (ca.length) f.category = { $in: ca };
  if (q.source === 'ai_chat' || q.source === 'help_center' || q.source === 'staff') f.source = q.source;
  if (q.assignee === 'me') f.assigneeId = new mongoose.Types.ObjectId(actor.userId);
  else if (q.assignee === 'none') f.assigneeId = null;
  else if (isId(q.assignee)) f.assigneeId = new mongoose.Types.ObjectId(q.assignee);
  if (q.escalated === 'true') f.escalated = true;
  if (q.reopened === 'true') f.reopenCount = { $gt: 0 };
  if (actor.allTenants && isId(q.tenantId)) f.tenantId = new mongoose.Types.ObjectId(q.tenantId);
  else if (f.tenantId) f.tenantId = new mongoose.Types.ObjectId(String(f.tenantId));
  const from = q.from ? new Date(String(q.from)) : null; const to = q.to ? new Date(String(q.to)) : null;
  if ((from && !isNaN(+from)) || (to && !isNaN(+to))) f.createdAt = { ...(from && !isNaN(+from) ? { $gte: from } : {}), ...(to && !isNaN(+to) ? { $lte: to } : {}) };
  const search = String(q.q ?? '').trim().slice(0, 100);
  if (search) {
    f.$or = /^SUP-\d{2}-\d+$/i.test(search) ? [{ ticketNumber: search.toUpperCase() }] : [{ subject: { $regex: escapeRegex(search), $options: 'i' } }, { ticketNumber: { $regex: `^${escapeRegex(search.toUpperCase())}` } }];
  }
  return f;
}

export async function queue(actor: SupportActor, q: any) {
  const { page, limit } = pageOf(q);
  const f = queueFilter(actor, q || {});
  const sort = SORTS[String(q?.sort)] || SORTS.newest;
  const [rows, total] = await Promise.all([
    SupportTicket.find(f).sort(sort).skip((page - 1) * limit).limit(limit)
      .populate('requesterId', 'firstName lastName email').populate('assigneeId', 'firstName lastName').lean(),
    SupportTicket.countDocuments(f),
  ]);
  const tenantNames = actor.allTenants
    ? new Map((await Tenant.find({ _id: { $in: [...new Set(rows.map((r: any) => String(r.tenantId)))] } }).select('name').lean()).map((x: any) => [String(x._id), x.name]))
    : new Map<string, string>();
  return {
    tickets: rows.map((t: any) => {
      const v = viewFor(t, null, actor, tenantNames.get(String(t.tenantId)));
      // The list never carries the full text or diagnostics.
      const { description, diagnostics, ...row } = v as any;
      void description; void diagnostics;
      return row;
    }),
    total, page, limit,
  };
}

/** People a ticket can be assigned to, within the actor's reach. */
export async function assignableAgents(actor: SupportActor) {
  if (!can(actor, 'work')) throw new SupportError(403, 'You do not have access to this.');
  const Role = mongoose.model('Role');
  const roles = await Role.find({ permissions: { $in: ['support_agent', 'support_manager'] } }).select('_id').lean();
  const tenants = actor.allTenants ? undefined : [actor.tenantId];
  const users = await User.find({
    $or: [{ customRoleId: { $in: roles.map((r: any) => r._id) } }, { role: 'SUPER_ADMIN' }],
    isActive: { $ne: false },
    ...(tenants ? { tenantId: { $in: tenants } } : { tenantId: actor.tenantId }),
  }).select('firstName lastName role').limit(200).lean();
  return users.map((u: any) => ({ id: String(u._id), name: nameOf(u) }));
}

export async function attachmentFor(actor: SupportActor, ticketId: unknown, attachmentId: unknown) {
  const t = await loadInReach(actor, ticketId);
  if (!isId(attachmentId)) throw notFound();
  const filter: any = { ticketId: t._id, 'attachments._id': attachmentId };
  if (!can(actor, 'readInternal')) filter.visibility = 'public';
  const m: any = await SupportMessage.findOne(filter).select('attachments').lean();
  const a = m?.attachments?.find((x: any) => String(x._id) === String(attachmentId));
  if (!a) throw notFound();
  return { ticketId: String(t._id), ...a };
}
