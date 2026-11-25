/**
 * Which tenant module each permission belongs to (2026-11-25).
 *
 * The Roles screen offered an institute admin every permission on the platform, even for modules the
 * platform administrator never gave the institute. Ticking one did nothing (the module gate still hides
 * the page and refuses its API), but it showed every institute the whole product. Now an institute admin
 * is offered only the permissions of the modules their institute has.
 *
 * A permission belongs to its group's module unless PERMISSION_MODULE names one for the key itself.
 * Groups not listed here belong to no module and are always offered: Users & Roles, Reports,
 * Administration, Operations' dashboard, Help & Support, and the super-admin-only shared group (which
 * institute admins never see anyway).
 */
import { CP_FEATURES } from './careerPilotFeatures';
import { ModuleKey } from './tenantModules';

export const GROUP_MODULE: Record<string, ModuleKey> = {
  courses: 'courses',
  batches: 'batchManagement',
  attendance: 'attendance',
  quizzes: 'quizzes',
  questions: 'quizzes',
  assignments: 'assignments',
  exams: 'assignments',
  interviews: 'mockInterviews',
  fees: 'feeManagement',
  leads: 'leads',
  marketing: 'marketing',
  codingSnippets: 'codeAssessments',
  practice: 'codeAssessments', // each key below has its own tool module; this is the fallback
  thinkingLab: 'thinkingLab',
  speakingPractice: 'speakingPractice',
  communicationLab: 'aiCommunicationLab',
  resourceLibrary: 'resourceLibrary',
  careerPilot: 'careerPilot',
  careerPassport: 'careerPilot',
  certificates: 'certificates',
  placement: 'placement',
  placementDesk: 'placement',
  talentPool: 'placement',
  placementProgram: 'placementProgram',
  interviewHub: 'interviewHub',
  aiSpend: 'aiSpend',
  techBattles: 'techBattles',
  hackathons: 'hackathons',
  whatsapp: 'whatsapp',
  learningPlans: 'learningPlans',
  liveClasses: 'liveClasses',
  skillAssessment: 'skillAssessment',
  employees: 'employees',
  employee_portal: 'employees',
  expenses: 'expenses',
};

/** Permissions that belong to a narrower module than their group's. */
export const PERMISSION_MODULE: Record<string, ModuleKey> = {
  // Leads / CRM features
  manage_sales_teams: 'crmSalesTeams' as ModuleKey,
  manage_lead_stages: 'crmPipeline' as ModuleKey,
  archive_leads: 'crmArchive' as ModuleKey,
  view_lead_analytics: 'crmReports' as ModuleKey,
  manage_event_apis: 'crmSources' as ModuleKey,
  manage_demo_slots: 'crmDemoBooking' as ModuleKey,
  // Practice & Coding: one tool each
  manage_practice_pass: 'practicePass',
  manage_problem_bank: 'problemBank',
  manage_visualizer: 'codeVisualizer',
  // Operations
  manage_leave_requests: 'attendance',
  manage_concerns: 'concerns',
  view_activity_logs: 'apiLogs',
  // CareerPilot features
  ...Object.fromEntries(CP_FEATURES.filter((f) => f.perm).map((f) => [f.perm as string, f.key as ModuleKey])),
};

/** The module a permission belongs to, or null when it belongs to none (always offered). */
export function moduleOfPermission(groupKey: string, permKey: string): ModuleKey | null {
  return PERMISSION_MODULE[permKey] || GROUP_MODULE[groupKey] || null;
}

/** The group each permission key sits in, for checking a saved list of keys. */
export function groupOfPermission(groups: Record<string, { permissions: { key: string }[] }>, permKey: string): string | null {
  for (const [g, def] of Object.entries(groups)) if (def.permissions.some((p) => p.key === permKey)) return g;
  return null;
}
