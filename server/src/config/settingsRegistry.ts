/**
 * settingsRegistry — the catalogue of configuration that admins can manage from
 * the UI (Platform Settings). Each entry mirrors the old .env key name so the
 * resolver in settingsService can transparently fall back to process.env for any
 * key that hasn't been set in the UI yet.
 *
 * perTenant: true marks keys an individual tenant can override (e.g. their own
 * sender email or WhatsApp number). Everything else is platform-wide only.
 */
export interface SettingDef {
  key: string;
  label: string;
  group: string;          // must match a SettingGroup.id
  isSecret?: boolean;
  type?: 'text' | 'password' | 'number' | 'boolean' | 'select';
  options?: string[];     // for type 'select'
  placeholder?: string;
  help?: string;
  perTenant?: boolean;
}

export interface SettingGroup {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const SETTING_GROUPS: SettingGroup[] = [
  { id: 'ai',          label: 'AI / LLM',         icon: '🤖', description: 'Anthropic & OpenAI keys, models and pricing used by interviews, assessments, lessons and resume parsing.' },
  { id: 'email',       label: 'Email / SMTP',     icon: '✉️', description: 'Outbound email — Gmail, custom SMTP, or Brevo API. Used for welcome, reset, notifications and receipts.' },
  { id: 'storage',     label: 'Video Storage',    icon: '🎬', description: 'Bunny Stream credentials for class recordings and learning videos.' },
  { id: 'oauth',       label: 'OAuth Providers',  icon: '🔑', description: 'GitHub & LinkedIn OAuth apps used for student account connections and the code playground.' },
  { id: 'messaging',   label: 'Meta / WhatsApp',  icon: '💬', description: 'WhatsApp Cloud API + Meta Lead Ads webhook credentials.' },
  { id: 'integrations',label: 'Other Integrations', icon: '🔌', description: 'Google Ads webhook and payment (UPI) configuration.' },
  { id: 'placement',   label: 'Placement Outreach', icon: '🤝', description: 'Daily send cap, gap between sends and sender name for the placement-partner outreach pipeline. Todoist token for hot-lead/check-in tasks.' },
  { id: 'interview',   label: 'AI Interview', icon: '🎙️', description: 'Realistic AI mock interviews — natural voice (ElevenLabs) and a talking-head interviewer (D-ID). Leave blank to use the free browser voice + animated avatar.' },
];

export const SETTING_DEFS: SettingDef[] = [
  // ── AI / LLM ───────────────────────────────────────────────────────────────
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', group: 'ai', isSecret: true, type: 'password', placeholder: 'sk-ant-...', help: 'Powers interview evaluation, assessment generation and interactive lessons (Claude).' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI API Key', group: 'ai', isSecret: true, type: 'password', placeholder: 'sk-...', help: 'Powers resume parsing/scoring, lead AI and AI voice calls (GPT).' },
  { key: 'INTERVIEW_AI_MODEL', label: 'Interview Model', group: 'ai', type: 'text', placeholder: 'claude-sonnet-4-6', help: 'Claude model used for the Interview Module. Leave blank to use the built-in default.' },
  { key: 'ASSESSMENT_GEN_MODEL', label: 'Assessment — Question Gen Model', group: 'ai', type: 'text', placeholder: 'claude-sonnet-4-6' },
  { key: 'ASSESSMENT_DESIGN_MODEL', label: 'Assessment — Exam Designer Model', group: 'ai', type: 'text', placeholder: 'claude-sonnet-4-6' },
  { key: 'ASSESSMENT_ROADMAP_MODEL', label: 'Assessment — Roadmap Model', group: 'ai', type: 'text', placeholder: 'claude-sonnet-4-6' },
  { key: 'OPENAI_MODEL', label: 'OpenAI Model', group: 'ai', type: 'text', placeholder: 'gpt-4o-mini' },
  { key: 'INTERVIEW_AI_PRICE_IN', label: 'AI Price — Input ($/1M tokens)', group: 'ai', type: 'number', placeholder: '3', help: 'Used to estimate AI cost in analytics. Defaults ≈ Claude Sonnet.' },
  { key: 'INTERVIEW_AI_PRICE_OUT', label: 'AI Price — Output ($/1M tokens)', group: 'ai', type: 'number', placeholder: '15' },

