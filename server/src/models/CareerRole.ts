import mongoose, { Schema, Document } from 'mongoose';

/**
 * A career direction a CareerPilot student can aim at.
 *
 * NOT an LMS authorization role. `role: 'STUDENT' | 'TENANT_ADMIN'` on User decides what
 * somebody may DO in the product; this decides what job they want to end up in. The name
 * is `CareerRole` throughout for exactly that reason — a model called `Role` next to an
 * RBAC system is a trap somebody eventually falls into.
 *
 * Also not a Pathway. `primaryRole` is what the student SAYS they want; `passport.pathway`
 * is what the assessment and the routing rules DECIDE they should study. Merging them
 * would let a scoring run silently overwrite a stated ambition.
 *
 * TENANT-SCOPED DOCUMENTS, SHARED VOCABULARY.
 * Every Passport config model is per-tenant, and admins need per-tenant control of which
 * roles they offer. But the KEYS come from one code-level catalogue, so BACKEND_ENGINEER
 * means the same thing in every tenant — without that, a later Skill Graph could not
 * compare two students who picked "the same" role at different colleges.
 *
 * THE KEY IS THE CONTRACT. Student records store `BACKEND_ENGINEER`, not an ObjectId, so
 * renaming the display name to "Backend Software Engineer" changes what a student reads
 * and nothing about what is stored. That is also why the key cannot be edited after
 * creation: it is a reference held by records this model cannot see.
 */

export interface ICareerRole extends Document {
  tenantId: string;
  domainKey: string;
  /** Stable, machine-readable, immutable. UPPER_SNAKE_CASE. */
  key: string;

  name: string;
  shortName?: string;
  description: string;
  /** Sub-label on the student's card, e.g. "APIs · Databases · Server-side". */
  studentDescription?: string;
  iconKey?: string;
  /** Alternate wordings, so admin search finds a role by a name they use internally. */
  aliases: string[];

  displayOrder: number;

  /** Usable by CareerPilot at all. Off = retired; existing students keep their value. */
  active: boolean;
  /** Offered in student onboarding. Off = no NEW student may pick it. */
  studentSelectable: boolean;

  /** Seeded by the product. Protects the original vocabulary from deletion. */
  systemRole: boolean;

  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** UPPER_SNAKE_CASE only. Enforced here so no path can write a key the API would reject. */
export const CAREER_ROLE_KEY_PATTERN = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

const CareerRoleSchema = new Schema<ICareerRole>(
  {
    tenantId:  { type: String, required: true, index: true },
    domainKey: { type: String, required: true },
    key: {
      type: String, required: true, uppercase: true, trim: true,
      validate: {
        validator: (v: string) => CAREER_ROLE_KEY_PATTERN.test(v),
        message: 'A role key must be uppercase words joined by underscores, e.g. PLATFORM_ENGINEER.',
      },
    },

    name:              { type: String, required: true, trim: true, maxlength: 80 },
    shortName:         { type: String, trim: true, maxlength: 40 },
    description:       { type: String, default: '', trim: true, maxlength: 600 },
    studentDescription:{ type: String, default: '', trim: true, maxlength: 160 },
    iconKey:           { type: String, trim: true, maxlength: 60 },
    aliases:           { type: [String], default: [] },

    displayOrder: { type: Number, default: 100 },

    active:            { type: Boolean, default: true },
    studentSelectable: { type: Boolean, default: true },
    systemRole:        { type: Boolean, default: false },

    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

// The duplicate-key guarantee, at the database rather than in application code that can
// drift. Two roles sharing a key would make a student's stored value ambiguous.
CareerRoleSchema.index({ tenantId: 1, key: 1 }, { unique: true });
// The student-options query: domain + both visibility flags, in display order.
CareerRoleSchema.index({ tenantId: 1, domainKey: 1, active: 1, studentSelectable: 1, displayOrder: 1 });

/**
 * The shared vocabulary every tenant is seeded from.
 *
 * These seven keys are exactly the ones Module 1 shipped hardcoded, so a student who
 * already stores BACKEND_ENGINEER resolves against a real record the moment this seeds —
 * no migration, no rewrite of any student document.
 *
 * NOT_SURE is deliberately absent. It is the absence of a decision rather than a career,
 * so it lives as a system onboarding option instead of a record an admin could delete or
 * rename into something that no longer means "I haven't chosen".
 */
export const SYSTEM_CAREER_ROLES: Array<Partial<ICareerRole> & { key: string; name: string }> = [
  {
    key: 'SOFTWARE_ENGINEER', name: 'Software Engineer', displayOrder: 10,
    description: 'Build software applications and systems using programming, problem solving and engineering fundamentals.',
    studentDescription: 'Applications · Problem solving · Engineering',
    iconKey: 'bi-code-slash', aliases: ['SDE', 'Software Developer', 'Application Developer'],
  },
  {
    key: 'BACKEND_ENGINEER', name: 'Backend Engineer', displayOrder: 20,
    description: 'Build APIs, business logic, databases and server-side systems that power applications.',
    studentDescription: 'APIs · Databases · Server-side systems',
    iconKey: 'bi-hdd-stack', aliases: ['Server Side Developer', 'API Developer'],
  },
  {
    key: 'FRONTEND_ENGINEER', name: 'Frontend Engineer', displayOrder: 30,
    description: 'Build responsive and interactive web experiences using modern frontend technologies.',
    studentDescription: 'Web UI · React · User experience',
    iconKey: 'bi-window', aliases: ['UI Developer', 'Web Developer'],
  },
  {
    key: 'FULLSTACK_ENGINEER', name: 'Full Stack Engineer', displayOrder: 40,
    description: 'Work across frontend, backend, APIs and databases to build complete applications.',
    studentDescription: 'Frontend + Backend',
    iconKey: 'bi-layers', aliases: ['Full Stack Developer', 'MERN Developer'],
  },
  {
    key: 'MOBILE_ENGINEER', name: 'Mobile App Developer', displayOrder: 50,
    description: 'Build Android, iOS or cross-platform mobile applications.',
    studentDescription: 'Android · iOS · Cross-platform',
    iconKey: 'bi-phone', aliases: ['Android Developer', 'iOS Developer', 'React Native Developer'],
  },
  {
    key: 'QA_SDET', name: 'QA / SDET Engineer', displayOrder: 60,
    description: 'Improve software quality through testing, automation and engineering practices.',
    studentDescription: 'Testing · Automation · Quality',
    iconKey: 'bi-bug', aliases: ['Test Engineer', 'Automation Engineer', 'QA Engineer'],
  },
  {
    key: 'CLOUD_DEVOPS', name: 'Cloud / DevOps Engineer', displayOrder: 70,
    description: 'Build and operate deployment, cloud, CI/CD and infrastructure systems.',
    studentDescription: 'Cloud · CI/CD · Infrastructure',
    iconKey: 'bi-cloud', aliases: ['DevOps Engineer', 'Cloud Engineer', 'SRE'],
  },
];

export default mongoose.model<ICareerRole>('CareerRole', CareerRoleSchema);
