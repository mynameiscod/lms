/**
 * The part of a stage that must survive when a plan is trimmed to fit its days.
 *
 * ── WHY TRIMMING FROM THE END IS USUALLY RIGHT ────────────────────────────────────────────
 *
 * packComposedDays trims a composition that overflows its days, and it trims from the END: the
 * composer has already ordered the plan by what this learner needs most, so the last units are
 * the least urgent. For Years 1 to 3 that is exactly the right thing to drop. A learner who
 * covers four fifths of Year 2 has had four fifths of Year 2.
 *
 * ── AND WHY IT IS WRONG FOR A PLACEMENT YEAR ──────────────────────────────────────────────
 *
 * Year 4's value is concentrated at its end. The nine mocks, the full-day simulation, the gap
 * verification and the capstone are not the least urgent thing in the plan — they are what the
 * year is for, and what every other module is preparation for.
 *
 * Measured: a composition of 255 units for a fourth-year overflowed 150 days by six, and those
 * six came off the end. A continuing member composed five capstone units and was placed zero of
 * them. The trim was working precisely as designed and cutting the one thing the year is judged
 * by, and because it is a silent trim rather than a refusal, the journey looked complete.
 *
 * ── WHAT THIS CHANGES, AND WHAT IT DOES NOT ───────────────────────────────────────────────
 *
 * Only WHICH units are dropped. The day order is untouched — the protected units stay exactly
 * where the composer put them, at the end of the plan, because that is where they belong
 * pedagogically. What moves is that the trim now takes its units from the bulk in front of them:
 * advanced universal material and repeated practice, of which Year 4 holds a great deal and any
 * one of which is genuinely less important than sitting a mock interview.
 *
 * It is not a guarantee that a protected unit is COMPOSED. The composer decides that, on
 * suitability and shape. This only says that once composed, it is not the thing thrown away to
 * make the arithmetic work.
 */

/**
 * Topic codes whose units are never the ones trimmed, by stage.
 *
 * Matched by prefix so a topic added to one of these modules is covered without editing this
 * file — the modules are closed sets whose members all share a prefix, and a new mock or a
 * second simulation belongs to the protected tail by construction.
 */
export const PROTECTED_TAIL_TOPIC_PREFIXES: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    placement: Object.freeze([
      /* P22 — the nine mocks. */
      'T4_MOCK_',
      /* P23 — the full-day placement simulation and its debrief. */
      'T4_SIM_',
      /* P24 — what is still open, and the capstone the whole year is judged by. */
      'T4_VERIFY_',
      'T4_CAPSTONE',
    ]),
  });

/** Whether this unit belongs to the part of its stage that a trim must leave alone. */
export const isProtectedFromTrim = (
  stageKey: string | null | undefined,
  topicCode: string | null | undefined,
): boolean => {
  const prefixes = PROTECTED_TAIL_TOPIC_PREFIXES[String(stageKey || '').toLowerCase().trim()];
  if (!prefixes?.length) return false;
  const code = String(topicCode || '');
  return prefixes.some(p => code.startsWith(p));
};
