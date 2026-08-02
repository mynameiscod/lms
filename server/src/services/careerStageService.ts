/**
 * Career stage — how close a member is to the job market.
 *
 * The obvious field to capture is "year of study", and it does not work. A 3rd-year
 * B.Tech student is mid-course; a 3rd-year B.Sc student is in their FINAL year facing
 * placements now. Same number, opposite situations. Add MCA (2 years), diplomas,
 * backlogs and gap years and the number stops meaning anything consistent.
 *
 * What actually decides which questions and which missions apply is time remaining
 * before they enter the market. So we capture a graduation date and derive the stage —
 * a final-year B.Sc and a final-year B.Tech both land in 'placement', which is correct,
 * because they compete for the same jobs on the same timeline.
 *
 * Deriving rather than asking also means the stage advances on its own: a member who
 * joins in their second year moves to 'build' and later 'placement' with no record ever
 * being edited, and a student who pushes their graduation back moves with it.
 */

export type CareerStage = 'foundation' | 'build' | 'placement' | 'job_seeker';

export const CAREER_STAGES: { key: CareerStage; label: string; blurb: string }[] = [
  { key: 'foundation', label: 'Foundation', blurb: 'More than 2 years out — fundamentals and study habits.' },
  { key: 'build',      label: 'Build',      blurb: '1–2 years out — projects, depth, first real proof.' },
  { key: 'placement',  label: 'Placement',  blurb: 'Final year — resume, mock interviews, applications.' },
  { key: 'job_seeker', label: 'Job Seeker', blurb: 'Graduated — active in the market now.' },
];

export const PROGRAMS = ['B.Tech', 'B.E', 'B.Sc', 'BCA', 'B.Com', 'MCA', 'M.Tech', 'MBA', 'Diploma', 'Other'];

/** Whole months from now until the graduation date. Negative once it has passed. */
export function monthsUntil(gradYear?: number | null, gradMonth?: number | null, now = new Date()): number | null {
  if (!gradYear || gradYear < 1990 || gradYear > 2100) return null;
  const m = gradMonth && gradMonth >= 1 && gradMonth <= 12 ? gradMonth : 6;   // mid-year if unstated
  return (gradYear - now.getFullYear()) * 12 + (m - (now.getMonth() + 1));
}

/**
 * The stage for a member. `graduated: true` short-circuits the date, because someone
 * who has already finished is in the market regardless of what their certificate says.
 */
export function deriveStage(opts: {
  graduated?: boolean;
  graduationYear?: number | null;
  graduationMonth?: number | null;
  now?: Date;
}): CareerStage | null {
  if (opts.graduated) return 'job_seeker';
  const months = monthsUntil(opts.graduationYear, opts.graduationMonth, opts.now);
  if (months === null) return null;          // unknown — callers treat as "serve everything"
  if (months < 0) return 'job_seeker';
  if (months <= 12) return 'placement';
  if (months <= 24) return 'build';
  return 'foundation';
}

/**
 * Technical background. A B.Sc Physics student targeting IT and a B.Tech CSE student can
 * be at the same stage with very different baselines, so a handful of questions and
 * missions need to know which. Most content is 'any' and never consults this.
 */
export type Background = 'cs' | 'non_cs' | 'any';

const CS_HINTS = [
  'computer', 'cse', 'it', 'information tech', 'software', 'bca', 'mca',
  'data science', 'ai', 'artificial intelligence', 'machine learning', 'ise',
];

export function deriveBackground(program?: string | null, branch?: string | null): Background {
  const hay = `${program || ''} ${branch || ''}`.toLowerCase();
  if (!hay.trim()) return 'any';
  return CS_HINTS.some(h => hay.includes(h)) ? 'cs' : 'non_cs';
}

/** Everything derived, in one call, for storing on the member. */
export function resolveCareerProfile(input: {
  program?: string | null;
  branch?: string | null;
  graduationYear?: number | null;
  graduationMonth?: number | null;
  graduated?: boolean;
  now?: Date;
}) {
  const stage = deriveStage(input);
  return {
    stage,
    background: deriveBackground(input.program, input.branch),
    monthsToGraduation: monthsUntil(input.graduationYear, input.graduationMonth, input.now),
    stageComputedAt: input.now || new Date(),
  };
}

/**
 * Does a piece of content apply to this member?
 *
 * Written once and shared by the assessment filter and the mission generator, because
 * the failure mode otherwise is subtle: two near-identical predicates that drift, so a
 * student is asked a placement question but never given the matching placement mission.
 *
 * Both filters default to INCLUDE. Untagged content — which is every question and
 * mission that exists today — serves everyone, so tagging is opt-in and nothing
 * disappears the moment this ships. A member with no stage (unknown graduation date)
 * likewise sees everything rather than being guessed into a segment.
 */
export function appliesToMember(
  content: { stages?: string[] | null; background?: string | null },
  member: { stage?: string | null; background?: string | null },
): boolean {
  const stages = content.stages || [];
  if (stages.length && member.stage && !stages.includes(member.stage)) return false;

  const want = content.background || 'any';
  if (want !== 'any' && member.background && want !== member.background) return false;

  return true;
}

/**
 * Guard against a stage being served an empty or near-empty paper.
 *
 * A stage with three questions still produces a score out of 100, and that score is
 * meaningless — but nothing in the system would say so. Admin screens call this to warn
 * before a thin segment reaches a student.
 */
export function coverageByStage(
  items: { stages?: string[] | null }[],
): Record<CareerStage, number> {
  const out = { foundation: 0, build: 0, placement: 0, job_seeker: 0 } as Record<CareerStage, number>;
  for (const it of items) {
    const tags = it.stages || [];
    if (!tags.length) { for (const k of Object.keys(out) as CareerStage[]) out[k]++; continue; }
    for (const t of tags) if (t in out) out[t as CareerStage]++;
  }
  return out;
}
