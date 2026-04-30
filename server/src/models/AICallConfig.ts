import mongoose, { Schema, Document } from 'mongoose';

export interface IAICallQuestion {
  id: string;
  text: string;           // Question text for TTS
  key: string;            // Field key for LLM context (e.g. 'course_interest')
  order: number;
  required: boolean;
}

export interface IRetryConfig {
  maxAttempts: number;              // Default: 3
  retryGapMinutes: number;          // Gap between retries, default: 30
  nextDayRetry: boolean;            // Retry next day if all attempts exhausted
  workingHoursStart: number;        // Hour in IST (0-23), default: 9
  workingHoursEnd: number;          // Hour in IST (0-23), default: 18
  workingDays: number[];            // 0=Sun ... 6=Sat, default: [1,2,3,4,5,6]
}

export interface IScoringWeights {
  hotThreshold: number;             // aiQualificationScore >= this → HOT, default: 75
  warmThreshold: number;            // aiQualificationScore >= this → WARM, default: 40
  assignOnScore: number;            // Assign to counselor if score >= this, default: 40
  assignRoleId?: mongoose.Types.ObjectId; // Role to assign to (if set, overrides distribution)
}

export interface IWhatsAppFallback {
  enabled: boolean;
  templateName: string;             // Exotel/WhatsApp template name
  triggerAfterMaxAttempts: boolean;
  message?: string;                 // Custom message (if template not used)
}

export interface IAICallConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  enabled: boolean;
  // Exotel credentials (per-tenant, stored encrypted at app level)
  exotelAccountSid: string;
  exotelApiKey: string;
  exotelApiToken: string;
  exotelVirtualNumber: string;      // Exotel virtual number (ExoPhone)
  exotelAppId: string;              // Exotel IVR App ID
  // AI qualification questions
  questions: IAICallQuestion[];
  // Retry configuration
  retry: IRetryConfig;
  // Scoring configuration
  scoring: IScoringWeights;
  // WhatsApp fallback
  whatsappFallback: IWhatsAppFallback;
  // OpenAI model for processing transcripts
  llmModel: string;
  // System prompt for LLM scoring
  systemPrompt?: string;
  // Stats (updated by worker)
  stats: {
    totalCallsInitiated: number;
    totalAnswered: number;
    totalQualified: number;
    lastUpdatedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AICallConfigSchema: Schema = new Schema(
  {
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      unique: true,
      index: true
    },
    enabled: { type: Boolean, default: false },

    // Exotel credentials
    exotelAccountSid: { type: String, trim: true, default: '' },
    exotelApiKey: { type: String, trim: true, default: '' },
    exotelApiToken: { type: String, trim: true, default: '' },
    exotelVirtualNumber: { type: String, trim: true, default: '' },
    exotelAppId: { type: String, trim: true, default: '' },

    // Qualification questions
    questions: [{
      id: { type: String, required: true },
      text: { type: String, required: true, trim: true },
      key: { type: String, required: true, trim: true },
      order: { type: Number, default: 0 },
      required: { type: Boolean, default: false }
    }],

    // Retry config
    retry: {
      maxAttempts: { type: Number, default: 3, min: 1, max: 10 },
      retryGapMinutes: { type: Number, default: 30, min: 5 },
      nextDayRetry: { type: Boolean, default: true },
      workingHoursStart: { type: Number, default: 9, min: 0, max: 23 },
      workingHoursEnd: { type: Number, default: 18, min: 0, max: 23 },
      workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] }
    },

    // Scoring
    scoring: {
      hotThreshold: { type: Number, default: 75, min: 0, max: 100 },
      warmThreshold: { type: Number, default: 40, min: 0, max: 100 },
      assignOnScore: { type: Number, default: 40, min: 0, max: 100 },
      assignRoleId: { type: mongoose.Types.ObjectId, ref: 'Role' }
    },

    // WhatsApp fallback
    whatsappFallback: {
      enabled: { type: Boolean, default: false },
      templateName: { type: String, trim: true, default: '' },
      triggerAfterMaxAttempts: { type: Boolean, default: true },
      message: { type: String, trim: true }
    },

    // LLM config
    llmModel: { type: String, default: 'gpt-4o-mini', trim: true },
    systemPrompt: { type: String, trim: true },

    // Cumulative stats
    stats: {
      totalCallsInitiated: { type: Number, default: 0 },
      totalAnswered: { type: Number, default: 0 },
      totalQualified: { type: Number, default: 0 },
      lastUpdatedAt: { type: Date }
    }
  },
  { timestamps: true }
);

export default mongoose.model<IAICallConfig>('AICallConfig', AICallConfigSchema);
