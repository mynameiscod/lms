import React from 'react';

/**
 * Authored rich text, rendered with its formatting and without its risk.
 *
 * ── THE PROBLEM THIS SOLVES, AND WHY THE OBVIOUS ANSWERS ARE BOTH WRONG ───────────────────
 *
 * Questions and instructions are written in an admin rich-text editor, so they arrive as HTML.
 * There are two usual responses and each fails:
 *
 *   Render it as text, and the candidate reads `<p>Given an array <code>arr</code>…</p>` —
 *   angle brackets and all.
 *
 *   Render it with dangerouslySetInnerHTML, and the admin form becomes an XSS surface pointed
 *   at every candidate sitting the exam. "Only staff can author" is not a defence: staff
 *   accounts get phished, and a question bank is shared.
 *
 * lessonText.ts already chose a third way for the Passport notes — READ the markup, keep the
 * structure, throw away the tags. This does the same thing but keeps the inline formatting a
 * question actually needs, because "return `n`" and "return n" are different instructions and
 * a stripped one is a worse question.
 *
 * ── HOW IT IS SAFE ────────────────────────────────────────────────────────────────────────
 *
 * Nothing authored is ever handed to the DOM as markup. The input is parsed into a small
 * ALLOW-LIST of React elements, and every piece of text becomes a React child, which React
 * escapes exactly as it always does. A tag outside the list is dropped and its text is kept;
 * an attribute — including href, onerror, style — never survives at all. There is no path by
 * which authored input becomes an element this file does not name.
 */

/** The only elements authored content may become. Attributes are never carried across. */
const INLINE = new Set(['b', 'strong', 'i', 'em', 'u', 'code', 's', 'sub', 'sup']);
const BLOCK = new Set(['p', 'div', 'li', 'ul', 'ol', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br']);

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&apos;': "'", '&nbsp;': ' ', '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
};
const decode = (s: string): string =>
  s.replace(/&(?:#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m) => {
    const lower = m.toLowerCase();
    if (ENTITIES[lower]) return ENTITIES[lower];
    const dec = /^&#(\d+);$/.exec(m);
    if (dec) return String.fromCodePoint(Number(dec[1]));
    const hex = /^&#x([0-9a-f]+);$/i.exec(m);
    if (hex) return String.fromCodePoint(parseInt(hex[1], 16));
    return m;
  });

interface Token { kind: 'text' | 'open' | 'close'; name?: string; text?: string }

/**
 * Split into text and tag names. Attributes are discarded HERE, at the door, rather than
 * filtered later — a filter is a list of what to remove and is therefore always incomplete.
 */
function tokenise(src: string): Token[] {
  const out: Token[] = [];
  const re = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ kind: 'text', text: src.slice(last, m.index) });
    out.push({ kind: m[1] ? 'close' : 'open', name: m[2].toLowerCase() });
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ kind: 'text', text: src.slice(last) });
  return out;
}

/** Build React children for one run of inline content. */
function inlineNodes(tokens: Token[], start: number, stopAt: Set<string>): { nodes: React.ReactNode[]; next: number } {
  const nodes: React.ReactNode[] = [];
  let i = start;
  let key = 0;

  while (i < tokens.length) {
    const t = tokens[i];

    if (t.kind === 'close' && stopAt.has(t.name!)) break;

    if (t.kind === 'text') {
      const text = decode(t.text || '');
      if (text) nodes.push(<React.Fragment key={key++}>{text}</React.Fragment>);
      i++;
      continue;
    }

    if (t.kind === 'open' && t.name === 'br') { nodes.push(<br key={key++} />); i++; continue; }

    if (t.kind === 'open' && INLINE.has(t.name!)) {
      const tag = t.name!;
      const inner = inlineNodes(tokens, i + 1, new Set([tag]));
      const Tag = (tag === 'b' ? 'strong' : tag === 'i' ? 'em' : tag) as keyof JSX.IntrinsicElements;
      nodes.push(<Tag key={key++}>{inner.nodes}</Tag>);
      i = inner.next;
      /* Skip the matching close if it is there; unbalanced markup must not lose the rest. */
      if (tokens[i]?.kind === 'close' && tokens[i]?.name === tag) i++;
      continue;
    }

    /* Anything else — a stray tag, an unknown element, a block starting mid-line — ends the run. */
    if (t.kind === 'open' && BLOCK.has(t.name!)) break;

    i++;   // unknown tag: dropped, its text kept by the loop
  }

  return { nodes, next: i };
}

