import { Request, Response } from 'express';
import CareerSkillResource, { RESOURCE_WORK_TYPES, SKILL_RESOURCE_TYPES } from '../models/CareerSkillResource';
import CareerSkill from '../models/CareerSkill';
import { findProblem, listProblems } from '../services/passportPracticeService';

/**
 * Configuring which activity teaches which canonical skill.
 *
 * DELIBERATELY SMALL. This is the minimum an admin needs to make a roadmap executable — a
 * list, a create and a delete — and not a content management system. The resources
 * themselves are authored where they always were; this only records what they are for.
 *
 * BOTH ENDS ARE VALIDATED. A mapping may only name a canonical skill that exists and a
 * resource that exists, because a dangling mapping does not fail loudly: it produces a
 * roadmap whose Start button leads nowhere, discovered by a student rather than by us.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');

/** GET /passport/skill-resources — what is mapped, with the resource titles resolved. */
export const listSkillResources = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const skillKey = req.query.skillKey ? String(req.query.skillKey).toUpperCase() : undefined;

    const rows = await CareerSkillResource
      .find({ tenantId, ...(skillKey ? { skillKey } : {}) })
      .sort({ skillKey: 1, priority: 1 }).lean() as any[];

    const skills = await CareerSkill
      .find({ key: { $in: [...new Set(rows.map(r => r.skillKey))] } })
      .select('key name').lean() as any[];
    const nameOf = new Map(skills.map(s => [s.key, s.name]));

    res.json({
      resources: rows.map(r => {
        const problem = r.resourceType === 'practice' ? findProblem(String(r.resourceId)) : null;
        return {
          id: String(r._id),
          skillKey: r.skillKey,
          skillName: nameOf.get(r.skillKey) || r.skillKey,
          resourceType: r.resourceType,
          resourceId: r.resourceId,
          // Null when the target has since been removed — surfaced so an admin can see the
          // broken row rather than wondering why a mission never appears.
          resourceTitle: problem?.title || null,
          resourceMissing: !problem,
          workTypes: r.workTypes,
          priority: r.priority,
          active: r.active,
        };
      }),
      workTypes: RESOURCE_WORK_TYPES,
      resourceTypes: SKILL_RESOURCE_TYPES,
    });
  } catch (e: any) {
    console.error('[skill-resource] list:', e?.message || e);
    res.status(500).json({ message: 'Could not load skill resources.' });
  }
};

/** GET /passport/skill-resources/catalogue — the practice items available to map. */
export const listMappableResources = async (_req: Request, res: Response) => {
  res.json({
    resources: listProblems().map((p: any) => ({
      resourceType: 'practice', resourceId: p.id, title: p.title, kind: p.kind,
    })),
  });
};

/** POST /passport/skill-resources */
export const createSkillResource = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const skillKey = String(req.body?.skillKey || '').trim().toUpperCase();
    const resourceType = String(req.body?.resourceType || 'practice');
    const resourceId = String(req.body?.resourceId || '').trim();
    const workTypes = Array.isArray(req.body?.workTypes) ? req.body.workTypes.map(String) : ['PRACTICE'];

    if (!skillKey || !resourceId) {
      return res.status(400).json({ message: 'Choose a skill and a resource.' });
    }
    if (!SKILL_RESOURCE_TYPES.includes(resourceType as any)) {
      return res.status(400).json({ message: `Unsupported resource type: ${resourceType}` });
    }

    const bad = workTypes.filter((w: string) => !RESOURCE_WORK_TYPES.includes(w as any));
    if (bad.length) return res.status(400).json({ message: `Unknown work type: ${bad.join(', ')}` });
    if (!workTypes.length) return res.status(400).json({ message: 'Choose at least one work type.' });

    // The skill must be one the graph actually knows. A typo would otherwise create a
    // mapping that silently never matches anything.
    const skill = await CareerSkill.findOne({ key: skillKey }).select('key active').lean() as any;
    if (!skill) return res.status(400).json({ message: `No canonical skill with the key ${skillKey}.` });
    if (skill.active === false) {
      return res.status(400).json({ message: 'That skill has been retired, so new work should not be mapped to it.' });
    }

    if (!findProblem(resourceId)) {
      return res.status(400).json({ message: 'That practice item does not exist.' });
    }

    try {
      const created = await CareerSkillResource.create({
        tenantId, skillKey, resourceType, resourceId, workTypes,
        priority: Number(req.body?.priority) || 100,
        active: req.body?.active !== false,
        createdBy: String((req as any).user?.id || ''),
      });
      res.status(201).json({ resource: created });
    } catch (e: any) {
      // The unique index refused a duplicate. Mapping the same problem to the same skill
      // twice is not a stronger signal, it just makes it twice as likely to be drawn.
      if (e?.code === 11000) {
        return res.status(409).json({ message: 'That resource is already mapped to this skill.' });
      }
      throw e;
    }
  } catch (e: any) {
    console.error('[skill-resource] create:', e?.message || e);
    res.status(500).json({ message: 'Could not save that mapping.' });
  }
};

/** PUT /passport/skill-resources/:id — activate, deactivate or reprioritise. */
export const updateSkillResource = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const row = await CareerSkillResource.findOne({ _id: req.params.id, tenantId });
    if (!row) return res.status(404).json({ message: 'Mapping not found.' });

    if (req.body?.active !== undefined) row.active = !!req.body.active;
    if (req.body?.priority !== undefined) row.priority = Number(req.body.priority) || 100;
    if (Array.isArray(req.body?.workTypes)) {
      const workTypes = req.body.workTypes.map(String);
      const bad = workTypes.filter((w: string) => !RESOURCE_WORK_TYPES.includes(w as any));
      if (bad.length) return res.status(400).json({ message: `Unknown work type: ${bad.join(', ')}` });
      if (workTypes.length) row.workTypes = workTypes;
    }

    await row.save();
    res.json({ resource: row });
  } catch (e: any) {
    console.error('[skill-resource] update:', e?.message || e);
    res.status(500).json({ message: 'Could not update that mapping.' });
  }
};

/** DELETE /passport/skill-resources/:id */
export const deleteSkillResource = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const gone = await CareerSkillResource.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!gone) return res.status(404).json({ message: 'Mapping not found.' });
    res.json({ deleted: true });
  } catch (e: any) {
    console.error('[skill-resource] delete:', e?.message || e);
    res.status(500).json({ message: 'Could not delete that mapping.' });
  }
};
