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
    active: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Primary lookup the blueprint engine uses to pull items for an exam.
AssessmentItemSchema.index({ tenantId: 1, active: 1, dimension: 1, type: 1, difficulty: 1 });

export default mongoose.model<IAssessmentItem>('AssessmentItem', AssessmentItemSchema);
