import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISubmissionAnswer {
  questionId: Types.ObjectId;
  selectedOptions: string[];
  textAnswer: string;
  explanation: string;
}

export interface ISubmissionGrade {
  questionId: Types.ObjectId;
  marksAwarded: number;
  feedback: string;
}

export interface ICodeSnippetSubmission extends Document {
  _id: Types.ObjectId;
  assessmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  tenantId: Types.ObjectId;
  answers: ISubmissionAnswer[];
  status: 'submitted' | 'grading' | 'graded';
  grades: ISubmissionGrade[];
  totalMarksAwarded: number;
  overallFeedback: string;
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionAnswerSchema = new Schema<ISubmissionAnswer>({
  questionId: { type: Schema.Types.ObjectId, required: true },
  selectedOptions: [{ type: String }],
  textAnswer: { type: String, default: '' },
  explanation: { type: String, default: '' },
}, { _id: false });

const SubmissionGradeSchema = new Schema<ISubmissionGrade>({
  questionId: { type: Schema.Types.ObjectId, required: true },
  marksAwarded: { type: Number, default: 0 },
  feedback: { type: String, default: '' },
}, { _id: false });

const CodeSnippetSubmissionSchema = new Schema<ICodeSnippetSubmission>({
  assessmentId: { type: Schema.Types.ObjectId, required: true, ref: 'CodeSnippetAssessment', index: true },
  studentId: { type: Schema.Types.ObjectId, required: true, index: true },
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  answers: { type: [SubmissionAnswerSchema], default: [] },
  status: { type: String, enum: ['submitted', 'grading', 'graded'], default: 'submitted' },
  grades: { type: [SubmissionGradeSchema], default: [] },
  totalMarksAwarded: { type: Number, default: 0 },
  overallFeedback: { type: String, default: '' },
  gradedBy: { type: Schema.Types.ObjectId },
  gradedAt: { type: Date },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// One submission per student per assessment
CodeSnippetSubmissionSchema.index({ assessmentId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<ICodeSnippetSubmission>('CodeSnippetSubmission', CodeSnippetSubmissionSchema);
