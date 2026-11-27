import mongoose, { Document, Schema } from 'mongoose';

/**
 * A skill pack: one skill of a career track (e.g. "Spring Boot"), or one placement pack (e.g.
 * "Java interview questions"). An ordered list of topics, each with a priority.
 *
 * A pack holds no units. The units that teach a topic are the published units whose `topicCode`
 * is that topic, in any year's content — so a topic written once is taught by every pack, and so
 * every track, that names it.
 */
export interface ISkillPack extends Document {
  tenantId: string;
  key: string;
  title: string;
  description?: string;
  kind: 'SKILL' | 'PLACEMENT';
  topics: { topicCode: string; title?: string; priority: 'CORE' | 'MUST' | 'SHOULD' | 'OPTIONAL' }[];
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SkillPackSchema = new Schema<ISkillPack>(
  {
    tenantId:    { type: String, required: true, index: true },
    key:         { type: String, required: true, trim: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String },
    kind:        { type: String, enum: ['SKILL', 'PLACEMENT'], default: 'SKILL' },
    topics: {
      type: [new Schema({
        topicCode: { type: String, required: true, trim: true },
        title:     { type: String },
        priority:  { type: String, enum: ['CORE', 'MUST', 'SHOULD', 'OPTIONAL'], default: 'SHOULD' },
      }, { _id: false })],
      default: [],
    },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

SkillPackSchema.index({ tenantId: 1, key: 1 }, { unique: true });

export default mongoose.model<ISkillPack>('SkillPack', SkillPackSchema);
