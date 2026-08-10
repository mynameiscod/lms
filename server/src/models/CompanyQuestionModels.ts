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
