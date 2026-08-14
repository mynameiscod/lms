import mongoose, { Document, Schema } from 'mongoose';

/**
 * PassportContent — one per tenant. The *editable content* behind the paid Passport
 * product: the pathway definitions (what a 90-day journey looks like for each career
 * goal) and the per-category mission pools that daily missions + the roadmap are
 * generated from. Previously both were hard-coded in passportMissionService; moving
 * them here is what makes the admin "Pathways" and "Missions" screens real.
 *
 * Generation stays DETERMINISTIC (no per-user AI) — the admin edits the pools, the
 * generator picks from them by a stable per-day hash.
 */

export interface IMissionPoolItem {
  title: string;
  detail: string;
  type: string;          // learn | practice | aptitude | communication | resume | mock
  xp: number;
  link?: string;         // in-product destination, e.g. /careerpilot/practice
  /** Which career stages this applies to. Empty or absent = every stage, which is
   *  what all existing content is, so nothing changes until an admin narrows it. */
  stages?: string[];
  /** 'cs' | 'non_cs' | 'any'. Absent = any. */
  background?: string;
  /** Career goals this applies to. Empty = every goal. A student aiming for data work
   *  should not be handed a mission about system design. */
  goals?: string[];

}

export interface IMissionPool {
  category: string;      // PASSPORT_CATEGORIES key
  items: IMissionPoolItem[];
}

/** One score condition. `category` is a category key, or 'overall' for the Career Score. */
export interface IPathwayScoreRule {
  category: string;
  min?: number | null;
  max?: number | null;
}

/**
 * Who this pathway serves.
 *
 * Before this existed, assignment was four hard-coded substring tests in
 * passportScoringService, which meant an admin could define a pathway that no member
 * could ever be given. Rules move that decision into data.
 *
 * Semantics, chosen to be predictable rather than expressive:
 *   - within a list (goals, stages, backgrounds) → OR
 *   - across fields, and across every score rule → AND
 *   - an empty list is NO CONSTRAINT, not "matches nothing"
 * Highest `priority` wins; ties break on array order so the result is always stable.
 */
export interface IPathwayMatch {
  enabled: boolean;
  priority: number;
  goals: string[];
  stages: string[];
  backgrounds: string[];
  scores: IPathwayScoreRule[];
  /** The catch-all. Exactly one pathway must carry it, or members can match nothing. */
  fallback: boolean;
}

export interface IPassportPathway {
  key: string;
  label: string;
  description: string;
  focus: string[];        // category keys this pathway emphasises
  weekThemes: string[];   // 13 themes — one per week of the 90-day journey
  /** Stage this pathway is written for. Absent = serves every stage, which is what
   *  today's pathways are. A foundation plan and a placement plan for the same track
   *  are two pathways sharing a key, not one pathway with a filter. */
  stage?: string;
  /** Absent on pathways authored before rules existed — treated as "never matches",
   *  so an un-ruled pathway is inert rather than silently competing for members. */
  match?: IPathwayMatch;
}

export interface IPassportContent extends Document {
  tenantId: string;
  pathways: IPassportPathway[];
  missionPools: IMissionPool[];
  journeyDays: number;    // length of the full journey (default 90)
  createdAt: Date;
  updatedAt: Date;
}

const MissionPoolItemSchema = new Schema<IMissionPoolItem>({
  title:  { type: String, required: true },
  detail: { type: String, default: '' },
  type:   { type: String, default: 'learn' },
  stages:     { type: [String], default: [] },
  background: { type: String, default: 'any' },
  goals:      { type: [String], default: [] },

  xp:     { type: Number, default: 20 },
  link:   { type: String },
}, { _id: false });

const MissionPoolSchema = new Schema<IMissionPool>({
  category: { type: String, required: true },
  items:    [MissionPoolItemSchema],
}, { _id: false });

const PathwayScoreRuleSchema = new Schema<IPathwayScoreRule>({
  category: { type: String, required: true },
  min:      { type: Number, default: null },
  max:      { type: Number, default: null },
}, { _id: false });

const PathwayMatchSchema = new Schema<IPathwayMatch>({
  enabled:     { type: Boolean, default: false },
  priority:    { type: Number,  default: 0 },
  goals:       { type: [String], default: [] },
  stages:      { type: [String], default: [] },
  backgrounds: { type: [String], default: [] },
  scores:      { type: [PathwayScoreRuleSchema], default: [] },
  fallback:    { type: Boolean, default: false },
}, { _id: false });

const PathwaySchema = new Schema<IPassportPathway>({
  key:         { type: String, required: true },
  stage:       { type: String },
  label:       { type: String, required: true },
  description: { type: String, default: '' },
  focus:       [{ type: String }],
  weekThemes:  [{ type: String }],
  match:       { type: PathwayMatchSchema, default: undefined },
}, { _id: false });

const PassportContentSchema = new Schema<IPassportContent>(
  {
    tenantId:     { type: String, required: true, unique: true, index: true },
    pathways:     [PathwaySchema],
    missionPools: [MissionPoolSchema],
    journeyDays:  { type: Number, default: 90 },
  },
  { timestamps: true }
);

// ── Defaults (seeded on first admin open; these are the values that were previously
//    hard-coded in passportMissionService/passportScoringService) ──────────────────

