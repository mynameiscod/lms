import mongoose, { Schema, Document } from 'mongoose';

export interface IClassRecording extends Document {
  _id: string;
  tenantId: string;
  title: string;
  description?: string;
  instructor: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  chapterId?: mongoose.Types.ObjectId;

  // Recording file
  videoUrl: string;
  duration: number; // seconds
  fileSize: number; // bytes
  mimeType: string;
  thumbnailUrl?: string;

  // Processing pipeline
  status: 'uploading' | 'uploaded' | 'transcribing' | 'summarizing' | 'generating_notes' | 'generating_quiz' | 'generating_practice' | 'generating_assignment' | 'completed' | 'failed';
  processingProgress: number; // 0-100
  processingError?: string;

  // Transcript
  transcript?: string;

  // AI-generated summary
  summary?: {
    overview: string;
    keyPoints: string[];
    topics: string[];
  };

  // AI-generated notes
  generatedNotes?: {
    sections: {
      heading: string;
      content: string;
    }[];
  };

  // AI-generated practice problems
  generatedPractice?: {
    problems: {
      title: string;
      starterCode: string;
      hint: string;
    }[];
  };

  // AI-generated quiz (draft before saving to Quiz system)
  generatedQuiz?: {
    questions: {
      question: string;
      options: { text: string; isCorrect: boolean }[];
      explanation: string;
      difficulty: 'easy' | 'medium' | 'hard';
    }[];
    savedQuizId?: mongoose.Types.ObjectId;
  };

  // AI-generated assignment (draft before saving to Assignment system)
  generatedAssignment?: {
    title: string;
    description: string;
    instructions: string;
    type: string;
    difficulty: string;
    testCases?: { input: string; expectedOutput: string; description: string; isHidden: boolean; points: number }[];
    starterCode?: string;
    solutionCode?: string;
    savedAssignmentId?: mongoose.Types.ObjectId;
  };

  // Metadata
  recordedAt: Date;
  isPublished: boolean;
  viewCount: number;
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
}

const classRecordingSchema = new Schema<IClassRecording>(
  {
    tenantId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },

    videoUrl: { type: String, required: true },
    duration: { type: Number, default: 0 },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: 'video/webm' },
    thumbnailUrl: { type: String },

    status: {
      type: String,
      enum: ['uploading', 'uploaded', 'transcribing', 'summarizing', 'generating_notes', 'generating_quiz', 'generating_practice', 'generating_assignment', 'completed', 'failed'],
      default: 'uploading'
    },
    processingProgress: { type: Number, default: 0 },
    processingError: { type: String },

    transcript: { type: String },

    summary: {
      overview: { type: String },
      keyPoints: [{ type: String }],
      topics: [{ type: String }]
    },

    generatedNotes: {
      sections: [{
        heading: { type: String },
        content: { type: String }
      }]
    },

    generatedPractice: {
      problems: [{
        title: { type: String },
        starterCode: { type: String },
        hint: { type: String }
      }]
    },

    generatedQuiz: {
      questions: [{
        question: { type: String },
        options: [{ text: { type: String }, isCorrect: { type: Boolean } }],
        explanation: { type: String },
        difficulty: { type: String, enum: ['easy', 'medium', 'hard'] }
      }],
      savedQuizId: { type: Schema.Types.ObjectId, ref: 'Quiz' }
    },

    generatedAssignment: {
      title: { type: String },
      description: { type: String },
      instructions: { type: String },
      type: { type: String },
      difficulty: { type: String },
      testCases: [{
        input: { type: String },
        expectedOutput: { type: String },
        description: { type: String },
        isHidden: { type: Boolean },
        points: { type: Number }
      }],
      starterCode: { type: String },
      solutionCode: { type: String },
      savedAssignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment' }
    },

    recordedAt: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    tags: [{ type: String }]
  },
  { timestamps: true }
);

classRecordingSchema.index({ tenantId: 1, courseId: 1 });
classRecordingSchema.index({ tenantId: 1, instructor: 1 });
classRecordingSchema.index({ tenantId: 1, isPublished: 1 });

export default mongoose.model<IClassRecording>('ClassRecording', classRecordingSchema);
