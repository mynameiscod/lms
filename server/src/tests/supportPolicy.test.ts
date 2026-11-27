/**
 * Help & Support — who may see and do what, how a ticket moves, and what a request body is
 * allowed to set. Pure rules, no database (services/supportAccess decides from these).
 */
import {
  SupportActor, can, ticketScope, canViewTicket, canWriteOnTicket, canTransition,
  statusAfterRequesterReply, reopenDecision, pickAllowed, TICKET_STATUSES,
} from '../data/supportPolicy';
import { decideSupportActor, mergeSupportConfig } from '../services/supportAccess';

const HQ = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const COLLEGE = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const OTHER = 'cccccccccccccccccccccccc';

const actor = (role: string, opts: { perms?: string[]; collegeRole?: string; tenantId?: string; id?: string; hq?: string } = {}) =>
  decideSupportActor({
    user: { id: opts.id || 'u1', role, tenantId: opts.tenantId || COLLEGE },
    permissions: opts.perms || [],
    collegeRole: opts.collegeRole || null,
    hqTenantId: opts.hq ?? HQ,
  });

describe('who the caller is', () => {
  it('a student is a requester', () => {
    const a = actor('STUDENT');
    expect(a.kind).toBe('requester');
    expect(a.faculty).toBe(false);
    expect(a.allTenants).toBe(false);
  });

  it('faculty are requesters who are shown faculty articles', () => {
    expect(actor('INSTRUCTOR')).toMatchObject({ kind: 'requester', faculty: true });
    expect(actor('STAFF', { collegeRole: 'DEPT_HEAD' })).toMatchObject({ kind: 'requester', faculty: true });
    expect(actor('STAFF', { collegeRole: 'CRT_TRAINER' })).toMatchObject({ kind: 'requester', faculty: true });
  });

  it('a college admin or placement officer is a coordinator', () => {
    expect(actor('TENANT_ADMIN').kind).toBe('coordinator');
    expect(actor('STAFF', { collegeRole: 'COLLEGE_ADMIN' }).kind).toBe('coordinator');
    expect(actor('STAFF', { collegeRole: 'PLACEMENT_OFFICER' }).kind).toBe('coordinator');
    expect(actor('STUDENT', { collegeRole: 'STUDENT' }).kind).toBe('requester');
  });

  it('agent and manager come from permissions on a custom role', () => {
    expect(actor('STAFF', { perms: ['support_agent'] }).kind).toBe('agent');
    expect(actor('STAFF', { perms: ['support_agent', 'support_manager'] }).kind).toBe('manager');
    expect(actor('TENANT_ADMIN', { perms: ['support_agent'] }).kind).toBe('agent');
  });

  it('only staff of the support HQ tenant reach every college', () => {
    expect(actor('STAFF', { perms: ['support_agent'], tenantId: HQ }).allTenants).toBe(true);
    expect(actor('STAFF', { perms: ['support_manager'], tenantId: HQ }).allTenants).toBe(true);
    expect(actor('SUPER_ADMIN', { tenantId: HQ }).allTenants).toBe(true);
    // Same permission, a college's own tenant: that college only.
    expect(actor('STAFF', { perms: ['support_agent'], tenantId: COLLEGE }).allTenants).toBe(false);
    // A coordinator or student of the HQ tenant is not staff.
    expect(actor('TENANT_ADMIN', { tenantId: HQ }).allTenants).toBe(false);
    expect(actor('STUDENT', { tenantId: HQ }).allTenants).toBe(false);
  });

  it('with no HQ tenant configured nobody reaches across tenants', () => {
    expect(actor('SUPER_ADMIN', { tenantId: HQ, hq: '' }).allTenants).toBe(false);
    expect(actor('STAFF', { perms: ['support_manager'], tenantId: HQ, hq: '' }).allTenants).toBe(false);
  });

  it('capabilities grow with the kind', () => {
    const student = actor('STUDENT'); const coord = actor('TENANT_ADMIN');
    const agent = actor('STAFF', { perms: ['support_agent'] }); const mgr = actor('STAFF', { perms: ['support_manager'] });
    expect([can(student, 'raise'), can(student, 'viewCollege'), can(student, 'readInternal')]).toEqual([true, false, false]);
    expect([can(coord, 'viewCollege'), can(coord, 'readInternal'), can(coord, 'work')]).toEqual([true, false, false]);
    expect([can(agent, 'readInternal'), can(agent, 'work'), can(agent, 'manage')]).toEqual([true, true, false]);
    expect(can(mgr, 'manage')).toBe(true);
  });
});

