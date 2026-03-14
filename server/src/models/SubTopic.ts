import mongoose, { Schema, Document } from 'mongoose';

export interface ISubTopic extends Document {
  topicId: mongoose.Types.ObjectId;
  chapterId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  order: number;

  // Day and time scheduling
  scheduledDay: number | null;       // Day number in the course (e.g., Day 1, Day 2)
  scheduledDate: Date | null;        // Specific calendar date (optional)
  startTime: string | null;          // e.g., "09:00"
  endTime: string | null;            // e.g., "10:30"
  durationMinutes: number | null;    // Duration in minutes

  isPublished: boolean;
  isActive: boolean;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubTopicSchema: Schema = new Schema(
  {
    topicId: {
      type: mongoose.Types.ObjectId,
      ref: 'Topic',
      required: true
    },
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

    // Day and time scheduling
    scheduledDay: {
      type: Number,
      default: null
    },
    scheduledDate: {
      type: Date,
      default: null
    },
    startTime: {
      type: String,
      default: null,
      trim: true
    },
    endTime: {
      type: String,
      default: null,
      trim: true
    },
    durationMinutes: {
      type: Number,
      default: null
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

SubTopicSchema.index({ topicId: 1, order: 1 });
SubTopicSchema.index({ chapterId: 1, order: 1 });
SubTopicSchema.index({ tenantId: 1, isActive: 1 });
SubTopicSchema.index({ scheduledDay: 1 });
SubTopicSchema.index({ scheduledDate: 1 });

export default mongoose.model<ISubTopic>('SubTopic', SubTopicSchema);
