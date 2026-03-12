import mongoose, { Schema, Document } from 'mongoose';

export interface IInterview extends Document {
  studentId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  type: 'mock' | 'technical' | 'hr' | 'communication' | 'real';
  date: Date;
  interviewer?: mongoose.Types.ObjectId;
  interviewerName?: string;
  companyName?: string;
  duration?: number; // in minutes
  scores: {
    technical?: number;
    communication?: number;
    problemSolving?: number;
    confidence?: number;
    overall: number;
  };
  feedback?: string;
  strengths?: string[];
  improvements?: string[];
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  result?: 'pass' | 'fail' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterview>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch'
    },
    type: {
      type: String,
      enum: ['mock', 'technical', 'hr', 'communication', 'real'],
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    interviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    interviewerName: String,
    companyName: String,
    duration: Number,
    scores: {
      technical: { type: Number, min: 0, max: 100 },
      communication: { type: Number, min: 0, max: 100 },
      problemSolving: { type: Number, min: 0, max: 100 },
      confidence: { type: Number, min: 0, max: 100 },
      overall: { type: Number, min: 0, max: 100, required: true }
    },
    feedback: String,
    strengths: [String],
    improvements: [String],
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled'
    },
    result: {
      type: String,
      enum: ['pass', 'fail', 'pending']
    }
  },
  { timestamps: true }
);

export default mongoose.model<IInterview>('Interview', InterviewSchema);
