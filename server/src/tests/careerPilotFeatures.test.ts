/**
 * CareerPilot is switched on feature by feature by the platform administrator, and each feature has its
 * own permission for roles. These guard the three places that must agree so a new CareerPilot screen
 * cannot go out with no switch and no permission of its own.
 */
import fs from 'fs';
import path from 'path';
import { CP_FEATURES, CP_FEATURE_KEYS, CP_ADMIN_PERMS, cpFeatureForRouterPath } from '../config/careerPilotFeatures';
import { effectiveModules, moduleForApiPath, ALL_MODULES, MODULE_PARENT } from '../config/tenantModules';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '../../../', p), 'utf-8');
const clientCfg = read('client/src/config/tenantModules.ts');
const sidebar = read('client/src/components/layout/Sidebar.tsx');
const app = read('client/src/App.tsx');
const roleGuard = read('server/src/middleware/roleGuard.ts');
const routes = read('server/src/routes/passportRoutes.ts');

describe('CareerPilot features: tenant switches', () => {
  it('every feature is a module that follows CareerPilot, on the server and on the admin page', () => {
    for (const k of CP_FEATURE_KEYS) {
      expect(ALL_MODULES).toContain(k);
      expect((MODULE_PARENT as Record<string, string>)[k]).toBe('careerPilot');
      expect(clientCfg).toContain(`key: '${k}'`);
      expect(clientCfg).toContain(`${k}: 'careerPilot'`);
    }
  });

  it('an institute that has CareerPilot today keeps every feature', () => {
    const m = effectiveModules({});
    for (const k of CP_FEATURE_KEYS) expect([k, (m as any)[k]]).toEqual([k, true]);
  });

  it('a new institute (everything off) gets none, and one feature can be switched off on its own', () => {
    const off = effectiveModules(Object.fromEntries(ALL_MODULES.map((k) => [k, false])));
    for (const k of CP_FEATURE_KEYS) expect((off as any)[k]).toBe(false);
    const m = effectiveModules({ cpAssessment: false });
    expect(m.cpAssessment).toBe(false);
    expect(m.cpMembers).toBe(true);
    expect(m.careerPilot).toBe(true);
  });

  it('a feature is never on while CareerPilot itself is off', () => {
    const m = effectiveModules({ careerPilot: false, cpMembers: true });
    expect(m.cpMembers).toBe(false);
  });

  it('refuses a feature\'s API paths when it is off, on both mounts, and leaves the rest of CareerPilot alone', () => {
    for (const base of ['/passport', '/careerpilot']) {
      expect(moduleForApiPath(`${base}/question-bank/12`)).toBe('cpAssessment');
      expect(moduleForApiPath(`${base}/curriculum-units`)).toBe('cpContent');
      expect(moduleForApiPath(`${base}/career-roles`)).toBe('cpCareerMap');
      expect(moduleForApiPath(`${base}/students`)).toBe('cpMembers');
      expect(moduleForApiPath(`${base}/coins/admin/x`)).toBe('cpSetup');
      expect(moduleForApiPath(`${base}/admin/topic-priorities`)).toBe('cpContent'); // longer than /admin
      expect(moduleForApiPath(`${base}/me/roadmap`)).toBe('cpRoadmap');
      expect(moduleForApiPath(`${base}/practice/3`)).toBe('cpPractice');
      expect(moduleForApiPath(`${base}/coins`)).toBe('cpRewards');
      // not owned by a feature: the whole-product switch
      expect(moduleForApiPath(`${base}/me/assessment`)).toBe('careerPilot');
      expect(moduleForApiPath(`${base}/membership`)).toBe('careerPilot');
    }
    expect(moduleForApiPath('/public/passport/join')).toBeNull();
  });

  it('puts every CareerPilot admin screen in the menu under its own feature', () => {
    const entries = [...clientCfg.matchAll(/\['(\/[^']+)', '(\w+)'\]/g)].map((m) => [m[1], m[2]] as [string, string]);
    const mapped = (p: string) => entries.filter(([x]) => p === x || p.startsWith(x + '/')).sort((a, b) => b[0].length - a[0].length)[0]?.[1];
    const pages = [...new Set([...sidebar.matchAll(/path: '(\/admin\/passport\/[a-z0-9-]+)'/g)].map((m) => m[1]))];
    expect(pages.length).toBeGreaterThan(20);
    for (const p of pages) expect([p, CP_FEATURE_KEYS.includes(mapped(p) as string)]).toEqual([p, true]);
  });
});

describe('CareerPilot features: role permissions', () => {
  it('lists every feature permission in the Roles screen next to the "everything" key', () => {
    for (const perm of CP_ADMIN_PERMS) expect(roleGuard).toContain(`key: '${perm}'`);
    expect(roleGuard).toContain("key: 'manage_passport'");
  });

  it('guards each admin route with the umbrella key or its own feature\'s key, never a bare manage_passport', () => {
    expect(routes).toContain('MANAGE_FOR');
    const bare = routes.split('\n').filter((l) => /\bMANAGE,/.test(l) && /router\./.test(l));
    expect(bare).toEqual([]);
    for (const f of CP_FEATURES.filter((x) => x.perm)) expect(routes).toContain(`MANAGE_FOR.${f.key},`);
  });

  it('opens each admin page for the feature\'s permission too', () => {
    for (const f of CP_FEATURES.filter((x) => x.perm)) {
      // Pathways and missions have no menu item any more (the screens are reachable by address only).
      if (f.key !== 'cpPathways') expect(sidebar).toContain(`'${f.perm}'`);
      expect(app).toContain(`'${f.perm}'`);
    }
  });

  it('maps router paths to features, longest prefix first', () => {
    expect(cpFeatureForRouterPath('/question-bank/x')?.key).toBe('cpAssessment');
    expect(cpFeatureForRouterPath('/admin/topic-priorities')?.key).toBe('cpContent');
    expect(cpFeatureForRouterPath('/admin/analytics')?.key).toBe('cpMembers');
    expect(cpFeatureForRouterPath('/me/profile')).toBeNull();
  });
});
