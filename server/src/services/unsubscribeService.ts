import crypto from 'crypto';
import EmailSuppression from '../models/EmailSuppression';
import { APP_URL } from '../constants/brand';
import { jwtSecret } from '../config/secrets';

/**
 * One-click unsubscribe.
 *
 * The link carries the address plus an HMAC of it, so the endpoint can verify the
 * request came from an email we sent without needing a per-recipient row to exist
 * up front. Nothing is written until someone actually clicks.
 *
 * The secret is JWT_SECRET — already required for the app to boot, so there is no
 * new configuration to forget in an environment.
 */

// Signs public unsubscribe links. No default: a published signing key lets anyone forge an
// unsubscribe for any recipient. Rotating it invalidates links in already-sent email, which
// is a far smaller cost than a forgeable one.
const secret = () => jwtSecret();

const norm = (email: string) => String(email || '').trim().toLowerCase();

export const tokenFor = (email: string): string =>
  crypto.createHmac('sha256', secret()).update(norm(email)).digest('hex').slice(0, 32);

/** Timing-safe compare so the token can't be probed byte by byte. */
export function verifyToken(email: string, token: string): boolean {
  const expected = tokenFor(email);
  const given = String(token || '');
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

export const unsubscribeUrl = (email: string): string =>
  `${APP_URL}/api/v1/public/unsubscribe?e=${encodeURIComponent(norm(email))}&t=${tokenFor(email)}`;

/** Has this address opted out? Failures return false — a transient DB blip should
 *  not silently swallow mail the recipient still wants. */
export async function isSuppressed(email: string): Promise<boolean> {
  try { return !!(await EmailSuppression.exists({ email: norm(email) })); }
  catch { return false; }
}

export async function suppress(email: string, source?: string, reason?: string): Promise<void> {
  await EmailSuppression.updateOne(
    { email: norm(email) },
    { $setOnInsert: { email: norm(email), source, reason } },
    { upsert: true },
  );
}
