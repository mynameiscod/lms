import mongoose, { Schema, Document } from 'mongoose';
import { QUESTION_TYPES, QUESTION_DIFFICULTIES, ANSWER_FORMATS, QUESTION_STATUSES } from '../data/thinkingBankPolicy';

/**
 * A Thinking Lab question for CareerPilot members, in ONE bank shared by every institute
 * (data/thinkingBankPolicy.ts). Managed from Problem Bank → Thinking Lab.
 *
 * Kept apart from the coding Problem Bank (CodingProblem) on purpose: Practice, pool exams,
 * hackathons and the API all read that bank, and none of them may ever be handed a puzzle.
 * The LMS Thinking Lab keeps its own per-institute bank (ThinkingProblem).
 */
export interface IThinkingQuestion extends Document {
  /** Shown to admins as TQ-0001; never reused. */
  number: number;
  type: typeof QUESTION_TYPES[number];
  subCategory: string;
  difficulty: typeof QUESTION_DIFFICULTIES[number];
  /** Stage keys this suits; empty = every year. Coding is never served in Year 1 regardless. */
  years: string[];
  title: string;
  statement: string;
  imageUrl?: string;

  // Non-coding questions: a final answer and the reasoning that reaches it.
  answerFormat?: typeof ANSWER_FORMATS[number];
  choices: string[];
  answer?: string;
  acceptedAnswers: string[];
  keySteps: string[];
  explanation?: string;

  hints: string[];
  estimatedMinutes?: number;

  // Coding questions.
  language?: string;
  starterCode?: string;
  examples: { input: string; expectedOutput: string; explanation?: string }[];
  testCases: { input: string; expectedOutput: string; hidden: boolean }[];
  referenceSolution?: string;
  /** Topics the question needs, so a member is only given coding they have learned (step 3). */
  topics: string[];

  /** Serving order inside its type and year, lowest first; absent = after the numbered ones. */
  order?: number;
  status: typeof QUESTION_STATUSES[number];
  source: 'manual' | 'ai' | 'migrated';
  /** The ThinkingProblem it was copied from, when it came from the old per-institute bank. */
  migratedFrom?: string;
  timesServed: number;
  timesSolved: number;
  createdBy?: string;
  updatedBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ThinkingQuestionSchema = new Schema<IThinkingQuestion>(
  {
    number: { type: Number, required: true, unique: true },
    type: { type: String, enum: QUESTION_TYPES, required: true, index: true },
    subCategory: { type: String, default: '', trim: true, maxlength: 60 },
    difficulty: { type: String, enum: QUESTION_DIFFICULTIES, default: 'easy', index: true },
    years: { type: [String], default: [] },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    statement: { type: String, default: '', maxlength: 6000 },
    imageUrl: { type: String, trim: true, maxlength: 500 },

    answerFormat: { type: String, enum: ANSWER_FORMATS },
    choices: { type: [String], default: [] },
    answer: { type: String, trim: true, maxlength: 300 },
    acceptedAnswers: { type: [String], default: [] },
    keySteps: { type: [String], default: [] },
    explanation: { type: String, maxlength: 4000 },

    hints: { type: [String], default: [] },
    estimatedMinutes: { type: Number, min: 1, max: 120 },

    language: { type: String },
    starterCode: { type: String, maxlength: 6000 },
    examples: { type: [{ input: String, expectedOutput: String, explanation: String, _id: false }], default: [] },
    testCases: { type: [{ input: String, expectedOutput: String, hidden: Boolean, _id: false }], default: [] },
    referenceSolution: { type: String, maxlength: 10000 },
    topics: { type: [String], default: [] },

    order: { type: Number },
    status: { type: String, enum: QUESTION_STATUSES, default: 'DRAFT', index: true },
    source: { type: String, enum: ['manual', 'ai', 'migrated'], default: 'manual' },
    migratedFrom: { type: String, index: true, sparse: true },
    timesServed: { type: Number, default: 0 },
    timesSolved: { type: Number, default: 0 },
    createdBy: { type: String },
    updatedBy: { type: String },
    approvedBy: { type: String },
    approvedAt: { type: Date },
  },
  { timestamps: true },
);

ThinkingQuestionSchema.index({ status: 1, type: 1, difficulty: 1 });

export default mongoose.model<IThinkingQuestion>('ThinkingQuestion', ThinkingQuestionSchema);
