import mongoose, { Schema, Document } from 'mongoose';
import {
  ASSESSMENT_DIMENSIONS,
  ASSESSMENT_ITEM_TYPES,
  AssessmentDimension,
  AssessmentItemType,
} from '../constants/assessment';

/**
 * AssessmentItem — one entry in the skill-assessment question bank.
 *
 * A single generic schema covers all six item types; only the relevant
 * type-specific fields are populated. The blueprint engine pulls items from
 * this bank by (dimension, type, difficulty) to compose a candidate's exam.
 */

export interface IAssessmentOption {
  id: string;
  text: string;
}

export interface ITestCase {
  input: string;          // stdin or argument payload
  expectedOutput: string; // expected stdout (trimmed comparison)
  hidden: boolean;        // hidden cases are not shown to the candidate
  weight?: number;        // relative weight when scoring (default 1)
}

export interface IAssessmentItem extends Document {
  tenantId: string;
  type: AssessmentItemType;
  dimension: AssessmentDimension;
  difficulty: number; // 1–5
  language?: string;  // 'java' | 'javascript' | 'python' | 'sql' | ...
  prompt: string;     // the question / task statement (may contain markdown)
  codeSnippet?: string; // shown for predict_output / debug / complete_code

  // mcq
  options?: IAssessmentOption[];
  correctOptionIds?: string[]; // supports single or multi-select

  // predict_output
  expectedOutput?: string;

  // debug — candidate identifies the buggy line and/or the fix
  buggyLineNumber?: number;
  bugExplanation?: string;

  // complete_code — one or more blanks, each with accepted answers
  blanks?: Array<{ id: string; acceptedAnswers: string[]; caseSensitive?: boolean }>;

  // live_code / sql
  starterCode?: string;
  functionSignature?: string;
  testCases?: ITestCase[];

  // grading / meta
  points: number;            // max points this item contributes
  timeLimitSeconds?: number; // soft per-item suggestion
  tags: string[];
  /**
   * The curriculum facts this item actually tests.
   *
   * A generated bank reaches its row count by recombining a small set of claims: forty
   * thousand rows over three hundred and forty facts, so one fact underlies a hundred items.
   * Selecting by item id alone therefore cannot tell that two questions are the same question —
   * a paper can spend four slots on one fact and call it a skill measured, and a re-assessment
   * can re-ask what the student already saw and read the remembered answer as progress.
   *
   * Empty for hand-authored items, where each question is its own fact and the id is enough.
   */
  factKeys?: string[];
  /**
   * Why the keyed answer is right, shown after grading.
   *
   * The admin bank screen already reads `explanation` off both content families, so the field
   * was expected here before it existed and every exam-bank row rendered a blank one. Optional,
   * because the generated bank never had one.
   */
  explanation?: string;
  /**
   * Set only on rows imported from the frozen Foundation Golden Bank.
   *
   * WHY IT SITS ON THE CONTENT AND NOT ON THE MAPPING. Every field here is a property of the
   * question — which fact it rests on, which family it belongs to, where it came from. The
   * mapping row answers a different question, which skill this measures, and it already carries
   * that. Splitting content properties across the mapping would mean two rows to read before
   * anything can be said about one question.
   *
   * `questionId` is the bank's own identifier and the key idempotency rests on: the importer
   * derives each row's `_id` from it, so a rerun updates rather than inserts, and the unique
   * index below refuses a second row claiming the same Golden question even if something else
   * writes one.
   *
   * `factId` is ALSO copied into `factKeys`, which is not duplication for its own sake: the
   * selector reads factKeys and knows nothing about this block, and a value only readable here
   * would leave the anti-repeat machinery blind. This is the audit trail; factKeys is the
   * working copy.
   *
   * Absent on everything else, and nothing outside the Golden importer reads it.
   */
  golden?: {
    questionId: string;
    skillKey: string;
    conceptId: string;
    factId: string;
    familyId: string;
    reassessmentGroup: string;
    /** D1-D5 as authored. `difficulty` above holds the same value as the 1-5 the engine reads. */
    difficultyBand: string;
    provenance: string;
    /** The legacy question this was kept, rewritten or remapped from. Empty when authored. */
    sourceQuestionId?: string;
  };
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const OptionSchema = new Schema<IAssessmentOption>(
  { id: { type: String, required: true }, text: { type: String, required: true } },
  { _id: false }
);

const TestCaseSchema = new Schema<ITestCase>(
  {
    input: { type: String, default: '' },
    expectedOutput: { type: String, default: '' },
    hidden: { type: Boolean, default: true },
    weight: { type: Number, default: 1 },
  },
  { _id: false }
);

const AssessmentItemSchema = new Schema<IAssessmentItem>(
  {
    tenantId: { type: String, required: true, index: true },
    type: { type: String, enum: ASSESSMENT_ITEM_TYPES as unknown as string[], required: true },
    dimension: { type: String, enum: ASSESSMENT_DIMENSIONS as unknown as string[], required: true },
    difficulty: { type: Number, min: 1, max: 5, required: true },
    language: { type: String, trim: true },
    prompt: { type: String, required: true },
    codeSnippet: { type: String },

    options: { type: [OptionSchema], default: undefined },
    correctOptionIds: { type: [String], default: undefined },

    expectedOutput: { type: String },

    buggyLineNumber: { type: Number },
    bugExplanation: { type: String },

    blanks: {
      type: [
        new Schema(
          {
            id: { type: String, required: true },
            acceptedAnswers: { type: [String], required: true },
            caseSensitive: { type: Boolean, default: false },
          },
          { _id: false }
        ),
      ],
      default: undefined,
    },

    starterCode: { type: String },
    functionSignature: { type: String },
    testCases: { type: [TestCaseSchema], default: undefined },

    points: { type: Number, default: 1 },
    timeLimitSeconds: { type: Number },
    tags: { type: [String], default: [] },
    factKeys: { type: [String], default: undefined },
    explanation: { type: String },
    golden: {
      type: new Schema(
        {
          questionId: { type: String, required: true },
          skillKey: { type: String, required: true, uppercase: true, trim: true },
          conceptId: { type: String, required: true },
          factId: { type: String, required: true },
          familyId: { type: String, required: true },
          reassessmentGroup: { type: String, required: true },
          difficultyBand: { type: String, required: true, enum: ['D1', 'D2', 'D3', 'D4', 'D5'] },
          provenance: {
            type: String, required: true,
            enum: ['AUTHORED', 'LEGACY_KEEP', 'LEGACY_REWRITE', 'LEGACY_REMAP'],
          },
          sourceQuestionId: { type: String },
        },
        { _id: false },
      ),
      default: undefined,
    },
    active: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Primary lookup the blueprint engine uses to pull items for an exam.
AssessmentItemSchema.index({ tenantId: 1, active: 1, dimension: 1, type: 1, difficulty: 1 });
/**
 * One row per Golden question per tenant — the second guard on idempotency.
 *
 * The importer already derives a stable `_id`, so a rerun updates in place. This refuses a
 * duplicate written by any other path: a partial index rather than a sparse one, so the
 * uniqueness applies only to rows that actually carry a Golden identifier and the millions of
 * ordinary items are not all treated as sharing a null.
 */
AssessmentItemSchema.index(
  { tenantId: 1, 'golden.questionId': 1 },
  { unique: true, partialFilterExpression: { 'golden.questionId': { $exists: true } } },
);

export default mongoose.model<IAssessmentItem>('AssessmentItem', AssessmentItemSchema);
