import mongoose, { Schema, Document } from 'mongoose';

/**
 * One runnable problem in the Problem Bank — the single home for coding problems.
 *
 * ── A PROBLEM IS NOT A DELIVERY ─────────────────────────────────────────────────────────────
 * Nothing here knows about batches, courses, due dates or products. Assignments, CareerPilot
 * practice, exams, Interview Pilot and the external API REFERENCE a problem by id; none copy it.
 * That is what lets one problem serve every product and lets the older per-module stores be
 * retired.
 *
 * ── OWNERSHIP ───────────────────────────────────────────────────────────────────────────────
 * `scope: 'global'` is CodeBegun's library — every institute can use it, only a super admin can
 * edit it. `scope: 'tenant'` belongs to one institute, which authors and sees it alone.
 *
 * ── STORAGE SHAPE ───────────────────────────────────────────────────────────────────────────
 * Test cases live in their own collection (CodingProblemTestCase). A list page over a million
 * problems must never drag inputs that can be hundreds of kilobytes each, and hidden tests
 * must never ride along with a document that is sent to a browser.
 *
 * ── HOW CODE RUNS ───────────────────────────────────────────────────────────────────────────
 * stdin → stdout, like Codeforces/HackerRank. Per language the author can add a hidden
 * `headerCode` and `footerCode` around the visible starter (HackerRank's head/body/tail), which
 * is how a LeetCode-style "implement this function" problem is expressed: the footer holds the
 * driver that reads input, calls the candidate's function and prints the result.
 */
export type ProblemScope = 'global' | 'tenant';

/**
 * WHO A PROBLEM MAY BE GIVEN TO, AND WHO SEES IT UNASKED.
 *
 * `audiences` is the admin's assignment: the products a problem is given to.
 *   - 'careerpilot': it is in the CareerPilot practice library (when published), and may go into
 *     CareerPilot problem sets.
 *   - 'lms': it may go into LMS problem sets and exam pools. The LMS has no open library, so an LMS
 *     student still meets it only when a teacher assigns it.
 *   - [] (none): not assigned yet. New problems start here and are given to nobody until an admin
 *     ticks a product, one by one or in bulk (Problem Bank → select → Available to).
 *
 * Rows written before `audiences` existed have NO field and read as LMS only: they keep working in
 * the LMS sets and exams that already use them, and join the CareerPilot library only when an
 * admin adds CareerPilot. (`legacyAudiences` is that reading, for updates that start from it.)
 */
export const PROBLEM_PRODUCTS = ['lms', 'careerpilot'] as const;
export type ProblemProduct = typeof PROBLEM_PRODUCTS[number];
export const LEGACY_AUDIENCES: ProblemProduct[] = ['lms'];

export const availableTo = (product: ProblemProduct) => (product === 'lms'
  ? { $or: [{ audiences: 'lms' }, { audiences: { $exists: false } }, { audiences: null }] }
  : { audiences: product });
export const notAssigned = () => ({ audiences: { $size: 0 } });
export const audiencesOf = (p: { audiences?: string[] | null }): string[] =>
  Array.isArray(p.audiences) ? p.audiences : LEGACY_AUDIENCES;
export const isAvailableTo = (p: { audiences?: string[] | null }, product: ProblemProduct) =>
  audiencesOf(p).includes(product);
export type ProblemKind = 'code' | 'sql';
export type ProblemStatus = 'draft' | 'published' | 'archived';
export type VerificationStatus = 'unverified' | 'queued' | 'running' | 'verified' | 'failed' | 'stale';

export interface IProblemLanguage {
  language: string;
  starterCode: string;
  headerCode: string;
  footerCode: string;
  solutionCode: string;
}

export interface ILanguageVerification {
  language: string;
  passed: number;
  total: number;
  verdict: string;
  message?: string;
  timeMs?: number;
}

