/**
 * The payment return redirect must land on our own site.
 *
 * `paymentReturn` is PUBLIC — Razorpay redirects the browser to it after checkout, carrying
 * a `to` parameter that decides where the member lands next. It was guarded with
 * `startsWith('/')`, which lets `//evil.com` through: that is a PROTOCOL-RELATIVE URL, and
 * the browser resolves it to https://evil.com.
 *
 * The moment matters as much as the mechanism. A member who has just paid, arriving from
 * our own domain, is about as primed to trust the next page as a person ever gets.
 */

import { isSafeReturnPath } from '../controllers/paymentController';

describe('a safe return path', () => {
  it('accepts ordinary in-app paths', () => {
    for (const p of ['/passport', '/careerpilot/roadmap', '/passport?tab=plan', '/a/b/c#top']) {
      expect(isSafeReturnPath(p)).toBe(true);
    }
  });

  it('refuses a protocol-relative URL, which the old guard allowed', () => {
    // The bug, in one assertion: this starts with '/' and is not a path at all.
    expect(isSafeReturnPath('//evil.com')).toBe(false);
    expect(isSafeReturnPath('//evil.com/pay')).toBe(false);
  });

  it('refuses the backslash spelling of the same trick', () => {
    // Browsers normalise the backslash to a forward slash before resolving.
    expect(isSafeReturnPath('/\\evil.com')).toBe(false);
  });

  it('refuses anything carrying a scheme', () => {
    for (const p of ['https://evil.com', 'http://evil.com', 'javascript:alert(1)', 'data:text/html,x']) {
      expect(isSafeReturnPath(p)).toBe(false);
    }
  });

  it('refuses control characters that could smuggle a header', () => {
    expect(isSafeReturnPath('/passport\r\nLocation: https://evil.com')).toBe(false);
    expect(isSafeReturnPath('/passport\n')).toBe(false);
  });

  it('refuses an empty or absent target rather than guessing', () => {
    expect(isSafeReturnPath('')).toBe(false);
    expect(isSafeReturnPath(undefined as any)).toBe(false);
    expect(isSafeReturnPath(null as any)).toBe(false);
  });

  it('refuses a bare relative path, which could resolve anywhere', () => {
    expect(isSafeReturnPath('passport')).toBe(false);
    expect(isSafeReturnPath('../admin')).toBe(false);
  });
});
