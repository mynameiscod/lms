import Anthropic from '@anthropic-ai/sdk';
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
export function getAnthropic(): Anthropic | null {
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
export function getOpenAI(): OpenAI | null {
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

export const isAnthropicEnabled = () => !!settings.get('ANTHROPIC_API_KEY');
export const isOpenAIEnabled = () => !!settings.get('OPENAI_API_KEY');
