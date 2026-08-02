import mongoose, { Document, Schema } from 'mongoose';

/**
 * PassportAssessment — the deterministic Career Readiness question bank for a tenant
 * (one doc per tenant). Admin-authored MCQs across career categories; the free-tier
 * assessment scores these with rules (no per-user AI). AI mode is a later enhancement.
 */

export type PassportCategory =
  | 'career_clarity' | 'aptitude' | 'logical_reasoning'
  | 'technical' | 'communication' | 'employability';

export const PASSPORT_CATEGORIES: { key: PassportCategory; label: string; weight: number }[] = [
  { key: 'career_clarity',   label: 'Career Clarity',    weight: 1 },
  { key: 'aptitude',         label: 'Aptitude',          weight: 1.2 },
  { key: 'logical_reasoning',label: 'Logical Reasoning', weight: 1.2 },
  { key: 'technical',        label: 'Technical Foundation', weight: 1.5 },
  { key: 'communication',    label: 'Communication',     weight: 1 },
  { key: 'employability',    label: 'Employability',     weight: 1 },
];

export interface IPassportQuestion {
  _id?: any;
  category: PassportCategory;
  text: string;
  options: string[];
  correctIndex: number;   // -1 for self-report (career_clarity) — any answer scores by index weight
  weight: number;         // points if correct (default 1)
  /** Which career stages this applies to. Empty or absent = every stage, which is
   *  what all existing content is, so nothing changes until an admin narrows it. */
  stages?: string[];
  /** 'cs' | 'non_cs' | 'any'. Absent = any. */
  background?: string;

  selfReport?: boolean;   // if true, score = (chosen option's implied readiness) not right/wrong
}

export interface IPassportAssessment extends Document {
  tenantId: string;
  title: string;
  questions: IPassportQuestion[];
  updatedAt: Date;
  createdAt: Date;
}

const QuestionSchema = new Schema<IPassportQuestion>({
  category:    { type: String, required: true },
  text:        { type: String, required: true },
  options:     [{ type: String }],
  correctIndex:{ type: Number, default: -1 },
  weight:      { type: Number, default: 1 },
  stages:     { type: [String], default: [] },
  background: { type: String, default: 'any' },

  selfReport:  { type: Boolean, default: false },
}, { _id: true });

const PassportAssessmentSchema = new Schema<IPassportAssessment>(
  {
    tenantId:  { type: String, required: true, unique: true, index: true },
    title:     { type: String, default: 'Career Readiness Assessment' },
    questions: [QuestionSchema],
  },
  { timestamps: true }
);

// Starter bank (deterministic). Self-report items (career_clarity) score by option index.
export const DEFAULT_QUESTIONS: IPassportQuestion[] = [
  // Career clarity (self-report: later option = more clarity)
  { category: 'career_clarity', text: 'How clear are you about the career role you want?', options: ['No idea', 'Somewhat', 'Fairly clear', 'Very clear'], correctIndex: -1, selfReport: true, weight: 1 },
  { category: 'career_clarity', text: 'Do you know what skills your target role needs?', options: ['Not at all', 'A little', 'Mostly', 'Yes, in detail'], correctIndex: -1, selfReport: true, weight: 1 },
  { category: 'career_clarity', text: 'How often do you work on your career (weekly)?', options: ['Never', 'Rarely', 'Few times', 'Daily'], correctIndex: -1, selfReport: true, weight: 1 },

  // Aptitude
  { category: 'aptitude', text: 'If 5 pens cost ₹60, what do 8 pens cost?', options: ['₹80', '₹96', '₹90', '₹100'], correctIndex: 1, weight: 1 },
  { category: 'aptitude', text: 'A train covers 120 km in 2 hours. Its speed is?', options: ['40 km/h', '50 km/h', '60 km/h', '80 km/h'], correctIndex: 2, weight: 1 },
  { category: 'aptitude', text: '25% of 200 is?', options: ['25', '40', '50', '75'], correctIndex: 2, weight: 1 },

  // Logical reasoning
  { category: 'logical_reasoning', text: 'Find the next number: 2, 6, 12, 20, ?', options: ['24', '28', '30', '32'], correctIndex: 2, weight: 1 },
  { category: 'logical_reasoning', text: 'If ALL Bloops are Razzies and ALL Razzies are Lazzies, then all Bloops are:', options: ['Lazzies', 'Not Lazzies', 'Sometimes Lazzies', 'None'], correctIndex: 0, weight: 1 },
  { category: 'logical_reasoning', text: 'Odd one out: Apple, Mango, Carrot, Banana', options: ['Apple', 'Mango', 'Carrot', 'Banana'], correctIndex: 2, weight: 1 },

  // Technical foundation
  { category: 'technical', text: 'Which is NOT a programming language?', options: ['Python', 'Java', 'HTTP', 'C++'], correctIndex: 2, weight: 1 },
  { category: 'technical', text: 'What does a "loop" do in code?', options: ['Stores data', 'Repeats a block', 'Ends a program', 'Prints once'], correctIndex: 1, weight: 1 },
  { category: 'technical', text: 'SQL is mainly used to?', options: ['Style pages', 'Query databases', 'Compile code', 'Send emails'], correctIndex: 1, weight: 1 },
  { category: 'technical', text: 'Which stores data in key–value pairs?', options: ['Array', 'Object/Dictionary', 'Integer', 'Boolean'], correctIndex: 1, weight: 1 },

  // Communication (self-report)
  { category: 'communication', text: 'How comfortable are you giving a 2-minute self-introduction?', options: ['Very nervous', 'Somewhat', 'Comfortable', 'Very confident'], correctIndex: -1, selfReport: true, weight: 1 },
  { category: 'communication', text: 'Can you explain a project you built in simple English?', options: ['No', 'With difficulty', 'Mostly', 'Clearly'], correctIndex: -1, selfReport: true, weight: 1 },

  // Employability (self-report)
  { category: 'employability', text: 'Do you have a resume ready?', options: ['No', 'Draft', 'Yes, basic', 'Yes, polished'], correctIndex: -1, selfReport: true, weight: 1 },
  { category: 'employability', text: 'How many projects can you show (GitHub/demo)?', options: ['0', '1', '2', '3+'], correctIndex: -1, selfReport: true, weight: 1 },
  { category: 'employability', text: 'Have you attempted a mock interview?', options: ['Never', 'Once', 'A few', 'Regularly'], correctIndex: -1, selfReport: true, weight: 1 },
];

export default mongoose.model<IPassportAssessment>('PassportAssessment', PassportAssessmentSchema);
