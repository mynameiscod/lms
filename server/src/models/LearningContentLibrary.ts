import mongoose, { Document, Schema } from 'mongoose';

export type ContentLibraryType =
  | 'video'
  | 'notes'
  | 'tech_qa'
  | 'behavioral_qa'
  | 'practice_coding'
  | 'practice_theory'
  | 'aptitude'
  | 'interactive_lesson'
  | 'interactive_activity';

export type VideoSource = 'upload' | 'youtube' | 'vimeo' | 'bunny';
export type NotesSource = 'upload' | 'richtext';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type GradingMode = 'auto' | 'self';

export interface IQAItem {
  question: string;
  answer: string;
  tips?: string;
  order: number;
}

export interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface IPracticeQuestion {
  type: 'coding' | 'theory' | 'mcq';
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  // coding
  starterCode?: Record<string, string>;
  allowedLanguages?: string[];
  testCases?: ITestCase[];
  // theory / mcq
  options?: Array<{ text: string; isCorrect: boolean }>;
  explanation?: string;
  marks: number;
  gradingMode: GradingMode;
}

export interface ILearningContentLibrary extends Document {
  tenantId: string;
  title: string;
  description?: string;
  type: ContentLibraryType;

  topicTags: string[];
  courseTags: string[];
  difficulty?: Difficulty;
  estimatedDuration: number; // minutes

  /* ---- adaptive curriculum (ADAPTIVE_CURRICULUM_V1) — all optional ---- */

  /**
   * Canonical CareerSkill keys this content teaches.
   *
   * THE OTHER HALF OF THE BRIDGE. Content was previously findable only by free-text topicTags,
   * which meant a skill the system had measured precisely could not be connected to anything to
   * learn — the codebase says so about itself in CareerSkillResource. Tagging by key makes the
   * same library serve a measured plan instead of a keyword search.
   *
   * topicTags is deliberately left alone: it is how every existing screen finds content, and a
   * migration that swapped one for the other would break them all at once.
   */
  skillKeys?: string[];

  /**
   * WHO this version of the material is pitched at, which is not the same as how hard it is.
   *
   * `difficulty` describes the content; `learningDepth` describes the student it suits. The same
   * skill needs a slow build for somebody meeting it first time and a one-page recap for
   * somebody proving they still have it — two rows, same skill, different depth. Without this
   * axis a plan can only choose WHETHER to teach, never HOW.
   */
  learningDepth?: 'FOUNDATION' | 'GUIDED' | 'STANDARD' | 'REVISION' | 'CHALLENGE';

  /** Practice difficulty on the 1-4 scale the adaptive planner assigns against. */
  difficultyLevel?: 1 | 2 | 3 | 4;

  /** Directions this content serves. Empty means everyone — see careerDirectionPolicy. */
  applicableDirections?: string[];

  /**
   * Worked examples drawn from a particular field.
   *
   * The same outcome — iterate a list — reads as a shopping cart to a web student and a set of
   * prediction scores to an AI student. The skill taught is identical; only the example changes.
   */
  careerContexts?: string[];

  /** What a student can do after this, mirroring the curriculum topic's outcomes. */
  learningOutcomeIds?: string[];

  /**
   * The preferred row when several teach the same skill at the same depth.
   *
   * AI day-generation has produced near-duplicate lessons for years and de-duplicates them at
   * runtime by picking the oldest match. Marking one canonical makes that a decision somebody
   * made rather than an accident of insertion order.
   */
  canonical?: boolean;

  // Video
  videoSource?: VideoSource;
  videoUrl?: string;
  videoFilePath?: string;
  videoDuration?: number;
  videoThumbnail?: string;
  bunnyVideoId?: string;   // Bunny Stream video GUID (videoSource === 'bunny')
  bunnyLibraryId?: number; // Bunny Stream library ID
  /**
   * Bunny's own encode status, mirrored so a viewer can be told the truth.
   *
   * 0 Created · 1 Uploaded · 2 Processing · 3 Transcoding · 4 Finished · 5 Error · 6 UploadFailed
   *
   * Without this a failed encode is indistinguishable from one still in progress: both show
   * Bunny's "Processing video" placeholder, so a video that will NEVER play looks like one
   * that is nearly ready. Eight recordings sat like that, some for two months, and the first
   * anyone knew was a student asking why it would not start.
   */
  bunnyStatus?: number;
  bunnyStatusAt?: Date;
  completionThreshold: number; // 0 = just open, 80 = watch 80%

  // Notes
  notesSource?: NotesSource;
  notesFilePath?: string;
  notesContent?: string;

