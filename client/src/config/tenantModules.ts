/**
 * Modules the SaaS (super) admin switches per institute — the one list the menu, the Tenant
 * Management screen and the "not enabled" page all use. Mirrors server/src/config/tenantModules.ts.
 *
 * The 13 modules added on 2026-10-09 follow their PARENT until the admin saves them, so an
 * institute with every original module on keeps everything and one with none gets none.
 */

export const ORIGINAL_MODULE_KEYS = [
  'courses', 'attendance', 'quizzes', 'assignments', 'classRecordings', 'codeAssessments', 'mockInterviews',
  'placement', 'leads', 'marketing', 'feeManagement', 'thinkingLab', 'speakingPractice', 'resourceLibrary',
  'careerPilot', 'aiCommunicationLab',
] as const;

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

export type ModuleKey = typeof ORIGINAL_MODULE_KEYS[number] | keyof typeof MODULE_PARENT;
export type TenantModules = Record<ModuleKey, boolean>;
export const ALL_MODULE_KEYS = [...ORIGINAL_MODULE_KEYS, ...Object.keys(MODULE_PARENT)] as ModuleKey[];

export function effectiveModules(stored?: Partial<Record<string, unknown>> | null): TenantModules {
  const raw = (stored || {}) as Record<string, unknown>;
  const out = {} as TenantModules;
  for (const k of ORIGINAL_MODULE_KEYS) out[k] = raw[k] !== false;
  for (const [k, parent] of Object.entries(MODULE_PARENT) as [keyof typeof MODULE_PARENT, ModuleKey][]) {
    out[k] = typeof raw[k] === 'boolean' ? (raw[k] as boolean) : out[parent];
  }
  return out;
}

export const allModules = (on: boolean): TenantModules =>
  Object.fromEntries(ALL_MODULE_KEYS.map((k) => [k, on])) as TenantModules;

export interface ModuleDef { key: ModuleKey; label: string; icon: string; desc: string; group: string }

