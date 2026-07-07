import mongoose, { Schema, Document } from 'mongoose';

export interface IMentorMessage {
  role: 'user' | 'assistant';
  content: string;
  at: Date;
}

export interface IMentorChat extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  messages: IMentorMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MentorChatSchema = new Schema<IMentorChat>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    messages: {
      type: [{
        role:    { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        at:      { type: Date, default: Date.now },
        _id: false,
      }],
      default: [],
    },
  },
  { timestamps: true }
);
MentorChatSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IMentorChat>('MentorChat', MentorChatSchema);
