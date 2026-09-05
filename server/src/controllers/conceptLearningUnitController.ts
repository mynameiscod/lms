/**
 * conceptLearningUnitController — the Learning Studio's API.
 *
 * FOLLOWS THE EXISTING SHAPE. CareerPilot's admin routes take whole objects on PUT rather than
 * exposing a verb per field, and the steps of a journey are edited together — reordering three
 * of them is one intention, not three requests that could half-apply. So a unit is saved
 * whole, and only publish and archive get endpoints of their own, because those are decisions
 * rather than edits.
 *
 * EVERY QUERY IS TENANT-SCOPED. The tenant comes from the authenticated request and never from
 * the body or the path — a controller that trusts a caller-supplied tenantId is one request
 * away from being a cross-tenant read.
 */
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ConceptLearningUnit from '../models/ConceptLearningUnit';
import CareerSkill from '../models/CareerSkill';
import CareerSkillResource from '../models/CareerSkillResource';
import StudentConceptProgress from '../models/StudentConceptProgress';
import {
  evaluateReadiness, publishUnit, setStatus, statusFor,
  normaliseSequence, unitEstimatedMinutes, newStepId,
} from '../services/conceptLearningUnitService';
import { journeyFor } from '../services/conceptLearningResolverService';
import { LEARNING_PHASES, LEARNING_UNIT_STATUSES, workTypeForPhase } from '../data/conceptLearningPolicy';

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const actorOf = (req: Request): string => String((req as any).user?.email || (req as any).user?.id || '');

const clean = (v: any, n: number) => String(v ?? '').trim().slice(0, n);

/** Only fields an author owns. Version, status and timestamps are never taken from a body. */
function sanitiseUnit(body: any) {
  return {
    title: clean(body.title, 160),
    description: clean(body.description, 2000),
    learningOutcomes: Array.isArray(body.learningOutcomes)
      ? body.learningOutcomes.map((o: any) => clean(o, 300)).filter(Boolean).slice(0, 20) : [],
    audience: {
      years:     Array.isArray(body?.audience?.years) ? body.audience.years.map((x: any) => clean(x, 40)) : [],
      courses:   Array.isArray(body?.audience?.courses) ? body.audience.courses.map((x: any) => clean(x, 40)) : [],
      branches:  Array.isArray(body?.audience?.branches) ? body.audience.branches.map((x: any) => clean(x, 60)) : [],
      roles:     Array.isArray(body?.audience?.roles) ? body.audience.roles.map((x: any) => clean(x, 60)) : [],
      languages: Array.isArray(body?.audience?.languages) ? body.audience.languages.map((x: any) => clean(x, 40)) : [],
      stages:    Array.isArray(body?.audience?.stages) ? body.audience.stages.map((x: any) => clean(x, 40)) : [],
    },
    completionThreshold: Math.min(1, Math.max(0, Number(body.completionThreshold ?? 1))),
  };
}

function sanitiseSteps(raw: any): any[] {
  const list = Array.isArray(raw) ? raw : [];
  const steps = list.slice(0, 60).map((s: any, i: number) => ({
    // An id supplied by the client is kept, because that is how an edit refers to a step a
    // student may already have completed. A missing one is minted rather than rejected.
    stepId: clean(s.stepId, 60) || newStepId(),
    sequence: Number(s.sequence) || i + 1,
    phase: LEARNING_PHASES.includes(s.phase) ? s.phase : 'LEARN',
    resourceId: clean(s.resourceId, 60),
    titleOverride: clean(s.titleOverride, 160),
    estimatedMinutes: Math.min(600, Math.max(0, Number(s.estimatedMinutes) || 0)),
    required: s.required !== false,
    scoreWindow: {
      min: typeof s?.scoreWindow?.min === 'number' ? s.scoreWindow.min : null,
      max: typeof s?.scoreWindow?.max === 'number' ? s.scoreWindow.max : null,
    },
    audience: {
      years:     Array.isArray(s?.audience?.years) ? s.audience.years.map((x: any) => clean(x, 40)) : [],
      courses:   Array.isArray(s?.audience?.courses) ? s.audience.courses.map((x: any) => clean(x, 40)) : [],
      branches:  Array.isArray(s?.audience?.branches) ? s.audience.branches.map((x: any) => clean(x, 60)) : [],
      roles:     Array.isArray(s?.audience?.roles) ? s.audience.roles.map((x: any) => clean(x, 60)) : [],
      languages: Array.isArray(s?.audience?.languages) ? s.audience.languages.map((x: any) => clean(x, 40)) : [],
      stages:    Array.isArray(s?.audience?.stages) ? s.audience.stages.map((x: any) => clean(x, 40)) : [],
    },
    notes: clean(s.notes, 1000),
  }));
  return normaliseSequence(steps as any);
}

