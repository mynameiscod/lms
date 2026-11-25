/**
 * Leads / CRM, one feature at a time (2026-11-25).
 *
 * CRM had ONE switch (`leads`), so an institute given CRM access got every CRM screen: sales teams,
 * workflows, AI calls, Meta sync, archive and the rest. Now the platform administrator switches each
 * part on for an institute, the same way CareerPilot's features work (careerPilotFeatures.ts).
 *
 * The core of the CRM is not a feature: the lead list, the lead page, follow-ups and the follow-up
 * queue come with `leads` itself. Every feature follows `leads` until the platform administrator saves
 * it (MODULE_PARENT in tenantModules.ts), so an institute that has CRM today keeps all of it. A feature
 * is never on while `leads` is off.
 *
 * `paths` = app pages of the feature (client/src/config/tenantModules.ts mirrors them for the menu).
 * `gate`  = API prefixes ONLY this feature's screens use. A request to one is refused when the feature is
 *           off. APIs the lead page also reads (stages, form config, priority, archive, AI calls…) are
 *           left out on purpose: switching a feature off must never break the lead page.
 */

export interface CrmFeature {
  key: string;
  label: string;
  desc: string;
  paths: string[];
  gate: string[];
}

export const CRM_FEATURES: CrmFeature[] = [
  { key: 'crmPipeline', label: 'CRM: Pipeline, stages & sub-stages', desc: 'Lead stages and sub-stages, qualification questions, lead form settings',
    paths: ['/lead-stages', '/qualification-settings', '/lead-form-settings'], gate: [] },
  { key: 'crmReports', label: 'CRM: Dashboards & reports', desc: 'Admissions dashboard, analytics, manager board, team activity, my performance',
    paths: ['/admissions-dashboard', '/leads/analytics', '/lead-manager-board', '/team-activity', '/lead-my-performance'], gate: [] },
  { key: 'crmSalesTeams', label: 'CRM: Sales Teams', desc: 'Teams and managers, My Team and My Day daily reports',
    paths: ['/sales-teams', '/my-team', '/my-day'], gate: ['/sales-teams'] },
  // Its own switch, but it lists the leads of team members, so it is on only while Sales Teams is on too.
  { key: 'crmLeadReport', label: 'CRM: Lead Report & probables', desc: 'Leads by stage and sub-stage, follow-ups and overdue, probables per batch (needs Sales Teams)',
    paths: ['/lead-report'], gate: ['/sales-teams/report', '/sales-teams/probables'] },
  { key: 'crmAutomation', label: 'CRM: Automation & assignment', desc: 'Workflows, CRM automation, lead assignment, lead scoring, priority settings',
    paths: ['/workflows', '/lead-automation', '/lead-assignment-settings', '/lead-scoring-settings', '/lead-priority-settings'], gate: ['/workflows', '/lead-automation'] },
  { key: 'crmSources', label: 'CRM: Lead sources & integrations', desc: 'Lead sources, Meta sync, Google Sheets, event APIs for the website',
    paths: ['/lead-sources', '/meta-sync', '/google-sheet-integration', '/event-apis'], gate: ['/google-sheet-integrations', '/event-apis', '/lead-source-config', '/meta-crm'] },
  { key: 'crmCalling', label: 'CRM: Calling (AI calls & Callyzer)', desc: 'Outpero AI calls, AI call settings, Callyzer SIM calls and recordings',
    paths: ['/admin/outpero', '/ai-call-config', '/admin/callyzer'], gate: ['/outpero', '/callyzer'] },
  { key: 'crmSalesContent', label: 'CRM: Sales content', desc: 'Brochures, fee sheets and other content counsellors share',
    paths: ['/sales-content'], gate: [] },
  { key: 'crmArchive', label: 'CRM: Archive & audit logs', desc: 'Archive and restore leads, lead audit logs',
    paths: ['/leads/archive', '/lead-audit-logs'], gate: [] },
];

export const CRM_FEATURE_KEYS = CRM_FEATURES.map((f) => f.key);

/** API path prefix → feature module, for the module gate. */
export const CRM_API_PREFIXES: [string, string][] = CRM_FEATURES.flatMap((f) => f.gate.map((p): [string, string] => [p, f.key]));
