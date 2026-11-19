import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NotesContent } from '../../components/content/NotesContent';
import { NotesViewer } from './DayView';
import './notesBook.css';

/**
 * Written notes, read two ways:
 *   Plain  the notes as one scrolling page (as before).
 *   Book   the same notes laid out as the pages of a book: a two-page spread on wide screens, one
 *          page on narrow ones, turned with the buttons or the arrow keys.
 * The choice is remembered in this browser. Uploaded notes (a PDF or a file) keep their own viewer.
 */

type Mode = 'plain' | 'book';
const KEY = 'lp-notes-view';
const readMode = (): Mode => { try { return localStorage.getItem(KEY) === 'book' ? 'book' : 'plain'; } catch { return 'plain'; } };

export default function NotesReader({ content }: { content: any }) {
  const written = content && content.notesSource !== 'upload' && !!content.notesContent;
  const [mode, setMode] = useState<Mode>(readMode);
  const choose = (m: Mode) => { setMode(m); try { localStorage.setItem(KEY, m); } catch { /* per-browser nicety only */ } };

  if (!written) return <NotesViewer content={content} />;

  return (
    <div className="nbk">
      <div className="nbk-switch" role="tablist" aria-label="How to read the notes">
        <button type="button" role="tab" aria-selected={mode === 'plain'} className={mode === 'plain' ? 'on' : ''} onClick={() => choose('plain')}>
          <i className="bi bi-file-text" /> Plain view
        </button>
        <button type="button" role="tab" aria-selected={mode === 'book'} className={mode === 'book' ? 'on' : ''} onClick={() => choose('book')}>
          <i className="bi bi-book" /> Book view
        </button>
      </div>
      {mode === 'plain'
        ? <div className="nbk-plain"><NotesContent text={content.notesContent} /></div>
        : <BookView title={content.title} text={content.notesContent} />}
    </div>
  );
}

function BookView({ title, text }: { title?: string; text: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);   // index of the spread (or single page) on show
  const [pages, setPages] = useState(1);
  const [perSpread, setPerSpread] = useState(2);

  /** How many spreads the notes fill, from how far the columns run off to the right. */
  const measure = useCallback(() => {
    const v = viewport.current;
    if (!v) return;
    const gap = parseFloat(getComputedStyle(v.firstElementChild as Element).columnGap) || 0;
    const stride = v.clientWidth + gap;
    const n = Math.max(1, Math.ceil((v.scrollWidth + gap - 2) / stride));
    setPages(n);
    setPerSpread(window.matchMedia('(max-width: 760px)').matches ? 1 : 2);
    setPage(p => Math.min(p, n - 1));
  }, []);

  useLayoutEffect(() => { measure(); }, [measure, text]);
  useEffect(() => {
    const v = viewport.current;
    if (!v) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(v);
    // Pictures change the length once they load.
    const imgs = [...v.querySelectorAll('img')];
    imgs.forEach(i => i.addEventListener('load', measure));
    return () => { ro.disconnect(); imgs.forEach(i => i.removeEventListener('load', measure)); };
  }, [measure, text]);

  // Show the spread: scroll the column flow by whole spreads.
  useEffect(() => {
    const v = viewport.current;
    if (!v) return;
    const gap = parseFloat(getComputedStyle(v.firstElementChild as Element).columnGap) || 0;
    v.scrollTo({ left: page * (v.clientWidth + gap), behavior: 'smooth' });
  }, [page, pages]);

  const go = (d: number) => setPage(p => Math.max(0, Math.min(pages - 1, p + d)));
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
  };

  const first = page * perSpread + 1;
  const last = Math.min(first + perSpread - 1, pages * perSpread);
  const pageLabel = perSpread === 2 ? `Pages ${first}–${last}` : `Page ${first}`;

  return (
    <div className="nbk-book" tabIndex={0} onKeyDown={onKey} aria-label="Notes, book view. Use the arrow keys to turn pages.">
      <div className="nbk-cover-bar">
        <span className="nbk-cover-title"><i className="bi bi-journal-bookmark" /> {title || 'Notes'}</span>
        <span className="nbk-count">{pageLabel} of {pages * perSpread}</span>
      </div>
      <div className={`nbk-spread${perSpread === 1 ? ' single' : ''}`}>
        <div className="nbk-viewport" ref={viewport}>
          <div className="nbk-flow">
            <NotesContent text={text} />
          </div>
        </div>
      </div>
      <div className="nbk-nav">
        <button type="button" onClick={() => go(-1)} disabled={page === 0}><i className="bi bi-chevron-left" /> Previous</button>
        <div className="nbk-dots" aria-hidden="true">
          {Array.from({ length: Math.min(pages, 12) }).map((_, i) => <span key={i} className={i === page ? 'on' : ''} />)}
        </div>
        <button type="button" onClick={() => go(1)} disabled={page >= pages - 1}>Next <i className="bi bi-chevron-right" /></button>
      </div>
    </div>
  );
}
