/**
 * The three things that made every tenant boundary in this product negotiable.
 *
 * None of them was in a feature. They were in the shared middleware every request passes
 * through before any feature code runs, which is why the careful tenant scoping in Modules
 * 1–15 could not save them: a forged token or a spoofed header decided the tenant before a
 * controller was reached.
 */

import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');

const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'tests') walk(p, out); }
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
};

// ── the signing key ─────────────────────────────────────────────────────────

describe('the JWT signing key', () => {
  const { jwtSecret, assertSecretsPresent } = require('../config/secrets');
  const original = process.env.JWT_SECRET;
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.JWT_SECRET = original;
    process.env.NODE_ENV = originalEnv;
  });

  it('refuses to resolve when it is not set', () => {
    delete process.env.JWT_SECRET;
    // No default, and no random one either — a generated key would invalidate every
    // session on every restart.
    expect(() => jwtSecret()).toThrow(/JWT_SECRET is not set/);
  });

  it('refuses the literal that used to be the fallback', () => {
    process.env.JWT_SECRET = 'secret-key';
    expect(() => jwtSecret()).toThrow(/published in this repository/);
  });

  it('refuses the other published fallbacks too', () => {
    for (const banned of ['fallback-key-32-chars-minimum!!', 'codebegun-dev-secret']) {
      process.env.JWT_SECRET = banned;
      expect(() => jwtSecret()).toThrow(/published in this repository/);
    }
  });

  it('refuses a secret too short to be worth brute-forcing, in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short';
    expect(() => jwtSecret()).toThrow(/at least/);
  });

  it('accepts a real secret and never puts it in the error path', () => {
    process.env.JWT_SECRET = 'a-genuinely-long-random-value-for-tests';
    expect(jwtSecret()).toBe('a-genuinely-long-random-value-for-tests');
    expect(() => assertSecretsPresent()).not.toThrow();
  });

  it('reads the environment per call, so a rotation does not need a module reload', () => {
    process.env.JWT_SECRET = 'first-secret-value-long-enough';
    expect(jwtSecret()).toBe('first-secret-value-long-enough');
    process.env.JWT_SECRET = 'second-secret-value-long-enough';
    expect(jwtSecret()).toBe('second-secret-value-long-enough');
  });

  /**
   * The guard that matters most, because the bug was not one bad line — it was eight
   * copies of one bad line, any of which could be reintroduced by somebody following
   * local convention.
   */
  it('has no literal fallback left in any authentication or signing path', () => {
    /**
     * TWO FILES ARE DELIBERATELY EXEMPT, and they are the reason this commit does not
     * finish the job. settingsService and leadSourceConfigController derive an AES key
     * from `ENCRYPTION_KEY || JWT_SECRET || <literal>` and use it to encrypt stored
     * provider API keys. Removing that chain — or merely setting JWT_SECRET on a host
     * that never had one — changes the key and makes existing ciphertext unreadable.
     *
     * They come out once ENCRYPTION_KEY is pinned on the host and the stored secrets are
     * verified to still decrypt. Until then this list is the record of what is left.
     */
    const PENDING_ENCRYPTION_CHECKPOINT = [
      path.join('services', 'settingsService.ts'),
      path.join('controllers', 'leadSourceConfigController.ts'),
    ];

    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = path.relative(SRC, file);
      if (rel === path.join('config', 'secrets.ts')) continue;   // names them to refuse them
      if (PENDING_ENCRYPTION_CHECKPOINT.includes(rel)) continue;
      if (/JWT_SECRET\s*\|\|/.test(fs.readFileSync(file, 'utf8'))) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('still has exactly the two encryption files left, so the debt cannot be forgotten', () => {
    const remaining = walk(SRC)
      .filter(f => /JWT_SECRET\s*\|\|/.test(fs.readFileSync(f, 'utf8')))
      .map(f => path.relative(SRC, f))
      .filter(r => r !== path.join('config', 'secrets.ts'))
      .sort();
    expect(remaining).toEqual([
      path.join('controllers', 'leadSourceConfigController.ts'),
      path.join('services', 'settingsService.ts'),
    ]);
  });

  it('routes every runtime verification through the one helper', () => {
    for (const f of [
      'middleware/auth.ts',
      'controllers/authController.ts',
      'services/authService.ts',
      'controllers/publicPassportController.ts',
      'routes/learningContentLibraryRoutes.ts',
    ]) {
      expect(read(f)).toContain('jwtSecret()');
    }
  });
});

// ── the tenant boundary ─────────────────────────────────────────────────────

