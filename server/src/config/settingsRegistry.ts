/**
 * settingsRegistry — the catalogue of configuration that admins can manage from
 * the UI (Platform Settings). Each entry mirrors the old .env key name so the
 * resolver in settingsService can transparently fall back to process.env for any
 * key that hasn't been set in the UI yet. Add groups here as later phases land.
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
}

export interface SettingGroup {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const SETTING_GROUPS: SettingGroup[] = [
  {
    id: 'ai',
    label: 'AI / LLM',
    icon: '🤖',
    description: 'Anthropic & OpenAI keys, models and pricing used by interviews, assessments, lessons and resume parsing.',
  },
];

export const SETTING_DEFS: SettingDef[] = [
  // ── AI / LLM ───────────────────────────────────────────────────────────────
  {
    key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', group: 'ai',
    isSecret: true, type: 'password', placeholder: 'sk-ant-...',
    help: 'Powers interview evaluation, assessment generation and interactive lessons (Claude).',
  },
  {
    key: 'OPENAI_API_KEY', label: 'OpenAI API Key', group: 'ai',
    isSecret: true, type: 'password', placeholder: 'sk-...',
    help: 'Powers resume parsing/scoring, lead AI and AI voice calls (GPT).',
  },
  {
    key: 'INTERVIEW_AI_MODEL', label: 'Interview Model', group: 'ai',
    type: 'text', placeholder: 'claude-sonnet-4-6',
    help: 'Claude model used for the Interview Module. Leave blank to use the built-in default.',
  },
  {
    key: 'ASSESSMENT_GEN_MODEL', label: 'Assessment — Question Gen Model', group: 'ai',
    type: 'text', placeholder: 'claude-sonnet-4-6',
  },
  {
    key: 'ASSESSMENT_DESIGN_MODEL', label: 'Assessment — Exam Designer Model', group: 'ai',
    type: 'text', placeholder: 'claude-sonnet-4-6',
  },
  {
    key: 'ASSESSMENT_ROADMAP_MODEL', label: 'Assessment — Roadmap Model', group: 'ai',
    type: 'text', placeholder: 'claude-sonnet-4-6',
  },
  {
    key: 'OPENAI_MODEL', label: 'OpenAI Model', group: 'ai',
    type: 'text', placeholder: 'gpt-4o-mini',
  },
  {
    key: 'INTERVIEW_AI_PRICE_IN', label: 'AI Price — Input ($/1M tokens)', group: 'ai',
    type: 'number', placeholder: '3',
    help: 'Used to estimate AI cost in analytics. Defaults ≈ Claude Sonnet.',
  },
  {
    key: 'INTERVIEW_AI_PRICE_OUT', label: 'AI Price — Output ($/1M tokens)', group: 'ai',
    type: 'number', placeholder: '15',
  },
];

export const SECRET_KEYS = new Set(SETTING_DEFS.filter(d => d.isSecret).map(d => d.key));
export const getDef = (key: string) => SETTING_DEFS.find(d => d.key === key);
export const MANAGED_KEYS = SETTING_DEFS.map(d => d.key);
