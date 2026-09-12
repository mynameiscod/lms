import { Request, Response } from 'express';
import mongoose from 'mongoose';
import CurriculumLearningUnit, {
  LEARNING_UNIT_TYPES, LEARNING_UNIT_CATEGORIES,
} from '../models/CurriculumLearningUnit';
import LearningContentLibrary from '../models/LearningContentLibrary';
import LearningCurriculum from '../models/LearningCurriculum';
import Quiz from '../models/Quiz';
import Assignment from '../models/Assignment';
import { SPINE_BANDS } from '../data/ninetyDayPolicy';
import { inTeachingOrder, roleOf, teaches, TEACHING_ORDER } from '../data/contentBundlePolicy';
import {
  evaluateReadiness, meetsPublishBar, MINIMUM_TO_PUBLISH, typeRequiresTeaching,
} from '../data/unitReadinessPolicy';
import { AUTHORABLE_SUITABLE_STATES } from '../data/adaptiveCurriculumPolicy';
import { DIRECTION_KEYS, CAREER_DIRECTIONS } from '../data/careerDirectionPolicy';
import { cyclesIntroducedBy } from '../data/unitPrerequisiteGraph';
import { requireAuthorableSkills, listAuthorableSkills } from '../services/skillRegistryService';
import * as assessments from '../services/unitAssessmentService';

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

/**
 * Directions must name a direction that EXISTS, for the same reason skills must.
 *
 * `applicableDirections` decides who a unit is offered to. A key nothing defines narrows the
 * audience to nobody, and the unit disappears from every plan while looking perfectly authored
 * on the screen — the identical failure the skill registry check closed, one field along.
 *
 * The canonical list is DIRECTION_KEYS, which is where the frozen SOFTWARE_BACKEND naming
 * lives. Nothing here restates it, so "SOFTWARE_DEVELOPMENT" is refused by construction rather
 * than by a rule somebody has to remember.
 */
function requireKnownDirections(keys: string[]): string[] {
  const unknown = keys.filter(k => !(DIRECTION_KEYS as string[]).includes(k));
  if (unknown.length) {
    throw Object.assign(
      new Error(`${unknown.join(', ')} ${unknown.length === 1 ? 'is not a' : 'are not'} `
        + `career direction${unknown.length === 1 ? '' : 's'}. `
        + `The directions are: ${(DIRECTION_KEYS as string[]).join(', ')}.`),
      { status: 400 },
    );
  }
  return keys;
}

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
  const sel = '_id type title estimatedDuration learningDepth isPublished canonical createdAt unitCode topicCode skillKeys';

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

/**
 * What a resolved bundle amounts to, in teaching order.
 *
 * Order comes from contentBundlePolicy rather than from the rows, because a content row has no
 * sequence of its own — see that file for why one was not added. The order is deterministic:
 * type, then canonical, then age, then id.
 */