/** Grouped for the Tenant Management screen. */
export const MODULE_DEFS: ModuleDef[] = [
  { group: 'Learning', key: 'courses', label: 'Courses & Learning', icon: 'fa-solid fa-book-open', desc: 'Course mgmt, My Course, Topic Hub' },
  { group: 'Learning', key: 'learningPlans', label: 'Learning Plans', icon: 'fa-solid fa-sitemap', desc: 'Content library, curriculum builder, enrollments, batch offerings' },
  { group: 'Learning', key: 'attendance', label: 'Attendance', icon: 'fa-solid fa-calendar-check', desc: 'Mark, view & report attendance, leave requests' },
  { group: 'Learning', key: 'quizzes', label: 'Quizzes', icon: 'fa-solid fa-circle-question', desc: 'Quiz management & taking' },
  { group: 'Learning', key: 'assignments', label: 'Assignments', icon: 'fa-solid fa-file-pen', desc: 'Assignments & grading' },
  { group: 'Learning', key: 'classRecordings', label: 'Class Recordings', icon: 'fa-solid fa-video', desc: 'Recordings & Class Hub' },
  { group: 'Learning', key: 'liveClasses', label: 'Live Classes', icon: 'fa-solid fa-tower-broadcast', desc: '100ms live classes & recording diagnostics' },
  { group: 'Learning', key: 'certificates', label: 'Certificates', icon: 'fa-solid fa-award', desc: 'Issue & verify certificates' },
  { group: 'Learning', key: 'weeklyReports', label: 'Weekly Reports', icon: 'fa-solid fa-chart-line', desc: 'Weekly progress reports to students' },

  { group: 'Coding & practice', key: 'codeAssessments', label: 'Code Assessments', icon: 'fa-solid fa-code', desc: 'Coding snippets, submissions, playground' },
  { group: 'Coding & practice', key: 'problemBank', label: 'Problem Bank', icon: 'fa-solid fa-laptop-code', desc: 'Runnable coding problems & problem sets' },
  { group: 'Coding & practice', key: 'practicePass', label: 'Practice Pass', icon: 'fa-solid fa-fire', desc: 'Daily tasks & practice attendance' },
  { group: 'Coding & practice', key: 'codeVisualizer', label: 'Code Visualizer', icon: 'fa-solid fa-microscope', desc: 'Line-by-line code tracing' },
  { group: 'Coding & practice', key: 'thinkingLab', label: 'Thinking Lab', icon: 'fa-solid fa-brain', desc: 'AI-graded logic & aptitude drills' },
  { group: 'Coding & practice', key: 'speakingPractice', label: 'Speaking Practice', icon: 'fa-solid fa-microphone', desc: 'AI speaking practice & feedback' },
  { group: 'Coding & practice', key: 'aiCommunicationLab', label: 'AI Communication Lab', icon: 'fa-solid fa-comment-dots', desc: 'Daily self-introduction practice with AI feedback' },
  { group: 'Coding & practice', key: 'resourceLibrary', label: 'Resource Library', icon: 'fa-solid fa-box-archive', desc: 'Projects, references & downloads' },

  { group: 'Careers & placement', key: 'placement', label: 'CRT / Placement Drives', icon: 'fa-solid fa-briefcase', desc: 'Placement drives, alumni, applications, partners' },
  { group: 'Careers & placement', key: 'placementProgram', label: 'Placement Program', icon: 'fa-solid fa-user-check', desc: 'Paid placement pipeline: interviews, agreements, cheques' },
  { group: 'Careers & placement', key: 'interviewHub', label: 'Interview Hub', icon: 'fa-solid fa-comments', desc: 'Interview experiences & question books' },
  { group: 'Careers & placement', key: 'mockInterviews', label: 'Mock Interviews', icon: 'fa-solid fa-user-tie', desc: 'AI & scheduled mock interviews' },
  { group: 'Careers & placement', key: 'careerPilot', label: 'CareerPilot', icon: 'fa-solid fa-compass', desc: 'AI Mentor, Job Tracker, Project Builder, Career Profile' },

  { group: 'Events', key: 'techBattles', label: 'Tech Battles', icon: 'fa-solid fa-trophy', desc: 'Public coding competitions' },
  { group: 'Events', key: 'hackathons', label: 'Hackathons', icon: 'fa-solid fa-laptop-code', desc: 'Paid team hackathons & exams' },

  { group: 'Admissions & money', key: 'leads', label: 'Leads / CRM', icon: 'fa-solid fa-user-tag', desc: 'Lead management, telecallers, AI calls' },
  { group: 'Admissions & money', key: 'whatsapp', label: 'WhatsApp', icon: 'fa-brands fa-whatsapp', desc: 'Templates, broadcasts, inbox & chat' },
  { group: 'Admissions & money', key: 'skillAssessment', label: 'Skill Assessment', icon: 'fa-solid fa-clipboard-question', desc: 'Public skill assessment funnel & candidates' },
  { group: 'Admissions & money', key: 'marketing', label: 'Marketing', icon: 'fa-solid fa-bullhorn', desc: 'Campaigns, analytics, insights' },
  { group: 'Admissions & money', key: 'feeManagement', label: 'Fee Management', icon: 'fa-solid fa-wallet', desc: 'Seat reservations, payments, receipts, installments' },
];

/**
 * App page path → module. Longest prefix wins; anything unlisted is core (dashboard, users,
 * roles, batches, notifications, profile, settings, platform admin).
 */
