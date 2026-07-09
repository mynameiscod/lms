import mongoose, { Schema, Document } from 'mongoose';

// A job/internship opening referred by an alumnus for current students.
// Admin posts it (linked to an alumnus); students see open ones and express interest.
export interface IAlumniReferral extends Document {
  tenantId: mongoose.Types.ObjectId;
  alumniId?: mongoose.Types.ObjectId;
  alumniName: string;
  company: string;
  role: string;
  location?: string;
  workMode?: 'onsite' | 'remote' | 'hybrid';
  ctc?: string;
  description?: string;
  applyUrl?: string;
  contactEmail?: string;
  skills?: string[];
  deadline?: Date;
  status: 'open' | 'closed' | 'filled';
  interested: { studentId: mongoose.Types.ObjectId; studentName: string; at: Date }[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AlumniReferralSchema = new Schema<IAlumniReferral>(
  {
    tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    alumniId:   { type: Schema.Types.ObjectId, ref: 'Alumni' },
    alumniName: { type: String, default: '' },
    company:    { type: String, required: true },
    role:       { type: String, required: true },
    location:   { type: String },
    workMode:   { type: String, enum: ['onsite', 'remote', 'hybrid'] },
    ctc:        { type: String },
    description:{ type: String },
    applyUrl:   { type: String },
    contactEmail:{ type: String },
    skills:     { type: [String], default: [] },
    deadline:   { type: Date },
    status:     { type: String, enum: ['open', 'closed', 'filled'], default: 'open' },
    interested: { type: [{ studentId: { type: Schema.Types.ObjectId, ref: 'User' }, studentName: String, at: Date, _id: false }], default: [] },
    createdBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
AlumniReferralSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export default mongoose.model<IAlumniReferral>('AlumniReferral', AlumniReferralSchema);
