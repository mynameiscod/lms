import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { interviewHubApi, ExpCard, ROUND_OPTIONS } from '../../api/interviewHubApi';
import { ExperienceCard, CompanyLogo, useHubBase } from './parts';
import '../ProblemBank/ProblemBank.css';
import './hub.css';

/**
 * Interview Experiences — what candidates were actually asked, company by company. The pool
 * is shared across institutes; anyone who interviewed can add to it.
 */
const Feed: React.FC = () => {
  const nav = useNavigate();
  const base = useHubBase();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'mine' ? 'mine' : 'all';
  const [q, setQ] = useState(sp.get('q') || '');
  const [outcome, setOutcome] = useState('');
  const [round, setRound] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Awaited<ReturnType<typeof interviewHubApi.feed>> | null>(null);
  const [mine, setMine] = useState<Awaited<ReturnType<typeof interviewHubApi.mine>> | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setErr('');
    interviewHubApi.feed({ q: q || undefined, outcome: outcome || undefined, round: round || undefined, page })
      .then(setData).catch((e) => setErr(e?.response?.data?.message || 'Could not load experiences.'));
  }, [q, outcome, round, page]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => { interviewHubApi.mine().then(setMine).catch(() => undefined); }, []);

  const invites = mine?.invites || [];
  const setTab = (t: string) => { const n = new URLSearchParams(sp); if (t === 'all') n.delete('tab'); else n.set('tab', t); setSp(n); };

  return (
    <div className="pb-root">
      <div className="pb-page">
        <div className="ih-hero">
          <div className="pb-grow">
            <h1>Interview Experiences</h1>
            <p>What companies actually asked — round by round — from candidates who just faced them. Read before your interview; share after it, so the next person is ready.</p>
          </div>
          <button className="pb-btn pb-btn-primary" onClick={() => nav(`${base}/share`)}><i className="fa-solid fa-microphone-lines" /> Share your interview</button>
        </div>

        {invites.map((i) => (
          <div key={i.id} className="ih-invite">
            <i className="fa-solid fa-envelope-open-text" style={{ color: '#b45309', fontSize: 18 }} />
            <div className="pb-grow"><b>You were asked to share your {i.companyName} interview.</b>{i.message ? <div className="pb-muted" style={{ fontSize: 13 }}>{i.message}</div> : null}</div>
            <button className="pb-btn pb-btn-primary pb-btn-sm" onClick={() => nav(`${base}/share?invite=${i.id}`)}>Share now</button>
          </div>
        ))}

        <div className="pb-seg" style={{ marginBottom: 14 }}>
          <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All experiences</button>
          <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>My posts{mine?.experiences.length ? ` (${mine.experiences.length})` : ''}</button>
        </div>

        {tab === 'mine' ? (
          !mine ? <div className="pb-muted"><span className="pb-spinner" /> Loading…</div>
            : !mine.experiences.length ? (
              <div className="pb-card pb-empty"><h2>You have not shared an interview yet</h2><p className="pb-muted">After your next interview, share it here — it takes five minutes by voice note.</p>
                <button className="pb-btn pb-btn-primary" onClick={() => nav(`${base}/share`)}>Share your interview</button></div>
            ) : (
              <div className="ih-grid">
                {mine.experiences.map((e: ExpCard) => (
                  <ExperienceCard key={e.id} e={e} showStatus onOpen={() => nav(e.status === 'published' ? `${base}/${e.id}` : `${base}/share?id=${e.id}`)} />
                ))}
              </div>
            )
        ) : <>
          {!!data?.companies.length && (
            <div className="ih-strip">
              {data.companies.map((c) => (
                <button key={c.slug} className="ih-co-chip" onClick={() => nav(`${base}/company/${c.slug}`)}>
                  <CompanyLogo name={c.name} /> {c.name} <span className="n">{c.count}</span>
                </button>
              ))}
            </div>
          )}
          <div className="pb-card pb-filters">
            <div className="pb-search"><i className="fa-solid fa-magnifying-glass" /><input className="pb-input" placeholder="Search a company, role or a question they asked" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></div>
            <select className="pb-select" value={round} onChange={(e) => { setRound(e.target.value); setPage(0); }}>
              <option value="">Any round</option>{ROUND_OPTIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <select className="pb-select" value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(0); }}>
              <option value="">Any result</option><option value="offer">Got the offer</option><option value="rejected">Not selected</option><option value="waiting">Awaiting result</option>
            </select>
          </div>
          {err && <div className="pb-alert pb-alert-bad">{err}</div>}
          {!data ? <div className="pb-muted"><span className="pb-spinner" /> Loading…</div>
            : !data.items.length ? (
              <div className="pb-card pb-empty">
                <h2>{q || round || outcome ? 'Nothing matches' : 'No experiences yet'}</h2>
                <p className="pb-muted">{q || round || outcome ? 'Try a different search.' : 'Be the first — share what you were asked in your last interview.'}</p>
              </div>
            ) : <>
              <div className="ih-grid">{data.items.map((e) => <ExperienceCard key={e.id} e={e} onOpen={() => nav(`${base}/${e.id}`)} />)}</div>
              {data.total > 24 && (
                <div className="pb-pager" style={{ borderTop: 0, justifyContent: 'center' }}>
                  <button className="pb-btn pb-btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
                  <span className="pb-muted">Page {page + 1} of {Math.ceil(data.total / 24)}</span>
                  <button className="pb-btn pb-btn-sm" disabled={(page + 1) * 24 >= data.total} onClick={() => setPage(page + 1)}>Next</button>
                </div>
              )}
            </>}
        </>}
      </div>
    </div>
  );
};

export default Feed;
