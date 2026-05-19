import mongoose, { Document, Schema } from 'mongoose';

export type SlideType = 'narration' | 'animation' | 'code_reveal' | 'analogy';
export type FinalTaskType = 'none' | 'quiz' | 'coding' | 'assignment';

const CheckpointOptionSchema = new Schema(
  { text: { type: String, default: '' }, isCorrect: { type: Boolean, default: false } },
  { _id: false }
);

const CheckpointSchema = new Schema(
  {
    question:    { type: String, default: '' },
    options:     [CheckpointOptionSchema],
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const SlideSchema = new Schema(
  {
    type: { type: String, enum: ['narration', 'animation', 'code_reveal', 'analogy'], required: true },
    // narration
    text:        { type: String, default: '' },
    avatarEmoji: { type: String, default: '👨‍🏫' },
    // animation
    animationPreset: { type: String, default: 'queue' },
    lottieUrl:       { type: String, default: '' },
    caption:         { type: String, default: '' },
    // code reveal
    code:          { type: String, default: '' },
    language:      { type: String, default: 'java' },
    lineCommentary:{ type: String, default: '' },
    speed:         { type: String, enum: ['slow', 'normal', 'fast'], default: 'normal' },
    // analogy
    leftLabel:      { type: String, default: '' },
    rightLabel:     { type: String, default: '' },
    imageUrl:       { type: String, default: '' },
    connectingText: { type: String, default: 'works exactly like' },
    // checkpoint after this slide
    hasCheckpoint: { type: Boolean, default: false },
    checkpoint:    { type: CheckpointSchema, default: null },
  },
  { _id: true }
);

const FinalTaskQuestionSchema = new Schema(
  {
    type:             { type: String, enum: ['mcq', 'coding', 'theory'], required: true },
    title:            { type: String, default: '' },
    description:      { type: String, default: '' },
    options:          [CheckpointOptionSchema],
    explanation:      { type: String, default: '' },
    starterCode:      { type: Map, of: String },
    allowedLanguages: [{ type: String }],
    testCases: [
      {
        input:          { type: String, default: '' },
        expectedOutput: { type: String, default: '' },
        isHidden:       { type: Boolean, default: false },
        _id: false,
      },
    ],
    marks: { type: Number, default: 1 },
  },
  { _id: true }
);

const FinalTaskSchema = new Schema(
  {
    type:         { type: String, enum: ['none', 'quiz', 'coding', 'assignment'], default: 'none' },
    title:        { type: String, default: '' },
    description:  { type: String, default: '' },
    passingScore: { type: Number, default: 60 },
    questions:    [FinalTaskQuestionSchema],
  },
  { _id: false }
);

export interface IConceptLesson extends Document {
  tenantId:  string;
  contentId: mongoose.Types.ObjectId;
  slides:    any[];
  finalTask: any;
  isActive:  boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConceptLessonSchema = new Schema<IConceptLesson>(
  {
    tenantId:  { type: String, required: true, index: true },
    contentId: { type: Schema.Types.ObjectId, ref: 'LearningContentLibrary', required: true },
    slides:    [SlideSchema],
    finalTask: { type: FinalTaskSchema, default: () => ({ type: 'none' }) },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

ConceptLessonSchema.index({ tenantId: 1, contentId: 1 }, { unique: true });

export default mongoose.model<IConceptLesson>('ConceptLesson', ConceptLessonSchema);
