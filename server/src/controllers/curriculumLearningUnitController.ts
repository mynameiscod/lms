import { Request, Response } from 'express';
import CurriculumLearningUnit, {
  LEARNING_UNIT_TYPES, LEARNING_UNIT_CATEGORIES,
} from '../models/CurriculumLearningUnit';
import LearningContentLibrary from '../models/LearningContentLibrary';
import LearningCurriculum from '../models/LearningCurriculum';
import CareerSkill from '../models/CareerSkill';
import { SPINE_BANDS } from '../data/ninetyDayPolicy';

/**
 * Authoring the mega curriculum's Learning Units.
 *
 * ── WHAT THIS EDITS, AND WHAT IT DOES NOT ─────────────────────────────────────────────────
 *
 * It edits STRUCTURE: which units a topic breaks into, in what order, what they teach, who they
 * are for. It never edits content. A unit resolves its bundle from LearningContentLibrary by
 * unitCode, then topicCode, then skillKeys — so the material is authored once in the Content
 * Library and a unit points at it. A second content editor here would fork the authoring surface,
 * which this codebase has already paid for once.
 *
 * ── NO DAY NUMBERS PASS THROUGH HERE ──────────────────────────────────────────────────────
 *
 * There is no route that sets a day, and no field to set one on. A unit belongs to the master
 * curriculum; placing it on day 34 for one student is the composer's job and lives in a DayPlan.
 * The `band` a unit may carry is a region of the ninety-day shape, not a day.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const actorOf = (req: Request): string =>
  String((req as any).user?.email || (req as any).user?.id || '');

const clean = (v: any, n: number): string => String(v ?? '').trim().slice(0, n);
const cleanList = (v: any, n: number, upper = false): string[] =>
  (Array.isArray(v) ? v : [])
    .map(x => { const t = clean(x, n); return upper ? t.toUpperCase() : t; })
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i);

const BAND_KEYS = new Set<string>(SPINE_BANDS.map(b => b.key));

/**
 * The content a unit would actually teach.
 *
 * PRECEDENCE, NARROWEST FIRST. `unitCode` is the tightest hook and wins where it is set;
 * `topicCode` serves every unit of a topic; `skillKeys` serves anything teaching that skill.
 * Each falls back rather than filtering out, which is what keeps one authored video usable across
 * a whole spiral instead of forcing a copy per unit.
 */
async function resolveBundle(tenantId: string, unit: {
  unitCode: string; topicCode: string; skillKeys: string[];
}): Promise<{ rows: any[]; via: 'unitCode' | 'topicCode' | 'skillKeys' | 'none' }> {
  const sel = '_id type title estimatedDuration learningDepth isPublished';

  const byUnit = await LearningContentLibrary
    .find({ tenantId, isPublished: true, unitCode: unit.unitCode }).select(sel).lean() as any[];
  if (byUnit.length) return { rows: byUnit, via: 'unitCode' };

  if (unit.topicCode) {
    const byTopic = await LearningContentLibrary
      .find({ tenantId, isPublished: true, topicCode: unit.topicCode }).select(sel).lean() as any[];
    if (byTopic.length) return { rows: byTopic, via: 'topicCode' };
  }

  if (unit.skillKeys.length) {
    const bySkill = await LearningContentLibrary
      .find({ tenantId, isPublished: true, skillKeys: { $in: unit.skillKeys } })
      .select(sel).lean() as any[];
    if (bySkill.length) return { rows: bySkill, via: 'skillKeys' };
  }

  return { rows: [], via: 'none' };
}

const TEACHING_TYPES = new Set(['video', 'notes', 'interactive_lesson', 'interactive_activity', 'worked_example']);
const PRACTICE_TYPES = new Set(['practice_coding', 'practice_theory', 'aptitude', 'tech_qa', 'behavioral_qa']);

const coverageOf = (rows: any[]) => ({
  hasTeaching: rows.some(r => TEACHING_TYPES.has(r.type)),
  hasPractice: rows.some(r => PRACTICE_TYPES.has(r.type)),
  types: [...new Set(rows.map(r => String(r.type)))],
  resolvedMinutes: rows.reduce((n, r) => n + (Number(r.estimatedDuration) || 0), 0),
});

