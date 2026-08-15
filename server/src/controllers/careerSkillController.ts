import { Request, Response } from 'express';
import CareerSkill from '../models/CareerSkill';
import AuditLog from '../models/AuditLog';
import {
  getSkillTree, getAllSkills, getSkillByKey, validateSkillGraph, cleanPrerequisites,
  isValidSkillKey, suggestSkillKey, findSkillReferences,
} from '../services/careerSkillService';
import { seedCareerSkills } from '../services/careerSkillSeedService';
import { SKILL_DIFFICULTIES, SKILL_NODE_TYPES } from '../models/CareerSkill';
import { DEFAULT_DOMAIN, isKnownActiveDomain, CAREER_DOMAINS } from '../services/careerDomainService';

/**
 * Admin management of the canonical skill graph.
 *
 * The catalogue is GLOBAL — one CareerSkill collection shared by every tenant, so that
 * JAVA_OOP means the same thing everywhere and future comparisons across colleges are
 * possible at all. The consequence is that a write here affects every tenant, which is why
 * the routes put mutations behind SUPER_ADMIN while any CareerPilot admin may read.
 *
 * Nothing in this file touches a student, a role, a roadmap or an assessment. Module 3
 * describes the skill universe; connecting it to anything is a later module's work.
 */

const whoOf = (req: Request): string => String((req as any).user?.email || '');

/** Best-effort audit, on the same terms as career roles — never fails a config change. */
async function audit(req: Request, action: 'CREATE' | 'UPDATE' | 'DELETE', skill: any, details: string) {
  try {
    await AuditLog.create({
      tenantId: (req as any).user?.tenantId || (req as any).tenantId,
      userId: (req as any).user?.id || (req as any).user?._id,
      action, module: 'SYSTEM',
      targetType: 'CareerSkill',
      targetId: skill?._id,
      details,
      metadata: { key: skill?.key, domainKey: skill?.domainKey },
    });
  } catch (e: any) {
    console.warn('[career-skills] audit write failed:', e?.message || e);
  }
}

const publicShape = (s: any) => ({
  id: String(s._id),
  key: s.key, domainKey: s.domainKey,
  name: s.name, shortName: s.shortName || '', description: s.description || '',
  nodeType: s.nodeType, parentKey: s.parentKey || null,
  prerequisiteKeys: s.prerequisiteKeys || [],
  difficulty: s.difficulty, aliases: s.aliases || [],
  displayOrder: s.displayOrder ?? 100,
  active: s.active !== false, assessable: !!s.assessable, learnable: !!s.learnable,
  systemSkill: !!s.systemSkill,
  updatedBy: s.updatedBy || '', updatedAt: s.updatedAt,
});

/**
 * GET /passport/skills — the tree, the flat list and the vocabulary, in one response.
 *
 * All three from a single query. The tree is what the screen renders; the flat list backs
 * the parent and prerequisite pickers; sending them separately would mean the picker could
 * disagree with the tree it sits next to.
 */
export const listSkills = async (req: Request, res: Response) => {
  try {
    const domainKey = DEFAULT_DOMAIN;
    const [tree, flat] = await Promise.all([
      getSkillTree(domainKey, true),
      getAllSkills(domainKey, true),
    ]);

    res.json({
      tree,
      skills: flat.map(publicShape),
      domains: CAREER_DOMAINS.filter(d => d.active).map(d => ({ key: d.key, label: d.label })),
      nodeTypes: SKILL_NODE_TYPES,
      difficulties: SKILL_DIFFICULTIES,
      counts: {
        total: flat.length,
        active: flat.filter(s => s.active).length,
        assessable: flat.filter(s => s.active && s.assessable && s.nodeType === 'SKILL').length,
        groups: flat.filter(s => s.nodeType === 'GROUP').length,
      },
    });
  } catch (e: any) {
    console.error('[career-skills] list:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not load the skill graph' });
  }
};

/** POST /passport/skills/seed — install anything missing. Idempotent; pass dryRun to preview. */
export const seedSkills = async (req: Request, res: Response) => {
  try {
    const report = await seedCareerSkills({
      dryRun: req.body?.dryRun === true,
      updatedBy: whoOf(req),
    });
    res.json({ ...report, dryRun: req.body?.dryRun === true });
  } catch (e: any) {
    console.error('[career-skills] seed:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not install the taxonomy' });
  }
};

