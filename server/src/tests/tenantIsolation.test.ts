import fs from 'fs';
import path from 'path';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

/**
 * Institute isolation (step 3, 2026-10-09). tenantMiddleware used to take the institute from the
 * X-Tenant-Id header on 46 route files, so anyone signed in could act on another institute.
 */
const run = (user: any, header?: string) => {
  const req: any = { user, headers: header ? { 'x-tenant-id': header } : {}, method: 'GET', path: '/x' };
  const res: any = { statusCode: 200 };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  let nexted = false;
  tenantMiddleware(req, res, () => { nexted = true; });
  return { req, res, nexted };
};

const MINE = '69c7723868202a8e4616ef3d';
const THEIRS = '6ac8c2f377f023a80d249660';

describe('tenantMiddleware', () => {
  it('a signed-in user acts on THEIR institute even when the header names another', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { req, nexted } = run({ id: 'u1', role: 'TENANT_ADMIN', tenantId: MINE }, THEIRS);
    expect(nexted).toBe(true);
    expect(req.tenantId).toBe(MINE);
    warn.mockRestore();
  });

  it('a super admin is pinned to their own institute too (no header switching)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { req } = run({ id: 's1', role: 'SUPER_ADMIN', tenantId: MINE }, THEIRS);
    expect(req.tenantId).toBe(MINE);
    warn.mockRestore();
  });

  it('an unauthenticated (public) request still uses the header', () => {
    const { req, nexted } = run(undefined, THEIRS);
    expect(nexted).toBe(true);
    expect(req.tenantId).toBe(THEIRS);
  });

  it('refuses a request with neither', () => {
    const { res, nexted } = run(undefined);
    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(400);
  });
});

describe('every router authenticates before it resolves the institute', () => {
  /*
   * The token can only win if it has been read. A router that ran tenantMiddleware before
   * authMiddleware would quietly fall back to the header again.
   */
  const dirs = ['routes', 'placement', 'notifications'].map((d) => path.join(__dirname, '..', d));
  const files = dirs.filter((d) => fs.existsSync(d))
    .flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.ts')).map((f) => path.join(d, f)));

  // Public, unauthenticated by design: the Google Ads lead webhook (protected by its own key).
  const PUBLIC_ONLY = new Set(['googleAdsRoutes.ts']);
  const checked = files.filter((f) => !PUBLIC_ONLY.has(path.basename(f)));

  it.each(checked.map((f) => [path.relative(path.join(__dirname, '..'), f), f]))('%s', (_name, file) => {
    const src = fs.readFileSync(file as string, 'utf8');
    // The auth middleware may be imported under another name (`authMiddleware as authenticateToken`).
    const alias = src.match(/authMiddleware as (\w+)/)?.[1];
    const names = alias ? `authMiddleware|${alias}` : 'authMiddleware';
    const authRe = new RegExp(`router\\.use\\([^)]*\\b(${names})\\b`);
    const lines = src.split('\n');
    const tenant = lines.findIndex((l) => /router\.use\([^)]*\btenant(Middleware|Resolver)\b/.test(l));
    if (tenant < 0) return;
    const auth = lines.findIndex((l) => authRe.test(l));
    expect(auth >= 0 && auth <= tenant).toBe(true);
  });
});
