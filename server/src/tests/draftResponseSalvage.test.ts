/**
 * One malformed question must not cost the whole batch.
 *
 * Drafting parsed the model's reply with a single JSON.parse, so a stray character anywhere
 * in it threw "Unexpected number in JSON at position 2498" — a byte offset into a document
 * the admin cannot see, for a batch of ten where nine were probably fine. Seen on a C batch,
 * where snippets carry braces, quotes and newlines a model does not always escape.
 *
 * The response that failed was NOT truncated: 2259 output tokens against a 6400 limit. So
 * this is not a budget problem to be solved by asking for less — it is a parser that gave up
 * on the first bad byte and reported the failure in a language nobody can act on.
 */

import { parseDraftResponse } from '../services/skillQuestionDraftService';

const q = (n: number, extra = '') =>
  `{"question":"Q${n}?","options":[{"text":"a","isCorrect":true},{"text":"b","isCorrect":false}],`
  + `"explanation":"because"${extra}}`;

describe('a clean response still parses exactly as before', () => {
  it('reads a bare array', () => {
    expect(parseDraftResponse(`[${q(1)},${q(2)}]`)).toHaveLength(2);
  });

  it('reads a wrapper object', () => {
    expect(parseDraftResponse(`{"questions":[${q(1)}]}`)).toHaveLength(1);
  });

  it('reads through a code fence', () => {
    expect(parseDraftResponse('```json\n[' + q(1) + ']\n```')).toHaveLength(1);
  });

  it('ignores prose the model wrote before the JSON', () => {
    expect(parseDraftResponse(`Here are your questions:\n[${q(1)}]`)).toHaveLength(1);
  });
});

describe('a broken response gives up only the broken part', () => {
  /**
   * THE REGRESSION. A literal newline inside a string is invalid JSON and is exactly what a
   * C snippet produces. Before, this returned nothing at all.
   */
  it('keeps the good questions when one has an unescaped newline', () => {
    const bad = `{"question":"What does this print?","codeSnippet":"int a[5];
printf("%d", a);","options":[{"text":"a","isCorrect":true}],"explanation":"x"}`;
    const out = parseDraftResponse(`[${q(1)},${bad},${q(2)}]`);
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out.map((x: any) => x.question)).toContain('Q1?');
    expect(out.map((x: any) => x.question)).toContain('Q2?');
  });

  it('keeps the good questions when one has a stray number', () => {
    const bad = '{"question":"Bad?","options":[],"explanation":"x" 42}';
    const out = parseDraftResponse(`[${q(1)},${bad},${q(2)}]`);
    expect(out).toHaveLength(2);
  });

  /** Braces inside a code snippet must not end the object early. */
  it('is not confused by braces inside a quoted snippet', () => {
    const withBraces = q(3, ',"codeSnippet":"for (int i=0;i<n;i++) { sum += a[i]; }"');
    const out = parseDraftResponse(`[${q(1)},${withBraces}]`);
    expect(out).toHaveLength(2);
    expect(out[1].codeSnippet).toContain('{ sum += a[i]; }');
  });

  /** Nor must an escaped quote inside a string. */
  it('is not confused by an escaped quote inside a snippet', () => {
    const withQuote = q(4, ',"codeSnippet":"printf(\\"hi\\");"');
    expect(parseDraftResponse(`[${q(1)},${withQuote}]`)).toHaveLength(2);
  });

  /** A reply cut off mid-question keeps everything that completed. */
  it('keeps the complete questions when the reply stops mid-way', () => {
    const out = parseDraftResponse(`[${q(1)},${q(2)},{"question":"Q3?","options":[{"text":"a"`);
    expect(out).toHaveLength(2);
  });
});

describe('when nothing can be salvaged it says something useful', () => {
  /**
   * The old message named a character offset. This one names what came back, so an admin can
   * tell "the model returned prose" from "the model returned nothing" and retry knowingly.
   */
  it('does not report a character offset', () => {
    let msg = '';
    try { parseDraftResponse('I am sorry, I cannot help with that request.'); }
    catch (e: any) { msg = e.message; }
    expect(msg).not.toMatch(/position \d+/);
    expect(msg).toMatch(/could not be read as questions/);
  });

  it('quotes the start of the reply so the cause is visible', () => {
    let msg = '';
    try { parseDraftResponse('I am sorry, I cannot help with that request.'); }
    catch (e: any) { msg = e.message; }
    expect(msg).toContain('I am sorry');
  });

  it('throws rather than returning an empty batch that would read as success', () => {
    expect(() => parseDraftResponse('')).toThrow();
    expect(() => parseDraftResponse('[]')).not.toThrow();   // an empty array IS a valid answer
  });

  it('ignores objects that are not questions at all', () => {
    // A model that answers with {"error":"..."} has returned no questions, and pretending
    // otherwise would store a draft with no question text.
    expect(() => parseDraftResponse('[{"error":"rate limited"}]')).toThrow();
  });
});