const bundleOf = (rows: any[]) => {
  const ordered = inTeachingOrder(rows);
  return {
    items: ordered.map(r => ({
      _id: String(r._id),
      type: r.type,
      title: r.title,
      estimatedDuration: Number(r.estimatedDuration) || 0,
      learningDepth: r.learningDepth || null,
      role: roleOf(r.type),
      /** True when this row was attached to the unit rather than inherited from topic or skill. */
      attached: !!r.unitCode,
      /**
       * Whether it is published, and therefore whether it resolves AT ALL.
       *
       * Reported because attaching an unpublished row looks like it worked and then does nothing:
       * the resolver filters on isPublished, so the unit shows one fewer item than the author
       * just attached and nothing says why. Surfacing the state is the difference between a
       * visible next step and a silent hole in a lesson.
       */
      isPublished: r.isPublished !== false,
    })),
    hasTeaching: ordered.some(r => teaches(r.type)),
    hasPractice: ordered.some(r => roleOf(r.type) === 'PRACTISE'),
    types: [...new Set(ordered.map(r => String(r.type)))],
    resolvedMinutes: ordered.reduce((n, r) => n + (Number(r.estimatedDuration) || 0), 0),
  };
};

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
  if (!bundleOf(rows).hasTeaching) {
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

    /**
     * Coverage, computed once for the whole stage rather than per unit.
     *
     * A per-unit resolve would be three queries times three hundred units on a screen an author
     * opens constantly. The library is small enough to hold and bucket in memory, and the answer
     * is identical.
     */
    const [published, boundQuizzes, boundAssignments] = await Promise.all([
      LearningContentLibrary.find({ tenantId, isPublished: true })
        .select('type topicCode skillKeys unitCode').lean() as any,
      Quiz.find({ tenantId, unitCode: { $exists: true, $ne: '' } }).select('unitCode').lean() as any,
      /**
        * Assignment scopes by `tenant` (ObjectId), not `tenantId` (String).
        *
        * Quiz uses the String; Assignment uses the ref. Querying it with the String returns
        * nothing and reports no error, so a bound assignment would never have counted towards
        * readiness and a PROJECT unit could never have reached READY.
        */
      mongoose.Types.ObjectId.isValid(tenantId)
        ? Assignment.find({
          tenant: new mongoose.Types.ObjectId(tenantId), unitCode: { $exists: true, $ne: '' },
        }).select('unitCode').lean() as any
        : Promise.resolve([] as any),
    ]);

    /**
     * Checkpoints, counted from the engines that already own them.
     *
     * Quiz and Assignment carry the unit's code directly. Nothing here reimplements assessment
     * — a "checkpoint" content type would duplicate attempts, scoring and results, and the two
     * would drift.
     */
    /**
     * Rows attached to a unit that are NOT published.
     *
     * They resolve for nothing, so they contribute no readiness while looking, in any list of
     * attachments, exactly like content that does.
     */
    const unpublishedAttached = await LearningContentLibrary
      .find({ tenantId, isPublished: false, unitCode: { $exists: true, $ne: '' } })
      .select('unitCode').lean() as any;
    const unpublishedByUnit = new Map<string, number>();
    for (const r of unpublishedAttached as any[]) {
      const k = String(r.unitCode);
      unpublishedByUnit.set(k, (unpublishedByUnit.get(k) || 0) + 1);
    }

    const assessmentsByUnit = new Map<string, number>();
    for (const row of [...(boundQuizzes as any[]), ...(boundAssignments as any[])]) {
      const k = String(row.unitCode);
      assessmentsByUnit.set(k, (assessmentsByUnit.get(k) || 0) + 1);
    }

    /** Assignments alone, because only they can receive submitted work. See the readiness policy. */
    const assignmentsByUnit = new Map<string, number>();
    for (const row of boundAssignments as any[]) {
      const k = String(row.unitCode);
      assignmentsByUnit.set(k, (assignmentsByUnit.get(k) || 0) + 1);
    }

    const byUnitCode = new Map<string, any[]>();
    const byTopicCode = new Map<string, any[]>();
    const bySkillKey = new Map<string, any[]>();
    for (const r of published) {
      if (r.unitCode) byUnitCode.set(String(r.unitCode), [...(byUnitCode.get(String(r.unitCode)) || []), r]);
      if (r.topicCode) byTopicCode.set(String(r.topicCode), [...(byTopicCode.get(String(r.topicCode)) || []), r]);
      for (const k of r.skillKeys || []) {
        bySkillKey.set(String(k), [...(bySkillKey.get(String(k)) || []), r]);
      }
    }

    const coverageOfUnit = (unit: any) => {
      const own = byUnitCode.get(String(unit.unitCode)) || [];
      let inherited = own.length ? [] : (byTopicCode.get(String(unit.topicCode)) || []);
      if (!own.length && !inherited.length) {
        const seen = new Set<string>();
        inherited = (unit.skillKeys || []).flatMap((k: string) => bySkillKey.get(String(k)) || [])
          .filter((r: any) => { const id = String(r._id); if (seen.has(id)) return false; seen.add(id); return true; });
      }
      const pool = own.length ? own : inherited;
      const types = [...new Set(pool.map((r: any) => String(r.type)))];
      const boundAssessments = assessmentsByUnit.get(String(unit.unitCode)) || 0;
      const boundAssignments = assignmentsByUnit.get(String(unit.unitCode)) || 0;
      const evaluated = evaluateReadiness({
        unitType: unit.unitType,
        ownContent: own,
        inheritedContent: inherited,
        boundAssessments,
        boundAssignments,
      });
      const { readiness, missing, inheritedOnly } = evaluated;
      /**
       * Own and inherited are reported SEPARATELY, never summed.
       *
       * An author has to tell "written for this unit" from "shared with eleven siblings" at a
       * glance; a single count would read as coverage and hide the distinction the readiness
       * rule turns on.
       */
      return {
        readiness,
        missing,
        inheritedOnly,
        ownTeaching: (evaluated as any).own.teachingCount,
        ownPractice: (evaluated as any).own.practiceCount,
        ownAssessment: (evaluated as any).own.assessmentCount,
        /**
         * The submission axis, reported apart from assessment because they are different claims.
         *
         * A quiz measures recall; only an Assignment can receive the thing a student built. A
         * PROJECT with two quizzes and no assignment has `boundAssessments: 2` and cannot be
         * READY, and an author looking at one number would have no way to see why.
         */
        ownSubmission: boundAssignments,
        boundAssessments,
        inheritedCount: inherited.length,
        unpublishedAttached: unpublishedByUnit.get(String(unit.unitCode)) || 0,
        items: pool.length,
        types,
        hasTeaching: pool.some((r: any) => teaches(String(r.type))),
        hasPractice: pool.some((r: any) => roleOf(String(r.type)) === 'PRACTISE'),
        /** Would publishing be allowed right now. Reported so the button can say why not. */
        publishable: meetsPublishBar(readiness),
        /**
         * PUBLISHED **and** READY — the only thing a student's plan may be built from.
         *
         * Shown beside the status rather than inferred from it, because the two are constantly
         * mistaken for each other: publishing is an author's decision and readiness is a fact
         * about the material, and a unit can very easily be one without the other.
         */
        composerReady: unit.status === 'PUBLISHED' && readiness === 'READY',
      };
    };

    const rows = topics.map(t => {
      const mine = (byTopic.get(String(t.topicCode)) || [])
        .sort((a, b) => (a.displayOrder - b.displayOrder) || String(a.unitCode).localeCompare(String(b.unitCode)))
        .map(unit => ({ ...unit, coverage: coverageOfUnit(unit) }));
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
        /**
         * Readiness across the stage, so an author sees the real backlog rather than a
         * published/draft count. PARTIAL is the important number: it means the unit inherits
         * its topic's material and has nothing of its own.
         */
        readiness: rows.flatMap(r => r.units).reduce((acc: Record<string, number>, u: any) => {
          const k = u.coverage?.readiness || 'EMPTY';
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {}),
        totalUnits: (units as any[]).length,
        published: (units as any[]).filter(u => u.status === 'PUBLISHED').length,
        drafts: (units as any[]).filter(u => u.status === 'DRAFT').length,
        /**
         * How many units a student's plan could actually be built from today.
         *
         * Counted separately from `published` because the gap between the two IS the backlog:
         * a stage with 300 published units and 4 composer-ready ones is not nearly finished.
         */
        composerReady: rows.flatMap(r => r.units).filter((u: any) => u.coverage?.composerReady).length,
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

    res.json({ unit, bundle: { via, ...bundleOf(rows) } });
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
    /**
     * Skills come from the registry service, which is the SAME source that validates a save.
     *
     * The selector used to offer `active: true` while the validator accepted anything in the
     * collection, GROUP nodes and retired skills included. A screen that offers one set and a
     * backend that accepts another is a screen an author cannot trust: either it hides a legal
     * choice or it accepts one it never offered.
     */
    const [curriculum, skills] = await Promise.all([
      LearningCurriculum.findOne({ tenantId, adaptiveStage: stageKey })
        .select('topics modules').lean() as any,
      listAuthorableSkills(),
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
      skills: skills.map(s => ({ key: s.key, name: s.name })),
      unitTypes: LEARNING_UNIT_TYPES,
      categories: LEARNING_UNIT_CATEGORIES,
      bands: SPINE_BANDS.map(b => ({ key: b.key, label: b.label, days: b.days })),
      /**
       * The vocabularies the client used to hold copies of.
       *
       * Serving them makes the server the single authority: a state or a direction added,
       * renamed or withdrawn reaches the screen on the next load instead of on the next time
       * somebody remembers there is a second list to edit.
       */
      suitableStates: AUTHORABLE_SUITABLE_STATES,
      directions: CAREER_DIRECTIONS
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(d => ({ key: d.key, name: d.name })),
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

    /**
     * Authored suitability, when the type-derived default is not right for this unit.
     *
     * Absent and empty are DIFFERENT and both are meaningful: absent means "derive from unitType",
     * which is what 329 of 337 units do, while an explicit list is a claim that this particular
     * unit serves states its type does not. Sending an empty array clears an override and returns
     * the unit to derivation, which is why it is unset rather than stored as [].
     *
     * Until now this could not be edited at all: the eight P7A.2 overrides were invisible in
     * Admin and only a seed could set them, so an author could see a unit behaving unlike its
     * type with nothing on screen explaining why.
     */
    /**
     * NOT SENT, SENT EMPTY, AND SENT WITH VALUES ARE THREE DIFFERENT INSTRUCTIONS.
     *
     * Absent means "I am not talking about suitability" and the stored override must survive
     * untouched. Empty means "remove the override". Collapsing the first into the second is how
     * renaming a unit would silently revert a suitability decision somebody made deliberately —
     * the same mistake the Year-1 seed refuses to make with author-controlled fields, and it
     * would undo through the front door exactly what the seed protects. Eight real units carry
     * an override today and none of them may be cleared by an edit that never mentioned it.
     */
    const statesMentioned = b.suitableStates !== undefined;
    const suitableStates = cleanList(b.suitableStates, 40, true);
    const badState = suitableStates.find(x => !(AUTHORABLE_SUITABLE_STATES as string[]).includes(x));
    if (badState) {
      /**
       * LOCKED and NOT_RELEVANT reach this message too, and deliberately so.
       *
       * Both are real members of the wider AssignmentState taxonomy, so "not a state" would be
       * untrue and would send an author looking for a typo they did not make. They are not
       * AUTHORABLE — see AUTHORABLE_SUITABLE_STATES for why each is excluded — and the message
       * has to say that rather than deny they exist.
       */
      return res.status(400).json({
        message: `${badState} cannot be authored as a suitable state. `
          + `Choose from: ${AUTHORABLE_SUITABLE_STATES.join(', ')}.`,
      });
    }

    const skillKeys = await requireAuthorableSkills(cleanList(b.skillKeys, 80, true), 'skill');
    const prerequisiteSkillKeys = await requireAuthorableSkills(
      cleanList(b.prerequisiteSkillKeys, 80, true), 'prerequisite skill',
    );
    const applicableDirections = requireKnownDirections(cleanList(b.applicableDirections, 60, true));

    /**
     * Prerequisites: real units, not this one, and no loop.
     *
     * `cleanList` has already removed duplicates — a code repeated twice is one dependency
     * stated twice, never an error worth stopping a save for.
     */
    const prerequisiteUnitCodes = cleanList(b.prerequisiteUnitCodes, 80, true)
      .filter(c => c !== unitCode);

    if (prerequisiteUnitCodes.length) {
      const existing = await CurriculumLearningUnit
        .find({ tenantId, unitCode: { $in: prerequisiteUnitCodes } }).select('unitCode').lean() as any[];
      const have = new Set(existing.map(u => String(u.unitCode).toUpperCase()));
      const missing = prerequisiteUnitCodes.filter(c => !have.has(c));
      if (missing.length) {
        return res.status(400).json({
          message: `${missing.join(', ')} ${missing.length === 1 ? 'is not a unit' : 'are not units'} `
            + 'in this curriculum. A prerequisite that names nothing can never be satisfied, so the '
            + 'unit would never be schedulable.',
        });
      }
    }

    /**
     * A cycle is checked against the WHOLE curriculum with this edit applied on top.
     *
     * The loop an edit creates usually runs through units nobody touched, so only the full graph
     * can see it — and only cycles running through THIS unit are reported, because a pre-existing
     * loop elsewhere is not this author's to fix and naming it would make the unit uneditable.
     */
    const everyUnit = await CurriculumLearningUnit
      .find({ tenantId }).select('unitCode prerequisiteUnitCodes').lean() as any[];
    const cycles = cyclesIntroducedBy(everyUnit, { unitCode, prerequisiteUnitCodes });
    if (cycles.length) {
      return res.status(400).json({
        message: `That prerequisite closes a loop: ${cycles[0]}. Nothing in a loop is ever `
          + 'schedulable, so every unit in it would silently vanish from every plan.',
      });
    }

    const fields = {
      stageKey: clean(b.stageKey, 60) || 'foundation',
      moduleCode: clean(b.moduleCode, 80).toUpperCase(),
      topicCode,
      title,
      description: clean(b.description, 2000),
      displayOrder: Number.isFinite(Number(b.displayOrder)) ? Number(b.displayOrder) : 100,
      skillKeys,
      prerequisiteSkillKeys,
      prerequisiteUnitCodes,
      learningOutcomes: cleanList(b.learningOutcomes, 300),
      category: category as any,
      applicableDirections,
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

    // Self-reference, duplicates, unknown codes and cycles were all settled above, before any
    // of this was assembled — a save is refused while the problem is still hypothetical.

    const existing = await CurriculumLearningUnit.findOne({ tenantId, unitCode }).select('status').lean() as any;

    const doc = await CurriculumLearningUnit.findOneAndUpdate(
      { tenantId, unitCode },
      {
        $set: {
          ...fields,
          updatedBy: actorOf(req),
          ...(statesMentioned && suitableStates.length ? { suitableStates } : {}),
        },
        // Cleared only when the caller actually said so. An empty list is "no override", which
        // is absence rather than a stored empty array.
        ...(statesMentioned && !suitableStates.length ? { $unset: { suitableStates: '' } } : {}),
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
    // A named unknown skill is the author's to fix, not a server fault.
    if (e?.status === 400) return res.status(400).json({ message: e.message });
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

    /**
     * The content check applies only to types whose rule actually asks for teaching.
     *
     * It used to apply to all seven, which contradicted the readiness table for three of them.
     * A CHECKPOINT was refused publication for having no lesson, though its rule is `assessment`
     * at every rung and a checkpoint IS the measurement — so no binding an author could make
     * would ever have let one go live. See typeRequiresTeaching for the full argument; the bar
     * below still applies to every type regardless.
     */
    if (typeRequiresTeaching(doc.unitType)) {
      const fault = await teachingFault(tenantId, {
        unitCode, topicCode: doc.topicCode, skillKeys: doc.skillKeys || [],
      });
      if (fault) return res.status(400).json({ published: false, message: fault });
    }

    /**
     * THE PUBLISH BAR, WHICH WAS WRITTEN AND NEVER ENFORCED.
     *
     * `MINIMUM_TO_PUBLISH` and `meetsPublishBar` have existed since the readiness policy landed,
     * with tests, and nothing in production ever called them. Publishing was gated only on
     * `teachingFault` — does ANY content resolve, and does some of it teach — which inherited
     * content satisfies. So a unit with nothing of its own could be published on the strength of
     * material shared with eleven siblings, showing PARTIAL on the very screen that published it.
     *
     * That never endangered a student: composer eligibility is PUBLISHED **and** READY, and
     * PARTIAL is not READY. What it endangered was the author's ability to trust the screen —
     * publishing looked like progress and moved nothing.
     *
     * Inheritance caps readiness at PARTIAL by frozen policy, so this says, exactly: a unit must
     * have teaching material OF ITS OWN before it can be published.
     */
    const { rows: resolved } = await resolveBundle(tenantId, {
      unitCode, topicCode: doc.topicCode, skillKeys: doc.skillKeys || [],
    });
    const own = resolved.filter((r: any) => String(r.unitCode || '') === unitCode);
    const inherited = resolved.filter((r: any) => String(r.unitCode || '') !== unitCode);

    const [boundQuizzes, boundAssignments] = await Promise.all([
      Quiz.countDocuments({ tenantId, unitCode }),
      mongoose.Types.ObjectId.isValid(tenantId)
        ? Assignment.countDocuments({ tenant: new mongoose.Types.ObjectId(tenantId), unitCode })
        : Promise.resolve(0),
    ]);

    const { readiness, missing } = evaluateReadiness({
      unitType: doc.unitType,
      ownContent: own,
      inheritedContent: inherited,
      boundAssessments: boundQuizzes + boundAssignments,
      boundAssignments,
    });

    if (!meetsPublishBar(readiness)) {
      return res.status(400).json({
        published: false,
        readiness,
        message: `${unitCode} is ${readiness} and publishing needs at least ${MINIMUM_TO_PUBLISH}. `
          + (missing?.length ? `Still missing: ${missing.join(', ')}.` : '')
          + (own.length ? '' : ' Everything it resolves is inherited from its topic or skills.'),
      });
    }

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
      doc.estimatedMinutes = bundleOf(rows).resolvedMinutes;
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

/* ------------------------------------------------------------------ *
 * Content binding
 * ------------------------------------------------------------------ */

/**
 * GET /curriculum-units/:unitCode/content """ + D + u""" what is attached, and what could be.
 *
 * Candidates are drawn from the same three hooks the resolver uses, so an author is offered
 * exactly the rows that already serve this unit's topic or skills. Offering the whole library
 * would make attaching a search problem; offering only exact matches would hide the row they
 * actually want to promote.
 */
export const unitContent = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const unitCode = clean(req.params.unitCode, 80).toUpperCase();
    const unit = await CurriculumLearningUnit.findOne({ tenantId, unitCode })
      .select('topicCode skillKeys title').lean() as any;
    if (!unit) return res.status(404).json({ message: 'No such unit.' });

    const sel = '_id type title estimatedDuration learningDepth isPublished canonical createdAt unitCode topicCode skillKeys';

    const [attached, candidates] = await Promise.all([
      LearningContentLibrary.find({ tenantId, unitCode }).select(sel).lean() as any,
      LearningContentLibrary.find({
        tenantId,
        // Not already claimed by another unit. A row attached elsewhere is that unit's, and
        // offering it here would let one click silently move it out of another lesson.
        $or: [{ unitCode: { $exists: false } }, { unitCode: null }, { unitCode: '' }],
        $and: [{
          $or: [
            ...(unit.topicCode ? [{ topicCode: unit.topicCode }] : []),
            ...((unit.skillKeys || []).length ? [{ skillKeys: { $in: unit.skillKeys } }] : []),
          ],
        }],
      }).select(sel).lean() as any,
    ]);

    const resolved = await resolveBundle(tenantId, {
      unitCode, topicCode: unit.topicCode, skillKeys: unit.skillKeys || [],
    });

    const attachedItems = bundleOf(attached).items;

    res.json({
      unitCode,
      title: unit.title,
      attached: attachedItems,
      candidates: bundleOf(candidates).items,
      /**
       * Attached, but not teaching anything, because it was never published.
       *
       * Called out separately rather than left for somebody to spot by comparing two lists.
       */
      attachedButUnpublished: attachedItems.filter(i => !i.isPublished).map(i => i.title),
      /** What the unit teaches from RIGHT NOW, attached or inherited. */
      resolved: { via: resolved.via, ...bundleOf(resolved.rows) },
      teachingOrder: TEACHING_ORDER,
    });
  } catch (e: any) {
    console.error('[learning-units] content:', e?.message || e);
    res.status(500).json({ message: 'Could not read this unit\'s content.' });
  }
};

/**
 * POST /curriculum-units/:unitCode/content/:contentId """ + D + u""" attach one library row.
 *
 * Attaching sets `unitCode` on the ROW, which is the same hook the resolver reads first. There is
 * no join table: a row belongs to at most one unit, and the alternative """ + D + u""" many-to-many """ + D + u""" would
 * mean a row could be first in one unit's order and last in another's, with nothing to say which.
 *
 * REFUSES A ROW ANOTHER UNIT ALREADY OWNS. Silently reassigning it would remove content from a
 * lesson nobody was looking at, and the author who lost it would have no way to find out why.
 */
export const attachContent = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const unitCode = clean(req.params.unitCode, 80).toUpperCase();
    const contentId = clean(req.params.contentId, 60);

    const unit = await CurriculumLearningUnit.findOne({ tenantId, unitCode }).select('_id').lean() as any;
    if (!unit) return res.status(404).json({ message: 'No such unit.' });

    const row = await LearningContentLibrary.findOne({ tenantId, _id: contentId })
      .select('unitCode title').lean() as any;
    if (!row) return res.status(404).json({ message: 'No such content.' });

    if (row.unitCode && row.unitCode !== unitCode) {
      return res.status(409).json({
        message: `"${row.title}" is already attached to ${row.unitCode}. Detach it there first.`,
      });
    }

    await LearningContentLibrary.updateOne({ tenantId, _id: contentId }, { $set: { unitCode } });
    res.json({ attached: true, unitCode, contentId });
  } catch (e: any) {
    console.error('[learning-units] attach:', e?.message || e);
    res.status(500).json({ message: 'Could not attach this content.' });
  }
};

/**
 * DELETE /curriculum-units/:unitCode/content/:contentId """ + D + u""" detach one library row.
 *
 * UNSETS the hook rather than deleting anything. The row goes back to serving its topic and its
 * skills, which is where it came from """ + D + u""" detaching is a demotion, not a removal, and an author who
 * expected the second would notice immediately while one who expected the first would not.
 */
export const detachContent = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const unitCode = clean(req.params.unitCode, 80).toUpperCase();
    const contentId = clean(req.params.contentId, 60);

    const r = await LearningContentLibrary.updateOne(
      { tenantId, _id: contentId, unitCode },
      { $unset: { unitCode: '' } },
    );
    if (!r.matchedCount) {
      return res.status(404).json({ message: 'That content is not attached to this unit.' });
    }

    res.json({ detached: true, unitCode, contentId });
  } catch (e: any) {
    console.error('[learning-units] detach:', e?.message || e);
    res.status(500).json({ message: 'Could not detach this content.' });
  }
};

/* ------------------------------------------------------------------ *
 * Assessment binding — the quiz or assignment a unit measures with
 * ------------------------------------------------------------------ */

/**
 * These four routes are thin on purpose; the rules live in unitAssessmentService.
 *
 * They exist because a CHECKPOINT unit could not be authored at all before them. Its readiness
 * rule is `assessment` for every rung — teachable, assessable and ready — so a checkpoint with
 * no bound quiz could not even be PUBLISHED, and nothing on the authoring screen said so. The
 * rule was never the problem and is not weakened here; the missing half was any way to satisfy
 * it without writing to Mongo by hand.
 */
const assessmentError = (res: Response, e: any, fallback: string) => {
  if (e?.status) return res.status(e.status).json({ message: e.message });
  console.error('[learning-units] assessments:', e?.message || e);
  return res.status(500).json({ message: fallback });
};

/** GET /curriculum-units/:unitCode/assessments */
export const unitAssessments = async (req: Request, res: Response) => {
  try {
    res.json(await assessments.listUnitAssessments(
      tenantOf(req), clean(req.params.unitCode, 80).toUpperCase(),
    ));
  } catch (e: any) {
    assessmentError(res, e, 'Could not read this unit\'s assessments.');
  }
};

/** POST /curriculum-units/:unitCode/quiz/:quizId — bind an existing quiz. */
export const bindUnitQuiz = async (req: Request, res: Response) => {
  try {
    res.json(await assessments.bindQuiz(
      tenantOf(req), clean(req.params.unitCode, 80).toUpperCase(), clean(req.params.quizId, 60),
    ));
  } catch (e: any) {
    assessmentError(res, e, 'Could not bind this quiz.');
  }
};

/** DELETE /curriculum-units/:unitCode/quiz/:quizId */
export const unbindUnitQuiz = async (req: Request, res: Response) => {
  try {
    res.json(await assessments.unbindQuiz(
      tenantOf(req), clean(req.params.unitCode, 80).toUpperCase(), clean(req.params.quizId, 60),
    ));
  } catch (e: any) {
    assessmentError(res, e, 'Could not unbind this quiz.');
  }
};

/** POST /curriculum-units/:unitCode/assignment/:assignmentId */
export const bindUnitAssignment = async (req: Request, res: Response) => {
  try {
    res.json(await assessments.bindAssignment(
      tenantOf(req), clean(req.params.unitCode, 80).toUpperCase(),
      clean(req.params.assignmentId, 60),
    ));
  } catch (e: any) {
    assessmentError(res, e, 'Could not bind this assignment.');
  }
};

/** DELETE /curriculum-units/:unitCode/assignment/:assignmentId */
export const unbindUnitAssignment = async (req: Request, res: Response) => {
  try {
    res.json(await assessments.unbindAssignment(
      tenantOf(req), clean(req.params.unitCode, 80).toUpperCase(),
      clean(req.params.assignmentId, 60),
    ));
  } catch (e: any) {
    assessmentError(res, e, 'Could not unbind this assignment.');
  }
};

/**
 * POST /curriculum-units/:unitCode/assessments — create a shell and bind it in one step.
 *
 * `kind` says which engine. Neither shell is usable by a student until an author finishes it in
 * the screens that own questions and briefs — creating it here only answers "which unit needs
 * one", which is the question the quiz and assignment builders cannot see.
 */
export const createUnitAssessment = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const unitCode = clean(req.params.unitCode, 80).toUpperCase();
    const kind = clean(req.body?.kind, 20).toUpperCase();
    const title = clean(req.body?.title, 200);

    if (kind === 'QUIZ') {
      return res.json(await assessments.createQuizForUnit(tenantId, unitCode, actorOf(req), title));
    }
    if (kind === 'ASSIGNMENT') {
      const createdBy = String((req as any).user?.id || (req as any).user?._id || '');
      return res.json(await assessments.createAssignmentForUnit(tenantId, unitCode, createdBy, title));
    }
    return res.status(400).json({ message: 'kind must be QUIZ or ASSIGNMENT.' });
  } catch (e: any) {
    assessmentError(res, e, 'Could not create this assessment.');
  }
};

/**
 * DELETE /curriculum-units/:unitCode """ + D + u""" remove a unit entirely.
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

    /**
     * Content attached to it is released, never deleted.
     *
     * Leaving `unitCode` pointing at a unit that no longer exists would make those rows resolve
     * for nothing: they would stop serving the unit that is gone AND stop being offered as
     * candidates elsewhere, because a claimed row is filtered out of every other unit's list.
     * Invisible content is worse than orphaned content.
     */
    const released = await LearningContentLibrary.updateMany(
      { tenantId, unitCode }, { $unset: { unitCode: '' } },
    );

    /**
     * Bound quizzes and assignments are released too, for the same reason and one stronger.
     *
     * A quiz may hold student attempts. Deleting it would destroy results; leaving it pointing
     * at a unit that no longer exists would strand it, measuring nothing and never offered to
     * any other unit because a bound assessment is filtered out of every candidate list.
     */
    const assessmentsReleased = await assessments.releaseUnitAssessments(tenantId, unitCode);

    await CurriculumLearningUnit.deleteOne({ tenantId, unitCode });
    res.json({
      deleted: true,
      contentReleased: released.modifiedCount ?? 0,
      assessmentsReleased,
    });
  } catch (e: any) {
    console.error('[learning-units] delete:', e?.message || e);
    res.status(500).json({ message: 'Could not delete this unit.' });
  }
};
