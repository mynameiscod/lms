import mongoose, { Schema, Document } from 'mongoose';

export interface IEligibilityFlag {
  fieldId: string;
  fieldLabel: string;
  value: string;
  rule: string; // human-readable, e.g. "must equal 2024"
}

export interface IPublicQuizSubmission extends Document {
  _id: string;
  publicQuizConfigId: mongoose.Types.ObjectId;
  quizId: string;
  tenantId: string;

  // Registrant identity
  email: string;
  name: string;
  registrationData: Record<string, any>; // {fieldId: value}

  // Eligibility
  eligibilityStatus: 'qualified' | 'flagged';
  eligibilityFlags: IEligibilityFlag[];

  // Attempt control
  attemptNumber: number; // how many times this email has submitted the form (tracks curiosity)
  canTakeQuiz: boolean;  // false after first quiz attempt — form re-submits are tracked but blocked

  // Quiz result (filled after quiz is taken)
  quizAttemptId?: mongoose.Types.ObjectId;
  score?: number;
  totalMarks?: number;
  percentage?: number;
  passed?: boolean;
  completedAt?: Date;

  // Share token for certificate access
  shareToken?: string;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const publicQuizSubmissionSchema = new Schema<IPublicQuizSubmission>(
  {
    publicQuizConfigId: { type: Schema.Types.ObjectId, ref: 'PublicQuizConfig', required: true, index: true },
    quizId: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },

    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    registrationData: { type: Schema.Types.Mixed, default: {} },

    eligibilityStatus: {
      type: String,
      enum: ['qualified', 'flagged'],
      default: 'qualified'
    },
    eligibilityFlags: [
      {
        fieldId: String,
        fieldLabel: String,
        value: String,
        rule: String,
        _id: false
      }
    ],

    attemptNumber: { type: Number, default: 1 },
    canTakeQuiz: { type: Boolean, default: true },

    quizAttemptId: { type: Schema.Types.ObjectId, ref: 'QuizAttempt' },
    score: Number,
    totalMarks: Number,
    percentage: Number,
    passed: Boolean,
    completedAt: Date,

    shareToken: { type: String, index: true },
    ipAddress: String,
    userAgent: String
  },
  { timestamps: true }
);

publicQuizSubmissionSchema.index({ publicQuizConfigId: 1, email: 1 });
publicQuizSubmissionSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<IPublicQuizSubmission>('PublicQuizSubmission', publicQuizSubmissionSchema);