/**
 * GET /concept-learning-units/concepts — the studio's main list.
 *
 * One row per skill that has EITHER a unit or some content, so an admin sees the concepts they
 * have started as well as the ones a plan can already ask for. Readiness is computed per unit
 * rather than stored, so a retired resource shows up here the moment it is retired.
 */
export const listConcepts = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(400).json({ message: 'No tenant on this request.' });

    const [units, resourceCounts, skills] = await Promise.all([
      ConceptLearningUnit.find({ tenantId }).sort({ updatedAt: -1 }).lean() as any,
      CareerSkillResource.aggregate([
        { $match: { tenantId, active: true } },
        { $group: { _id: '$skillKey', n: { $sum: 1 } } },
      ]),
      CareerSkill.find({ active: { $ne: false } }).select('key name category difficulty').lean() as any,
    ]);

    const byKey = new Map<string, any>();
    for (const u of units) {
      // Highest-status row wins the summary: an admin looking at JAVA_OOP wants to know it is
      // published, not that a later draft exists beside it.
      const cur = byKey.get(u.skillKey);
      const rank = (x: any) => (x.status === 'PUBLISHED' ? 3 : x.status === 'REVIEW' ? 2 : x.status === 'DRAFT' ? 1 : 0);
      if (!cur || rank(u) > rank(cur)) byKey.set(u.skillKey, u);
    }
    const resByKey = new Map<string, number>(resourceCounts.map((r: any) => [String(r._id).toUpperCase(), r.n]));

    const rows = [] as any[];
    for (const s of skills) {
      const unit = byKey.get(s.key) || null;
      const resources = resByKey.get(String(s.key).toUpperCase()) || 0;
      if (!unit && !resources) continue;   // nothing authored and nothing mapped — not started
      const readiness = unit ? await evaluateReadiness(unit) : null;
      rows.push({
        skillKey: s.key, skillName: s.name, category: s.category || '', difficulty: s.difficulty || '',
        unitId: unit ? String(unit._id) : null,
        unitTitle: unit?.title || '',
        unitStatus: unit?.status || null,
        version: unit?.version || 0,
        stepCount: (unit?.steps || []).length,
        estimatedMinutes: unit?.estimatedMinutes || 0,
        resources,
        readiness: readiness?.percent ?? 0,
        blocking: readiness?.blocking || [],
        status: statusFor(unit, readiness),
      });
    }

    rows.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.skillName.localeCompare(b.skillName));
    res.json({
      concepts: rows,
      summary: {
        total: rows.length,
        published: rows.filter(r => r.status === 'PUBLISHED').length,
        ready: rows.filter(r => r.status === 'READY').length,
        incomplete: rows.filter(r => r.status === 'INCOMPLETE').length,
        notConfigured: rows.filter(r => r.status === 'NOT_CONFIGURED').length,
      },
    });
  } catch (e: any) {
    console.error('[concept-learning] listConcepts:', e?.message || e);
    res.status(500).json({ message: 'Could not load the learning studio.' });
  }
};

