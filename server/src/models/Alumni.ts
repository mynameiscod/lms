import mongoose, { Schema, Document } from 'mongoose';

/**
 * Alumni — tracks college alumni within a tenant.
 * Independent model; never modifies User.ts or CollegeMembership.ts.
 */
export interface IAlumni extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;          // Optional link to a User account
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  graduationYear: number;
  department?: string;                        // e.g. "Computer Science", "Mechanical"
  rollNumber?: string;
  // Current employment
  currentCompany?: string;
  currentRole?: string;
  currentLocation?: string;
  ctcPackage?: number;                        // LPA
  // LinkedIn / social
  linkedInUrl?: string;
  // Testimonial / profile
  testimonial?: string;
  story?: string;                             // longer success story for the showcase
  featured?: boolean;                         // pinned to the Success Stories showcase
  profilePicture?: string;
  isAvailableForMentoring: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AlumniSchema: Schema = new Schema(
  {
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: mongoose.Types.ObjectId, ref: 'User', default: null },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String },
    graduationYear: { type: Number, required: true },
    department: { type: String },
    rollNumber: { type: String },
    currentCompany: { type: String },
    currentRole: { type: String },
    currentLocation: { type: String },
    ctcPackage: { type: Number, default: null },
    linkedInUrl: { type: String },
    testimonial: { type: String },
    story: { type: String },
    featured: { type: Boolean, default: false },
    profilePicture: { type: String },
    isAvailableForMentoring: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AlumniSchema.index({ tenantId: 1, isActive: 1 });
AlumniSchema.index({ tenantId: 1, graduationYear: 1 });

export default mongoose.model<IAlumni>('Alumni', AlumniSchema);