  // Interactive activity — a self-contained HTML "do-it-yourself" activity
  // (e.g. "Build your LinkedIn profile"). Reusable on any day of any curriculum.
  htmlContent?: string;
  activitySteps?: number; // total steps, for progress display

  // Q&A (tech_qa, behavioral_qa)
  qaItems: IQAItem[];

  // Practice / Aptitude
  practiceQuestions: IPracticeQuestion[];

  isPublished: boolean;
  conceptLessonId?: mongoose.Types.ObjectId;
  createdBy: string;
  viewCount: number;
  usageCount: number;

  createdAt: Date;
  updatedAt: Date;
}

const QAItemSchema = new Schema<IQAItem>(
  {
    question:  { type: String, required: true },
    answer:    { type: String, required: true },
    tips:      { type: String },
    order:     { type: Number, default: 0 },
  },
  { _id: false }
);

const TestCaseSchema = new Schema<ITestCase>(
  {
    input:          { type: String, default: '' },
    expectedOutput: { type: String, required: true },
    isHidden:       { type: Boolean, default: false },
  },
  { _id: false }
);

const PracticeQuestionSchema = new Schema<IPracticeQuestion>(
  {
    type:             { type: String, enum: ['coding', 'theory', 'mcq'], required: true },
    title:            { type: String, required: true },
    description:      { type: String, required: true },
    difficulty:       { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    starterCode:      { type: Map, of: String },
    allowedLanguages: [{ type: String }],
    testCases:        [TestCaseSchema],
    options: [
      {
        text:      { type: String },
        isCorrect: { type: Boolean, default: false },
        _id:       false,
      },
    ],
    explanation:  { type: String },
    marks:        { type: Number, default: 1 },
    gradingMode:  { type: String, enum: ['auto', 'self'], default: 'self' },
  },
  { _id: true }
);

const LearningContentLibrarySchema = new Schema<ILearningContentLibrary>(
  {
    tenantId:    { type: String, required: true, index: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ['video', 'notes', 'tech_qa', 'behavioral_qa', 'practice_coding', 'practice_theory', 'aptitude', 'interactive_lesson', 'interactive_activity'],
      required: true,
    },

    topicTags:  [{ type: String, trim: true }],
    courseTags: [{ type: String, trim: true }],
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
    estimatedDuration: { type: Number, default: 0 },

    // Adaptive curriculum. Optional with no defaults, so existing rows are unchanged and
    // continue to be found by the topicTags queries every current screen uses.
    skillKeys:            { type: [String], default: undefined },
    learningDepth:        { type: String, enum: ['FOUNDATION', 'GUIDED', 'STANDARD', 'REVISION', 'CHALLENGE'] },
    difficultyLevel:      { type: Number, min: 1, max: 4 },
    applicableDirections: { type: [String], default: undefined },
    careerContexts:       { type: [String], default: undefined },
    learningOutcomeIds:   { type: [String], default: undefined },
    canonical:            { type: Boolean },

    // Video
    videoSource:         { type: String, enum: ['upload', 'youtube', 'vimeo', 'bunny'] },
    videoUrl:            { type: String },
    videoFilePath:       { type: String },
    videoDuration:       { type: Number },
    videoThumbnail:      { type: String },
    bunnyVideoId:        { type: String },
    bunnyLibraryId:      { type: Number },
    bunnyStatus:         { type: Number },
    bunnyStatusAt:       { type: Date },
    completionThreshold: { type: Number, default: 0, min: 0, max: 100 },

    // Notes
    notesSource:   { type: String, enum: ['upload', 'richtext'] },
    notesFilePath: { type: String },
    notesContent:  { type: String },

    // Interactive activity (self-contained HTML)
    htmlContent:   { type: String },
    activitySteps: { type: Number },

    // Q&A
    qaItems: [QAItemSchema],

    // Practice / Aptitude
    practiceQuestions: [PracticeQuestionSchema],

    isPublished:     { type: Boolean, default: false },
    conceptLessonId: { type: Schema.Types.ObjectId, ref: 'ConceptLesson', default: null },
    createdBy:       { type: String, required: true },
    viewCount:   { type: Number, default: 0 },
    usageCount:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

LearningContentLibrarySchema.index({ tenantId: 1, type: 1 });
LearningContentLibrarySchema.index({ tenantId: 1, topicTags: 1 });
/**
 * The adaptive planner's read: "content for THIS skill, at THIS depth, that is published".
 * A multikey index on skillKeys; without it every plan generation scans the library.
 */
LearningContentLibrarySchema.index({ tenantId: 1, skillKeys: 1, learningDepth: 1, isPublished: 1 });

export default mongoose.model<ILearningContentLibrary>(
  'LearningContentLibrary',
  LearningContentLibrarySchema
);