describe('college isolation', () => {
  const mine = { tenantId: COLLEGE, requesterId: 'u1' };
  const classmate = { tenantId: COLLEGE, requesterId: 'u2' };
  const elsewhere = { tenantId: OTHER, requesterId: 'u9' };

  it('a requester is scoped to their own tickets in their own tenant', () => {
    const s = actor('STUDENT');
    expect(ticketScope(s)).toEqual({ tenantId: COLLEGE, requesterId: 'u1' });
    expect(canViewTicket(s, mine)).toBe(true);
    expect(canViewTicket(s, classmate)).toBe(false);
    expect(canViewTicket(s, elsewhere)).toBe(false);
  });

  it('a requester cannot see a ticket in another tenant even with the same user id', () => {
    expect(canViewTicket(actor('STUDENT'), { tenantId: OTHER, requesterId: 'u1' })).toBe(false);
  });

  it('a coordinator sees their college and nothing else, and cannot write', () => {
    const c = actor('TENANT_ADMIN', { id: 'c1' });
    expect(ticketScope(c)).toEqual({ tenantId: COLLEGE });
    expect(canViewTicket(c, classmate)).toBe(true);
    expect(canViewTicket(c, elsewhere)).toBe(false);
    expect(canWriteOnTicket(c, classmate)).toBe(false);
  });

  it('a college agent is limited to that college', () => {
    const a = actor('STAFF', { perms: ['support_agent'] });
    expect(ticketScope(a)).toEqual({ tenantId: COLLEGE });
    expect(canViewTicket(a, elsewhere)).toBe(false);
    expect(canWriteOnTicket(a, classmate)).toBe(true);
  });

  it('HQ staff see and work every college', () => {
    const a = actor('STAFF', { perms: ['support_agent'], tenantId: HQ });
    expect(ticketScope(a)).toEqual({});
    expect(canViewTicket(a, elsewhere)).toBe(true);
    expect(canWriteOnTicket(a, elsewhere)).toBe(true);
  });

  it('a requester writes only on their own ticket', () => {
    const s = actor('STUDENT');
    expect(canWriteOnTicket(s, mine)).toBe(true);
    expect(canWriteOnTicket(s, classmate)).toBe(false);
  });
});

describe('status transitions', () => {
  const agent = actor('STAFF', { perms: ['support_agent'] });
  const student = actor('STUDENT');
  const coord = actor('TENANT_ADMIN');

  it('staff move tickets along the allowed paths', () => {
    expect(canTransition(agent, 'open', 'in_progress')).toBe(true);
    expect(canTransition(agent, 'in_progress', 'waiting_on_user')).toBe(true);
    expect(canTransition(agent, 'waiting_on_user', 'resolved')).toBe(true);
    expect(canTransition(agent, 'resolved', 'closed')).toBe(true);
    expect(canTransition(agent, 'resolved', 'in_progress')).toBe(true);
  });

  it('closed is final and no-op moves are refused', () => {
    for (const to of TICKET_STATUSES) expect(canTransition(agent, 'closed', to)).toBe(false);
    expect(canTransition(agent, 'open', 'open')).toBe(false);
    expect(canTransition(agent, 'resolved', 'waiting_on_user')).toBe(false);
  });

  it('requesters and coordinators cannot set a status directly', () => {
    for (const from of TICKET_STATUSES) for (const to of TICKET_STATUSES) {
      expect(canTransition(student, from, to)).toBe(false);
      expect(canTransition(coord, from, to)).toBe(false);
    }
  });

  it('a requester reply puts a waiting ticket back in the queue and is refused once resolved', () => {
    expect(statusAfterRequesterReply('waiting_on_user')).toBe('open');
    expect(statusAfterRequesterReply('in_progress')).toBe('in_progress');
    expect(statusAfterRequesterReply('resolved')).toBeNull();
    expect(statusAfterRequesterReply('closed')).toBeNull();
  });
});

