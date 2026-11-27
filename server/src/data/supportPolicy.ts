/**
 * Help & Support — the rules, in one place and free of the database, so they can be read,
 * reasoned about and tested without a server.
 *
 * Nothing here is a promise to a customer. Response times live in SupportConfiguration and are
 * empty until the organisation sets them; this file only decides which states a ticket can be
 * in, who may move it, and who may see what.
 */

export const TICKET_STATUSES = ['open', 'in_progress', 'waiting_on_user', 'resolved', 'closed'] as const;
export type TicketStatus = typeof TICKET_STATUSES[number];

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type TicketPriority = typeof TICKET_PRIORITIES[number];

/** Where a ticket came from. 'ai_chat' only when the member confirmed the assistant's draft. */
export const TICKET_SOURCES = ['help_center', 'ai_chat', 'staff'] as const;
export type TicketSource = typeof TICKET_SOURCES[number];

export const TICKET_CATEGORIES = ['technical', 'content', 'account', 'payment', 'assessment', 'feedback', 'other'] as const;
export type TicketCategory = typeof TICKET_CATEGORIES[number];

/**
 * The part of the product a ticket is about. Named after the CareerPilot member menu, so the
 * analytics heatmap reads the way a member navigates. 'other' when they cannot tell.
 */
export const SUPPORT_MODULES = [
  'account', 'payment', 'assessment', 'plan', 'roadmap', 'practice', 'coding', 'playground', 'thinking_lab',
  'communication', 'interview', 'mentor', 'opportunities', 'news', 'resume', 'progress', 'career_tracks', 'other',
] as const;
export type SupportModule = typeof SUPPORT_MODULES[number];

export const FAQ_STATUSES = ['draft', 'published', 'archived'] as const;
export type FaqStatus = typeof FAQ_STATUSES[number];

/** Who an article is written for. An article with no audience is for everyone signed in. */
export const FAQ_AUDIENCES = ['student', 'faculty', 'coordinator', 'staff'] as const;
export type FaqAudience = typeof FAQ_AUDIENCES[number];

export const LIMITS = {
  subject: 200,
  body: 5000,
  faqQuestion: 300,
  faqAnswer: 20000,
  chatMessage: 2000,
  /** Turns kept on a chat session; older ones are dropped so the prompt stays bounded. */
  chatHistory: 40,
} as const;

// ── Who is asking ────────────────────────────────────────────────────────────

/**
 * The kinds of support actor, from least to most reach.
 *   requester   — a student or faculty member: their own tickets only.
 *   coordinator — a college's admin or placement officer: their college's tickets, no internal notes.
 *   agent       — works tickets: internal notes, assignment, status.
 *   manager     — an agent who also runs FAQs, SLA settings and analytics.
 *   super_admin — the platform owner.
 */
export type SupportActorKind = 'requester' | 'coordinator' | 'agent' | 'manager' | 'super_admin';

export interface SupportActor {
  userId: string;
  tenantId: string;
  /** User.role, as the token carried it. Kept for the audit trail, never for decisions. */
  role: string;
  kind: SupportActorKind;
  /** A requester who teaches. Only affects which FAQ articles they are shown. */
  faculty: boolean;
  /**
   * True only for agents, managers and super admins of the support HQ tenant
   * (SUPPORT_HQ_TENANT_ID): CodeBegun's own staff, who answer every college.
   */
  allTenants: boolean;
}

export type SupportCapability =
  | 'raise'              // open a ticket, write on their own
  | 'viewCollege'        // list and read every ticket of the tenant(s) in reach
  | 'readInternal'       // see staff-only notes
  | 'work'               // reply as staff, assign, change status/priority, escalate, internal notes
  | 'manage';            // FAQs, configuration, analytics

const CAPABILITIES: Record<SupportActorKind, SupportCapability[]> = {
  requester:   ['raise'],
  coordinator: ['raise', 'viewCollege'],
  agent:       ['raise', 'viewCollege', 'readInternal', 'work'],
  manager:     ['raise', 'viewCollege', 'readInternal', 'work', 'manage'],
  super_admin: ['raise', 'viewCollege', 'readInternal', 'work', 'manage'],
};

export const can = (actor: SupportActor, cap: SupportCapability): boolean => CAPABILITIES[actor.kind].includes(cap);

