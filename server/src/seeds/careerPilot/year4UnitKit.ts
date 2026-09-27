import { UnitSeed } from './year1MegaCurriculum';

/**
 * The constructors every Year-4 unit file shares.
 *
 * ── WHY YEAR 4 NEEDS ITS OWN KIT RATHER THAN YEAR 3'S ─────────────────────────────────────
 *
 * One new shape, and it is the shape the whole year turns on: the INTERVIEW unit.
 *
 * The spec's daily model (§15) has four slots, and in three of its four example days the last
 * slot is an interview question — "technical interview question", "specialization interview
 * question", "interview practice". That is not decoration. Year 4's promise is that the student
 * can be SEEN to know the thing, and a topic that ends at a mini project has taught the knowing
 * and never once asked them to say it out loud to somebody who will push back.
 *
 * So every teaching topic in Year 4 ends with somebody asking about it.
 *
 * ── AND WHY THE ENDINGS ARE APPLICATION-HEAVY ON PURPOSE ──────────────────────────────────
 *
 * The lesson Year 2 learned the hard way and paid for in three extra batches of content:
 * `unitSuitabilityPolicy` stops serving a CONCEPT unit to a learner at STANDARD, by design —
 * a strong learner gets application instead of re-instruction. So a strong learner's entire plan
 * is built from PRACTICE, DEBUG, PROJECT and CHECKPOINT units, and Year 2 shipped with 92 of
 * those against 204 lessons and could not fill a strong second-year's programme.
 *
 * Year 4's population is the strongest of the four years by definition. Authoring it
 * concept-first would reproduce that failure at its worst. Hence four closers below rather than
 * one, and hence the fact that every one of them is application.
 */

/** Compact constructor, so the datasets read as a syllabus. Mirrors year3UnitKit's. */
export const u = (
  slug: string, title: string, description: string,
  learningOutcomes: string[], estimatedMinutes: number,
  extra: Partial<UnitSeed> = {},
): UnitSeed => ({ slug, title, description, learningOutcomes, estimatedMinutes, ...extra });

/**
 * The interview question a topic ends with.
 *
 * PRACTICE rather than CHECKPOINT: a checkpoint measures and closes a topic, and this is
 * rehearsal — the student is meant to meet it more than once and be worse at it the first time.
 */
export const interviewUnit = (
  what: string, after: string, minutes = 45,
): UnitSeed => u('INTERVIEW_QUESTION', `${what} — The Interview Question`,
  `What an interviewer actually asks about ${what.toLowerCase()}, and what the follow-up is when you answer well.`,
  [`Answer a realistic interview question on ${what.toLowerCase()} aloud, including the follow-up`],
  minutes, { unitType: 'PRACTICE', after: [after] });

/**
 * The full ending for a teaching topic: find the fault, drill it, be asked about it, build with it.
 *
 * For P03's engineering build and the specialization tracks — the places where a student is meant
 * to come away with something they could show somebody.
 */
export const closeOut = (
  what: string, after: string, debugMin = 50, practiceMin = 60, projectMin = 130,
): UnitSeed[] => [
  u('DEBUGGING', `Debugging ${what}`,
    `Reading what goes wrong in ${what.toLowerCase()}, and finding the cause rather than guessing.`,
    [`Diagnose a broken ${what.toLowerCase()} example without rewriting it at random`],
    debugMin, { unitType: 'DEBUG', after: [after] }),
  u('PRACTICE', `${what} Practice`,
    `Enough repetition that ${what.toLowerCase()} stops needing thought under time.`,
    [`Work ${what.toLowerCase()} problems without looking things up`],
    practiceMin, { unitType: 'PRACTICE', after: ['DEBUGGING'] }),
  interviewUnit(what, 'PRACTICE'),
  u('MINI_PROJECT', `Mini Project — ${what}`,
    'One thing built end to end with it, and explained afterwards to somebody who will ask why.',
    [`Build and defend something that uses ${what.toLowerCase()}`],
    projectMin, { unitType: 'PROJECT', after: ['INTERVIEW_QUESTION'] }),
];

/**
 * The ending for a topic that repairs rather than builds: find the fault, drill it.
 *
 * The bridge uses this. A student in the ten-day bridge is behind and the bridge is a ceiling —
 * giving each of its ten topics a mini project would spend the whole bridge on four of them.
 */
export const closeOutLight = (
  what: string, after: string, debugMin = 40, practiceMin = 50,
): UnitSeed[] => [
  u('DEBUGGING', `Debugging ${what}`,
    `Reading the errors ${what.toLowerCase()} produces, and finding the cause rather than guessing.`,
    [`Diagnose a broken ${what.toLowerCase()} example without changing it at random`],
    debugMin, { unitType: 'DEBUG', after: [after] }),
  u('PRACTICE', `${what} Practice`,
    `Enough repetition that ${what.toLowerCase()} stops needing thought.`,
    [`Work ${what.toLowerCase()} problems without looking things up`],
    practiceMin, { unitType: 'PRACTICE', after: ['DEBUGGING'] }),
];

/**
 * The ending for a placement-practice topic: drill it, be asked it, prove it.
 *
 * No project and no debugging exercise, because these topics ARE the drill — a coding set or an
 * aptitude paper is already practice, and a mini project on "quantitative aptitude" would be an
 * invention. The checkpoint is what makes the drill answerable: it is the only thing here that
 * measures, and the topics it closes are the ones a student must not be allowed to feel ready on
 * without evidence.
 */
export const drill = (
  what: string, after: string, practiceMin = 55, checkpointMin = 45,
): UnitSeed[] => [
  u('TIMED_SET', `${what} — A Timed Set`,
    `A full set at the pace a real round runs, so the clock is part of the practice rather than a surprise.`,
    [`Complete a timed ${what.toLowerCase()} set and see where the time actually went`],
    practiceMin, { unitType: 'PRACTICE', after: [after] }),
  interviewUnit(what, 'TIMED_SET'),
  u('CHECKPOINT', `${what} — Checkpoint`,
    'Where you actually are on this, measured rather than felt.',
    [`Show ${what.toLowerCase()} at the standard a drive expects`],
    checkpointMin, { unitType: 'CHECKPOINT', after: ['INTERVIEW_QUESTION'] }),
];

/**
 * A checkpoint on its own, for a topic whose other units already are the practice.
 *
 * A checkpoint must ask SCENARIOS, not the lesson's own questions. Year 2's first checkpoint
 * draft reused them and the duplicate gate caught thirty-nine — which was the right catch for the
 * wrong reason, because the real fault was pedagogical: a checkpoint that asks the notes back
 * measures recall, and recall is not what any of this is for.
 */
export const checkpoint = (
  what: string, after: string, minutes = 45,
): UnitSeed => u('CHECKPOINT', `${what} — Checkpoint`,
  'Where you actually are on this, measured rather than felt.',
  [`Show ${what.toLowerCase()} at the standard a drive expects`],
  minutes, { unitType: 'CHECKPOINT', after: [after] });