/**
 * Why this unit cannot go live, or null.
 *
 * Reported on save, ENFORCED on publish. Authoring a unit before its content exists is an
 * ordinary way to work; publishing one that resolves to nothing puts a blank page with a title
 * on it into a student's plan, three weeks before anybody notices.
 */
async function teachingFault(tenantId: string, unit: {
  unitCode: string; topicCode: string; skillKeys: string[];
}): Promise<string | null> {
  const { rows, via } = await resolveBundle(tenantId, unit);
  if (!rows.length) {
    return `Nothing in the Content Library resolves for ${unit.unitCode}. Tag content with this `
      + 'unit code, its topic code, or one of its skills, and publish it first.';
  }
  if (!coverageOf(rows).hasTeaching) {
    return `${unit.unitCode} resolves ${rows.length} item(s) via ${via}, but none of them teach `
      + '— there is practice with no lesson behind it.';
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Reading
 * ------------------------------------------------------------------ */

/**
 * GET /curriculum-units?stage=foundation — the mega curriculum, module → topic → units.
 *
 * One response on purpose: the question an author is asking is "where are the holes", which is a
 * question about the whole shape. Seven requests would make the screen flicker into correctness
 * one module at a time.
 */
export const listUnits = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(400).json({ message: 'No tenant on this request.' });

    const stageKey = clean(req.query.stage, 60) || 'foundation';

    const [units, curriculum] = await Promise.all([
      CurriculumLearningUnit.find({ tenantId, stageKey })
        .sort({ displayOrder: 1 }).lean() as any,
      LearningCurriculum.findOne({ tenantId, adaptiveStage: stageKey })
        .select('title topics modules').lean() as any,
    ]);

    const moduleName = new Map<string, string>(
      ((curriculum?.modules || []) as any[]).map(m => [String(m.moduleCode), String(m.moduleName || m.moduleCode)]),
    );
    const moduleOrder = new Map<string, number>(
      ((curriculum?.modules || []) as any[]).map(m => [String(m.moduleCode), Number(m.displayOrder) || 0]),
    );

    /** Every topic of the curriculum, whether or not it has been broken into units yet. */
    const topics = ((curriculum?.topics || []) as any[]).filter(t => t.topicCode);
    const byTopic = new Map<string, any[]>();
    for (const u of units as any[]) {
      const k = String(u.topicCode);
      byTopic.set(k, [...(byTopic.get(k) || []), u]);
    }

    const rows = topics.map(t => {
      const mine = (byTopic.get(String(t.topicCode)) || [])
        .sort((a, b) => (a.displayOrder - b.displayOrder) || String(a.unitCode).localeCompare(String(b.unitCode)));
      return {
        moduleCode: String(t.moduleCode || 'UNGROUPED'),
        moduleName: moduleName.get(String(t.moduleCode)) || String(t.moduleCode || 'Ungrouped'),
        moduleOrder: moduleOrder.get(String(t.moduleCode)) ?? 999,
        topicCode: String(t.topicCode),
        topicTitle: String(t.title || t.topicCode),
        topicSkillKeys: (t.skillKeys || []).map((k: string) => String(k).toUpperCase()),
        units: mine,
        published: mine.filter(u => u.status === 'PUBLISHED').length,
        drafts: mine.filter(u => u.status === 'DRAFT').length,
      };
    }).sort((a, b) => (a.moduleOrder - b.moduleOrder) || a.topicCode.localeCompare(b.topicCode));

    /**
     * Units whose topic is no longer in the curriculum. Surfaced, never hidden.
     *
     * A topic renamed is fine — codes survive that. A topic DELETED leaves its units pointing at
     * nothing, and dropping them from this list is how they stay orphaned and invisible.
     */
    const known = new Set(topics.map(t => String(t.topicCode)));
    const orphaned = (units as any[]).filter(u => !known.has(String(u.topicCode)));

    res.json({
      stageKey,
      curriculumTitle: curriculum?.title || null,
      rows,
      orphaned,
      summary: {
        topics: topics.length,
        topicsWithUnits: rows.filter(r => r.units.length > 0).length,
        totalUnits: (units as any[]).length,
        published: (units as any[]).filter(u => u.status === 'PUBLISHED').length,
        drafts: (units as any[]).filter(u => u.status === 'DRAFT').length,
        orphaned: orphaned.length,
      },
    });
  } catch (e: any) {
    console.error('[learning-units] list:', e?.message || e);
    res.status(500).json({ message: 'Could not load the mega curriculum.' });
  }
};

