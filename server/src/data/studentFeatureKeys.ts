/**
 * Every menu item an admin can switch on or off for students, in one place.
 *
 * Two audiences, two lists:
 *   - LMS students (batch students): the Student Features page, and per batch under Batches.
 *   - CareerPilot students (members of the consumer product): the same page, second tab.
 *
 * The client keeps a matching catalogue with labels and descriptions
 * (client/src/config/studentFeatureCatalog.ts). The KEYS must match.
 */

export const STUDENT_FEATURE_KEYS = [
  'dashboard', 'myCourse', 'topicHub', 'attendance', 'quizzes', 'assignments',
  'mockInterviews', 'codingSnippets', 'classHub', 'feeDetails', 'scheduledInterviews',
  'resumeBuilder', 'learningPlan', 'thinkingLab', 'speakingPractice', 'jobTracker',
  'aiMentor', 'projectBuilder', 'resourceLibrary', 'codePlayground', 'careerProfile',
  'aiCommunicationLab', 'liveClasses', 'collegePortal', 'myApplications', 'alumniDirectory',
  // Menu items that had no switch of their own
  'myTasks', 'applyLeave', 'interviewExperiences', 'questionBooks', 'drives', 'myPractice', 'codingPractice', 'codeVisualizer',
] as const;

export type StudentFeatureKey = typeof STUDENT_FEATURE_KEYS[number];

/** The CareerPilot student's menu. Home, profile, result and the account block are always there. */
export const CAREERPILOT_FEATURE_KEYS = [
  'plan', 'roadmap', 'practice', 'coding', 'playground', 'visualizer', 'thinkingLab', 'aptitude', 'reasoning', 'communication', 'interview',
  'experiences', 'questionBooks', 'mentor', 'companies', 'news', 'resume', 'progress',
  'industryConnect', 'support',
] as const;

export type CareerPilotFeatureKey = typeof CAREERPILOT_FEATURE_KEYS[number];

export const allOn = <K extends string>(keys: readonly K[]): Record<K, boolean> =>
  Object.fromEntries(keys.map((k) => [k, true])) as Record<K, boolean>;