describe('reopen policy', () => {
  const now = new Date('2026-10-22T10:00:00Z');
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
  const open = { allowed: true, windowDays: null, maxReopens: null };

  it('only a resolved or closed ticket can be reopened', () => {
    expect(reopenDecision(open, { status: 'open' }, now)).toEqual({ ok: false, reason: 'not_resolved' });
    expect(reopenDecision(open, { status: 'resolved', resolvedAt: daysAgo(400) }, now)).toEqual({ ok: true });
  });

  it('honours the configured switch, window and limit', () => {
    expect(reopenDecision({ ...open, allowed: false }, { status: 'resolved' }, now)).toEqual({ ok: false, reason: 'disabled' });
    expect(reopenDecision({ ...open, windowDays: 7 }, { status: 'resolved', resolvedAt: daysAgo(8) }, now)).toEqual({ ok: false, reason: 'window' });
    expect(reopenDecision({ ...open, windowDays: 7 }, { status: 'closed', closedAt: daysAgo(6) }, now)).toEqual({ ok: true });
    expect(reopenDecision({ ...open, maxReopens: 2 }, { status: 'resolved', reopenCount: 2 }, now)).toEqual({ ok: false, reason: 'limit' });
  });
});

describe('mass assignment', () => {
  it('copies only the allowed fields', () => {
    const body = { subject: 'Hi', description: 'x', tenantId: OTHER, requesterId: 'evil', status: 'closed', priority: 'critical', __proto__: { admin: true } };
    expect(pickAllowed(body, ['subject', 'description', 'module'] as const)).toEqual({ subject: 'Hi', description: 'x' });
  });

  it('ignores bodies that are not plain objects', () => {
    expect(pickAllowed(null, ['a'] as const)).toEqual({});
    expect(pickAllowed(['a'], ['a'] as const)).toEqual({});
    expect(pickAllowed('a', ['a'] as const)).toEqual({});
  });
});

describe('support configuration', () => {
  it('is empty until the organisation sets it: no SLA, no incident rules, no retention', () => {
    const c = mergeSupportConfig(null, null);
    expect(c.slaConfigured).toBe(false);
    expect(Object.values(c.firstResponseMinutes).every(v => v === null)).toBe(true);
    expect(Object.values(c.resolutionMinutes).every(v => v === null)).toBe(true);
    expect(c.incident).toEqual({ minTickets: null, minDistinctUsers: null, windowMinutes: null });
    expect(c.retention).toEqual({ chatDays: null, attachmentDays: null });
    expect(c.reopen).toEqual({ allowed: true, windowDays: null, maxReopens: null });
  });

  it("a tenant's own value wins over the platform default, field by field", () => {
    const base = { firstResponseMinutes: { high: 240, critical: 60 }, reopen: { windowDays: 14 } };
    const own = { firstResponseMinutes: { critical: 30 }, reopen: { allowed: false } };
    const c = mergeSupportConfig(own, base);
    expect(c.firstResponseMinutes).toEqual({ low: null, medium: null, high: 240, critical: 30 });
    expect(c.reopen).toEqual({ allowed: false, windowDays: 14, maxReopens: null });
    expect(c.slaConfigured).toBe(true);
  });
});

// The type is exported for the controllers; keep it referenced so a rename shows up here.
export type _A = SupportActor;
