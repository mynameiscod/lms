import mongoose, { Schema, Document } from 'mongoose';

export interface ITopic extends Document {
  chapterId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  order: number;
  subTopicCount: number;
  estimatedDuration: {
    months: number;
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
  };
  isPublished: boolean;
  isActive: boolean;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TopicSchema: Schema = new Schema(
  {
    chapterId: {
      type: mongoose.Types.ObjectId,
      ref: 'Chapter',
      required: true
    },
    subjectId: {
      type: mongoose.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    courseId: {
      type: mongoose.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      required: true,
      default: 1
    },
    subTopicCount: {
      type: Number,
      default: 0
    },
    estimatedDuration: {
      months: { type: Number, default: 0 },
      weeks: { type: Number, default: 0 },
      days: { type: Number, default: 0 },
      hours: { type: Number, default: 0 },
      minutes: { type: Number, default: 0 }
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    }
  },
  { timestamps: true }
);

TopicSchema.index({ chapterId: 1, order: 1 });
TopicSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model<ITopic>('Topic', TopicSchema);
