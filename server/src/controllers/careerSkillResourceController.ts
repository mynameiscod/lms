import { Request, Response } from 'express';
import CareerSkillResource, {
  RESOURCE_WORK_TYPES, SKILL_RESOURCE_TYPES, MATERIAL_TYPES,
  EMPTY_AUDIENCE, EMPTY_BODY, bodyIsEmpty, IResourceBody,
} from '../models/CareerSkillResource';
import CareerSkill from '../models/CareerSkill';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import { findProblem, listProblems, findCareerPilotProblem } from '../services/passportPracticeService';

const str = (v: any): string => String(v ?? '').trim();
/** Tag lists arrive from checkbox groups; drop blanks so an empty row is not a constraint. */
const strList = (v: any): string[] =>
  (Array.isArray(v) ? v : []).map(x => str(x)).filter(Boolean);

const numOrNull = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Read the audience block, defaulting every axis to "no constraint".
 *
 * A missing axis and an empty axis mean the same thing on purpose — a client that has not
 * been updated, and an admin who ticked nothing, both mean "everyone".
 */
const readAudience = (v: any) => ({
  ...EMPTY_AUDIENCE(),
  years:     strList(v?.years),
  courses:   strList(v?.courses),
  branches:  strList(v?.branches),
  roles:     strList(v?.roles).map(r => r.toUpperCase()),
  languages: strList(v?.languages).map(l => l.toLowerCase()),
  stages:    strList(v?.stages),
});

/** Rows arrive from repeatable editors, so drop any the admin left entirely blank. */
const readBody = (v: any): IResourceBody => ({
  ...EMPTY_BODY(),
  overview: str(v?.overview),
  notes:    str(v?.notes),
  videoUrl: str(v?.videoUrl),
  videoKey: str(v?.videoKey),
  steps: (Array.isArray(v?.steps) ? v.steps : [])
    .map((x: any) => ({
      title: str(x?.title), detail: str(x?.detail),
      command: str(x?.command), expectedOutput: str(x?.expectedOutput),
    }))
    .filter((x: any) => x.title || x.detail || x.command),
  breakdown: (Array.isArray(v?.breakdown) ? v.breakdown : [])
    .map((x: any) => ({ term: str(x?.term), explanation: str(x?.explanation), example: str(x?.example) }))
    .filter((x: any) => x.term || x.explanation),
  checks: (Array.isArray(v?.checks) ? v.checks : [])
    .map((x: any) => ({ question: str(x?.question), answer: str(x?.answer) }))
    .filter((x: any) => x.question),
  references: (Array.isArray(v?.references) ? v.references : [])
    .map((x: any) => ({ label: str(x?.label), url: str(x?.url) }))
    .filter((x: any) => x.url),
});

/**
 * Every type must resolve to something a member can open. This is the write-time half of
 * that promise — the model's type list is the other half.
 *
 * Returns an error message, or null when the payload is serviceable.
 */
