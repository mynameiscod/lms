import mongoose, { Document, Schema } from 'mongoose';

// ─── Scene Types ─────────────────────────────────────────────────────────────
export type SceneType =
  | 'story'       // narrator explains concept with avatar + text + optional code
  | 'code_demo'   // animated code reveal with line commentary
  | 'drag_drop'   // drag items to correct buckets/targets
  | 'quiz'        // MCQ with explanation
  | 'fill_blank'  // fill in blank in a code snippet or sentence
  | 'code_run'    // live editable + runnable code (Piston API)
  | 'summary';    // recap with bullet key-points

export type ProgrammingLanguage =
  | 'java' | 'python' | 'javascript' | 'cpp' | 'sql' | 'typescript'
  | 'go' | 'rust' | 'kotlin' | 'swift';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// ─── Scene Sub-interfaces ─────────────────────────────────────────────────────

export interface IStoryScene {
  avatarEmoji: string;
  avatarName: string;
  text: string;                     // supports {{name}} placeholder
  codeSnippet?: string;             // optional code illustration
  codeLanguage?: ProgrammingLanguage;
  animationType?: 'fade' | 'slide' | 'typewriter' | 'bounce';
}

export interface ICodeDemoScene {
  language: ProgrammingLanguage;
  code: string;
  lines: Array<{                    // per-line commentary
    lineNumber: number;
    commentary: string;
  }>;
  revealSpeed: 'slow' | 'normal' | 'fast';
  highlightColor?: string;
}

export interface IDragDropItem {
  id: string;
  label: string;
  targetBucket: string;             // which bucket this belongs to
  isDecoy?: boolean;
}

export interface IDragDropScene {
  instruction: string;
  buckets: Array<{ id: string; label: string; color?: string }>;
  items: IDragDropItem[];
  explanation: string;
}

export interface IQuizScene {
  question: string;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  explanation: string;
  hint?: string;
}

export interface IFillBlankScene {
  templateText: string;             // use ___ for each blank
  blanks: Array<{
    index: number;                  // which ___ (0-indexed)
    answer: string;
    hint?: string;
  }>;
  explanation: string;
  isCode: boolean;
  codeLanguage?: ProgrammingLanguage;
}

export interface ICodeRunScene {
  language: ProgrammingLanguage;
  starterCode: string;
  expectedOutput?: string;
  hint?: string;
  instructions: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
}

export interface ISummaryScene {
  title: string;
  points: Array<{ emoji?: string; text: string }>;
  codeRecap?: string;
  codeLanguage?: ProgrammingLanguage;
  conceptMapItems?: Array<{ term: string; definition: string }>;
}

// ─── Scene Document ────────────────────────────────────────────────────────────
export interface IScene {
  _id?: mongoose.Types.ObjectId;
  type: SceneType;
  title?: string;
  xpReward: number;
  // only one of these is populated depending on type:
  story?: IStoryScene;
  codeDemo?: ICodeDemoScene;
  dragDrop?: IDragDropScene;
  quiz?: IQuizScene;
  fillBlank?: IFillBlankScene;
  codeRun?: ICodeRunScene;
  summary?: ISummaryScene;
}

