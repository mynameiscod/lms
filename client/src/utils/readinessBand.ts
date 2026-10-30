/**
 * The one rule for naming a readiness figure (role, placement, resume, interview, assessment
 * result). Each screen used to set its own cut-offs — 80/60/40 on one, 80/70/40 on another — so
 * the same 65% read "Getting close" on one page and "Needs focus" on the next.
 *
 * A figure that has not been measured gets no band: each screen says that in its own words.
 */
export type ReadinessTone = 'strong' | 'close' | 'building' | 'early';

export const READINESS_BANDS: ReadonlyArray<{ min: number; tone: ReadinessTone; label: string }> = [
  { min: 80, tone: 'strong', label: 'Strong' },
  { min: 60, tone: 'close', label: 'Getting close' },
  { min: 40, tone: 'building', label: 'Building momentum' },
  { min: 0, tone: 'early', label: 'Early stage' },
];

export function readinessBand(value: number): { tone: ReadinessTone; label: string } {
  const v = Number.isFinite(value) ? value : 0;
  const band = READINESS_BANDS.find(b => v >= b.min) || READINESS_BANDS[READINESS_BANDS.length - 1];
  return { tone: band.tone, label: band.label };
}
