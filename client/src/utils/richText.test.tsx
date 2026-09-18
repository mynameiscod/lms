/**
 * The authored-content boundary.
 *
 * Question prompts and exam instructions are written in an admin rich-text editor and read by
 * every candidate sitting the exam. If that HTML ever reached the DOM as markup, the admin form
 * would be an XSS surface pointed at the whole cohort — so these tests pin BOTH halves of the
 * contract: the formatting an author needs survives, and nothing else does.
 *
 * The negative cases matter more than the positive ones. A regression here is silent.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RichText, plainText } from './richText';

const html = (src: string): string => {
  const { container } = render(<RichText html={src} />);
  return (container.firstChild as HTMLElement | null)?.innerHTML ?? '';
};

describe('formatting an author actually uses survives', () => {
  it('keeps bold, italic and inline code', () => {
    const out = html('<p>Return <b>true</b> when <i>n</i> is <code>0</code>.</p>');
    expect(out).toContain('<strong>true</strong>');
    expect(out).toContain('<em>n</em>');
    expect(out).toContain('<code>0</code>');
  });

  it('normalises b and i to strong and em rather than dropping them', () => {
    expect(html('<b>x</b>')).toContain('<strong>x</strong>');
    expect(html('<i>x</i>')).toContain('<em>x</em>');
  });

  it('keeps a code block, which is the point of one', () => {
    expect(html('<pre>for i in range(3):\n    print(i)</pre>')).toContain('<pre>');
  });

  it('keeps ordered and unordered lists with their items', () => {
    const ul = html('<ul><li>one</li><li>two</li></ul>');
    expect(ul).toContain('<ul>');
    expect(ul.match(/<li>/g)).toHaveLength(2);
    expect(html('<ol><li>first</li></ol>')).toContain('<ol>');
  });

  it('decodes entities so the candidate reads the character, not the escape', () => {
    expect(html('<p>a &lt; b &amp;&amp; c &gt; d</p>')).toContain('a &lt; b &amp;&amp; c &gt; d');
  });

  it('levels an authored heading down so it cannot outrank the page', () => {
    const out = html('<h1>Constraints</h1>');
    expect(out).toContain('<h4>Constraints</h4>');
    expect(out).not.toContain('<h1>');
  });
});

describe('nothing authored can become script, markup or an attribute', () => {
  it('drops a script tag and does not execute or emit it', () => {
    const out = html('<p>hi</p><script>window.__pwned = 1;</script>');
    expect(out).not.toContain('<script');
    expect((window as any).__pwned).toBeUndefined();
  });

  it('drops an img with an onerror handler entirely', () => {
    const out = html('<img src="x" onerror="window.__pwned=1">');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('onerror');
  });

  it('strips href from a link, so javascript: cannot be reached', () => {
    const out = html('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('href');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('click');   // the text is kept; only the link is gone
  });

  /** Attributes are discarded at tokenise time, so this holds for tags that ARE allowed too. */
  it('discards attributes even on an allowed tag', () => {
    const out = html('<p style="position:fixed;top:0" onclick="window.__pwned=1" class="evil">x</p>');
    expect(out).toBe('<p>x</p>');
  });

  it('keeps an iframe out', () => {
    expect(html('<iframe src="https://evil.test"></iframe>')).not.toContain('iframe');
  });

  it('renders an escaped tag as visible text rather than an element', () => {
    const out = html('<p>Write &lt;div&gt; to open a block.</p>');
    expect(out).toContain('&lt;div&gt;');
    expect(out).not.toContain('<div>');
  });
});

describe('content the editor never produced still renders', () => {
  it('shows plain text typed before the editor existed, keeping paragraphs', () => {
    const { container } = render(<RichText html={'line one\n\nline two'} />);
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('turns a single newline into a break, not a lost line', () => {
    const { container } = render(<RichText html={'a\nb'} />);
    expect(container.querySelectorAll('br')).toHaveLength(1);
  });

  it('does not lose the tail of unbalanced markup', () => {
    expect(html('<b>start and then the rest of the sentence')).toContain('start and then the rest');
  });

  it('renders nothing at all for empty or missing input', () => {
    expect(render(<RichText html="" />).container.firstChild).toBeNull();
    expect(render(<RichText html={null} />).container.firstChild).toBeNull();
    expect(render(<RichText html={undefined} />).container.firstChild).toBeNull();
  });

  it('puts the className on the wrapper so the page can style it', () => {
    const { container } = render(<RichText html="<p>x</p>" className="hx-prompt" />);
    expect((container.firstChild as HTMLElement).className).toBe('hx-prompt');
  });
});

describe('plainText, for tables and lists', () => {
  it('reduces markup to one readable line', () => {
    expect(plainText('<p>Sum <code>a</code> and <b>b</b>.</p>')).toBe('Sum a and b.');
  });

  it('truncates to the asked-for length with an ellipsis', () => {
    expect(plainText('<p>abcdefghij</p>', 4)).toBe('abcd…');
  });

  /** A tag became a space, so the sentence must not end " ." in an admin table. */
  it('does not leave a gap before punctuation a tag was standing next to', () => {
    expect(plainText('<p>Is it <code>O(n)</code>, or <b>O(n log n)</b>?</p>')).toBe('Is it O(n), or O(n log n)?');
  });

  it('leaves a short string alone', () => {
    expect(plainText('<p>abc</p>', 40)).toBe('abc');
  });

  it('is safe on empty input', () => {
    expect(plainText(undefined)).toBe('');
    expect(plainText(null)).toBe('');
  });
});
