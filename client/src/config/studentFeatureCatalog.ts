// Shared catalog of the student-facing features that can be toggled at the
// tenant level (Student Features page) and now also per-batch (Batches → Modules).
// Kept in one place so the tenant grid and the batch grid never drift apart.
// The key list here MUST stay in sync with the server's STUDENT_FEATURE_KEYS
// (server/src/controllers/batchController.ts).

export type StudentFeatureKey =
  | 'dashboard' | 'myCourse' | 'topicHub' | 'attendance' | 'quizzes' | 'assignments'
  | 'mockInterviews' | 'codingSnippets' | 'classHub' | 'feeDetails' | 'scheduledInterviews'
  | 'resumeBuilder' | 'learningPlan' | 'thinkingLab' | 'speakingPractice' | 'jobTracker'
  | 'aiMentor' | 'projectBuilder' | 'resourceLibrary' | 'codePlayground' | 'careerProfile'
  | 'aiCommunicationLab' | 'liveClasses' | 'collegePortal' | 'myApplications' | 'alumniDirectory';

export type FeatureGroup = 'Home' | 'Daily Practice' | 'My Learning' | 'Prep & Career' | 'College' | 'My Account';

export const GROUP_ORDER: FeatureGroup[] = ['Home', 'Daily Practice', 'My Learning', 'Prep & Career', 'College', 'My Account'];

// Each student feature → the tenant platform module that must be enabled for it.
// Used to LOCK a batch toggle when the tenant has already disabled the module.
export const FEATURE_MODULE_MAP: Record<StudentFeatureKey, string | null> = {
  dashboard:            null,
  myCourse:             'courses',
  topicHub:             'courses',
  classHub:             'classRecordings',
  attendance:           'attendance',
  quizzes:              'quizzes',
  assignments:          'assignments',
  mockInterviews:       'mockInterviews',
  codingSnippets:       'codeEditor',
  feeDetails:           null,
  scheduledInterviews:  null,
  resumeBuilder:        null,
  learningPlan:         'courses',
  thinkingLab:          'thinkingLab',
  speakingPractice:     'speakingPractice',
  jobTracker:           'careerPilot',
  aiMentor:             'careerPilot',
  projectBuilder:       'careerPilot',
  resourceLibrary:      'resourceLibrary',
  codePlayground:       'codeAssessments',
  careerProfile:        'careerPilot',
  aiCommunicationLab:   'aiCommunicationLab',
  liveClasses:          null,
  collegePortal:        'placement',
  myApplications:       'placement',
  alumniDirectory:      'placement',
};

export interface FeatureMeta {
  key: StudentFeatureKey;
  label: string;
  description: string;
  icon: string;
  group: FeatureGroup;
}

export const FEATURE_META: FeatureMeta[] = [
  // Home
  { key: 'dashboard',           label: 'Dashboard',                description: 'Student dashboard with stats, progress and deadlines', icon: '☑', group: 'Home' },
  // Daily Practice
  { key: 'aiCommunicationLab',  label: 'AI Communication Lab',     description: 'Daily self-introduction practice with AI feedback and streaks', icon: '🎙', group: 'Daily Practice' },
  { key: 'thinkingLab',         label: 'Thinking Lab',     description: 'AI-graded logic, aptitude and problem-solving drills', icon: '🧩', group: 'Daily Practice' },
  { key: 'speakingPractice',    label: 'Speaking Practice (retired)', description: 'Superseded by AI Communication Lab — usually leave off', icon: '🗣', group: 'Daily Practice' },
  // My Learning
  { key: 'myCourse',            label: 'My Course',                description: 'Course content, chapters and learning materials', icon: '📚', group: 'My Learning' },
  { key: 'learningPlan',        label: 'Learning Plan',            description: 'Personalised learning plan and curriculum schedule', icon: '📅', group: 'My Learning' },
  { key: 'topicHub',            label: 'Topic Hub',                description: 'Topic-wise practice, mastery and learning hub', icon: '🧠', group: 'My Learning' },
  { key: 'classHub',            label: 'My Classes (Class Hub)',   description: 'Recorded classes with AI summary, quiz, notes and practice', icon: '🎬', group: 'My Learning' },
  { key: 'quizzes',             label: 'Quizzes',                  description: 'Take quizzes and view quiz results', icon: '✍', group: 'My Learning' },
  { key: 'assignments',         label: 'Assignments',              description: 'Submit coding assignments and view results', icon: '📝', group: 'My Learning' },
  { key: 'codingSnippets',      label: 'Code Practice',            description: 'Code editor with snippet manager and practice problems', icon: '💻', group: 'My Learning' },
  { key: 'liveClasses',         label: 'Live Classes',             description: 'Join scheduled live/online classes with recording playback', icon: '🎥', group: 'My Learning' },
  { key: 'attendance',          label: 'Attendance',               description: 'View attendance records and attendance percentage', icon: '📊', group: 'My Learning' },
  // Prep & Career
  { key: 'codePlayground',      label: 'Code Playground',          description: 'Free-form multi-language playground with run & GitHub push', icon: '🎮', group: 'Prep & Career' },
  { key: 'mockInterviews',      label: 'Mock Interviews',          description: 'Practice AI mock interviews with feedback', icon: '🎙', group: 'Prep & Career' },
  { key: 'scheduledInterviews', label: 'My Interviews',            description: 'View scheduled mock interviews and released feedback', icon: '🗓', group: 'Prep & Career' },
  { key: 'resumeBuilder',       label: 'Resume Builder',           description: 'Build, score, download and share a resume', icon: '📄', group: 'Prep & Career' },
  { key: 'careerProfile',       label: 'Career Profile',           description: 'AI review of resume, GitHub and LinkedIn', icon: '🎯', group: 'Prep & Career' },
  { key: 'aiMentor',            label: 'AI Mentor',                description: 'Personal AI mentor for guidance and career questions', icon: '🤖', group: 'Prep & Career' },
  { key: 'jobTracker',          label: 'Job Tracker',              description: 'Track job applications, statuses and interview pipeline', icon: '📋', group: 'Prep & Career' },
  { key: 'projectBuilder',      label: 'Project Builder',          description: 'Guided builder for portfolio-ready projects', icon: '🛠', group: 'Prep & Career' },
  { key: 'resourceLibrary',     label: 'Resource Library',         description: 'Curated projects, references and downloadable resources', icon: '📁', group: 'Prep & Career' },
  // College
  { key: 'collegePortal',       label: 'My College Portal',        description: 'College dashboard: departments, curriculum, CRT & drives', icon: '🏛', group: 'College' },
  { key: 'myApplications',      label: 'My Applications',          description: 'Track placement-drive applications and their status', icon: '📄', group: 'College' },
  { key: 'alumniDirectory',     label: 'Alumni Directory',         description: 'Browse alumni and request mentoring', icon: '🎓', group: 'College' },
  // My Account
  { key: 'feeDetails',          label: 'Fee Details',              description: 'Student fee ledger, payments and receipts', icon: '💰', group: 'My Account' },
];

export const STUDENT_FEATURE_KEYS: StudentFeatureKey[] = FEATURE_META.map(f => f.key);