/** GET /curriculum-units/:unitCode — one unit, with what it currently resolves. */
export const getUnit = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const unitCode = clean(req.params.unitCode, 80).toUpperCase();
    const unit = await CurriculumLearningUnit.findOne({ tenantId, unitCode }).lean() as any;
    if (!unit) return res.status(404).json({ message: 'No such unit.' });

    const { rows, via } = await resolveBundle(tenantId, {
      unitCode, topicCode: unit.topicCode, skillKeys: unit.skillKeys || [],
    });

    res.json({ unit, bundle: { via, items: rows, ...coverageOf(rows) } });
  } catch (e: any) {
    console.error('[learning-units] get:', e?.message || e);
    res.status(500).json({ message: 'Could not load this unit.' });
  }
};

/** GET /curriculum-units/options — the vocabularies an author picks from. */
export const unitOptions = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(400).json({ message: 'No tenant on this request.' });

    const stageKey = clean(req.query.stage, 60) || 'foundation';
    const [curriculum, skills] = await Promise.all([
      LearningCurriculum.findOne({ tenantId, adaptiveStage: stageKey })
        .select('topics modules').lean() as any,
      CareerSkill.find({ active: true }).select('key name').lean() as any,
    ]);

    res.json({
      stageKey,
      modules: ((curriculum?.modules || []) as any[])
        .map(m => ({ moduleCode: m.moduleCode, moduleName: m.moduleName, displayOrder: m.displayOrder }))
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
      topics: ((curriculum?.topics || []) as any[])
        .filter(t => t.topicCode)
        .map(t => ({
          moduleCode: t.moduleCode || '',
          topicCode: t.topicCode,
          title: t.title,
          skillKeys: (t.skillKeys || []).map((k: string) => String(k).toUpperCase()),
          defaultDepth: t.defaultDepth || null,
          applicableDirections: t.applicableDirections || [],
        })),
      skills: (skills as any[]).map(s => ({ key: s.key, name: s.name || s.key })),
      unitTypes: LEARNING_UNIT_TYPES,
      categories: LEARNING_UNIT_CATEGORIES,
      bands: SPINE_BANDS.map(b => ({ key: b.key, label: b.label, days: b.days })),
    });
  } catch (e: any) {
    console.error('[learning-units] options:', e?.message || e);
    res.status(500).json({ message: 'Could not load authoring options.' });
  }
};

/* ------------------------------------------------------------------ *
 * Writing
 * ------------------------------------------------------------------ */

/**
 * PUT /curriculum-units/:unitCode — create or update one unit.
 *
 * Upsert on the code rather than separate create and update routes: the code is chosen by the
 * author and is what identifies the unit, so a create that collided would be an update in every
 * sense except the error message.
 *
 * THE CODE NEVER MOVES. A student's completed work will be keyed on it, so an edit that changed
 * it would make "I finished Inheritance" point at nothing. It is read from the URL and never from
 * the body.
 */
