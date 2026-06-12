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

  // Video
  videoSource?: VideoSource;
  videoUrl?: string;
  videoFilePath?: string;
  videoDuration?: number;
  videoThumbnail?: string;
  bunnyVideoId?: string;   // Bunny Stream video GUID (videoSource === 'bunny')
  bunnyLibraryId?: number; // Bunny Stream library ID
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

    // Video
    videoSource:         { type: String, enum: ['upload', 'youtube', 'vimeo', 'bunny'] },
    videoUrl:            { type: String },
    videoFilePath:       { type: String },
    videoDuration:       { type: Number },
    videoThumbnail:      { type: String },
    bunnyVideoId:        { type: String },
    bunnyLibraryId:      { type: Number },
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

export default mongoose.model<ILearningContentLibrary>(
  'LearningContentLibrary',
  LearningContentLibrarySchema
);
