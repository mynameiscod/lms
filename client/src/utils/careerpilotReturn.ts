/**
 * Where a CareerPilot learner goes back to after a full-screen activity (a checkpoint quiz).
 *
 * The quiz pages are shared with the LMS, whose exits lead to /quizzes. A learner who opened a
 * checkpoint from their journey day must come back to that day, inside CareerPilot. The day passes
 * `?returnTo=` when it launches the quiz; only a CareerPilot path is honoured, so the parameter can
 * never send anybody off-site or into another product.
 */
export const careerpilotReturn = (search: string): string => {
  const v = new URLSearchParams(search).get('returnTo') || '';
  return v.startsWith('/careerpilot/') && !v.startsWith('//') && !v.includes('\\') ? v : '';
};

/** `path` with the return address carried along, when there is one. */
export const withReturn = (path: string, returnTo: string): string =>
  (returnTo ? `${path}${path.includes('?') ? '&' : '?'}returnTo=${encodeURIComponent(returnTo)}` : path);

/** "Day 2" for /careerpilot/journey/day/2, otherwise a generic label. */
export const returnLabel = (returnTo: string): string => {
  const day = returnTo.match(/\/careerpilot\/journey\/day\/(\d+)/)?.[1];
  return day ? `Back to Day ${day}` : 'Back to CareerPilot';
};
