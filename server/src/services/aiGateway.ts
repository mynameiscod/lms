import { getAnthropic, getOpenAI } from './aiClients';
import * as settings from './settingsService';
import { istToday, ymd } from '../utils/planSchedule';
import AiUsage from '../models/AiUsage';

// ── Pricing (USD per 1M tokens) — override any via settings AI_PRICE_<MODEL>_IN/OUT ──
// Sensible defaults; the USD→INR rate is a single setting.
const PRICE: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini':            { in: 0.15, out: 0.60 },
  'gpt-4o':                 { in: 2.50, out: 10.00 },
  'gpt-4.1-mini':           { in: 0.40, out: 1.60 },
  'claude-haiku-4-5-20251001': { in: 1.00, out: 5.00 },
  'claude-haiku-4-5':       { in: 1.00, out: 5.00 },
  'claude-3-5-haiku':       { in: 0.80, out: 4.00 },
  'claude-sonnet-4-6':      { in: 3.00, out: 15.00 },
  'claude-sonnet-4-5':      { in: 3.00, out: 15.00 },
  'claude-sonnet-4':        { in: 3.00, out: 15.00 },
  'claude-opus-4-8':        { in: 15.00, out: 75.00 },
};
const WHISPER_USD_PER_MIN = 0.006;

const priceFor = (model: string) => {
  // exact, then prefix match (model families with version suffixes)
  if (PRICE[model]) return PRICE[model];
  const key = Object.keys(PRICE).find(k => model.startsWith(k) || k.startsWith(model.split('-2025')[0]));
  return key ? PRICE[key] : { in: 1.0, out: 3.0 }; // conservative default
};
const usdToInr = () => settings.getNum('USD_TO_INR', 85);

interface RecordOpts {
  tenantId?: string; module: string; provider: 'openai' | 'anthropic' | 'whisper';
  model: string; inputTokens?: number; outputTokens?: number; audioSeconds?: number; fellBack?: boolean;
}

// Never let usage logging break an AI call.
export async function recordUsage(o: RecordOpts): Promise<void> {
  try {
    let costUsd: number;
    if (o.provider === 'whisper') costUsd = ((o.audioSeconds || 0) / 60) * WHISPER_USD_PER_MIN;
    else { const p = priceFor(o.model); costUsd = ((o.inputTokens || 0) / 1e6) * p.in + ((o.outputTokens || 0) / 1e6) * p.out; }
    await AiUsage.create({
      tenantId: o.tenantId && /^[a-f0-9]{24}$/i.test(o.tenantId) ? o.tenantId : undefined,
      module: o.module, provider: o.provider, aiModel: o.model,
      inputTokens: o.inputTokens || 0, outputTokens: o.outputTokens || 0, audioSeconds: o.audioSeconds || 0,
      costUsd, costInr: costUsd * usdToInr(), date: ymd(istToday()), fellBack: !!o.fellBack,
    });
  } catch { /* non-fatal */ }
}

export interface AiCompleteOpts {
  tenantId?: string; module: string;
  system: string; user: string; maxTokens?: number;
  prefer?: 'openai' | 'anthropic';        // default 'openai' (cheap)
  openaiModel?: string; anthropicModel?: string;
}

async function callOpenAI(o: AiCompleteOpts): Promise<{ text: string; model: string; inT: number; outT: number } | null> {
  const client = getOpenAI();
  if (!client) return null;
  const model = o.openaiModel || settings.getStr('OPENAI_MODEL', 'gpt-4o-mini');
  const r = await client.chat.completions.create({
    model, max_tokens: o.maxTokens || 1000,
    messages: [{ role: 'system', content: o.system }, { role: 'user', content: o.user }],
  });
  return { text: r.choices?.[0]?.message?.content?.trim() || '', model, inT: r.usage?.prompt_tokens || 0, outT: r.usage?.completion_tokens || 0 };
}

async function callAnthropic(o: AiCompleteOpts): Promise<{ text: string; model: string; inT: number; outT: number } | null> {
  const client = getAnthropic();
  if (!client) return null;
  // Fallback prefers the cheap Haiku tier unless a specific model is requested.
  const model = o.anthropicModel || settings.getStr('AI_FALLBACK_ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001');
  const r: any = await client.messages.create({ model, max_tokens: o.maxTokens || 1000, system: o.system, messages: [{ role: 'user', content: o.user }] });
  const text = (r.content || []).map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
  return { text, model, inT: r.usage?.input_tokens || 0, outT: r.usage?.output_tokens || 0 };
}

/**
 * Single AI completion entry-point with automatic OpenAI↔Claude failover and cost
 * logging. If the preferred provider errors (quota/429/outage) it retries on the
 * other, so one provider running dry never takes a feature down.
 */
export async function aiComplete(o: AiCompleteOpts): Promise<string> {
  const prefer = o.prefer || 'openai';
  const order: ('openai' | 'anthropic')[] = prefer === 'anthropic' ? ['anthropic', 'openai'] : ['openai', 'anthropic'];
  let lastErr: any = null;
  for (let i = 0; i < order.length; i++) {
    const provider = order[i];
    try {
      const res = provider === 'openai' ? await callOpenAI(o) : await callAnthropic(o);
      if (!res) { continue; }                 // provider not configured — try the other
      await recordUsage({ tenantId: o.tenantId, module: o.module, provider, model: res.model, inputTokens: res.inT, outputTokens: res.outT, fellBack: i > 0 });
      return res.text;
    } catch (err: any) {
      lastErr = err;
      console.error(`[aiGateway] ${provider} failed for ${o.module}:`, err?.status || '', err?.message?.slice(0, 140));
      // fall through to the next provider
    }
  }
  throw lastErr || new Error('No AI provider is configured');
}
