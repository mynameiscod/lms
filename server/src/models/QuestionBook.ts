import mongoose, { Schema, Document } from 'mongoose';

/**
 * Question Books — interview questions written by admins and instructors, read by students
 * like a notebook: a topic book (Java, SQL, DSA, HR…) or a company book (Infosys, TCS…), each
 * in chapters. The student reads a question, thinks, flips to the answer, and marks whether
 * they knew it.
 *
 * Only staff write these. Candidate-reported questions live in Interview Experiences and are
 * not mixed in — the institute chose to keep the book curated.
 *
 * Like the Problem Bank, a book is either CodeBegun's (`global`, written by a super admin,
 * readable by every institute) or one institute's own (`tenant`).
 */

export interface IBookChapter { _id: mongoose.Types.ObjectId; title: string; order: number }

export interface IQuestionBook extends Document {
  scope: 'global' | 'tenant';
  tenantId: string | null;
  title: string;
  slug: string;
  kind: 'topic' | 'company';
  /** e.g. "Java", "SQL" for a topic book; the employer for a company book. */
  subject: string;
  description: string;
  /** Cover colour and a single emoji/letter — books on the shelf should look different. */
  color: string;
  emblem: string;
  audience: 'all' | 'lms' | 'careerpilot';
  status: 'draft' | 'published';
  chapters: IBookChapter[];
  questionCount: number;
  order: number;
  createdBy?: string;
  updatedAt: Date;
}

const ChapterSchema = new Schema<IBookChapter>({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  order: { type: Number, default: 0 },
});

const BookSchema = new Schema<IQuestionBook>({
  scope: { type: String, enum: ['global', 'tenant'], required: true },
  tenantId: { type: String, default: null },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true },
  kind: { type: String, enum: ['topic', 'company'], default: 'topic' },
  subject: { type: String, default: '', trim: true, maxlength: 80 },
  description: { type: String, default: '', maxlength: 600 },
  color: { type: String, default: '#4f46e5' },
  emblem: { type: String, default: '' },
  audience: { type: String, enum: ['all', 'lms', 'careerpilot'], default: 'all' },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  chapters: { type: [ChapterSchema], default: [] },
  questionCount: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  createdBy: String,
}, { timestamps: true });
BookSchema.index({ scope: 1, tenantId: 1, slug: 1 }, { unique: true });
BookSchema.index({ scope: 1, tenantId: 1, status: 1, kind: 1 });

export const QuestionBook = mongoose.model<IQuestionBook>('QuestionBook', BookSchema);

export interface IBookQuestion extends Document {
  bookId: mongoose.Types.ObjectId;
  chapterId: string;
  order: number;
  /** Markdown — code blocks render as code, everything else in the notebook hand. */
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /** Where this is commonly asked, as a hint on the page ("TCS, Infosys"). */
  askedAt: string;
  tip: string;
}

const BookQuestionSchema = new Schema<IBookQuestion>({
  bookId: { type: Schema.Types.ObjectId, ref: 'QuestionBook', required: true },
  chapterId: { type: String, required: true },
  order: { type: Number, default: 0 },
  question: { type: String, required: true, maxlength: 4000 },
  answer: { type: String, default: '', maxlength: 12000 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  askedAt: { type: String, default: '', maxlength: 200 },
  tip: { type: String, default: '', maxlength: 600 },
}, { timestamps: true });
BookQuestionSchema.index({ bookId: 1, chapterId: 1, order: 1 });

export const BookQuestion = mongoose.model<IBookQuestion>('BookQuestion', BookQuestionSchema);

/** One student's reading of one book: what they knew, what to revise, favourites and notes. */
export interface IBookProgress extends Document {
  userId: string;
  tenantId: string;
  bookId: string;
  marks: Map<string, 'knew' | 'revise'>;
  favorites: string[];
  notes: Map<string, string>;
  lastQuestionId?: string;
  updatedAt: Date;
}

const ProgressSchema = new Schema<IBookProgress>({
  userId: { type: String, required: true },
  tenantId: { type: String, required: true },
  bookId: { type: String, required: true },
  marks: { type: Map, of: String, default: {} },
  favorites: { type: [String], default: [] },
  notes: { type: Map, of: String, default: {} },
  lastQuestionId: String,
}, { timestamps: true });
ProgressSchema.index({ userId: 1, bookId: 1 }, { unique: true });

export const BookProgress = mongoose.model<IBookProgress>('BookProgress', ProgressSchema);
