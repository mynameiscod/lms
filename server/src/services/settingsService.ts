import crypto from 'crypto';
import mongoose from 'mongoose';
import SystemSetting from '../models/SystemSetting';
import { SECRET_KEYS, getDef } from '../config/settingsRegistry';

/**
 * settingsService — single source of truth for admin-managed configuration.
 *
 * Resolution order for get(key, tenantId?):
 *   1. tenant override (DB, decrypted)         ← only if tenantId given
 *   2. platform value set in the UI (DB)        ← takes precedence over .env
 *   3. process.env[key]                          ← .env fallback (nothing breaks
 *                                                  for keys not yet moved to UI)
 *
 * Platform values are also mirrored into process.env at boot/save (applyToEnv),
 * so the many call-time `process.env.X` readers across the codebase pick up
 * UI values with no per-call refactor. Tenant values are NOT mirrored (env is
 * global) — tenant-aware consumers must call get(key, tenantId).
 *
 * Secrets are encrypted at rest with AES-256-CBC using ENCRYPTION_KEY (the one
 * irreducible secret that must stay in .env).
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

// ── In-memory caches (decrypted plaintext) ──────────────────────────────────
const platformCache = new Map<string, string>();
const tenantCache = new Map<string, Map<string, string>>(); // tenantId -> (key -> value)
let loaded = false;

/** Mirror platform values into process.env so call-time readers see UI values. */
export function applyToEnv(): void {
  platformCache.forEach((v, k) => {
    if (v !== '') process.env[k] = v;
  });
}

/** Load all settings from DB into the caches (decrypting secrets). */
export async function loadAll(): Promise<void> {
  try {
    const rows = await SystemSetting.find({}).lean();
    platformCache.clear();
    tenantCache.clear();
    for (const r of rows) {
      const raw = r.isSecret ? decrypt(r.value) : r.value;
      if (r.tenantId) {
        const tid = r.tenantId.toString();
        if (!tenantCache.has(tid)) tenantCache.set(tid, new Map());
        tenantCache.get(tid)!.set(r.key, raw);
      } else {
        platformCache.set(r.key, raw);
      }
    }
    applyToEnv();
    loaded = true;
  } catch (e) {
    console.error('[settings] loadAll failed:', e);
  }
}

/** Boot hook — call after DB connect. */
export async function initSettings(): Promise<void> {
  await loadAll();
  console.log(`⚙️  Loaded ${platformCache.size} platform + ${tenantCache.size} tenant setting groups from DB`);
}

/**
 * Resolve a config value: tenant override → platform UI value → process.env.
 * Returns undefined if none has a (non-empty) value.
 */
export function get(key: string, tenantId?: string): string | undefined {
  if (tenantId) {
    const tv = tenantCache.get(tenantId)?.get(key);
    if (tv !== undefined && tv !== '') return tv;
  }
  const pv = platformCache.get(key);
  if (pv !== undefined && pv !== '') return pv;
  const env = process.env[key];
  return env !== undefined && env !== '' ? env : undefined;
}

export function getStr(key: string, fallback = '', tenantId?: string): string {
  return get(key, tenantId) ?? fallback;
}

export function getNum(key: string, fallback: number, tenantId?: string): number {
  const v = get(key, tenantId);
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function isSet(key: string, tenantId?: string): boolean {
  return get(key, tenantId) !== undefined;
}

/** Where the active value came from — for the admin UI. */
export function source(key: string, tenantId?: string): 'tenant' | 'ui' | 'env' | 'unset' {
  if (tenantId) {
    const tv = tenantCache.get(tenantId)?.get(key);
    if (tv !== undefined && tv !== '') return 'tenant';
  }
  const pv = platformCache.get(key);
  if (pv !== undefined && pv !== '') return 'ui';
  const env = process.env[key];
  return env !== undefined && env !== '' ? 'env' : 'unset';
}

/**
 * Persist a batch of settings. Empty string deletes the override (reverts to the
 * next level down). The sentinel '__UNCHANGED__' leaves an existing secret
 * untouched (so a masked value can be posted back unchanged).
 */
export async function setMany(
  entries: { key: string; value: string }[],
  userId?: string,
  tenantId?: string
): Promise<void> {
  const tid = tenantId ? new mongoose.Types.ObjectId(tenantId) : null;

  for (const { key, value } of entries) {
    if (value === '__UNCHANGED__') continue;
    const isSecret = SECRET_KEYS.has(key);
    const def = getDef(key);
    const group = def?.group || 'misc';

    if (value === '') {
      await SystemSetting.deleteOne({ key, tenantId: tid });
      if (tenantId) tenantCache.get(tenantId)?.delete(key);
      else platformCache.delete(key);
      continue;
    }

    const stored = isSecret ? encrypt(value) : value;
    await SystemSetting.findOneAndUpdate(
      { key, tenantId: tid },
      {
        key,
        value: stored,
        group,
        isSecret,
        scope: tenantId ? 'tenant' : 'platform',
        tenantId: tid,
        updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      },
      { upsert: true, new: true }
    );

    if (tenantId) {
      if (!tenantCache.has(tenantId)) tenantCache.set(tenantId, new Map());
      tenantCache.get(tenantId)!.set(key, value);
    } else {
      platformCache.set(key, value);
    }
  }

  // Re-mirror platform values into process.env (no-op for tenant saves).
  if (!tenantId) applyToEnv();
}

export const isLoaded = () => loaded;
