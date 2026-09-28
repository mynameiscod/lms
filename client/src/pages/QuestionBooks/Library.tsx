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

const Library: React.FC = () => {
  const nav = useNavigate();
  const base = useBooksBase();
  const [books, setBooks] = useState<ShelfBook[] | null>(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { questionBookApi.shelf().then(setBooks).catch((e) => setErr(e?.response?.data?.message || 'Could not load the books.')); }, []);
  const shown = useMemo(() => (books || []).filter((b) => !q || `${b.title} ${b.subject} ${b.description}`.toLowerCase().includes(q.toLowerCase())), [books, q]);
  const topics = shown.filter((b) => b.kind === 'topic');
  const companies = shown.filter((b) => b.kind === 'company');
  const favs = (books || []).reduce((n, b) => n + b.favorites, 0);

  return (
    <div className="pb-root qb">
      <div className="pb-page">
        <div className="ih-hero" style={{ background: 'linear-gradient(135deg,#fff7ed 0%,#fefce8 55%,#f0f9ff 100%)', border: '1px solid #fde68a', padding: 22, borderRadius: 16, marginBottom: 18, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="pb-grow">
            <h1 style={{ fontFamily: "'Caveat', cursive", fontSize: 40, fontWeight: 700 }}>Interview Question Books</h1>
            <p className="pb-muted" style={{ margin: '4px 0 0', maxWidth: 640 }}>Your mentors' notebooks — read a question, think, flip the page for the answer, and mark what you know. Star the ones you want on your cheat sheet.</p>
          </div>
          <div className="pb-row" style={{ gap: 8 }}>
            <div className="pb-search" style={{ minWidth: 220 }}><i className="fa-solid fa-magnifying-glass" /><input className="pb-input" placeholder="Find a book" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <button className="pb-btn" onClick={() => nav(`${base}/cheat-sheet`)}><i className="fa-solid fa-star" style={{ color: '#f59e0b' }} /> My cheat sheet{favs ? ` (${favs})` : ''}</button>
          </div>
        </div>
        {err && <div className="pb-alert pb-alert-bad">{err}</div>}
        {!books ? <div className="pb-muted"><span className="pb-spinner" /> Opening the library…</div>
          : !books.length ? <div className="pb-card pb-empty"><div style={{ fontSize: 44 }}>📚</div><h2>No books on the shelf yet</h2><p className="pb-muted">Your mentors are writing them — check back soon.</p></div>
            : <>
              {!!topics.length && (
                <div className="qb-shelf-row">
                  <h2>Topic books</h2>
                  <div className="qb-shelf">{topics.map((b) => <BookCover key={b.id} b={b} onOpen={() => nav(`${base}/${b.slug}`)} />)}</div>
                </div>
              )}
              {!!companies.length && (
                <div className="qb-shelf-row">
                  <h2>Company books</h2>
                  <div className="qb-shelf">{companies.map((b) => <BookCover key={b.id} b={b} onOpen={() => nav(`${base}/${b.slug}`)} />)}</div>
                </div>
              )}
              {!topics.length && !companies.length && <div className="pb-muted">No book matches "{q}".</div>}
            </>}
      </div>
    </div>
  );
};

export default Library;
