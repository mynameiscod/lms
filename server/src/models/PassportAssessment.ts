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
  /** Career goals this applies to (matches PassportConfig's careerGoal options).
   *  Empty = every goal, so a question only narrows when an admin says it should. */
  goals?: string[];
  /** Ask this ONLY if an earlier question was answered at `minChosen` or above.
   *  "How many companies have you applied to?" makes no sense after "resume: not
   *  written" — the pair reads as a form that is not listening. */
  dependsOn?: { questionId: string; minChosen: number };

  selfReport?: boolean;   // if true, score = (chosen option's implied readiness) not right/wrong
}

/**
 * A paper's SHAPE for one segment: how many questions from each category.
 *
 * Separating shape from content is what lets two students at the same stage sit
 * different questions and still receive comparable scores. If the draw were free to vary
 * the mix as well, one student could get four aptitude questions and another four
 * technical, and their two "68/100" would not mean the same thing — which makes the
 * leaderboard and the percentile dishonest.
 */
export interface IPaperSlot { category: PassportCategory | string; count: number }

/**
 * An admin-defined scoring category.
 *
 * PASSPORT_CATEGORIES below stays as the seed and the fallback: a tenant that has never
 * touched this still gets the original six, and every consumer keeps working. Once an
 * admin edits them, the stored list wins.
 *
 * `weight` matters more than it looks — it scales the category's contribution to the
 * Career Score, so adding a category with a high weight quietly rebalances every score
 * that follows. The admin screen says so.
 */
export interface IPassportCategoryDef {
  key: string;
  label: string;
  weight: number;
  order?: number;
}

export interface IPaperBlueprint {
  _id?: any;
  /** Empty = applies to any stage. A blueprint naming both stage and goal wins over one naming neither. */
  stage?: string;
  goal?: string;
  label?: string;
  slots: IPaperSlot[];
}

export interface IPassportAssessment extends Document {
  tenantId: string;
  title: string;
  /** Most questions a single member is served. The bank grows without the paper growing
   *  with it — otherwise every question an admin adds is one more a student must sit. */
  maxQuestions: number;
  /** Per-segment paper shapes. Empty = fall back to the balanced round-robin. */
  blueprints: IPaperBlueprint[];
  /** Draw the slots randomly per attempt instead of always taking the same questions. */
  randomize: boolean;
  /** Admin-managed scoring categories. Empty = use PASSPORT_CATEGORIES. */
  categories: IPassportCategoryDef[];
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
  goals:      { type: [String], default: [] },
  dependsOn:  { type: { questionId: String, minChosen: Number }, default: undefined, _id: false },

  selfReport:  { type: Boolean, default: false },
}, { _id: true });

const PassportAssessmentSchema = new Schema<IPassportAssessment>(
  {
    tenantId:  { type: String, required: true, unique: true, index: true },
    title:     { type: String, default: 'Career Readiness Assessment' },
    maxQuestions: { type: Number, default: 14 },
    blueprints: [new Schema<IPaperBlueprint>({
      stage: { type: String },
      goal:  { type: String },
      label: { type: String, default: '' },
      slots: [{ category: { type: String, required: true }, count: { type: Number, default: 2 }, _id: false }],
    }, { _id: true })],
    randomize: { type: Boolean, default: true },
    categories: [new Schema<IPassportCategoryDef>({
      key:    { type: String, required: true },
      label:  { type: String, required: true },
      weight: { type: Number, default: 1 },
      order:  { type: Number, default: 0 },
    }, { _id: false })],
    questions: [QuestionSchema],
  },
  { timestamps: true }
);

