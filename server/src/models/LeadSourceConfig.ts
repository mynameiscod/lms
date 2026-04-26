import mongoose, { Schema, Document } from 'mongoose';

// ─── Auto-actions when a lead arrives from this source ──────────────────────
export interface ISourceAutoAction {
  sendWhatsAppWelcome: boolean;        // Send WhatsApp welcome message immediately
  whatsAppWelcomeTemplate?: string;    // Message body ({{name}} placeholder supported)
  defaultPriority: 'hot' | 'warm' | 'cold';
  defaultStageId?: mongoose.Types.ObjectId; // Override default stage for this source
  autoAssign: boolean;                 // Use scoring/assignment engine
  notifyAdminOnNewLead: boolean;       // Email/WhatsApp notification to admin
}

// ─── Per-source credential configs ──────────────────────────────────────────

export interface IMetaAdsConfig {
  pageAccessToken?: string;            // Meta Page Access Token (encrypted at rest)
  pageId?: string;                     // Facebook Page ID
  verifyToken?: string;                // Webhook verify token
  webhookUrl?: string;                 // Computed — for display only
  adAccountId?: string;               // Optional: for cost data
}

export interface IWhatsAppConfig {
  accessToken?: string;               // WhatsApp Cloud API token (encrypted at rest)
  phoneNumberId?: string;             // Meta Phone Number ID
  verifyToken?: string;               // Webhook verify token
  businessAccountId?: string;         // WhatsApp Business Account ID
  webhookUrl?: string;                // Computed — for display only
  qualificationLanguage: 'english' | 'telugu' | 'hindi';
  enableQualificationBot: boolean;    // Auto-ask qualification questions
}

export interface IWebsiteFormConfig {
  embedCode?: string;                 // Computed — snippet to paste on website
  allowedDomains?: string[];          // CORS whitelist for form submissions
  redirectUrl?: string;               // After successful form submission
  webhookUrl?: string;                // Computed public API URL
}

export interface IGoogleSheetConfig {
  // Google Sheets integration is handled by separate GoogleSheetIntegration model
  // This just tracks if it's enabled as a source
  enabled: boolean;
  integrationCount?: number;          // How many sheets are linked
}

export interface IWalkinConfig {
  // Always active — no config needed
  enabled: boolean;
  quickCaptureEnabled: boolean;       // Show quick 3-field walk-in button
}

export interface IReferralConfig {
  enabled: boolean;
  trackReferrerName: boolean;         // Prompt staff to enter referrer name
}

export interface IGoogleAdsConfig {
  // Google Ads leads come via UTM params on landing page form
  enabled: boolean;
  utmSource?: string;                 // e.g. "google"
  utmMedium?: string;                 // e.g. "cpc"
  description?: string;              // Setup instructions displayed in UI
}

export interface IThirdPartyConfig {
  name: string;                       // e.g. "IndiaMART", "Sulekha", "JustDial"
  webhookUrl?: string;               // Computed public API URL for this source
  apiKey?: string;                    // API key for inbound webhook auth (encrypted)
  fieldMapping?: {                    // Map their field names to our field names
    name?: string;
    phone?: string;
    email?: string;
    courseInterest?: string;
    city?: string;
  };
  isActive: boolean;
}

// ─── Last activity stats ─────────────────────────────────────────────────────
export interface ISourceStats {
  lastLeadAt?: Date;
  leadsThisMonth: number;
  leadsTotal: number;
}

// ─── Main Config Document ────────────────────────────────────────────────────
export interface ILeadSourceConfig extends Document {
  tenantId: mongoose.Types.ObjectId;

  // Each source
  metaAds: {
    isConnected: boolean;
    config: IMetaAdsConfig;
    autoActions: ISourceAutoAction;
    stats: ISourceStats;
  };

  whatsApp: {
    isConnected: boolean;
    config: IWhatsAppConfig;
    autoActions: ISourceAutoAction;
    stats: ISourceStats;
  };

  websiteForm: {
    isConnected: boolean;
    config: IWebsiteFormConfig;
    autoActions: ISourceAutoAction;
    stats: ISourceStats;
  };

  googleSheet: {
    isConnected: boolean;
    config: IGoogleSheetConfig;
    autoActions: ISourceAutoAction;
    stats: ISourceStats;
  };

  walkin: {
    isConnected: boolean;
    config: IWalkinConfig;
    autoActions: ISourceAutoAction;
    stats: ISourceStats;
  };

