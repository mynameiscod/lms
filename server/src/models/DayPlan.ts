import mongoose, { Document, Schema } from 'mongoose';

export type ContentSlot = 'morning' | 'afternoon' | 'evening' | 'anytime';

// A day item is now polymorphic: it may be a piece of library content OR a
// reference to a standalone module (Quiz / Assignment / Code Snippet / Mock
// Interview). The module stays the source of truth; the day just points at it.
export type DayActivityKind = 'content' | 'quiz' | 'assignment' | 'codeSnippet' | 'mockInterview';

export interface IDayContentItem {
  _id?: any;
  kind: DayActivityKind;
  // For kind === 'content' (library content):
  contentId?: mongoose.Types.ObjectId;
  // For module kinds — the referenced model + id (e.g. 'Quiz' / 'InterviewTemplate'):
  sourceModel?: string;
  sourceId?: mongoose.Types.ObjectId;
  contentTitle: string;
  contentType: string;       // library type, or the kind for modules (used for icon)
  slot: ContentSlot;
  isGating: boolean;
  required?: boolean;
  points?: number;
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
    kind:              { type: String, enum: ['content', 'quiz', 'assignment', 'codeSnippet', 'mockInterview'], default: 'content' },
    contentId:         { type: Schema.Types.ObjectId, ref: 'LearningContentLibrary' },
    sourceModel:       { type: String },
    sourceId:          { type: Schema.Types.ObjectId },
    contentTitle:      { type: String, required: true },
    contentType:       { type: String, required: true },
    slot:              { type: String, enum: ['morning', 'afternoon', 'evening', 'anytime'], default: 'anytime' },
    isGating:          { type: Boolean, default: false },
    required:          { type: Boolean, default: true },
    points:            { type: Number, default: 0 },
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
