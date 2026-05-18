import mongoose, { Document, Schema } from 'mongoose';

export type WeekendDayType = 'rest' | 'revision' | 'project' | 'mock_interview' | 'custom';
export type DayOfWeek = 'saturday' | 'sunday';

export interface IWeekendPlan extends Document {
  tenantId: string;
  curriculumId: mongoose.Types.ObjectId;
  weekNumber: number;
  dayOfWeek: DayOfWeek;
  type: WeekendDayType;
  title?: string;
  description?: string;
  items: any[];
  createdAt: Date;
  updatedAt: Date;
}

const WeekendContentItemSchema = new Schema(
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

const WeekendPlanSchema = new Schema<IWeekendPlan>(
  {
    tenantId:     { type: String, required: true, index: true },
    curriculumId: { type: Schema.Types.ObjectId, ref: 'LearningCurriculum', required: true },
    weekNumber:   { type: Number, required: true, min: 1 },
    dayOfWeek:    { type: String, enum: ['saturday', 'sunday'], required: true },
    type:         { type: String, enum: ['rest', 'revision', 'project', 'mock_interview', 'custom'], default: 'rest' },
    title:        { type: String },
    description:  { type: String },
    items:        [WeekendContentItemSchema],
  },
  { timestamps: true }
);

WeekendPlanSchema.index({ curriculumId: 1, weekNumber: 1, dayOfWeek: 1 }, { unique: true });
WeekendPlanSchema.index({ tenantId: 1, curriculumId: 1 });

export default mongoose.model<IWeekendPlan>('WeekendPlan', WeekendPlanSchema);