const COMMON_THEMES = [
  'Orientation & Career Snapshot',
  'Foundations — close your biggest gap',
  'Aptitude & Reasoning base',
  'Communication reps begin',
  'First real practice problems',
  'Mid-journey review & reset',
  'Depth in your core skill',
  'Portfolio & project proof',
  'Resume that passes ATS',
  'Interview fundamentals',
  'Mock interviews & feedback',
  'Applications & outreach',
  'Placement-ready polish',
];

export const DEFAULT_PATHWAYS: IPassportPathway[] = [
  {
    key: 'software_dev', label: 'Software Development Foundation',
    description: 'For students targeting developer roles. Heavy on programming, DSA basics and project proof.',
    focus: ['technical', 'logical_reasoning', 'employability'],
    weekThemes: [...COMMON_THEMES],
  },
  {
    key: 'data_analytics', label: 'Data Analytics Foundation',
    description: 'For students targeting analyst roles. SQL, spreadsheets, statistics and storytelling with data.',
    focus: ['technical', 'aptitude', 'communication'],
    weekThemes: [...COMMON_THEMES],
  },
  {
    key: 'ai_ready', label: 'AI-Ready Student',
    description: 'For students who want to work alongside AI tooling — Python, prompting, and applied projects.',
    focus: ['technical', 'career_clarity', 'communication'],
    weekThemes: [...COMMON_THEMES],
  },
  {
    key: 'it_bridge', label: 'IT Career Bridge',
    description: 'For students still building basics. Aptitude, communication and employability first, tech second.',
    focus: ['aptitude', 'communication', 'employability'],
    weekThemes: [...COMMON_THEMES],
  },
];

export const DEFAULT_MISSION_POOLS: IMissionPool[] = [
  {
    category: 'technical',
    items: [
      { title: 'Programming basics drill', detail: 'Revise variables, loops & conditionals, then solve 2 MCQs.', type: 'learn', xp: 20, link: '/careerpilot/practice?kind=mcq' },
      { title: 'Solve 1 beginner problem', detail: 'Solve one easy coding problem in the Practice Lab.', type: 'practice', xp: 30, link: '/careerpilot/practice?kind=coding' },
      { title: 'Understand data structures', detail: 'Read about arrays vs objects; note 2 differences.', type: 'learn', xp: 20, link: '/careerpilot/practice?kind=mcq' },
      { title: 'Write a small function', detail: 'Write a function that returns the largest of 3 numbers.', type: 'practice', xp: 25, link: '/careerpilot/practice?kind=coding' },
      { title: 'SQL warm-up', detail: 'Write a SELECT query with a WHERE clause.', type: 'practice', xp: 20, link: '/careerpilot/practice?kind=sql' },
    ],
  },
  {
    category: 'aptitude',
    items: [
      { title: 'Aptitude set', detail: 'Solve 10 timed quantitative questions.', type: 'aptitude', xp: 20, link: '/careerpilot/practice?kind=mcq' },
      { title: 'Percentages & ratios', detail: 'Practice 8 percentage/ratio problems.', type: 'aptitude', xp: 20, link: '/careerpilot/practice?kind=mcq' },
      { title: 'Speed–distance–time', detail: 'Solve 6 speed/time problems.', type: 'aptitude', xp: 20, link: '/careerpilot/practice?kind=mcq' },
    ],
  },
  {
    category: 'logical_reasoning',
    items: [
      { title: 'Reasoning puzzles', detail: 'Solve 10 series & pattern questions.', type: 'aptitude', xp: 20, link: '/careerpilot/practice?kind=mcq' },
      { title: 'Odd-one-out set', detail: 'Practice 8 classification questions.', type: 'aptitude', xp: 15, link: '/careerpilot/practice?kind=mcq' },
      { title: 'Blood relations', detail: 'Solve 5 relationship puzzles.', type: 'aptitude', xp: 20, link: '/careerpilot/practice?kind=mcq' },
    ],
  },
  {
    category: 'communication',
    items: [
      { title: 'Record a self-introduction', detail: 'Run a 2-minute self-intro round in the Mock Interview room.', type: 'communication', xp: 30, link: '/careerpilot/interview' },
      { title: 'Explain a concept', detail: 'Explain "what is a database" in 5 simple sentences.', type: 'communication', xp: 25, link: '/careerpilot/interview' },
      { title: 'Email practice', detail: 'Write a short professional email requesting an interview slot.', type: 'communication', xp: 20 },
    ],
  },
  {
    category: 'employability',
    items: [
      { title: 'Resume kickoff', detail: 'Fill your name, education & 3 skills in the Resume Center.', type: 'resume', xp: 25, link: '/careerpilot/resume' },
      { title: 'Add a project', detail: 'Write 2 lines about one project you built.', type: 'resume', xp: 25, link: '/careerpilot/resume' },
      { title: 'LinkedIn headline', detail: 'Write a 1-line LinkedIn headline for your target role.', type: 'resume', xp: 15, link: '/careerpilot/resume' },
      { title: 'Mock interview round', detail: 'Complete one AI mock interview and read your feedback.', type: 'mock', xp: 30, link: '/careerpilot/interview' },
    ],
  },
  {
    category: 'career_clarity',
    items: [
      { title: 'Define your target role', detail: 'Write 1 role you want + 3 skills it needs.', type: 'learn', xp: 15 },
      { title: 'Research a company', detail: 'Pick 1 company; note what role & skills they hire for.', type: 'learn', xp: 20 },
    ],
  },
];

export default mongoose.model<IPassportContent>('PassportContent', PassportContentSchema);
