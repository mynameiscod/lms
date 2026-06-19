import mongoose, { Schema, Document } from 'mongoose';

/**
 * CareerProfile — the "Career Profile Builder": one per student. Holds the
 * student's submitted inputs (target role, GitHub, pasted LinkedIn), the AI
 * review results (score + issues + improved content) for each pillar, and the
 * trainer review workflow state.
 */

export interface IIssue { area: string; problem: string; fix: string; severity?: 'high' | 'medium' | 'low'; }

export interface IPillarReview {
  score: number;                 // 0-100
  issues: IIssue[];
  improved: any;                 // structured suggestions (shape differs per pillar)
  reviewedAt?: Date;
}

export interface ICareerProfile extends Document {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  studentEmail: string;
  batchId?: mongoose.Types.ObjectId;
  batchName?: string;
  targetRole: string;

  githubUrl: string;
  githubUsername: string;
  linkedinUrl: string;
  linkedinPasted: string;        // student-pasted headline/about/experience
  resumeId?: mongoose.Types.ObjectId;

  resume: IPillarReview & { resumeId?: mongoose.Types.ObjectId };
  github: IPillarReview;
  linkedin: IPillarReview;

  status: 'draft' | 'submitted' | 'in_review' | 'reviewed' | 'completed';
  reviewerNotes: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  lastReviewRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const pillar = () => ({ score: { type: Number, default: 0 }, issues: { type: [Schema.Types.Mixed], default: [] }, improved: { type: Schema.Types.Mixed, default: {} }, reviewedAt: Date });

const CareerProfileSchema = new Schema<ICareerProfile>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName:  { type: String, default: '' },
    studentEmail: { type: String, default: '' },
    batchId:      { type: Schema.Types.ObjectId, ref: 'Batch' },
    batchName:    { type: String },
    targetRole:   { type: String, default: '' },

    githubUrl:      { type: String, default: '' },
    githubUsername: { type: String, default: '' },
    linkedinUrl:    { type: String, default: '' },
    linkedinPasted: { type: String, default: '' },
    resumeId:       { type: Schema.Types.ObjectId, ref: 'Resume' },

    resume:   { type: new Schema(pillar(), { _id: false }), default: () => ({}) },
    github:   { type: new Schema(pillar(), { _id: false }), default: () => ({}) },
    linkedin: { type: new Schema(pillar(), { _id: false }), default: () => ({}) },

    status:        { type: String, enum: ['draft', 'submitted', 'in_review', 'reviewed', 'completed'], default: 'draft' },
    reviewerNotes: { type: String, default: '' },
    reviewedBy:    { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt:    { type: Date },
    lastReviewRunAt: { type: Date },
  },
  { timestamps: true }
);

CareerProfileSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });
CareerProfileSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<ICareerProfile>('CareerProfile', CareerProfileSchema);