  // ── Email / SMTP ─────────────────────────────────────────────────────────── (per-tenant: sender + SMTP)
  { key: 'EMAIL_SERVICE', label: 'Email Provider', group: 'email', type: 'select', options: ['gmail', 'smtp', 'brevo'], placeholder: 'gmail', help: 'gmail = Gmail SMTP (port 587); smtp = custom SMTP; brevo = Brevo HTTP API.', perTenant: true },
  { key: 'EMAIL_FROM', label: 'From (Name <email>)', group: 'email', type: 'text', placeholder: 'CodeBegun <no-reply@codebegun.com>', help: 'The From header. Per-tenant so each institute can send from its own address.', perTenant: true },
  { key: 'EMAIL_USER', label: 'SMTP / Account Username', group: 'email', type: 'text', placeholder: 'you@gmail.com', perTenant: true },
  { key: 'EMAIL_PASSWORD', label: 'SMTP / App Password', group: 'email', isSecret: true, type: 'password', placeholder: 'app password', perTenant: true },
  { key: 'SMTP_HOST', label: 'SMTP Host', group: 'email', type: 'text', placeholder: 'smtp.yourhost.com', help: 'Only for provider = smtp.', perTenant: true },
  { key: 'SMTP_PORT', label: 'SMTP Port', group: 'email', type: 'number', placeholder: '587', perTenant: true },
  { key: 'SMTP_SECURE', label: 'SMTP Secure (TLS)', group: 'email', type: 'select', options: ['false', 'true'], placeholder: 'false', help: 'true = implicit TLS (465); false = STARTTLS (587).', perTenant: true },
  { key: 'BREVO_API_KEY', label: 'Brevo API Key', group: 'email', isSecret: true, type: 'password', placeholder: 'xkeysib-...', help: 'Only for provider = brevo.', perTenant: true },

  // ── Video Storage (Bunny) ────────────────────────────────────────────────────
  { key: 'BUNNY_STREAM_API_KEY', label: 'Bunny Stream API Key', group: 'storage', isSecret: true, type: 'password', placeholder: 'bunny api key' },
  { key: 'BUNNY_STREAM_LIBRARY_ID', label: 'Bunny Library ID', group: 'storage', type: 'text', placeholder: '12345' },
  { key: 'BUNNY_STREAM_CDN_HOSTNAME', label: 'Bunny CDN Hostname', group: 'storage', type: 'text', placeholder: 'vz-xxxx.b-cdn.net' },

  // ── OAuth Providers ──────────────────────────────────────────────────────────
  { key: 'GITHUB_CLIENT_ID', label: 'GitHub Client ID', group: 'oauth', type: 'text', placeholder: 'Iv1....' },
  { key: 'GITHUB_CLIENT_SECRET', label: 'GitHub Client Secret', group: 'oauth', isSecret: true, type: 'password' },
  { key: 'GITHUB_CALLBACK_URL', label: 'GitHub Callback URL', group: 'oauth', type: 'text', placeholder: 'https://platform.codebegun.com/api/v1/oauth/github/callback' },
  { key: 'LINKEDIN_CLIENT_ID', label: 'LinkedIn Client ID', group: 'oauth', type: 'text' },
  { key: 'LINKEDIN_CLIENT_SECRET', label: 'LinkedIn Client Secret', group: 'oauth', isSecret: true, type: 'password' },
  { key: 'LINKEDIN_CALLBACK_URL', label: 'LinkedIn Callback URL', group: 'oauth', type: 'text', placeholder: 'https://platform.codebegun.com/api/v1/oauth/linkedin/callback' },

  // ── Meta / WhatsApp ──────────────────────────────────────────────────────────
  { key: 'WHATSAPP_ACCESS_TOKEN', label: 'WhatsApp Access Token', group: 'messaging', isSecret: true, type: 'password', perTenant: true },
  { key: 'WHATSAPP_PHONE_NUMBER_ID', label: 'WhatsApp Phone Number ID', group: 'messaging', type: 'text', perTenant: true },
  { key: 'WHATSAPP_VERIFY_TOKEN', label: 'WhatsApp Webhook Verify Token', group: 'messaging', type: 'text', placeholder: 'codebegun_whatsapp_verify' },
  { key: 'WHATSAPP_OTP_TEMPLATE', label: 'WhatsApp OTP Template Name', group: 'messaging', type: 'text' },
  { key: 'WHATSAPP_OTP_TEMPLATE_LANG', label: 'OTP Template Language', group: 'messaging', type: 'text', placeholder: 'en' },
  { key: 'META_APP_SECRET', label: 'Meta App Secret', group: 'messaging', isSecret: true, type: 'password', help: 'Used to verify Meta Lead Ads webhook signatures.' },
  { key: 'META_LEAD_VERIFY_TOKEN', label: 'Meta Lead Webhook Verify Token', group: 'messaging', type: 'text' },
  { key: 'PAGE_ACCESS_TOKEN', label: 'Meta Page Access Token', group: 'messaging', isSecret: true, type: 'password' },

  // ── Other Integrations ───────────────────────────────────────────────────────
  { key: 'GOOGLE_ADS_WEBHOOK_KEY', label: 'Google Ads Webhook Key', group: 'integrations', isSecret: true, type: 'password', help: 'Shared secret for the Google Ads lead webhook.' },
  { key: 'UPI_ID', label: 'UPI ID (payments)', group: 'integrations', type: 'text', placeholder: 'name@bank', perTenant: true },

