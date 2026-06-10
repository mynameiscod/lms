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
  topicHub?: boolean;
  attendance: boolean;
  quizzes: boolean;
  assignments: boolean;
  mockInterviews: boolean;
  codingSnippets?: boolean;
  classHub?: boolean;
  feeDetails?: boolean;
  scheduledInterviews?: boolean;
  resumeBuilder?: boolean;
  learningPlan?: boolean;
}

// Platform-level module gates set by SUPER_ADMIN (applies to ALL roles in the tenant)
export interface ITenantModules {
  courses: boolean;          // Courses, Course Mgmt, My Course, Topic Hub
  attendance: boolean;       // Entire attendance module
  quizzes: boolean;          // Entire quiz module
  assignments: boolean;      // Entire assignments module
  classRecordings: boolean;  // Class recordings + Class Hub
  codeAssessments: boolean;  // Code snippets / assessments
  mockInterviews: boolean;   // Mock interviews
  placement: boolean;        // CRT: Placement drives, alumni, student applications
  leads: boolean;            // CRM / Leads module
  marketing: boolean;        // Marketing module
  feeManagement: boolean;    // Fee Management — seat reservations, payments, receipts
}

// College-specific information (only populated when type = 'college')
export interface ICollegeInfo {
  universityName?: string;
  collegeCode?: string;
  collegeType?: 'engineering' | 'arts' | 'polytechnic' | 'management' | 'other';
  accreditation?: string;       // e.g. "NAAC-A+", "NBA"
  establishedYear?: number;
  totalStrength?: number;
  address?: {
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  placementOfficerEmail?: string;
  placementOfficerPhone?: string;
}

// Per-tenant fee-receipt configuration (all optional — falls back to defaults)
export interface IReceiptSettings {
  instituteName?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  signatureUrl?: string;
  authorizedSignatory?: string;
  tagline?: string;
  receiptPrefix?: string;
  defaultMode?: string;
  defaultMentor?: string;
  upiId?: string;
  qrUrl?: string;
  showQr?: boolean;
  notes?: string[];
  socials?: { label: string; url: string }[];
}

// White-label branding (all optional — existing tenants get safe defaults)
export interface IBranding {
  primaryColor?: string;        // e.g. "#6650d8"
  secondaryColor?: string;      // e.g. "#38bdf8"
  portalTitle?: string;         // Shown in browser tab & nav header
  welcomeMessage?: string;      // Shown on student login
  faviconUrl?: string;
  coverImageUrl?: string;
  hideCodeBegunBranding?: boolean;
  customDomain?: string;        // e.g. "lms.stmarys.edu"
}

export interface ITenant extends Document {
  name: string;
  description?: string;
  slug: string;
  logo?: string;
  website?: string;
  adminId: mongoose.Types.ObjectId;
  isActive: boolean;
  type: 'institute' | 'college' | 'corporate' | 'codebegun';
  subscriptionPlan: 'free' | 'pro' | 'enterprise';
  settings: ITenantSettings;
  studentFeatures: IStudentFeatures;
  modules: ITenantModules;
  collegeInfo?: ICollegeInfo;
  branding?: IBranding;
  receipt?: IReceiptSettings;
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
    type: {
      type: String,
      enum: ['institute', 'college', 'corporate', 'codebegun'],
      default: 'institute'
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
      topicHub: { type: Boolean, default: true },
      attendance: { type: Boolean, default: true },
      quizzes: { type: Boolean, default: true },
      assignments: { type: Boolean, default: true },
      mockInterviews: { type: Boolean, default: true },
      codingSnippets: { type: Boolean, default: true },
      classHub: { type: Boolean, default: true },
      feeDetails: { type: Boolean, default: true },
      scheduledInterviews: { type: Boolean, default: true },
      resumeBuilder: { type: Boolean, default: true },
      learningPlan: { type: Boolean, default: true }
    },
    // Platform-level module gates — set by SUPER_ADMIN, apply to ALL roles in the tenant
    modules: {
      courses:          { type: Boolean, default: true },
      attendance:       { type: Boolean, default: true },
      quizzes:          { type: Boolean, default: true },
      assignments:      { type: Boolean, default: true },
      classRecordings:  { type: Boolean, default: true },
      codeAssessments:  { type: Boolean, default: true },
      mockInterviews:   { type: Boolean, default: true },
      placement:        { type: Boolean, default: true },
      leads:            { type: Boolean, default: true },
      marketing:        { type: Boolean, default: true },
      feeManagement:    { type: Boolean, default: true }
    },
    // College-specific info — all optional, existing tenants unaffected
    collegeInfo: {
      universityName: { type: String },
      collegeCode: { type: String },
      collegeType: {
        type: String,
        enum: ['engineering', 'arts', 'polytechnic', 'management', 'other']
      },
      accreditation: { type: String },
      establishedYear: { type: Number },
      totalStrength: { type: Number },
      address: {
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
        country: { type: String, default: 'India' }
      },
      placementOfficerEmail: { type: String },
      placementOfficerPhone: { type: String }
    },
    // White-label branding — all optional, safe defaults applied on frontend
    branding: {
      primaryColor: { type: String, default: null },
      secondaryColor: { type: String, default: null },
      portalTitle: { type: String, default: null },
      welcomeMessage: { type: String, default: null },
      faviconUrl: { type: String, default: null },
      coverImageUrl: { type: String, default: null },
      hideCodeBegunBranding: { type: Boolean, default: false },
      customDomain: { type: String, default: null }
    },
    // Per-tenant fee-receipt configuration — all optional, defaults applied in code
    receipt: {
      instituteName: { type: String },
      address: { type: String },
      phone: { type: String },
      email: { type: String },
      website: { type: String },
      logoUrl: { type: String },
      signatureUrl: { type: String },
      authorizedSignatory: { type: String },
      tagline: { type: String },
      receiptPrefix: { type: String },
      defaultMode: { type: String },
      defaultMentor: { type: String },
      upiId: { type: String },
      qrUrl: { type: String },
      showQr: { type: Boolean, default: false },
      notes: { type: [String], default: undefined },
      socials: { type: [{ label: String, url: String }], default: undefined }
    }
  },
  { timestamps: true }
);

export default mongoose.model<ITenant>('Tenant', TenantSchema);