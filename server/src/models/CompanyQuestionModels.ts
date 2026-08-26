import mongoose, { Document, Schema } from 'mongoose';

/**
 * Company Questions — an archive of what companies actually asked, by round.
 *
 * Three collections, and the split matters:
 *
 *   QuestionTaxonomy — rounds, categories, difficulties, company types. ROWS, not enums.
 *     The admin was promised they could add "System Design" or "Case Study" themselves,
 *     and the moment a taxonomy lives in a TypeScript union every change is a deploy.
 *   Company        — who asked.
 *   CompanyQuestion — what they asked.
 */

// ─── Taxonomy ────────────────────────────────────────────────────────────────

export interface ITaxonomyItem { key: string; label: string; order: number; enabled: boolean }

export interface IQuestionTaxonomy extends Document {
  tenantId: string;
  rounds: ITaxonomyItem[];
  categories: ITaxonomyItem[];
  difficulties: ITaxonomyItem[];
  companyTypes: ITaxonomyItem[];
}

const ItemSchema = new Schema<ITaxonomyItem>({
  key:     { type: String, required: true },
  label:   { type: String, required: true },
  order:   { type: Number, default: 0 },
  enabled: { type: Boolean, default: true },
}, { _id: false });

/** Sensible starting points, all editable and deletable from the admin screen. */
export const DEFAULT_ROUNDS: ITaxonomyItem[] = [
  { key: 'online_test',  label: 'Online Test',        order: 1, enabled: true },
  { key: 'aptitude',     label: 'Aptitude',           order: 2, enabled: true },
  { key: 'coding',       label: 'Coding Round',       order: 3, enabled: true },
  { key: 'technical',    label: 'Technical Interview',order: 4, enabled: true },
  { key: 'gd',           label: 'Group Discussion',   order: 5, enabled: true },
  { key: 'system_design',label: 'System Design',      order: 6, enabled: true },
  { key: 'managerial',   label: 'Managerial',         order: 7, enabled: true },
  { key: 'hr',           label: 'HR Round',           order: 8, enabled: true },
];

export const DEFAULT_CATEGORIES: ITaxonomyItem[] = [
  { key: 'dsa',          label: 'Data Structures & Algorithms', order: 1, enabled: true },
  { key: 'oops',         label: 'OOPs',                          order: 2, enabled: true },
  { key: 'dbms',         label: 'DBMS / SQL',                    order: 3, enabled: true },
  { key: 'os',           label: 'Operating Systems',             order: 4, enabled: true },
  { key: 'networks',     label: 'Computer Networks',             order: 5, enabled: true },
  { key: 'java',         label: 'Java',                          order: 6, enabled: true },
  { key: 'python',       label: 'Python',                        order: 7, enabled: true },
  { key: 'web',          label: 'Web / Frontend',                order: 8, enabled: true },
  { key: 'projects',     label: 'Projects & Resume',             order: 9, enabled: true },
  { key: 'behavioural',  label: 'Behavioural',                   order: 10, enabled: true },
  { key: 'quantitative', label: 'Quantitative & Logical',        order: 11, enabled: true },
];

export const DEFAULT_DIFFICULTIES: ITaxonomyItem[] = [
  { key: 'easy',   label: 'Easy',   order: 1, enabled: true },
  { key: 'medium', label: 'Medium', order: 2, enabled: true },
  { key: 'hard',   label: 'Hard',   order: 3, enabled: true },
];

export const DEFAULT_COMPANY_TYPES: ITaxonomyItem[] = [
  { key: 'product',  label: 'Product-based', order: 1, enabled: true },
  { key: 'service',  label: 'Service-based', order: 2, enabled: true },
  { key: 'startup',  label: 'Startup',       order: 3, enabled: true },
  { key: 'mnc',      label: 'MNC',           order: 4, enabled: true },
];

