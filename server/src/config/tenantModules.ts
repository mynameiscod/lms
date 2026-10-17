/**
 * The modules a SaaS (super) admin switches on or off per institute.
 *
 * The first 16 are the original set, stored with `default: true`. The rest were added on
 * 2026-10-09 for features that had no switch at all (WhatsApp, Placement Program, Problem Bank…).
 * Until an institute's admin saves a value for one of them it INHERITS its parent module — so
 * CodeBegun (every original module on) keeps everything, and an institute created with every
 * module off gets none of the new ones. No data migration needed.
 */

export const ORIGINAL_MODULES = [
  'courses', 'attendance', 'quizzes', 'assignments', 'classRecordings', 'codeAssessments', 'mockInterviews',
  'placement', 'leads', 'marketing', 'feeManagement', 'thinkingLab', 'speakingPractice', 'resourceLibrary',
  'careerPilot', 'aiCommunicationLab',
] as const;

/** New module → the original module it follows until set explicitly. */
export const MODULE_PARENT = {
  skillAssessment: 'leads',
  whatsapp: 'leads',
  learningPlans: 'courses',
  certificates: 'courses',
  weeklyReports: 'courses',
  placementProgram: 'placement',
  interviewHub: 'placement',
  liveClasses: 'classRecordings',
  problemBank: 'codeAssessments',
  practicePass: 'codeAssessments',
  codeVisualizer: 'codeAssessments',
  techBattles: 'codeAssessments',
  hackathons: 'codeAssessments',
} as const;

/**
 * The institute-admin menu: people, roles, batches, notifications, and the admin tools. Until 2026-10-17 these
 * had no switch and every institute admin saw them. Now the platform administrator switches each one on. An
 * institute that already exists keeps them (a value never saved reads as ON); a NEW institute is created with
 * every module off (authService.registerOrganizationFull), so it starts with nothing.
 */
export const ADMIN_MODULES = [
  'userManagement', 'rolesManagement', 'batchManagement', 'notifications', 'concerns', 'employees', 'expenses',
  'aiSpend', 'apiLogs', 'integrations', 'branding', 'studentFeatures',
] as const;

export type ModuleKey = typeof ORIGINAL_MODULES[number] | keyof typeof MODULE_PARENT | typeof ADMIN_MODULES[number];
export const ALL_MODULES: ModuleKey[] = [...ORIGINAL_MODULES, ...(Object.keys(MODULE_PARENT) as (keyof typeof MODULE_PARENT)[]), ...ADMIN_MODULES];

/** The modules an institute really has: stored values, new ones falling back to their parent. */
export function effectiveModules(stored: Record<string, unknown> | null | undefined): Record<ModuleKey, boolean> {
  const raw = (stored || {}) as Record<string, unknown>;
  const out = {} as Record<ModuleKey, boolean>;
  for (const k of ORIGINAL_MODULES) out[k] = raw[k] !== false; // schema default is true
  for (const [k, parent] of Object.entries(MODULE_PARENT) as [keyof typeof MODULE_PARENT, ModuleKey][]) {
    out[k] = typeof raw[k] === 'boolean' ? (raw[k] as boolean) : out[parent];
  }
  for (const k of ADMIN_MODULES) out[k] = typeof raw[k] === 'boolean' ? (raw[k] as boolean) : true;
  return out;
}

/**
 * API path prefix → module. Anything not listed is core and always on: login, users, roles,
 * batches, dashboard, notifications, payments, settings, public pages and webhooks.
 * Longest prefix wins.
 */
