/**
 * The gate between what a model writes and what a student is asked.
 *
 * AI drafting exists because the pilot pool is too small — 44 questions serving papers of
 * 16-20 — and hand-authoring is the bottleneck. But a bigger pool of worse questions is a
 * loss, not a gain: a question every student gets right measures nothing while still
 * occupying a slot that should have measured something, and it quietly compresses the whole
 * cohort's scores toward the top.
 *
 * So these tests are mostly about the DISTRACTORS. That is where language models actually
 * fail at multiple choice — one carefully-worded correct answer and three throwaways — and
 * it is the failure that is invisible in a spot check because every individual question
 * reads fine.
 */

import { checkDraft, parseDraftResponse } from '../services/skillQuestionDraftService';

const opt = (text: string, isCorrect = false) => ({ text, isCorrect });

/** A draft with nothing wrong with it, which each test then spoils in one specific way. */
const good = () => ({
  question: 'What does an index on a SQL column primarily change?',
  options: [
    opt('Read speed for queries filtering on that column', true),
    opt('The amount of disk the table uses'),
    opt('The order rows are physically stored in'),
    opt('How many rows a query is allowed to return'),
  ],
  explanation: 'An index trades write cost and storage for faster lookups on the indexed column.',
  distractorRationale: ['confuses index with storage', 'confuses index with clustering', 'confuses index with LIMIT'],
});

const none = new Set<string>();

describe('drafts that must never reach a reviewer', () => {
  it('drops one with no correct answer', () => {
    const d = good();
    d.options = d.options.map(o => opt(o.text, false));
    expect(checkDraft(d, none).fatal).toMatch(/no option is marked correct/);
  });

  it('drops one with two correct answers', () => {
    const d = good();
    d.options[1].isCorrect = true;
    expect(checkDraft(d, none).fatal).toMatch(/2 options are marked correct/);
  });

  it('drops one with too few options to be a choice', () => {
    const d = good();
    d.options = d.options.slice(0, 2);
    expect(checkDraft(d, none).fatal).toMatch(/only 2 options/);
  });

  it('drops one where two options say the same thing', () => {
    // Not cosmetic: if the duplicate is the correct answer the question has two right
    // answers and marks a student wrong for picking one of them.
    const d = good();
    d.options[2] = opt('read speed for queries filtering on that column!');
    expect(checkDraft(d, none).fatal).toMatch(/same thing/);
  });

  it('drops a blank option', () => {
    const d = good();
    d.options[3] = opt('   ');
    expect(checkDraft(d, none).fatal).toMatch(/blank/);
  });

  it('drops an empty or stub question', () => {
    expect(checkDraft({ ...good(), question: '' }, none).fatal).toMatch(/empty/);
    expect(checkDraft({ ...good(), question: 'What is SQL?' }, none).fatal).toMatch(/too short/);
  });

  it('drops a duplicate of something already in the pool', () => {
    const d = good();
    const pool = new Set(['what does an index on a sql column primarily change']);
    expect(checkDraft(d, pool).fatal).toMatch(/duplicate/);
  });

  it('treats punctuation and case as noise when comparing', () => {
    // Otherwise the same question comes back forever, reworded by a comma.
    const d = { ...good(), question: 'What does an INDEX on a SQL column, primarily, change?' };
    const pool = new Set(['what does an index on a sql column primarily change']);
    expect(checkDraft(d, pool).fatal).toMatch(/duplicate/);
  });

  it('lets a good one through', () => {
    const r = checkDraft(good(), none);
    expect(r.fatal).toBeNull();
    expect(r.warnings).toEqual([]);
  });
});

describe('drafts that are kept but flagged', () => {
  /**
   * The length tell is the single most common way an AI multiple-choice question leaks its
   * own answer. A student who knows nothing scores well above chance by picking the longest
   * option, so the question measures test-taking rather than the skill.
   */
  it('flags a correct option far longer than the rest', () => {
    const d = good();
    d.options[0] = opt(
      'Read speed for queries that filter or sort on that column, at the cost of additional write overhead and storage space',
      true);
    const r = checkDraft(d, none);
    expect(r.fatal).toBeNull();
    expect(r.warnings.join(' ')).toMatch(/longer/i);
  });

  it('does NOT flag a long correct option when the others are long too', () => {
    // The tell is the CONTRAST. Flagging length alone would flag every careful question.
    const d = good();
    d.options = [
      opt('Read speed for queries that filter on that column, at some write cost', true),
      opt('The total amount of disk space the table and its metadata consume'),
      opt('The physical order in which the rows themselves are stored on disk'),
      opt('The maximum number of rows any single query is permitted to return'),
    ];
    expect(checkDraft(d, none).warnings.join(' ')).not.toMatch(/longer/i);
  });

  it('flags lazy catch-all distractors', () => {
    const d = good();
    d.options[3] = opt('All of the above');
    expect(checkDraft(d, none).warnings.join(' ')).toMatch(/lazy distractor/i);
  });

  it('flags a missing explanation', () => {
    const r = checkDraft({ ...good(), explanation: '  ' }, none);
    expect(r.fatal).toBeNull();
    expect(r.warnings.join(' ')).toMatch(/explanation/i);
  });

  it('flags wrong options with no stated misconception behind them', () => {
    // The rationale is what forces the model to make distractors that someone would pick.
    const r = checkDraft({ ...good(), distractorRationale: [] }, none);
    expect(r.warnings.join(' ')).toMatch(/misconception/i);
  });

  it('flags but keeps a very long stem', () => {
    const r = checkDraft({ ...good(), question: 'Q '.repeat(400) }, none);
    expect(r.fatal).toBeNull();
    expect(r.warnings.join(' ')).toMatch(/long question/i);
  });
});

describe('reading what the model sent back', () => {
  const payload = '{"questions":[{"question":"a"},{"question":"b"}]}';

  it('reads plain JSON', () => {
    expect(parseDraftResponse(payload)).toHaveLength(2);
  });

  it('reads it out of a markdown fence', () => {
    // Models add one often enough that failing here would throw away good batches.
    expect(parseDraftResponse('```json\n' + payload + '\n```')).toHaveLength(2);
  });

  it('reads it despite a sentence of preamble', () => {
    expect(parseDraftResponse('Sure! Here are your questions:\n' + payload)).toHaveLength(2);
  });

  it('reads a bare array', () => {
    expect(parseDraftResponse('[{"question":"a"}]')).toHaveLength(1);
  });

  it('throws rather than silently returning nothing', () => {
    // A failed call must be reportable. An empty batch would look like the model simply
    // had nothing to say, and the admin would run it again.
    expect(() => parseDraftResponse('I cannot help with that.')).toThrow();
    expect(() => parseDraftResponse('{"notes":"none"}')).toThrow(/no question list/);
  });
});
