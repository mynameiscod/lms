/**
 * Skill Assessment — shared constants & enums.
 *
 * Single source of truth for the dimensions, item types, and candidate segments
 * used across the assessment engine (item bank, blueprints, scoring, roadmap).
 */

// ─── Skill dimensions (the sub-score axes) ───────────────────────────────────
export const ASSESSMENT_DIMENSIONS = [
  'aptitude',
  'fundamentals',
  'dsa',
  'core_stack',
  'problem_solving',
] as const;
export type AssessmentDimension = (typeof ASSESSMENT_DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<AssessmentDimension, string> = {
  aptitude: 'Aptitude',
  fundamentals: 'Programming Fundamentals',
  dsa: 'Data Structures & Algorithms',
  core_stack: 'Core Stack',
  problem_solving: 'Problem Solving',
};

// ─── Item (question/task) types ──────────────────────────────────────────────
// Wave A = gradable without code execution (tap-friendly on mobile).
// Wave B = graded by running code against hidden test cases (needs Piston).
export const ASSESSMENT_ITEM_TYPES = [
  'mcq',
  'predict_output',
  'debug',
  'complete_code',
  'live_code',
  'sql',
] as const;
export type AssessmentItemType = (typeof ASSESSMENT_ITEM_TYPES)[number];

export const WAVE_A_TYPES: AssessmentItemType[] = ['mcq', 'predict_output', 'debug', 'complete_code'];
export const WAVE_B_TYPES: AssessmentItemType[] = ['live_code', 'sql'];

/** Types that need a real keyboard — demoted/optional on phones (zero-drop-off rule). */
export const KEYBOARD_TYPES: AssessmentItemType[] = ['live_code', 'sql'];

export const isKeyboardType = (t: AssessmentItemType) => KEYBOARD_TYPES.includes(t);

// ─── Candidate segments (drive blueprint auto-composition) ───────────────────
export const CANDIDATE_SEGMENTS = [
  'first_year',
  'second_third_year',
  'final_year',
  'graduate',
  'job_switcher',
] as const;
export type CandidateSegment = (typeof CANDIDATE_SEGMENTS)[number];

export const SEGMENT_LABELS: Record<CandidateSegment, string> = {
  first_year: '1st Year',
  second_third_year: '2nd–3rd Year',
  final_year: 'Final Year',
  graduate: 'Graduate (Job-seeking)',
  job_switcher: 'Working Professional (Switching)',
};

// ─── Difficulty ──────────────────────────────────────────────────────────────
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;
