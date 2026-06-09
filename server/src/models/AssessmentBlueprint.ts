import mongoose, { Schema, Document } from 'mongoose';
import {
  ASSESSMENT_DIMENSIONS,
  ASSESSMENT_ITEM_TYPES,
  CANDIDATE_SEGMENTS,
  AssessmentDimension,
  AssessmentItemType,
  CandidateSegment,
} from '../constants/assessment';

/**
 * AssessmentBlueprint — the recipe the engine uses to auto-compose an exam for
 * a given candidate segment. Defines which dimensions matter (and their weight
 * in the composite Readiness Score), and an ordered set of stages, each pulling
 * a mix of item types/dimensions within a difficulty band.
 *
 * On mobile, the engine demotes keyboard-only types (live_code/sql) to an
 * optional bonus and back-fills with tap-friendly items so no candidate is ever
 * blocked (zero-drop-off rule).
 */

export interface IDimensionWeight {
  dimension: AssessmentDimension;
  weight: number; // relative weight for the composite Readiness Score
}

export interface IStageMixEntry {
  type: AssessmentItemType;
  dimension: AssessmentDimension;
  count: number;
}

export interface IBlueprintStage {
  order: number;
  label?: string;
  difficultyBand: [number, number]; // [min, max] 1–5
  mix: IStageMixEntry[];
  /** If true, the next stage's difficulty band shifts based on running score. */
  adaptive?: boolean;
}

export interface IAssessmentBlueprint extends Document {
  tenantId: string;
  segment: CandidateSegment;
  title: string;
  dimensions: IDimensionWeight[];
  stages: IBlueprintStage[];
  timeLimitMinutes: number;
  targetRole?: string;     // roadmap "destination" defaults for this segment
  salaryBand?: string;     // e.g. "₹18–24 LPA"
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const DimensionWeightSchema = new Schema<IDimensionWeight>(
  {
    dimension: { type: String, enum: ASSESSMENT_DIMENSIONS as unknown as string[], required: true },
    weight: { type: Number, default: 1 },
  },
  { _id: false }
);

const StageMixSchema = new Schema<IStageMixEntry>(
  {
    type: { type: String, enum: ASSESSMENT_ITEM_TYPES as unknown as string[], required: true },
    dimension: { type: String, enum: ASSESSMENT_DIMENSIONS as unknown as string[], required: true },
    count: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const StageSchema = new Schema<IBlueprintStage>(
  {
    order: { type: Number, required: true },
    label: { type: String },
    difficultyBand: {
      type: [Number],
      required: true,
      validate: (v: number[]) => Array.isArray(v) && v.length === 2,
    },
    mix: { type: [StageMixSchema], default: [] },
    adaptive: { type: Boolean, default: false },
  },
  { _id: false }
);

const AssessmentBlueprintSchema = new Schema<IAssessmentBlueprint>(
  {
    tenantId: { type: String, required: true, index: true },
    segment: { type: String, enum: CANDIDATE_SEGMENTS as unknown as string[], required: true },
    title: { type: String, required: true },
    dimensions: { type: [DimensionWeightSchema], default: [] },
    stages: { type: [StageSchema], default: [] },
    timeLimitMinutes: { type: Number, default: 25 },
    targetRole: { type: String, trim: true },
    salaryBand: { type: String, trim: true },
    active: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// One active blueprint per (tenant, segment) is the common lookup.
AssessmentBlueprintSchema.index({ tenantId: 1, segment: 1, active: 1 });

export default mongoose.model<IAssessmentBlueprint>('AssessmentBlueprint', AssessmentBlueprintSchema);
