/**
 * Notes as safe HTML, whichever way they were written.
 *
 * Notes reach a student in two shapes. The Content Library editor writes HTML (its rich-text box), and the
 * Foundation curriculum's notes and worked examples are Markdown. The student viewer used to inject both as
 * HTML, so every Markdown note showed its asterisks and pipes, its lists collapsed into one paragraph and its
 * code examples lost their line breaks — and an HTML note was trusted as written, script and all.
 *
 * Both now go through one path:
 *  - Markdown is escaped FIRST and only then given tags, so text in a note can never become markup. `<p>` in
 *    a lesson about HTML is shown as `<p>`.
 *  - Everything, including the HTML the editor wrote, then passes an allowlist: formatting tags stay, anything
 *    that can run, load or submit is removed, and links may only go to web, mail or same-site addresses.
 *
 * The Markdown understood is the subset the curriculum is written in: headings, paragraphs, bold, italic,
 * inline and indented/fenced code, bulleted and numbered lists (nested, with wrapped lines), tables,
 * blockquotes, rules and links.
 */

/** An editor note starts with a block tag; a Markdown note never starts with `<`. */
const HTML_START = /^\s*<(p|div|h[1-6]|ul|ol|li|pre|blockquote|table|br|span|strong|em|b|i|u|a|img|hr|section|article)\b/i;

export const looksLikeHtml = (text: string) => HTML_START.test(text);

const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const SAFE_HREF = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i;

/* ------------------------------------------------------------------ *
 * Inline
 * ------------------------------------------------------------------ */

function inline(raw: string): string {
  const held: string[] = [];
  // Private-use characters mark held fragments; authored text never contains them in practice.
  const hold = (html: string) => `\uE000${held.push(html) - 1}\uE001`;

  // Code first, so nothing inside backticks is read as emphasis or a link.
  let s = raw.replace(/`([^`]+)`/g, (_m, code) => hold(`<code>${escapeHtml(code)}</code>`));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, href) => (SAFE_HREF.test(href)
    ? hold(`<a href="${escapeHtml(href)}">${inlineText(text)}</a>`)
    : m));
  s = inlineText(s);
  return s.replace(/\uE000(\d+)\uE001/g, (_m, n) => held[Number(n)]);
}

function inlineText(raw: string): string {
  return escapeHtml(raw)
    .replace(/\*\*(?=\S)([^\n]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w])__([^_\n]+?)__(?!\w)/g, '$1<strong>$2</strong>')
    .replace(/(^|[^*\w])\*([^*\s](?:[^*\n]*?[^*\s])?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_([^_\s](?:[^_\n]*?[^_\s])?)_(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
}

/* ------------------------------------------------------------------ *
 * Blocks
 * ------------------------------------------------------------------ */

const FENCE = /^\s{0,3}(```|~~~)/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^\s{0,3}>\s?/;
const LIST = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const isIndentedCode = (l: string) => /^( {4}|\t)/.test(l);
const indentOf = (l: string) => (l.match(/^\s*/) as RegExpMatchArray)[0].replace(/\t/g, '    ').length;
const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);

function startsBlock(l: string): boolean {
  return FENCE.test(l) || HEADING.test(l) || RULE.test(l) || QUOTE.test(l) || LIST.test(l) || isTableRow(l);
}

/** The next line with text on it, or '' at the end. */
const nextText = (lines: string[], from: number) => lines.slice(from).find(l => l.trim()) || '';

const cells = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

