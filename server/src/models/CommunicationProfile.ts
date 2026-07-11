import mongoose, { Schema, Document } from 'mongoose';

/**
 * The student's "communication profile" — the fill-in-the-gap data used to generate a
 * personalized self-introduction template and to give the AI evaluator real context so it
 * never invents skills, projects or education the student didn't provide.
 */
export interface ICommunicationProfile extends Document {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;

  fullName?: string;
  currentCity?: string;
  nativePlace?: string;
  degree?: string;
  specialization?: string;
  college?: string;
  graduationYear?: string;
  cgpaOrPercentage?: string;
  primarySkills?: string[];
  secondarySkills?: string[];
  trainingInstitute?: string;
  internshipDetails?: string;
  projectName?: string;
  projectObjective?: string;
  projectTechnologies?: string[];
  projectResponsibilities?: string;
  strengths?: string[];
  shortTermGoal?: string;
  longTermGoal?: string;
  targetRole?: string;
  targetCompanies?: string[];

  createdAt: Date;
  updatedAt: Date;
}

const CommunicationProfileSchema = new Schema<ICommunicationProfile>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },

    fullName: { type: String, trim: true },
    currentCity: { type: String, trim: true },
    nativePlace: { type: String, trim: true },
    degree: { type: String, trim: true },
    specialization: { type: String, trim: true },
    college: { type: String, trim: true },
    graduationYear: { type: String, trim: true },
    cgpaOrPercentage: { type: String, trim: true },
    primarySkills: { type: [String], default: [] },
    secondarySkills: { type: [String], default: [] },
    trainingInstitute: { type: String, trim: true },
    internshipDetails: { type: String, trim: true },
    projectName: { type: String, trim: true },
    projectObjective: { type: String, trim: true },
    projectTechnologies: { type: [String], default: [] },
    projectResponsibilities: { type: String, trim: true },
    strengths: { type: [String], default: [] },
    shortTermGoal: { type: String, trim: true },
    longTermGoal: { type: String, trim: true },
    targetRole: { type: String, trim: true },
    targetCompanies: { type: [String], default: [] },
  },
  { timestamps: true }
);

CommunicationProfileSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<ICommunicationProfile>('CommunicationProfile', CommunicationProfileSchema);
