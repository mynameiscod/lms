/**
 * Notes reach the student as formatted, safe HTML whether the author wrote Markdown or used the rich-text box.
 */

import { notesHtml, markdownToHtml, sanitizeHtml, looksLikeHtml } from './notesHtml';

const dom = (html: string) => {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
};

describe('notesHtml — Markdown, as the curriculum is written', () => {
  it('renders headings, paragraphs, emphasis and inline code', () => {
    const el = dom(notesHtml('## Loops\n\nA **loop** repeats *work*.\nIt uses `for`.'));
    expect(el.querySelector('h2')?.textContent).toBe('Loops');
    expect(el.querySelector('strong')?.textContent).toBe('loop');
    expect(el.querySelector('em')?.textContent).toBe('work');
    expect(el.querySelector('code')?.textContent).toBe('for');
    expect(el.querySelectorAll('p')).toHaveLength(1);
    expect(el.textContent).not.toMatch(/\*\*|`/);
  });

  it('renders bulleted and numbered lists with wrapped lines and blank lines between items', () => {
    const el = dom(notesHtml('- **One.** first\n  continues here\n- Two\n\n1. a\n\n2. b\n3. c'));
    expect(el.querySelectorAll('ul > li')).toHaveLength(2);
    expect(el.querySelector('ul > li')?.textContent).toBe('One. first continues here');
    expect(el.querySelectorAll('ol > li')).toHaveLength(3);
  });

  it('nests a list inside an item', () => {
    const el = dom(notesHtml('- outer\n  - inner a\n  - inner b\n- next'));
    expect(el.querySelectorAll('ul > li > ul > li')).toHaveLength(2);
    expect(el.querySelectorAll(':scope > ul > li')).toHaveLength(2);
  });

  it('keeps indented and fenced code line by line, escaped', () => {
    const el = dom(notesHtml('Type:\n\n    <p>Hello.</p>\n    <p>Bye.</p>\n\n```\nif (a < b) {\n  go();\n}\n```'));
    const pres = el.querySelectorAll('pre > code');
    expect(pres).toHaveLength(2);
    expect(pres[0].textContent).toBe('<p>Hello.</p>\n<p>Bye.</p>');
    expect(pres[1].textContent).toBe('if (a < b) {\n  go();\n}');
    expect(el.querySelectorAll('p')).toHaveLength(1);
  });

  it('renders a table', () => {
    const el = dom(notesHtml('| Shape | Means |\n|---|---|\n| Diamond | A decision |\n| Arrow | Flow |'));
    expect(Array.from(el.querySelectorAll('th')).map(t => t.textContent)).toEqual(['Shape', 'Means']);
    expect(el.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('renders rules, quotes and safe links, and drops unsafe ones', () => {
    const el = dom(notesHtml('> quoted\n\n---\n\n[docs](https://developer.mozilla.org) and [bad](javascript:alert(1))'));
    expect(el.querySelector('blockquote p')?.textContent).toBe('quoted');
    expect(el.querySelector('hr')).not.toBeNull();
    const links = el.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('https://developer.mozilla.org');
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('never turns text into markup', () => {
    const el = dom(notesHtml('Headings run `<h1>` to `<h6>`. <script>alert(1)</script> <img src=x onerror=alert(1)>'));
    expect(el.querySelector('script, img, h1')).toBeNull();
    expect(el.textContent).toContain('<script>alert(1)</script>');
  });

  it('does not read snake_case or multiplication as emphasis', () => {
    const el = dom(markdownToHtml('Use snake_case_name and 2 * 3 * 4.'));
    expect(el.querySelector('em')).toBeNull();
  });
});

describe('notesHtml — HTML from the rich-text editor', () => {
  it('is recognised by its opening tag, so a Markdown note quoting a tag is not', () => {
    expect(looksLikeHtml('<p>Hello</p>')).toBe(true);
    expect(looksLikeHtml('**Goal**\n\n    <p>Hello.</p>')).toBe(false);
  });

  it('keeps formatting and editor classes', () => {
    const el = dom(notesHtml('<h2>Title</h2><p class="ql-align-center">x <strong>y</strong></p><pre class="ql-syntax" spellcheck="false">a\nb</pre><ol><li class="ql-indent-1">i</li></ol>'));
    expect(el.querySelector('h2')?.textContent).toBe('Title');
    expect(el.querySelector('p')?.getAttribute('class')).toBe('ql-align-center');
    expect(el.querySelector('pre')?.textContent).toBe('a\nb');
    expect(el.querySelector('li')?.getAttribute('class')).toBe('ql-indent-1');
  });

  it('removes script, handlers, frames, forms, styles and unsafe URLs', () => {
    const html = sanitizeHtml([
      '<p onclick="alert(1)" style="background:url(javascript:alert(1))" class="evil ql-x">ok</p>',
      '<script>alert(1)</script><style>p{}</style>',
      '<iframe src="https://evil.example"></iframe><object data="x"></object><embed src="x">',
      '<form action="https://evil.example"><input name="p"></form>',
      '<a href="javascript:alert(1)">a</a><a href=" jav&#x09;ascript:alert(1)">b</a><a href="//evil.example">c</a>',
      '<img src="x" onerror="alert(1)"><img src="https://example.com/a.png" onload="alert(1)">',
      '<svg onload="alert(1)"><circle/></svg><math><mi>x</mi></math>',
      '<custom-el data-x="1">kept text</custom-el>',
    ].join(''));
    const el = dom(html);
    expect(el.querySelector('script, style, iframe, object, embed, form, input, svg, math, custom-el')).toBeNull();
    expect(html).not.toMatch(/on(click|error|load)=|javascript:|style=/i);
    expect(el.querySelector('p')?.getAttribute('class')).toBe('ql-x');
    expect(Array.from(el.querySelectorAll('a')).map(a => a.getAttribute('href'))).toEqual([null, null, null]);
    expect(Array.from(el.querySelectorAll('img')).map(i => i.getAttribute('src'))).toEqual(['https://example.com/a.png']);
    expect(el.textContent).toContain('kept text');
  });

  it('returns nothing for an empty note', () => {
    expect(notesHtml('')).toBe('');
    expect(notesHtml(undefined)).toBe('');
  });
});

describe('notesHtml — shapes found in the stored curriculum', () => {
  it('reads bold that contains an asterisk', () => {
    const el = dom(notesHtml('**COUNT(*) after a LEFT JOIN.** Meera gets 1.'));
    expect(el.querySelector('strong')?.textContent).toBe('COUNT(*) after a LEFT JOIN.');
  });

  it('ends a numbered list at a four-space code example that follows it', () => {
    const el = dom(notesHtml('1. What am I building?\n2. When does it change?\n\n    count = 0\n    for w in words:\n        count = count + 1\n\nCheck by hand.'));
    expect(el.querySelectorAll('ol > li')).toHaveLength(2);
    expect(el.querySelector(':scope > pre > code')?.textContent).toBe('count = 0\nfor w in words:\n    count = count + 1');
    expect(el.querySelector(':scope > p')?.textContent).toBe('Check by hand.');
  });

  it('still keeps a paragraph that continues a bullet after a blank line', () => {
    const el = dom(notesHtml('- first\n\n  more about first\n- second'));
    expect(el.querySelectorAll('ul > li')).toHaveLength(2);
    expect(el.querySelector('li')?.textContent).toBe('firstmore about first');
  });
});

describe('notesHtml — layout on a phone', () => {
  it('wraps every table in its own scrolling box', () => {
    const el = dom(notesHtml('| a | b |\n|---|---|\n| 1 | 2 |'));
    expect(el.querySelector('div.cp-table > table')).not.toBeNull();
    const html = dom(notesHtml('<p>x</p><table><tr><td>1</td></tr></table>'));
    expect(html.querySelector('div.cp-table > table')).not.toBeNull();
  });
});
