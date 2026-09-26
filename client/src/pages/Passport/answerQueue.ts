/**
 * The outbox behind the assessment's autosave.
 *
 * Extracted from the component because the rule that matters is not about React at all, and
 * it is easy to get subtly wrong: a save that fails must not lose the answer, and a save
 * that fails must not later overwrite something the student typed while it was in flight.
 * Both are one-line mistakes and neither is visible until somebody loses twenty minutes of
 * work, so they live here where they can be tested directly.
 */

export interface PendingAnswer {
  sourceType: string;
  sourceId: string;
  response: any;
}

/** Keyed the same way the server matches answers against the frozen paper. */
export type AnswerQueue = Record<string, PendingAnswer>;

export const answerKey = (a: { sourceType: string; sourceId: string }): string =>
  `${a.sourceType}:${a.sourceId}`;

/**
 * Queue an answer, replacing any earlier one for the same question.
 *
 * Replacing rather than appending is deliberate: only the student's latest choice is worth
 * sending, and a queue that accumulated every keystroke would send a stale value last.
 */
export function enqueueAnswer(queue: AnswerQueue, answer: PendingAnswer): AnswerQueue {
  return { ...queue, [answerKey(answer)]: answer };
}

/**
 * Take everything currently queued, leaving an empty queue behind.
 *
 * Returned as a pair rather than mutating, so the caller holds the batch it is about to
 * send and can hand it back verbatim if the request fails.
 */
export function drainQueue(queue: AnswerQueue): { batch: PendingAnswer[]; rest: AnswerQueue } {
  return { batch: Object.values(queue), rest: {} };
}

/**
 * Put a failed batch back — WITHOUT overwriting anything newer.
 *
 * This is the whole point of the module. While a save is in flight the student keeps
 * working, so by the time it fails the queue may already hold a newer answer for one of the
 * questions that just failed. Restoring the batch blindly would resurrect the old value and
 * then send it, quietly reverting an answer the student had already changed — a data-loss
 * bug that looks like the app forgetting what they clicked.
 *
 * A question already present in the queue is therefore left alone; only the ones nobody has
 * touched since are restored.
 */
export function requeueFailed(queue: AnswerQueue, failed: PendingAnswer[]): AnswerQueue {
  const out: AnswerQueue = { ...queue };
  for (const answer of failed) {
    const key = answerKey(answer);
    if (key in out) continue;              // newer answer wins
    out[key] = answer;
  }
  return out;
}

/** Whether anything is waiting to be sent. */
export const hasPending = (queue: AnswerQueue): boolean => Object.keys(queue).length > 0;

/**
 * ── SURVIVING A DISCONNECT ────────────────────────────────────────────────────────────────
 *
 * The outbox above solves the wrong half of the problem on its own. It keeps an answer safe
 * when a SAVE fails, and it kept it in memory — so a student who lost their network, waited,
 * and then reloaded the page lost every answer that had not reached the server. That is the
 * exact case reported: answers given, network drops, answers gone.
 *
 * Both the queue and the answers already given are mirrored to localStorage, keyed by the
 * paper, so a reload picks up where the student was rather than where the server last heard
 * from them. Storage is per-origin and per-browser, which is the right scope: an unsent answer
 * belongs to the tab that has not managed to send it yet.
 *
 * Every access is wrapped. Storage throws in a private window and in a browser with site data
 * blocked, and an assessment must not fail to load because a draft could not be cached.
 */

const DRAFT_PREFIX = 'cp.skillAssessment.draft.';

export interface AnswerDraft {
  /** Answers as the student has them on screen, including ones already acknowledged. */
  answers: Record<string, any>;
  /** What has still not reached the server. */
  pending: AnswerQueue;
  savedAt: number;
}

/** Drafts older than this are ignored: a paper is a sitting, not a document to come back to. */
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const draftKey = (paperId: string): string => `${DRAFT_PREFIX}${paperId}`;

export function saveDraft(paperId: string, draft: Omit<AnswerDraft, 'savedAt'>): void {
  if (!paperId) return;
  try {
    localStorage.setItem(draftKey(paperId), JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch { /* private window, blocked storage, or full — the sitting continues either way */ }
}

export function readDraft(paperId: string): AnswerDraft | null {
  if (!paperId) return null;
  try {
    const raw = localStorage.getItem(draftKey(paperId));
    if (!raw) return null;
    const d = JSON.parse(raw) as AnswerDraft;
    if (!d || typeof d !== 'object') return null;
    if (typeof d.savedAt !== 'number' || Date.now() - d.savedAt > DRAFT_MAX_AGE_MS) return null;
    return { answers: d.answers || {}, pending: d.pending || {}, savedAt: d.savedAt };
  } catch { return null; }
}

export function clearDraft(paperId: string): void {
  if (!paperId) return;
  try { localStorage.removeItem(draftKey(paperId)); } catch { /* nothing to clean up */ }
}
