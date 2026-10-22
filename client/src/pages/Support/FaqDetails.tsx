import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import supportApi, { FaqArticle, errorText } from '../../api/supportApi';
import { Loading, ErrorState, fmtDate } from './supportUi';
import './support.css';

/**
 * One Help Center article. The answer is shown as plain text (line breaks kept), never as HTML,
 * so nothing an editor pastes can run in a member's browser.
 */
const FaqDetails: React.FC<{ basePath: string }> = ({ basePath }) => {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [a, setA] = useState<FaqArticle | null>(null);
  const [err, setErr] = useState('');
  const [vote, setVote] = useState<boolean | null>(null);
  const [voteErr, setVoteErr] = useState('');

  const load = () => {
    setErr(''); setA(null);
    supportApi.faq(id).then(x => { setA(x); setVote(x.myVote); })
      .catch(e => setErr(e?.response?.status === 404 ? 'This article is not available.' : errorText(e, 'The article could not be loaded.')));
  };
  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (helpful: boolean) => {
    setVoteErr('');
    try { await supportApi.vote(id, helpful); setVote(helpful); }
    catch (e) { setVoteErr(errorText(e, 'Your answer could not be saved.')); }
  };

  if (err) return <div className="sp"><button className="sp-back" onClick={() => nav(basePath)}><i className="bi bi-arrow-left" aria-hidden /> Help &amp; Support</button><ErrorState text={err} onRetry={load} /></div>;
  if (!a) return <div className="sp"><Loading text="Loading article…" /></div>;

  return (
    <div className="sp">
      <button className="sp-back" onClick={() => nav(basePath)}><i className="bi bi-arrow-left" aria-hidden /> Help &amp; Support</button>
      <div className="sp-grid">
        <article className="sp-card">
          <span className="sp-tag">{a.category}</span>
          <h1 style={{ marginTop: 10 }}>{a.question}</h1>
          <div className="sp-answer">{a.answer}</div>
          <p className="sp-hint" style={{ marginTop: 14 }}>Updated {fmtDate(a.updatedAt)}</p>

          <div className="sp-helpful" role="group" aria-label="Was this helpful?">
            <b>Was this helpful?</b>
            <button type="button" className={`sp-chip${vote === true ? ' on' : ''}`} aria-pressed={vote === true} onClick={() => send(true)}><i className="bi bi-hand-thumbs-up" aria-hidden /> Yes</button>
            <button type="button" className={`sp-chip${vote === false ? ' on' : ''}`} aria-pressed={vote === false} onClick={() => send(false)}><i className="bi bi-hand-thumbs-down" aria-hidden /> No</button>
            {vote !== null && <span className="sp-hint" role="status">Thanks for telling us.</span>}
          </div>
          {voteErr && <p className="sp-err" role="alert">{voteErr}</p>}

          <div className="sp-card" style={{ marginTop: 16, background: 'var(--sp-bg)' }}>
            <h3>Still need help?</h3>
            <p className="sp-hint">Ask the assistant, or tell our team what is going on.</p>
            <div className="sp-actions">
              <button type="button" className="sp-btn sp-btn-ghost" onClick={() => nav(`${basePath}/assistant`, { state: { question: a.question } })}><i className="bi bi-stars" aria-hidden /> Ask the assistant</button>
              <button type="button" className="sp-btn sp-btn-primary" onClick={() => nav(`${basePath}/new?module=${a.module}`)}>Contact support</button>
            </div>
          </div>
        </article>
        {a.related.length > 0 && (
          <aside className="sp-card" aria-label="Related articles">
            <h2>Related articles</h2>
            <ul className="sp-list">
              {a.related.map(r => (
                <li key={r.id}><button type="button" className="sp-item" onClick={() => nav(`${basePath}/articles/${r.id}`)}><div className="sp-item-main"><div className="sp-item-subj" style={{ whiteSpace: 'normal' }}>{r.question}</div></div></button></li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
};

export default FaqDetails;
