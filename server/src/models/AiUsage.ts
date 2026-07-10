import mongoose, { Schema, Document } from 'mongoose';

// One row per AI call — the ledger behind the "AI Spend" dashboard.
export interface IAiUsage extends Document {
  tenantId?: mongoose.Types.ObjectId;
  module: string;                 // 'thinking_lab_eval', 'quiz_gen', 'interview', 'whisper', …
  provider: 'openai' | 'anthropic' | 'whisper';
  aiModel: string;
  inputTokens: number;
  outputTokens: number;
  audioSeconds: number;           // for speech-to-text
  costUsd: number;
  costInr: number;
  date: string;                   // 'YYYY-MM-DD' (IST)
  fellBack: boolean;              // true if the primary provider failed and we used the other
  createdAt: Date;
}

const AiUsageSchema = new Schema<IAiUsage>(
  {
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant' },
    module:      { type: String, required: true, index: true },
    provider:    { type: String, required: true },
    aiModel:     { type: String, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens:{ type: Number, default: 0 },
    audioSeconds:{ type: Number, default: 0 },
    costUsd:     { type: Number, default: 0 },
    costInr:     { type: Number, default: 0 },
    date:        { type: String, required: true, index: true },
    fellBack:    { type: Boolean, default: false },
    createdAt:   { type: Date, default: Date.now },
  },
  { timestamps: false }
);
AiUsageSchema.index({ tenantId: 1, date: 1 });
AiUsageSchema.index({ date: 1, module: 1 });

export default mongoose.model<IAiUsage>('AiUsage', AiUsageSchema);
