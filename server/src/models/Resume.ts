import mongoose, { Schema, Document } from 'mongoose';

export interface IResumeExperience {
  company: string;
  role: string;
  from: string;
  to: string;
  current: boolean;
  bullets: string[];
}

export interface IResumeEducation {
  degree: string;
  college: string;
  university?: string;
  year?: string;
  cgpa?: string;
}

export interface IResumeSkillGroup {
  category: string;
  items: string[];
}

export interface IResumeProject {
  name: string;
  tech: string[];
  description: string;
  link?: string;
}

export interface IResumeCertification {
  name: string;
  issuer: string;
  year?: string;
}

export interface IResumeSections {
  contact: {
    name: string;
    email: string;
    phone: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    location?: string;
  };
  summary: string;
  experience: IResumeExperience[];
  education: IResumeEducation[];
  skills: IResumeSkillGroup[];
  projects: IResumeProject[];
  certifications: IResumeCertification[];
}

export interface IResumeScoreBreakdown {
  contact: number;
  summary: number;
  experience: number;
  education: number;
  skills: number;
  projects: number;
  ats: number;
}

export interface IResumeSuggestion {
  section: string;
  issue: string;
  fix: string;
}

export interface IResumeScore {
  total: number;
  breakdown: IResumeScoreBreakdown;
  suggestions: IResumeSuggestion[];
  atsWarnings: string[];
  keywordsFound: string[];
  keywordsMissing: string[];
}

export type ResumeTemplate = 'classic' | 'modern' | 'minimal' | 'professional';

export interface IResume extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  mode: 'uploaded' | 'built';
  template: ResumeTemplate;
  sections: IResumeSections;
  score: IResumeScore | null;
  uploadedFileUrl?: string;
  shareToken?: string;
  version: number;
  scoredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSectionsSchema = new Schema({
  contact: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    location: { type: String, default: '' },
  },
  summary: { type: String, default: '' },
  experience: [{
    company: String, role: String, from: String, to: String,
    current: { type: Boolean, default: false }, bullets: [String]
  }],
  education: [{
    degree: String, college: String, university: String, year: String, cgpa: String
  }],
  skills: [{ category: String, items: [String] }],
  projects: [{ name: String, tech: [String], description: String, link: String }],
  certifications: [{ name: String, issuer: String, year: String }],
}, { _id: false });

const ResumeScoreSchema = new Schema({
  total: { type: Number, default: 0 },
  breakdown: {
    contact: { type: Number, default: 0 },
    summary: { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    education: { type: Number, default: 0 },
    skills: { type: Number, default: 0 },
    projects: { type: Number, default: 0 },
    ats: { type: Number, default: 0 },
  },
  suggestions: [{ section: String, issue: String, fix: String }],
  atsWarnings: [String],
  keywordsFound: [String],
  keywordsMissing: [String],
}, { _id: false });

const ResumeSchema = new Schema<IResume>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  mode: { type: String, enum: ['uploaded', 'built'], default: 'built' },
  template: { type: String, enum: ['classic', 'modern', 'minimal', 'professional'], default: 'classic' },
  sections: { type: ResumeSectionsSchema, default: () => ({}) },
  score: { type: ResumeScoreSchema, default: null },
  uploadedFileUrl: { type: String },
  shareToken: { type: String, index: true, sparse: true },
  version: { type: Number, default: 1 },
  scoredAt: { type: Date },
}, { timestamps: true });

export default mongoose.model<IResume>('Resume', ResumeSchema);
