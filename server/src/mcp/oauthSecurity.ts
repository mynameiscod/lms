import crypto from 'crypto';

/** OAuth 2.1 PKCE S256 verifier. No plain challenge support. */
export function validPkceChallenge(challenge: unknown): challenge is string {
  return typeof challenge === 'string' && /^[A-Za-z0-9_-]{43}$/.test(challenge);
}

export function verifyPkceS256(verifier: unknown, challenge: unknown): boolean {
  if (typeof verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  if (!validPkceChallenge(challenge)) return false;
  const digest = crypto.createHash('sha256').update(verifier, 'ascii').digest('base64url');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(challenge));
}

/** Require exact registered callback URIs; no wildcards, prefixes or fragments. */
export function registeredRedirect(uri: unknown, registered: readonly string[]): boolean {
  if (typeof uri !== 'string' || uri.includes('#')) return false;
  try {
    const parsed = new URL(uri);
    if (parsed.username || parsed.password) return false;
    const isLoopback = ['127.0.0.1', '[::1]', 'localhost'].includes(parsed.hostname);
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback)) return false;
    return registered.includes(uri);
  } catch { return false; }
}

/** Hash opaque access/refresh tokens before database persistence. */
export function tokenDigest(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