export interface TicketScopeFields { tenantId: unknown; requesterId: unknown }

/**
 * The query filter that limits an actor to the tickets they may see. Every ticket read goes
 * through this, so isolation is a property of the query rather than of a check someone has to
 * remember to call afterwards.
 */
export function ticketScope(actor: SupportActor): Record<string, string> {
  if (can(actor, 'viewCollege')) return actor.allTenants ? {} : { tenantId: actor.tenantId };
  return { tenantId: actor.tenantId, requesterId: actor.userId };
}

/** The same rule as ticketScope, for a ticket already loaded. */
export function canViewTicket(actor: SupportActor, t: TicketScopeFields): boolean {
  if (actor.allTenants && can(actor, 'viewCollege')) return true;
  if (String(t.tenantId) !== actor.tenantId) return false;
  return can(actor, 'viewCollege') || String(t.requesterId) === actor.userId;
}

/** A requester writes on their own ticket; staff on any ticket in reach. Coordinators read only. */
export function canWriteOnTicket(actor: SupportActor, t: TicketScopeFields): boolean {
  if (!canViewTicket(actor, t)) return false;
  return can(actor, 'work') || String(t.requesterId) === actor.userId;
}

// ── How a ticket moves ───────────────────────────────────────────────────────

/**
 * Status changes staff may make. Requesters have exactly two moves, below; nobody else gets any.
 * 'closed' is final for staff too: a closed ticket is reopened, never edited back to life.
 */
const STAFF_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open:            ['in_progress', 'waiting_on_user', 'resolved', 'closed'],
  in_progress:     ['open', 'waiting_on_user', 'resolved', 'closed'],
  waiting_on_user: ['open', 'in_progress', 'resolved', 'closed'],
  resolved:        ['in_progress', 'closed'],
  closed:          [],
};

export function canTransition(actor: SupportActor, from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return false;
  if (can(actor, 'work')) return STAFF_TRANSITIONS[from].includes(to);
  return false;
}

/**
 * What a requester's reply does to the status. Answering a "waiting on you" puts the ticket back
 * in the queue; a reply on a resolved or closed ticket is refused — that is what reopen is for.
 */
export function statusAfterRequesterReply(current: TicketStatus): TicketStatus | null {
  if (current === 'resolved' || current === 'closed') return null;
  return current === 'waiting_on_user' ? 'open' : current;
}

export interface ReopenPolicy {
  /** Off means only staff can bring a ticket back. */
  allowed: boolean;
  /** Days after resolution in which a requester may reopen; null means no limit. */
  windowDays: number | null;
  /** Reopens allowed per ticket; null means no limit. */
  maxReopens: number | null;
}

/**
 * Whether a requester may reopen. The policy comes from SupportConfiguration; when the
 * organisation has not set one, reopening is allowed with no window, which promises nothing
 * beyond "you can tell us it is not fixed".
 */
export function reopenDecision(
  policy: ReopenPolicy, t: { status: TicketStatus; resolvedAt?: Date | null; closedAt?: Date | null; reopenCount?: number },
  now = new Date(),
): { ok: true } | { ok: false; reason: 'not_resolved' | 'disabled' | 'window' | 'limit' } {
  if (t.status !== 'resolved' && t.status !== 'closed') return { ok: false, reason: 'not_resolved' };
  if (!policy.allowed) return { ok: false, reason: 'disabled' };
  if (policy.maxReopens != null && (t.reopenCount || 0) >= policy.maxReopens) return { ok: false, reason: 'limit' };
  const since = t.resolvedAt || t.closedAt;
  if (policy.windowDays != null && since && now.getTime() - new Date(since).getTime() > policy.windowDays * 86_400_000) {
    return { ok: false, reason: 'window' };
  }
  return { ok: true };
}

// ── Mass assignment ──────────────────────────────────────────────────────────

/**
 * Copies only the named fields from a request body. Identity, tenant, status and every other
 * server-owned field are simply never on the list, so a body that sends them changes nothing.
 */
export function pickAllowed<K extends string>(body: unknown, fields: readonly K[]): Partial<Record<K, unknown>> {
  const out: Partial<Record<K, unknown>> = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return out;
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) out[f] = (body as Record<string, unknown>)[f];
  }
  return out;
}
