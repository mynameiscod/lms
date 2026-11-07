/**
 * AI feedback as a student should read it.
 *
 * The models are told to write plain sentences (server data/feedbackStyle.ts), but older feedback, and
 * the occasional reply that ignores the instruction, arrives with markdown (**bold**, "- " bullets,
 * "# headings") that the page would show as raw symbols. This takes them out and tidies the spacing.
 * It never rewrites the words.
 */
export function cleanFeedback(text: unknown): string {
  return String(text ?? '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|[.,;:!?]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*•▪◦]|\d+[.)])\s+/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*\n\s*/g, '\n\n')
    .trim();
}

/** A list of feedback lines, cleaned, with empty ones dropped. */
export const cleanList = (items: unknown): string[] =>
  (Array.isArray(items) ? items : []).map(cleanFeedback).filter(Boolean);
