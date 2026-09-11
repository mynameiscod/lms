/**
 * Authored rich text, rendered safely as paragraphs.
 *
 * THE BUG THIS FIXES. Notes are written in an admin rich-text editor, so they arrive as HTML:
 * `<p>Watch the complete video.</p><p>Identify the four basic stages…</p>`. The viewer rendered
 * them as plain text — correctly refusing to inject HTML from an editor into every member's
 * browser — and the student was shown the tags. Literally, angle brackets and all.
 *
 * Both halves of that were right and the combination was wrong. The answer is not
 * `dangerouslySetInnerHTML`, which would make the admin form an XSS surface aimed at every
 * student. It is to READ the markup rather than trust it: take the paragraph breaks and list
 * items an author meant, throw away every tag, and hand back strings that React escapes as it
 * always does. Nothing from the editor can become an element.
 */

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&apos;': "'", '&nbsp;': ' ', '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
};

const decode = (s: string): string =>
  s.replace(/&[a-z#0-9]+;/gi, m => ENTITIES[m.toLowerCase()] ?? m);

export interface LessonBlock {
  kind: 'p' | 'li' | 'h';
  text: string;
}

/**
 * Split authored text into blocks.
 *
 * Handles the three things a rich-text editor actually produces — paragraphs, list items and
 * headings — and treats blank lines the same way, so notes typed as plain text in a textarea
 * come out identically to notes pasted from a WYSIWYG. Anything else is a tag, and tags go.
 *
 * The control characters are sentinels: they mark where a block ended and what kind it was,
 * survive the tag strip below, and are removed before anything is returned. They cannot appear
 * in authored text, which is the property that makes them safe to use as markers.
 */
export function lessonBlocks(raw: string | undefined | null): LessonBlock[] {
  const src = String(raw || '').trim();
  if (!src) return [];

  // No markup at all: honour blank lines, which is what a plain textarea gives us.
  if (!/<[a-z/][^>]*>/i.test(src)) {
    return src.split(/\n{2,}/).map(t => t.trim()).filter(Boolean)
      .map(text => ({ kind: 'p' as const, text: decode(text) }));
  }

  const SEP = '\u0001';
  const LI = '\u0002';
  const H = '\u0003';

  const marked = src
    // A line break an author pressed is a break whichever tag the editor recorded it as.
    .replace(/<\s*br\s*\/?>/gi, SEP)
    .replace(/<\s*li\b[^>]*>/gi, SEP + LI)
    .replace(/<\s*h[1-6]\b[^>]*>/gi, SEP + H)
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|blockquote|ul|ol)\s*>/gi, SEP)
    .replace(/<\s*(p|div|blockquote|ul|ol)\b[^>]*>/gi, SEP);

  const blocks: LessonBlock[] = [];
  for (const chunk of marked.split(SEP)) {
    const kind: LessonBlock['kind'] =
      chunk.indexOf(LI) >= 0 ? 'li' : chunk.indexOf(H) >= 0 ? 'h' : 'p';
    /**
     * Every remaining tag is STRIPPED, not escaped and not rendered. This is the line that keeps
     * an admin rich-text field from becoming an injection point aimed at every member.
     */
    const text = decode(
      chunk.split(LI).join('').split(H).join('').replace(/<[^>]*>/g, ''),
    ).replace(/\s+/g, ' ').trim();
    if (text) blocks.push({ kind, text });
  }

  return blocks;
}

/** Whether there is anything worth showing a heading for. */
export const hasText = (raw: string | undefined | null): boolean => lessonBlocks(raw).length > 0;