const TaxonomySchema = new Schema<IQuestionTaxonomy>({
  tenantId:     { type: String, required: true, unique: true, index: true },
  rounds:       { type: [ItemSchema], default: DEFAULT_ROUNDS },
  categories:   { type: [ItemSchema], default: DEFAULT_CATEGORIES },
  difficulties: { type: [ItemSchema], default: DEFAULT_DIFFICULTIES },
  companyTypes: { type: [ItemSchema], default: DEFAULT_COMPANY_TYPES },
}, { timestamps: true });

export const QuestionTaxonomy = mongoose.model<IQuestionTaxonomy>('QuestionTaxonomy', TaxonomySchema);

// ─── Company ─────────────────────────────────────────────────────────────────

export interface ICompany extends Document {
  tenantId: string;
  name: string;
  slug: string;
  type: string;
  logoUrl?: string;
  about?: string;
  roles: string[];
  active: boolean;

  // ── Profile, typed by an admin. Facts, not statistics. ──
  location?: string;
  industry?: string;
  employeeBand?: string;
  website?: string;
  /**
   * Who started it, and when — the context a student actually repeats in an interview when
   * asked "what do you know about us". Free text per person because titles vary wildly
   * (founder, co-founder, founding CEO) and forcing a taxonomy would only lose detail.
   */
  founders: { name: string; title?: string }[];
  foundedYear?: number;
  /**
   * Revenue as a STRING, deliberately. Companies report in different currencies, periods
   * and units — "$19.4B (FY2024)", "₹2.25 lakh crore (FY24)" — and a number field would
   * either lose the unit or invent a false precision nobody can verify.
   */
  revenue?: string;
  /** Free-form advice shown on the Tips tab. */
  tips: string[];

  /**
   * Indicative salary ranges, entered by an admin from placement experience.
   *
   * NOT survey data, and labelled that way everywhere it appears. Scraping Glassdoor or
   * AmbitionBox would breach their terms; these are the tenant's own stated estimates and
   * are presented as such, so a student is never misled about where the number came from.
   */
  salaryBands: { role: string; minLpa: number; maxLpa: number; note?: string }[];

  /**
   * Who can apply. The first thing a student actually needs, and the field where being
   * wrong costs them an application they were eligible for - or wastes one they were not.
   */
  eligibility: {
    cgpaMin?: number;
    tenthMin?: number;
    twelfthMin?: number;
    backlogsAllowed?: number;
    gapYearsAllowed?: number;
    branches: string[];
    notes?: string;
  };
  /** e.g. "Applications open Aug, OA Sep, offers by Nov" */
  hiringTimeline?: string;

  /**
   * Which sections the model wrote rather than a human.
   *
   * Kept per field, not per company, because an admin needs to know WHICH parts to check
   * - and because a company is usually part drafted, part typed.
   */
  aiDrafted: { overview?: boolean; eligibility?: boolean; salary?: boolean; pattern?: boolean };

  /**
   * Human sign-off on the two fields a student acts on directly.
   *
   * Eligibility and salary stay hidden from students until someone ticks these, however
   * confident the draft looked. The model does not know this year's cutoff at this
   * company, and a confident wrong number is worse than a missing one.
   */
  verified: { eligibility?: boolean; salary?: boolean };

  /** Stamped the first time the company passes the readiness bar. */
  publishedAt?: Date | null;
  /** Denormalised count of published questions — the grid would otherwise need an
   *  aggregate per company on every page load. Recomputed on publish/unpublish. */
  questionCount: number;
}