  // ── Placement Outreach ───────────────────────────────────────────────────────
  { key: 'PARTNER_OUTREACH_DAILY_CAP', label: 'Daily Send Cap', group: 'placement', type: 'number', placeholder: '25', help: 'Max cold/follow-up outreach emails sent per day (per tenant). Protects sender reputation.', perTenant: true },
  { key: 'PARTNER_OUTREACH_MIN_GAP_MINUTES', label: 'Minutes Between Sends', group: 'placement', type: 'number', placeholder: '20', help: 'Minimum gap between two outreach sends so they look human and spread out.', perTenant: true },
  { key: 'PARTNER_FOLLOWUP_MAX', label: 'Max Follow-ups', group: 'placement', type: 'number', placeholder: '3', help: 'How many follow-ups to send if there is no reply, before the sequence stops.', perTenant: true },
  { key: 'PARTNER_FOLLOWUP_GAP_DAYS', label: 'Days Between Follow-ups', group: 'placement', type: 'number', placeholder: '3', help: 'Spacing between follow-up emails.', perTenant: true },
  { key: 'PLACEMENT_SENDER_NAME', label: 'Outreach Sender Name', group: 'placement', type: 'text', placeholder: 'Siva — CodeBegun Placements', help: 'Signature name used in outreach emails. Falls back to the Email From name.', perTenant: true },
  { key: 'TODOIST_API_TOKEN', label: 'Todoist API Token', group: 'placement', isSecret: true, type: 'password', help: 'Personal Todoist API token — used to create hot-lead and quarterly check-in tasks (later steps).', perTenant: true },
  { key: 'PLACEMENT_GUARANTEE_DAYS', label: 'Placement Guarantee (days)', group: 'placement', type: 'number', placeholder: '90', help: 'Guarantee window after a placement; you are alerted before it expires.', perTenant: true },
  { key: 'PLACEMENT_CHECKIN_DAYS', label: 'Retention Check-in (days)', group: 'placement', type: 'number', placeholder: '90', help: 'How often to remind you to check in with an active partner.', perTenant: true },
  { key: 'PLACEMENT_FEE_PERCENT', label: 'Placement Fee (% of CTC)', group: 'placement', type: 'number', placeholder: '8.33', help: 'Used to estimate revenue in analytics (e.g. 8.33 ≈ one month salary).', perTenant: true },

  // ── AI Interview ─────────────────────────────────────────────────────────────
  { key: 'INTERVIEW_VOICE_PROVIDER', label: 'Interviewer Voice', group: 'interview', type: 'select', options: ['browser', 'elevenlabs'], placeholder: 'browser', help: 'browser = free robotic voice; elevenlabs = natural human voice (needs key below).', perTenant: true },
  { key: 'ELEVENLABS_API_KEY', label: 'ElevenLabs API Key', group: 'interview', isSecret: true, type: 'password', placeholder: 'sk_...', help: 'ElevenLabs → Profile → API key. Powers the natural interviewer voice.', perTenant: true },
  { key: 'ELEVENLABS_VOICE_ID', label: 'ElevenLabs Voice ID', group: 'interview', type: 'text', placeholder: 'EXAVITQu4vr4xnSDxMaL', help: 'ElevenLabs → Voices → copy a voice ID (e.g. a warm professional voice).', perTenant: true },
  { key: 'INTERVIEW_AVATAR_PROVIDER', label: 'Interviewer Face', group: 'interview', type: 'select', options: ['animated', 'did'], placeholder: 'animated', help: 'animated = free avatar tile that animates while speaking; did = D-ID real-time talking head (needs key below).', perTenant: true },
  { key: 'DID_API_KEY', label: 'D-ID API Key', group: 'interview', isSecret: true, type: 'password', placeholder: 'basic ...', help: 'D-ID → Studio → API. Powers the real-time talking-head interviewer.', perTenant: true },
  { key: 'INTERVIEW_AVATAR_IMAGE_URL', label: 'Interviewer Avatar Image URL', group: 'interview', type: 'text', placeholder: 'https://.../interviewer.jpg', help: 'A professional headshot used as the talking-head presenter (and the avatar tile).', perTenant: true },
  { key: 'INTERVIEW_INTERVIEWER_NAME', label: 'Interviewer Name', group: 'interview', type: 'text', placeholder: 'Maya', help: 'The persona name the AI introduces itself as.', perTenant: true },
];

export const SECRET_KEYS = new Set(SETTING_DEFS.filter(d => d.isSecret).map(d => d.key));
export const getDef = (key: string) => SETTING_DEFS.find(d => d.key === key);
export const MANAGED_KEYS = SETTING_DEFS.map(d => d.key);
export const PER_TENANT_KEYS = new Set(SETTING_DEFS.filter(d => d.perTenant).map(d => d.key));
