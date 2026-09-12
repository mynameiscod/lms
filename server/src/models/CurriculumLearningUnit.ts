import mongoose, { Schema, Document } from 'mongoose';
import { BandKey } from '../data/ninetyDayPolicy';

/**
 * The smallest schedulable unit of CareerPilot curriculum. Layer 4 of five.
 *
 *   Stage → Module → Topic → **Learning Unit** → Content Bundle → DayPlan
 *
 * ── WHY THIS LAYER HAD TO EXIST ───────────────────────────────────────────────────────────
 *
 * The curriculum's smallest node was the TOPIC, so thirty-nine topics could only ever produce
 * thirty-nine sessions — and a student who bought a ninety-day product opened a twenty-eight-day
 * plan. The topic was never the problem: "Object-Oriented Programming" is a perfectly good topic
 * and a hopeless day. What was missing was the level beneath it, where Classes, Constructors,
 * Inheritance and Polymorphism are each a day's work.
 *
 * A TOPIC IS NOT A DAY, AND THIS MODEL IS WHAT MAKES THAT TRUE. A broad topic spans many units
 * and therefore many days; a small one is a single unit. Nothing here assumes a ratio.
 *
 * ── IT HAS NO DAY NUMBER, AND THAT IS THE POINT ───────────────────────────────────────────
 *
 * There is no `dayNumber`, no `scheduledDay`, no `scheduledDate`, no `studentId`. A Learning Unit
 * belongs to the MASTER curriculum: it is what is taught, in what order, to whom it applies, and
 * nothing about when any particular person meets it. "Inheritance is day 34" is a fact about one
 * student on one plan, and it lives in their DayPlan.
 *
 * Encoding a day here would make the mega curriculum a single fixed syllabus with personalisation
 * bolted on top — which is precisely the system this replaces.
 *
 * ── WHAT IT DELIBERATELY IS NOT COUPLED TO ────────────────────────────────────────────────
 *
 * No Course, Subject, Chapter or SubTopic. That hierarchy anchors everything to a `courseId`, and
 * CareerSkill already rejected it in writing for the reason that applies here too: a curriculum
 * unit has to outlive any one course. It also uses an ObjectId tenantId where every CareerPilot
 * model uses a String, and a mismatch there is the bug that makes a query silently return nothing.
 *
 * ── IT SUPERSEDES CurriculumDayUnit ───────────────────────────────────────────────────────
 *
 * That model held band, order, skill, audience and status — most of a Learning Unit already. It
 * was absorbed rather than kept alongside, while it still held zero documents. CareerPilot has
 * twice grown a second system beside a working one (two planners, two content stores) and paid
 * for it both times; a third was not worth the saving of an afternoon.
 */

/** What kind of work a unit is. Drives which content a bundle should resolve, not how hard it is. */
export type LearningUnitType =
  | 'CONCEPT'        // teach an idea — the default
  | 'WORKED_EXAMPLE' // watch it done before doing it
  | 'PRACTICE'       // do it, repeatedly
  | 'DEBUG'          // read broken work and fix it
  | 'PROJECT'        // build something end to end, usually spanning days
  | 'CHECKPOINT'     // re-measure
  | 'REVIEW';        // revisit, for somebody who has met it before

export const LEARNING_UNIT_TYPES: LearningUnitType[] = [
  'CONCEPT', 'WORKED_EXAMPLE', 'PRACTICE', 'DEBUG', 'PROJECT', 'CHECKPOINT', 'REVIEW',
];

/**
 * Who a unit is for, in the vocabulary the foundation skill map already uses.
 *
 * Reused rather than reinvented so a unit and the topic above it can be filtered by one rule.
 * UNIVERSAL survives every relevance filter; DIRECTION applies only where it serves.
 */
export type LearningUnitCategory =
  | 'UNIVERSAL' | 'DIRECTION' | 'ACADEMIC' | 'EXPLORATION' | 'ENRICHMENT';