const CompanySchema = new Schema<ICompany>({
  tenantId: { type: String, required: true, index: true },
  name:     { type: String, required: true, trim: true },
  slug:     { type: String, required: true },
  type:     { type: String, default: 'service' },
  logoUrl:  { type: String, default: '' },
  about:    { type: String, default: '' },
  roles:    [{ type: String }],
  active:   { type: Boolean, default: true },
  questionCount: { type: Number, default: 0 },

  location:     { type: String, default: '' },
  industry:     { type: String, default: '' },
  employeeBand: { type: String, default: '' },
  website:      { type: String, default: '' },
  founders:     [{ name: { type: String, default: '' }, title: { type: String, default: '' }, _id: false }],
  foundedYear:  { type: Number, default: null },
  revenue:      { type: String, default: '' },
  tips:         [{ type: String }],
  hiringTimeline: { type: String, default: '' },
  eligibility: {
    cgpaMin:          { type: Number },
    tenthMin:         { type: Number },
    twelfthMin:       { type: Number },
    backlogsAllowed:  { type: Number },
    gapYearsAllowed:  { type: Number },
    branches:         [{ type: String }],
    notes:            { type: String, default: '' },
  },
  aiDrafted: {
    overview:    { type: Boolean, default: false },
    eligibility: { type: Boolean, default: false },
    salary:      { type: Boolean, default: false },
    pattern:     { type: Boolean, default: false },
  },
  verified: {
    eligibility: { type: Boolean, default: false },
    salary:      { type: Boolean, default: false },
  },
  publishedAt: { type: Date, default: null },
  salaryBands: [{
    role:  { type: String, default: '' },
    minLpa: { type: Number, default: 0 },
    maxLpa: { type: Number, default: 0 },
    note:  { type: String, default: '' },
  }],
}, { timestamps: true });

CompanySchema.index({ tenantId: 1, slug: 1 }, { unique: true });

export const Company = mongoose.model<ICompany>('Company', CompanySchema);

// ─── Question ────────────────────────────────────────────────────────────────

export interface ICompanyQuestion extends Document {
  tenantId: string;
  companyId: mongoose.Types.ObjectId;
  /** Denormalised so the student browse can filter without a join. */
  companySlug: string;
  role: string;
  round: string;
  category: string;
  difficulty: string;
  /** The year it was asked. Freshness is most of the value here. */
  year?: number;
  questionText: string;
  /** A model answer or the approach expected — whichever the contributor gave. */
  answer?: string;
  /**
   * The choices, when this row is a multiple-choice question.
   *
   * WITHOUT THESE THE MOCK TEST CANNOT USE THE BANK. assembleTest() draws banked questions by
   * reading `options` and `correctIndex`; while the schema did not declare them, Mongoose
   * stripped both on write and on read, every banked row failed the "is this answerable"
   * filter, and every company mock test was assembled entirely from AI-generated items — even
   * at a company with a full curated bank.
   *
   * Empty for the many rows that are not MCQs. A technical or HR question is prose with a
   * model `answer`, and that is still the common case.
   */
  options: string[];
  /**
   * Which option is correct — the answer key, and the reason it is never in publicQuestion().
   *
   * Only ever set together with `options`, and only when it indexes one of them. A row with an
   * answer key that points nowhere is worse than one with no key: the test would still serve
   * it and mark every attempt wrong.
   */
  correctIndex?: number | null;
  tags: string[];

  /** Where it came from. Drives what the member is told. */
  source: 'admin' | 'student' | 'ai';
  /**
   * TRUE when the model invented this rather than someone having been asked it.
   *
   * These are predictions, not recollections, and the UI must say so. Labelling a guess
   * as "asked at Infosys" is a false claim, and on a paid product it is the kind of claim
   * that costs trust the first time a student notices.
   */
  aiPredicted: boolean;

  /** Set when a coding question has a runnable counterpart in the Practice Lab. */
  practiceProblemId?: string;

  status: 'pending' | 'published' | 'rejected';
  contributedBy?: mongoose.Types.ObjectId;
  /** Why an admin rejected it — shown back to the student who submitted it. */
  reviewNote?: string;
  upvotes: number;
  createdAt: Date;
}

