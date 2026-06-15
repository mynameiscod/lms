import crypto from 'crypto';
import mongoose from 'mongoose';
import SystemSetting from '../models/SystemSetting';
import { SECRET_KEYS, getDef } from '../config/settingsRegistry';

/**
 * settingsService — single source of truth for admin-managed configuration.
 *
 * Resolution order for get(key):
 *   1. value set in the UI (DB, decrypted)   ← takes precedence
 *   2. process.env[key]                        ← .env fallback (nothing breaks
 *                                                 for keys not yet moved to UI)
 *
 * Values are cached in-memory and refreshed on save, so reads are sync + cheap.
 * Secret values are encrypted at rest with AES-256-CBC using ENCRYPTION_KEY
 * (the one irreducible secret that must stay in .env).
 */

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-key-32-chars-minimum!!';

function encrypt(text: string): string {
  if (!text) return '';
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let enc = cipher.update(text, 'utf8', 'hex');
    enc += cipher.final('hex');
    return iv.toString('hex') + ':' + enc;
  } catch {
    return text;
  }
}

function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const [ivHex, enc] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let dec = decipher.update(enc, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch {
    return text;
  }
}

/** Mask a secret for display: keep a hint, never expose the full value. */
export function mask(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return '••••';
  return value.slice(0, 4) + '••••' + value.slice(-4);
}

// ── In-memory cache (decrypted plaintext) ───────────────────────────────────
const cache = new Map<string, string>();
let loaded = false;

/** Load all settings from DB into the cache (decrypting secrets). */
export async function loadAll(): Promise<void> {
  try {
    const rows = await SystemSetting.find({ scope: 'platform' }).lean();
    cache.clear();
    for (const r of rows) {
      const raw = r.isSecret ? decrypt(r.value) : r.value;
      cache.set(r.key, raw);
    }
    loaded = true;
  } catch (e) {
    console.error('[settings] loadAll failed:', e);
  }
}

/** Boot hook — call after DB connect. */
export async function initSettings(): Promise<void> {
  await loadAll();
  console.log(`⚙️  Loaded ${cache.size} system settings from DB`);
}

/**
 * Resolve a config value: UI-set value first, then process.env fallback.
 * Returns undefined if neither has a (non-empty) value.
 */
export function get(key: string): string | undefined {
  const v = cache.get(key);
  if (v !== undefined && v !== '') return v;
  const env = process.env[key];
  return env !== undefined && env !== '' ? env : undefined;
}

/** Like get(), but returns a guaranteed string (empty when unset). */
export function getStr(key: string, fallback = ''): string {
  return get(key) ?? fallback;
}

export function getNum(key: string, fallback: number): number {
  const v = get(key);
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** True when a value exists either in the UI or in .env. */
export function isSet(key: string): boolean {
  return get(key) !== undefined;
}

/** Where did the active value come from — for the admin UI. */
export function source(key: string): 'ui' | 'env' | 'unset' {
  const v = cache.get(key);
  if (v !== undefined && v !== '') return 'ui';
  const env = process.env[key];
  return env !== undefined && env !== '' ? 'env' : 'unset';
}

/**
 * Persist a batch of settings. Empty string deletes the UI override (reverts to
 * .env fallback). Secrets are encrypted; the special sentinel '__UNCHANGED__'
 * leaves an existing secret untouched (so the masked value can be posted back).
 */
export async function setMany(
  entries: { key: string; value: string }[],
  userId?: string
): Promise<void> {
  for (const { key, value } of entries) {
    if (value === '__UNCHANGED__') continue;
    const isSecret = SECRET_KEYS.has(key);
    const def = getDef(key);
    const group = def?.group || 'misc';

    if (value === '') {
      await SystemSetting.deleteOne({ key, scope: 'platform' });
      cache.delete(key);
      continue;
    }

    const stored = isSecret ? encrypt(value) : value;
    await SystemSetting.findOneAndUpdate(
      { key, scope: 'platform' },
      {
        key,
        value: stored,
        group,
        isSecret,
        scope: 'platform',
        updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      },
      { upsert: true, new: true }
    );
    cache.set(key, value);
  }
}

export const isLoaded = () => loaded;
