/**
 * Saving answers mid-paper, and getting them back after a refresh.
 *
 * The client autosaves one question at a time, which makes the MERGE the load-bearing part:
 * a partial save must never erase the twenty answers it did not mention. And the round trip
 * has to be complete — an answer that saves but does not come back on reload is the same
 * bug as not saving it, discovered later.
 *
 * Saving is deliberately not submitting. Status stays IN_PROGRESS, nothing is graded, and no
 * evidence is written.
 */

let paper: any = null;

jest.mock('../models/PersonalizedAssessment', () => ({
  __esModule: true,
  default: {
    findOne: (q: any) => {
      const hit = paper && paper.tenantId === q.tenantId
        && String(paper.studentId) === String(q.studentId)
        && (!q.status || paper.status === q.status) ? paper : null;
      const handle: any = Promise.resolve(hit);
      handle.lean = async () => hit;
      return handle;
    },
  },
}));

// The item text/options come from the content itself; stubbed so these tests stay about
// answer persistence rather than about the source registry.
jest.mock('../services/skillEvidenceSourceRegistry', () => ({
  __esModule: true,
  refKey: (t: string, i: string) => `${t}:${i}`,
  loadItems: async () => new Map([
    ['question:q1', { text: 'Q one', itemType: 'mcq_single', options: [{ id: '0', text: 'A' }, { id: '1', text: 'B' }] }],
    ['question:q2', { text: 'Q two', itemType: 'mcq_single', options: [{ id: '0', text: 'A' }] }],
    ['question:q3', { text: 'Q three', itemType: 'mcq_single', options: [{ id: '0', text: 'A' }] }],
  ]),
}));

import { savePersonalizedAnswers, getMyPersonalizedAssessment } from '../controllers/personalizedAssessmentController';

const TENANT = 't1';
const STUDENT = 's1';

const req = (body: any = {}) => ({ user: { tenantId: TENANT, id: STUDENT }, body, query: {}, params: {} } as any);

function res() {
  const out: any = { code: 200, body: null };
  out.status = (c: number) => { out.code = c; return out; };
  out.json = (b: any) => { out.body = b; return out; };
  return out;
}

const answer = (id: string, response: any) => ({ sourceType: 'question', sourceId: id, response });

beforeEach(() => {
  paper = {
    _id: 'pa1', tenantId: TENANT, studentId: STUDENT,
    attemptNumber: 1, status: 'IN_PROGRESS', startedAt: new Date(),
    items: [
      { order: 0, sourceType: 'question', sourceId: 'q1', points: 1 },
      { order: 1, sourceType: 'question', sourceId: 'q2', points: 1 },
      { order: 2, sourceType: 'question', sourceId: 'q3', points: 1 },
    ],
    answers: undefined,
    save: async () => paper,
  };
});

describe('saving answers', () => {
  it('stores what the student chose without submitting the paper', async () => {
    const r = res();
    await savePersonalizedAnswers(req({ answers: [answer('q1', ['1'])] }), r);

    expect(r.body.saved).toBe(true);
    expect(paper.status).toBe('IN_PROGRESS');
    expect(paper.submittedAt).toBeUndefined();
    expect(paper.answers).toHaveLength(1);
  });

  it('MERGES a later save rather than replacing what came before', async () => {
    // The client saves one question at a time. Replacing would wipe the rest of the paper.
    await savePersonalizedAnswers(req({ answers: [answer('q1', ['1'])] }), res());
    await savePersonalizedAnswers(req({ answers: [answer('q2', ['0'])] }), res());

    expect(paper.answers).toHaveLength(2);
    expect(paper.answers.find((a: any) => a.sourceId === 'q1').response).toEqual(['1']);
    expect(paper.answers.find((a: any) => a.sourceId === 'q2').response).toEqual(['0']);
  });

  it('lets a student change their mind about a question', async () => {
    await savePersonalizedAnswers(req({ answers: [answer('q1', ['0'])] }), res());
    await savePersonalizedAnswers(req({ answers: [answer('q1', ['1'])] }), res());

    expect(paper.answers).toHaveLength(1);
    expect(paper.answers[0].response).toEqual(['1']);
  });

  it('reports how many questions are answered so far', async () => {
    const r = res();
    await savePersonalizedAnswers(req({ answers: [answer('q1', ['1']), answer('q2', ['0'])] }), r);
    expect(r.body.answered).toBe(2);
  });

  it('is safe to replay — the same save twice is still one answer', async () => {
    // A retried autosave after a timeout must not duplicate anything.
    await savePersonalizedAnswers(req({ answers: [answer('q1', ['1'])] }), res());
    await savePersonalizedAnswers(req({ answers: [answer('q1', ['1'])] }), res());

    expect(paper.answers).toHaveLength(1);
  });
});

describe('resuming after a reload', () => {
  it('returns the saved response with each question', async () => {
    await savePersonalizedAnswers(req({ answers: [answer('q1', ['1']), answer('q3', ['0'])] }), res());

    const r = res();
    await getMyPersonalizedAssessment(req(), r);

    const items = r.body.assessment.items;
    expect(items.find((i: any) => i.sourceId === 'q1').response).toEqual(['1']);
    expect(items.find((i: any) => i.sourceId === 'q3').response).toEqual(['0']);
    // Untouched questions come back genuinely blank rather than as a stale value.
    expect(items.find((i: any) => i.sourceId === 'q2').response).toBeUndefined();
  });

  it('still hands back the options needed to answer', async () => {
    const r = res();
    await getMyPersonalizedAssessment(req(), r);
    expect(r.body.assessment.items[0].options).toHaveLength(2);
  });

  it('never returns an answer key', async () => {
    await savePersonalizedAnswers(req({ answers: [answer('q1', ['1'])] }), res());
    const r = res();
    await getMyPersonalizedAssessment(req(), r);

    const serialised = JSON.stringify(r.body).toLowerCase();
    for (const forbidden of ['iscorrect', 'correctoption', 'correctindex', 'correctanswer', 'generationseed']) {
      expect(serialised).not.toContain(forbidden);
    }
  });
});

describe('what a save is not allowed to do', () => {
  it('drops an answer for a question that is not on the frozen paper', async () => {
    // §19: a client cannot introduce a question it prefers.
    await savePersonalizedAnswers(req({ answers: [answer('not-on-paper', ['1'])] }), res());
    expect(paper.answers || []).toHaveLength(0);
  });

  it('refuses when there is no paper in progress', async () => {
    paper.status = 'SUBMITTED';
    const r = res();
    await savePersonalizedAnswers(req({ answers: [answer('q1', ['1'])] }), r);

    // A submitted paper is closed to edits — otherwise answers could be rewritten after
    // seeing the result.
    expect(r.code).toBe(404);
  });

  it('finds nothing for another tenant asking about the same student', async () => {
    const r = res();
    await savePersonalizedAnswers(
      { user: { tenantId: 't2', id: STUDENT }, body: { answers: [answer('q1', ['1'])] } } as any, r);
    expect(r.code).toBe(404);
  });

  it('ignores a body with no answers rather than clearing what is stored', async () => {
    await savePersonalizedAnswers(req({ answers: [answer('q1', ['1'])] }), res());
    await savePersonalizedAnswers(req({}), res());

    expect(paper.answers).toHaveLength(1);
  });
});