/** POST /passport/skills */
export const createSkill = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};

    const name = String(b.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Give the skill a name.' });

    const key = String(b.key || suggestSkillKey(name)).trim().toUpperCase();
    if (!isValidSkillKey(key)) {
      return res.status(400).json({
        message: `"${key}" is not a valid key. Use uppercase words joined by underscores, e.g. JAVA_GENERICS.`,
      });
    }

    // Same treatment as career roles: absent means "no opinion", an unrecognised value is
    // refused rather than coerced into the live domain behind the admin's back.
    let domainKey: string = DEFAULT_DOMAIN;
    if (b.domainKey !== undefined && b.domainKey !== null && String(b.domainKey).trim() !== '') {
      const want = String(b.domainKey).trim().toUpperCase();
      if (!isKnownActiveDomain(want)) {
        return res.status(400).json({ message: `"${want}" is not an available career domain.` });
      }
      domainKey = want;
    }

    if (await CareerSkill.findOne({ key }).select('name').lean()) {
      return res.status(409).json({ message: `The key ${key} is already in use.` });
    }

    const all = await getAllSkills(domainKey, true);
    const prerequisiteKeys = cleanPrerequisites(b.prerequisiteKeys, key);
    const check = validateSkillGraph({
      key, domainKey, parentKey: b.parentKey, prerequisiteKeys, all, isCreate: true,
    });
    if (!check.ok) return res.status(400).json({ message: check.message });

    const nodeType = SKILL_NODE_TYPES.includes(b.nodeType) ? b.nodeType : 'SKILL';
    const skill = await CareerSkill.create({
      domainKey, key, name,
      shortName: String(b.shortName || '').trim(),
      description: String(b.description || '').trim(),
      nodeType,
      parentKey: b.parentKey ? String(b.parentKey).trim().toUpperCase() : null,
      prerequisiteKeys,
      difficulty: SKILL_DIFFICULTIES.includes(b.difficulty) ? b.difficulty : 'FOUNDATION',
      aliases: Array.isArray(b.aliases) ? b.aliases.map((a: any) => String(a).trim()).filter(Boolean).slice(0, 12) : [],
      displayOrder: Number.isFinite(Number(b.displayOrder)) ? Number(b.displayOrder) : 100,
      active: b.active !== false,
      // A group organises rather than measures, so it defaults to neither assessable nor
      // learnable unless the admin says otherwise.
      assessable: b.assessable !== undefined ? b.assessable === true : nodeType === 'SKILL',
      learnable: b.learnable !== undefined ? b.learnable === true : nodeType === 'SKILL',
      systemSkill: false,
      createdBy: whoOf(req), updatedBy: whoOf(req),
    });

    await audit(req, 'CREATE', skill, `Created skill "${name}" (${key})`);
    res.status(201).json({ skill: publicShape(skill) });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'That skill key already exists.' });
    if (e?.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(e.errors || {}).map((x: any) => x.message)[0] || 'Invalid skill' });
    }
    console.error('[career-skills] create:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not create the skill' });
  }
};

/**
 * PUT /passport/skills/:id
 *
 * `key` and `domainKey` are fixed at creation, exactly as on a career role. Both are
 * references future modules will hold, and this model cannot see who holds them — changing
 * either would break those references with no error raised anywhere.
 *
 * `parentKey` IS editable: moving a skill within its taxonomy is ordinary curation and
 * changes nothing about the skill's identity, so long as it does not create a loop.
 */
