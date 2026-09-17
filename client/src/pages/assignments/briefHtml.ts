/**
 * An assignment brief as HTML for the workspace.
 *
 * The workspace injects `instructions` as HTML, which is what the assignment editor writes. The Foundation assignment
 * briefs are authored as Markdown — paragraphs, **emphasis**, `code`, numbered and bulleted lists, indented examples —
 * and rendered that way they collapsed into one run of text with the asterisks showing, the examples' lines joined.
 *
 * A brief that already contains HTML is returned unchanged. Anything else is read as that small Markdown subset:
 * the text is escaped first, so a brief can never inject markup, and only the formatting above is turned into tags.
 */

const HTML_TAG = /<(p|div|br|ul|ol|li|h[1-6]|strong|em|b|i|code|pre|span|table|a)\b[^>]*>/i;

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inline = (s: string) => escape(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

export function briefHtml(text: string | undefined | null): string {
  const source = String(text || '');
  if (!source.trim() || HTML_TAG.test(source)) return source;

  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  const isItem = (l: string) => /^\s{0,3}(\d+\.|[-*])\s+/.test(l);
  const isCode = (l: string) => /^( {4}|\t)/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (isItem(line)) {
      const ordered = /^\s{0,3}\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && (isItem(lines[i]) || (items.length && lines[i].trim() && /^\s+/.test(lines[i]) && !isCode(lines[i].replace(/^ {2,3}/, ''))))) {
        if (isItem(lines[i])) items.push(lines[i].replace(/^\s{0,3}(\d+\.|[-*])\s+/, ''));
        else items[items.length - 1] += ` ${lines[i].trim()}`;
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map(it => `<li>${inline(it)}</li>`).join('')}</${tag}>`);
      continue;
    }

    if (isCode(line)) {
      const block: string[] = [];
      while (i < lines.length && (isCode(lines[i]) || (!lines[i].trim() && i + 1 < lines.length && isCode(lines[i + 1])))) {
        block.push(lines[i].replace(/^( {4}|\t)/, ''));
        i++;
      }
      out.push(`<pre><code>${escape(block.join('\n'))}</code></pre>`);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isItem(lines[i]) && !isCode(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}
