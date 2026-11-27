import mongoose, { Schema, Document } from 'mongoose';

/**
 * Problem Bundles — the one library of everything assessable (MCQ, short answer, coding,
 * interview Q&A, snippet). It sits BESIDE the older stores (Question, CodingProblem,
 * InterviewQuestion) and never edits them; `source` remembers which old row an item was copied from.
 *
 * `scope: 'global'` is CodeBegun's content: tenants can use and clone it, never edit it.
 * `scope: 'tenant'` is an institute's own copy, which it can edit freely.
 */
export const LIBRARY_KINDS = ['mcq_single', 'mcq_multiple', 'short_answer', 'coding', 'interview_qa', 'snippet'] as const;
export type LibraryKind = typeof LIBRARY_KINDS[number];
export const LIBRARY_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const LIBRARY_AUDIENCES = ['lms', 'careerpilot'] as const;

export interface ILibraryItem extends Document {
  scope: 'global' | 'tenant';
  tenantId: string | null;
  kind: LibraryKind;
  title: string;
  body: string;
  options: { text: string; isCorrect: boolean }[];
  answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
  topic: string;
  tags: string[];
  companies: string[];
  audiences: string[];
  marks: number;
  status: 'draft' | 'published' | 'archived';
  /** Type-specific extras (coding test cases, languages, a link to the Problem Bank row). */
  data: any;
  source?: { store: string; id: string };
  clonedFrom?: mongoose.Types.ObjectId;
  contentHash: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LibraryItemSchema = new Schema<ILibraryItem>({
  scope: { type: String, enum: ['global', 'tenant'], required: true },
  tenantId: { type: String, default: null },
  kind: { type: String, enum: LIBRARY_KINDS as unknown as string[], required: true },
  title: { type: String, required: true, trim: true, maxlength: 300 },
  body: { type: String, default: '' },
  options: { type: [{ text: String, isCorrect: Boolean, _id: false }], default: [] },
  answer: { type: String, default: '' },
  explanation: { type: String, default: '' },
  difficulty: { type: String, enum: LIBRARY_DIFFICULTIES as unknown as string[], default: 'medium' },
  subject: { type: String, default: '', trim: true },
  topic: { type: String, default: '', trim: true },
  tags: { type: [String], default: [] },
  companies: { type: [String], default: [] },
  audiences: { type: [String], default: ['lms', 'careerpilot'] },
  marks: { type: Number, default: 1 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
  data: { type: Schema.Types.Mixed, default: {} },
  source: { type: new Schema({ store: String, id: String }, { _id: false }), default: undefined },
  clonedFrom: { type: Schema.Types.ObjectId },
  contentHash: { type: String, default: '', index: true },
  createdBy: String,
}, { timestamps: true });

LibraryItemSchema.index({ scope: 1, tenantId: 1, status: 1, kind: 1, difficulty: 1 });
LibraryItemSchema.index({ scope: 1, tenantId: 1, subject: 1, topic: 1 });
LibraryItemSchema.index({ tenantId: 1, 'source.store': 1, 'source.id': 1 });
LibraryItemSchema.index({ tenantId: 1, clonedFrom: 1 });
LibraryItemSchema.index({ title: 'text', body: 'text', tags: 'text', subject: 'text', topic: 'text', companies: 'text' },
  { weights: { title: 10, tags: 6, topic: 5, subject: 4, companies: 3, body: 1 } });

export default mongoose.model<ILibraryItem>('LibraryItem', LibraryItemSchema);