export const updateSkill = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const skill: any = await CareerSkill.findById(req.params.id);
    if (!skill) return res.status(404).json({ message: 'No such skill' });

    if (b.key !== undefined && String(b.key).trim().toUpperCase() !== skill.key) {
      return res.status(400).json({
        message: 'A skill key cannot be changed after creation. Deactivate this one and create the skill you meant.',
      });
    }
    if (b.domainKey !== undefined && String(b.domainKey).trim() !== ''
        && String(b.domainKey).trim().toUpperCase() !== skill.domainKey) {
      return res.status(400).json({
        message: "A skill's career domain cannot be changed after creation. Create a new skill instead.",
      });
    }

    // Validated against the whole graph before any field is touched, so a rejected edit
    // never leaves the skill half-changed.
    const all = await getAllSkills(skill.domainKey, true);
    const nextPrereqs = b.prerequisiteKeys !== undefined
      ? cleanPrerequisites(b.prerequisiteKeys, skill.key)
      : undefined;

    const check = validateSkillGraph({
      key: skill.key, domainKey: skill.domainKey,
      parentKey: b.parentKey !== undefined ? b.parentKey : undefined,
      prerequisiteKeys: nextPrereqs,
      all,
    });
    if (!check.ok) return res.status(400).json({ message: check.message });

    const before = { active: skill.active, parentKey: skill.parentKey, prereqs: (skill.prerequisiteKeys || []).join(',') };

    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (!name) return res.status(400).json({ message: 'A skill needs a name.' });
      skill.name = name;
    }
    if (b.shortName !== undefined) skill.shortName = String(b.shortName).trim();
    if (b.description !== undefined) skill.description = String(b.description).trim();
    if (b.nodeType !== undefined && SKILL_NODE_TYPES.includes(b.nodeType)) skill.nodeType = b.nodeType;
    if (b.difficulty !== undefined && SKILL_DIFFICULTIES.includes(b.difficulty)) skill.difficulty = b.difficulty;
    if (b.parentKey !== undefined) {
      skill.parentKey = b.parentKey ? String(b.parentKey).trim().toUpperCase() : null;
    }
    if (nextPrereqs !== undefined) skill.prerequisiteKeys = nextPrereqs;
    if (b.aliases !== undefined) {
      skill.aliases = Array.isArray(b.aliases) ? b.aliases.map((a: any) => String(a).trim()).filter(Boolean).slice(0, 12) : [];
    }
    if (b.displayOrder !== undefined && Number.isFinite(Number(b.displayOrder))) skill.displayOrder = Number(b.displayOrder);
    if (b.active !== undefined) skill.active = b.active === true;
    if (b.assessable !== undefined) skill.assessable = b.assessable === true;
    if (b.learnable !== undefined) skill.learnable = b.learnable === true;

    skill.updatedBy = whoOf(req);
    await skill.save();

    // Structural changes are recorded distinctly from a rename — "who moved this, and
    // when" is the question somebody asks months later.
    const changes: string[] = [];
    if (before.active !== skill.active) changes.push(skill.active ? 'activated' : 'deactivated');
    if (before.parentKey !== skill.parentKey) changes.push(`moved under ${skill.parentKey || 'the root'}`);
    if (before.prereqs !== (skill.prerequisiteKeys || []).join(',')) changes.push('prerequisites changed');
    await audit(req, 'UPDATE', skill,
      changes.length ? `Skill "${skill.name}" ${changes.join(', ')}` : `Updated skill "${skill.name}"`);

    res.json({ skill: publicShape(skill) });
  } catch (e: any) {
    if (e?.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(e.errors || {}).map((x: any) => x.message)[0] || 'Invalid skill' });
    }
    console.error('[career-skills] update:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not save the skill' });
  }
};

/**
 * DELETE /passport/skills/:id
 *
 * Refused for a seeded skill, and refused for anything another node still points at.
 * Deactivation is the intended action and the error says so — a deleted skill would leave
 * dangling parent and prerequisite edges that nothing else would report.
 */
export const deleteSkill = async (req: Request, res: Response) => {
  try {
    const skill: any = await CareerSkill.findById(req.params.id);
    if (!skill) return res.status(404).json({ message: 'No such skill' });

    if (skill.systemSkill) {
      return res.status(400).json({
        message: `"${skill.name}" is part of the canonical taxonomy and cannot be deleted. Deactivate it instead.`,
      });
    }

    const refs = await findSkillReferences(skill.key);
    if (refs.children.length || refs.dependents.length) {
      const parts = [
        refs.children.length ? `${refs.children.length} skill(s) sit under it` : '',
        refs.dependents.length ? `${refs.dependents.length} skill(s) require it` : '',
      ].filter(Boolean).join(' and ');
      return res.status(409).json({
        message: `"${skill.name}" cannot be deleted — ${parts}. Deactivate it instead.`,
        references: refs,
      });
    }

    await CareerSkill.deleteOne({ _id: skill._id });
    await audit(req, 'DELETE', skill, `Deleted unused skill "${skill.name}" (${skill.key})`);
    res.json({ success: true });
  } catch (e: any) {
    console.error('[career-skills] delete:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not delete the skill' });
  }
};

/** GET /passport/skills/:key/usage — what points at this skill, before hiding or deleting it. */
export const skillUsage = async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key || '').toUpperCase();
    const skill = await getSkillByKey(key);
    if (!skill) return res.status(404).json({ message: 'No such skill' });

    res.json({ key, ...(await findSkillReferences(key)) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not check usage' });
  }
};
