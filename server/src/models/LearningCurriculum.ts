import mongoose, { Document, Schema } from 'mongoose';

export interface ICurriculumTopic {
  _id?: any;
  title: string;
  description?: string;
  order: number;
  startDay: number;
  endDay: number;
  color?: string;
}

export interface ILearningCurriculum extends Document {
  tenantId: string;
  title: string;
  description?: string;
  targetCourse?: string;
  totalDays: number;
  topics: ICurriculumTopic[];
  isPublished: boolean;
  shared: boolean;            // published to the cross-tenant template library
  clonedFrom?: mongoose.Types.ObjectId;
  createdBy: string;
  enrollmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CurriculumTopicSchema = new Schema<ICurriculumTopic>(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String },
    order:       { type: Number, default: 0 },
    startDay:    { type: Number, required: true, min: 1 },
    endDay:      { type: Number, required: true, min: 1 },
    color:       { type: String, default: '#3b82f6' },
  },
  { _id: true }
);

const LearningCurriculumSchema = new Schema<ILearningCurriculum>(
  {
    tenantId:        { type: String, required: true, index: true },
    title:           { type: String, required: true, trim: true },
    description:     { type: String, trim: true },
    targetCourse:    { type: String, trim: true },
    totalDays:       { type: Number, default: 145, min: 1 },
    topics:          [CurriculumTopicSchema],
    isPublished:     { type: Boolean, default: false },
    shared:          { type: Boolean, default: false, index: true },
    clonedFrom:      { type: Schema.Types.ObjectId, ref: 'LearningCurriculum' },
    createdBy:       { type: String, required: true },
    enrollmentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

LearningCurriculumSchema.index({ tenantId: 1, isPublished: 1 });

export default mongoose.model<ILearningCurriculum>('LearningCurriculum', LearningCurriculumSchema);
