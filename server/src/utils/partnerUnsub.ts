import crypto from 'crypto';

/**
 * Signed, stateless unsubscribe tokens for partner outreach. Encodes
 * tenantId.partnerId with an HMAC so the public unsubscribe link can't be forged
 * or enumerated. Uses the same irreducible secret as the rest of the app.
 */
const SECRET = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-key-32-chars-minimum!!';

const sign = (payload: string) =>
  crypto.createHmac('sha256', SECRET).update(payload).digest('base64url').slice(0, 20);

export function unsubToken(tenantId: string, partnerId: string): string {
  const payload = `${tenantId}.${partnerId}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

export function verifyUnsubToken(token: string): { tenantId: string; partnerId: string } | null {
  const [b64, sig] = (token || '').split('.');
  if (!b64 || !sig) return null;
  let payload = '';
  try { payload = Buffer.from(b64, 'base64url').toString('utf8'); } catch { return null; }
  if (sign(payload) !== sig) return null;
  const [tenantId, partnerId] = payload.split('.');
  if (!tenantId || !partnerId) return null;
  return { tenantId, partnerId };
}