// Starter bank (deterministic). Self-report items (career_clarity) score by option index.
/**
 * THE CAREER INTAKE. Formerly the "Career Readiness Assessment".
 *
 * WHAT WAS REMOVED, AND WHY.
 *
 * Ten graded questions used to sit here: three aptitude ("25% of 200 is?"), three logical
 * reasoning ("Odd one out: Apple, Mango, Carrot, Banana") and four technical ("Which is NOT
 * a programming language?"). They produced most of the old Career Score, and that score
 * gated a paid membership and was printed on a card shown to people who were not the
 * student. None of them measured whether a member could do the role they were aiming at,
 * they are trivially searchable, and the personalised skill assessment now measures the
 * same ground properly — against named skills, against a published role blueprint, with an
 * answer key somebody has actually read.
 *
 * WHAT SURVIVED, AND WHY.
 *
 * Every SELF-REPORT question. That is the whole rule, and it is not arbitrary: these ask
 * about things no test can observe — how clear a member is about where they are going, how
 * often they actually work on it, whether they have a resume, whether they have ever sat a
 * mock interview. A skill assessment cannot see any of that, and it is exactly what decides
 * which missions and nudges a member should get. They are cheap, they take a minute, and
 * they are the reason this is now an INTAKE rather than an exam.
 *
 * These stay graded as `selfReport` with `correctIndex: -1`, so a later option means more
 * readiness and nothing here is ever marked right or wrong.
 *
 * The Career Score no longer comes from this. It comes from role readiness — see
 * careerScoreService. What a member says about themselves informs the plan; it does not set
 * the number that is sold against.
 */
export const CAREER_INTAKE_QUESTIONS: IPassportQuestion[] = [
  // Direction — how clear is this member about where they are going?
  { category: 'career_clarity', text: 'How clear are you about the career role you want?', options: ['No idea', 'Somewhat', 'Fairly clear', 'Very clear'], correctIndex: -1, selfReport: true, weight: 1 },
  { category: 'career_clarity', text: 'Do you know what skills your target role needs?', stages: ['foundation'], options: ['Not at all', 'A little', 'Mostly', 'Yes, in detail'], correctIndex: -1, selfReport: true, weight: 1 },
  { category: 'career_clarity', text: 'How often do you work on your career (weekly)?', options: ['Never', 'Rarely', 'Few times', 'Daily'], correctIndex: -1, selfReport: true, weight: 1 },

  // Communication — self-reported confidence, which the Communication Lab then tests.
  { category: 'communication', text: 'How comfortable are you giving a 2-minute self-introduction?', options: ['Very nervous', 'Somewhat', 'Comfortable', 'Very confident'], correctIndex: -1, selfReport: true, weight: 1 },
  { category: 'communication', text: 'Can you explain a project you built in simple English?', stages: ['build'], options: ['No', 'With difficulty', 'Mostly', 'Clearly'], correctIndex: -1, selfReport: true, weight: 1 },

  // Employability — artefacts and practice, none of which an assessment can observe.
  { category: 'employability', text: 'Do you have a resume ready?', stages: ['build'], options: ['No', 'Draft', 'Yes, basic', 'Yes, polished'], correctIndex: -1, selfReport: true, weight: 1 },
  { category: 'employability', text: 'How many projects can you show (GitHub/demo)?', stages: ['placement', 'job_seeker'], options: ['0', '1', '2', '3+'], correctIndex: -1, selfReport: true, weight: 1 },
  { category: 'employability', text: 'Have you attempted a mock interview?', stages: ['build'], options: ['Never', 'Once', 'A few', 'Regularly'], correctIndex: -1, selfReport: true, weight: 1 },
];

/**
 * Kept as an alias so nothing that already imports it breaks, and so a tenant created
 * before the trim and one created after start from the same place.
 */
export const DEFAULT_QUESTIONS = CAREER_INTAKE_QUESTIONS;

/**
 * The categories in force for a tenant. Falls back to the built-in six, so every caller
 * can use this unconditionally and a tenant that never opens the editor is unaffected.
 */
export function categoriesOf(a: { categories?: IPassportCategoryDef[] } | null | undefined): IPassportCategoryDef[] {
  const list = a?.categories || [];
  if (!list.length) return PASSPORT_CATEGORIES.map((c, i) => ({ key: c.key, label: c.label, weight: c.weight, order: i }));
  return list.slice().sort((x, y) => (x.order ?? 0) - (y.order ?? 0));
}

export default mongoose.model<IPassportAssessment>('PassportAssessment', PassportAssessmentSchema);
