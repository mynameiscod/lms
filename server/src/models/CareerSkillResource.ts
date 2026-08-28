import mongoose, { Schema, Document } from 'mongoose';

/**
 * Which real, executable activity teaches or exercises a canonical skill.
 *
 * WHY THIS IS NOT SkillEvidence (Module 5).
 * That maps assessment ITEMS to skills so answering one counts as EVIDENCE. This maps
 * activities to skills so a student can be sent to DO one. The two look similar and mean
 * opposite things: "answering this proves you can do X" versus "doing this helps you learn
 * X". Module 10 keeps them apart deliberately — collapsing them is how a roadmap task
 * quietly becomes proof of mastery, which §52 forbids outright.
 *
 * WHY THIS IS NOT A FIELD ON THE CONTENT ITSELF.
 * Adding `skillKeys` to Content, Assignment, Quiz and ThinkingProblem would put canonical
 * CareerPilot vocabulary inside four legacy LMS models that have nothing to do with
 * CareerPilot, and every one of them is read on hot paths shared with the rest of the
 * product. A join table costs one batched query and touches no legacy schema.
 *
 * WHY IT IS NEEDED AT ALL.
 * Module 9 established that no canonical skill → learning content mapping exists anywhere.
 * Without one, a roadmap objective can only ever be a sentence. The alternative considered
 * and rejected was matching on title text — "the skill is JAVA_OOP, find content containing
 * 'Java'" — which is exactly the brittle guessing §34 rules out.
 *
 * DELIBERATELY EMPTY UNTIL AN ADMIN FILLS IT.
 * Nothing is seeded and nothing is inferred. An unmapped objective is reported honestly as
 * a configuration gap rather than filled with a plausible-looking resource that turns out
 * to teach something else.
 */

/**
 * What can be pointed at.
 *
 * THE RULE THAT GOVERNS THIS LIST: a type may only appear here once it has (a) write-time
 * validation that its target exists and (b) a route a member can actually open. The list
 * started as `practice` alone for exactly that reason — listing a family early lets an
 * admin build mappings that dead-end, and a Start button that leads nowhere is worse than
 * an honest configuration gap.
 *
 * Each addition below satisfies both halves:
 *   practice / problem  — Practice Lab and the shared problem bank; ids validated against
 *                         their catalogues, opened at /careerpilot/practice/:id
 *   note / video / link
 *   / research          — material the admin supplies as a URL or an upload. "Exists" is
 *                         checked as a well-formed destination rather than a catalogue
 *                         lookup, and all four open in the member content viewer.
 *   mock_interview      — the interview round, already routed at /careerpilot/interview
 *
 * DELIBERATELY STILL ABSENT: `quiz` and `assignment`. There are 263 and 170 of them, so the
 * temptation is obvious, but both open inside an LMS batch a CareerPilot member does not
 * have. Adding them needs a member-reachable route first, not just an entry in this list.
 */
export type SkillResourceType =
  | 'practice' | 'problem' | 'note' | 'video' | 'link' | 'research' | 'mock_interview';
export const SKILL_RESOURCE_TYPES: SkillResourceType[] = [
  'practice', 'problem', 'note', 'video', 'link', 'research', 'mock_interview',
];

/** Types whose target is a URL or an uploaded file rather than a row in a catalogue. */
export const MATERIAL_TYPES: SkillResourceType[] = ['note', 'video', 'link', 'research'];

/**
 * Who a resource is for, using the vocabulary the rest of CareerPilot already speaks.
 *
 * EMPTY MEANS EVERYONE, on every axis. The opposite rule — an explicit tag required —
 * would empty the bank the moment targeting shipped, because nothing written before it
 * carries tags. (The DSA bank chose the other way round for CareerPilot precisely because
 * inheriting a whole untagged LMS bank would have been a content review nobody performed.
 * Here the resources are authored against a skill one at a time, so the safe default is
 * the permissive one.)
 *
 * Within one axis the values are OR'd; across axes they are AND'ed. That matches the
 * pathway matcher, so an admin who has learned one targeting screen has learned both.
 */
