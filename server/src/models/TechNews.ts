import mongoose, { Document, Schema } from 'mongoose';

/**
 * A daily tech-news item shown to CareerPilot members.
 *
 * Deliberately stores a SUMMARY and a link, never the article body. Republishing a
 * publisher's text on a paid product is copying; summarising it with attribution and a
 * link back is normal practice and is what the student actually wants — three lines and
 * a way to read more.
 *
 * `imageUrl` is the publisher's og:image and is stored as a URL rather than copied, but
 * it is only ever rendered with the source credited beside it.
 */
export interface ITechNews extends Document {
  tenantId: string;
  title: string;
  /** Three lines at most. What happened and why a student should care. */
  summary: string;
  /** Optional: a longer take an admin writes themselves. Never scraped article text. */
  note?: string;
  url: string;
  /** Publisher name, shown as attribution. */
  source: string;
  imageUrl?: string;
  tags: string[];
  /** Drafts are invisible to members; the AI writes drafts, a human publishes them. */
  status: 'draft' | 'published';
  /** True when the summary came from the model, so an admin can see what to check. */
  aiGenerated: boolean;
  publishedAt?: Date | null;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TechNewsSchema = new Schema<ITechNews>({
  tenantId: { type: String, required: true, index: true },
  title:    { type: String, required: true, trim: true },
  summary:  { type: String, default: '' },
  note:     { type: String, default: '' },
  url:      { type: String, required: true, trim: true },
  source:   { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  tags:     [{ type: String }],
  status:   { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  aiGenerated: { type: Boolean, default: false },
  publishedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// The member feed is always "published, newest first" — the only query that has to be fast.
TechNewsSchema.index({ tenantId: 1, status: 1, publishedAt: -1 });
// Stops the same link being posted twice, which is the commonest admin slip when two
// people are both feeding the queue.
TechNewsSchema.index({ tenantId: 1, url: 1 }, { unique: true });

export default mongoose.model<ITechNews>('TechNews', TechNewsSchema);
