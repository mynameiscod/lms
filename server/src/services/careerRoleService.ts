import CareerRole, { ICareerRole, SYSTEM_CAREER_ROLES, CAREER_ROLE_KEY_PATTERN } from '../models/CareerRole';
import User from '../models/User';
import { DEFAULT_DOMAIN, ROLE_NOT_SURE, normalizeDomain, domainOf } from './careerDomainService';

/**
 * Career role configuration — what a student may aim at, and who decides.
 *
 * Roles used to be a constant in careerDomainService, so adding one meant a deploy. They
 * are configuration now, but the SHAPE of the answer is unchanged: callers still get a
 * list of `{ key, label, blurb }`, so Module 1's API contract and its frontend keep
 * working untouched.
 *
 * Two rules run through everything here:
 *
 *   WHAT A STUDENT MAY PICK is a live question — active, selectable, right domain.
 *   WHAT A STUDENT ALREADY PICKED is history and is never re-litigated. Hiding a role
 *   must not retroactively invalidate the 1,200 people who chose it, so the read path
 *   resolves any stored key and only the write path filters.
 *
 * No AI. This is a lookup over admin-authored configuration.
 */

export interface StudentFacingRole {
  key: string;
  label: string;
  blurb: string;
  iconKey?: string;
}

/** The onboarding option meaning "no decision yet". Never a database record — see the model. */
export const NOT_SURE_OPTION: StudentFacingRole = {
  key: ROLE_NOT_SURE,
  label: "I'm not sure yet",
  blurb: "That's okay — CareerPilot can help you find a direction as you go.",
  iconKey: 'bi-compass',
};

/**
 * Seed a tenant's roles on first use, the same lazy pattern as ensureContent.
 *
 * Never destructive and never scheduled: it only inserts keys that are absent, so an
 * admin's renamed "Backend Software Engineer" survives every subsequent call, and a role
 * they deliberately deactivated is not quietly switched back on. Running it twice changes
 * nothing, which is what makes it safe to call from a read path.
 */
export async function ensureCareerRoles(tenantId: string): Promise<void> {
  const existing = await CareerRole.find({ tenantId }).select('key').lean();
  const have = new Set(existing.map((r: any) => r.key));
  const missing = SYSTEM_CAREER_ROLES.filter(r => !have.has(r.key));
  if (!missing.length) return;

  await CareerRole.insertMany(
    missing.map(r => ({
      ...r,
      tenantId,
      domainKey: DEFAULT_DOMAIN,
      active: true,
      studentSelectable: true,
      systemRole: true,
    })),
    // A concurrent first request can race this; a duplicate key means the other request
    // won and there is nothing to repair.
    { ordered: false },
  ).catch((e: any) => {
    if (e?.code !== 11000 && !/E11000/.test(String(e?.message))) throw e;
  });
}

/** Every role for admin. Seeds first, so a tenant's first visit is never an empty page. */
export async function listCareerRoles(tenantId: string, domainKey?: string): Promise<ICareerRole[]> {
  await ensureCareerRoles(tenantId);
  const q: any = { tenantId };
  if (domainKey) q.domainKey = normalizeDomain(domainKey);
  return CareerRole.find(q).sort({ displayOrder: 1, name: 1 }).lean() as any;
}

/** One role by its stable key, whatever its visibility. */
export async function getCareerRole(tenantId: string, key: string): Promise<ICareerRole | null> {
  const k = String(key || '').trim().toUpperCase();
  if (!k) return null;
  return CareerRole.findOne({ tenantId, key: k }).lean() as any;
}

/**
 * What a student may choose right now, in display order, with "not sure" first.
 *
 * "Not sure" leads deliberately: for a first-year it is often the honest answer, and a
 * list that buries it implies choosing wrongly is better than admitting uncertainty.
 *
 * It is also the floor. If an admin deactivates everything, this still returns one option,
 * so onboarding degrades to "I haven't decided" rather than becoming impossible to finish.
 */
export async function getSelectableCareerRoles(
  tenantId: string,
  domainKey?: string | null,
): Promise<StudentFacingRole[]> {
  await ensureCareerRoles(tenantId);
  const roles = await CareerRole.find({
    tenantId,
    domainKey: normalizeDomain(domainKey),
    active: true,
    studentSelectable: true,
  }).sort({ displayOrder: 1, name: 1 }).lean() as any[];

  return [
    NOT_SURE_OPTION,
    ...roles.map(r => ({
      key: r.key,
      label: r.name,
      blurb: r.studentDescription || r.description || '',
      iconKey: r.iconKey || undefined,
    })),
  ];
}

/**
 * Resolve a role for DISPLAY, including one no longer offered.
 *
 * This is what keeps a hidden role from erasing somebody's stated ambition. A student who
 * chose QA_SDET before it was withdrawn still sees "QA / SDET Engineer" on their profile;
 * showing them a blank, or silently rewriting them to "not sure", would be the system
 * changing their answer on their behalf.
 */
export async function resolveCareerRoleLabel(tenantId: string, key: string): Promise<StudentFacingRole | null> {
  const k = String(key || '').trim().toUpperCase();
  if (!k) return null;
  if (k === ROLE_NOT_SURE) return NOT_SURE_OPTION;

  const r = await getCareerRole(tenantId, k);
  if (!r) {
    // A key with no record — an old seed, or a role hard-deleted while unreferenced.
    // Shown as itself rather than dropped, because the student did choose something.
    return { key: k, label: k.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()), blurb: '' };
  }
  return { key: r.key, label: r.name, blurb: r.studentDescription || r.description || '', iconKey: r.iconKey || undefined };
}

export interface RoleValidation { ok: boolean; message?: string }

/**
 * May this student SELECT this role now? The write-path gate.
 *
 * Deliberately stricter than the read path: everything here is about a new decision, and
 * a role that is retired or belongs to another domain is not a decision we should record.
 */
export async function validateCareerRole(
  tenantId: string,
  domainKey: string,
  key: string,
): Promise<RoleValidation> {
  const k = String(key || '').trim().toUpperCase();
  if (!k) return { ok: false, message: 'Choose a career direction.' };
  if (k === ROLE_NOT_SURE) return { ok: true };            // always permitted — see §41

  const role = await getCareerRole(tenantId, k);
  if (!role) return { ok: false, message: 'That career role does not exist.' };
  if (!role.active) return { ok: false, message: `${role.name} is no longer available.` };
  if (!role.studentSelectable) return { ok: false, message: `${role.name} is not currently open for selection.` };
  if (role.domainKey !== normalizeDomain(domainKey)) {
    return { ok: false, message: `${role.name} does not belong to ${domainOf(domainKey).label}.` };
  }
  return { ok: true };
}

/**
 * How many members hold this role.
 *
 * Counted on demand — when an admin is about to hide or delete a role — rather than on
 * every list render. Two indexed counts on one screen a week is nothing; the same counts
 * on every page load of a growing member table is a cost with no reader.
 */
export async function countMembersWithRole(tenantId: string, key: string): Promise<number> {
  const k = String(key || '').trim().toUpperCase();
  if (!k) return 0;
  return User.countDocuments({
    tenantId,
    $or: [{ 'passport.primaryRole': k }, { 'passport.secondaryRole': k }],
  });
}

export const isValidRoleKey = (key: string): boolean => CAREER_ROLE_KEY_PATTERN.test(String(key || '').trim().toUpperCase());

/** "Platform Engineer" → "PLATFORM_ENGINEER". Suggested to the admin, never forced. */
export function suggestRoleKey(name: string): string {
  return String(name || '')
    .trim().toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}
