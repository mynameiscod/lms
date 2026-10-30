/**
 * The ledger event each addXp source is written as (PassportProgress post-save).
 *
 * Missions, practice, resume scoring and problem delivery award XP through passportXpService.addXp,
 * not the gamification engine. Their own keys keep them out of the engine's daily caps and badge
 * counts, which are per event. Pure: no database.
 */
export const LEGACY_XP_EVENT_KEYS: Readonly<Record<string, string>> = Object.freeze({
  mission: 'PASSPORT_MISSION_COMPLETED',
  practice: 'PRACTICE_PROBLEM_SOLVED',
  resume: 'RESUME_SCORED',
  other: 'OTHER_XP',
});
