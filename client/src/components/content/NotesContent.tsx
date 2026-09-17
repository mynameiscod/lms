import React from 'react';
import { notesHtml, inlineNotesHtml } from './notesHtml';
import './NotesContent.css';

/**
 * Authored notes, formatted and sanitised — the one way a student screen or an admin preview shows them.
 * See notesHtml.ts for what is understood and what is removed.
 */
export const NotesContent: React.FC<{ text?: string | null; compact?: boolean; className?: string }> = ({ text, compact, className }) => (
  <div
    className={`cp-notes${compact ? ' cp-notes--compact' : ''}${className ? ` ${className}` : ''}`}
    // eslint-disable-next-line react/no-danger -- notesHtml escapes Markdown and allowlists HTML
    dangerouslySetInnerHTML={{ __html: notesHtml(text) }}
  />
);

export const InlineNotes: React.FC<{ text?: string | null }> = ({ text }) => (
  // eslint-disable-next-line react/no-danger -- inlineNotesHtml escapes first, then adds inline tags only
  <span className="cp-notes-inline" dangerouslySetInnerHTML={{ __html: inlineNotesHtml(text) }} />
);

export default NotesContent;
