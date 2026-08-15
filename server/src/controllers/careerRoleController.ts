import { Request, Response } from 'express';
import CareerRole from '../models/CareerRole';
import AuditLog from '../models/AuditLog';
import {
  listCareerRoles, getCareerRole, countMembersWithRole, isValidRoleKey, suggestRoleKey,
} from '../services/careerRoleService';
import { CAREER_DOMAINS, DEFAULT_DOMAIN, isKnownActiveDomain } from '../services/careerDomainService';

/**
 * Admin CRUD for CareerPilot career roles.
 *
 * Configuration only. Creating, editing or retiring a role changes what future students
 * are OFFERED and nothing about any student who already exists — no roadmap regenerates,
 * no pathway moves, no assessment resets. That is the whole point of the module, and the
 * reason none of these handlers touch a member document.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const whoOf = (req: Request): string => String((req as any).user?.email || '');

/**
 * Best-effort audit. AuditLog's `module` enum has no CareerPilot value, and widening a
 * shared enum for one screen is a larger change than this warrants — 'SYSTEM' with a
 * CareerRole targetType records the fact without touching a model other features rely on.
 *
 * Never allowed to fail a configuration change: a lost audit line is worse than an admin
 * who cannot rename a role, but only slightly.
 */
async function audit(req: Request, action: 'CREATE' | 'UPDATE' | 'DELETE', role: any, details: string) {
  try {
    await AuditLog.create({
      tenantId: (req as any).user?.tenantId || (req as any).tenantId,
      userId: (req as any).user?.id || (req as any).user?._id,
      action, module: 'SYSTEM',
      targetType: 'CareerRole',
      targetId: role?._id,
      details,
      metadata: { key: role?.key, domainKey: role?.domainKey },
    });
  } catch (e: any) {
    console.warn('[career-roles] audit write failed:', e?.message || e);
  }
}

/**
 * Read a domain key from an admin request.
 *
 * Three cases, deliberately distinct:
 *   absent  — no opinion, caller applies its own default. The admin UI serves one domain
 *             and does not send the field, so this is the ordinary path.
 *   known   — accepted as given.
 *   unknown — REFUSED. Running it through normalizeDomain would file the role under
 *             Software Engineering while the admin believes they created it somewhere
 *             else, and nothing would ever report the discrepancy.
 */
function readDomainKey(raw: any): { value?: string; error?: string } {
  if (raw === undefined || raw === null || String(raw).trim() === '') return {};
  const want = String(raw).trim().toUpperCase();
  if (!isKnownActiveDomain(want)) {
    const live = CAREER_DOMAINS.filter(d => d.active).map(d => d.key).join(', ');
    return { error: `"${want}" is not an available career domain. Currently available: ${live}.` };
  }
  return { value: want };
}

const publicShape = (r: any, memberCount?: number) => ({
  id: String(r._id),
  key: r.key,
  domainKey: r.domainKey,
  name: r.name,
  shortName: r.shortName || '',
  description: r.description || '',
  studentDescription: r.studentDescription || '',
  iconKey: r.iconKey || '',
  aliases: r.aliases || [],
  displayOrder: r.displayOrder ?? 100,
  active: r.active !== false,
  studentSelectable: r.studentSelectable !== false,
  systemRole: !!r.systemRole,
  updatedBy: r.updatedBy || '',
  updatedAt: r.updatedAt,
  ...(memberCount === undefined ? {} : { memberCount }),
});

/** GET /passport/career-roles — every role, seeded on first open. */
export const listRoles = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const roles = await listCareerRoles(tenantId, req.query.domain as string | undefined);

    res.json({
      domains: CAREER_DOMAINS.filter(d => d.active).map(d => ({ key: d.key, label: d.label })),
      roles: roles.map(r => publicShape(r)),
      counts: {
        total: roles.length,
        active: roles.filter(r => r.active).length,
        selectable: roles.filter(r => r.active && r.studentSelectable).length,
      },
    });
  } catch (e: any) {
    console.error('[career-roles] list:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not load career roles' });
  }
};

/**
 * GET /passport/career-roles/:key/usage — how many members hold it.
 *
 * Its own endpoint rather than a column on the list, so the count is paid for only when
 * an admin is about to hide or delete something and actually needs to know.
 */
export const roleUsage = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const key = String(req.params.key || '').toUpperCase();
    const role = await getCareerRole(tenantId, key);
    if (!role) return res.status(404).json({ message: 'No such career role' });

    res.json({ key, memberCount: await countMembersWithRole(tenantId, key) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not count members' });
  }
};

/** POST /passport/career-roles */
export const createRole = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const b = req.body || {};

    const name = String(b.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Give the role a name.' });

    // The key is suggested from the name when absent, but an admin who typed one keeps it:
    // they may be matching a key that already means something elsewhere.
    const key = String(b.key || suggestRoleKey(name)).trim().toUpperCase();
    if (!isValidRoleKey(key)) {
      return res.status(400).json({
        message: `"${key}" is not a valid key. Use uppercase words joined by underscores, e.g. PLATFORM_ENGINEER.`,
      });
    }

    const domain = readDomainKey(b.domainKey);
    if (domain.error) return res.status(400).json({ message: domain.error });
    const domainKey = domain.value || DEFAULT_DOMAIN;

    const clash = await CareerRole.findOne({ tenantId, key }).select('name').lean() as any;
    if (clash) {
      return res.status(409).json({ message: `The key ${key} is already used by "${clash.name}".` });
    }

    const role = await CareerRole.create({
      tenantId, key, domainKey, name,
      shortName: String(b.shortName || '').trim(),
      description: String(b.description || '').trim(),
      studentDescription: String(b.studentDescription || '').trim(),
      iconKey: String(b.iconKey || '').trim(),
      aliases: Array.isArray(b.aliases) ? b.aliases.map((a: any) => String(a).trim()).filter(Boolean).slice(0, 12) : [],
      displayOrder: Number.isFinite(Number(b.displayOrder)) ? Number(b.displayOrder) : 100,
      active: b.active !== false,
      studentSelectable: b.studentSelectable !== false,
      systemRole: false,                       // only the seed creates system roles
      createdBy: whoOf(req), updatedBy: whoOf(req),
    });

    await audit(req, 'CREATE', role, `Created career role "${name}" (${key})`);
    res.status(201).json({ role: publicShape(role) });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'That role key already exists.' });
    if (e?.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(e.errors || {}).map((x: any) => x.message)[0] || 'Invalid role' });
    }
    console.error('[career-roles] create:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not create the role' });
  }
};

