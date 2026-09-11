/**
 * What a member can see, section by section, and what membership pays for.
 *
 * WHY THIS EXISTS. The entitlement system was real — eleven feature keys on PassportConfig, an
 * admin screen to switch each between free and paid, and `isEntitled` enforcing them across the
 * API — but nothing joined those keys to the SECTIONS a student actually looks at. So the
 * product had one coarse answer instead: a member without an active membership was handed a
 * six-field dashboard and the entire navigation rail was withheld. They saw a wall where the
 * product should have been, which is the weakest possible moment to ask somebody to pay.
 *
 * The fix is not to give the paid product away. It is to show the shape of it, with each part
 * locked for a stated reason, and to keep serving the parts the student has already earned.
 *
 * EARNED VERSUS PROMISED — the line that decides the default split.
 *
 *   Earned: they sat the assessment, so the score and the skill profile are the result of
 *   their own work. Locking those reads as a bait-and-switch and throws away the one honest
 *   argument for buying: here is exactly where you are, and here is what the plan would fix.
 *
 *   Promised: the roadmap, the daily missions, the practice, the interviews, the resume work.
 *   These are the product's forward-looking half and are what membership actually buys.
 *
 * THE SPLIT IS THE TENANT'S, NOT THIS FILE'S. Everything below maps a section to a feature key;
 * whether that key is free or paid is `PassportConfig.entitlements`, edited by an admin. A
 * college that wants to open the roadmap to everybody flips one switch and this follows.
 */

/** A section of the member experience that can be locked on its own. */
export type MemberSection =
  | 'score'       // career score, skill profile, pathway — what the assessment measured
  | 'roadmap'     // the 90-day plan
  | 'missions'    // today's work
  | 'progress'    // XP, streak, badges, leaderboard, coder score
  | 'practice'
  | 'interview'
  | 'resume'
  | 'companies'
  | 'news';

/**
 * Section to the entitlement key that pays for it.
 *
 * `progress` maps to daily_missions on purpose. XP, streaks and badges are EARNED BY DOING
 * MISSIONS, so a student who cannot open a mission cannot move any of those numbers. Showing
 * them unlocked would mean four panels reading zero — which looks broken rather than locked,
 * and tells the student the product is empty rather than that it is waiting for them.
 */
export const SECTION_FEATURE: Record<MemberSection, string> = {
  score:     'career_score',
  roadmap:   'roadmap_full',
  missions:  'daily_missions',
  progress:  'daily_missions',
  practice:  'practice',
  interview: 'mock_interview',
  resume:    'resume',
  companies: 'company_questions',
  news:      'tech_news',
};

export const MEMBER_SECTIONS = Object.keys(SECTION_FEATURE) as MemberSection[];

/**
 * Why a section is worth having, in the student's terms.
 *
 * Held here rather than in the client so that the lock and the thing behind it cannot drift
 * apart, and so a locked section says something specific instead of "members only" — which is
 * a wall with different wording.
 */
export const SECTION_COPY: Record<MemberSection, { title: string; blurb: string }> = {
  score:     { title: 'Your skill profile', blurb: 'What your assessment measured, skill by skill.' },
  roadmap:   { title: 'Your 90-day plan',   blurb: 'Your gaps, in the order they are worth closing, sized to the time you have.' },
  missions:  { title: 'Today’s work',       blurb: 'A short, finishable list every day, drawn from your plan.' },
  progress:  { title: 'Your progress',      blurb: 'XP, streaks and badges — earned by finishing the work in your plan.' },
  practice:  { title: 'Practice Lab',       blurb: 'Problems that run and test your code, mapped to the skills you are weakest in.' },
  interview: { title: 'Mock interviews',    blurb: 'Practise out loud, and get told what to fix.' },
  resume:    { title: 'Resume Center',      blurb: 'Build it, score it, and see what a recruiter would.' },
  companies: { title: 'Company prep',       blurb: 'What each company actually asks, and how ready you are for it.' },
  news:      { title: 'Tech news',          blurb: 'What is moving in the industry you are heading into.' },
};

/**
 * Which sections this member cannot open.
 *
 * Takes the resolved entitlement map — the same one the dashboard already computes and ships —
 * so there is exactly one place that decides free versus paid, and it is not this file.
 */
export const lockedSections = (entitled: Record<string, boolean> | undefined): MemberSection[] =>
  MEMBER_SECTIONS.filter(s => !(entitled || {})[SECTION_FEATURE[s]]);

export interface LockedSectionView {
  section: MemberSection;
  featureKey: string;
  title: string;
  blurb: string;
}

/**
 * The locks, with the words that go on them.
 *
 * Sent rather than duplicated in the client so a section and the reason it is locked cannot
 * drift apart — and so a tenant renaming a feature key has one place to change. At most nine
 * short entries, and none at all for a paying member.
 */
export const lockedSectionViews = (entitled: Record<string, boolean> | undefined): LockedSectionView[] =>
  lockedSections(entitled).map(section => ({
    section,
    featureKey: SECTION_FEATURE[section],
    ...SECTION_COPY[section],
  }));