export const API_MODULE_PREFIXES: [string, ModuleKey][] = [
  ['/courses', 'courses'], ['/subjects', 'courses'], ['/chapters', 'courses'], ['/enrollments', 'courses'],
  ['/content', 'courses'], ['/progress', 'courses'], ['/topics', 'courses'], ['/sub-topics', 'courses'],
  ['/attendance', 'attendance'], ['/leave-requests', 'attendance'],
  ['/quizzes', 'quizzes'], ['/questions', 'quizzes'], ['/public-quizzes', 'quizzes'],
  ['/assignments', 'assignments'],
  ['/code-snippets', 'codeAssessments'], ['/coding-practice', 'codeAssessments'], ['/playground', 'codeAssessments'],
  ['/interview-questions', 'mockInterviews'], ['/interview-module', 'mockInterviews'], ['/scheduled-interviews', 'mockInterviews'],
  ['/college/placement', 'placement'], ['/college/alumni', 'placement'], ['/college/crt', 'placement'], ['/placement-partners', 'placement'],
  ['/leads', 'leads'], ['/lead-stages', 'leads'], ['/lead-dispositions', 'leads'], ['/lead-form-config', 'leads'],
  ['/stage-history', 'leads'], ['/follow-ups', 'leads'], ['/lead-priority', 'leads'], ['/qualification', 'leads'],
  ['/sales-content', 'leads'], ['/lead-ai', 'leads'], ['/lost-reasons', 'leads'], ['/google-sheet-integrations', 'leads'],
  ['/lead-scoring', 'leads'], ['/lead-source-config', 'leads'], ['/lead-distribution-config', 'leads'],
  ['/whatsapp-drip-config', 'leads'], ['/meetings', 'leads'], ['/sales-call-recordings', 'leads'], ['/ai-calls', 'leads'],
  ['/outpero', 'leads'], ['/event-apis', 'leads'], ['/lead-archive', 'leads'],
  ['/seat-reservations', 'feeManagement'], ['/fees', 'feeManagement'],
  ['/thinking-lab', 'thinkingLab'], ['/drills', 'thinkingLab'],
  ['/speaking', 'speakingPractice'],
  ['/resources', 'resourceLibrary'],
  ['/communication', 'aiCommunicationLab'],
  ['/projects', 'careerPilot'], ['/job-applications', 'careerPilot'], ['/ai-mentor', 'careerPilot'],
  ['/resume', 'careerPilot'], ['/career-profile', 'careerPilot'],
  ['/assessment-items', 'skillAssessment'], ['/assessment-candidates', 'skillAssessment'],
  ['/whatsapp-chat', 'whatsapp'], ['/whatsapp-templates', 'whatsapp'],
  ['/learning-library', 'learningPlans'], ['/curricula', 'learningPlans'], ['/adaptive', 'learningPlans'],
  ['/enrollment-plans', 'learningPlans'], ['/batch-offerings', 'learningPlans'],
  ['/concept-lessons', 'learningPlans'], ['/interactive-lessons', 'learningPlans'],
  ['/certificates', 'certificates'],
  ['/weekly-reports', 'weeklyReports'],
  ['/placement-program', 'placementProgram'],
  ['/interview-hub', 'interviewHub'], ['/question-books', 'interviewHub'],
  ['/hms-classes', 'liveClasses'], ['/live-classes', 'liveClasses'], ['/recording-logs', 'liveClasses'],
  ['/problem-bank', 'problemBank'],
  ['/practice-pass', 'practicePass'],
  ['/visualizer', 'codeVisualizer'],
  ['/battles', 'techBattles'],
  ['/hackathons', 'hackathons'], ['/hackathon-exams', 'hackathons'],
  ['/employees', 'employees'], ['/employee-portal', 'employees'], ['/employee-activity', 'employees'],
  ['/employee-expenses', 'expenses'], ['/company-expenses', 'expenses'],
  ['/ai-usage', 'aiSpend'], ['/admin/logs', 'apiLogs'], ['/tenant-integrations', 'integrations'], ['/concerns', 'concerns'],
].sort((a, b) => b[0].length - a[0].length) as [string, ModuleKey][];

/** Which module an API path belongs to (path relative to /api/v1), or null for core. */
export function moduleForApiPath(path: string): ModuleKey | null {
  for (const [prefix, key] of API_MODULE_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)) return key;
  }
  return null;
}