/**
 * PUT /passport/career-roles/:id
 *
 * The key is NOT editable. Student records reference it, and this model cannot see them —
 * changing it here would orphan every member holding the old value with no error anywhere.
 * Rename the display name instead; that is what students read.
 */
export const updateRole = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const b = req.body || {};
    const role: any = await CareerRole.findOne({ _id: req.params.id, tenantId });
    if (!role) return res.status(404).json({ message: 'No such career role' });

    if (b.key !== undefined && String(b.key).trim().toUpperCase() !== role.key) {
      return res.status(400).json({
        message: 'A role key cannot be changed — student records already reference it. Edit the name instead.',
      });
    }

    // Both domain checks run before anything is mutated, so a rejected edit cannot leave
    // the role half-changed with a new name and its old domain.
    const domain = readDomainKey(b.domainKey);
    if (domain.error) return res.status(400).json({ message: domain.error });

    // The domain is fixed at creation, like the key. It is part of what the role IS: which
    // students are offered it, and — from Module 3 — which skills will hang off it. Moving
    // a role between domains would silently re-scope every one of those relationships for
    // the members already holding it. Re-sending the same domain stays a no-op, so a client
    // that echoes the whole object back is not punished for it.
    if (domain.value && domain.value !== role.domainKey) {
      return res.status(400).json({
        message: "A career role's domain cannot be changed after creation. Create a new role instead.",
      });
    }

    const before = { active: role.active, studentSelectable: role.studentSelectable };

    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (!name) return res.status(400).json({ message: 'A role needs a name.' });
      role.name = name;
    }
    if (b.shortName !== undefined) role.shortName = String(b.shortName).trim();
    if (b.description !== undefined) role.description = String(b.description).trim();
    if (b.studentDescription !== undefined) role.studentDescription = String(b.studentDescription).trim();
    if (b.iconKey !== undefined) role.iconKey = String(b.iconKey).trim();
    if (b.aliases !== undefined) {
      role.aliases = Array.isArray(b.aliases) ? b.aliases.map((a: any) => String(a).trim()).filter(Boolean).slice(0, 12) : [];
    }
    if (b.displayOrder !== undefined && Number.isFinite(Number(b.displayOrder))) role.displayOrder = Number(b.displayOrder);
    // No domain assignment here: the only value that reaches this point is the one the
    // role already has, so writing it would be a no-op that reads like a mutation.
    if (b.active !== undefined) role.active = b.active === true;
    if (b.studentSelectable !== undefined) role.studentSelectable = b.studentSelectable === true;

    role.updatedBy = whoOf(req);
    await role.save();

    // Visibility changes are recorded distinctly from a rename: "who withdrew this role
    // and when" is the question someone actually asks months later.
    const changes: string[] = [];
    if (before.active !== role.active) changes.push(role.active ? 'activated' : 'deactivated');
    if (before.studentSelectable !== role.studentSelectable) {
      changes.push(role.studentSelectable ? 'opened to students' : 'hidden from students');
    }
    await audit(req, 'UPDATE', role,
      changes.length ? `Career role "${role.name}" ${changes.join(' and ')}` : `Updated career role "${role.name}"`);

    res.json({ role: publicShape(role) });
  } catch (e: any) {
    if (e?.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(e.errors || {}).map((x: any) => x.message)[0] || 'Invalid role' });
    }
    console.error('[career-roles] update:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not save the role' });
  }
};

/**
 * DELETE /passport/career-roles/:id
 *
 * Refused for a seeded role, and refused for any role a member holds — deleting it would
 * leave those members pointing at a key nothing can resolve. Deactivation is the intended
 * action, and the error says so rather than leaving an admin to guess.
 */
export const deleteRole = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const role: any = await CareerRole.findOne({ _id: req.params.id, tenantId });
    if (!role) return res.status(404).json({ message: 'No such career role' });

    if (role.systemRole) {
      return res.status(400).json({
        message: `"${role.name}" is a built-in role and cannot be deleted. Hide it from students instead.`,
      });
    }

    const memberCount = await countMembersWithRole(tenantId, role.key);
    if (memberCount > 0) {
      return res.status(409).json({
        message: `${memberCount} member${memberCount === 1 ? '' : 's'} chose "${role.name}". Hide it from students instead of deleting it — their profiles would break.`,
        memberCount,
      });
    }

    await CareerRole.deleteOne({ _id: role._id, tenantId });
    await audit(req, 'DELETE', role, `Deleted unused career role "${role.name}" (${role.key})`);
    res.json({ success: true });
  } catch (e: any) {
    console.error('[career-roles] delete:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not delete the role' });
  }
};