describe('which tenant a request acts on', () => {
  const { tenantResolver } = require('../middleware/tenantResolver');

  const run = (req: any) => {
    const res: any = { statusCode: 200, body: null };
    res.status = (c: number) => { res.statusCode = c; return res; };
    res.json = (b: any) => { res.body = b; return res; };
    let nexted = false;
    tenantResolver(req, res, () => { nexted = true; });
    return { req, res, nexted };
  };

  let warn: jest.SpyInstance;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => warn.mockRestore());

  it('takes the tenant from the verified token', () => {
    const { req, nexted } = run({ headers: {}, user: { id: 'u1', tenantId: 'tenant-a' }, method: 'GET', path: '/x' });
    expect(req.tenantId).toBe('tenant-a');
    expect(nexted).toBe(true);
  });

  it('IGNORES a header that names a different tenant', () => {
    // The whole vulnerability, in one assertion: this used to return 'tenant-b'.
    const { req } = run({
      headers: { 'x-tenant-id': 'tenant-b' },
      user: { id: 'u1', tenantId: 'tenant-a' },
      method: 'GET', path: '/leads',
    });
    expect(req.tenantId).toBe('tenant-a');
  });

  it('says so when a caller tries, because that is what probing looks like', () => {
    run({
      headers: { 'x-tenant-id': 'tenant-b' },
      user: { id: 'u1', tenantId: 'tenant-a' },
      method: 'GET', path: '/leads',
    });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/ignoring x-tenant-id/));
  });

  it('is unmoved by the header the client legitimately sends', () => {
    // The real client puts its OWN tenant in the header on nearly every call.
    const { req } = run({
      headers: { 'x-tenant-id': 'tenant-a' },
      user: { id: 'u1', tenantId: 'tenant-a' },
      method: 'GET', path: '/x',
    });
    expect(req.tenantId).toBe('tenant-a');
    expect(warn).not.toHaveBeenCalled();
  });

  it('gives a member no way to reach another tenant, whatever they send', () => {
    for (const attempt of ['tenant-b', ' tenant-b', 'TENANT-B', '../tenant-b']) {
      const { req } = run({
        headers: { 'x-tenant-id': attempt },
        user: { id: 'stu1', role: 'STUDENT', tenantId: 'tenant-a' },
        method: 'GET', path: '/passport/dashboard',
      });
      expect(req.tenantId).toBe('tenant-a');
    }
  });

  it('gives a tenant admin no way either — there is no switching flow', () => {
    const { req } = run({
      headers: { 'x-tenant-id': 'tenant-b' },
      user: { id: 'a1', role: 'TENANT_ADMIN', tenantId: 'tenant-a' },
      method: 'GET', path: '/admin/analytics',
    });
    expect(req.tenantId).toBe('tenant-a');
  });

  it('gives a SUPER_ADMIN no implicit one either', () => {
    // Cross-tenant administration would need its own permission, a check that the target
    // exists, and an audit row. A header is none of those things.
    const { req } = run({
      headers: { 'x-tenant-id': 'tenant-b' },
      user: { id: 's1', role: 'SUPER_ADMIN', tenantId: 'tenant-a' },
      method: 'GET', path: '/admin/analytics',
    });
    expect(req.tenantId).toBe('tenant-a');
  });

  it('still resolves an unauthenticated public request from the header', () => {
    // The only case with no token to ask. These routes carry no user-scoped authority.
    const { req, nexted } = run({ headers: { 'x-tenant-id': 'tenant-a' }, method: 'GET', path: '/public/x' });
    expect(req.tenantId).toBe('tenant-a');
    expect(nexted).toBe(true);
  });

  it('refuses a request with no tenant at all', () => {
    const { res, nexted } = run({ headers: {}, method: 'GET', path: '/x' });
    expect(res.statusCode).toBe(400);
    expect(nexted).toBe(false);
  });

  /**
   * Ordering is part of the fix. tenantResolver reads req.user, so a router that resolves
   * the tenant BEFORE authenticating has nothing but the caller's own header to go on —
   * which is the vulnerability again, one file at a time.
   */
  it('is never mounted before the middleware that populates req.user', () => {
    const routes = path.join(SRC, 'routes');
    const offenders: string[] = [];
    for (const f of fs.readdirSync(routes).filter(n => n.endsWith('.ts'))) {
      const lines = fs.readFileSync(path.join(routes, f), 'utf8').split('\n');
      const auth = lines.findIndex(l => /router\.use\((authMiddleware|authenticateToken)/.test(l));
      const tenant = lines.findIndex(l => /router\.use\(tenantResolver/.test(l));
      if (auth >= 0 && tenant >= 0 && tenant < auth) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});

// ── the debug endpoint ──────────────────────────────────────────────────────

describe('the token-decoding debug endpoint', () => {
  it('is gone', () => {
    const appSrc = read('app.ts');
    expect(appSrc).not.toContain("app.post('/api/debug/auth'");
    expect(appSrc).not.toMatch(/\/api\/debug\/auth['"]\s*,\s*\(/);
  });

  it('takes its secret-presence probe with it', () => {
    // The old response reported whether a signing key was configured, turning "is this host
    // running the published fallback?" into a question anybody could ask the server.
    expect(read('app.ts')).not.toMatch(/jwt_secret_set\s*:/);
  });

  it('leaves no debug route registered anywhere', () => {
    // Matches a route REGISTRATION, so a comment recording the removal does not trip it.
    const registers = /(app|router)\.(get|post|put|delete|use)\(\s*['"][^'"]*debug[^'"]*['"]/;
    for (const file of walk(SRC)) {
      expect(registers.test(fs.readFileSync(file, 'utf8'))).toBe(false);
    }
  });
});
