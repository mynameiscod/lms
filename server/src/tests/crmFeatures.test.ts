/**
 * Leads / CRM is switched on feature by feature by the platform administrator (2026-11-25). These guard
 * the places that must agree, so a CRM screen cannot go out with no switch of its own.
 */
import fs from 'fs';
import path from 'path';
import { CRM_FEATURES, CRM_FEATURE_KEYS } from '../config/crmFeatures';
import { effectiveModules, moduleForApiPath, ALL_MODULES, MODULE_PARENT } from '../config/tenantModules';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '../../../', p), 'utf-8');
const clientCfg = read('client/src/config/tenantModules.ts');
const tenantModel = read('server/src/models/Tenant.ts');

describe('CRM features: tenant switches', () => {
  it('every feature is a module that follows Leads / CRM, on the server, the schema and the admin page', () => {
    for (const k of CRM_FEATURE_KEYS) {
      expect(ALL_MODULES).toContain(k);
      expect((MODULE_PARENT as Record<string, string>)[k]).toBe('leads');
      expect(tenantModel).toContain(`${k}: { type: Boolean }`);
      expect(clientCfg).toContain(`key: '${k}'`);
      expect(clientCfg).toContain(`${k}: 'leads'`);
    }
  });

  it('every page of a feature is mapped to that feature on the client', () => {
    for (const f of CRM_FEATURES) for (const p of f.paths) expect(clientCfg).toContain(`['${p}', '${f.key}']`);
  });

  it('an institute that has CRM today keeps every feature; Book a demo (a public page) starts off', () => {
    const m = effectiveModules({});
    for (const k of CRM_FEATURE_KEYS.filter((x) => x !== 'crmDemoBooking')) expect([k, (m as any)[k]]).toEqual([k, true]);
    expect((m as any).crmDemoBooking).toBe(false);
    expect((effectiveModules({ crmDemoBooking: true }) as any).crmDemoBooking).toBe(true);
    expect(clientCfg).toContain('out.crmDemoBooking = out.leads && raw.crmDemoBooking === true');
  });

  it('one feature can be switched off on its own; none is on while CRM is off', () => {
    const m = effectiveModules({ crmSalesTeams: false, crmCalling: false });
    expect(m.leads).toBe(true);
    expect((m as any).crmSalesTeams).toBe(false);
    expect((m as any).crmCalling).toBe(false);
    expect((m as any).crmPipeline).toBe(true);
    const off = effectiveModules({ leads: false, crmSalesTeams: true });
    for (const k of CRM_FEATURE_KEYS) expect((off as any)[k]).toBe(false);
    // Lead Report has its own switch, and needs Sales Teams
    expect((effectiveModules({ crmLeadReport: false }) as any).crmLeadReport).toBe(false);
    expect((effectiveModules({ crmLeadReport: false }) as any).crmSalesTeams).toBe(true);
    expect((effectiveModules({ crmSalesTeams: false, crmLeadReport: true }) as any).crmLeadReport).toBe(false);
    const fresh = effectiveModules(Object.fromEntries(ALL_MODULES.map((k) => [k, false])));
    for (const k of CRM_FEATURE_KEYS) expect((fresh as any)[k]).toBe(false);
  });

  it('feature-only APIs are refused with their feature; the APIs the lead page reads stay with leads', () => {
    expect(moduleForApiPath('/sales-teams/me')).toBe('crmSalesTeams');
    expect(moduleForApiPath('/sales-teams/report')).toBe('crmLeadReport');
    expect(moduleForApiPath('/sales-teams/probables/abc')).toBe('crmLeadReport');
    expect(moduleForApiPath('/sales-teams/teams')).toBe('crmSalesTeams');
    expect(moduleForApiPath('/workflows')).toBe('crmAutomation');
    expect(moduleForApiPath('/lead-automation/rules')).toBe('crmAutomation');
    expect(moduleForApiPath('/outpero/settings')).toBe('crmCalling');
    expect(moduleForApiPath('/callyzer/calls')).toBe('crmCalling');
    expect(moduleForApiPath('/event-apis')).toBe('crmSources');
    expect(moduleForApiPath('/google-sheet-integrations/x')).toBe('crmSources');
    expect(moduleForApiPath('/demo-slots/settings')).toBe('crmDemoBooking');
    expect(moduleForApiPath('/public/demo/acme/slots')).not.toBe('crmDemoBooking'); // public: the service checks
    // read by the lead page or the lead list: never blocked by a feature switch
    for (const p of ['/leads', '/lead-stages', '/lead-form-config', '/lead-priority/leads/1/score', '/lead-archive', '/ai-calls', '/follow-ups', '/meetings', '/sales-content']) {
      expect([p, moduleForApiPath(p)]).toEqual([p, 'leads']);
    }
  });
});
