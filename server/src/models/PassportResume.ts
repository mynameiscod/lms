import mongoose, { Document, Schema } from 'mongoose';
import { IResumeSections, IResumeScore } from './Resume';

/**
 * PassportResume — a Passport member's resume.
 *
 * Uses the SAME section shape as the LMS Resume model so the shared AI services
 * (resumeScoringService.scoreResume / improveResume) work untouched, but stays a
 * separate collection: Passport members are not LMS students, must not show up in
 * the LMS Resume Builder's lists, and their tenantId is a string here (Passport is
 * string-tenanted throughout) rather than an ObjectId.
 */

export interface IPassportResume extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  sections: IResumeSections;
  score: IResumeScore | null;
  scoredAt?: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const SectionsSchema = new Schema({
  contact: {
    name:      { type: String, default: '' },
    title:     { type: String, default: '' },
    email:     { type: String, default: '' },
    phone:     { type: String, default: '' },
    linkedin:  { type: String, default: '' },
    github:    { type: String, default: '' },
    portfolio: { type: String, default: '' },
    location:  { type: String, default: '' },
  },
  summary: { type: String, default: '' },
  experience: [{
    company: { type: String, default: '' },
    role:    { type: String, default: '' },
    from:    { type: String, default: '' },
    to:      { type: String, default: '' },
    current: { type: Boolean, default: false },
    bullets: [{ type: String }],
  }],
  education: [{
    degree: { type: String, default: '' },
    college:{ type: String, default: '' },
    university: { type: String, default: '' },
    year:   { type: String, default: '' },
    cgpa:   { type: String, default: '' },
  }],
  skills: [{ category: { type: String, default: '' }, items: [{ type: String }] }],
  projects: [{
    name: { type: String, default: '' },
    tech: [{ type: String }],
    description: { type: String, default: '' },
    link: { type: String, default: '' },
  }],
  certifications: [{
    name:   { type: String, default: '' },
    issuer: { type: String, default: '' },
    year:   { type: String, default: '' },
  }],
}, { _id: false });

const ScoreSchema = new Schema({
  total: { type: Number, default: 0 },
  breakdown: {
    contact: Number, summary: Number, experience: Number,
    education: Number, skills: Number, projects: Number, ats: Number,
  },
  suggestions: [{ section: String, issue: String, fix: String }],
  atsWarnings: [{ type: String }],
  keywordsFound: [{ type: String }],
  keywordsMissing: [{ type: String }],
}, { _id: false });

const PassportResumeSchema = new Schema<IPassportResume>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sections:  { type: SectionsSchema, default: () => ({}) },
    score:     { type: ScoreSchema, default: null },
    scoredAt:  { type: Date },
    version:   { type: Number, default: 1 },
  },
  { timestamps: true }
);

PassportResumeSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IPassportResume>('PassportResume', PassportResumeSchema);