export interface IResourceAudience {
  years: string[];
  courses: string[];
  branches: string[];
  roles: string[];
  languages: string[];
  stages: string[];
}

export const EMPTY_AUDIENCE = (): IResourceAudience => ({
  years: [], courses: [], branches: [], roles: [], languages: [], stages: [],
});

/**
 * Serve this only while the member's measured score on the skill sits in this window.
 *
 * This is the "weakness" targeting: a remedial explainer is right for somebody at 30 and
 * patronising at 80. Null on either side means unbounded, and a resource with no window at
 * all is offered at every score — which is what every resource written before this did.
 *
 * An UNMEASURED skill passes. Refusing it would hide every resource for a skill the member
 * has not been assessed on yet, which is precisely when they most need something to read.
 */
export interface IScoreWindow {
  min?: number | null;
  max?: number | null;
}

/**
 * The teaching content itself.
 *
 * A mission used to be a title and ONE LINE of detail — "Install Postman" with nowhere to
 * say how. Everything below is optional, so a material can be a bare video, a bare set of
 * steps, or all of it; an author fills in what the concept needs and leaves the rest empty.
 *
 * Kept as STRUCTURE rather than one blob of rich text on purpose. A step knows its own
 * command and expected output, so the student view can render it as something to follow and
 * check rather than a wall of prose — and later work can verify a step without re-parsing
 * an admin's paragraph.
 */
export interface IResourceStep {
  title: string;
  detail: string;
  /** Shown in a copyable block. Empty for a step that is not a command. */
  command?: string;
  /** What the student should see if it worked — the difference between "done" and "I think so". */
  expectedOutput?: string;
}

/** One term explained. The four HTTP methods are four of these. */
export interface IResourceBreakdownItem {
  term: string;
  explanation: string;
  example?: string;
}

/** A question with its answer, so the student can self-check before marking anything done. */
export interface IResourceCheck {
  question: string;
  answer: string;
}

/**
 * A file attached to written notes — a diagram, a PDF handout, a spreadsheet.
 *
 * `storage` records WHERE it went, because the two destinations are not interchangeable
 * later: a Bunny path is fetched over HTTP, a local one off the shared uploads volume. That
 * volume is mounted into both blue and green, so a locally-stored file survives a deploy and
 * is readable from whichever slot is live — which is what makes local a real fallback rather
 * than a file that quietly disappears at the next release.
 */
export interface IResourceAttachment {
  /** Storage path. Server-generated — never a client-supplied name. */
  fileKey: string;
  /** What the admin called it, shown to the student. */
  fileName: string;
  mimeType: string;
  size: number;
  storage: 'bunny' | 'local';
  uploadedAt?: Date;
}

export interface IResourceBody {
  /** Why this matters, in a paragraph. Shown first. */
  overview?: string;
  /** Longer written material. Markdown-ish plain text; rendered, never executed. */
  notes?: string;
  /** A URL works today; an uploaded key needs tenant storage configured. */
  videoUrl?: string;
  videoKey?: string;
  steps: IResourceStep[];
  breakdown: IResourceBreakdownItem[];
  checks: IResourceCheck[];
  references: { label: string; url: string }[];
  /** Images, PDFs, Word and Excel files that go with the notes. */
  attachments: IResourceAttachment[];
}

export const EMPTY_BODY = (): IResourceBody => ({
  overview: '', notes: '', videoUrl: '', videoKey: '',
  steps: [], breakdown: [], checks: [], references: [], attachments: [],
});

/** Does this material actually contain anything a student could open? */
export const bodyIsEmpty = (b?: IResourceBody | null): boolean => !b || (
  !String(b.overview || '').trim() &&
  !String(b.notes || '').trim() &&
  !String(b.videoUrl || '').trim() &&
  !String(b.videoKey || '').trim() &&
  !(b.steps || []).length &&
  !(b.breakdown || []).length &&
  !(b.checks || []).length &&
  !(b.references || []).length &&
  !(b.attachments || []).length
);