export const LEARNING_UNIT_CATEGORIES: LearningUnitCategory[] = [
  'UNIVERSAL', 'DIRECTION', 'ACADEMIC', 'EXPLORATION', 'ENRICHMENT',
];

export type LearningUnitStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/**
 * The axes beyond direction that decide whether a unit suits a student.
 *
 * `applicableDirections` is deliberately NOT in here: it sits at the top level, matching
 * ICurriculumTopic and LearningContentLibrary, so the three layers can be filtered by one
 * expression. These are the axes nothing else models, kept together because the spine reads
 * them as a set.
 */
export interface ILearningUnitAudience {
  languages: string[];
  years: string[];
  branches: string[];
}

export interface ICurriculumLearningUnit extends Document {
  tenantId: string;

  /**
   * The stage this unit belongs to, matching LearningCurriculum.adaptiveStage.
   *
   * A stage key rather than a curriculumId on purpose. The mega curriculum is the tenant's body
   * of teaching for a stage, not the contents of one document — binding units to a single
   * curriculum row would mean cloning a curriculum orphaned every unit beneath it.
   */
  stageKey: string;

  /** Where it sits in the curriculum. Codes, not ids, so a title edit never breaks a reference. */
  moduleCode: string;
  topicCode: string;

  /**
   * Stable identity, independent of position.
   *
   * A student's completed work will be keyed on this. Completion used to be keyed on position —
   * `curriculum:<week>:<day>` — so rebuilding a plan moved the keys and "I finished unit 12"
   * silently became a different unit. The code never moves, and the API refuses to move it.
   */
  unitCode: string;

  title: string;
  description: string;

  /** Order within the TOPIC. 01 Classes, 02 Fields, 03 Methods — the authored teaching sequence. */
  displayOrder: number;

  /** Canonical CareerSkill keys this unit teaches. The bridge to everything measured. */
  skillKeys: string[];

  /**
   * Skills that must be reached before this unit is useful.
   *
   * Usually derivable from CareerSkill.prerequisiteKeys; stated here only for a pedagogical
   * order the skill graph does not imply.
   */
  prerequisiteSkillKeys: string[];

  /**
   * Units within this curriculum that must come first.
   *
   * Distinct from skill prerequisites: Polymorphism needs Inheritance TAUGHT, not merely the
   * skill measured, and no skill graph expresses "the previous unit of this topic".
   */
  prerequisiteUnitCodes: string[];

  /** What a student can do afterwards, in their words. */
  learningOutcomes: string[];

  category: LearningUnitCategory;

  /** Directions this unit serves. Empty means everyone — see careerDirectionPolicy. */
  applicableDirections: string[];

  audience: ILearningUnitAudience;

  /** Depth to use when no measurement exists to choose one. */
  defaultDepth: 'FOUNDATION' | 'GUIDED' | 'STANDARD' | 'REVISION' | 'CHALLENGE';

  /**
   * How long the unit's work runs, in minutes.
   *
   * Authored here rather than derived, because a unit can exist before any content does and a
   * curriculum has to be plannable while it is being written. Once content is bound, the
   * resolver's total is the better number and the API prefers it — see P2.
   */
  estimatedMinutes: number;

  unitType: LearningUnitType;

  /**
   * Part of the universal foundation, and therefore never removed by relevance filtering.
   *
   * Git does not stop mattering because a student chose AI.
   */
  mandatory: boolean;

  /**
   * The skill states this unit is worth giving somebody.
   *
   * OPTIONAL, AND ABSENT ON EVERY EXISTING UNIT. When unset, suitability is derived from
   * `unitType` — see unitSuitabilityPolicy, which is where the table lives. An author sets it
   * only where the derivation is too blunt.
   *
   * The audit that produced it: across all 310 authored units, `unitType` is the ONLY field that
   * varies between siblings of a topic. Depth, category, mandatory, skills and directions are all
   * inherited from the topic and identical. So the type tells a debugging exercise from a
   * project, and nothing tells one CONCEPT unit from another — yet "Why Repetition Needs a
   * Structure" and "Loops Inside Loops" serve different students.
   *
   * A required field would have meant writing a guess into 310 rows, and a guess written down is
   * indistinguishable from a decision.
   */
  suitableStates?: string[];

