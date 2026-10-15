import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { questionBookApi, ShelfBook } from '../../api/questionBookApi';
import '../ProblemBank/ProblemBank.css';
import './book.css';

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
  [/sql|dbms|database|mongo/i, '#17885D', 'bi-database'],
  [/react|frontend|html|css|javascript|\bjs\b|typescript|node/i, '#287F91', 'bi-filetype-jsx'],
  [/dsa|algorithm|data structure|coding/i, '#B86B00', 'bi-diagram-3'],
  [/hr|behaviour|aptitude|communication/i, '#9A4D1A', 'bi-people'],
  [/system design|cloud|devops|ai|ml/i, '#0B6E7F', 'bi-cpu'],
];
const FALLBACK = ['#051D64', '#287F91', '#17885D', '#1D5FB4', '#B86B00', '#3E5672'];
export function coverFor(b: { title: string; subject?: string; kind?: string }): { color: string; icon: string } {
  const text = `${b.title} ${b.subject || ''}`;
  const hit = COVERS.find(([rx]) => rx.test(text));
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

export const BookCard: React.FC<{ b: ShelfBook; onOpen: () => void }> = ({ b, onOpen }) => {
  const pct = b.questionCount ? Math.min(100, Math.round((b.knew / b.questionCount) * 100)) : 0;
  const done = b.questionCount > 0 && b.knew >= b.questionCount;
  const { color, icon } = coverFor(b);
  return (
    <article className="qbk-card">
      <button className="qbk-cover" style={{ ['--cv' as any]: color }} onClick={onOpen} aria-label={`Open ${b.title}`}>
        <span className="kind">{b.kind === 'company' ? 'Company book' : 'Topic book'}</span>
        {b.global && <span className="badge">CodeBegun</span>}
        <span className="ic"><i className={`bi ${icon}`} aria-hidden="true" /></span>
        <span className="ttl">{b.title}</span>
        {b.subject && b.subject !== b.title && <span className="sub">{b.subject}</span>}
      </button>
      <div className="qbk-body">
        {b.description && <p className="desc">{b.description}</p>}
        <div className="qbk-counts">
          <span><i className="bi bi-question-circle" aria-hidden="true" /> {b.questionCount} question{b.questionCount === 1 ? '' : 's'}</span>
          <span><i className="bi bi-collection" aria-hidden="true" /> {b.chapters} chapter{b.chapters === 1 ? '' : 's'}</span>
          {b.favorites > 0 && <span><i className="bi bi-star-fill" style={{ color: '#B86B00' }} aria-hidden="true" /> {b.favorites}</span>}
        </div>
        <div className="qbk-progress" aria-label={`${b.knew} of ${b.questionCount} known`}>
          <div className="bar"><span style={{ width: `${pct}%` }} /></div>
          <div className="lbl"><b>{b.knew}</b> of {b.questionCount} known{b.revise ? <> · <span className="rev">{b.revise} to revise</span></> : null}<span className="pct">{pct}%</span></div>
        </div>
        <button className={`qbk-go ${b.started && !done ? 'primary' : ''}`} onClick={onOpen}>
          {done ? <><i className="bi bi-arrow-repeat" aria-hidden="true" /> Read again</> : b.started ? <><i className="bi bi-play-fill" aria-hidden="true" /> Continue</> : <><i className="bi bi-book" aria-hidden="true" /> Start reading</>}
        </button>
      </div>
    </article>
  );
};

const Library: React.FC = () => {
  const nav = useNavigate();
  const base = useBooksBase();
  const [books, setBooks] = useState<ShelfBook[] | null>(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const load = () => { setErr(''); questionBookApi.shelf().then(setBooks).catch((e) => { setErr(e?.response?.data?.message || 'Could not load the books.'); setBooks([]); }); };
  useEffect(load, []);
  const shown = useMemo(() => (books || []).filter((b) => !q || `${b.title} ${b.subject} ${b.description}`.toLowerCase().includes(q.toLowerCase())), [books, q]);
  const topics = shown.filter((b) => b.kind !== 'company');
  const companies = shown.filter((b) => b.kind === 'company');
  const all = books || [];
  const favs = all.reduce((n, b) => n + b.favorites, 0);
  const totalQ = all.reduce((n, b) => n + b.questionCount, 0);
  const known = all.reduce((n, b) => n + b.knew, 0);
  const open = (b: ShelfBook) => nav(`${base}/${b.slug}`);

  return (
    <div className="pb-root qb qbk">
      <div className="pb-page qbk-page">
        <section className="qbk-hero">
          <div className="copy">
            <span className="eyebrow"><i className="bi bi-journal-bookmark" aria-hidden="true" /> Your mentors' notebooks</span>
            <h1>Interview Question Books</h1>
            <p>Read a question, think of your answer, then flip for the model answer. Mark what you know, and star the ones you want on your cheat sheet.</p>
            <div className="tools">
              <label className="qbk-search">
                <i className="bi bi-search" aria-hidden="true" />
                <input placeholder="Find a book — Java, SQL, a company…" aria-label="Find a book" value={q} onChange={(e) => setQ(e.target.value)} />
                {q && <button className="x" aria-label="Clear search" onClick={() => setQ('')}><i className="bi bi-x-lg" /></button>}
              </label>
              <button className="qbk-sheet-btn" onClick={() => nav(`${base}/cheat-sheet`)}><i className="bi bi-star-fill" aria-hidden="true" /> My cheat sheet{favs ? <span className="n">{favs}</span> : null}</button>
            </div>
          </div>
          <dl className="qbk-hero-stats">
            <div><dt>Books</dt><dd>{books ? all.length : '—'}</dd></div>
            <div><dt>Questions</dt><dd>{books ? totalQ : '—'}</dd></div>
            <div><dt>You know</dt><dd>{books ? known : '—'}</dd></div>
          </dl>
        </section>

        {err && <div className="qbk-alert"><i className="bi bi-exclamation-triangle" aria-hidden="true" /> {err} <button className="qbk-link" onClick={load}>Try again</button></div>}
        {!books ? (
          <div className="qbk-grid" aria-busy="true">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="qbk-card skeleton"><span className="sk cover" /><span className="sk line" /><span className="sk line short" /></div>)}</div>
        ) : !all.length && !err ? (
          <div className="qbk-empty">
            <span className="ill"><i className="bi bi-journals" aria-hidden="true" /></span>
            <h2>No books on the shelf yet</h2>
            <p>Your mentors are writing them. When the first book is published it appears here, and your progress is saved as you read.</p>
          </div>
        ) : <>
          {!!topics.length && (
            <section className="qbk-section">
              <h2><i className="bi bi-bookmark-star" aria-hidden="true" /> Topic books <small>{topics.length}</small></h2>
              <div className="qbk-grid">{topics.map((b) => <BookCard key={b.id} b={b} onOpen={() => open(b)} />)}</div>
            </section>
          )}
          {!!companies.length && (
            <section className="qbk-section">
              <h2><i className="bi bi-buildings" aria-hidden="true" /> Company books <small>{companies.length}</small></h2>
              <div className="qbk-grid">{companies.map((b) => <BookCard key={b.id} b={b} onOpen={() => open(b)} />)}</div>
            </section>
          )}
          {!shown.length && q && (
            <div className="qbk-empty">
              <span className="ill"><i className="bi bi-search" aria-hidden="true" /></span>
              <h2>No book matches “{q}”</h2>
              <p>Try a topic like Java or SQL, or a company name.</p>
              <button className="qbk-go" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => setQ('')}>Clear search</button>
            </div>
          )}
        </>}
      </div>
    </div>
  );
};

export default Library;