function blocks(lines: string[]): string {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (FENCE.test(line)) {
      const marker = (line.match(FENCE) as RegExpMatchArray)[1];
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) body.push(lines[i++]);
      i++;
      out.push(`<pre><code>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    if (isIndentedCode(line)) {
      const body: string[] = [];
      while (i < lines.length && (isIndentedCode(lines[i]) || (!lines[i].trim() && isIndentedCode(nextText(lines, i))))) {
        body.push(lines[i].replace(/^( {4}|\t)/, ''));
        i++;
      }
      out.push(`<pre><code>${escapeHtml(body.join('\n').replace(/\n+$/, ''))}</code></pre>`);
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const n = heading[1].length;
      out.push(`<h${n}>${inline(heading[2])}</h${n}>`);
      i++;
      continue;
    }

    // Before lists: `* * *` is a rule, not a bullet.
    if (RULE.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && lines[i].trim() && (QUOTE.test(lines[i]) || body.length)) {
        body.push(lines[i].replace(QUOTE, ''));
        i++;
      }
      out.push(`<blockquote>${blocks(body)}</blockquote>`);
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      out.push(
        `<table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead>`
        + `<tbody>${rows.map(r => `<tr>${head.map((_h, k) => `<td>${inline(r[k] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
      );
      continue;
    }

    if (LIST.test(line)) {
      i = list(lines, i, out);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !(para.length && startsBlock(lines[i]))) {
      para.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('');
}

function list(lines: string[], start: number, out: string[]): number {
  const first = lines[start].match(LIST) as RegExpMatchArray;
  const base = indentOf(first[1]);
  const ordered = /\d/.test(first[2]);
  const startNumber = ordered ? parseInt(first[2], 10) : 1;
  const items: string[] = [];
  let i = start;

  while (i < lines.length) {
    const m = lines[i].match(LIST);
    if (!m || indentOf(m[1]) !== base || /\d/.test(m[2]) !== ordered) break;
    const contentIndent = base + m[2].length + Math.min(m[3].length, 4);
    const body: string[] = [m[4]];
    i++;
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) {
        const next = nextText(lines, i);
        // After a blank line, a four-space block that does not reach the item's own code depth is the note's next
        // example, not more of this item: authors indent code by four spaces whatever list sits above it.
        const codeAfterList = !LIST.test(next) && indentOf(next) >= base + 4 && indentOf(next) < contentIndent + 4;
        if (next && indentOf(next) > base && !codeAfterList) {
          body.push('');
          i++;
          continue;
        }
        break;
      }
      if (indentOf(l) > base) {
        body.push(l.replace(new RegExp(`^ {0,${contentIndent}}`), ''));
        i++;
        continue;
      }
      // A wrapped line the author did not indent still belongs to the item it continues.
      if (body[body.length - 1].trim() && !startsBlock(l)) {
        body.push(l.trim());
        i++;
        continue;
      }
      break;
    }
    const para: string[] = [];
    let k = 0;
    while (k < body.length && body[k].trim() && !(k > 0 && (startsBlock(body[k]) || isIndentedCode(body[k])))) para.push(body[k++].trim());
    items.push(`<li>${inline(para.join(' '))}${blocks(body.slice(k))}</li>`);

    // Items separated by blank lines are still one list.
    let j = i;
    while (j < lines.length && !lines[j].trim()) j++;
    const after = j < lines.length ? lines[j].match(LIST) : null;
    if (j > i && after && indentOf(after[1]) === base && /\d/.test(after[2]) === ordered) i = j;
  }

  const tag = ordered ? 'ol' : 'ul';
  const startAttr = ordered && startNumber !== 1 ? ` start="${startNumber}"` : '';
  out.push(`<${tag}${startAttr}>${items.join('')}</${tag}>`);
  return i;
}

export function markdownToHtml(text: string): string {
  return blocks(String(text || '').replace(/\r\n?/g, '\n').split('\n'));
}

/* ------------------------------------------------------------------ *
 * Allowlist
 * ------------------------------------------------------------------ */

const ALLOWED: Record<string, string[]> = {
  p: [], br: [], hr: [], div: [], span: [],
  h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
  strong: [], b: [], em: [], i: [], u: [], s: [], del: [], sub: [], sup: [], mark: [], small: [],
  code: [], pre: ['spellcheck'], blockquote: [], kbd: [],
  ul: [], ol: ['start'], li: ['data-list'],
  a: ['href', 'title'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  table: [], thead: [], tbody: [], tfoot: [], tr: [], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'],
};

/** Removed with everything inside them: they run, load, embed or submit. */
const DROPPED = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'link', 'meta', 'base',
  'form', 'input', 'button', 'textarea', 'select', 'option', 'svg', 'math', 'template', 'noscript',
  'audio', 'video', 'source', 'track', 'canvas', 'portal', 'head', 'title',
]);

const SAFE_IMG = /^(https:\/\/|http:\/\/|data:image\/(png|gif|jpe?g|webp);base64,)/i;
const QUILL_CLASS = /^ql-[a-z0-9-]+$/;

function cleanChildren(parent: Node, doc: Document) {
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === 3) continue;
    if (child.nodeType !== 1) { parent.removeChild(child); continue; }
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    if (DROPPED.has(tag)) { parent.removeChild(el); continue; }
    cleanChildren(el, doc);
    const allowed = ALLOWED[tag];
    if (!allowed) {
      // An unknown wrapper keeps its (already cleaned) text, not itself.
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name === 'class') {
        const kept = attr.value.split(/\s+/).filter(c => QUILL_CLASS.test(c));
        if (kept.length) el.setAttribute('class', kept.join(' ')); else el.removeAttribute('class');
        continue;
      }
      if (!allowed.includes(name)) { el.removeAttribute(attr.name); continue; }
      // Browsers ignore whitespace and control characters inside a scheme, so they are ignored here too.
      // eslint-disable-next-line no-control-regex -- stripping control characters is the point
      const value = attr.value.replace(/[\u0000-\u0020\u007f-\u009f]/g, '');
      if (name === 'href' && !SAFE_HREF.test(value)) el.removeAttribute(attr.name);
      if (name === 'src' && !SAFE_IMG.test(value)) el.removeAttribute(attr.name);
    }
    if (tag === 'img' && !el.getAttribute('src')) { parent.removeChild(el); continue; }
    if (tag === 'a' && /^https?:/i.test(el.getAttribute('href') || '')) {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }
}

export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return escapeHtml(html);
  // A parsed document is inert: nothing in it runs or loads while it is being cleaned.
  const doc = new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');
  cleanChildren(doc.body, doc);
  // A table wider than a phone scrolls inside its own box instead of widening the page.
  for (const table of Array.from(doc.body.querySelectorAll('table'))) {
    const box = doc.createElement('div');
    box.className = 'cp-table';
    table.parentNode!.insertBefore(box, table);
    box.appendChild(table);
  }
  return doc.body.innerHTML;
}

/** Any stored note — editor HTML or curriculum Markdown — as HTML that is safe to inject. */
export function notesHtml(text: string | null | undefined): string {
  const source = String(text || '');
  if (!source.trim()) return '';
  return sanitizeHtml(looksLikeHtml(source) ? source : markdownToHtml(source));
}

/** One line of authored text — an option, a title — with inline formatting only, safe to inject. */
export function inlineNotesHtml(text: string | null | undefined): string {
  const source = String(text || '');
  return source.trim() ? sanitizeHtml(inline(source)) : '';
}
