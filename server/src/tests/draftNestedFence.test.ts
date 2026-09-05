/**
 * A fence inside the JSON must not destroy the JSON.
 *
 * THE FOURTH PARSER FAILURE, and the first one that happened before any parsing ran.
 *
 * The preprocessing rewrote the reply in place: strip a markdown fence, then jump to the
 * first brace. The fence regex was non-greedy, so when a model wrapped its JSON in a fence
 * AND put another fence inside a codeSnippet string — which models do constantly when the
 * snippet is code — it captured from the opening fence to the INNER one and returned JSON
 * truncated mid-string. The second step then sliced that fragment to its first brace, which
 * was the opening brace of an `if` block inside the snippet.
 *
 * What the admin saw:
 *
 *   The model's reply could not be read as questions — it began:
 *   "{\n console.log('Greater than 3');\n} else {\n console.log('Not greater than 3');\n}…"
 *
 * That is not the start of any reply. It is the middle of a code sample, and by the time
 * salvage ran there was no JSON left to find. The three earlier fixes were all downstream of
 * this and could not have caught it.
 *
 * The fix is structural: nothing is sliced destructively. Candidates are tried whole, and
 * salvage scans the original text, so a wrong guess costs nothing.
 */

import { parseDraftResponse } from '../services/skillQuestionDraftService';

const q = (n: number) =>
  `{"question":"Q${n}? What is printed?","options":[{"text":"a","isCorrect":true},`
  + `{"text":"b","isCorrect":false}],"explanation":"because"}`;

describe('the reply that actually failed', () => {
  /** A fenced reply whose codeSnippet contains its own fenced block. */
  const nested = [
    '```json',
    '{"questions":[',
    '{"question":"What does this print?","language":"javascript",',
    '"codeSnippet":"```javascript\\nif (x > 3) {\\n  console.log(\'Greater than 3\');\\n} else {\\n  console.log(\'Not greater than 3\');\\n}\\n```",',
    '"options":[{"text":"Greater than 3","isCorrect":true},{"text":"Nothing","isCorrect":false}],',
    '"explanation":"x is 5."}',
    ']}',
    '```',
  ].join('\n');

  it('reads the questions instead of reporting a code fragment', () => {
    const out = parseDraftResponse(nested);
    expect(out).toHaveLength(1);
    expect(out[0].question).toBe('What does this print?');
  });

  it('keeps the snippet intact, fence markers and all', () => {
    const out = parseDraftResponse(nested);
    expect(out[0].codeSnippet).toContain("console.log('Greater than 3')");
  });

  /** The specific symptom: the error must never quote the inside of a snippet. */
  it('never reports a reply as beginning mid-snippet', () => {
    let msg = '';
    try { parseDraftResponse(nested); } catch (e: any) { msg = e.message; }
    expect(msg).toBe('');
  });
});

describe('fences in every arrangement a model produces', () => {
  it('reads a plain fenced reply', () => {
    expect(parseDraftResponse('```json\n{"questions":[' + q(1) + ']}\n```')).toHaveLength(1);
  });

  it('reads a fence with no language tag', () => {
    expect(parseDraftResponse('```\n{"questions":[' + q(1) + ']}\n```')).toHaveLength(1);
  });

  it('reads a reply with no fence at all', () => {
    expect(parseDraftResponse('{"questions":[' + q(1) + ']}')).toHaveLength(1);
  });

  it('reads a fenced reply with prose before it', () => {
    expect(parseDraftResponse('Sure! Here you go:\n```json\n{"questions":[' + q(1) + ']}\n```')).toHaveLength(1);
  });

  it('reads a reply with prose and no fence', () => {
    expect(parseDraftResponse('Here are the questions:\n{"questions":[' + q(1) + ',' + q(2) + ']}')).toHaveLength(2);
  });

  /** Several snippets each carrying their own fence — the pathological case. */
  it('survives several nested fences', () => {
    const many = '```json\n{"questions":['
      + `{"question":"A?","codeSnippet":"\`\`\`js\\nlet a = {x:1};\\n\`\`\`","options":[{"text":"1","isCorrect":true},{"text":"2","isCorrect":false}],"explanation":"e"},`
      + `{"question":"B?","codeSnippet":"\`\`\`js\\nif (b) { c(); }\\n\`\`\`","options":[{"text":"3","isCorrect":true},{"text":"4","isCorrect":false}],"explanation":"e"}`
      + ']}\n```';
    const out = parseDraftResponse(many);
    expect(out).toHaveLength(2);
    expect(out.map((x: any) => x.question)).toEqual(['A?', 'B?']);
  });
});

describe('the earlier fixes still hold', () => {
  it('still salvages a wrapper with one malformed question', () => {
    const broken = `{"question":"Bad?","codeSnippet":"if (x) {
  y();
}","options":[{"text":"a","isCorrect":true}],"explanation":"e"}`;
    const out = parseDraftResponse(`{"questions":[${q(1)},${broken},${q(2)}]}`);
    expect(out.length).toBeGreaterThanOrEqual(2);
  });

  it('still refuses prose, with a message naming what came back', () => {
    expect(() => parseDraftResponse('I cannot help with that.'))
      .toThrow(/could not be read as questions/);
  });

  it('still refuses well-formed JSON that holds no questions', () => {
    expect(() => parseDraftResponse('{"questions":[{"error":"rate limited"}]}')).toThrow();
  });

  it('still treats an empty array as a real answer', () => {
    expect(parseDraftResponse('{"questions":[]}')).toEqual([]);
  });
});
