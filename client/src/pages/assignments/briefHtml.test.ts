import { briefHtml } from './briefHtml';

describe('an assignment brief as HTML', () => {
  const brief = [
    '**What the program must do**',
    '',
    'The starter reads a whole number `n` (it is always 1 or more). Print:',
    '',
    '1. every whole number from 1 up to and including `n`, one per line',
    '2. then one final line: `Sum: ` followed by the total',
    '',
    'For input `3` it prints:',
    '',
    '    1',
    '    2',
    '    Sum: 3',
    '',
    '**Rules**',
    '',
    '- Use a loop for both jobs. Do not use `sum()` or a formula — the point',
    '  is the accumulator.',
    '- Check the end of your range.',
  ].join('\n');

  it('renders the Markdown the Foundation briefs are written in', () => {
    const html = briefHtml(brief);
    expect(html).toContain('<p><strong>What the program must do</strong></p>');
    expect(html).toContain('<ol><li>every whole number from 1 up to and including <code>n</code>, one per line</li><li>then one final line: <code>Sum: </code> followed by the total</li></ol>');
    expect(html).toContain('<pre><code>1\n2\nSum: 3</code></pre>');
    expect(html).toContain('<ul><li>Use a loop for both jobs. Do not use <code>sum()</code> or a formula — the point is the accumulator.</li><li>Check the end of your range.</li></ul>');
    expect(html).not.toContain('**');
  });

  it('never lets a Markdown brief inject markup', () => {
    const html = briefHtml('Try `<img src=x onerror=alert(1)>` and **<script>x</script>**');
    expect(html).not.toMatch(/<img|<script/);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('leaves a brief written as HTML, and an empty one, as they are', () => {
    expect(briefHtml('<p>Write <strong>one</strong> function.</p>')).toBe('<p>Write <strong>one</strong> function.</p>');
    expect(briefHtml('')).toBe('');
    expect(briefHtml(undefined)).toBe('');
  });
});
