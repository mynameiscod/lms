/**
 * Which direction a student is currently heading in, and how firmly.
 *
 * DERIVED, NOT STORED — for now, deliberately. Every input already exists on the passport:
 * a chosen role implies a direction, and the absence of one is itself an answer. Adding a
 * `selectedDirection` field before knowing whether students would use a direction picker at all
 * would mean a column to migrate, back-fill and keep in sync with primaryRole for no gain. When
 * a picker exists, `resolveDirection` gains one lookup and every caller stays unchanged.
 *
 * NOT_SURE IS A REAL ANSWER. The passport stores NOT_SURE as a value rather than leaving the
 * field blank, precisely so "I don't know yet" can be distinguished from "nobody asked". This
 * respects that distinction: both produce a plan, and neither produces a guess.
 *
 * NOTHING HERE LOCKS A STUDENT IN. A first-year who picks AI in week one is telling us where to
 * point today's teaching, not signing a contract, and the language used back to them says so.
 */

import {
  CareerDirection, DirectionKey, DirectionStatus,
  directionByKey, directionForRole, explorationDirections, isDirectionKey,
} from '../data/careerDirectionPolicy';

/** The passport role value meaning "asked, and they said they do not know". */
const ROLE_NOT_SURE = 'NOT_SURE';

export interface ResolvedDirection {
  /** The direction to teach toward. Null when the student is still deciding. */
  direction: CareerDirection | null;
  status: DirectionStatus;
  /** Directions to sample. Empty for a student who has chosen. */
  explorationDirections: DirectionKey[];
  /** Why this resolution was reached — surfaced in the plan, and useful in support. */
  basis: 'EXPLICIT_DIRECTION' | 'FROM_ROLE' | 'FROM_INTERESTS' | 'NOT_SURE' | 'NOT_ANSWERED';
}

export interface DirectionInput {
  /** A direction the student picked outright, once a picker exists. */
  selectedDirection?: string | null;
  /** CareerRole key from the passport. May be NOT_SURE. */
  primaryRole?: string | null;
  /**
   * Technologies the student said they are interested in.
   *
   * A weak signal used only to narrow EXPLORATION, never to declare a direction on somebody's
   * behalf. Saying you find Python interesting is not choosing a career.
   */
  preferredTechnologies?: string[] | null;
}

/**
 * Rough technology → direction hints, for narrowing what an undecided student is shown.
 *
 * Deliberately incomplete and deliberately not authoritative. It exists to make exploration feel
 * less random for somebody who has expressed an interest; a technology it does not recognise
 * simply contributes nothing rather than being forced into a bucket.
 */
const TECH_HINTS: { match: RegExp; direction: DirectionKey }[] = [
  { match: /\b(react|angular|vue|html|css|javascript|typescript|next\.?js|frontend|web)\b/i, direction: 'WEB_DEVELOPMENT' },
  { match: /\b(java|spring|node|express|backend|api|microservice|\.net|c#|go|golang)\b/i,     direction: 'SOFTWARE_BACKEND' },
  { match: /\b(ml|machine learning|deep learning|tensorflow|pytorch|nlp|genai|llm|ai)\b/i,     direction: 'AI_ML' },
  { match: /\b(sql|power ?bi|tableau|excel|analytics|pandas|data)\b/i,                        direction: 'DATA' },
  { match: /\b(android|ios|flutter|react native|kotlin|swift|mobile)\b/i,                     direction: 'MOBILE' },
  { match: /\b(aws|azure|gcp|docker|kubernetes|devops|terraform|cloud|ci\/cd)\b/i,            direction: 'CLOUD_DEVOPS' },
  { match: /\b(security|cyber|pentest|infosec|owasp|forensic)\b/i,                            direction: 'CYBERSECURITY' },
];

/** Directions hinted at by what the student said interests them, most-mentioned first. */
export function directionsFromInterests(technologies?: string[] | null): DirectionKey[] {
  const counts = new Map<DirectionKey, number>();
  for (const raw of technologies || []) {
    const text = String(raw || '');
    if (!text.trim()) continue;
    for (const hint of TECH_HINTS) {
      if (hint.match.test(text)) counts.set(hint.direction, (counts.get(hint.direction) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k]) => k);
}

/**
 * Resolve the direction to plan against.
 *
 * The order matters and is the product decision: an explicit choice beats an inferred one, a
 * chosen role beats a guess from interests, and interests never become a choice — they only
 * decide what an undecided student is shown first.
 */
export function resolveDirection(input: DirectionInput): ResolvedDirection {
  // 1. They picked a direction outright.
  if (isDirectionKey(input.selectedDirection)) {
    return {
      direction: directionByKey(input.selectedDirection)!,
      status: 'SELECTED',
      explorationDirections: [],
      basis: 'EXPLICIT_DIRECTION',
    };
  }

  const role = String(input.primaryRole || '').toUpperCase().trim();

  // 2. They picked a role, which implies a direction.
  if (role && role !== ROLE_NOT_SURE) {
    const fromRole = directionForRole(role);
    if (fromRole) {
      return { direction: fromRole, status: 'SELECTED', explorationDirections: [], basis: 'FROM_ROLE' };
    }
    /**
     * A role we have no direction for yet — a newly authored one, or a niche.
     *
     * Treated as EXPLORING rather than SELECTED: they have told us something real, so they are
     * not undecided, but we cannot honestly claim to know which direction to narrow their
     * teaching to. Showing breadth is the truthful response to not knowing.
     */
    const hinted = directionsFromInterests(input.preferredTechnologies);
    return {
      direction: null,
      status: 'EXPLORING',
      explorationDirections: hinted.length ? hinted : explorationDirections().map(d => d.key),
      basis: 'FROM_INTERESTS',
    };
  }

  // 3. Interests, but no role. Narrowed exploration, never a declared direction.
  const hinted = directionsFromInterests(input.preferredTechnologies);
  if (hinted.length) {
    return {
      direction: null,
      status: 'EXPLORING',
      explorationDirections: hinted,
      basis: 'FROM_INTERESTS',
    };
  }

  // 4. Nothing to go on. Show the field — this is a student who needs to meet it, not one who
  //    has failed to answer a question.
  return {
    direction: null,
    status: 'UNDECIDED',
    explorationDirections: explorationDirections().map(d => d.key),
    basis: role === ROLE_NOT_SURE ? 'NOT_SURE' : 'NOT_ANSWERED',
  };
}

/** How the resolution is described to the student. Built, never generated. */
export function describeDirection(r: ResolvedDirection): string {
  switch (r.basis) {
    case 'EXPLICIT_DIRECTION':
      return `You are heading toward ${r.direction!.name}. You can change this whenever you like.`;
    case 'FROM_ROLE':
      return `Based on the role you chose, your plan is pointed at ${r.direction!.name}. You can change this whenever you like.`;
    case 'FROM_INTERESTS':
      return `You have not picked a direction yet, so your plan covers the foundation plus a look at what interests you.`;
    case 'NOT_SURE':
      return `You told us you are still deciding — so your plan builds the foundation everyone needs and lets you sample a few areas.`;
    default:
      return `Your plan builds the foundation everyone needs while you work out what you enjoy.`;
  }
}
