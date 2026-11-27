/**
 * "Average skill score": one rule for every screen that shows it (Home, Skill DNA).
 *
 *   average = mean of the scores of the skills measured with MEDIUM or HIGH confidence
 *
 * A skill seen once (LOW confidence) is a first impression, not a measurement; letting it count
 * equally is what made the old average swing on a single quiz question. When no skill has reached
 * MEDIUM yet, the average falls back to every measured skill and is marked `early`.
 * Retired skills never count.
 */
export interface ScoredSkill { score: number; confidence: string; skillActive?: boolean }

export function averageSkillScore(rows: ScoredSkill[]): { score: number | null; counted: number; early: boolean } {
  const live = rows.filter((r) => r.skillActive !== false);
  if (!live.length) return { score: null, counted: 0, early: false };
  const sure = live.filter((r) => r.confidence === 'MEDIUM' || r.confidence === 'HIGH');
  const used = sure.length ? sure : live;
  return {
    score: Math.round(used.reduce((n, r) => n + (Number(r.score) || 0), 0) / used.length),
    counted: used.length,
    early: !sure.length,
  };
}

/** Where to focus first: the weakest skills we are reasonably sure about, then the rest. */
export function focusOrder<T extends ScoredSkill & { evidenceCount?: number }>(rows: T[]): T[] {
  const sureFirst = (r: T) => (r.confidence === 'MEDIUM' || r.confidence === 'HIGH' ? 0 : 1);
  return [...rows].sort((a, b) => sureFirst(a) - sureFirst(b) || a.score - b.score || (a.evidenceCount || 0) - (b.evidenceCount || 0));
}
