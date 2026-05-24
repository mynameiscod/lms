import mongoose, { Document, Schema } from 'mongoose';

export interface ISceneResult {
  sceneId: string;
  sceneType: string;
  completed: boolean;
  passed?: boolean;         // for quiz/fill_blank/code_run
  attemptsUsed: number;
  xpEarned: number;
  timeSpentSeconds: number;
  completedAt?: Date;
}

export interface ILessonProgress extends Document {
  tenantId: string;
  lessonId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  enrollmentId?: mongoose.Types.ObjectId;  // CurriculumEnrollment reference
  dayNumber?: number;                       // which day in curriculum

  status: 'not_started' | 'in_progress' | 'completed' | 'passed' | 'failed';
  currentSceneIndex: number;
  sceneResults: ISceneResult[];

  totalXpEarned: number;
  score: number;           // % (correct interactive scenes / total interactive scenes)
  timeSpentSeconds: number;

  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SceneResultSchema = new Schema<ISceneResult>({
  sceneId:          { type: String, required: true },
  sceneType:        { type: String, required: true },
  completed:        { type: Boolean, default: false },
  passed:           { type: Boolean },
  attemptsUsed:     { type: Number, default: 1 },
  xpEarned:         { type: Number, default: 0 },
  timeSpentSeconds: { type: Number, default: 0 },
  completedAt:      { type: Date },
}, { _id: false });

const LessonProgressSchema = new Schema<ILessonProgress>({
  tenantId:     { type: String, required: true, index: true },
  lessonId:     { type: Schema.Types.ObjectId, ref: 'InteractiveLesson', required: true },
  studentId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  enrollmentId: { type: Schema.Types.ObjectId, ref: 'CurriculumEnrollment' },
  dayNumber:    { type: Number },

  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'passed', 'failed'],
    default: 'not_started',
  },
  currentSceneIndex: { type: Number, default: 0 },
  sceneResults:      [SceneResultSchema],

  totalXpEarned:    { type: Number, default: 0 },
  score:            { type: Number, default: 0 },
  timeSpentSeconds: { type: Number, default: 0 },

  startedAt:   { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

LessonProgressSchema.index({ tenantId: 1, studentId: 1, lessonId: 1 }, { unique: true });
LessonProgressSchema.index({ tenantId: 1, lessonId: 1 });
LessonProgressSchema.index({ tenantId: 1, enrollmentId: 1 });

export default mongoose.model<ILessonProgress>('LessonProgress', LessonProgressSchema);
