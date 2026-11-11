import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { questionBookApi, ShelfBook } from '../../api/questionBookApi';
import '../ProblemBank/ProblemBank.css';
import './book.css';
import '../CodingPractice/practiceLibrary.css';
import '../CodingPractice/practiceHub.css';
import './library.css';

/** Where the books live: inside CareerPilot's shell for members who opened them there. */
export function useBooksBase() {
  const { pathname } = useLocation();
  return pathname.startsWith('/careerpilot') ? '/careerpilot/question-books' : '/question-books';
}

/*
 * Cover colours in the CodeBegun range, picked by topic so the same subject always gets the
 * same cover. The admin's own colour is ignored on the student shelf: it was free-form and
 * mostly purple.
 */
const COVERS: [RegExp, string, string][] = [
  [/java(?!script)|spring|jvm/i, '#051D64', 'bi-cup-hot'],
  [/python|django|flask|fastapi/i, '#1D5FB4', 'bi-filetype-py'],
  [/\.net|c#|asp\.net/i, '#3E3A8C', 'bi-filetype-cs'],
  [/sql|dbms|database|mongo|data engineer/i, '#17885D', 'bi-database'],
  [/mobile|react native|android/i, '#287F91', 'bi-phone'],
  [/react|frontend|html|css|javascript|\bjs\b|typescript|node/i, '#287F91', 'bi-filetype-jsx'],
  [/dsa|algorithm|data structure|coding/i, '#B86B00', 'bi-diagram-3'],
  [/aptitude|reasoning/i, '#B86B00', 'bi-calculator'],
  [/\bhr\b|behaviou?r|communication/i, '#9A4D1A', 'bi-people'],
  [/security|cyber/i, '#3E5672', 'bi-shield-lock'],
  [/\bqa\b|sdet|test/i, '#17885D', 'bi-bug'],
  [/analytics|data science/i, '#1D5FB4', 'bi-bar-chart-line'],
  [/system design|cloud|devops|mlops|\bai\b|\bml\b|agentic|generative/i, '#0B6E7F', 'bi-cpu'],
];
const FALLBACK = ['#051D64', '#287F91', '#17885D', '#1D5FB4', '#B86B00', '#3E5672'];
export function coverFor(b: { title: string; subject?: string; kind?: string }): { color: string; icon: string } {
  const text = `${b.title} ${b.subject || ''}`;
  // A company book is about the employer, whatever its title mentions.
  const hit = b.kind === 'company' ? undefined : COVERS.find(([rx]) => rx.test(text));
  if (hit) return { color: hit[1], icon: hit[2] };
  let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return { color: FALLBACK[h % FALLBACK.length], icon: b.kind === 'company' ? 'bi-building' : 'bi-journal-bookmark' };
}

/** The admin's cover preview (Admin.tsx): shows the colour and emblem the admin picked. */
export const BookCover: React.FC<{ b: ShelfBook; onOpen: () => void }> = ({ b, onOpen }) => {
  const pct = b.questionCount ? Math.round((b.knew / b.questionCount) * 100) : 0;
  return (
    <button className="qb-cover" style={{ background: `linear-gradient(160deg, ${b.color} 0%, ${b.color}dd 60%, ${b.color}aa 100%)` }} onClick={onOpen}>
      {b.global && <span className="qb-badge">CodeBegun</span>}
      <span className="kind">{b.kind === 'company' ? 'Company book' : 'Topic book'}</span>
      <span className="emb">{b.emblem || (b.kind === 'company' ? '🏢' : '📘')}</span>
      <span className="ttl">{b.title}</span>
      {b.subject && b.subject !== b.title && <span className="sub">{b.subject}</span>}
      <span className="foot">
        {b.questionCount} questions · {b.chapters} chapter{b.chapters === 1 ? '' : 's'}
        {b.started && <><div className="bar"><span style={{ width: `${pct}%` }} /></div>{b.knew} known{b.revise ? ` · ${b.revise} to revise` : ''}</>}
      </span>
    </button>
  );
};

type Shelf = 'all' | 'topic' | 'company' | 'reading' | 'done';
type Sort = 'shelf' | 'recent' | 'progress' | 'title' | 'size';
const SORTS: [Sort, string][] = [['shelf', 'Recommended'], ['recent', 'Recently read'], ['progress', 'Most progress'], ['title', 'Title A–Z'], ['size', 'Most questions']];
const pctOf = (b: ShelfBook) => (b.questionCount ? Math.min(100, Math.round((b.knew / b.questionCount) * 100)) : 0);
const isDone = (b: ShelfBook) => b.questionCount > 0 && b.knew >= b.questionCount;

const Library: React.FC = () => {
  const nav = useNavigate();
  const base = useBooksBase();
  const [books, setBooks] = useState<ShelfBook[] | null>(null);
  const [q, setQ] = useState('');
  const [shelf, setShelf] = useState<Shelf>('all');
  const [subject, setSubject] = useState('');
  const [sort, setSort] = useState<Sort>('shelf');
  const [err, setErr] = useState('');
  const load = () => { setErr(''); questionBookApi.shelf().then(setBooks).catch((e) => { setErr(e?.response?.data?.message || 'Could not load the books.'); setBooks([]); }); };
  useEffect(load, []);

  const all = books || [];
  const favs = all.reduce((n, b) => n + b.favorites, 0);
  const totalQ = all.reduce((n, b) => n + b.questionCount, 0);
  const known = all.reduce((n, b) => n + b.knew, 0);
  const subjects = useMemo(() => Array.from(new Set(all.map((b) => b.subject).filter(Boolean))).sort(), [all]);
  const inShelf = (b: ShelfBook, s: Shelf) => s === 'all' || (s === 'topic' && b.kind !== 'company') || (s === 'company' && b.kind === 'company')
    || (s === 'reading' && b.started && !isDone(b)) || (s === 'done' && isDone(b));
  const counts = Object.fromEntries((['all', 'topic', 'company', 'reading', 'done'] as Shelf[]).map((s) => [s, all.filter((b) => inShelf(b, s)).length])) as Record<Shelf, number>;
  const shown = useMemo(() => {
    const rows = all.filter((b) => inShelf(b, shelf) && (!subject || b.subject === subject)
      && (!q.trim() || `${b.title} ${b.subject} ${b.description}`.toLowerCase().includes(q.trim().toLowerCase())));
    const by: Record<Sort, (a: ShelfBook, b: ShelfBook) => number> = {
      // Recommended: what they are reading (latest first), then unread topic books, company books, and finished ones last.
      shelf: (a, b) => {
        const rank = (x: ShelfBook) => (isDone(x) ? 3 : x.started ? 0 : x.kind === 'company' ? 2 : 1);
        return rank(a) - rank(b) || (b.readAt ? Date.parse(b.readAt) : 0) - (a.readAt ? Date.parse(a.readAt) : 0);
      },
      recent: (a, b) => (b.readAt ? Date.parse(b.readAt) : 0) - (a.readAt ? Date.parse(a.readAt) : 0),
      progress: (a, b) => pctOf(b) - pctOf(a),
      title: (a, b) => a.title.localeCompare(b.title),
      size: (a, b) => b.questionCount - a.questionCount,
    };
    return [...rows].sort(by[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, shelf, subject, q, sort]);
  // The book to carry on with: the one read most recently and not finished; else the first unread.
  const next = useMemo(() => [...all].filter((b) => b.started && !isDone(b)).sort((a, b) => (b.readAt ? Date.parse(b.readAt) : 0) - (a.readAt ? Date.parse(a.readAt) : 0))[0]
    || all.find((b) => !b.started) || null, [books]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = (b: ShelfBook) => nav(`${base}/${b.slug}`);
  const filtered = !!(q.trim() || subject);

  return (
    <div className="pl pl2x plh qbk2">
      <section className="plh-top">
        <div className="plh-copy">
          <span className="plh-eyebrow">Question Books</span>
          <h1>Read, Recall and <span>Remember</span></h1>
          <p>Read a question, think of your answer, then flip for the model answer. Mark what you know, and star the ones you want on your cheat sheet.</p>
        </div>
        <div className="plh-bar">
          <div className="plh-actions">
            <button type="button" className="plh-btn primary" disabled={!next} onClick={() => next && open(next)}>
              <i className="fa-solid fa-book-open" aria-hidden /> {next?.started ? 'Continue Reading' : 'Start Reading'}
            </button>
            <button type="button" className="plh-btn" onClick={() => nav(`${base}/cheat-sheet`)}>
              <i className="fa-solid fa-star" aria-hidden /> My Cheat Sheet{favs ? <span className="qbk2-n">{favs}</span> : null}
            </button>
          </div>
          <div className="plh-stats">
            <div className="plh-stat"><i className="fa-solid fa-book ic blue" aria-hidden /><span><b>{books ? all.length : '—'}</b><small>Books</small></span></div>
            <div className="plh-stat"><i className="fa-regular fa-circle-question ic violet" aria-hidden /><span><b>{books ? totalQ.toLocaleString('en-IN') : '—'}</b><small>Questions</small></span></div>
            <div className="plh-stat"><i className="fa-regular fa-circle-check ic green" aria-hidden /><span><b>{books ? known.toLocaleString('en-IN') : '—'}</b><small>You know</small></span></div>
          </div>
        </div>
        {next && (
          <p className="plh-next">
            <span>{next.started ? 'Continue with' : 'Start with'}</span>
            <button type="button" onClick={() => open(next)}>{next.title}</button>
            {next.started && <em className="qbk2-next-pct">{next.knew} of {next.questionCount} known</em>}
          </p>
        )}
      </section>

      <section className="pl-card pl-panel plh-panel">
        <div className="pl-tabs">
          {([['all', 'All books', 'fa-solid fa-table-cells-large'], ['topic', 'Topic books', 'fa-solid fa-bookmark'], ['company', 'Company books', 'fa-solid fa-building'], ['reading', 'Reading', 'fa-solid fa-book-open-reader'], ['done', 'Completed', 'fa-regular fa-circle-check']] as [Shelf, string, string][]).map(([k, l, ic]) => (
            <button key={k} className={`pl-tab${shelf === k ? ' on' : ''}`} aria-pressed={shelf === k} onClick={() => setShelf(k)}>
              <i className={ic} aria-hidden /> {l}{books ? ` (${counts[k]})` : ''}
            </button>
          ))}
        </div>

        <div className="pl-filters qbk2-filters">
          <div className="pl-search"><i className="fa-solid fa-magnifying-glass" />
            <input placeholder="Find a book — Java, SQL, a company…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a book" /></div>
          <label className="pl-field">Subject
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">All</option>{subjects.map((s) => <option key={s} value={s}>{s} ({all.filter((b) => b.subject === s).length})</option>)}
            </select></label>
          <button className="pl-btn" onClick={() => { setQ(''); setSubject(''); setShelf('all'); setSort('shelf'); }} disabled={!filtered && shelf === 'all' && sort === 'shelf'}><i className="fa-solid fa-rotate-left" aria-hidden /> Reset</button>
        </div>

        <div className="pl-meta">
          <span>{books ? (shown.length ? `Showing ${shown.length} book${shown.length === 1 ? '' : 's'}` : 'No books') : 'Loading…'}</span>
          <label className="plh-sort">Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        </div>

        {err && <div className="pb-alert pb-alert-bad">{err} <button className="pl-btn sm" onClick={load}>Try again</button></div>}
        {books && !shown.length && !err && (
          <div className="pl-empty">
            {!all.length ? <><h3>No books on the shelf yet</h3><p>Your mentors are writing them. When the first book is published it appears here, and your progress is saved as you read.</p></>
              : filtered || shelf !== 'all' ? <><h3>No books match</h3><p>{shelf === 'reading' ? 'Books you have started and not finished appear here.' : shelf === 'done' ? 'Books where you know every question appear here.' : 'Try removing a filter.'}</p></>
                : null}
          </div>
        )}

        {!!shown.length && (
          <div className="plh-table qbk2-table" role="table" aria-label="Question books">
            <div className="plh-row plh-thead" role="row">
              <span role="columnheader" className="c-st" aria-label="Status" />
              <span role="columnheader" className="c-title">Book</span>
              <span role="columnheader" className="c-topic">Type</span>
              <span role="columnheader" className="c-att">Questions</span>
              <span role="columnheader" className="c-acc">Progress</span>
              <span role="columnheader" className="c-diff">To revise</span>
              <span role="columnheader" className="c-act">Action</span>
            </div>
            {shown.map((b) => {
              const done = isDone(b);
              const pct = pctOf(b);
              const { color, icon } = coverFor(b);
              return (
                <div key={b.id} className={`plh-row s-${done ? 'solved' : b.started ? 'attempted' : 'todo'}`} role="row" tabIndex={0} onClick={() => open(b)} onKeyDown={(e) => { if (e.key === 'Enter') open(b); }}>
                  <span role="cell" className="c-st" title={done ? 'Completed' : b.started ? 'Reading' : 'Not started'}>
                    {done ? <i className="fa-solid fa-circle-check" aria-label="Completed" /> : b.started ? <i className="fa-solid fa-circle-half-stroke" aria-label="Reading" /> : <i className="fa-regular fa-circle" aria-label="Not started" />}
                  </span>
                  <span role="cell" className="c-title qbk2-title">
                    <span className="qbk2-cover" style={{ ['--cv' as any]: color }} aria-hidden><i className={`bi ${icon}`} /></span>
                    <span className="qbk2-name"><b>{b.title}</b><small>{[b.subject && b.subject !== b.title ? b.subject : '', `${b.chapters} chapter${b.chapters === 1 ? '' : 's'}`, b.favorites ? `★ ${b.favorites} starred` : ''].filter(Boolean).join(' · ')}</small></span>
                  </span>
                  <span role="cell" className="c-topic"><span className={`plh-topic qbk2-kind ${b.kind}`}>{b.kind === 'company' ? 'Company' : 'Topic'}{b.global ? '' : ' · College'}</span></span>
                  <span role="cell" className="c-att">{b.questionCount}</span>
                  <span role="cell" className="c-acc qbk2-prog" title={`${b.knew} of ${b.questionCount} known`}>
                    <span className="bar"><i style={{ width: `${pct}%` }} /></span><em>{pct}%</em>
                  </span>
                  <span role="cell" className="c-diff">{b.revise ? <span className="qbk2-rev">{b.revise} to revise</span> : <span className="qbk2-none">—</span>}</span>
                  <span role="cell" className="c-act">
                    <button type="button" className={`plh-solve${done ? ' done' : ''}`} onClick={(e) => { e.stopPropagation(); open(b); }}>
                      {done ? 'Read again' : b.started ? <>Continue <i className="fa-solid fa-arrow-right" aria-hidden /></> : <>Start <i className="fa-solid fa-arrow-right" aria-hidden /></>}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {!books && <div className="pl-empty"><span className="pb-spinner" /> Loading the books…</div>}
      </section>
    </div>
  );
};

export default Library;
