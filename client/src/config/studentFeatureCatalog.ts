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
  | 'aiCommunicationLab' | 'liveClasses' | 'collegePortal' | 'myApplications' | 'alumniDirectory'
  // Menu items that used to have no switch
  | 'myTasks' | 'applyLeave' | 'interviewExperiences' | 'questionBooks' | 'drives' | 'myPractice' | 'codingPractice' | 'codeVisualizer';

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
  myTasks:              null,
  applyLeave:           'attendance',
  interviewExperiences: 'interviewHub',
  questionBooks:        'interviewHub',
  drives:               'placement',
  myPractice:           'practicePass',
  codingPractice:       null,
  codeVisualizer:       'codeVisualizer',
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
  { key: 'myPractice',          label: 'Daily Practice Pass',      description: 'Daily practice tasks that count towards practice attendance', icon: '🔥', group: 'Daily Practice' },
  { key: 'codingPractice',      label: 'Coding Practice',          description: 'Problem sets assigned by mentors, run against hidden tests', icon: '⌨', group: 'Daily Practice' },
  { key: 'aiCommunicationLab',  label: 'AI Communication Lab',     description: 'Daily self-introduction practice with AI feedback and streaks', icon: '🎙', group: 'Daily Practice' },
  { key: 'thinkingLab',         label: 'Thinking Lab',     description: 'AI-graded logic, aptitude and problem-solving drills', icon: '🧩', group: 'Daily Practice' },
  { key: 'speakingPractice',    label: 'Speaking Practice (retired)', description: 'Superseded by AI Communication Lab — usually leave off', icon: '🗣', group: 'Daily Practice' },
  // My Learning
  { key: 'myCourse',            label: 'My Course',                description: 'Course content, chapters and learning materials', icon: '📚', group: 'My Learning' },
  { key: 'learningPlan',        label: 'Learning Plan',            description: 'Personalised learning plan and curriculum schedule', icon: '📅', group: 'My Learning' },
  { key: 'topicHub',            label: 'Topic Hub',                description: 'Topic-wise practice, mastery and learning hub', icon: '🧠', group: 'My Learning' },
  { key: 'classHub',            label: 'My Classes (Class Hub)',   description: 'Recorded classes with AI summary, quiz, notes and practice', icon: '🎬', group: 'My Learning' },
  { key: 'myTasks',             label: 'My Tasks',                 description: 'The tasks from the learning plan that are due', icon: '✅', group: 'My Learning' },
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
  { key: 'codeVisualizer',      label: 'Code Visualizer',          description: 'Step-by-step view of how code runs (only for students it is assigned to)', icon: '🔬', group: 'Prep & Career' },
  { key: 'interviewExperiences',label: 'Interview Experiences',    description: 'Real interviews shared by candidates, round by round', icon: '💬', group: 'Prep & Career' },
  { key: 'questionBooks',       label: 'Interview Question Books', description: 'Interview questions grouped into readable books', icon: '📘', group: 'Prep & Career' },
  { key: 'resourceLibrary',     label: 'Resource Library',         description: 'Curated projects, references and downloadable resources', icon: '📁', group: 'Prep & Career' },
  // College
  { key: 'drives',              label: 'Placement Drives',         description: 'Open placement drives and applying to them', icon: '💼', group: 'College' },
  { key: 'collegePortal',       label: 'My College Portal',        description: 'College dashboard: departments, curriculum, CRT & drives', icon: '🏛', group: 'College' },
  { key: 'myApplications',      label: 'My Applications',          description: 'Track placement-drive applications and their status', icon: '📄', group: 'College' },
  { key: 'alumniDirectory',     label: 'Alumni Directory',         description: 'Browse alumni and request mentoring', icon: '🎓', group: 'College' },
  // My Account
  { key: 'feeDetails',          label: 'Fee Details',              description: 'Student fee ledger, payments and receipts', icon: '💰', group: 'My Account' },
  { key: 'applyLeave',          label: 'Apply Leave',              description: 'Ask for leave and see how it was decided', icon: '🏖', group: 'My Account' },
];

