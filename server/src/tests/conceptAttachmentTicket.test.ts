/**
 * The download ticket.
 *
 * The streaming route sits OUTSIDE the auth middleware on purpose — a browser streaming a
 * gigabyte from an <a href> cannot send an Authorization header — so this ticket is the
 * only thing standing in front of it. Every rule it enforces is pinned here.
 *
 * The verification is reproduced rather than imported: pulling in the controller would drag
 * express, mongoose and the Bunny client into a test about a signature.
 */

import jwt from 'jsonwebtoken';

const SECRET = 'test-secret-for-attachment-tickets';
const KEY_RE = /^[a-z0-9]{1,40}\/[a-f0-9]{32}\.[a-z0-9]{1,8}$/;

const KEY = `t1/${'a'.repeat(32)}.pdf`;
const OTHER = `t1/${'b'.repeat(32)}.pdf`;

const issue = (key: string, opts: any = {}) =>
  jwt.sign({ k: key, typ: 'attach', ...(opts.claims || {}) }, opts.secret || SECRET,
    { expiresIn: opts.expiresIn || '10m' });

/** Exactly the check streamAttachment performs, in the same order. */
const accepts = (key: string, token: string): boolean => {
  if (!KEY_RE.test(key)) return false;
  let claim: any;
  try { claim = jwt.verify(token, SECRET); } catch { return false; }
  return claim?.typ === 'attach' && claim?.k === key;
};

describe('a valid ticket opens its own file', () => {
  it('accepts a ticket issued for that exact key', () => {
    expect(accepts(KEY, issue(KEY))).toBe(true);
  });
});

describe('a ticket cannot be pointed at another file', () => {
  /**
   * The replay this exists to stop. Without binding the key into the claim, any ticket
   * would open any attachment, and keys are guessable in bulk far more easily than they
   * are individually.
   */
  it('refuses a ticket issued for a different key', () => {
    expect(accepts(OTHER, issue(KEY))).toBe(false);
  });

  it('refuses when the claim names no key at all', () => {
    const token = jwt.sign({ typ: 'attach' }, SECRET, { expiresIn: '10m' });
    expect(accepts(KEY, token)).toBe(false);
  });
});

describe('only attachment tickets are honoured', () => {
  /**
   * The same secret signs session tokens. Without the `typ` check, a stolen or forged
   * LOGIN token would be accepted here as a download ticket.
   */
  it('refuses a token of another type signed with the same secret', () => {
    const session = jwt.sign({ id: 'u1', k: KEY }, SECRET, { expiresIn: '10m' });
    expect(accepts(KEY, session)).toBe(false);
  });

  it('refuses a token whose typ is merely similar', () => {
    expect(accepts(KEY, issue(KEY, { claims: { typ: 'attachment' } }))).toBe(false);
  });
});

describe('a ticket is short-lived and unforgeable', () => {
  it('refuses one that has expired', () => {
    const stale = jwt.sign({ k: KEY, typ: 'attach' }, SECRET, { expiresIn: '-1s' });
    expect(accepts(KEY, stale)).toBe(false);
  });

  it('refuses one signed with a different secret', () => {
    expect(accepts(KEY, issue(KEY, { secret: 'not-the-secret' }))).toBe(false);
  });

  it('refuses a tampered payload', () => {
    const parts = issue(KEY).split('.');
    const forged = Buffer.from(JSON.stringify({ k: OTHER, typ: 'attach' }))
      .toString('base64url');
    expect(accepts(OTHER, `${parts[0]}.${forged}.${parts[2]}`)).toBe(false);
  });

  it('refuses garbage and empty input', () => {
    expect(accepts(KEY, '')).toBe(false);
    expect(accepts(KEY, 'not-a-token')).toBe(false);
    expect(accepts(KEY, 'a.b.c')).toBe(false);
  });
});

describe('the key is still validated before the ticket', () => {
  /**
   * Order matters: a traversal attempt must be refused on its shape, never reaching a
   * signature check that a valid ticket for that same malformed string could pass.
   */
  it('refuses a traversal path even with a ticket minted for it', () => {
    const bad = '../../etc/passwd';
    expect(accepts(bad, issue(bad))).toBe(false);
  });
});
