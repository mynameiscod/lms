import crypto from 'crypto';
import * as settings from './settingsService';

/**
 * Meta signs every webhook call with the app secret (X-Hub-Signature-256 = sha256 HMAC of the raw
 * body). Without checking it, anyone who knows the URL can post a fake "reply" that then shows as a
 * chat staff act on.
 *
 * Mode (Platform Settings → WHATSAPP_WEBHOOK_SIGNATURE):
 *   log     — default. Check, log a mismatch, still accept. Run this until a real delivery is seen
 *             to verify; a wrong secret in "enforce" would silently drop every reply.
 *   enforce — reject anything unsigned or mis-signed.
 *   off     — skip the check.
 */
export function verifyMetaSignature(rawBody: Buffer | string | undefined, header: string | undefined): { accept: boolean; reason?: string } {
  const mode = (settings.getStr('WHATSAPP_WEBHOOK_SIGNATURE', 'log') || 'log').toLowerCase();
  if (mode === 'off') return { accept: true };
  const secret = settings.getStr('WHATSAPP_APP_SECRET', '') || settings.getStr('META_APP_SECRET', '') || process.env.META_APP_SECRET || '';
  const enforce = mode === 'enforce';

  let reason: string | undefined;
  if (!secret) reason = 'no app secret configured';
  else if (!rawBody) reason = 'raw body unavailable';
  else if (!header || !header.startsWith('sha256=')) reason = 'missing signature';
  else {
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return { accept: true };
    reason = 'signature mismatch';
  }
  // Enforcing without a secret would drop every message — that is a configuration error, not an attack.
  if (enforce && secret) return { accept: false, reason };
  return { accept: true, reason };
}