// ─── Main Document ─────────────────────────────────────────────────────────────
export interface IInteractiveLesson extends Document {
  tenantId: string;
  contentLibraryId?: mongoose.Types.ObjectId; // link back to LearningContentLibrary
  title: string;
  description?: string;
  language: ProgrammingLanguage;
  concept: string;                   // e.g. "Variables", "Loops", "OOP"
  difficulty: Difficulty;
  scenes: IScene[];
  totalXp: number;
  passingScore: number;              // % of quiz/fill_blank scenes to pass
  isPublished: boolean;
  createdBy: string;
  viewCount: number;
  completionCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ───────────────────────────────────────────────────────────────

const StorySceneSchema = new Schema({
  avatarEmoji:   { type: String, default: '👨‍🏫' },
  avatarName:    { type: String, default: 'Mentor' },
  text:          { type: String, default: '' },
  codeSnippet:   { type: String, default: '' },
  codeLanguage:  { type: String, default: '' },
  animationType: { type: String, enum: ['fade', 'slide', 'typewriter', 'bounce'], default: 'fade' },
}, { _id: false });

const CodeDemoLineSchema = new Schema({
  lineNumber:  { type: Number, required: true },
  commentary:  { type: String, default: '' },
}, { _id: false });

const CodeDemoSceneSchema = new Schema({
  language:       { type: String, required: true },
  code:           { type: String, default: '' },
  lines:          [CodeDemoLineSchema],
  revealSpeed:    { type: String, enum: ['slow', 'normal', 'fast'], default: 'normal' },
  highlightColor: { type: String, default: '#fef08a' },
}, { _id: false });

const DragDropBucketSchema = new Schema({
  id:    { type: String, required: true },
  label: { type: String, required: true },
  color: { type: String, default: '#3b82f6' },
}, { _id: false });

const DragDropItemSchema = new Schema({
  id:           { type: String, required: true },
  label:        { type: String, required: true },
  targetBucket: { type: String, required: true },
  isDecoy:      { type: Boolean, default: false },
}, { _id: false });

const DragDropSceneSchema = new Schema({
  instruction: { type: String, default: '' },
  buckets:     [DragDropBucketSchema],
  items:       [DragDropItemSchema],
  explanation: { type: String, default: '' },
}, { _id: false });

const QuizOptionSchema = new Schema({
  id:        { type: String, required: true },
  text:      { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
}, { _id: false });

const QuizSceneSchema = new Schema({
  question:    { type: String, default: '' },
  options:     [QuizOptionSchema],
  explanation: { type: String, default: '' },
  hint:        { type: String, default: '' },
}, { _id: false });

const BlankSchema = new Schema({
  index:  { type: Number, required: true },
  answer: { type: String, required: true },
  hint:   { type: String, default: '' },
}, { _id: false });

const FillBlankSceneSchema = new Schema({
  templateText: { type: String, default: '' },
  blanks:       [BlankSchema],
  explanation:  { type: String, default: '' },
  isCode:       { type: Boolean, default: false },
  codeLanguage: { type: String, default: '' },
}, { _id: false });

const TestCaseSchema = new Schema({
  input:          { type: String, default: '' },
  expectedOutput: { type: String, default: '' },
}, { _id: false });

const CodeRunSceneSchema = new Schema({
  language:       { type: String, required: true },
  starterCode:    { type: String, default: '' },
  expectedOutput: { type: String, default: '' },
  hint:           { type: String, default: '' },
  instructions:   { type: String, default: '' },
  testCases:      [TestCaseSchema],
}, { _id: false });

const SummaryPointSchema = new Schema({
  emoji: { type: String, default: '' },
  text:  { type: String, required: true },
}, { _id: false });

const ConceptMapItemSchema = new Schema({
  term:       { type: String, required: true },
  definition: { type: String, required: true },
}, { _id: false });

const SummarySceneSchema = new Schema({
  title:           { type: String, default: '' },
  points:          [SummaryPointSchema],
  codeRecap:       { type: String, default: '' },
  codeLanguage:    { type: String, default: '' },
  conceptMapItems: [ConceptMapItemSchema],
}, { _id: false });

const SceneSchema = new Schema({
  type: {
    type: String,
    enum: ['story', 'code_demo', 'drag_drop', 'quiz', 'fill_blank', 'code_run', 'summary'],
    required: true,
  },
  title:    { type: String, default: '' },
  xpReward: { type: Number, default: 10 },
  story:     { type: StorySceneSchema, default: null },
  codeDemo:  { type: CodeDemoSceneSchema, default: null },
  dragDrop:  { type: DragDropSceneSchema, default: null },
  quiz:      { type: QuizSceneSchema, default: null },
  fillBlank: { type: FillBlankSceneSchema, default: null },
  codeRun:   { type: CodeRunSceneSchema, default: null },
  summary:   { type: SummarySceneSchema, default: null },
}, { _id: true });

// ─── Main Schema ──────────────────────────────────────────────────────────────
const InteractiveLessonSchema = new Schema<IInteractiveLesson>({
  tenantId:          { type: String, required: true, index: true },
  contentLibraryId:  { type: Schema.Types.ObjectId, ref: 'LearningContentLibrary', default: null },
  title:             { type: String, required: true, trim: true },
  description:       { type: String, trim: true },
  language: {
    type: String,
    enum: ['java', 'python', 'javascript', 'cpp', 'sql', 'typescript', 'go', 'rust', 'kotlin', 'swift'],
    required: true,
  },
  concept:           { type: String, required: true, trim: true },
  difficulty:        { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  scenes:            [SceneSchema],
  totalXp:           { type: Number, default: 0 },
  passingScore:      { type: Number, default: 60, min: 0, max: 100 },
  isPublished:       { type: Boolean, default: false },
  createdBy:         { type: String, required: true },
  viewCount:         { type: Number, default: 0 },
  completionCount:   { type: Number, default: 0 },
  tags:              [{ type: String, trim: true }],
}, { timestamps: true });

InteractiveLessonSchema.index({ tenantId: 1, language: 1, concept: 1 });
InteractiveLessonSchema.index({ tenantId: 1, isPublished: 1 });

export default mongoose.model<IInteractiveLesson>('InteractiveLesson', InteractiveLessonSchema);
