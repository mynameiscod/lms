import mongoose from 'mongoose';
import CollegeMembership from '../models/CollegeMembership';
import SupportAuditLog from '../models/SupportAuditLog';
import SupportConfiguration from '../models/SupportConfiguration';
import { permissionsOf } from '../middleware/roleGuard';
import { logger } from '../utils/logger';
import { SupportActor, SupportActorKind, ReopenPolicy } from '../data/supportPolicy';

/** Permissions a custom role can be given (Roles & Permissions → Help & Support). */
export const SUPPORT_PERMISSIONS = { agent: 'support_agent', manager: 'support_manager' } as const;

/** College roles that see their own college's tickets. */
const COORDINATOR_COLLEGE_ROLES = ['COLLEGE_ADMIN', 'PLACEMENT_OFFICER'];
/** College roles that are faculty: requesters who are shown faculty articles. */
const FACULTY_COLLEGE_ROLES = ['DEPT_HEAD', 'CRT_TRAINER'];

/**
 * The tenant whose agents and managers answer every college: CodeBegun's own. Unset means no
 * one has cross-tenant reach, and every agent works only inside their own institute — the safe
 * default, because the reach this grants is exactly what tenant isolation exists to prevent.
 */
export const supportHqTenantId = (): string => String(process.env.SUPPORT_HQ_TENANT_ID || '').trim();

export interface ActorInput {
  user: { id: string; role: string; tenantId: string; customRoleId?: string | null };
  permissions: string[];
  collegeRole?: string | null;
  hqTenantId: string;
}

/** The decision itself, separated from the lookups so it can be tested on its own. */
export function decideSupportActor({ user, permissions, collegeRole, hqTenantId }: ActorInput): SupportActor {
  let kind: SupportActorKind = 'requester';
  if (user.role === 'SUPER_ADMIN') kind = 'super_admin';
  else if (permissions.includes(SUPPORT_PERMISSIONS.manager)) kind = 'manager';
  else if (permissions.includes(SUPPORT_PERMISSIONS.agent)) kind = 'agent';
  else if (user.role === 'TENANT_ADMIN' || (collegeRole && COORDINATOR_COLLEGE_ROLES.includes(collegeRole))) kind = 'coordinator';

  const staff = kind === 'agent' || kind === 'manager' || kind === 'super_admin';
  return {
    userId: String(user.id),
    tenantId: String(user.tenantId),
    role: user.role,
    kind,
    faculty: kind === 'requester' && (user.role === 'INSTRUCTOR' || (!!collegeRole && FACULTY_COLLEGE_ROLES.includes(collegeRole))),
    allTenants: staff && !!hqTenantId && String(user.tenantId) === hqTenantId,
  };
}

/** Builds the actor from the login and the database. Nothing comes from the request body. */
export async function resolveSupportActor(user: ActorInput['user']): Promise<SupportActor> {
  const [permissions, membership] = await Promise.all([
    permissionsOf(user),
    mongoose.isValidObjectId(user.id) && mongoose.isValidObjectId(user.tenantId)
      ? CollegeMembership.findOne({ userId: user.id, tenantId: user.tenantId, isActive: true }).select('collegeRole').lean()
      : null,
  ]);
  return decideSupportActor({ user, permissions, collegeRole: (membership as any)?.collegeRole || null, hqTenantId: supportHqTenantId() });
}

/**
 * Who may open the technical error screens. Errors are platform-wide engineering data, so a
 * college's own staff never see them: only a super admin, or the support HQ's managers and
 * people given "View API Logs & Student Activity" in the HQ tenant.
 */
export function canMonitor(actor: SupportActor, permissions: string[]): boolean {
  if (actor.role === 'SUPER_ADMIN') return true;
  return actor.allTenants && (actor.kind === 'manager' || permissions.includes('view_activity_logs'));
}

export interface AuditEntry {
  actor: SupportActor;
  entity: 'ticket' | 'message' | 'faq' | 'config' | 'chat';
  entityId?: unknown;
  /** The tenant the record belongs to; null for platform-wide records. */
  tenantId?: unknown;
  action: string;
  changes?: Record<string, { from?: unknown; to?: unknown }>;
  requestId?: string;
}

/**
 * Appends to the support trail. An audit failure is logged and swallowed: it must never undo the
 * change it describes, and the member must never see it.
 */
export async function audit(e: AuditEntry): Promise<void> {
  try {
    const tenant = e.tenantId == null ? null : String(e.tenantId);
    await SupportAuditLog.create({
      tenantId: tenant,
      entity: e.entity,
      entityId: e.entityId ?? null,
      action: e.action,
      actorId: e.actor.userId,
      actorKind: e.actor.kind,
      changes: e.changes,
      requestId: e.requestId,
      crossTenant: tenant != null && tenant !== e.actor.tenantId,
    });
  } catch (err: any) {
    logger.warn('[support] audit write failed', { action: e.action, entity: e.entity, error: err?.message });
  }
}

export interface EffectiveSupportConfig {
  firstResponseMinutes: Record<'low' | 'medium' | 'high' | 'critical', number | null>;
  resolutionMinutes: Record<'low' | 'medium' | 'high' | 'critical', number | null>;
  reopen: ReopenPolicy;
  incident: { minTickets: number | null; minDistinctUsers: number | null; windowMinutes: number | null };
  retention: { chatDays: number | null; attachmentDays: number | null };
  /** True when any response or resolution target has been set. Drives every SLA display. */
  slaConfigured: boolean;
}

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const pick = (own: any, base: any): number | null => (own ?? base ?? null);

/**
 * The tenant's settings laid over the platform default, field by field. Anything neither has set
 * stays null, so no target is ever shown that the organisation did not write down. Reopening is
 * the one behaviour with a working default (allowed, no window, no limit), because refusing it
 * would strand a member whose problem came back.
 */
export function mergeSupportConfig(own: any, base: any): EffectiveSupportConfig {
  const o = own || {}; const b = base || {};
  const byP = (field: string) => Object.fromEntries(PRIORITIES.map(p => [p, pick(o[field]?.[p], b[field]?.[p])])) as EffectiveSupportConfig['firstResponseMinutes'];
  const firstResponseMinutes = byP('firstResponseMinutes');
  const resolutionMinutes = byP('resolutionMinutes');
  return {
    firstResponseMinutes,
    resolutionMinutes,
    reopen: {
      allowed: (o.reopen?.allowed ?? b.reopen?.allowed ?? true) as boolean,
      windowDays: pick(o.reopen?.windowDays, b.reopen?.windowDays),
      maxReopens: pick(o.reopen?.maxReopens, b.reopen?.maxReopens),
    },
    incident: {
      minTickets: pick(o.incident?.minTickets, b.incident?.minTickets),
      minDistinctUsers: pick(o.incident?.minDistinctUsers, b.incident?.minDistinctUsers),
      windowMinutes: pick(o.incident?.windowMinutes, b.incident?.windowMinutes),
    },
    retention: {
      chatDays: pick(o.retention?.chatDays, b.retention?.chatDays),
      attachmentDays: pick(o.retention?.attachmentDays, b.retention?.attachmentDays),
    },
    slaConfigured: [...Object.values(firstResponseMinutes), ...Object.values(resolutionMinutes)].some(v => v != null),
  };
}

export async function effectiveSupportConfig(tenantId: string): Promise<EffectiveSupportConfig> {
  const [own, base] = await Promise.all([
    SupportConfiguration.findOne({ tenantId }).lean(),
    SupportConfiguration.findOne({ tenantId: null }).lean(),
  ]);
  return mergeSupportConfig(own, base);
}