export interface ICodingProblem extends Document {
  scope: ProblemScope;
  tenantId: string | null;
  number: number;
  slug: string;
  title: string;
  kind: ProblemKind;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  hints: string[];
  editorial: string;
  difficulty: 'easy' | 'medium' | 'hard';
  rating?: number;
  marks: number;
  topics: string[];
  tags: string[];
  /** See PROBLEM_PRODUCTS. Empty = not assigned; missing (older rows) = LMS only. */
  audiences?: ProblemProduct[];
  companies: string[];
  languages: IProblemLanguage[];
  sqlSetup: string;
  limits: { timeMs: number; memoryMb: number };
  comparisonMode: 'lenient' | 'exact' | 'case_insensitive' | 'numeric';
  status: ProblemStatus;
  testCount: number;
  sampleCount: number;
  verification: {
    status: VerificationStatus;
    checkedAt?: Date;
    message?: string;
    byLanguage: ILanguageVerification[];
  };
  source: 'manual' | 'import' | 'ai' | 'migrated';
  legacyRef?: { model: string; id: string };
  version: number;
  stats: { attempts: number; accepted: number };
  createdBy?: string;
  updatedBy?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LanguageSchema = new Schema<IProblemLanguage>({
  language: { type: String, required: true },
  starterCode: { type: String, default: '' },
  headerCode: { type: String, default: '' },
  footerCode: { type: String, default: '' },
  solutionCode: { type: String, default: '' },
}, { _id: false });

const LanguageVerificationSchema = new Schema<ILanguageVerification>({
  language: String, passed: Number, total: Number, verdict: String, message: String, timeMs: Number,
}, { _id: false });

const CodingProblemSchema = new Schema<ICodingProblem>({
  scope: { type: String, enum: ['global', 'tenant'], required: true },
  tenantId: { type: String, default: null },
  number: { type: Number, required: true },
  slug: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  kind: { type: String, enum: ['code', 'sql'], default: 'code' },
  statement: { type: String, default: '' },
  inputFormat: { type: String, default: '' },
  outputFormat: { type: String, default: '' },
  constraints: { type: String, default: '' },
  hints: { type: [String], default: [] },
  editorial: { type: String, default: '' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true, default: 'medium' },
  rating: Number,
  marks: { type: Number, default: 20, min: 0 },
  topics: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  audiences: { type: [String], enum: PROBLEM_PRODUCTS as unknown as string[], default: undefined },
  companies: { type: [String], default: [] },
  languages: { type: [LanguageSchema], default: [] },
  sqlSetup: { type: String, default: '' },
  limits: {
    timeMs: { type: Number, default: 2000 },
    memoryMb: { type: Number, default: 256 },
  },
  comparisonMode: { type: String, enum: ['lenient', 'exact', 'case_insensitive', 'numeric'], default: 'lenient' },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  testCount: { type: Number, default: 0 },
  sampleCount: { type: Number, default: 0 },
  verification: {
    status: { type: String, default: 'unverified' },
    checkedAt: Date,
    message: String,
    byLanguage: { type: [LanguageVerificationSchema], default: [] },
  },
  source: { type: String, enum: ['manual', 'import', 'ai', 'migrated'], default: 'manual' },
  legacyRef: { model: String, id: String },
  version: { type: Number, default: 1 },
  stats: { attempts: { type: Number, default: 0 }, accepted: { type: Number, default: 0 } },
  createdBy: String,
  updatedBy: String,
  publishedAt: Date,
}, { timestamps: true });

// Visibility + the filters the library page offers, most selective first.
CodingProblemSchema.index({ scope: 1, tenantId: 1, status: 1, difficulty: 1, number: 1 });
CodingProblemSchema.index({ scope: 1, tenantId: 1, topics: 1 });
CodingProblemSchema.index({ scope: 1, tenantId: 1, 'languages.language': 1 });
CodingProblemSchema.index({ companies: 1 });
CodingProblemSchema.index({ scope: 1, tenantId: 1, slug: 1 }, { unique: true });
CodingProblemSchema.index({ title: 'text', tags: 'text', statement: 'text' }, { weights: { title: 10, tags: 5, statement: 1 }, name: 'pb_text' });
// A legacy record migrates at most once.
CodingProblemSchema.index({ 'legacyRef.model': 1, 'legacyRef.id': 1 }, { unique: true, partialFilterExpression: { 'legacyRef.id': { $type: 'string' } } });

export default mongoose.model<ICodingProblem>('CodingProblem', CodingProblemSchema);

/* ── Test cases ───────────────────────────────────────────────────────────────────────────── */

export interface ICodingProblemTestCase extends Document {
  problemId: mongoose.Types.ObjectId;
  order: number;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  weight: number;
  explanation: string;
}

const TestCaseSchema = new Schema<ICodingProblemTestCase>({
  problemId: { type: Schema.Types.ObjectId, ref: 'CodingProblem', required: true },
  order: { type: Number, default: 0 },
  input: { type: String, default: '' },
  expectedOutput: { type: String, default: '' },
  // Samples are shown to the solver and used by "Run"; everything else is hidden and only used to judge.
  isSample: { type: Boolean, default: false },
  weight: { type: Number, default: 1, min: 0 },
  explanation: { type: String, default: '' },
}, { timestamps: false });
TestCaseSchema.index({ problemId: 1, order: 1 });

export const CodingProblemTestCase = mongoose.model<ICodingProblemTestCase>('CodingProblemTestCase', TestCaseSchema);

/* ── Problem numbers ──────────────────────────────────────────────────────────────────────── */

const CounterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
const ProblemCounter = mongoose.model('ProblemBankCounter', CounterSchema);

/** Next problem number within a scope: one sequence for the global library, one per institute. */
export async function nextProblemNumber(scope: ProblemScope, tenantId: string | null): Promise<number> {
  const key = scope === 'global' ? 'global' : `tenant:${tenantId}`;
  const c: any = await ProblemCounter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return c.seq;
}
