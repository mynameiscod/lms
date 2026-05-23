import mongoose, { Document, Schema } from 'mongoose';

export interface ICriterionRating {
  key: string;
  label: string;
  score: number;              // 1-10
  status: 'good' | 'average' | 'poor';
  comment?: string;
}

export interface IInterviewScheduleFeedback extends Document {
  tenantId: mongoose.Types.ObjectId;
  interviewId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  attendanceStatus: 'present' | 'absent';
  criteriaRatings: ICriterionRating[];
  overallComment?: string;
  overallScore?: number;      // auto-average of scores
  submittedBy: mongoose.Types.ObjectId;
  submittedAt?: Date;
  releasedToStudent: boolean;
  releasedAt?: Date;
  releasedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CriterionRatingSchema = new Schema<ICriterionRating>(
  {
    key:     { type: String, required: true },
    label:   { type: String, required: true },
    score:   { type: Number, min: 1, max: 10, required: true },
    status:  { type: String, enum: ['good', 'average', 'poor'], required: true },
    comment: { type: String, default: '' },
  },
  { _id: false }
);

const InterviewScheduleFeedbackSchema = new Schema<IInterviewScheduleFeedback>(
  {
    tenantId:         { type: Schema.Types.ObjectId, required: true, ref: 'Tenant', index: true },
    interviewId:      { type: Schema.Types.ObjectId, required: true, ref: 'ScheduledInterview', index: true },
    studentId:        { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    attendanceStatus: { type: String, enum: ['present', 'absent'], default: 'present' },
    criteriaRatings:  { type: [CriterionRatingSchema], default: [] },
    overallComment:   { type: String, default: '' },
    overallScore:     { type: Number },
    submittedBy:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submittedAt:      { type: Date },
    releasedToStudent:{ type: Boolean, default: false },
    releasedAt:       { type: Date },
    releasedBy:       { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

InterviewScheduleFeedbackSchema.index({ interviewId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IInterviewScheduleFeedback>(
  'InterviewScheduleFeedback',
  InterviewScheduleFeedbackSchema
);
