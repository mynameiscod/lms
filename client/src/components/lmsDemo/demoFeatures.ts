import { DemoFeature } from '../../api/lmsDemoApi';

/**
 * The platform features a demo can switch on, as the LMS Demo screen shows them and the demo
 * student's menu links them. `paths` are every page of the feature (the first is the menu link);
 * the demo shell lets a student onto them only while the feature is on. `list` is the content
 * picker the feature uses on the Content tab, if any.
 */
export interface DemoFeatureMeta {
  key: DemoFeature;
  label: string;
  short: string;
  icon: string;
  blurb: string;
  paths: RegExp[];
  href: string;
  list?: 'problems' | 'thinking' | 'books' | 'quizzes' | 'assignments' | 'speaking' | 'interviews';
  uses?: 'ai' | 'mock' | 'comm';
}

export const DEMO_FEATURE_META: DemoFeatureMeta[] = [
  { key: 'thinkingLab', label: 'Thinking Lab', short: 'Thinking Lab', icon: 'bi-lightbulb', blurb: 'Logic, maths and reasoning questions that build problem-solving.', href: '/thinking-lab', paths: [/^\/thinking-lab(\/|$)/], list: 'thinking' },
  { key: 'communicationLab', label: 'AI Communication Lab', short: 'Communication', icon: 'bi-mic', blurb: 'Speak, get AI feedback on clarity, fluency and confidence.', href: '/ai-communication-lab', paths: [/^\/ai-communication-lab(\/|$)/], list: 'speaking', uses: 'comm' },
  { key: 'codingPractice', label: 'Coding Practice', short: 'Practice', icon: 'bi-code-slash', blurb: 'Solve coding problems and run your code against real tests.', href: '/practice-library', paths: [/^\/practice-library(\/|$)/], list: 'problems' },
  { key: 'quizzes', label: 'Quizzes', short: 'Quizzes', icon: 'bi-patch-question', blurb: 'Timed quizzes with instant results.', href: '/quizzes', paths: [/^\/quizzes(\/|$)/], list: 'quizzes' },
  { key: 'assignments', label: 'Assignments', short: 'Assignments', icon: 'bi-clipboard-check', blurb: 'Hands-on assignments, auto-checked where possible.', href: '/assignments', paths: [/^\/assignments(\/|$)/], list: 'assignments' },
  { key: 'questionBooks', label: 'Interview Question Books', short: 'Question Books', icon: 'bi-book', blurb: 'Company and topic interview questions with answers.', href: '/question-books', paths: [/^\/question-books(\/|$)/], list: 'books' },
  { key: 'mockInterview', label: 'Mock Interview', short: 'Interview', icon: 'bi-person-video3', blurb: 'An AI interviewer asks, listens and scores your answers.', href: '/student/interviews', paths: [/^\/student\/interviews(\/|$)/, /^\/my-interviews(\/|$)/], list: 'interviews', uses: 'mock' },
  { key: 'playground', label: 'Code Playground', short: 'Playground', icon: 'bi-terminal', blurb: 'Write and run code in the browser.', href: '/playground', paths: [/^\/playground(\/|$)/] },
  { key: 'visualizer', label: 'Code Visualizer', short: 'Visualizer', icon: 'bi-diagram-3', blurb: 'Watch code run step by step.', href: '/visualizer', paths: [/^\/visualizer(\/|$)/] },
  { key: 'aiMentor', label: 'AI Mentor', short: 'AI Mentor', icon: 'bi-robot', blurb: 'Ask career and learning questions any time.', href: '/ai-mentor', paths: [/^\/ai-mentor(\/|$)/], uses: 'ai' },
  { key: 'resumeBuilder', label: 'Resume Builder', short: 'Resume', icon: 'bi-file-earmark-person', blurb: 'Build and score a resume with AI help.', href: '/resume-builder', paths: [/^\/resume-builder(\/|$)/], uses: 'ai' },
];

/** Pages a demo student may always open: the learning plan, and the quizzes/assignments its course days link to. */
export const DEMO_ALWAYS_PATHS = [/^\/my-learning(\/|$)/, /^\/quiz\//, /^\/assignments\/[^/]+\/(workspace|result)/];
