import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionBookApi } from '../../api/questionBookApi';
import { renderMarkdown } from '../ProblemBank/shared';
import { useBooksBase } from './Library';
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
    <div className="pb-root qb">
      <div className="pb-page qb-sheet" style={{ maxWidth: 900 }}>
        <div className="pb-row qb-noprint" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <button className="pb-btn pb-btn-ghost pb-btn-sm" onClick={() => nav(base)}><i className="fa-solid fa-arrow-left" /> Library</button>
          <span className="pb-grow" />
          <label className="pb-switch"><input type="checkbox" checked={answers} onChange={(e) => setAnswers(e.target.checked)} /> Show answers</label>
          <button className="pb-btn pb-btn-primary" disabled={!total} onClick={() => window.print()}><i className="fa-solid fa-print" /> Print / save as PDF</button>
        </div>
        <h1 style={{ fontFamily: "'Caveat', cursive", fontSize: 44, fontWeight: 700 }}>My cheat sheet</h1>
        <p className="pb-muted" style={{ marginTop: 2 }}>{total ? `${total} starred question${total === 1 ? '' : 's'} — read this the night before.` : ''}</p>
        {!groups ? <span className="pb-spinner" /> : !total ? (
          <div className="pb-card pb-empty"><div style={{ fontSize: 40 }}>⭐</div><h2>Nothing starred yet</h2><p className="pb-muted">While reading a book, tap the ☆ on a question to add it here with your notes.</p>
            <button className="pb-btn pb-btn-primary qb-noprint" onClick={() => nav(base)}>Open the library</button></div>
        ) : groups.map((g) => (
          <div key={g.book.id} style={{ marginBottom: 22 }}>
            <h2 style={{ borderLeft: `6px solid ${g.book.color}`, paddingLeft: 10, marginBottom: 6 }}>{g.book.emblem} {g.book.title}</h2>
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