/** GET /concept-learning-units/by-skill/:skillKey — the editor's load, with its readiness. */
export const getBySkill = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const skillKey = String(req.params.skillKey || '').toUpperCase();
    if (!tenantId || !skillKey) return res.status(400).json({ message: 'Which concept?' });

    const skill: any = await CareerSkill.findOne({ key: skillKey }).lean();
    const units = await ConceptLearningUnit.find({ tenantId, skillKey }).sort({ version: -1 }).lean() as any[];
    // The editable one is the draft if there is one, else the live unit.
    const editable = units.find(u => u.status === 'DRAFT' || u.status === 'REVIEW') || units.find(u => u.status === 'PUBLISHED') || null;
    const readiness = editable ? await evaluateReadiness(editable as any) : null;

    // Everything an author can drop into a step, with enough to render a picker.
    const resources = await CareerSkillResource.find({ tenantId, skillKey, active: true })
      .select('_id title resourceType workTypes priority url body')
      .sort({ priority: 1, createdAt: 1 }).lean() as any[];

    res.json({
      skill: skill ? { key: skill.key, name: skill.name, category: skill.category, difficulty: skill.difficulty } : { key: skillKey, name: skillKey },
      unit: editable,
      versions: units.map(u => ({ id: String(u._id), version: u.version, status: u.status, updatedAt: u.updatedAt })),
      readiness,
      resources: resources.map(r => ({
        id: String(r._id), title: r.title, resourceType: r.resourceType,
        workTypes: r.workTypes || [], priority: r.priority,
        hasContent: !!(String(r.url || '').trim() || r.body),
      })),
    });
  } catch (e: any) {
    console.error('[concept-learning] getBySkill:', e?.message || e);
    res.status(500).json({ message: 'Could not load this concept.' });
  }
};

/**
 * PUT /concept-learning-units/by-skill/:skillKey — create or save the working copy.
 *
 * EDITS NEVER TOUCH A LIVE UNIT. Saving against a published concept forks a DRAFT rather than
 * rewriting what students are reading — an admin halfway through reordering a journey must not
 * be reordering it underneath the people working through it. Publishing is what makes a draft
 * live, and that is a separate, deliberate call.
 */
export const saveBySkill = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const skillKey = String(req.params.skillKey || '').toUpperCase();
    if (!tenantId || !skillKey) return res.status(400).json({ message: 'Which concept?' });

    const skill: any = await CareerSkill.findOne({ key: skillKey }).lean();
    if (!skill) return res.status(400).json({ message: `${skillKey} is not in the skill graph.` });

    const fields = sanitiseUnit(req.body || {});
    const steps = sanitiseSteps(req.body?.steps);
    if (!fields.title) return res.status(400).json({ message: 'A title is required.' });

    let doc = await ConceptLearningUnit.findOne({ tenantId, skillKey, status: { $in: ['DRAFT', 'REVIEW'] } });
    if (!doc) {
      const live = await ConceptLearningUnit.findOne({ tenantId, skillKey, status: 'PUBLISHED' }).lean() as any;
      doc = new ConceptLearningUnit({
        tenantId, skillKey, status: 'DRAFT',
        // A draft forked from a live unit starts at its version; publishing raises it.
        version: live?.version || 1,
        createdBy: actorOf(req),
      });
    }

    Object.assign(doc, fields);
    doc.steps = steps as any;
    doc.estimatedMinutes = unitEstimatedMinutes(steps as any);
    doc.updatedBy = actorOf(req);
    await doc.save();

    const readiness = await evaluateReadiness(doc);
    res.json({ unit: doc.toObject(), readiness });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'A published unit already exists for this concept.' });
    console.error('[concept-learning] saveBySkill:', e?.message || e);
    res.status(500).json({ message: e?.message || 'Could not save this journey.' });
  }
};

/** GET /concept-learning-units/:id/readiness */
export const readiness = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const doc = await ConceptLearningUnit.findOne({ tenantId, _id: req.params.id });
    if (!doc) return res.status(404).json({ message: 'Not found.' });
    res.json(await evaluateReadiness(doc));
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Could not check readiness.' });
  }
};