async function validateTarget(
  tenantId: string,
  resourceType: string,
  resourceId: string,
  title: string,
  url: string,
  body: IResourceBody,
): Promise<string | null> {
  if (resourceType === 'practice') {
    if (!resourceId) return 'Choose a practice item.';
    return findProblem(resourceId) ? null : 'That practice item does not exist.';
  }

  if (resourceType === 'problem') {
    if (!resourceId) return 'Choose a problem from the bank.';
    const hit = await findCareerPilotProblem(tenantId, resourceId);
    return hit ? null : 'That problem does not exist, or is not shared with CareerPilot.';
  }

  // The interview round is a built-in destination, so there is nothing to look up.
  if (resourceType === 'mock_interview') {
    return title ? null : 'Give this interview round a title.';
  }

  if (MATERIAL_TYPES.includes(resourceType as any)) {
    if (!title) return 'Give this material a title.';
    // A material with neither a destination nor any content is a Start button that opens
    // an empty page — the dead end this whole model exists to prevent.
    if (!url && bodyIsEmpty(body)) {
      return 'Add a link, a video, notes, or at least one step — otherwise there is nothing for the student to open.';
    }
    return null;
  }

  return `Unsupported resource type: ${resourceType}`;
}

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
        // Only catalogue-backed rows can go missing; a material carries its own content.
        const problem = r.resourceType === 'practice' ? findProblem(String(r.resourceId)) : null;
        const catalogueBacked = r.resourceType === 'practice';
        return {
          id: String(r._id),
          skillKey: r.skillKey,
          skillName: nameOf.get(r.skillKey) || r.skillKey,
          resourceType: r.resourceType,
          resourceId: r.resourceId,
          title: r.title || problem?.title || '',
          description: r.description || '',
          url: r.url || '',
          fileKey: r.fileKey || '',
          language: r.language || '',
          audience: r.audience || EMPTY_AUDIENCE(),
          scoreWindow: r.scoreWindow || { min: null, max: null },
          body: r.body || EMPTY_BODY(),
          // Null when the target has since been removed — surfaced so an admin can see the
          // broken row rather than wondering why a mission never appears.
          resourceTitle: problem?.title || null,
          resourceMissing: catalogueBacked && !problem,
          workTypes: r.workTypes,
          priority: r.priority,
          active: r.active,
        };
      }),
      workTypes: RESOURCE_WORK_TYPES,
      resourceTypes: SKILL_RESOURCE_TYPES,
      materialTypes: MATERIAL_TYPES,
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

/**
 * GET /passport/skill-resources/concepts — every concept, with what it already has.
 *
 * The coverage counts are the point of the screen. "72 concepts" tells an admin nothing;
 * "61 concepts have no LEARN material" tells them exactly where to spend an afternoon.
 */
export const listConcepts = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [skills, rows] = await Promise.all([
      CareerSkill.find({ active: { $ne: false } })
        .select('key name domainKey difficulty learnable assessable displayOrder')
        .sort({ domainKey: 1, displayOrder: 1, name: 1 }).lean() as any,
      CareerSkillResource.find({ tenantId, active: true })
        .select('skillKey workTypes').lean() as any,
    ]);

    const bySkill = new Map<string, { total: number; work: Record<string, number> }>();
    for (const r of rows) {
      const e = bySkill.get(r.skillKey) || { total: 0, work: {} };
      e.total += 1;
      for (const w of (r.workTypes || [])) e.work[w] = (e.work[w] || 0) + 1;
      bySkill.set(r.skillKey, e);
    }

    const concepts = skills.map((s: any) => {
      const c = bySkill.get(s.key) || { total: 0, work: {} };
      return {
        key: s.key,
        name: s.name,
        domainKey: s.domainKey,
        difficulty: s.difficulty,
        learnable: s.learnable !== false,
        assessable: s.assessable !== false,
        materialCount: c.total,
        byWorkType: c.work,
        // The gap that strands a student: a concept the plan can ask them to LEARN with
        // nothing to learn from. ASSESS is excluded — assessments are built in.
        missingLearn: !(c.work.LEARN > 0),
      };
    });

    res.json({
      concepts,
      summary: {
        total: concepts.length,
        withAnyMaterial: concepts.filter((c: any) => c.materialCount > 0).length,
        missingLearn: concepts.filter((c: any) => c.missingLearn).length,
      },
    });
  } catch (e: any) {
    console.error('[skill-resource] concepts:', e?.message || e);
    res.status(500).json({ message: 'Could not load concepts.' });
  }
};

/**
 * GET /passport/skill-resources/audience-options — the values an admin can target on.
 *
 * Drawn from what MEMBERS actually have, not a hardcoded list, so the options match the
 * data rather than an assumption about it. Years come from the configured onboarding field
 * as well, because a year nobody has registered under yet is still a legitimate target.
 */