  referral: {
    isConnected: boolean;
    config: IReferralConfig;
    autoActions: ISourceAutoAction;
    stats: ISourceStats;
  };

  googleAds: {
    isConnected: boolean;
    config: IGoogleAdsConfig;
    autoActions: ISourceAutoAction;
    stats: ISourceStats;
  };

  thirdParty: IThirdPartyConfig[];    // IndiaMART, Sulekha, JustDial, etc.

  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const AutoActionSchema = new Schema({
  sendWhatsAppWelcome: { type: Boolean, default: false },
  whatsAppWelcomeTemplate: { type: String, default: '' },
  defaultPriority: { type: String, enum: ['hot', 'warm', 'cold'], default: 'warm' },
  defaultStageId: { type: Schema.Types.ObjectId, ref: 'LeadStage' },
  autoAssign: { type: Boolean, default: true },
  notifyAdminOnNewLead: { type: Boolean, default: false },
}, { _id: false });

const StatsSchema = new Schema({
  lastLeadAt: { type: Date },
  leadsThisMonth: { type: Number, default: 0 },
  leadsTotal: { type: Number, default: 0 },
}, { _id: false });

// ─── Main Schema ─────────────────────────────────────────────────────────────
const LeadSourceConfigSchema = new Schema<ILeadSourceConfig>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },

  metaAds: {
    isConnected: { type: Boolean, default: false },
    config: {
      pageAccessToken: { type: String, default: '' },
      pageId: { type: String, default: '' },
      verifyToken: { type: String, default: 'codebegun_verify' },
      adAccountId: { type: String, default: '' },
    },
    autoActions: { type: AutoActionSchema, default: () => ({}) },
    stats: { type: StatsSchema, default: () => ({}) },
  },

  whatsApp: {
    isConnected: { type: Boolean, default: false },
    config: {
      accessToken: { type: String, default: '' },
      phoneNumberId: { type: String, default: '' },
      verifyToken: { type: String, default: 'codebegun_verify' },
      businessAccountId: { type: String, default: '' },
      qualificationLanguage: { type: String, enum: ['english', 'telugu', 'hindi'], default: 'english' },
      enableQualificationBot: { type: Boolean, default: true },
    },
    autoActions: { type: AutoActionSchema, default: () => ({}) },
    stats: { type: StatsSchema, default: () => ({}) },
  },

  websiteForm: {
    isConnected: { type: Boolean, default: false },
    config: {
      allowedDomains: [{ type: String }],
      redirectUrl: { type: String, default: '' },
    },
    autoActions: { type: AutoActionSchema, default: () => ({}) },
    stats: { type: StatsSchema, default: () => ({}) },
  },

  googleSheet: {
    isConnected: { type: Boolean, default: false },
    config: {
      enabled: { type: Boolean, default: false },
    },
    autoActions: { type: AutoActionSchema, default: () => ({}) },
    stats: { type: StatsSchema, default: () => ({}) },
  },

  walkin: {
    isConnected: { type: Boolean, default: true },
    config: {
      enabled: { type: Boolean, default: true },
      quickCaptureEnabled: { type: Boolean, default: true },
    },
    autoActions: { type: AutoActionSchema, default: () => ({}) },
    stats: { type: StatsSchema, default: () => ({}) },
  },

  referral: {
    isConnected: { type: Boolean, default: true },
    config: {
      enabled: { type: Boolean, default: true },
      trackReferrerName: { type: Boolean, default: true },
    },
    autoActions: { type: AutoActionSchema, default: () => ({}) },
    stats: { type: StatsSchema, default: () => ({}) },
  },

  googleAds: {
    isConnected: { type: Boolean, default: false },
    config: {
      enabled: { type: Boolean, default: false },
      utmSource: { type: String, default: 'google' },
      utmMedium: { type: String, default: 'cpc' },
    },
    autoActions: { type: AutoActionSchema, default: () => ({}) },
    stats: { type: StatsSchema, default: () => ({}) },
  },

  thirdParty: [{
    name: { type: String, required: true },
    apiKey: { type: String, default: '' },
    fieldMapping: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
      courseInterest: { type: String },
      city: { type: String },
    },
    isActive: { type: Boolean, default: true },
  }],

}, { timestamps: true });

LeadSourceConfigSchema.index({ tenantId: 1 }, { unique: true });

export default mongoose.model<ILeadSourceConfig>('LeadSourceConfig', LeadSourceConfigSchema);