/**
 * Render authored HTML (or plain text) as React.
 *
 * Plain text with blank lines is handled too, so a question typed into a textarea before this
 * editor existed reads the same as one pasted from the editor.
 */
export function RichText({ html, className }: { html?: string | null; className?: string }): JSX.Element | null {
  const src = String(html || '').trim();
  if (!src) return null;

  /* No markup: honour blank lines and single newlines, which is what a textarea gives. */
  if (!/<[a-z/][^>]*>/i.test(src)) {
    return (
      <div className={className}>
        {src.split(/\n{2,}/).map((para, i) => (
          <p key={i}>
            {para.split('\n').map((line, j, all) => (
              <React.Fragment key={j}>{decode(line)}{j < all.length - 1 && <br />}</React.Fragment>
            ))}
          </p>
        ))}
      </div>
    );
  }

  const tokens = tokenise(src);
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  let listItems: React.ReactNode[] | null = null;
  let listTag: 'ul' | 'ol' = 'ul';

  const flushList = () => {
    if (listItems && listItems.length) {
      const L = listTag;
      out.push(<L key={key++}>{listItems}</L>);
    }
    listItems = null;
  };

  while (i < tokens.length) {
    const t = tokens[i];

    if (t.kind === 'open' && (t.name === 'ul' || t.name === 'ol')) {
      flushList();
      listTag = t.name as 'ul' | 'ol';
      listItems = [];
      i++;
      continue;
    }
    if (t.kind === 'close' && (t.name === 'ul' || t.name === 'ol')) { flushList(); i++; continue; }

    if (t.kind === 'open' && t.name === 'li') {
      const r = inlineNodes(tokens, i + 1, new Set(['li', 'ul', 'ol']));
      (listItems ||= []).push(<li key={key++}>{r.nodes}</li>);
      i = r.next;
      if (tokens[i]?.kind === 'close' && tokens[i]?.name === 'li') i++;
      continue;
    }

    /* A code block keeps its whitespace, which is the entire point of one. */
    if (t.kind === 'open' && t.name === 'pre') {
      flushList();
      const r = inlineNodes(tokens, i + 1, new Set(['pre']));
      out.push(<pre key={key++}>{r.nodes}</pre>);
      i = r.next;
      if (tokens[i]?.kind === 'close' && tokens[i]?.name === 'pre') i++;
      continue;
    }

    if (t.kind === 'open' && /^h[1-6]$/.test(t.name || '')) {
      flushList();
      const tag = t.name as 'h3';
      const r = inlineNodes(tokens, i + 1, new Set([tag]));
      /* Headings are levelled down: an authored h1 inside a question must not outrank the page. */
      out.push(<h4 key={key++}>{r.nodes}</h4>);
      i = r.next;
      if (tokens[i]?.kind === 'close' && tokens[i]?.name === tag) i++;
      continue;
    }

    if (t.kind === 'open' && (t.name === 'p' || t.name === 'div' || t.name === 'blockquote')) {
      flushList();
      const tag = t.name!;
      const r = inlineNodes(tokens, i + 1, new Set([tag]));
      if (r.nodes.length) out.push(<p key={key++}>{r.nodes}</p>);
      i = r.next;
      if (tokens[i]?.kind === 'close' && tokens[i]?.name === tag) i++;
      continue;
    }

    if (t.kind === 'close') { i++; continue; }

    /* Loose inline content outside any block still has to be shown. */
    const r = inlineNodes(tokens, i, new Set());
    if (r.nodes.length) out.push(<p key={key++}>{r.nodes}</p>);
    i = r.next > i ? r.next : i + 1;
  }

  flushList();
  return <div className={className}>{out}</div>;
}

/**
 * A one-line summary for tables and lists — formatting removed, text kept.
 *
 * Tags become a space rather than nothing, so `a<b>b</b>` does not read as one word. The cost
 * is a space before the punctuation that followed a tag, which is tidied back up here: an admin
 * scanning a list of questions should not see "Sum a and b ." where the author wrote a sentence.
 */
export function plainText(html?: string | null, max = 0): string {
  const s = decode(String(html || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .replace(/ ([.,;:!?)\]}])/g, '$1')
    .replace(/([([{]) /g, '$1')
    .trim();
  return max > 0 && s.length > max ? `${s.slice(0, max)}…` : s;
}
