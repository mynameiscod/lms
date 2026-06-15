import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as settings from '../services/settingsService';
import { SETTING_GROUPS, SETTING_DEFS } from '../config/settingsRegistry';
import { getAnthropic, getOpenAI } from '../services/aiClients';

/**
 * GET /system-settings
 * Returns the catalogue (groups + field defs) plus the current resolved value
 * for each key. Secrets are NEVER returned in plaintext — only a masked hint and
 * whether a value is set and where it came from (ui | env | unset).
 */
export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const values = SETTING_DEFS.map((def) => {
      const raw = settings.get(def.key);
      const src = settings.source(def.key);
      const has = raw !== undefined && raw !== '';
      return {
        key: def.key,
        label: def.label,
        group: def.group,
        type: def.type || (def.isSecret ? 'password' : 'text'),
        isSecret: !!def.isSecret,
        placeholder: def.placeholder || '',
        help: def.help || '',
        options: def.options || undefined,
        isSet: has,
        source: src,
        // secrets: masked hint only; non-secrets: the actual value for editing
        value: def.isSecret ? '' : (raw || ''),
        masked: def.isSecret && has ? settings.mask(raw!) : '',
      };
    });

    res.json({ success: true, data: { groups: SETTING_GROUPS, settings: values } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load settings' });
  }
};

/**
 * PUT /system-settings
 * Body: { settings: [{ key, value }] }
 *   - value ''             → clears the UI override (reverts to .env fallback)
 *   - value '__UNCHANGED__' → leaves an existing secret untouched
 */
export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const incoming: { key: string; value: string }[] = req.body?.settings || [];
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ success: false, message: 'settings must be an array' });
    }
    // Only allow keys we know about.
    const allowed = new Set(SETTING_DEFS.map((d) => d.key));
    const filtered = incoming.filter((e) => e && allowed.has(e.key) && typeof e.value === 'string');

    await settings.setMany(filtered, req.user?.id);
    res.json({ success: true, message: 'Settings saved' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Failed to save settings' });
  }
};

/**
 * POST /system-settings/test/:provider   (provider = 'anthropic' | 'openai')
 * Makes a tiny live call with the currently-saved key so an admin can verify
 * the credential before relying on it.
 */
export const testProvider = async (req: AuthenticatedRequest, res: Response) => {
  const provider = req.params.provider;
  try {
    if (provider === 'anthropic') {
      const client = getAnthropic();
      if (!client) return res.status(400).json({ success: false, message: 'No Anthropic API key configured.' });
      const model = settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6');
      const r = await client.messages.create({
        model, max_tokens: 8,
        messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
      });
      const text = r.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
      return res.json({ success: true, message: `Anthropic OK (${model}) → "${text}"` });
    }

    if (provider === 'openai') {
      const client = getOpenAI();
      if (!client) return res.status(400).json({ success: false, message: 'No OpenAI API key configured.' });
      const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini');
      const r = await client.chat.completions.create({
        model, max_tokens: 8,
        messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
      });
      const text = r.choices?.[0]?.message?.content?.trim() || '';
      return res.json({ success: true, message: `OpenAI OK (${model}) → "${text}"` });
    }

    return res.status(400).json({ success: false, message: 'Unknown provider' });
  } catch (e: any) {
    const detail = e?.status ? `(${e.status}) ` : '';
    res.status(400).json({ success: false, message: `${provider} test failed: ${detail}${e?.message || 'error'}` });
  }
};
