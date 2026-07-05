import mongoose, { Schema, Document } from 'mongoose';
import {
  ASSESSMENT_DIMENSIONS,
  ASSESSMENT_ITEM_TYPES,
  CANDIDATE_SEGMENTS,
  AssessmentDimension,
  AssessmentItemType,
  CandidateSegment,
} from '../constants/assessment';

/**
 * AssessmentSubmission — a single candidate's run through the assessment:
 * their registration inputs, the composed exam, their responses + grading,
 * the resulting sub-scores / Readiness Score / percentile, the generated
 * roadmap, and the link to the CRM Lead created from them.
 */

// ─── Candidate registration inputs (drive the blueprint + enrich the lead) ───
export interface ICandidateInputs {
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  city?: string;
  segment: CandidateSegment;
  year?: string;              // for students (e.g. "1st", "Final")
  yearsExperience?: number;   // for professionals
  primaryLanguage?: string;   // primary programming language
  currentStack?: string[];
  currentPackage?: number;    // current CTC in LPA
  targetRole?: string;
  targetCompany?: string;
  targetSalary?: number;      // target CTC in LPA
  linkedinUrl?: string;
  githubUrl?: string;
}

// ─── Profile-level scores (merged with exam dimensions into the 8 named sub-scores) ──
export interface IProfileScores {
  resume?: number;             // 0–100 (ATS of the uploaded resume)
  github?: number;             // 0–100 (public GitHub heuristic)
  linkedin?: number;           // 0–100 (from manual LinkedIn data — Module 7)
  communication?: number;      // 0–100 (AI-scored written pitch)
  interviewReadiness?: number; // 0–100 (from a mock interview — Interview module)
}

// ─── Per-item response + grading ─────────────────────────────────────────────
export interface ISubmissionItem {
  itemId: mongoose.Types.ObjectId;
  type: AssessmentItemType;
  dimension: AssessmentDimension;
  difficulty: number;
  stage: number;
  optional: boolean;          // mobile bonus (keyboard-only) items are optional

  // candidate response (shape depends on type)
  selectedOptionIds?: string[];
  predictedOutput?: string;
  blankAnswers?: Record<string, string>;
  identifiedLine?: number;
  code?: string;

  // grading
  graded: boolean;
  isCorrect?: boolean;
  score: number;              // points awarded
  maxScore: number;
  testCasesPassed?: number;
  testCasesTotal?: number;
  timeSpentSeconds?: number;
}

export interface IStageDecision {
  stage: number;
  runningScorePct: number;
  nextDifficultyBand?: [number, number];
}

export interface ISubScore {
  dimension: AssessmentDimension;
  correct: number;
  total: number;
  percentage: number;
}

export interface IRoadmap {
  generatedAt: Date;
  planId?: mongoose.Types.ObjectId; // selected Learning Plan / enrollment
  planTitle?: string;
  gaps: string[];
  narrative: string;
  targetRole?: string;
  salaryBand?: string;
  timelineWeeks?: number;
  generatedBy?: string; // model id
}

export type SubmissionStatus =
  | 'registered'    // inputs captured, exam not started
  | 'in_progress'
  | 'submitted'     // graded
  | 'abandoned';

export interface IAssessmentSubmission extends Document {
  tenantId: string;
  publicConfigId?: mongoose.Types.ObjectId; // which landing/config funneled them
  blueprintId?: mongoose.Types.ObjectId;
  token: string;                 // opaque session token (public URL)

  candidate: ICandidateInputs;
  isMobile: boolean;
  phoneVerified: boolean;

  // Resume + auto-created account (v2)
  resumeFilePath?: string;
  resumeText?: string;
  parsedSkills?: string[];
  communicationText?: string;      // candidate's written pitch (scored for communication)
  profileScores?: IProfileScores;
  careerReadinessScore?: number;   // composite of exam readiness + profile scores
  candidateUserId?: mongoose.Types.ObjectId; // the Student account auto-created for this candidate
  accountCreatedAt?: Date;
  accountIsNew?: boolean;                     // true = we created a fresh account; false = attached to an existing one

  designedBlueprint?: any;       // AI-designed, per-candidate blueprint (v2)
  examDesignStatus?: 'pending' | 'ready' | 'failed';
  blueprintSnapshot?: any;       // frozen copy of the blueprint at compose time
  items: ISubmissionItem[];
  currentStage: number;          // 0-based index of the stage in progress (adaptive flow)
  stageHistory: IStageDecision[];

  subScores: ISubScore[];
  readinessScore?: number;       // 0–100 composite
  percentile?: number;           // vs same-segment finishers

  roadmap?: IRoadmap;
  leadId?: mongoose.Types.ObjectId;

  status: SubmissionStatus;
  antiCheatFlags: string[];      // e.g. ['tab_switch', 'time_anomaly']

  utmParams?: Record<string, string>;
  sourceDetails?: Record<string, any>;