export const saveUnit = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const unitCode = clean(req.params.unitCode, 80).toUpperCase();
    if (!tenantId || !unitCode) return res.status(400).json({ message: 'Which unit?' });

    const b = req.body || {};

    const title = clean(b.title, 200);
    if (!title) return res.status(400).json({ message: 'A unit needs a title.' });

    const topicCode = clean(b.topicCode, 80).toUpperCase();
    if (!topicCode) return res.status(400).json({ message: 'A unit belongs to a topic. Which one?' });

    const band = clean(b.band, 40).toUpperCase();
    if (band && !BAND_KEYS.has(band)) {
      return res.status(400).json({ message: `${band} is not a band of the ninety-day spine.` });
    }

    const unitType = clean(b.unitType, 40).toUpperCase() || 'CONCEPT';
    if (!(LEARNING_UNIT_TYPES as string[]).includes(unitType)) {
      return res.status(400).json({ message: `${unitType} is not a unit type.` });
    }

    const category = clean(b.category, 40).toUpperCase() || 'UNIVERSAL';
    if (!(LEARNING_UNIT_CATEGORIES as string[]).includes(category)) {
      return res.status(400).json({ message: `${category} is not a category.` });
    }

    const fields = {
      stageKey: clean(b.stageKey, 60) || 'foundation',
      moduleCode: clean(b.moduleCode, 80).toUpperCase(),
      topicCode,
      title,
      description: clean(b.description, 2000),
      displayOrder: Number.isFinite(Number(b.displayOrder)) ? Number(b.displayOrder) : 100,
      skillKeys: cleanList(b.skillKeys, 80, true),
      prerequisiteSkillKeys: cleanList(b.prerequisiteSkillKeys, 80, true),
      prerequisiteUnitCodes: cleanList(b.prerequisiteUnitCodes, 80, true),
      learningOutcomes: cleanList(b.learningOutcomes, 300),
      category: category as any,
      applicableDirections: cleanList(b.applicableDirections, 60, true),
      audience: {
        languages: cleanList(b.audience?.languages, 40),
        years:     cleanList(b.audience?.years, 20),
        branches:  cleanList(b.audience?.branches, 60),
      },
      defaultDepth: clean(b.defaultDepth, 20).toUpperCase() || 'STANDARD',
      estimatedMinutes: Math.max(0, Number(b.estimatedMinutes) || 0),
      unitType: unitType as any,
      mandatory: b.mandatory !== false,
      ...(band ? { band: band as any } : {}),
    };

    /**
     * A unit cannot name itself as its own prerequisite.
     *
     * Cheap to type by accident when duplicating a unit, and it would lock the unit permanently
     * with a reason nobody could read off the screen.
     */
    fields.prerequisiteUnitCodes = fields.prerequisiteUnitCodes.filter(c => c !== unitCode);

    const existing = await CurriculumLearningUnit.findOne({ tenantId, unitCode }).select('status').lean() as any;

    const doc = await CurriculumLearningUnit.findOneAndUpdate(
      { tenantId, unitCode },
      {
        $set: { ...fields, updatedBy: actorOf(req) },
        // Status is never set here. Editing a live unit must not silently pull it out of every
        // plan mid-week; publishing and archiving have their own routes.
        $setOnInsert: { tenantId, unitCode, status: 'DRAFT', createdBy: actorOf(req) },
      },
      { new: true, upsert: true, runValidators: true },
    );

    res.json({
      unit: doc?.toObject(),
      created: !existing,
      warning: await teachingFault(tenantId, { unitCode, topicCode, skillKeys: fields.skillKeys }),
    });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'A unit with that code already exists in this tenant.' });
    }
    console.error('[learning-units] save:', e?.message || e);
    res.status(500).json({ message: e?.message || 'Could not save this unit.' });
  }
};

/**
 * POST /curriculum-units/:unitCode/publish — make it selectable.
 *
 * REFUSES A UNIT THAT CANNOT TEACH. Publishing is the moment a unit becomes reachable by a
 * student, and the composer will not re-check content — it trusts that a published unit has
 * something behind it. This is the only place that trust is earned.
 */
