/**
 * Salvage has to work on the shape the model is actually asked for.
 *
 * The prompt ends: 'Reply with JSON only. Shape: {"questions":[{...}]}' — a WRAPPER object
 * with every question nested inside it. The first salvage attempt collected only top-level
 * objects, so a wrapper was one object: either it parsed whole or nothing was recovered. A
 * wrapper containing a single malformed question does not parse, so the answer was nothing —
 * the exact failure salvage exists to prevent, reintroduced one level down.
 *
 * It passed its own tests because those used bare arrays, where questions happen to sit at
 * the top level. This file uses the shape the prompt asks for, and the reply that actually
 * failed in production began exactly this way:
 *
 *   {"questions":[{"question":"What will happen if `score` is 50 in the following code?",
 *    "codeSnippet":"if (score >= 60) {\n…
 */

import { parseDraftResponse } from '../services/skillQuestionDraftService';

const q = (n: number, extra = '') =>
  `{"question":"Q${n}? What is printed?","codeSnippet":"if (x >= 60) { print(1); }",`
  + `"options":[{"text":"a","isCorrect":true},{"text":"b","isCorrect":false}],`
  + `"explanation":"because"${extra}}`;

/** Invalid JSON in the way a code question actually breaks: a raw newline inside a string. */
const brokenQ = `{"question":"What does this print?","codeSnippet":"if (score >= 60) {
  printf("pass");
}","options":[{"text":"pass","isCorrect":true}],"explanation":"x"}`;

describe('a wrapper object is read, not treated as one lump', () => {
  it('reads a clean wrapper', () => {
    const out = parseDraftResponse(`{"questions":[${q(1)},${q(2)},${q(3)}]}`);
    expect(out).toHaveLength(3);
  });

  /** THE REGRESSION. One bad question inside the wrapper used to cost all of them. */
  it('keeps the good questions when one inside the wrapper is malformed', () => {
    const out = parseDraftResponse(`{"questions":[${q(1)},${brokenQ},${q(2)},${q(3)}]}`);
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out.map((x: any) => x.question)).toEqual(
      expect.arrayContaining(['Q1? What is printed?', 'Q2? What is printed?', 'Q3? What is printed?']),
    );
  });

  it('keeps them when the FIRST question in the wrapper is the broken one', () => {
    const out = parseDraftResponse(`{"questions":[${brokenQ},${q(1)},${q(2)}]}`);
    expect(out).toHaveLength(2);
  });

  it('keeps them when the wrapper itself is never closed', () => {
    const out = parseDraftResponse(`{"questions":[${q(1)},${q(2)}`);
    expect(out).toHaveLength(2);
  });

  it('reads a wrapper inside a code fence', () => {
    const out = parseDraftResponse('```json\n{"questions":[' + q(1) + ',' + brokenQ + ']}\n```');
    expect(out).toHaveLength(1);
  });
});

describe('nothing is counted twice', () => {
  /**
   * Objects are collected at every depth, so a question is seen once on its own and again
   * inside the wrapper that contains it. Storing it twice would look like the model repeated
   * itself, and the duplicate check would then reject the second copy as a duplicate of the
   * first — a self-inflicted rejection.
   */
  it('returns each question once from a wrapper that parses whole', () => {
    const out = parseDraftResponse(`{"questions":[${q(1)},${q(2)}]}`);
    expect(out.map((x: any) => x.question)).toEqual(['Q1? What is printed?', 'Q2? What is printed?']);
  });

  it('returns each question once when salvaging', () => {
    const out = parseDraftResponse(`{"questions":[${q(1)},${brokenQ},${q(1)}]}`);
    // The same stem twice in the reply is the model repeating itself, and one copy is enough.
    expect(out).toHaveLength(1);
  });
});

describe('nested objects that are not questions are ignored', () => {
  /**
   * Options and rationales are objects too, and are collected by the same scan. They carry no
   * `question`, which is what keeps them out — no special case needed.
   */
  it('does not mistake an option for a question', () => {
    const out = parseDraftResponse(`{"questions":[${q(1)}]}`);
    expect(out).toHaveLength(1);
    expect(out[0].options).toHaveLength(2);
  });

  it('still refuses a wrapper that contains no questions at all', () => {
    expect(() => parseDraftResponse('{"questions":[{"error":"rate limited"}]}')).toThrow();
  });

  it('still refuses prose', () => {
    expect(() => parseDraftResponse('I cannot help with that.')).toThrow(/could not be read as questions/);
  });
});
