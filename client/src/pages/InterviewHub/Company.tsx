import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { interviewHubApi, CompanyView } from '../../api/interviewHubApi';
import { CompanyLogo, ExperienceCard, fmtDate, fmtInterviewDate, prettyCompany, useHubBase, Flashcards } from './parts';
import { Modal } from '../ProblemBank/shared';
import '../ProblemBank/ProblemBank.css';
import './hub.css';

/**
 * One company across every institute's reports: the usual round sequence, the questions that
 * keep coming back, and every experience. The "asked N times" count is what tells a student
 * what to prepare first.
 */
const Company: React.FC = () => {
  const { slug = '' } = useParams();
  const nav = useNavigate();
  const base = useHubBase();
  const [c, setC] = useState<CompanyView | null>(null);
  const [err, setErr] = useState('');
  const [round, setRound] = useState('');
  const [tab, setTab] = useState<'asked' | 'reports'>('asked');
  const [flash, setFlash] = useState(false);
  useEffect(() => { interviewHubApi.company(slug).then(setC).catch((x) => setErr(x?.response?.data?.message || 'Could not load.')); }, [slug]);
  const asked = useMemo(() => (c?.mostAsked || []).filter((q) => !round || q.round === round), [c, round]);

  if (err) return <div className="pb-root ih-cb"><div className="pb-page ihx-page"><button className="ihx-back" onClick={() => nav(base)}><i className="bi bi-arrow-left" /> All experiences</button><div className="ihx-alert bad"><i className="bi bi-exclamation-triangle" /> {err}</div></div></div>;
  if (!c) return <div className="pb-root ih-cb"><div className="pb-page ihx-page pb-muted"><span className="pb-spinner" /> Loading the company…</div></div>;
  const name = prettyCompany(c.company.name);
  const latest = fmtInterviewDate(c.lastInterviewedOn);
  const offers = c.outcomes.offer || 0;
  const decided = offers + (c.outcomes.rejected || 0);

  return (
    <div className="pb-root ih-cb">
      <div className="pb-page ihx-page">
        <button className="ihx-back" onClick={() => nav(base)}><i className="bi bi-arrow-left" aria-hidden="true" /> All experiences</button>
        <div className="ihx-head">
          <CompanyLogo name={name} size={60} />
          <div className="t">
            <h1>{name}</h1>
            <div className="sub">
              <span><i className="bi bi-chat-square-quote" aria-hidden="true" /> From {c.reports} candidate report{c.reports === 1 ? '' : 's'}</span>
              {latest && <span><i className="bi bi-calendar3" aria-hidden="true" /> Latest {latest}</span>}
            </div>
          </div>
          <div className="acts">
            {!!c.mostAsked.length && <button className="ihx-btn" onClick={() => setFlash(true)}><i className="bi bi-stack" aria-hidden="true" /> Practise with flashcards</button>}
            <button className="ihx-btn primary" onClick={() => nav(`${base}/share?company=${encodeURIComponent(name)}`)}><i className="bi bi-mic" aria-hidden="true" /> I interviewed here</button>
          </div>
        </div>

        {!c.reports ? (
          <div className="ihx-empty"><span className="ill"><i className="bi bi-buildings" aria-hidden="true" /></span><h2>No experiences for this company yet</h2><p>If you interviewed here, you would be the first to help the next batch.</p></div>
        ) : <>
          <div className="ihx-stats">
            <div><div className="l">Reports</div><div className="n">{c.reports}</div></div>
            <div><div className="l">Typical rounds</div><div className="n">{c.avgRounds ?? '—'}</div></div>
            <div><div className="l">Questions collected</div><div className="n">{c.mostAsked.length}</div></div>
            <div><div className="l">Selected (of decided)</div><div className="n">{decided ? `${offers}/${decided}` : '—'}</div></div>
          </div>

          {!!c.roundPattern.length && (
            <div className="ihx-panel">
              <h3>The usual process</h3>
              <div className="ih-flow">
                {c.roundPattern.map((r, i) => (
                  <React.Fragment key={r.key}>
                    {i > 0 && <i className="bi bi-chevron-right" aria-hidden="true" />}
                    <span className="step">{r.name}<small>{r.seenIn}/{c.reports}</small></span>
                  </React.Fragment>
                ))}
              </div>
              <div className="pb-faint" style={{ fontSize: 12, marginTop: 8 }}>The number shows how many reports mentioned each round.</div>
            </div>
          )}

          <div className="ihx-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'asked'} className={tab === 'asked' ? 'on' : ''} onClick={() => setTab('asked')}><i className="bi bi-fire" aria-hidden="true" /> Most-asked questions</button>
            <button role="tab" aria-selected={tab === 'reports'} className={tab === 'reports' ? 'on' : ''} onClick={() => setTab('reports')}><i className="bi bi-chat-square-quote" aria-hidden="true" /> Experiences <span className="count">{c.experiences.length}</span></button>
          </div>

          {tab === 'asked' ? (
            <div className="ihx-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="pb-row" style={{ padding: '10px 14px', borderBottom: '1px solid var(--pb-line)', flexWrap: 'wrap' }}>
                <span className="pb-muted pb-grow" style={{ fontSize: 13 }}>Grouped across reports — the higher the count, the more likely you face it.</span>
                <div className="pb-chips">
                  <button className={`pb-chip ${!round ? 'on' : ''}`} onClick={() => setRound('')}>All rounds</button>
                  {c.roundPattern.map((r) => <button key={r.key} className={`pb-chip ${round === r.name ? 'on' : ''}`} onClick={() => setRound(r.name)}>{r.name}</button>)}
                </div>
              </div>
              {!asked.length && <div className="pb-muted" style={{ padding: 20, textAlign: 'center' }}>No questions recorded for this round yet.</div>}
              {asked.map((q, i) => (
                <div key={i} className={`ih-asked ${q.count >= 3 ? 'hot' : ''}`}>
                  <div className="cnt">{q.count}×<small>asked</small></div>
                  <div className="pb-grow">
                    <div style={{ whiteSpace: 'pre-wrap', color: 'var(--pb-ink)', lineHeight: 1.5 }}>{q.text}</div>
                    <div className="pb-row" style={{ marginTop: 5, gap: 6, flexWrap: 'wrap' }}>
                      <span className="pb-tag">{q.round}</span>
                      <span className="pb-faint" style={{ fontSize: 12 }}>last asked {fmtDate(q.lastAsked)}</span>
                      <button className="pb-btn pb-btn-ghost pb-btn-sm" onClick={() => nav(`${base}/${q.experienceIds[0]}`)}>See the report</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ihx-grid">{c.experiences.map((e) => <ExperienceCard key={e.id} e={e} onOpen={() => nav(`${base}/${e.id}`)} />)}</div>
          )}
        </>}
      </div>
      {flash && (
        <Modal wide title={`${name} — flashcards`} onClose={() => setFlash(false)}>
          <Flashcards deckKey={`company:${c.company.slug}`} items={c.mostAsked.map((q) => ({ q: q.text, tag: q.round, note: q.count > 1 ? `asked ${q.count}×` : 'reported' }))} onClose={() => setFlash(false)} />
        </Modal>
      )}
    </div>
  );
};

export default Company;
