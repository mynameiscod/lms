import mongoose, { Schema, Document } from 'mongoose';
import bcryptjs from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;
  tenantId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  batchJoinedDate?: Date;
  customRoleId?: mongoose.Types.ObjectId;
  managerId?: mongoose.Types.ObjectId;
  leadDataScope?: 'ALL' | 'TEAM' | 'OWN';
  dashboardWidgets?: string[];
  isActive: boolean;
  profileComplete: boolean;
  // CareerPilot membership (separate product; drives the /passport experience).
  // Absent/inactive = a normal LMS student, unaffected.
  passport?: {
    active: boolean;
    product?: string;          // e.g. 'career_passport'
    activatedAt?: Date;
    expiresAt?: Date;
    onboarded?: boolean;
    degree?: string;
    yearOfStudy?: string;
    // Career staging. yearOfStudy alone cannot drive content: a 3rd-year B.Sc is in
    // their final year while a 3rd-year B.Tech is mid-course. The graduation date can,
    // and `stage` is DERIVED from it so a member advances without anyone editing a record.
    program?: string;              // B.Tech | B.Sc | MCA | Diploma | …
    branch?: string;               // specialization, drives cs / non_cs
    graduationMonth?: number;      // 1-12
    graduationYear?: number;
    graduated?: boolean;
    stage?: string;                // foundation | build | placement | job_seeker
    background?: string;           // cs | non_cs | any
    stageComputedAt?: Date;
    careerGoal?: string;
    pathway?: string;
    city?: string;

    // ── CareerPilot career context ────────────────────────────────────────────────
    // Education above is a cached read of StudentProfile (see passportProfileSyncService).
    // These are different: they have no home on StudentProfile, because they are
    // statements about a CareerPilot plan rather than facts about a student.
    //
    // All optional. A member who joined before this existed has none of them and is
    // fully functional without them — every consumer must treat absence as "not asked".
    careerDomain?: string;         // CareerDomainKey; SOFTWARE_ENGINEERING is the only live one
    primaryRole?: string;          // CareerRole key, or NOT_SURE — a real answer, not a blank
    secondaryRole?: string;
    /**
     * Languages the member wants to WORK IN. Deliberately not
     * StudentProfile.technicalBackground.programmingLanguages, which records what they
     * already know: "I know C from college" and "I want to build in Java" are different
     * facts, and collapsing them would let a course they sat decide their plan.
     */
    preferredLanguages?: string[];
    preferredTechnologies?: string[];
    minutesPerDay?: number;        // integer minutes, never display text
    daysPerWeek?: number;
    /**
     * When CareerPilot's own onboarding was completed. Distinct from `onboarded`, which
     * signup sets to true immediately and therefore cannot answer this, and from
     * StudentProfile.isProfileComplete, which is about a different form entirely.
     */
    contextCompletedAt?: Date;
    /** Lets a later module tell which schema a stored context was captured under. */
    contextVersion?: number;
    /**
     * Companies this member is preparing for, by Company.slug.
     *
     * PREPARATION CONTEXT, NOT A CAREER DIRECTION. `primaryRole` above is what they want to
     * become and is untouched by any of this: a member targeting Amazon, Microsoft and TCS
     * is still one backend engineer, and company readiness is that same role measured
     * against three different sets of expectations.
     *
     * A short list on the member rather than a collection of its own. It is capped at a
     * handful, only ever read for this one member, and has no attributes worth querying
     * across — a collection would be a join for no gain.
     */
    targetCompanies?: { slug: string; primary: boolean; addedAt: Date }[];

    careerScore?: number;      // cached from latest assessment (for card/Mission Control)
    level?: string;
    /**
     * Which instrument produced `careerScore`.
     *
     * Absent means the legacy Career Readiness questionnaire, because every score that
     * predates role readiness came from it and backfilling a value onto historic members
     * would assert a migration that never happened. A member is only 'role_readiness' once
     * they have actually sat a skill assessment that covered enough of their blueprint.
     */
    careerScoreSource?: 'role_readiness' | 'legacy_questionnaire';
    careerScoreAt?: Date;
    /** How much of the role blueprint the score is based on, 0-100. */
    careerScoreCoverage?: number;
    careerScoreConfidence?: 'LOW' | 'MEDIUM' | 'HIGH';
    shareSlug?: string;        // public shareable CareerPilot card slug
    passwordSet?: boolean;     // member chose their own password (vs the signup placeholder)
  };
  phone?: string;
  avatar?: string;
  bio?: string;
  linkedin?: string;
  github?: string;
  // Canonical placement status (the single source of truth for "is this student placed").
  // Set by the placement service when a drive/partner marks the student placed.
  placement?: {
    status: 'not_placed' | 'placed' | 'multiple_offers';
    company?: string;
    role?: string;
    ctc?: number;              // LPA
    source?: 'drive' | 'partner' | 'manual';
    offers?: number;
    placedAt?: Date;
    driveId?: mongoose.Types.ObjectId;
    partnerId?: mongoose.Types.ObjectId;
  };
  resetToken?: string;
  resetTokenExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true,
      trim: true 
    },
    firstName: { 
      type: String, 
      required: true,
      trim: true 
    },
    lastName: { 
      type: String, 
      required: true,
      trim: true 
    },
    password: { 
      type: String, 
      required: true 
    },
    role: { 
      type: String, 
      enum: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF', 'STUDENT', 'GUEST'], 
      default: 'STUDENT' 
    },
    tenantId: { 
      type: mongoose.Types.ObjectId, 
      ref: 'Tenant', 
      required: true 
    },
    batchId: {
      type: mongoose.Types.ObjectId,
      ref: 'Batch',
      default: null
    },
    batchJoinedDate: {
      type: Date,
      default: null
    },
    customRoleId: {
      type: mongoose.Types.ObjectId,
      ref: 'Role',
      default: null
    },
    managerId: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      default: null
    },
    leadDataScope: {
      type: String,
      enum: ['ALL', 'TEAM', 'OWN'],
      default: undefined
    },
    dashboardWidgets: {
      type: [String],
      default: null
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    profileComplete: {
      type: Boolean,
      default: false
    },
    passport: {
      program:         { type: String },
      branch:          { type: String },
      graduationMonth: { type: Number },
      graduationYear:  { type: Number },
      graduated:       { type: Boolean },
      stage:           { type: String, index: true },
      background:      { type: String },
      stageComputedAt: { type: Date },
      active:      { type: Boolean, default: false },
      product:     { type: String },
      activatedAt: { type: Date },
      expiresAt:   { type: Date },
      // Drop-off tracking. Signing up and proving you own the number are different
      // events, and until now only the first left a trace — so someone who never
      // entered their OTP looked identical to someone who verified and then stalled.
      // Absent on anyone who joined before this shipped; the funnel says so rather
      // than guessing.
      verifiedAt:  { type: Date },
      /** Touched on every login. What "gone quiet" is measured from. */
      lastSeenAt:  { type: Date },
      onboarded:   { type: Boolean, default: false },
      degree:      { type: String },
      yearOfStudy: { type: String },
      careerGoal:  { type: String },
      pathway:     { type: String },
      careerScore: { type: Number },
      level:       { type: String },
      careerScoreSource:     { type: String, enum: ['role_readiness', 'legacy_questionnaire'] },
      careerScoreAt:         { type: Date },
      careerScoreCoverage:   { type: Number },
      careerScoreConfidence: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
      city:        { type: String },

      // CareerPilot career context. Every field optional with no default, so an existing
      // member document is untouched until they actually complete onboarding — nothing
      // is backfilled and nothing is assumed on their behalf.
      careerDomain:          { type: String },
      primaryRole:           { type: String },
      secondaryRole:         { type: String },
      preferredLanguages:    { type: [String], default: undefined },
      preferredTechnologies: { type: [String], default: undefined },
      minutesPerDay:         { type: Number },
      daysPerWeek:           { type: Number },
      contextCompletedAt:    { type: Date },
      contextVersion:        { type: Number },

      // Companies the member is preparing for. `default: undefined` so a member who has
      // chosen none carries no array at all, exactly like the context fields above.
      targetCompanies: {
        type: [new Schema({
          slug:    { type: String, required: true },
          primary: { type: Boolean, default: false },
          addedAt: { type: Date, default: Date.now },
        }, { _id: false })],
        default: undefined,
      },

      shareSlug:   { type: String, index: true },
      passwordSet: { type: Boolean, default: false },
    },
    phone: {
      type: String,
      default: null
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      default: null
    },
    linkedin: {
      type: String,
      default: null
    },
    github: {
      type: String,
      default: null
    },
    placement: {
      type: {
        status: { type: String, enum: ['not_placed', 'placed', 'multiple_offers'], default: 'not_placed' },
        company: { type: String },
        role: { type: String },
        ctc: { type: Number },
        source: { type: String, enum: ['drive', 'partner', 'manual'] },
        offers: { type: Number, default: 0 },
        placedAt: { type: Date },
        driveId: { type: mongoose.Types.ObjectId, ref: 'PlacementDrive' },
        partnerId: { type: mongoose.Types.ObjectId, ref: 'PlacementPartner' },
        _id: false,
      },
      default: undefined,
    },
    resetToken: {
      type: String,
      default: null
    },
    resetTokenExpires: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre<IUser>('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return await bcryptjs.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);