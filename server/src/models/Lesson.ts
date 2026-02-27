import mongoose, { Schema, Document } from 'mongoose';

export interface ILesson extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  content: string;
  videoUrl?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema: Schema = new Schema(
  {
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
    content: { 
      type: String, 
      required: true 
    },
    videoUrl: { 
      type: String 
    },
    order: { 
      type: Number, 
      required: true 
    }
  },
  { timestamps: true }
);

export default mongoose.model<ILesson>('Lesson', LessonSchema);