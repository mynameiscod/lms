import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { interviewHubApi, CompanyView } from '../../api/interviewHubApi';
import { CompanyLogo, ExperienceCard, fmtDate, useHubBase } from './parts';
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
  useEffect(() => { interviewHubApi.company(slug).then(setC).catch((x) => setErr(x?.response?.data?.message || 'Could not load.')); }, [slug]);
  const asked = useMemo(() => (c?.mostAsked || []).filter((q) => !round || q.round === round), [c, round]);

  if (err) return <div className="pb-root"><div className="pb-page"><div className="pb-alert pb-alert-bad">{err}</div></div></div>;
  if (!c) return <div className="pb-root"><div className="pb-page pb-muted"><span className="pb-spinner" /> Loading…</div></div>;
  const offers = c.outcomes.offer || 0;
  const decided = offers + (c.outcomes.rejected || 0);

  return (
    <div className="pb-root">
      <div className="pb-page" style={{ maxWidth: 1180 }}>
        <button className="pb-btn pb-btn-ghost pb-btn-sm" style={{ marginBottom: 10 }} onClick={() => nav(base)}><i className="fa-solid fa-arrow-left" /> All experiences</button>
        <div className="pb-head" style={{ alignItems: 'center' }}>
          <CompanyLogo name={c.company.name} size={52} />
          <div className="pb-grow"><h1>{c.company.name}</h1><p style={{ marginTop: 2 }}>From {c.reports} candidate report{c.reports === 1 ? '' : 's'}{c.lastInterviewedOn ? ` · latest ${fmtDate(c.lastInterviewedOn)}` : ''}</p></div>
          <button className="pb-btn pb-btn-primary" onClick={() => nav(`${base}/share?company=${encodeURIComponent(c.company.name)}`)}><i className="fa-solid fa-microphone-lines" /> I interviewed here</button>
        </div>

        {!c.reports ? (
          <div className="pb-card pb-empty"><h2>No experiences for this company yet</h2><p className="pb-muted">If you interviewed here, you would be the first to help the next batch.</p></div>
        ) : <>
          <div className="pb-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="pb-card pb-stat"><div className="l">Reports</div><div className="n">{c.reports}</div></div>
            <div className="pb-card pb-stat"><div className="l">Typical rounds</div><div className="n">{c.avgRounds ?? '—'}</div></div>
            <div className="pb-card pb-stat"><div className="l">Questions collected</div><div className="n">{c.mostAsked.length}</div></div>
            <div className="pb-card pb-stat"><div className="l">Offers (of decided)</div><div className="n">{decided ? `${offers}/${decided}` : '—'}</div></div>
          </div>

          {!!c.roundPattern.length && (
            <div className="pb-card" style={{ padding: 16, marginBottom: 14 }}>
              <h3>The usual process</h3>
              <div className="ih-flow">
                {c.roundPattern.map((r, i) => (
                  <React.Fragment key={r.key}>
                    {i > 0 && <i className="fa-solid fa-chevron-right" />}
                    <span className="step">{r.name}<small>{r.seenIn}/{c.reports}</small></span>
                  </React.Fragment>
                ))}
              </div>
              <div className="pb-faint" style={{ fontSize: 12, marginTop: 8 }}>The number shows how many reports mentioned each round.</div>
            </div>
          )}

          <div className="pb-seg" style={{ marginBottom: 12 }}>
            <button className={tab === 'asked' ? 'on' : ''} onClick={() => setTab('asked')}>Most-asked questions</button>
            <button className={tab === 'reports' ? 'on' : ''} onClick={() => setTab('reports')}>Experiences ({c.experiences.length})</button>
          </div>

          {tab === 'asked' ? (
            <div className="pb-card">
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
            <div className="ih-grid">{c.experiences.map((e) => <ExperienceCard key={e.id} e={e} onOpen={() => nav(`${base}/${e.id}`)} />)}</div>
          )}
        </>}
      </div>
    </div>
  );
};

export default Company;