/** Which roadmap work a resource is suitable for. Mirrors Module 9's vocabulary exactly. */
export const RESOURCE_WORK_TYPES = ['LEARN', 'PRACTICE', 'ASSESS', 'REVIEW'] as const;
export type ResourceWorkType = typeof RESOURCE_WORK_TYPES[number];

export interface ICareerSkillResource extends Document {
  tenantId: string;
  /** Canonical CareerSkill.key. Validated against the graph on write. */
  skillKey: string;
  resourceType: SkillResourceType;
  /**
   * The resource's own id, in its own namespace, for catalogue-backed types. Empty for
   * material types, which carry `url` or `fileKey` instead.
   */
  resourceId: string;

  /** Shown to the member. Required for material types, which have no catalogue row to name them. */
  title: string;
  description: string;

  /** Where the material lives: an external URL, or a key in the tenant's file storage. */
  url?: string;
  fileKey?: string;

  /** For coding material, so a Java concept can carry a Java note and a Python one too. */
  language?: string;

  audience: IResourceAudience;
  scoreWindow?: IScoreWindow;
  /** Present on material types. Catalogue-backed types carry their content in their own row. */
  body?: IResourceBody;
  /**
   * The kinds of roadmap work this can serve. A coding problem is PRACTICE; it is not a
   * LEARN resource, and offering it as one would send a student to be tested on something
   * nobody has taught them yet.
   */
  workTypes: ResourceWorkType[];
  /**
      * What finishing this is worth, overriding the tenant's flat rate.
      *
      * NULL MEANS "USE THE TENANT RATE", which is what every material written before this
      * did, so nothing changes until an admin sets a number. A zero is a real choice and is
      * honoured — some material is worth reading and worth no points.
      *
      * This exists because the daily plan paid one flat amount for every objective: a
      * fifteen-minute check and a ninety-minute build-along scored identically, and the
      * mission pool and the problem bank had per-item XP while the plan did not.
      */
  xp?: number | null;

