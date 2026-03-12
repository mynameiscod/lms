import mongoose, { Schema, Document } from 'mongoose';

export interface IExam extends Document {
  studentId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  examName: string;
  examType: 'internal' | 'external' | 'certification' | 'placement';
  date: Date;
  maxScore: number;
  scoredMarks: number;
  percentage: number;
  grade?: string;
  result: 'pass' | 'fail' | 'pending';
  remarks?: string;
  conductedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
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
    examName: {
      type: String,
      required: true
    },
    examType: {
      type: String,
      enum: ['internal', 'external', 'certification', 'placement'],
      default: 'internal'
    },
    date: {
      type: Date,
      required: true
    },
    maxScore: {
      type: Number,
      required: true,
      default: 100
    },
    scoredMarks: {
      type: Number,
      required: true,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    grade: String,
    result: {
      type: String,
      enum: ['pass', 'fail', 'pending'],
      default: 'pending'
    },
    remarks: String,
    conductedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Calculate percentage before saving
ExamSchema.pre('save', function(next) {
  if (this.maxScore > 0) {
    this.percentage = Math.round((this.scoredMarks / this.maxScore) * 100);
  }
  next();
});

export default mongoose.model<IExam>('Exam', ExamSchema);
