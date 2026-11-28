import crypto from 'crypto';
import { validPkceChallenge, verifyPkceS256, registeredRedirect, tokenDigest, generateOpaqueToken } from '../mcp/oauthSecurity';

describe('OAuth security primitives', () => {
  const verifier = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

  test('accepts valid PKCE S256 proof', () => {
    expect(validPkceChallenge(challenge)).toBe(true);
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
  });

  test('rejects wrong PKCE verifier and malformed challenge', () => {
    expect(verifyPkceS256(verifier + 'x', challenge)).toBe(false);
    expect(verifyPkceS256(verifier, 'bad')).toBe(false);
    expect(verifyPkceS256('short', challenge)).toBe(false);
  });

  test('requires an exact registered HTTPS redirect', () => {
    const allowed = ['https://client.example.com/oauth/callback'];
    expect(registeredRedirect(allowed[0], allowed)).toBe(true);
    expect(registeredRedirect(allowed[0] + '/extra', allowed)).toBe(false);
    expect(registeredRedirect('https://client.example.com.evil.test/oauth/callback', allowed)).toBe(false);
    expect(registeredRedirect(allowed[0] + '#fragment', allowed)).toBe(false);
    expect(registeredRedirect('http://client.example.com/oauth/callback', allowed)).toBe(false);
  });

  test('opaque tokens are random and hashed deterministically', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(tokenDigest(a)).toBe(tokenDigest(a));
    expect(tokenDigest(a)).not.toBe(tokenDigest(b));
  });
});