  /** Ordering when several resources fit the same slot. Lower is preferred. */
  priority: number;
  active: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CareerSkillResourceSchema = new Schema<ICareerSkillResource>(
  {
    tenantId:     { type: String, required: true, index: true },
    skillKey:     { type: String, required: true, uppercase: true, trim: true },
    resourceType: { type: String, enum: SKILL_RESOURCE_TYPES, required: true },
    resourceId:   { type: String, default: '', trim: true },

    title:       { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    url:         { type: String, trim: true },
    fileKey:     { type: String, trim: true },
    language:    { type: String, trim: true },

    audience: {
      years:     { type: [String], default: [] },
      courses:   { type: [String], default: [] },
      branches:  { type: [String], default: [] },
      roles:     { type: [String], default: [] },
      languages: { type: [String], default: [] },
      stages:    { type: [String], default: [] },
    },
    scoreWindow: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },

    body: {
      overview: { type: String, default: '' },
      notes:    { type: String, default: '' },
      videoUrl: { type: String, default: '' },
      videoKey: { type: String, default: '' },
      steps: [{
        _id: false,
        title:          { type: String, default: '' },
        detail:         { type: String, default: '' },
        command:        { type: String, default: '' },
        expectedOutput: { type: String, default: '' },
      }],
      breakdown: [{
        _id: false,
        term:        { type: String, default: '' },
        explanation: { type: String, default: '' },
        example:     { type: String, default: '' },
      }],
      checks: [{
        _id: false,
        question: { type: String, default: '' },
        answer:   { type: String, default: '' },
      }],
      references: [{
        _id: false,
        label: { type: String, default: '' },
        url:   { type: String, default: '' },
      }],
      attachments: [{
        _id: false,
        fileKey:    { type: String, default: '' },
        fileName:   { type: String, default: '' },
        mimeType:   { type: String, default: '' },
        size:       { type: Number, default: 0 },
        storage:    { type: String, enum: ['bunny', 'local'], default: 'local' },
        uploadedAt: { type: Date },
      }],
    },

    workTypes:    { type: [String], default: ['PRACTICE'] },
    xp:           { type: Number, default: null },
    priority:     { type: Number, default: 100 },
    active:       { type: Boolean, default: true },
    createdBy:    { type: String },
  },
  { timestamps: true },
);

/**
 * One mapping per (skill, catalogue resource) per tenant. Mapping the same problem to the
 * same skill twice is a duplicate, not a stronger signal, and would make it twice as likely
 * to be drawn — a silent bias created by a double-clicked save.
 *
 * PARTIAL, and that is load-bearing. Material types carry no `resourceId`, so under a plain
 * unique index every note on a skill would collide with every other note on it at the empty
 * string — an admin could add exactly one note per skill and the second would be rejected as
 * a duplicate. The filter restricts the rule to rows that actually name a catalogue item.
 */
CareerSkillResourceSchema.index(
  { tenantId: 1, skillKey: 1, resourceType: 1, resourceId: 1 },
  { unique: true, partialFilterExpression: { resourceId: { $gt: '' } } },
);

/** The one query the orchestrator makes: everything active for a batch of skills. */
CareerSkillResourceSchema.index({ tenantId: 1, skillKey: 1, active: 1, priority: 1 });

export default mongoose.model<ICareerSkillResource>('CareerSkillResource', CareerSkillResourceSchema);

/**
 * Does this resource serve this member?
 *
 * Pure, and exported, so the rules can be tested without a database and so the admin
 * screen can explain a match the same way the server decides it.
 *
 * Every axis is independent and every empty axis abstains, so a resource with no targeting
 * at all matches everybody — which is what every resource written before targeting existed
 * must keep doing.
 */
export interface ResourceMember {
  yearOfStudy?: string | null;
  degree?: string | null;
  program?: string | null;
  branch?: string | null;
  primaryRole?: string | null;
  secondaryRole?: string | null;
  stage?: string | null;
  preferredLanguages?: string[] | null;
}

const norm = (v: any): string => String(v ?? '').trim().toLowerCase();

/** An axis holds when it is unconstrained, or when any of the member's values is listed. */
const axisHolds = (allowed: string[] | undefined, values: (string | null | undefined)[]): boolean => {
  if (!allowed || !allowed.length) return true;
  const want = new Set(allowed.map(norm).filter(Boolean));
  if (!want.size) return true;
  return values.some(v => v && want.has(norm(v)));
};

export function resourceServes(
  res: Pick<ICareerSkillResource, 'audience' | 'scoreWindow'>,
  member: ResourceMember,
  /** The member's measured score on this skill, or null when they have not been assessed. */
  skillScore?: number | null,
): boolean {
  const a = res.audience;
  if (a) {
    // `courses` accepts either degree or program: admins say "B.Tech" and "CSE" and do not
    // reliably know which field the onboarding form wrote them to.
    if (!axisHolds(a.years,     [member.yearOfStudy])) return false;
    if (!axisHolds(a.courses,   [member.degree, member.program])) return false;
    if (!axisHolds(a.branches,  [member.branch])) return false;
    if (!axisHolds(a.roles,     [member.primaryRole, member.secondaryRole])) return false;
    if (!axisHolds(a.stages,    [member.stage])) return false;
    if (!axisHolds(a.languages, member.preferredLanguages || [])) return false;
  }

  const w = res.scoreWindow;
  if (w && (typeof w.min === 'number' || typeof w.max === 'number')) {
    // Unmeasured passes: hiding material for a skill nobody has assessed yet would starve
    // the member exactly when they have the least to go on.
    if (typeof skillScore !== 'number') return true;
    if (typeof w.min === 'number' && skillScore < w.min) return false;
    if (typeof w.max === 'number' && skillScore > w.max) return false;
  }
  return true;
}
