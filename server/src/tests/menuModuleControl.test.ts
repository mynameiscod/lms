/**
 * Every item in the menu is controlled by the platform administrator. This guards the three lists that
 * must agree (server modules, the admin page's modules, the page-to-module map) and the menu itself, so a
 * new menu item cannot quietly go out with no switch, which is how Employees, Expenses, AI Spend and
 * Integrations ended up visible to every college.
 */
import fs from 'fs';
import path from 'path';
import { ALL_MODULES, ADMIN_MODULES, ORIGINAL_MODULES, MODULE_PARENT } from '../config/tenantModules';

const client = (p: string) => fs.readFileSync(path.join(__dirname, '../../../client/src', p), 'utf-8');
const cfg = client('config/tenantModules.ts');
const sidebar = client('components/layout/Sidebar.tsx');

const block = (text: string, from: string, to: string) => { const a = text.indexOf(from); return text.slice(a, text.indexOf(to, a)); };
const quoted = (text: string) => [...text.matchAll(/'(\w+)'/g)].map((m) => m[1]);

/** Menu paths that are not an institute's to switch: the platform administrator's own pages, and the landing page. */
const ALWAYS_AVAILABLE = ['/dashboard', '/admin/platform-settings', '/super-admin/tenants'];

describe('the module lists agree', () => {
  it('on the server and on the admin page', () => {
    const originals = quoted(block(cfg, 'export const ORIGINAL_MODULE_KEYS', '] as const'));
    const admin = quoted(block(cfg, 'export const ADMIN_MODULE_KEYS', '] as const'));
    const parents = [...block(cfg, 'export const MODULE_PARENT', '} as const').matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]);
    expect([...originals].sort()).toEqual([...ORIGINAL_MODULES].sort());
    expect([...admin].sort()).toEqual([...ADMIN_MODULES].sort());
    expect([...parents].sort()).toEqual(Object.keys(MODULE_PARENT).sort());
  });

  it('give every module a switch on the Tenant Management page', () => {
    const defs = [...block(cfg, 'export const MODULE_DEFS', '];').matchAll(/key: '(\w+)'/g)].map((m) => m[1]);
    expect([...defs].sort()).toEqual([...ALL_MODULES].sort());
  });
});

describe('the menu', () => {
  const entries = [...block(cfg, 'const PATH_MODULE', ').sort').matchAll(/\['([^']+)', '(\w+)'\]/g)].map((m) => [m[1], m[2]] as [string, string]);
  const mapped = (p: string) => entries
    .filter(([prefix]) => (prefix.endsWith('-') ? p.startsWith(prefix) : p === prefix || p.startsWith(`${prefix}/`)))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1];

  it('only maps pages to modules that exist', () => {
    for (const [, m] of entries) expect(ALL_MODULES).toContain(m);
  });

  it('puts every menu path under a module, apart from the dashboard and the platform administrator pages', () => {
    const paths = [...new Set([...sidebar.matchAll(/path: '(\/[^']*)'/g)].map((m) => m[1]))];
    expect(paths.length).toBeGreaterThan(100);
    // An item may name its module itself (moduleKey: ...) instead of relying on its page address.
    const named = new Set([...sidebar.matchAll(/path: '(\/[^']*)'[^\n]*?moduleKey: '(\w+)'/g)].map((m) => m[1]));
    const loose = paths.filter((p) => !ALWAYS_AVAILABLE.includes(p) && !named.has(p) && !mapped(p));
    expect(loose).toEqual([]);
  });

  it('ties the former free-for-all items to the new switches', () => {
    expect(mapped('/users')).toBe('userManagement');
    expect(mapped('/roles')).toBe('rolesManagement');
    expect(mapped('/batches')).toBe('batchManagement');
    expect(mapped('/notifications')).toBe('notifications');
    expect(mapped('/admin/concerns')).toBe('concerns');
    expect(mapped('/employees')).toBe('employees');
    expect(mapped('/employee-activity')).toBe('employees');
    expect(mapped('/expenses')).toBe('expenses');
    expect(mapped('/admin/ai-spend')).toBe('aiSpend');
    expect(mapped('/admin/logs')).toBe('apiLogs');
    expect(mapped('/admin/integrations')).toBe('integrations');
    expect(mapped('/admin/branding')).toBe('branding');
    expect(mapped('/student-features')).toBe('studentFeatures');
  });
});