const PATH_MODULE: [string, ModuleKey][] = ([
  ['/student/fee-details', 'feeManagement'], ['/fees', 'feeManagement'], ['/seat-reservations', 'feeManagement'],
  ['/assessment-admin', 'skillAssessment'], ['/assessment-candidates', 'skillAssessment'],
  ['/attendance', 'attendance'], ['/my-attendance', 'attendance'], ['/attendance-reports', 'attendance'],
  ['/my-leave', 'attendance'], ['/admin/leave-requests', 'attendance'],
  ['/quizzes', 'quizzes'], ['/quiz-management', 'quizzes'], ['/registrations', 'quizzes'], ['/question-bank', 'quizzes'], ['/quiz-reports', 'quizzes'],
  ['/assignments', 'assignments'], ['/admin/assignments', 'assignments'],
  ['/coding-snippets', 'codeAssessments'], ['/admin/coding-snippets', 'codeAssessments'], ['/playground', 'codeAssessments'], ['/coding-practice', 'codeAssessments'],
  ['/my-learning', 'learningPlans'], ['/my-tasks', 'learningPlans'], ['/learning-library', 'learningPlans'],
  ['/curriculum-builder', 'learningPlans'], ['/enrollment-plans', 'learningPlans'], ['/batch-offerings', 'learningPlans'],
  ['/drives', 'placement'], ['/admin/placement-partnership', 'placement'],
  ['/admin/placement-program', 'placementProgram'], ['/placement-program/my-interviews', 'placementProgram'],
  ['/admin/interview-experiences', 'interviewHub'], ['/interview-experiences', 'interviewHub'],
  ['/question-books', 'interviewHub'], ['/admin/question-books', 'interviewHub'],
  ['/admin/certificates', 'certificates'],
  ['/weekly-reports', 'weeklyReports'],
  ['/whatsapp-inbox', 'whatsapp'], ['/admin/whatsapp-templates', 'whatsapp'],
  ['/admin/battles', 'techBattles'],
  ['/admin/hackathons', 'hackathons'],
  ['/admin/passport', 'careerPilot'], ['/admin/careerpilot', 'careerPilot'],
  ['/project-builder', 'careerPilot'], ['/job-tracker', 'careerPilot'], ['/ai-mentor', 'careerPilot'],
  ['/resume-builder', 'careerPilot'], ['/career-profile', 'careerPilot'], ['/admin/career-profiles', 'careerPilot'],
  ['/interview-question-bank', 'mockInterviews'], ['/scheduled-interviews', 'mockInterviews'], ['/my-interviews', 'mockInterviews'], ['/admin/interviews', 'mockInterviews'],
  ['/resource-library', 'resourceLibrary'], ['/admin/resources', 'resourceLibrary'],
  ['/speaking-practice', 'speakingPractice'], ['/admin/speaking-tasks', 'speakingPractice'],
  ['/hms-classes', 'liveClasses'], ['/admin/recording-diagnostics', 'liveClasses'],
  ['/ai-communication-lab', 'aiCommunicationLab'], ['/admin/communication-lab', 'aiCommunicationLab'],
  ['/visualizer', 'codeVisualizer'], ['/admin/visualizer', 'codeVisualizer'],
  ['/my-practice', 'practicePass'], ['/practice-pass', 'practicePass'],
  ['/problem-bank', 'problemBank'],
  ['/thinking-lab', 'thinkingLab'], ['/admin/thinking-lab', 'thinkingLab'], ['/lab-tracks', 'thinkingLab'],
  ['/leads', 'leads'], ['/follow-ups', 'leads'], ['/lead-', 'leads'], ['/team-activity', 'leads'], ['/sales-content', 'leads'],
  ['/qualification-settings', 'leads'], ['/google-sheet-integration', 'leads'], ['/admin/outpero', 'leads'], ['/ai-call-config', 'leads'],
] as [string, ModuleKey][]).sort((a, b) => b[0].length - a[0].length);

export function moduleForPath(path?: string): ModuleKey | null {
  if (!path) return null;
  for (const [prefix, key] of PATH_MODULE) {
    if (prefix.endsWith('-') ? path.startsWith(prefix) : (path === prefix || path.startsWith(`${prefix}/`))) return key;
  }
  return null;
}
