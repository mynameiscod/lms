import mongoose, { Schema, Document } from 'mongoose';

export type JobStatus = 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected';
export const JOB_STATUSES: JobStatus[] = ['wishlist', 'applied', 'interviewing', 'offer', 'rejected'];

export interface IJobApplication extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  company: string;
  role: string;
  location?: string;
  workMode?: 'onsite' | 'remote' | 'hybrid' | '';
  jobUrl?: string;
  salary?: string;
  source?: string;               // LinkedIn / Naukri / Referral / Company site …
  status: JobStatus;
  appliedAt?: Date;
  contactName?: string;
  contactEmail?: string;
  nextAction?: string;           // e.g. "Follow up with recruiter"
  nextActionAt?: Date;
  notes?: string;
  order: number;                 // position within its status column
  createdAt: Date;
  updatedAt: Date;
}

const JobApplicationSchema = new Schema<IJobApplication>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company:   { type: String, required: true, trim: true },
    role:      { type: String, required: true, trim: true },
    location:  { type: String, trim: true },
    workMode:  { type: String, enum: ['onsite', 'remote', 'hybrid', ''], default: '' },
    jobUrl:    { type: String, trim: true },
    salary:    { type: String, trim: true },
    source:    { type: String, trim: true },
    status:    { type: String, enum: JOB_STATUSES, default: 'wishlist', index: true },
    appliedAt: { type: Date },
    contactName:  { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    nextAction:   { type: String, trim: true },
    nextActionAt: { type: Date },
    notes:     { type: String },
    order:     { type: Number, default: 0 },
  },
  { timestamps: true }
);
JobApplicationSchema.index({ tenantId: 1, studentId: 1, status: 1, order: 1 });

export default mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema);