export const publishUnit = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const unitCode = clean(req.params.unitCode, 80).toUpperCase();
    const doc = await CurriculumLearningUnit.findOne({ tenantId, unitCode });
    if (!doc) return res.status(404).json({ message: 'No such unit.' });

    const fault = await teachingFault(tenantId, {
      unitCode, topicCode: doc.topicCode, skillKeys: doc.skillKeys || [],
    });
    if (fault) return res.status(400).json({ published: false, message: fault });

    /**
     * The authored estimate stands unless the content disagrees and the author never set one.
     *
     * A unit written before its content existed carries 0 minutes; taking the resolved total then
     * is strictly better than publishing a zero. Overwriting a number an author DID set would be
     * worse — they may know the unit runs longer than its material suggests.
     */
    if (!doc.estimatedMinutes) {
      const { rows } = await resolveBundle(tenantId, {
        unitCode, topicCode: doc.topicCode, skillKeys: doc.skillKeys || [],
      });
      doc.estimatedMinutes = coverageOf(rows).resolvedMinutes;
    }

    doc.status = 'PUBLISHED';
    doc.updatedBy = actorOf(req);
    await doc.save();

    res.json({ published: true, unit: doc.toObject() });
  } catch (e: any) {
    console.error('[learning-units] publish:', e?.message || e);
    res.status(500).json({ message: e?.message || 'Could not publish this unit.' });
  }
};

/** POST /curriculum-units/:unitCode/status — move between DRAFT and ARCHIVED. */
export const setUnitStatus = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const unitCode = clean(req.params.unitCode, 80).toUpperCase();
    const status = clean(req.body?.status, 20).toUpperCase();

    // PUBLISHED is deliberately absent: it has its own route because it has its own checks.
    if (status !== 'DRAFT' && status !== 'ARCHIVED') {
      return res.status(400).json({ message: 'Use the publish route to make a unit live.' });
    }

    const doc = await CurriculumLearningUnit.findOneAndUpdate(
      { tenantId, unitCode },
      { $set: { status, updatedBy: actorOf(req) } },
      { new: true },
    );
    if (!doc) return res.status(404).json({ message: 'No such unit.' });

    res.json({ unit: doc.toObject() });
  } catch (e: any) {
    console.error('[learning-units] status:', e?.message || e);
    res.status(500).json({ message: 'Could not change this unit.' });
  }
};

/**
 * POST /curriculum-units/reorder — set the order of several units in one topic.
 *
 * One request, because reordering is one intention. Sending five would leave a topic half
 * reordered whenever one of them failed.
 */
export const reorderUnits = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const order = Array.isArray(req.body?.order) ? req.body.order : [];
    if (!order.length) return res.status(400).json({ message: 'Nothing to reorder.' });

    await CurriculumLearningUnit.bulkWrite(order.map((row: any, i: number) => ({
      updateOne: {
        filter: { tenantId, unitCode: clean(row?.unitCode, 80).toUpperCase() },
        update: {
          $set: {
            displayOrder: Number.isFinite(Number(row?.displayOrder)) ? Number(row.displayOrder) : i,
            updatedBy: actorOf(req),
          },
        },
      },
    })));

    res.json({ reordered: order.length });
  } catch (e: any) {
    console.error('[learning-units] reorder:', e?.message || e);
    res.status(500).json({ message: 'Could not reorder these units.' });
  }
};

/**
 * DELETE /curriculum-units/:unitCode — remove a unit entirely.
 *
 * Only one that was never published. A published unit may already sit in a student's completed
 * record keyed on its code, and deleting it would make that record point at nothing. Those are
 * archived instead: out of the pool, history intact.
 */
export const deleteUnit = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const unitCode = clean(req.params.unitCode, 80).toUpperCase();

    const doc = await CurriculumLearningUnit.findOne({ tenantId, unitCode }).select('status').lean() as any;
    if (!doc) return res.status(404).json({ message: 'No such unit.' });
    if (doc.status === 'PUBLISHED') {
      return res.status(409).json({
        message: 'This unit has been published and may be in a student\'s record. Archive it instead.',
      });
    }

    await CurriculumLearningUnit.deleteOne({ tenantId, unitCode });
    res.json({ deleted: true });
  } catch (e: any) {
    console.error('[learning-units] delete:', e?.message || e);
    res.status(500).json({ message: 'Could not delete this unit.' });
  }
};
