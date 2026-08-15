import { Request, Response } from 'express';
import RoleSkillBlueprint from '../models/RoleSkillBlueprint';
import AuditLog from '../models/AuditLog';
import {
  getRoleSkillBlueprint, getBlueprintDoc, getBlueprintSummaries,
  validateBlueprint, cleanRequirements, loadSkillsFor,
} from '../services/roleSkillBlueprintService';
import { seedRoleBlueprints } from '../services/roleSkillBlueprintSeedService';
import { listCareerRoles, getCareerRole } from '../services/careerRoleService';
import { getSkillTree } from '../services/careerSkillService';
import { SKILL_IMPORTANCE, SKILL_TARGET_LEVELS, DEFAULT_WEIGHT } from '../models/RoleSkillBlueprint';
import { DEFAULT_DOMAIN } from '../services/careerDomainService';
import { SUGGESTED_TAXONOMY_ADDITIONS } from '../data/roleSkillBlueprints';

/**
 * Admin configuration of what each career role expects.
 *
 * Tenant-scoped throughout: the tenant comes from the authenticated context and is part of
 * every query, so one college cannot read or write another's blueprint even with a guessed
 * role key. Roles are the tenant's own (Module 2); skills are the shared catalogue
 * (Module 3), and REFERENCING a skill here grants nothing over the skill itself — editing
 * that still needs the super-admin rights Module 3 requires.
 *
 * Nothing here touches a student. Saving a blueprint changes what the role expects and
 * nothing about anyone pursuing it.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const whoOf = (req: Request): string => String((req as any).user?.email || '');

async function audit(req: Request, action: 'CREATE' | 'UPDATE' | 'DELETE', roleKey: string, details: string) {
  try {
    await AuditLog.create({
      tenantId: (req as any).user?.tenantId || (req as any).tenantId,
      userId: (req as any).user?.id || (req as any).user?._id,
      action, module: 'SYSTEM',
      targetType: 'RoleSkillBlueprint',
      details,
      metadata: { roleKey },
    });
  } catch (e: any) {
    console.warn('[role-blueprint] audit write failed:', e?.message || e);
  }
}

/**
 * GET /passport/role-blueprints — every role with how much is configured.
 *
 * One query for the roles and one for the blueprints, so the list does not cost a query
 * per row (§41).
 */
export const listBlueprints = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [roles, summaries] = await Promise.all([
      listCareerRoles(tenantId),
      getBlueprintSummaries(tenantId),
    ]);

    res.json({
      roles: roles.map(r => ({
        key: r.key, name: r.name, active: r.active !== false,
        studentSelectable: r.studentSelectable !== false,
        blueprint: summaries[r.key] || { total: 0, active: 0, published: false },
      })),
      suggestedTaxonomyAdditions: SUGGESTED_TAXONOMY_ADDITIONS,
    });
  } catch (e: any) {
    console.error('[role-blueprint] list:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not load blueprints' });
  }
};

/**
 * GET /passport/role-blueprints/:roleKey — one blueprint, its skills joined in, plus the
 * skill tree the picker needs. Sent together so the picker cannot offer something the
 * blueprint would reject.
 */
export const getBlueprint = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const roleKey = String(req.params.roleKey || '').toUpperCase();

    const blueprint = await getRoleSkillBlueprint(tenantId, roleKey);
    if (!blueprint) return res.status(404).json({ message: `Career role ${roleKey} does not exist.` });

    res.json({
      blueprint,
      skillTree: await getSkillTree(DEFAULT_DOMAIN, false),   // active skills only, for adding
      vocabulary: {
        importance: SKILL_IMPORTANCE,
        targetLevels: SKILL_TARGET_LEVELS,
        defaultWeights: DEFAULT_WEIGHT,
        weightRange: { min: 1, max: 10 },
      },
    });
  } catch (e: any) {
    console.error('[role-blueprint] get:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not load the blueprint' });
  }
};

