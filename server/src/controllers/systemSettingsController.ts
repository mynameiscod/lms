import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as settings from '../services/settingsService';
import { SETTING_GROUPS, SETTING_DEFS, PER_TENANT_KEYS } from '../config/settingsRegistry';
import { getAnthropic, getOpenAI } from '../services/aiClients';
import { EmailService } from '../services/emailService';
import Tenant from '../models/Tenant';

/**
 * GET /system-settings?tenantId=...
 * Returns the catalogue (groups + field defs) plus the current resolved value
 * for each key. Secrets are NEVER returned in plaintext — only a masked hint and
 * whether a value is set and where it came from (tenant | ui | env | unset).
 *
 * When tenantId is given, only per-tenant-capable fields are returned, each with
 * the tenant's own override plus the inherited (platform/.env) value for context.
 */
export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || undefined;
    const defs = tenantId ? SETTING_DEFS.filter((d) => d.perTenant) : SETTING_DEFS;

    const values = defs.map((def) => {
      const raw = settings.get(def.key, tenantId);
      const src = settings.source(def.key, tenantId);
      const has = raw !== undefined && raw !== '';

      // For tenant scope: the override itself vs the inherited platform/.env value.
      const ownRaw = tenantId ? settings.getStr(def.key, '', tenantId) : (raw || '');
      const inheritedRaw = tenantId ? settings.get(def.key) : undefined; // platform/env

      return {
        key: def.key,
        label: def.label,
        group: def.group,
        type: def.type || (def.isSecret ? 'password' : 'text'),
        isSecret: !!def.isSecret,
        perTenant: !!def.perTenant,
        placeholder: def.placeholder || '',
        help: def.help || '',
        options: def.options || undefined,
        isSet: has,
        source: src,
        value: def.isSecret ? '' : (tenantId ? (src === 'tenant' ? ownRaw : '') : (raw || '')),
        masked: def.isSecret && has ? settings.mask(raw!) : '',
        inheritedMasked: tenantId && inheritedRaw ? (def.isSecret ? settings.mask(inheritedRaw) : inheritedRaw) : '',
      };
    });

    const groups = tenantId
      ? SETTING_GROUPS.filter((g) => defs.some((d) => d.group === g.id))
      : SETTING_GROUPS;

    res.json({ success: true, data: { groups, settings: values, scope: tenantId ? 'tenant' : 'platform' } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load settings' });
  }
};

/**
 * PUT /system-settings
 * Body: { settings: [{ key, value }], tenantId? }
 *   - value ''             → clears the override (reverts to platform/.env)
 *   - value '__UNCHANGED__' → leaves an existing secret untouched
 */
export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const incoming: { key: string; value: string }[] = req.body?.settings || [];
    const tenantId: string | undefined = req.body?.tenantId || undefined;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ success: false, message: 'settings must be an array' });
    }

    const allowed = new Set(SETTING_DEFS.map((d) => d.key));
    let filtered = incoming.filter((e) => e && allowed.has(e.key) && typeof e.value === 'string');
    // Tenant scope may only set per-tenant keys.
    if (tenantId) filtered = filtered.filter((e) => PER_TENANT_KEYS.has(e.key));

    await settings.setMany(filtered, req.user?.id, tenantId);
    res.json({ success: true, message: 'Settings saved' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Failed to save settings' });
  }
};

/**
 * POST /system-settings/test/:provider   (provider = 'anthropic' | 'openai')
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

/**
 * POST /system-settings/test-email   Body: { to, tenantId? }
 * Sends a real test email using the saved (platform or tenant) email config.
 */
export const sendTestEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const to = (req.body?.to || '').trim();
    const tenantId: string | undefined = req.body?.tenantId || undefined;
    if (!to || !/^\S+@\S+\.\S+$/.test(to)) {
      return res.status(400).json({ success: false, message: 'A valid recipient email is required.' });
    }
    const svc = new EmailService(tenantId);
    await svc.sendTestEmail(to);
    res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (e: any) {
    res.status(400).json({ success: false, message: `Email test failed: ${e?.message || 'error'}` });
  }
};

/**
 * GET /system-settings/tenants — minimal tenant list for the per-tenant scope picker.
 */
export const listTenantsForSettings = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const tenants = await Tenant.find({}).select('_id name').sort({ name: 1 }).lean();
    res.json({ success: true, data: tenants.map((t: any) => ({ id: t._id.toString(), name: t.name })) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load tenants' });
  }
};
