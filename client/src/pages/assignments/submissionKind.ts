import type { AssignmentType } from '../../api/assignmentApi';

/**
 * How the workspace hands an attempt in, by assignment type.
 *
 * A PROJECT used to have no answer here: the screen offered a file picker with nothing behind it, and Submit
 * sent nothing before moving to the result page. The attempt stayed in progress, so a Foundation project day —
 * required, and holding the day open — could never be completed. A project is now handed in as a written
 * submission: where the work is and what was built, which a reviewer grades against the brief's rubric.
 *
 * Compared by value (the AssignmentType strings), so this stays free of the API module and its HTTP client.
 */
export type SubmissionKind = 'code' | 'mcq' | 'written' | 'none';

export function submissionKindFor(type: AssignmentType | string | undefined): SubmissionKind {
  switch (type) {
    case 'coding':
    case 'sql':
    case 'web':
      return 'code';
    case 'mcq':
      return 'mcq';
    case 'theory':
    case 'project':
      return 'written';
    default:
      return 'none';
  }
}

/** Why a written project submission cannot be handed in yet, or null when it can. */
export function projectSubmissionProblem(text: string): string | null {
  return text.trim().length < 20
    ? 'Describe what you built and where it is (for example, a repository or document link) before submitting.'
    : null;
}
