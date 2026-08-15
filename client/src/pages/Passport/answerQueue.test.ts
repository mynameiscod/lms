import {
  enqueueAnswer, drainQueue, requeueFailed, hasPending, answerKey, AnswerQueue, PendingAnswer,
} from './answerQueue';

/**
 * Regression cover for a real defect in the assessment's autosave.
 *
 * The original drained the queue BEFORE the request and dropped the batch on failure, so a
 * save lost to a dropped connection was gone: the answer stayed on screen, was never sent,
 * and vanished on refresh. The comment in that version claimed the answers were "kept for
 * the next retry", which was simply untrue — only typing a NEW answer for the same question
 * would have resent it.
 *
 * The fix has to hold two rules at once, and the second is the subtle one: a failed batch
 * goes back into the queue, EXCEPT where the student has already answered that question
 * again. Restoring blindly would resend a stale value and silently revert a newer choice —
 * data loss that looks like the app forgetting what they clicked.
 */

const answer = (id: string, response: any): PendingAnswer => ({
  sourceType: 'question', sourceId: id, response,
});

describe('queueing', () => {
  it('keys an answer the way the server matches it', () => {
    expect(answerKey(answer('q1', ['a']))).toBe('question:q1');
  });

  it('keeps only the latest answer for a question', () => {
    let q: AnswerQueue = {};
    q = enqueueAnswer(q, answer('q1', ['a']));
    q = enqueueAnswer(q, answer('q1', ['b']));

    expect(Object.keys(q)).toHaveLength(1);
    expect(q['question:q1'].response).toEqual(['b']);
  });

  it('keeps answers to different questions apart', () => {
    let q: AnswerQueue = {};
    q = enqueueAnswer(q, answer('q1', ['a']));
    q = enqueueAnswer(q, answer('q2', ['c']));
    expect(Object.keys(q)).toHaveLength(2);
  });
});

describe('draining', () => {
  it('hands over everything and leaves the queue empty', () => {
    const q = enqueueAnswer(enqueueAnswer({}, answer('q1', ['a'])), answer('q2', ['b']));
    const { batch, rest } = drainQueue(q);

    expect(batch).toHaveLength(2);
    expect(hasPending(rest)).toBe(false);
  });

  it('does not mutate the queue it was given', () => {
    const q = enqueueAnswer({}, answer('q1', ['a']));
    drainQueue(q);
    // The caller still holds the batch it is about to send; the original must be intact so
    // a failure can put it back.
    expect(hasPending(q)).toBe(true);
  });
});

describe('a failed save', () => {
  it('leaves the answer queued for the next attempt', () => {
    const q = enqueueAnswer({}, answer('q1', ['a']));
    const { batch, rest } = drainQueue(q);

    const after = requeueFailed(rest, batch);

    expect(hasPending(after)).toBe(true);
    expect(after['question:q1'].response).toEqual(['a']);
  });

  it('CANNOT overwrite a newer answer given while it was in flight', () => {
    // The student answered q1 as A, the save started, they changed it to B, then the save
    // failed. B is what they meant; restoring A would revert them.
    const { batch, rest } = drainQueue(enqueueAnswer({}, answer('q1', ['a'])));
    const duringFlight = enqueueAnswer(rest, answer('q1', ['b']));

    const after = requeueFailed(duringFlight, batch);

    expect(after['question:q1'].response).toEqual(['b']);
    expect(Object.keys(after)).toHaveLength(1);
  });

  it('restores the untouched ones while leaving the newer one alone', () => {
    let q: AnswerQueue = {};
    q = enqueueAnswer(q, answer('q1', ['a']));
    q = enqueueAnswer(q, answer('q2', ['a']));
    const { batch, rest } = drainQueue(q);

    const duringFlight = enqueueAnswer(rest, answer('q2', ['b']));
    const after = requeueFailed(duringFlight, batch);

    expect(after['question:q1'].response).toEqual(['a']);   // restored
    expect(after['question:q2'].response).toEqual(['b']);   // newer wins
  });

  it('survives repeated failures without losing or duplicating anything', () => {
    let queue: AnswerQueue = enqueueAnswer({}, answer('q1', ['a']));

    for (let attempt = 0; attempt < 3; attempt++) {
      const { batch, rest } = drainQueue(queue);
      queue = requeueFailed(rest, batch);
    }

    expect(Object.keys(queue)).toHaveLength(1);
    expect(queue['question:q1'].response).toEqual(['a']);
  });

  it('clears once a later attempt succeeds', () => {
    let queue: AnswerQueue = enqueueAnswer({}, answer('q1', ['a']));

    const failed = drainQueue(queue);
    queue = requeueFailed(failed.rest, failed.batch);

    // Second attempt succeeds: nothing is put back.
    const ok = drainQueue(queue);
    queue = ok.rest;

    expect(hasPending(queue)).toBe(false);
    expect(ok.batch).toHaveLength(1);
  });

  it('treats a falsy response as a real answer rather than dropping it', () => {
    // Option 0 is a legitimate choice in CareerPilot's own bank, which answers by index.
    const { batch, rest } = drainQueue(enqueueAnswer({}, answer('q1', 0)));
    const after = requeueFailed(rest, batch);

    expect(after['question:q1'].response).toBe(0);
  });
});
