import mongoose, { Schema, Document } from 'mongoose';

/**
 * One "Was this helpful?" answer per person per article, so the counts on SupportFaq cannot be
 * pushed up or down by clicking repeatedly. Changing one's mind moves the vote, not adds one.
 */
export interface ISupportFaqVote extends Document {
  faqId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  helpful: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupportFaqVoteSchema = new Schema<ISupportFaqVote>(
  {
    faqId:   { type: Schema.Types.ObjectId, ref: 'SupportFaq', required: true },
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    helpful: { type: Boolean, required: true },
  },
  { timestamps: true }
);

SupportFaqVoteSchema.index({ faqId: 1, userId: 1 }, { unique: true });

export default mongoose.model<ISupportFaqVote>('SupportFaqVote', SupportFaqVoteSchema);
