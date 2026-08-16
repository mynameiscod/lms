import mongoose, { Schema, Document } from 'mongoose';

// One row per AI call — the ledger behind the "AI Spend" dashboard.
export interface IAiUsage extends Document {
  tenantId?: mongoose.Types.ObjectId;
  module: string;                 // 'thinking_lab_eval', 'quiz_gen', 'interview', 'whisper', …
  /** Which PRODUCT the spend belongs to — 'careerpilot' | 'lms'. Module alone cannot
   *  answer "what is CareerPilot costing us": several modules (resume, interview) serve
   *  both products, so the split has to be stated by the caller, not inferred from a
   *  name prefix. Absent on rows written before this existed; those read as 'lms'. */
  product?: string;
  /**
   * WHO the call was made for.
   *
   * Without it the ledger can show that spend doubled and cannot say whether a hundred new
   * members arrived or one script found the resume endpoint — which is the difference
   * between good news and an incident, and the difference between having a rate limit and
   * being able to act on one. Optional: admin drafting and system jobs have no member, and
   * rows written before this existed have none either.
   */
  studentId?: mongoose.Types.ObjectId;
  provider: 'openai' | 'anthropic' | 'whisper';
  aiModel: string;
  inputTokens: number;
  outputTokens: number;
  audioSeconds: number;           // for speech-to-text
  /**
   * Characters sent to text-to-speech. TTS is billed per character, so without this the
   * cost on the row cannot be reconciled against the provider's invoice — you can see
   * what we think we spent, but not the quantity we were charged for.
   */
  chars: number;
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
    product:     { type: String, index: true },
    studentId:   { type: Schema.Types.ObjectId, ref: 'User' },
    provider:    { type: String, required: true },
    aiModel:     { type: String, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens:{ type: Number, default: 0 },
    audioSeconds:{ type: Number, default: 0 },
    chars:       { type: Number, default: 0 },
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
AiUsageSchema.index({ product: 1, date: 1 });
/** "Who spent the most today" — the query an abuse investigation actually starts with. */
AiUsageSchema.index({ tenantId: 1, studentId: 1, date: 1 });

export default mongoose.model<IAiUsage>('AiUsage', AiUsageSchema);
