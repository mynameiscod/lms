import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionBookApi } from '../../api/questionBookApi';
import { renderMarkdown } from '../ProblemBank/shared';
import { useBooksBase, coverFor } from './Library';
import '../ProblemBank/ProblemBank.css';
import './book.css';

/** Every starred question from every book, with the student's own notes — ready to print. */
const CheatSheet: React.FC = () => {
  const nav = useNavigate();
  const base = useBooksBase();
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof questionBookApi.cheatSheet>> | null>(null);
  const [answers, setAnswers] = useState(true);
  useEffect(() => { questionBookApi.cheatSheet().then(setGroups).catch(() => setGroups([])); }, []);
  const total = (groups || []).reduce((n, g) => n + g.items.length, 0);
  const books = (groups || []).length;
  return (
    <div className="pl pl2x plh qbk2 qbk2-sheet qb qbk qb-sheet">
      <section className="plh-top">
        <div className="plh-copy">
          <span className="plh-eyebrow">Question Books</span>
          <h1>My Cheat <span>Sheet</span></h1>
          <p>{total ? 'Every question you starred, with your own notes. Read it the night before.' : 'The questions you star while reading collect here, with your own notes.'}</p>
        </div>
        <div className="plh-bar qb-noprint">
          <div className="plh-actions">
            {!!total && <button type="button" className="plh-btn primary" onClick={() => window.print()}><i className="fa-solid fa-print" aria-hidden /> Print / Save as PDF</button>}
            <button type="button" className="plh-btn" onClick={() => nav(base)}><i className="fa-solid fa-arrow-left" aria-hidden /> Back to Library</button>
          </div>
          {!!total && <div className="plh-stats">
            <div className="plh-stat"><i className="fa-solid fa-star ic qbk2-star" aria-hidden /><span><b>{total}</b><small>Starred</small></span></div>
            <div className="plh-stat"><i className="fa-solid fa-book ic blue" aria-hidden /><span><b>{books}</b><small>{books === 1 ? 'Book' : 'Books'}</small></span></div>
            <label className="plh-stat qbk2-toggle"><input type="checkbox" checked={answers} onChange={(e) => setAnswers(e.target.checked)} /><span><b>{answers ? 'Shown' : 'Hidden'}</b><small>Answers</small></span></label>
          </div>}
        </div>
      </section>
      <div className="qbk2-groups">
        {!groups ? <span className="pb-spinner" /> : !total ? (
          <div className="qbk-empty"><span className="ill"><i className="bi bi-star" aria-hidden="true" /></span><h2>Nothing starred yet</h2><p>While reading a book, tap the ☆ on a question to add it here with your own notes.</p>
            <button className="qbk-go primary qb-noprint" style={{ maxWidth: 240, margin: '0 auto' }} onClick={() => nav(base)}><i className="bi bi-journal-bookmark" aria-hidden="true" /> Open the library</button></div>
        ) : groups.map((g) => (
          <div key={g.book.id} className="qbk-sheet-group" style={{ ['--cv' as any]: coverFor(g.book).color }}>
            <h2><i className={`bi ${coverFor(g.book).icon}`} style={{ color: coverFor(g.book).color }} aria-hidden="true" /> {g.book.title}</h2>
            {g.items.map((it, i) => (
              <div key={it.id} className="item">
                <div className="q md" style={{ display: 'flex', gap: 6 }}><span>{i + 1}.</span><span dangerouslySetInnerHTML={{ __html: renderMarkdown(it.question) }} /></div>
                {answers && it.answer && <div className="a md" dangerouslySetInnerHTML={{ __html: renderMarkdown(it.answer) }} />}
                {it.note && <div className="n">✎ {it.note}</div>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CheatSheet;