  /**
   * Which region of the ninety-day shape this unit belongs to.
   *
   * NOT A DAY NUMBER. A band spans a range of days for every student alike; which unit lands on
   * day 3 rather than day 7 inside that band is the composer's decision, made per student. The
   * band is a curriculum property — "Loops is foundational programming" — and it is what lets
   * the selector guarantee ninety days by construction rather than by arithmetic.
   *
   * Optional: a unit authored before anybody has decided its region is still a valid unit.
   */
  band?: BandKey;

  status: LearningUnitStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const AudienceSchema = new Schema<ILearningUnitAudience>({
  languages: [{ type: String, trim: true }],
  years:     [{ type: String, trim: true }],
  branches:  [{ type: String, trim: true }],
}, { _id: false });

const CurriculumLearningUnitSchema = new Schema<ICurriculumLearningUnit>(
  {
    // String, matching LearningContentLibrary, ConceptLearningUnit and every other CareerPilot
    // model. The legacy tree uses an ObjectId; mixing the two is how a query returns nothing
    // and reports no error.
    tenantId: { type: String, required: true, index: true },

    stageKey:   { type: String, required: true, trim: true, index: true },
    moduleCode: { type: String, required: true, uppercase: true, trim: true },
    topicCode:  { type: String, required: true, uppercase: true, trim: true },
    unitCode:   { type: String, required: true, uppercase: true, trim: true },

    title:        { type: String, required: true, trim: true },
    description:  { type: String, default: '', trim: true },
    displayOrder: { type: Number, default: 100 },

    skillKeys:             { type: [String], default: [] },
    prerequisiteSkillKeys: { type: [String], default: [] },
    prerequisiteUnitCodes: { type: [String], default: [] },
    learningOutcomes:      { type: [String], default: [] },

    category:             { type: String, enum: LEARNING_UNIT_CATEGORIES, default: 'UNIVERSAL' },
    applicableDirections: { type: [String], default: [] },
    audience: {
      type: AudienceSchema,
      default: () => ({ languages: [], years: [], branches: [] }),
    },

    defaultDepth: {
      type: String,
      enum: ['FOUNDATION', 'GUIDED', 'STANDARD', 'REVISION', 'CHALLENGE'],
      default: 'STANDARD',
    },
    estimatedMinutes: { type: Number, default: 0, min: 0 },
    unitType:         { type: String, enum: LEARNING_UNIT_TYPES, default: 'CONCEPT' },
    mandatory:        { type: Boolean, default: true },

    // Absent by default; see the interface. Derived from unitType when unset.
    suitableStates: { type: [String], default: undefined },

    band: { type: String },

    status:    { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT', index: true },
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true },
);

/**
 * One unit per code per TENANT, not per stage.
 *
 * Scoping uniqueness to the stage would let FOUNDATION and INTERMEDIATE both hold a
 * `U_OOP_INHERITANCE`, and a DayPlan or a completion record storing only the code could then no
 * longer say which one a student finished. The code is the identity a student's history hangs on,
 * so it has to be unambiguous across everything a tenant teaches.
 */
CurriculumLearningUnitSchema.index({ tenantId: 1, unitCode: 1 }, { unique: true });

/** The authoring read: one topic's units, in teaching order. */
CurriculumLearningUnitSchema.index({ tenantId: 1, stageKey: 1, topicCode: 1, displayOrder: 1 });

/** The composer's read: every published candidate for a band, in order. */
CurriculumLearningUnitSchema.index({ tenantId: 1, band: 1, status: 1, displayOrder: 1 });

/** "Which units teach this skill" — asked by content binding and by coverage reporting. */
CurriculumLearningUnitSchema.index({ tenantId: 1, skillKeys: 1, status: 1 });

export default mongoose.model<ICurriculumLearningUnit>(
  'CurriculumLearningUnit',
  CurriculumLearningUnitSchema,
);