  // OTP debug trail — so the funnel is observable even after the ephemeral OTP
  // record is purged (why "OTP not coming" / verify failures happened).
  otp?: {
    sentAt?: Date;
    channel?: string;        // 'whatsapp' | 'none' (none = send failed → dev-mode)
    sent?: boolean;
    lastReason?: string;     // last verify outcome (invalid / expired / not_found / ok)
    verifiedAt?: Date;
    attempts?: number;
    resends?: number;
  };

  startedAt?: Date;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionItemSchema = new Schema<ISubmissionItem>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'AssessmentItem', required: true },
    type: { type: String, enum: ASSESSMENT_ITEM_TYPES as unknown as string[], required: true },
    dimension: { type: String, enum: ASSESSMENT_DIMENSIONS as unknown as string[], required: true },
    difficulty: { type: Number, required: true },
    stage: { type: Number, default: 1 },
    optional: { type: Boolean, default: false },

    selectedOptionIds: { type: [String], default: undefined },
    predictedOutput: { type: String },
    blankAnswers: { type: Schema.Types.Mixed },
    identifiedLine: { type: Number },
    code: { type: String },

    graded: { type: Boolean, default: false },
    isCorrect: { type: Boolean },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    testCasesPassed: { type: Number },
    testCasesTotal: { type: Number },
    timeSpentSeconds: { type: Number },
  },
  { _id: false }
);

const SubScoreSchema = new Schema<ISubScore>(
  {
    dimension: { type: String, enum: ASSESSMENT_DIMENSIONS as unknown as string[], required: true },
    correct: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },
  { _id: false }
);

const AssessmentSubmissionSchema = new Schema<IAssessmentSubmission>(
  {
    tenantId: { type: String, required: true, index: true },
    publicConfigId: { type: Schema.Types.ObjectId, ref: 'PublicQuizConfig' },
    blueprintId: { type: Schema.Types.ObjectId, ref: 'AssessmentBlueprint' },
    token: { type: String, required: true, unique: true, index: true },

    candidate: {
      name: { type: String, required: true, trim: true },
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
      city: { type: String, trim: true },
      segment: { type: String, enum: CANDIDATE_SEGMENTS as unknown as string[], required: true },
      year: { type: String, trim: true },
      yearsExperience: { type: Number },
      primaryLanguage: { type: String, trim: true },
      currentStack: { type: [String], default: [] },
      currentPackage: { type: Number },
      targetRole: { type: String, trim: true },
      targetCompany: { type: String, trim: true },
      targetSalary: { type: Number },
      linkedinUrl: { type: String, trim: true },
      githubUrl: { type: String, trim: true },
    },
    isMobile: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },

    resumeFilePath: { type: String },
    resumeText: { type: String },
    parsedSkills: { type: [String], default: [] },
    communicationText: { type: String },
    profileScores: {
      resume: { type: Number },
      github: { type: Number },
      linkedin: { type: Number },
      communication: { type: Number },
      interviewReadiness: { type: Number },
      _id: false,
    },
    careerReadinessScore: { type: Number, min: 0, max: 100 },
    candidateUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    accountCreatedAt: { type: Date },
    accountIsNew: { type: Boolean },

    designedBlueprint: { type: Schema.Types.Mixed },
    examDesignStatus: { type: String, enum: ['pending', 'ready', 'failed'], default: undefined },
    blueprintSnapshot: { type: Schema.Types.Mixed },
    items: { type: [SubmissionItemSchema], default: [] },
    currentStage: { type: Number, default: 0 },
    stageHistory: {
      type: [
        new Schema(
          {
            stage: { type: Number, required: true },
            runningScorePct: { type: Number, default: 0 },
            nextDifficultyBand: { type: [Number], default: undefined },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    subScores: { type: [SubScoreSchema], default: [] },
    readinessScore: { type: Number, min: 0, max: 100 },
    percentile: { type: Number, min: 0, max: 100 },

    roadmap: {
      generatedAt: { type: Date },
      planId: { type: Schema.Types.ObjectId },
      planTitle: { type: String },
      gaps: { type: [String], default: [] },
      narrative: { type: String },
      targetRole: { type: String },
      salaryBand: { type: String },
      timelineWeeks: { type: Number },
      generatedBy: { type: String },
    },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },

    status: {
      type: String,
      enum: ['registered', 'in_progress', 'submitted', 'abandoned'],
      default: 'registered',
    },
    antiCheatFlags: { type: [String], default: [] },

    utmParams: { type: Schema.Types.Mixed },
    sourceDetails: { type: Schema.Types.Mixed },

    otp: {
      sentAt: { type: Date },
      channel: { type: String },
      sent: { type: Boolean },
      lastReason: { type: String },
      verifiedAt: { type: Date },
      attempts: { type: Number, default: 0 },
      resends: { type: Number, default: 0 },
    },

    startedAt: { type: Date },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

AssessmentSubmissionSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
AssessmentSubmissionSchema.index({ tenantId: 1, 'candidate.segment': 1, readinessScore: -1 });
AssessmentSubmissionSchema.index({ tenantId: 1, 'candidate.phone': 1 });

export default mongoose.model<IAssessmentSubmission>('AssessmentSubmission', AssessmentSubmissionSchema);
