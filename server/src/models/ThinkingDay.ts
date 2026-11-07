import mongoose, { Schema, Document } from 'mongoose';

/**
 * A CareerPilot member's Thinking Lab day: the questions they were given on `date` (IST 'YYYY-MM-DD'),
 * chosen once, the first time they open the lab that day (services/thinkingDailyService.ts).
 * One per member per day; a day they never opened has none, so missed days do not pile up.
 */
export interface IThinkingDay extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  date: string;
  stage: string;
  items: { questionId: mongoose.Types.ObjectId; type: string }[];
  /** Extra questions from "Practice more": answered for practice, never paid. */
  practice: { questionId: mongoose.Types.ObjectId; type: string }[];
  demo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const Item = new Schema({ questionId: { type: Schema.Types.ObjectId, ref: 'ThinkingQuestion', required: true }, type: String }, { _id: false });

const ThinkingDaySchema = new Schema<IThinkingDay>(
  {
    tenantId: { type: String, required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    stage: { type: String, default: '' },
    items: { type: [Item], default: [] },
    practice: { type: [Item], default: [] },
    demo: { type: Boolean },
  },
  { timestamps: true },
);
ThinkingDaySchema.index({ tenantId: 1, studentId: 1, date: 1 }, { unique: true });

export default mongoose.model<IThinkingDay>('ThinkingDay', ThinkingDaySchema);

/**
 * A member's work on one question: every attempt, the best score, and whether it is finished. A question
 * is finished when answered right or out of attempts; only then are the key steps and model answer shown.
 */
export interface IThinkingAnswer extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  date: string;
  practice: boolean;
  attempts: {
    answer?: string; explanation?: string; code?: string; language?: string;
    correct: boolean; steps: string[]; share: number; passed?: number; total?: number; feedback?: string; at: Date;
  }[];
  hintsUsed: number;
  bestShare: number;
  correct: boolean;
  finished: boolean;
  finishedAt?: Date;
  xpEarned: number;
  createdAt: Date;
  updatedAt: Date;
}

const ThinkingAnswerSchema = new Schema<IThinkingAnswer>(
  {
    tenantId: { type: String, required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'ThinkingQuestion', required: true },
    date: { type: String, required: true },
    practice: { type: Boolean, default: false },
    attempts: {
      type: [{
        answer: String, explanation: String, code: String, language: String,
        correct: Boolean, steps: [String], share: Number, passed: Number, total: Number, feedback: String, at: Date, _id: false,
      }],
      default: [],
    },
    hintsUsed: { type: Number, default: 0 },
    bestShare: { type: Number, default: 0 },
    correct: { type: Boolean, default: false },
    finished: { type: Boolean, default: false },
    finishedAt: { type: Date },
    xpEarned: { type: Number, default: 0 },
  },
  { timestamps: true },
);
ThinkingAnswerSchema.index({ tenantId: 1, studentId: 1, questionId: 1 }, { unique: true });
ThinkingAnswerSchema.index({ tenantId: 1, studentId: 1, finishedAt: -1 });

export const ThinkingAnswer = mongoose.model<IThinkingAnswer>('ThinkingAnswer', ThinkingAnswerSchema);
