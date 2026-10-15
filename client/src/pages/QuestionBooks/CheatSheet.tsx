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
  return (
    <div className="pb-root qb qbk">
      <div className="pb-page qb-sheet qbk-page" style={{ maxWidth: 960 }}>
        <button className="ihx-back-qb qb-noprint qbk-link" style={{ textDecoration: 'none', marginBottom: 12, display: 'inline-flex', gap: 7, alignItems: 'center' }} onClick={() => nav(base)}><i className="bi bi-arrow-left" aria-hidden="true" /> Library</button>
        <div className="qbk-sheet-head">
          <span className="ic"><i className="bi bi-star-fill" aria-hidden="true" /></span>
          <div className="t">
            <h1>My cheat sheet</h1>
            <p>{total ? `${total} starred question${total === 1 ? '' : 's'} — read this the night before.` : 'The questions you star while reading collect here.'}</p>
          </div>
          {!!total && <label className="pb-switch qb-noprint"><input type="checkbox" checked={answers} onChange={(e) => setAnswers(e.target.checked)} /> Show answers</label>}
          {!!total && <button className="pb-btn pb-btn-primary qb-noprint" onClick={() => window.print()}><i className="bi bi-printer" aria-hidden="true" /> Print / save as PDF</button>}
        </div>
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
