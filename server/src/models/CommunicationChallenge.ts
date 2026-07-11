import mongoose, { Schema, Document } from 'mongoose';

export type ChallengeType =
  | 'self_introduction'
  | 'hr_questions'
  | 'technical_explanation'
  | 'group_discussion'
  | 'presentation';

export type RecordingMode = 'audio' | 'video';

/**
 * A daily communication challenge (variation). The Self-Introduction feature ships with 30
 * seeded variations; admins can create/edit/reorder/activate more. The active challenges are
 * rotated one-per-day so students don't get the identical task every day.
 */
export interface ICommunicationChallenge extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  challengeType: ChallengeType;
  instructions?: string;
  suggestedPoints: string[];
  minSeconds: number;
  targetSeconds: number;
  maxSeconds: number;
  maxAttempts: number;
  recordingModes: RecordingMode[];
  evaluationCriteria?: string;
  sequenceNumber: number;
  active: boolean;
  isSeed?: boolean;           // marks the built-in seeded set (so re-seeding is idempotent)
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationChallengeSchema = new Schema<ICommunicationChallenge>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    challengeType: {
      type: String,
      enum: ['self_introduction', 'hr_questions', 'technical_explanation', 'group_discussion', 'presentation'],
      default: 'self_introduction',
      index: true,
    },
    instructions: { type: String, trim: true },
    suggestedPoints: { type: [String], default: [] },
    minSeconds: { type: Number, default: 120 },
    targetSeconds: { type: Number, default: 180 },
    maxSeconds: { type: Number, default: 210 },
    maxAttempts: { type: Number, default: 2 },
    recordingModes: { type: [String], default: ['audio', 'video'] },
    evaluationCriteria: { type: String, trim: true },
    sequenceNumber: { type: Number, default: 0, index: true },
    active: { type: Boolean, default: true, index: true },
    isSeed: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

CommunicationChallengeSchema.index({ tenantId: 1, challengeType: 1, active: 1, sequenceNumber: 1 });

export default mongoose.model<ICommunicationChallenge>('CommunicationChallenge', CommunicationChallengeSchema);
