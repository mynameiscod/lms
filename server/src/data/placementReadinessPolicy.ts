/**
 * PLACEMENT_READINESS_V1 — how ready a resume is, and how ready an interview performance is.
 *
 * THREE READINESS FIGURES, NEVER ONE. CareerPilot now answers three different questions and
 * must keep answering them separately:
 *
 *   Skill Readiness      do your demonstrated skills match the role?      (Module 8)
 *   Resume Readiness     does your resume represent you for that role?    (here)
 *   Interview Readiness  can you show it under interview conditions?      (here)
 *
 * Averaging them would destroy the only useful thing they say. A student with strong skills
 * and a weak resume needs an afternoon of editing; a student with a strong resume and weak
 * skills needs three months. One number cannot tell those apart, so this file deliberately
 * exports no way to combine them.
 *
 * A RESUME IS A CLAIM, NOT EVIDENCE. Nothing in this file can move Skill DNA. Writing "Java"
 * on a document is not a demonstration of Java, and a system that treated it as one would
 * measure how students describe themselves rather than what they can do.
 *
 * DETERMINISTIC. Every score here is arithmetic over structured data. AI may later explain
 * or suggest wording, and it does not get a vote on the number.
 */

export const PLACEMENT_READINESS_VERSION = 'PLACEMENT_READINESS_V1';

// ── resume ──────────────────────────────────────────────────────────────────

/**
 * What a resume is scored on.
 *
 * Eight dimensions, each answerable from structured data. Fewer would hide what to fix;
 * thirty would be a report nobody reads.
 */
export const RESUME_DIMENSIONS = [
  'COMPLETENESS',
  'ROLE_ALIGNMENT',
  'SKILL_EVIDENCE',
  'PROJECT_STRENGTH',
  'IMPACT',
  'ATS_QUALITY',
] as const;
export type ResumeDimension = typeof RESUME_DIMENSIONS[number];

/**
 * How much each dimension counts.
 *
 * Role alignment and demonstrated skill lead, because a beautifully formatted resume aimed
 * at the wrong role helps nobody. Weights live here so two screens cannot disagree about
 * what a 58% means.
 */
export const RESUME_WEIGHTS: Record<ResumeDimension, number> = {
  COMPLETENESS: 15,
  ROLE_ALIGNMENT: 25,
  SKILL_EVIDENCE: 20,
  PROJECT_STRENGTH: 20,
  IMPACT: 10,
  ATS_QUALITY: 10,
};

/** How a resume's claim about a skill compares with what CareerPilot has measured. */
export type ClaimStatus =
  /** Claimed, and the measured evidence supports it. */
  | 'VERIFIED'
  /** Claimed, but nothing has measured it yet. Not an accusation — a gap in our evidence. */
  | 'NEEDS_VALIDATION'
  /** Claimed, and what we have measured is well below the claim. */
  | 'CLAIM_EXCEEDS_EVIDENCE'
  /** The role needs it, the student has it measured, and the resume does not mention it. */
  | 'MISSING_FROM_RESUME';

/**
 * Wording for each state.
 *
 * NEUTRAL BY DESIGN. "Claim exceeds evidence" is a statement about what we have measured,
 * not about the student's honesty — they may well be right and simply untested. Copy that
 * implied otherwise would be both rude and, quite often, wrong.
 */
export const CLAIM_MESSAGE: Record<ClaimStatus, string> = {
  VERIFIED: 'Your assessments back this up.',
  NEEDS_VALIDATION: 'We have not measured this yet — a skill check-in would confirm it.',
  CLAIM_EXCEEDS_EVIDENCE: 'Your measured evidence is currently below what this claim suggests.',
  MISSING_FROM_RESUME: 'You have demonstrated this, but your resume does not show it.',
};

/** Below this share of the role's target, a claim outruns the evidence behind it. */
export const CLAIM_EVIDENCE_RATIO = 0.5;

/** A project bullet shorter than this says nothing a reader can use. */
export const MIN_USEFUL_BULLET_CHARS = 60;

/**
 * Words that signal a measurable outcome.
 *
 * Used ONLY to detect whether impact is present. Nothing here invents one: if a student has
 * no metric, the recommendation is to add a real one, never to write one for them.
 */
export const IMPACT_SIGNALS = [
  '%', 'percent', 'reduced', 'improved', 'increased', 'decreased', 'faster',
  'users', 'requests', 'latency', 'throughput', 'saved', 'automated',
];

export type RecommendationPriority = 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL';

/** Most suggestions a student is given at once. A list of fifty is a list of none. */
export const MAX_RECOMMENDATIONS = 5;

// ── interview ───────────────────────────────────────────────────────────────

/**
 * What an interview performance is scored on.
 *
 * DELIVERY, not "confidence". The system observes how an answer was structured and
 * expressed; it does not, and must not, infer somebody's mental state or personality from a
 * transcript.
 */
export const INTERVIEW_DIMENSIONS = [
  'TECHNICAL',
  'PROBLEM_SOLVING',
  'COMMUNICATION',
  'DELIVERY',
] as const;
export type InterviewDimension = typeof INTERVIEW_DIMENSIONS[number];

export const INTERVIEW_WEIGHTS: Record<InterviewDimension, number> = {
  TECHNICAL: 40,
  PROBLEM_SOLVING: 25,
  COMMUNICATION: 20,
  DELIVERY: 15,
};

/**
 * How an interview's questions are shared out.
 *
 * A real interview is not an interrogation of your weakest subject. Most of it covers what
 * the role actually needs, a substantial slice probes known gaps, and some of it lets the
 * student show what they are good at — which is both realistic and the only way an interview
 * can produce evidence of a strength.
 */
export const INTERVIEW_MIX = { core: 0.5, gaps: 0.3, strengths: 0.2 };

/**
 * Whether one graded answer is solid enough to become skill evidence.
 *
 * A GRADED ANSWER TO A MAPPED QUESTION, OR NOTHING. An unanswered question, a question with
 * no canonical skill behind it, and a malformed evaluation all produce no evidence at all —
 * silence is the correct output when we did not observe anything.
 */
export function isEvidenceWorthy(q: {
  skillKey?: string | null;
  answered?: boolean;
  score?: number | null;
  maxScore?: number | null;
}): boolean {
  if (!q.skillKey) return false;                 // generic HR question — no technical claim
  if (!q.answered) return false;                 // they said nothing; we observed nothing
  if (typeof q.score !== 'number' || typeof q.maxScore !== 'number') return false;
  return q.maxScore > 0 && q.score >= 0 && q.score <= q.maxScore;
}

/** Weighted average of whatever dimensions were actually produced. */
export function weightedScore(
  parts: { key: string; score: number }[],
  weights: Record<string, number>,
): number {
  const usable = parts.filter(p => Number.isFinite(p.score) && weights[p.key] !== undefined);
  if (!usable.length) return 0;

  const total = usable.reduce((n, p) => n + weights[p.key], 0);
  const sum = usable.reduce((n, p) => n + p.score * weights[p.key], 0);
  return Math.round(sum / total);
}

export const clamp100 = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));
