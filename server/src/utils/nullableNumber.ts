/**
 * Read a number that is genuinely allowed to be absent.
 *
 * WHY THIS EXISTS. `Number(null)` is 0, `Number('')` is 0, and `Number([])` is 0. So the
 * obvious-looking guard
 *
 *     Number.isFinite(Number(v)) ? Number(v) : null
 *
 * quietly turns "we do not know" into "zero" for every one of them, and passes the check
 * while doing it. On a field whose ABSENCE is meaningful that is not a rounding error: a
 * CollegeMembership row with no CGPA recorded — which is the schema's own default — read as
 * a CGPA of 0 and failed every cut-off a company had published.
 *
 * `Number(undefined)` is NaN, so the guard happens to behave for a missing property and to
 * misbehave for an explicit null. That is the worst possible split, because the case that
 * works is the one you notice in testing and the case that fails is the one in the database.
 *
 * A REAL ZERO IS STILL A REAL ZERO. Fields like an active-backlog count mean something at 0,
 * and this returns 0 for them. The distinction being drawn is absent-versus-zero, not
 * falsy-versus-truthy — `v || null` would be the same bug wearing a different hat.
 */
export function nullableNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;

  // Numbers pass straight through, including 0. NaN and the infinities do not: they are
  // arithmetic accidents, not measurements.
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;

  /**
   * Strings, because form bodies and CSV imports arrive as strings. A blank or
   * whitespace-only box is somebody NOT answering, which is exactly the case Number('')
   * would score as zero.
   */
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Everything else is refused rather than coerced. `Number(true)` is 1 and `Number([])` is
   * 0, and neither a boolean nor an empty array has ever been somebody's CGPA — accepting
   * them would only let a malformed request through as a plausible-looking figure.
   */
  return null;
}

/** True when a value is a usable number. Reads better than `!== null` at a call site. */
export const hasNumber = (v: unknown): boolean => nullableNumber(v) !== null;
