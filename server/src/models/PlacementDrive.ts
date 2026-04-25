import mongoose, { Schema, Document } from 'mongoose';

/**
 * PlacementDrive — a company recruitment event at the college.
 * Completely independent model; never modifies existing models.
 */
export interface IDriveRound {
  name: string;           // "Aptitude Test", "Technical Round 1", "HR Interview"
  date?: Date;
  venue?: string;
  description?: string;
}

export type ApplicantStatus = 'applied' | 'shortlisted' | 'selected' | 'rejected' | 'placed';

export interface IPlacementDrive extends Document {
  tenantId: mongoose.Types.ObjectId;
  companyName: string;
  companyLogo?: string;
  role: string;                         // "Software Engineer", "Data Analyst"
  ctcMin?: number;                      // LPA
  ctcMax?: number;
  location?: string;
  driveType: 'on-campus' | 'off-campus' | 'virtual';
  eligibility: {
    minCgpa?: number;
    allowedBranches?: string[];         // dept codes e.g. ["CSE","IT"]
    allowedYears?: number[];            // [3,4]
    maxBacklogs?: number;
  };
  description?: string;
  jdUrl?: string;                       // Job description PDF link
  applyDeadline?: Date;
  driveDate?: Date;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  applicants: mongoose.Types.ObjectId[];  // User _ids who expressed interest
  applicantStatuses: Map<string, ApplicantStatus>; // userId → status
  rounds: IDriveRound[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PlacementDriveSchema: Schema = new Schema(
  {
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    companyName: { type: String, required: true, trim: true },
    companyLogo: { type: String },
    role: { type: String, required: true, trim: true },
    ctcMin: { type: Number },
    ctcMax: { type: Number },
    location: { type: String },
    driveType: {
      type: String,
      enum: ['on-campus', 'off-campus', 'virtual'],
      default: 'on-campus'
    },
    eligibility: {
      minCgpa: { type: Number },
      allowedBranches: [{ type: String }],
      allowedYears: [{ type: Number }],
      maxBacklogs: { type: Number, default: 0 }
    },
    description: { type: String },
    jdUrl: { type: String },
    applyDeadline: { type: Date },
    driveDate: { type: Date },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming'
    },
    applicants: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    applicantStatuses: { type: Map, of: String, default: {} },
    rounds: [
      {
        name: { type: String, required: true },
        date: { type: Date },
        venue: { type: String },
        description: { type: String }
      }
    ],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

PlacementDriveSchema.index({ tenantId: 1, status: 1, isActive: 1 });
PlacementDriveSchema.index({ tenantId: 1, applyDeadline: 1 });

export default mongoose.model<IPlacementDrive>('PlacementDrive', PlacementDriveSchema);