export const listAudienceOptions = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const distinct = async (field: string): Promise<string[]> => {
      const vals = await User.distinct(field, { tenantId, [field]: { $nin: [null, ''] } }) as any[];
      return vals.map(v => String(v).trim()).filter(Boolean).sort();
    };

    const [years, degrees, programs, branches, roles, roles2, stages, langs] = await Promise.all([
      distinct('passport.yearOfStudy'),
      distinct('passport.degree'),
      distinct('passport.program'),
      distinct('passport.branch'),
      distinct('passport.primaryRole'),
      distinct('passport.secondaryRole'),
      distinct('passport.stage'),
      distinct('passport.preferredLanguages'),
    ]);

    const cfg = await PassportConfig.findOne({ tenantId }).select('onboardingFields').lean() as any;
    const fieldOptions = (key: string): string[] =>
      ((cfg?.onboardingFields || []).find((f: any) => f.key === key)?.options || []).map(String);

    const merge = (...lists: string[][]): string[] =>
      [...new Set(lists.flat().map(v => v.trim()).filter(Boolean))].sort();

    res.json({
      years:     merge(years, fieldOptions('yearOfStudy')),
      courses:   merge(degrees, programs, fieldOptions('degree')),
      branches:  merge(branches, fieldOptions('branch')),
      roles:     merge(roles, roles2),
      languages: merge(langs),
      stages:    merge(stages, ['foundation', 'build', 'placement', 'job_seeker']),
    });
  } catch (e: any) {
    console.error('[skill-resource] audience options:', e?.message || e);
    res.status(500).json({ message: 'Could not load targeting options.' });
  }
};

/** POST /passport/skill-resources */
export const createSkillResource = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const skillKey = String(req.body?.skillKey || '').trim().toUpperCase();
    const resourceType = String(req.body?.resourceType || 'practice');
    const resourceId = String(req.body?.resourceId || '').trim();
    const workTypes = Array.isArray(req.body?.workTypes) ? req.body.workTypes.map(String) : ['PRACTICE'];

    const title = str(req.body?.title);
    const url = str(req.body?.url);
    const body = readBody(req.body?.body);

    if (!skillKey) return res.status(400).json({ message: 'Choose a concept.' });
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

    const bad2 = await validateTarget(tenantId, resourceType, resourceId, title, url, body);
    if (bad2) return res.status(400).json({ message: bad2 });

    try {
      const created = await CareerSkillResource.create({
        tenantId, skillKey, resourceType, resourceId, workTypes,
        title, description: str(req.body?.description), url,
        fileKey: str(req.body?.fileKey),
        language: str(req.body?.language).toLowerCase(),
        audience: readAudience(req.body?.audience),
        scoreWindow: {
          min: numOrNull(req.body?.scoreWindow?.min),
          max: numOrNull(req.body?.scoreWindow?.max),
        },
        body,
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
    if (req.body?.title !== undefined) row.title = str(req.body.title);
    if (req.body?.description !== undefined) row.description = str(req.body.description);
    if (req.body?.url !== undefined) row.url = str(req.body.url);
    if (req.body?.fileKey !== undefined) row.fileKey = str(req.body.fileKey);
    if (req.body?.language !== undefined) row.language = str(req.body.language).toLowerCase();
    if (req.body?.audience !== undefined) row.audience = readAudience(req.body.audience) as any;
    if (req.body?.scoreWindow !== undefined) {
      row.scoreWindow = {
        min: numOrNull(req.body.scoreWindow?.min),
        max: numOrNull(req.body.scoreWindow?.max),
      };
    }
    if (req.body?.body !== undefined) row.body = readBody(req.body.body) as any;

    /**
     * Re-validated after the edits are applied, not before. An edit that empties a
     * material's last field would otherwise turn a working row into a Start button
     * leading to a blank page — the same dead end create refuses.
     */
    const invalid = await validateTarget(
      tenantId, row.resourceType, String(row.resourceId || ''),
      String(row.title || ''), String(row.url || ''), (row.body || EMPTY_BODY()) as any,
    );
    if (invalid) return res.status(400).json({ message: invalid });
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
