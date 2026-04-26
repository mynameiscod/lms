import mongoose, { Schema, Document } from 'mongoose';

export type SalesCallStatus = 'uploaded' | 'processing' | 'processed' | 'failed';

export interface ISalesCallAnalysis {
  transcript: string;
  summary: string;
  /** 0-100 overall quality score */
  qualityScore: number;
  /** Specific dimension scores */
  scores: {
    opening: number;          // How well the call was opened
    needsDiscovery: number;   // Understood lead requirements
    productKnowledge: number; // Accurately explained course/product
    objectionHandling: number; // Handled objections effectively
    closingAttempt: number;   // Attempted to close / next step
    professionalism: number;  // Tone, language, empathy
  };
  keyMoments: string[];       // Notable moments (positive or negative)
  improvements: string[];     // Coaching suggestions
  competitorsMentioned: string[];
  sentimentOverall: 'positive' | 'neutral' | 'negative';
  leadInterestLevel: 'high' | 'medium' | 'low' | 'unknown';
  callDurationSeconds: number;
  wordsPerMinute: number;
  processedAt: Date;
  model: string;
}

export interface ISalesCallRecording extends Document {
  tenantId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  recordedBy: mongoose.Types.ObjectId;        // The salesperson
  audioUrl: string;                            // Stored file path
  fileName: string;
  fileSize: number;                            // Bytes
  mimeType: string;
  durationSeconds?: number;
  status: SalesCallStatus;
  processingProgress: number;                  // 0-100
  analysis?: ISalesCallAnalysis;
  errorMessage?: string;
  notes?: string;                              // Manual notes by manager
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScoresSchema = new Schema(
  {
    opening:           { type: Number, min: 0, max: 100, default: 0 },
    needsDiscovery:    { type: Number, min: 0, max: 100, default: 0 },
    productKnowledge:  { type: Number, min: 0, max: 100, default: 0 },
    objectionHandling: { type: Number, min: 0, max: 100, default: 0 },
    closingAttempt:    { type: Number, min: 0, max: 100, default: 0 },
    professionalism:   { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false }
);

const AnalysisSchema = new Schema(
  {
    transcript:           { type: String, default: '' },
    summary:              { type: String, default: '' },
    qualityScore:         { type: Number, min: 0, max: 100, default: 0 },
    scores:               { type: ScoresSchema, default: {} },
    keyMoments:           [{ type: String }],
    improvements:         [{ type: String }],
    competitorsMentioned: [{ type: String }],
    sentimentOverall:     { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
    leadInterestLevel:    { type: String, enum: ['high', 'medium', 'low', 'unknown'], default: 'unknown' },
    callDurationSeconds:  { type: Number, default: 0 },
    wordsPerMinute:       { type: Number, default: 0 },
    processedAt:          { type: Date },
    model:                { type: String, default: '' },
  },
  { _id: false }
);

const SalesCallRecordingSchema = new Schema(
  {
    tenantId:            { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    leadId:              { type: mongoose.Types.ObjectId, ref: 'Lead', required: true },
    recordedBy:          { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    audioUrl:            { type: String, required: true, trim: true },
    fileName:            { type: String, required: true, trim: true },
    fileSize:            { type: Number, default: 0 },
    mimeType:            { type: String, default: 'audio/mpeg' },
    durationSeconds:     { type: Number },
    status:              { type: String, enum: ['uploaded', 'processing', 'processed', 'failed'], default: 'uploaded' },
    processingProgress:  { type: Number, min: 0, max: 100, default: 0 },
    analysis:            { type: AnalysisSchema },
    errorMessage:        { type: String },
    notes:               { type: String },
    reviewedBy:          { type: mongoose.Types.ObjectId, ref: 'User' },
    reviewedAt:          { type: Date },
  },
  { timestamps: true }
);

SalesCallRecordingSchema.index({ tenantId: 1, leadId: 1 });
SalesCallRecordingSchema.index({ tenantId: 1, recordedBy: 1 });
SalesCallRecordingSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<ISalesCallRecording>('SalesCallRecording', SalesCallRecordingSchema);