/** POST /concept-learning-units/:id/publish — refuses when the unit cannot teach. */
export const publish = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const result = await publishUnit(tenantId, String(req.params.id), actorOf(req));
    if (!result.published) return res.status(400).json(result);
    res.json(result);
  } catch (e: any) {
    console.error('[concept-learning] publish:', e?.message || e);
    res.status(500).json({ message: e?.message || 'Could not publish.' });
  }
};

/** POST /concept-learning-units/:id/archive */
export const archive = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const doc = await setStatus(tenantId, String(req.params.id), 'ARCHIVED', actorOf(req));
    if (!doc) return res.status(404).json({ message: 'Not found.' });
    res.json({ archived: true, unit: doc.toObject() });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Could not archive.' });
  }
};

/**
 * GET /concept-learning-units/:id/preview — the journey as a student would meet it.
 *
 * Resolved against real resources so an author sees what actually opens, including the steps
 * whose resource has been retired underneath them — which is the failure this preview exists
 * to surface before a student finds it.
 */
export const preview = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const doc = await ConceptLearningUnit.findOne({ tenantId, _id: req.params.id }).lean() as any;
    if (!doc) return res.status(404).json({ message: 'Not found.' });

    const ids = (doc.steps || []).map((s: any) => s.resourceId).filter((x: any) => x && mongoose.isValidObjectId(x));
    const rows = ids.length
      ? await CareerSkillResource.find({ tenantId, _id: { $in: ids } }).select('_id title resourceType active').lean() as any[]
      : [];
    const byId = new Map(rows.map(r => [String(r._id), r]));

    res.json({
      unit: { id: String(doc._id), title: doc.title, skillKey: doc.skillKey, status: doc.status, version: doc.version },
      steps: (doc.steps || []).sort((a: any, b: any) => a.sequence - b.sequence).map((s: any) => {
        const r = s.resourceId ? byId.get(String(s.resourceId)) : null;
        return {
          stepId: s.stepId, sequence: s.sequence, phase: s.phase,
          workType: workTypeForPhase(s.phase),
          title: s.titleOverride || r?.title || (workTypeForPhase(s.phase) === 'ASSESS' ? 'Skill check' : '(no resource)'),
          resourceType: r?.resourceType || (s.resourceId ? 'missing' : 'assessment'),
          estimatedMinutes: s.estimatedMinutes, required: s.required,
          problem: !s.resourceId && workTypeForPhase(s.phase) !== 'ASSESS' ? 'No resource attached'
                 : s.resourceId && !r ? 'Resource no longer exists'
                 : r && r.active === false ? 'Resource is retired' : null,
        };
      }),
    });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Could not build the preview.' });
  }
};

/** GET /me/concept-journey/:skillKey — the member's own view of where they are. */
export const myJourney = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String((req as any).user?.id || '');
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });
    const view = await journeyFor(tenantId, studentId, String(req.params.skillKey || ''));
    if (!view) return res.status(404).json({ message: 'No learning journey for this concept yet.' });
    res.json(view);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Could not load your journey.' });
  }
};

/** GET /concept-learning-units/analytics — how much of the bank is actually authored. */
export const analytics = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [units, progress] = await Promise.all([
      ConceptLearningUnit.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
      StudentConceptProgress.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
    ]);
    const byStatus = Object.fromEntries(units.map((u: any) => [u._id, u.n]));
    res.json({
      units: {
        published: byStatus.PUBLISHED || 0,
        draft: byStatus.DRAFT || 0,
        review: byStatus.REVIEW || 0,
        archived: byStatus.ARCHIVED || 0,
      },
      students: Object.fromEntries(progress.map((p: any) => [p._id, p.n])),
      statuses: LEARNING_UNIT_STATUSES,
    });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Could not load analytics.' });
  }
};
