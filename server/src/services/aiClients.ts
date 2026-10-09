import Anthropic from '@anthropic-ai/sdk';
import { currentTenantId } from './requestContext';
import { assertAiBudget } from './tenantLimits';
import OpenAI from 'openai';
import * as settings from './settingsService';

/**
 * Shared, lazily-built AI clients. Unlike the old `const client = new Anthropic(
 * { apiKey: process.env... })` pattern (which captured the key once at import,
 * before the DB was even connected), these read the *current* key from
 * settingsService at call time and rebuild the client whenever the key changes.
 * That makes the keys set in the Platform Settings UI take effect immediately —
 * no redeploy required.
 *
 * settingsService.get() falls back to process.env, so .env still works for any
 * key not yet moved to the UI.
 */

let anthropic: { key: string; client: Anthropic } | null = null;
let openai: { key: string; client: OpenAI } | null = null;

/** Current Anthropic client, or null when no key is configured. */
/** The bare client — for aiGateway, which records usage itself. Everyone else: getAnthropic(). */
export function getAnthropicRaw(): Anthropic | null {
  const key = settings.get('ANTHROPIC_API_KEY');
  if (!key) {
    anthropic = null;
    return null;
  }
  if (!anthropic || anthropic.key !== key) {
    anthropic = { key, client: new Anthropic({ apiKey: key }) };
  }
  return anthropic.client;
}

/** Current OpenAI client, or null when no key is configured. */
/** The bare client — for aiGateway, which records usage itself. Everyone else: getOpenAI(). */
export function getOpenAIRaw(): OpenAI | null {
  const key = settings.get('OPENAI_API_KEY');
  if (!key) {
    openai = null;
    return null;
  }
  if (!openai || openai.key !== key) {
    openai = { key, client: new OpenAI({ apiKey: key }) };
  }
  return openai.client;
}

// ── Metering: every AI call counts against its institute ──────────────────────
//
// 24 files call these clients directly, and only calls through aiGateway were recorded — often
// without an institute — so per-institute AI spend was partial and no budget could hold. The
// clients handed out below check the institute's monthly AI budget before each call and record
// what it cost after, for the institute of the current request/job (requestContext).

async function meterBefore(): Promise<string | undefined> {
  const tenantId = currentTenantId();
  await assertAiBudget(tenantId);
  return tenantId;
}

function meterAfter(tenantId: string | undefined, provider: 'anthropic' | 'openai', model: string, inT: number, outT: number) {
  if (!inT && !outT) return;
  // Loaded lazily: aiGateway imports this module.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { recordUsage } = require('./aiGateway');
  recordUsage({ tenantId, module: 'direct', provider, model: String(model || 'unknown'), inputTokens: inT, outputTokens: outT }).catch(() => {});
}

const metered = new WeakMap<object, any>();

export function getAnthropic(): Anthropic | null {
  const raw = getAnthropicRaw();
  if (!raw) return null;
  if (metered.has(raw)) return metered.get(raw);
  const messages = new Proxy(raw.messages, {
    get(target: any, prop) {
      const v = target[prop];
      if (prop !== 'create' || typeof v !== 'function') return typeof v === 'function' ? v.bind(target) : v;
      return async (...args: any[]) => {
        const tenantId = await meterBefore();
        const res: any = await v.apply(target, args);
        if (res?.usage) meterAfter(tenantId, 'anthropic', args[0]?.model, res.usage.input_tokens || 0, res.usage.output_tokens || 0);
        return res;
      };
    },
  });
  const client = new Proxy(raw, { get: (t: any, p) => (p === 'messages' ? messages : t[p]) });
  metered.set(raw, client);
  return client;
}

export function getOpenAI(): OpenAI | null {
  const raw = getOpenAIRaw();
  if (!raw) return null;
  if (metered.has(raw)) return metered.get(raw);
  const wrap = (target: any, provider: 'openai') => new Proxy(target, {
    get(t: any, prop) {
      const v = t[prop];
      if (prop !== 'create' || typeof v !== 'function') return typeof v === 'function' ? v.bind(t) : v;
      return async (...args: any[]) => {
        const tenantId = await meterBefore();
        const res: any = await v.apply(t, args);
        if (res?.usage) meterAfter(tenantId, provider, args[0]?.model, res.usage.prompt_tokens || 0, res.usage.completion_tokens || 0);
        return res;
      };
    },
  });
  const completions = wrap(raw.chat.completions, 'openai');
  const chat = new Proxy(raw.chat, { get: (t: any, p) => (p === 'completions' ? completions : t[p]) });
  // Speech-to-text: budget is enforced; cost is recorded by the callers that know the audio length.
  const transcriptions = new Proxy(raw.audio.transcriptions, {
    get(t: any, prop) {
      const v = t[prop];
      if (prop !== 'create' || typeof v !== 'function') return typeof v === 'function' ? v.bind(t) : v;
      return async (...args: any[]) => { await meterBefore(); return v.apply(t, args); };
    },
  });
  const audio = new Proxy(raw.audio, { get: (t: any, p) => (p === 'transcriptions' ? transcriptions : t[p]) });
  const client = new Proxy(raw, { get: (t: any, p) => (p === 'chat' ? chat : p === 'audio' ? audio : t[p]) });
  metered.set(raw, client);
  return client;
}

export const isAnthropicEnabled = () => !!settings.get('ANTHROPIC_API_KEY');
export const isOpenAIEnabled = () => !!settings.get('OPENAI_API_KEY');
