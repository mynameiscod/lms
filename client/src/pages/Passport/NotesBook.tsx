import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NotesContent } from '../../components/content/NotesContent';
import '../QuestionBooks/book.css';
import './notesBook.css';

/**
 * A day's written notes as an open notebook — the Question Books look (paper, handwriting, page
 * turns) with the notes as the pages. The text flows into CSS columns the size of a page; turning
 * a page scrolls the flow by one spread. Two pages side by side where there is room, one on a
 * phone. Code stays monospace. "Plain view" shows the same note as an ordinary page, for that note only.
 */

/** Written (not uploaded) notes open as a book; an uploaded file keeps its own viewer. */
export const opensAsBook = (c: any): boolean =>
  !!c && (c.type === 'notes' || c.type === 'worked_example') && c.notesSource !== 'upload' && !!c.notesContent;

/**
 * Notes ALWAYS open as the notebook. Plain view is a choice for the note in front of the member,
 * not a setting: it is not remembered, so the next note - and the next visit - opens as a
 * notebook again. (It used to be remembered per browser, and one click turned every note plain.)
 */

const NotesBook: React.FC<{ text: string; title?: string }> = ({ text, title }) => {
  const flowRef = useRef<HTMLDivElement>(null);
  const [spread, setSpread] = useState(0);
  const [pages, setPages] = useState(1);
  const [perSpread, setPerSpread] = useState(2);
  const [turn, setTurn] = useState<{ dir: 'next' | 'prev'; key: number } | null>(null);
  const [plain, setPlain] = useState(false);
  const spreads = Math.max(1, Math.ceil(pages / perSpread));

  /** One spread is the visible width plus the gap that sits in the next spread's outer margin. */
  const pitch = useCallback(() => {
    const f = flowRef.current;
    if (!f) return 1;
    return f.clientWidth + (parseFloat(getComputedStyle(f).columnGap) || 0);
  }, []);

  const measure = useCallback(() => {
    const f = flowRef.current;
    if (!f) return;
    const per = parseInt(getComputedStyle(f).columnCount, 10) === 1 ? 1 : 2;
    const gap = parseFloat(getComputedStyle(f).columnGap) || 0;
    const pageW = (f.clientWidth + gap) / per;
    setPerSpread(per);
    setPages(Math.max(1, Math.round((f.scrollWidth + gap) / pageW)));
  }, []);

  useLayoutEffect(() => {
    if (plain) return undefined;
    measure();
    const f = flowRef.current;
    if (!f) return undefined;
    const ro = new ResizeObserver(() => measure());
    ro.observe(f);
    // Handwriting fonts and pictures change how much fits on a page once they arrive.
    (document as any).fonts?.ready?.then(measure).catch(() => {});
    const imgs = Array.from(f.querySelectorAll('img'));
    imgs.forEach(i => i.addEventListener('load', measure));
    return () => { ro.disconnect(); imgs.forEach(i => i.removeEventListener('load', measure)); };
  }, [text, plain, measure]);

  useEffect(() => { setSpread(0); setTurn(null); setPlain(false); }, [text]);
  useEffect(() => { if (spread > spreads - 1) setSpread(spreads - 1); }, [spread, spreads]);

  // Keep the flow on the current spread (also after a resize changes the page width).
  useLayoutEffect(() => {
    const f = flowRef.current;
    if (f) f.scrollLeft = spread * pitch();
  }, [spread, pages, perSpread, pitch]);

  const go = (to: number) => {
    if (to < 0 || to > spreads - 1 || to === spread) return;
    setTurn({ dir: to > spread ? 'next' : 'prev', key: Date.now() });
    setSpread(to);
  };

  // Tabbing to a link on another page scrolls the flow; follow it so the page numbers stay right.
  const onFlowScroll = () => {
    const f = flowRef.current;
    if (!f) return;
    const s = Math.round(f.scrollLeft / pitch());
    if (s !== spread) setSpread(s);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(spread + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(spread - 1); }
  };

  const setPlainView = (v: boolean) => setPlain(v);

  if (plain) {
    return <div className="nb nb-plain">
      <div className="nb-plainbar">
        <button type="button" className="nb-mode" onClick={() => setPlainView(false)}><i className="bi bi-book" /> Notebook view</button>
      </div>
      <NotesContent text={text} />
    </div>;
  }

  const first = spread * perSpread + 1;
  const last = Math.min(pages, first + perSpread - 1);

  return <div className="qb nb">
    <div className={`nb-book${perSpread === 1 ? ' one' : ''}`} tabIndex={0} onKeyDown={onKey}
      aria-label={`Notes, page ${first}${last > first ? `–${last}` : ''} of ${pages}. Use the arrow keys to turn the page.`}>
      <div className="nb-paper left" aria-hidden />
      {perSpread === 2 && <div className="nb-paper right" aria-hidden />}
      <div className="nb-flow" ref={flowRef} onScroll={onFlowScroll}>
        {!!title && <div className="nb-chap">{title}</div>}
        <NotesContent text={text} className="nb-text" />
      </div>
      <span className="nb-pno left" aria-hidden>{first}</span>
      {perSpread === 2 && last > first && <span className="nb-pno right" aria-hidden>{last}</span>}
      {turn && <div key={turn.key} className={`nb-turn ${turn.dir}`} onAnimationEnd={() => setTurn(null)} aria-hidden />}
    </div>
    <div className="nb-nav">
      <button type="button" className="nb-btn" onClick={() => go(spread - 1)} disabled={spread === 0}><i className="bi bi-arrow-left" /> Previous page</button>
      <span className="nb-count">Page {first}{last > first ? `–${last}` : ''} of {pages}</span>
      <button type="button" className="nb-btn" onClick={() => go(spread + 1)} disabled={spread >= spreads - 1}>Next page <i className="bi bi-arrow-right" /></button>
      <button type="button" className="nb-mode" onClick={() => setPlainView(true)} title="Show the notes as an ordinary page"><i className="bi bi-file-text" /> Plain view</button>
    </div>
  </div>;
};

export default NotesBook;
