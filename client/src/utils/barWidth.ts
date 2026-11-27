/**
 * The width of a progress or score bar's fill, in percent.
 *
 * Zero is an empty bar. Bars used to be drawn at a 2–4% minimum so a tiny value stayed visible,
 * which also painted a red sliver on a 0/100 score — read as "some" when it was none. A value
 * above zero still gets that sliver; zero, missing or negative gets nothing. Never above 100.
 */
export function barWidth(value: number | null | undefined, min = 2): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(100, Math.max(min, v));
}
