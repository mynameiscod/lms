import mongoose from 'mongoose';
import AssessmentItem from '../models/AssessmentItem';
import AssessmentBlueprint, { IAssessmentBlueprint, IBlueprintStage } from '../models/AssessmentBlueprint';
import { ISubmissionItem } from '../models/AssessmentSubmission';
import {
  AssessmentDimension,
  AssessmentItemType,
  CandidateSegment,
  isKeyboardType,
} from '../constants/assessment';

/**
 * Blueprint engine — turns a candidate's inputs into a concrete exam.
 *
 *   1. Pick the active blueprint for their segment (DB, else a sensible default).
 *   2. For each stage, pull randomized items from the bank within the stage's
 *      difficulty band, matching the requested (type, dimension, count) mix.
 *   3. Device-aware, zero-drop-off rule: on mobile, keyboard-only items
 *      (live_code / sql) are kept but flagged OPTIONAL, and an equal number of
 *      tap-friendly items are back-filled so the candidate can always finish and
 *      still earn a full set of sub-scores without typing code on a phone.
 */

// ─── In-code default blueprints (used until an admin customizes per tenant) ──
type DefaultStage = Omit<IBlueprintStage, never>;
interface DefaultBlueprint {
  title: string;
  timeLimitMinutes: number;
  dimensions: Array<{ dimension: AssessmentDimension; weight: number }>;
  stages: DefaultStage[];
}

const mix = (type: AssessmentItemType, dimension: AssessmentDimension, count: number) => ({ type, dimension, count });

export const DEFAULT_BLUEPRINTS: Record<CandidateSegment, DefaultBlueprint> = {
  first_year: {
    title: 'Foundation Readiness',
    timeLimitMinutes: 15,
    dimensions: [
      { dimension: 'aptitude', weight: 2 },
      { dimension: 'fundamentals', weight: 3 },
      { dimension: 'problem_solving', weight: 1 },
    ],
    stages: [
      { order: 1, label: 'Warm-up', difficultyBand: [1, 2], adaptive: true, mix: [
        mix('mcq', 'aptitude', 4), mix('mcq', 'fundamentals', 3), mix('predict_output', 'fundamentals', 2),
      ]},
      { order: 2, label: 'Core', difficultyBand: [2, 3], mix: [
        mix('predict_output', 'fundamentals', 2), mix('debug', 'problem_solving', 1), mix('mcq', 'fundamentals', 2),
      ]},
    ],
  },
  second_third_year: {
    title: 'Skill Check',
    timeLimitMinutes: 20,
    dimensions: [
      { dimension: 'fundamentals', weight: 2 },
      { dimension: 'dsa', weight: 2 },
      { dimension: 'core_stack', weight: 2 },
      { dimension: 'problem_solving', weight: 1 },
    ],
    stages: [
      { order: 1, label: 'Fundamentals', difficultyBand: [2, 3], adaptive: true, mix: [
        mix('mcq', 'fundamentals', 3), mix('predict_output', 'fundamentals', 3), mix('mcq', 'core_stack', 2),
      ]},
      { order: 2, label: 'Applied', difficultyBand: [3, 4], mix: [
        mix('debug', 'problem_solving', 2), mix('complete_code', 'core_stack', 2), mix('live_code', 'dsa', 1),
      ]},
    ],
  },
  final_year: {
    title: 'Placement Readiness',
    timeLimitMinutes: 25,
    dimensions: [
      { dimension: 'aptitude', weight: 1 },
      { dimension: 'fundamentals', weight: 2 },
      { dimension: 'dsa', weight: 3 },
      { dimension: 'core_stack', weight: 2 },
      { dimension: 'problem_solving', weight: 2 },
    ],
    stages: [
      { order: 1, label: 'Screening', difficultyBand: [2, 3], adaptive: true, mix: [
        mix('mcq', 'aptitude', 2), mix('predict_output', 'fundamentals', 3), mix('mcq', 'core_stack', 2),
      ]},
      { order: 2, label: 'Coding', difficultyBand: [3, 5], mix: [
        mix('debug', 'problem_solving', 2), mix('complete_code', 'core_stack', 1), mix('live_code', 'dsa', 2),
      ]},
    ],
  },
  graduate: {
    title: 'Developer Readiness',
    timeLimitMinutes: 28,
    dimensions: [
      { dimension: 'fundamentals', weight: 2 },
      { dimension: 'dsa', weight: 3 },
      { dimension: 'core_stack', weight: 2 },
      { dimension: 'problem_solving', weight: 2 },
    ],
    stages: [
      { order: 1, label: 'Screening', difficultyBand: [2, 3], adaptive: true, mix: [
        mix('predict_output', 'fundamentals', 3), mix('mcq', 'core_stack', 2), mix('debug', 'problem_solving', 1),
      ]},
      { order: 2, label: 'Coding', difficultyBand: [3, 5], mix: [
        mix('complete_code', 'core_stack', 1), mix('live_code', 'dsa', 2), mix('sql', 'core_stack', 1),
      ]},
    ],
  },
  job_switcher: {
    title: 'Product-Company Readiness',
    timeLimitMinutes: 32,
    dimensions: [
      { dimension: 'dsa', weight: 3 },
      { dimension: 'core_stack', weight: 3 },
      { dimension: 'problem_solving', weight: 2 },
      { dimension: 'fundamentals', weight: 1 },
    ],
    stages: [
      { order: 1, label: 'Core depth', difficultyBand: [3, 4], adaptive: true, mix: [
        mix('predict_output', 'core_stack', 2), mix('debug', 'problem_solving', 2), mix('mcq', 'core_stack', 2),
      ]},
      { order: 2, label: 'Engineering', difficultyBand: [4, 5], mix: [
        mix('live_code', 'dsa', 2), mix('sql', 'core_stack', 1), mix('complete_code', 'core_stack', 1),
      ]},
    ],
  },
};

