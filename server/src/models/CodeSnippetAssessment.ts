import mongoose, { Document, Schema, Types } from 'mongoose';

export type SnippetLanguage =
  | 'javascript' | 'typescript' | 'python' | 'java'
  | 'cpp' | 'c' | 'csharp' | 'go' | 'rust'
  | 'sql' | 'html' | 'css' | 'php' | 'ruby' | 'kotlin' | 'swift';

export type SnippetQuestionType = 'text' | 'mcq_single' | 'mcq_multiple';

export interface ISnippetOption {
  text: string;
  isCorrect: boolean;
}

export interface ISnippetQuestion {
  _id?: Types.ObjectId;
  question: string;
  type: SnippetQuestionType;
  options: ISnippetOption[];
  marks: number;
}

export interface ICodeSnippetAssessment extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  title: string;
  description: string;
  language: SnippetLanguage;
  codeSnippet: string;
  questions: ISnippetQuestion[];
  totalMarks: number;
  courseId?: Types.ObjectId;
  subjectId?: Types.ObjectId;
  chapterId?: Types.ObjectId;
  topicId?: Types.ObjectId;
  batchIds: string[];
  status: 'draft' | 'published';
  dueDate?: Date;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SnippetOptionSchema = new Schema<ISnippetOption>({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
}, { _id: false });

const SnippetQuestionSchema = new Schema<ISnippetQuestion>({
  question: { type: String, required: true },
  type: { type: String, enum: ['text', 'mcq_single', 'mcq_multiple'], required: true },
  options: { type: [SnippetOptionSchema], default: [] },
  marks: { type: Number, required: true, min: 0, default: 1 },
});

const CodeSnippetAssessmentSchema = new Schema<ICodeSnippetAssessment>({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  language: {
    type: String,
    enum: ['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'sql', 'html', 'css', 'php', 'ruby', 'kotlin', 'swift'],
    required: true,
  },
  codeSnippet: { type: String, required: true },
  questions: { type: [SnippetQuestionSchema], default: [] },
  totalMarks: { type: Number, default: 0 },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
  chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },
  topicId: { type: Schema.Types.ObjectId, ref: 'Topic' },
  batchIds: [{ type: String }],
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  dueDate: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, required: true },
  updatedBy: { type: Schema.Types.ObjectId },
}, { timestamps: true });

export default mongoose.model<ICodeSnippetAssessment>('CodeSnippetAssessment', CodeSnippetAssessmentSchema);
