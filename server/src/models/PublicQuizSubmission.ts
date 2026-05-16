import mongoose, { Schema, Document } from 'mongoose';

export interface IPublicQuizSubmission extends Document {
  _id: string;
  tenantId: string;

  // Registrant identity
  email: string;
  name: string;
  registrationData: Record<string, any>;

  // Which week this registration belongs to (e.g. "Week 1", "Week 3 – Java Battle")
  weekLabel?: string;
  isPreRegistration?: boolean;

  // Admin approval
  isApproved?: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;

  // Quiz assignment (set on approval)
  quizId?: string;
  quizToken?: string;       // unique token → becomes the candidate's quiz URL

  // Quiz session (filled when candidate takes the quiz)
  quizStartedAt?: Date;
  quizCompletedAt?: Date;
  timeSpentSeconds?: number;
  score?: number;
  totalMarks?: number;
  percentage?: number;
  passed?: boolean;
  rank?: number;

  // Uploaded files (photo, ID card, etc.)
  uploadedFiles?: Array<{ fieldName: string; filePath: string; mimeType: string; originalName: string }>;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const publicQuizSubmissionSchema = new Schema<IPublicQuizSubmission>(
  {
    tenantId: { type: String, required: true, index: true },
    email:    { type: String, required: true, lowercase: true, trim: true },
    name:     { type: String, required: true },
    registrationData: { type: Schema.Types.Mixed, default: {} },

    weekLabel:        { type: String, trim: true },
    isPreRegistration:{ type: Boolean, default: false },

    isApproved:      { type: Boolean },
    approvedBy:      { type: String },
    approvedAt:      { type: Date },
    rejectionReason: { type: String },

    quizId:    { type: String },
    quizToken: { type: String, sparse: true, unique: true },

    quizStartedAt:    { type: Date },
    quizCompletedAt:  { type: Date },
    timeSpentSeconds: { type: Number },
    score:       { type: Number },
    totalMarks:  { type: Number },
    percentage:  { type: Number },
    passed:      { type: Boolean },
    rank:        { type: Number },

    uploadedFiles: [{
      fieldName:    { type: String },
      filePath:     { type: String },
      mimeType:     { type: String },
      originalName: { type: String },
      _id: false
    }],

    ipAddress: String,
    userAgent: String
  },
  { timestamps: true }
);

publicQuizSubmissionSchema.index({ tenantId: 1, createdAt: -1 });
publicQuizSubmissionSchema.index({ tenantId: 1, email: 1 });
publicQuizSubmissionSchema.index({ tenantId: 1, weekLabel: 1, rank: 1 });

export default mongoose.model<IPublicQuizSubmission>('PublicQuizSubmission', publicQuizSubmissionSchema);
