import mongoose, { Schema, Document } from 'mongoose';

export interface ITenantSettings {
  // Default Assignment Settings
  showExpectedOutput: boolean; // Default for new assignments
  showTestCaseResults: boolean; // Default for new assignments
  maxAttempts: number; // Default max attempts for assignments
  enablePlagiarismCheck: boolean; // Default plagiarism check setting
}

export interface IStudentFeatures {
  dashboard: boolean;
  myCourse: boolean;
  attendance: boolean;
  quizzes: boolean;
  assignments: boolean;
  mockInterviews: boolean;
}

export interface ITenant extends Document {
  name: string;
  description?: string;
  slug: string;
  logo?: string;
  website?: string;
  adminId: mongoose.Types.ObjectId;
  isActive: boolean;
  subscriptionPlan: 'free' | 'pro' | 'enterprise';
  settings: ITenantSettings;
  studentFeatures: IStudentFeatures;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema: Schema = new Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    description: { 
      type: String,
      trim: true 
    },
    slug: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true 
    },
    logo: { 
      type: String 
    },
    website: { 
      type: String 
    },
    adminId: { 
      type: mongoose.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    subscriptionPlan: { 
      type: String, 
      enum: ['free', 'pro', 'enterprise'], 
      default: 'free' 
    },
    settings: {
      showExpectedOutput: { type: Boolean, default: true },
      showTestCaseResults: { type: Boolean, default: true },
      maxAttempts: { type: Number, default: 3 },
      enablePlagiarismCheck: { type: Boolean, default: false }
    },
    studentFeatures: {
      dashboard: { type: Boolean, default: true },
      myCourse: { type: Boolean, default: true },
      attendance: { type: Boolean, default: true },
      quizzes: { type: Boolean, default: true },
      assignments: { type: Boolean, default: true },
      mockInterviews: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

export default mongoose.model<ITenant>('Tenant', TenantSchema);