export const STUDENT_FEATURE_KEYS: StudentFeatureKey[] = FEATURE_META.map(f => f.key);

// ── CareerPilot students ─────────────────────────────────────────────────────
// The menu of a CareerPilot member (the consumer product). Home, profile, result and the account
// block are always there. These keys MUST match server/src/data/studentFeatureKeys.ts.

export type CareerPilotFeatureKey =
  | 'plan' | 'roadmap' | 'practice' | 'coding' | 'playground' | 'visualizer' | 'thinkingLab' | 'communication'
  | 'interview' | 'experiences' | 'questionBooks' | 'mentor' | 'companies' | 'news' | 'resume' | 'progress' | 'industryConnect';

export type CareerPilotGroup = 'Plan' | 'Practice' | 'Interview prep' | 'Career';
export const CAREERPILOT_GROUP_ORDER: CareerPilotGroup[] = ['Plan', 'Practice', 'Interview prep', 'Career'];

export interface CareerPilotFeatureMeta {
  key: CareerPilotFeatureKey;
  label: string;
  description: string;
  icon: string;
  group: CareerPilotGroup;
}

export const CAREERPILOT_FEATURE_META: CareerPilotFeatureMeta[] = [
  { key: 'plan',          label: 'My Plan (My 90 Days)',  description: 'The day-by-day plan for the programme', icon: '📅', group: 'Plan' },
  { key: 'roadmap',       label: 'My Roadmap',            description: 'The whole journey on one page: what is done and what comes next', icon: '🗺', group: 'Plan' },
  { key: 'practice',      label: 'Practice',              description: 'Daily missions that earn XP and coins and build the streak', icon: '🎯', group: 'Practice' },
  { key: 'coding',        label: 'Coding Sets',           description: 'Coding problem sets assigned by mentors, run against hidden tests', icon: '⌨', group: 'Practice' },
  { key: 'playground',    label: 'Playground',            description: 'Free code editor to run code without an assignment', icon: '🎮', group: 'Practice' },
  { key: 'visualizer',    label: 'Code Visualizer',       description: 'Step-by-step view of how code runs (only for members it is assigned to)', icon: '🔬', group: 'Practice' },
  { key: 'thinkingLab',   label: 'Thinking Lab',          description: 'Logic and aptitude problems', icon: '🧩', group: 'Practice' },
  { key: 'communication', label: 'Communication Lab',     description: 'Daily spoken practice with feedback', icon: '🎙', group: 'Practice' },
  { key: 'interview',     label: 'Mock Interview',        description: 'AI interview practice, by voice or text', icon: '🎤', group: 'Interview prep' },
  { key: 'experiences',   label: 'Interview Experiences', description: 'Real interviews shared by candidates, round by round', icon: '💬', group: 'Interview prep' },
  { key: 'questionBooks', label: 'Question Books',        description: 'Interview questions grouped into readable books', icon: '📘', group: 'Interview prep' },
  { key: 'mentor',        label: 'AI Mentor',             description: 'Ask an AI mentor what to study or fix next', icon: '🤖', group: 'Interview prep' },
  { key: 'companies',     label: 'Opportunities',         description: 'Companies hiring and what they ask', icon: '🏢', group: 'Career' },
  { key: 'news',          label: 'Tech News',             description: 'Daily industry reading', icon: '📰', group: 'Career' },
  { key: 'resume',        label: 'Resume',                description: 'Build and share a resume', icon: '📄', group: 'Career' },
  { key: 'progress',      label: 'My Progress',           description: 'Streaks, XP, badges and standings', icon: '🏆', group: 'Career' },
  { key: 'industryConnect', label: 'Industry Connect',    description: 'Meet people working in industry (coming soon)', icon: '🤝', group: 'Career' },
];

export const CAREERPILOT_FEATURE_KEYS: CareerPilotFeatureKey[] = CAREERPILOT_FEATURE_META.map(f => f.key);