/**
 * PUT /passport/role-blueprints/:roleKey — replace the whole requirement list.
 *
 * Whole-list rather than per-row because that is how the screen works: an admin edits a
 * table and saves once. It also makes removal ordinary — a requirement left out is gone —
 * instead of needing a separate delete endpoint and a way to express it in the UI.
 */
export const saveBlueprint = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const roleKey = String(req.params.roleKey || '').toUpperCase();
    const b = req.body || {};

    // Module 2's service decides whether the role exists and is this tenant's. Repeating
    // that logic here is how the two would eventually disagree.
    const role = await getCareerRole(tenantId, roleKey);
    if (!role) return res.status(404).json({ message: `Career role ${roleKey} does not exist.` });

    const requirements = cleanRequirements(b.requirements);
    const existing = await getBlueprintDoc(tenantId, roleKey);
    const skills = await loadSkillsFor(requirements);

    const check = validateBlueprint({
      domainKey: role.domainKey || DEFAULT_DOMAIN,
      requirements,
      skills,
      // What the blueprint already required, so a skill retired since it was added can be
      // kept — the correction made in Module 3, applied to the same class of problem.
      existingSkillKeys: (existing?.requirements || []).map(r => r.skillKey),
    });
    if (!check.ok) return res.status(400).json({ message: check.message });

    const before = existing?.requirements?.length || 0;

    const doc = await RoleSkillBlueprint.findOneAndUpdate(
      { tenantId, roleKey },
      {
        $set: {
          domainKey: role.domainKey || DEFAULT_DOMAIN,
          requirements,
          ...(b.published !== undefined ? { published: b.published === true } : {}),
          updatedBy: whoOf(req),
        },
        $inc: { version: 1 },
        $setOnInsert: { createdBy: whoOf(req) },
      },
      { new: true, upsert: true },
    );

    const delta = requirements.length - before;
    await audit(req, existing ? 'UPDATE' : 'CREATE', roleKey,
      `${existing ? 'Updated' : 'Created'} the ${role.name} blueprint — ${requirements.length} skill(s)` +
      (delta ? ` (${delta > 0 ? '+' : ''}${delta})` : ''));

    res.json({ blueprint: await getRoleSkillBlueprint(tenantId, roleKey), version: doc.version });
  } catch (e: any) {
    if (e?.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(e.errors || {}).map((x: any) => x.message)[0] || 'Invalid blueprint' });
    }
    console.error('[role-blueprint] save:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not save the blueprint' });
  }
};

/** POST /passport/role-blueprints/:roleKey/publish — { published } */
export const setPublished = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const roleKey = String(req.params.roleKey || '').toUpperCase();
    const published = req.body?.published === true;

    const role = await getCareerRole(tenantId, roleKey);
    if (!role) return res.status(404).json({ message: `Career role ${roleKey} does not exist.` });

    const doc = await RoleSkillBlueprint.findOneAndUpdate(
      { tenantId, roleKey },
      { $set: { published, updatedBy: whoOf(req) } },
      { new: true },
    );
    if (!doc) return res.status(404).json({ message: 'No blueprint to publish yet.' });

    await audit(req, 'UPDATE', roleKey, `${role.name} blueprint ${published ? 'published' : 'returned to draft'}`);
    res.json({ blueprint: await getRoleSkillBlueprint(tenantId, roleKey) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not change the blueprint status' });
  }
};

/** POST /passport/role-blueprints/seed — install defaults for roles with none. */
export const seedBlueprints = async (req: Request, res: Response) => {
  try {
    const report = await seedRoleBlueprints(tenantOf(req), {
      dryRun: req.body?.dryRun === true,
      updatedBy: whoOf(req),
    });
    res.json({ ...report, dryRun: req.body?.dryRun === true });
  } catch (e: any) {
    console.error('[role-blueprint] seed:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not install the default blueprints' });
  }
};
