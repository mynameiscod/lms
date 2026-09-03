import mongoose, { Schema, Document } from 'mongoose';
import { IMemberAudience, MemberAudienceSchema } from './memberAudience';

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
  batchIds: mongoose.Types.ObjectId[]; // empty = all batches; else only these batches see it
  /**
   * Which product this challenge is written for.
   *
   * Same vocabulary and the same asymmetry as the Thinking Lab bank, so an admin who has
   * learned one audience control has learned both: an untagged challenge belongs to the
   * LMS and nobody else, while CareerPilot requires an EXPLICIT tag. Inheriting every
   * existing challenge into CareerPilot the moment members could read them would be a
   * content review nobody performed.
   */
  audiences: ChallengeAudience[];
  /**
   * Which members this is for, beyond the product tag above.
   *
   * Empty on every axis means everyone, so nothing already written changes. Narrowing is
   * how a second-year CSE student and a final-year ECE student stop being handed the same
   * item on the same day.
   */
  audience: IMemberAudience;
  isSeed?: boolean;           // marks the built-in seeded set (so re-seeding is idempotent)
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Who a challenge is for. Mirrors PROBLEM_AUDIENCES in the Thinking Lab bank deliberately —
 * two vocabularies for the same idea would be one more thing to keep in step.
 */
export const CHALLENGE_AUDIENCES = ['lms', 'careerpilot'] as const;
export type ChallengeAudience = typeof CHALLENGE_AUDIENCES[number];

/**
 * The audience half of a query.
 *
 * LMS matches three shapes — tagged, field absent (written before audiences existed), or an
 * empty array — so no existing challenge disappears from the LMS. CareerPilot matches only
 * an explicit tag, which is what keeps an unreviewed back-catalogue out of the member app.
 */
export const challengeAudienceFilter = (audience: ChallengeAudience) => (
  audience === 'lms'
    ? { $or: [{ audiences: 'lms' }, { audiences: { $exists: false } }, { audiences: { $size: 0 } }] }
    : { audiences: audience }
);

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
    batchIds: { type: [Schema.Types.ObjectId], ref: 'Batch', default: [] },
    audiences: { type: [String], enum: CHALLENGE_AUDIENCES, default: ['lms'] },
    audience: MemberAudienceSchema,
    isSeed: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

CommunicationChallengeSchema.index({ tenantId: 1, challengeType: 1, active: 1, sequenceNumber: 1 });

export default mongoose.model<ICommunicationChallenge>('CommunicationChallenge', CommunicationChallengeSchema);