/** Resolve the blueprint for a segment: tenant's active one, else an in-code default. */
export async function resolveBlueprint(
  tenantId: string,
  segment: CandidateSegment
): Promise<{ doc?: IAssessmentBlueprint; def: DefaultBlueprint; stages: IBlueprintStage[]; dimensions: { dimension: AssessmentDimension; weight: number }[]; timeLimitMinutes: number; title: string; blueprintId?: mongoose.Types.ObjectId }> {
  const doc = await AssessmentBlueprint.findOne({ tenantId, segment, active: true }).lean<IAssessmentBlueprint>();
  if (doc && doc.stages?.length) {
    return {
      doc,
      def: DEFAULT_BLUEPRINTS[segment],
      stages: doc.stages,
      dimensions: doc.dimensions,
      timeLimitMinutes: doc.timeLimitMinutes,
      title: doc.title,
      blueprintId: doc._id as unknown as mongoose.Types.ObjectId,
    };
  }
  const def = DEFAULT_BLUEPRINTS[segment];
  return { def, stages: def.stages as IBlueprintStage[], dimensions: def.dimensions, timeLimitMinutes: def.timeLimitMinutes, title: def.title };
}

/** Pull `count` random active items matching a (dimension, type) within a difficulty band. */
async function sampleItems(
  tenantId: string,
  type: AssessmentItemType,
  dimension: AssessmentDimension,
  band: [number, number],
  count: number,
  excludeIds: Set<string>
): Promise<any[]> {
  if (count <= 0) return [];
  const docs = await AssessmentItem.aggregate([
    {
      $match: {
        tenantId,
        active: true,
        type,
        dimension,
        difficulty: { $gte: band[0], $lte: band[1] },
        _id: { $nin: Array.from(excludeIds).map((id) => new mongoose.Types.ObjectId(id)) },
      },
    },
    { $sample: { size: count } },
  ]);
  return docs;
}

const toSubmissionItem = (doc: any, stage: number, optional: boolean): ISubmissionItem => ({
  itemId: doc._id,
  type: doc.type,
  dimension: doc.dimension,
  difficulty: doc.difficulty,
  stage,
  optional,
  graded: false,
  score: 0,
  maxScore: doc.points ?? 1,
});

/**
 * Compose the ordered list of exam items for a candidate.
 * Returns the items plus the resolved blueprint meta used to build the session.
 */
export async function composeExam(
  tenantId: string,
  segment: CandidateSegment,
  isMobile: boolean
): Promise<{
  items: ISubmissionItem[];
  blueprintId?: mongoose.Types.ObjectId;
  timeLimitMinutes: number;
  title: string;
  dimensions: { dimension: AssessmentDimension; weight: number }[];
  snapshot: any;
}> {
  const resolved = await resolveBlueprint(tenantId, segment);
  const items: ISubmissionItem[] = [];
  const used = new Set<string>();

  for (const stage of resolved.stages) {
    const band: [number, number] = [stage.difficultyBand[0], stage.difficultyBand[1]];
    for (const entry of stage.mix) {
      const keyboardOnPhone = isMobile && isKeyboardType(entry.type);

      // Primary pull for this mix entry.
      const picked = await sampleItems(tenantId, entry.type, entry.dimension, band, entry.count, used);
      for (const doc of picked) {
        used.add(String(doc._id));
        items.push(toSubmissionItem(doc, stage.order, keyboardOnPhone));
      }

      // Zero-drop-off back-fill: on a phone, replace keyboard-only tasks with an
      // equal number of tap-friendly items in the same dimension so the core
      // score never depends on typing code.
      if (keyboardOnPhone) {
        const backfill = await sampleItems(tenantId, 'predict_output', entry.dimension, band, entry.count, used);
        for (const doc of backfill) {
          used.add(String(doc._id));
          items.push(toSubmissionItem(doc, stage.order, false));
        }
      }
    }
  }

  return {
    items,
    blueprintId: resolved.blueprintId,
    timeLimitMinutes: resolved.timeLimitMinutes,
    title: resolved.title,
    dimensions: resolved.dimensions,
    snapshot: { title: resolved.title, stages: resolved.stages, dimensions: resolved.dimensions, isMobile },
  };
}