const QuestionSchema = new Schema<ICompanyQuestion>({
  tenantId:    { type: String, required: true, index: true },
  companyId:   { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  companySlug: { type: String, required: true },
  role:        { type: String, default: '' },
  round:       { type: String, default: 'technical', index: true },
  category:    { type: String, default: '' },
  difficulty:  { type: String, default: 'medium' },
  year:        { type: Number },
  questionText:{ type: String, required: true },
  answer:      { type: String, default: '' },
  options:     [{ type: String }],
  correctIndex:{ type: Number, default: null },
  tags:        [{ type: String }],
  source:      { type: String, enum: ['admin', 'student', 'ai'], default: 'admin' },
  aiPredicted: { type: Boolean, default: false },
  practiceProblemId: { type: String, default: '' },
  status:      { type: String, enum: ['pending', 'published', 'rejected'], default: 'published', index: true },
  contributedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewNote:  { type: String, default: '' },
  upvotes:     { type: Number, default: 0 },
}, { timestamps: true });

// The student browse: one company, published, optionally narrowed by round.
QuestionSchema.index({ tenantId: 1, companySlug: 1, status: 1, round: 1 });
// The moderation queue.
QuestionSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
// Free-text search across the archive.
QuestionSchema.index({ questionText: 'text', tags: 'text' });

export const CompanyQuestion = mongoose.model<ICompanyQuestion>('CompanyQuestion', QuestionSchema);


// ─── Interview experience ────────────────────────────────────────────────────

/**
 * One student's account of interviewing somewhere.
 *
 * This single record is what makes the company page real. Everything the mockup shows
 * that cannot simply be typed in — how many rounds, how long it took, how often a
 * question comes up, what proportion end in an offer — is an aggregate over these.
 *
 * Every figure derived from them is published WITH its sample size, because "5.6 rounds"
 * from three reports and from three hundred are different claims, and a student can tell
 * the difference.
 */
export interface IInterviewExperience extends Document {
  tenantId: string;
  companyId: mongoose.Types.ObjectId;
  companySlug: string;
  studentId: mongoose.Types.ObjectId;

  role: string;
  /** When they interviewed — drives "last asked" and the year filters. */
  interviewedOn: Date;
  /** Round keys from the taxonomy, in the order they were faced. */
  roundsFaced: string[];
  /** End to end, in days. Renders as "3-5 weeks" once averaged. */
  durationDays?: number;
  outcome: 'offer' | 'rejected' | 'waiting' | 'withdrew';
  difficultyFelt?: 'easy' | 'medium' | 'hard';
  /** 1-5. Averaged into the company rating, with its count shown. */
  rating?: number;
  review?: string;

  status: 'pending' | 'published' | 'rejected';
  reviewNote?: string;
  createdAt: Date;
}

const ExperienceSchema = new Schema<IInterviewExperience>({
  tenantId:    { type: String, required: true, index: true },
  companyId:   { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  companySlug: { type: String, required: true },
  studentId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role:          { type: String, default: '' },
  interviewedOn: { type: Date, required: true },
  roundsFaced:   [{ type: String }],
  durationDays:  { type: Number },
  outcome:       { type: String, enum: ['offer', 'rejected', 'waiting', 'withdrew'], default: 'waiting' },
  difficultyFelt:{ type: String, enum: ['easy', 'medium', 'hard'] },
  rating:        { type: Number, min: 1, max: 5 },
  review:        { type: String, default: '' },
  status:        { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending', index: true },
  reviewNote:    { type: String, default: '' },
}, { timestamps: true });

ExperienceSchema.index({ tenantId: 1, companySlug: 1, status: 1 });
ExperienceSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
// One student, one company, one interview date — stops a double submission counting twice
// in every average on the page.
ExperienceSchema.index({ tenantId: 1, companySlug: 1, studentId: 1, interviewedOn: 1 }, { unique: true });

export const InterviewExperience = mongoose.model<IInterviewExperience>('InterviewExperience', ExperienceSchema);


// ─── Interview pattern ───────────────────────────────────────────────────────

/**
 * The shape of a company's interview: which rounds, in what order, what each tests.
 *
 * Separate from the question bank because it answers a different question. The bank tells
 * a student WHAT gets asked; this tells them what they are walking into — how many rounds,
 * how long, what the cutoff is, what to expect at each stage. Most candidates want this
 * before they want questions.
 */
export interface IPatternRound {
  key: string;
  order: number;
  name: string;
  durationMins?: number;
  /** What this round is actually testing. */
  tests: string[];
  description?: string;
  /** e.g. "60% to clear", "top 2 of 4 problems". */
  cutoff?: string;
  tip?: string;
}

export interface IInterviewPattern extends Document {
  tenantId: string;
  companyId: mongoose.Types.ObjectId;
  companySlug: string;
  role: string;
  rounds: IPatternRound[];
  /** Typical end-to-end length, in days. */
  totalDurationDays?: number;
  aiDrafted: boolean;
  updatedAt: Date;
}

const PatternRoundSchema = new Schema<IPatternRound>({
  key:          { type: String, required: true },
  order:        { type: Number, default: 0 },
  name:         { type: String, required: true },
  durationMins: { type: Number },
  tests:        [{ type: String }],
  description:  { type: String, default: '' },
  cutoff:       { type: String, default: '' },
  tip:          { type: String, default: '' },
}, { _id: false });

const PatternSchema = new Schema<IInterviewPattern>({
  tenantId:    { type: String, required: true, index: true },
  companyId:   { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  companySlug: { type: String, required: true },
  role:        { type: String, default: '' },
  rounds:      { type: [PatternRoundSchema], default: [] },
  totalDurationDays: { type: Number },
  aiDrafted:   { type: Boolean, default: false },
}, { timestamps: true });

// One pattern per company per role, so "Software Engineer" and "Analyst" can differ.
PatternSchema.index({ tenantId: 1, companySlug: 1, role: 1 }, { unique: true });

export const InterviewPattern = mongoose.model<IInterviewPattern>('InterviewPattern', PatternSchema);

// ─── Mock test / mock interview configuration ────────────────────────────────

/**
 * How a company's mock test is assembled.
 *
 * Not a test — a recipe for one. Questions are drawn from that company's bank at run time
 * so the test improves as the bank does, and AI fills a section only when the bank cannot,
 * with those questions labelled. Storing a fixed paper would freeze it at the day it was
 * written and let it be shared between students.
 */
export interface ICompanyMockConfig extends Document {
  tenantId: string;
  companySlug: string;
  /** Test sections, in order. */
  sections: {
    name: string;
    category: string;
    questionCount: number;
    durationMins: number;
    difficulty?: string;
  }[];
  passingPct: number;
  maxAttempts: number;
  proctored: boolean;
  /** Top up from AI when the bank is short. Off means the section is simply shorter. */
  aiTopUp: boolean;

  /** Company priming for the AI interviewer — it reuses the engine that already exists. */
  interview: {
    role: string;
    rounds: string[];
    emphasis: string[];
    difficulty: string;
    openingLine?: string;
  };
  enabled: { mockTest: boolean; mockInterview: boolean };
}

const MockConfigSchema = new Schema<ICompanyMockConfig>({
  tenantId:    { type: String, required: true, index: true },
  companySlug: { type: String, required: true },
  sections: [{
    name:          { type: String, default: '' },
    category:      { type: String, default: '' },
    questionCount: { type: Number, default: 10 },
    durationMins:  { type: Number, default: 15 },
    difficulty:    { type: String, default: '' },
  }],
  passingPct:  { type: Number, default: 60 },
  maxAttempts: { type: Number, default: 2 },
  proctored:   { type: Boolean, default: false },
  aiTopUp:     { type: Boolean, default: true },
  interview: {
    role:        { type: String, default: '' },
    rounds:      [{ type: String }],
    emphasis:    [{ type: String }],
    difficulty:  { type: String, default: 'medium' },
    openingLine: { type: String, default: '' },
  },
  enabled: {
    mockTest:      { type: Boolean, default: false },
    mockInterview: { type: Boolean, default: false },
  },
}, { timestamps: true });

MockConfigSchema.index({ tenantId: 1, companySlug: 1 }, { unique: true });

export const CompanyMockConfig = mongoose.model<ICompanyMockConfig>('CompanyMockConfig', MockConfigSchema);
