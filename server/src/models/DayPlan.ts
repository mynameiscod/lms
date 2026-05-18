import mongoose, { Document, Schema } from 'mongoose';

export type ContentSlot = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface IDayContentItem {
  _id?: any;
  contentId: mongoose.Types.ObjectId;
  contentTitle: string;
  contentType: string;
  slot: ContentSlot;
  isGating: boolean;
  order: number;
  estimatedDuration: number;
}

export interface IDayPlan extends Document {
  tenantId: string;
  curriculumId: mongoose.Types.ObjectId;
  topicId: string;
  dayNumber: number;
  title?: string;
  notes?: string;
  items: IDayContentItem[];
  createdAt: Date;
  updatedAt: Date;
}

const DayContentItemSchema = new Schema<IDayContentItem>(
  {
    contentId:         { type: Schema.Types.ObjectId, ref: 'LearningContentLibrary', required: true },
    contentTitle:      { type: String, required: true },
    contentType:       { type: String, required: true },
    slot:              { type: String, enum: ['morning', 'afternoon', 'evening', 'anytime'], default: 'anytime' },
    isGating:          { type: Boolean, default: false },
    order:             { type: Number, default: 0 },
    estimatedDuration: { type: Number, default: 0 },
  },
  { _id: true }
);

const DayPlanSchema = new Schema<IDayPlan>(
  {
    tenantId:     { type: String, required: true, index: true },
    curriculumId: { type: Schema.Types.ObjectId, ref: 'LearningCurriculum', required: true },
    topicId:      { type: String, default: '' },
    dayNumber:    { type: Number, required: true, min: 1 },
    title:        { type: String },
    notes:        { type: String },
    items:        [DayContentItemSchema],
  },
  { timestamps: true }
);

DayPlanSchema.index({ curriculumId: 1, dayNumber: 1 }, { unique: true });
DayPlanSchema.index({ tenantId: 1, curriculumId: 1 });

export default mongoose.model<IDayPlan>('DayPlan', DayPlanSchema);
