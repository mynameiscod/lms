import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { interviewHubApi, ExpCard, ROUND_OPTIONS } from '../../api/interviewHubApi';
import { ExperienceCard, CompanyLogo, CardSkeletons, prettyCompany, useHubBase } from './parts';
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
  const [company, setCompany] = useState(sp.get('company') || '');
  const [outcome, setOutcome] = useState('');
  const [round, setRound] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Awaited<ReturnType<typeof interviewHubApi.feed>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<Awaited<ReturnType<typeof interviewHubApi.mine>> | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setErr(''); setLoading(true);
    interviewHubApi.feed({ company: company || undefined, q: q || undefined, outcome: outcome || undefined, round: round || undefined, page })
      .then(setData).catch((e) => setErr(e?.response?.data?.message || 'Could not load experiences.'))
      .finally(() => setLoading(false));
  }, [company, q, outcome, round, page]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => { interviewHubApi.mine().then(setMine).catch(() => undefined); }, []);

  const invites = mine?.invites || [];
  const setTab = (t: string) => { const n = new URLSearchParams(sp); if (t === 'all') n.delete('tab'); else n.set('tab', t); setSp(n); };
  const filtered = !!(q || round || outcome || company);
  const clearFilters = () => { setQ(''); setRound(''); setOutcome(''); setCompany(''); setPage(0); };

  // The company list is never filtered, so the hero figures stay the same while searching.
  const stats = useMemo(() => {
    const cs = data?.companies || [];
    return { reports: cs.reduce((n, c) => n + c.count, 0), companies: cs.length, offers: cs.reduce((n, c) => n + (c.offers || 0), 0) };
  }, [data]);
  const companyName = (data?.companies || []).find((c) => c.slug === company)?.name || company;

  return (
    <div className="pb-root ih-cb">
      <div className="pb-page ihx-page">
        <section className="ihx-hero">
          <div className="ihx-hero-copy">
            <span className="ihx-eyebrow"><i className="bi bi-people" aria-hidden="true" /> From candidates who just faced them</span>
            <h1>Interview Experiences</h1>
            <p>What companies actually asked, round by round. Read them before your interview; share yours after it, so the next person walks in ready.</p>
            <div className="ihx-hero-actions">
              <button className="ihx-btn primary" onClick={() => nav(`${base}/share`)}><i className="bi bi-mic" aria-hidden="true" /> Share your interview</button>
              <button className="ihx-btn ghost-light" onClick={() => setTab('mine')}><i className="bi bi-journal-text" aria-hidden="true" /> My posts{mine?.experiences.length ? ` (${mine.experiences.length})` : ''}</button>
            </div>
          </div>
          <dl className="ihx-hero-stats">
            <div><dt>Experiences</dt><dd>{data ? stats.reports : '—'}</dd></div>
            <div><dt>Companies</dt><dd>{data ? stats.companies : '—'}</dd></div>
            <div><dt>Offers reported</dt><dd>{data ? stats.offers : '—'}</dd></div>
          </dl>
        </section>

        {invites.map((i) => (
          <div key={i.id} className="ihx-invite">
            <span className="ic"><i className="bi bi-envelope-open" aria-hidden="true" /></span>
            <div className="txt"><b>You were asked to share your {i.companyName} interview.</b>{i.message ? <span>{i.message}</span> : null}</div>
            <button className="ihx-btn primary sm" onClick={() => nav(`${base}/share?invite=${i.id}`)}>Share now</button>
          </div>
        ))}

        <div className="ihx-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}><i className="bi bi-grid" aria-hidden="true" /> All experiences</button>
          <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}><i className="bi bi-person" aria-hidden="true" /> My posts{mine?.experiences.length ? <span className="count">{mine.experiences.length}</span> : null}</button>
        </div>

        {tab === 'mine' ? (
          !mine ? <CardSkeletons n={3} />
            : !mine.experiences.length ? (
              <div className="ihx-empty">
                <span className="ill"><i className="bi bi-mic" aria-hidden="true" /></span>
                <h2>You have not shared an interview yet</h2>
                <p>After your next interview, share it here. A voice note takes five minutes; we turn it into rounds and questions for you.</p>
                <button className="ihx-btn primary" onClick={() => nav(`${base}/share`)}><i className="bi bi-mic" aria-hidden="true" /> Share your interview</button>
              </div>
            ) : (
              <div className="ihx-grid">
                {mine.experiences.map((e: ExpCard) => (
                  <ExperienceCard key={e.id} e={e} showStatus onOpen={() => nav(e.status === 'published' ? `${base}/${e.id}` : `${base}/share?id=${e.id}`)} />
                ))}
              </div>
            )
        ) : <>
          {!!data?.companies.length && (
            <div className="ihx-companies" aria-label="Filter by company">
              <button className={`ihx-co ${!company ? 'on' : ''}`} onClick={() => { setCompany(''); setPage(0); }}>
                <span className="all"><i className="bi bi-buildings" aria-hidden="true" /></span> All companies <span className="n">{stats.reports}</span>
              </button>
              {data.companies.map((c) => (
                <button key={c.slug} className={`ihx-co ${company === c.slug ? 'on' : ''}`} onClick={() => { setCompany(company === c.slug ? '' : c.slug); setPage(0); }}>
                  <CompanyLogo name={prettyCompany(c.name)} size={28} /> {prettyCompany(c.name)} <span className="n">{c.count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="ihx-filters">
            <label className="ihx-search">
              <i className="bi bi-search" aria-hidden="true" />
              <input placeholder="Search a company, role or a question they asked" aria-label="Search experiences" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
              {q && <button className="x" aria-label="Clear search" onClick={() => { setQ(''); setPage(0); }}><i className="bi bi-x-lg" /></button>}
            </label>
            <select aria-label="Round" value={round} onChange={(e) => { setRound(e.target.value); setPage(0); }}>
              <option value="">Any round</option>{ROUND_OPTIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <select aria-label="Result" value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(0); }}>
              <option value="">Any result</option><option value="offer">Selected</option><option value="rejected">Not selected</option><option value="waiting">Pending</option>
            </select>
          </div>

          {data && (
            <div className="ihx-resultline">
              <span>{data.total} experience{data.total === 1 ? '' : 's'}{company ? <> at <b>{prettyCompany(companyName)}</b></> : ''}{q ? <> matching “{q}”</> : ''}</span>
              {company && <button className="link" onClick={() => nav(`${base}/company/${company}`)}>Most-asked questions at {prettyCompany(companyName)} <i className="bi bi-arrow-right" aria-hidden="true" /></button>}
              {filtered && <button className="link muted" onClick={clearFilters}><i className="bi bi-x-circle" aria-hidden="true" /> Clear filters</button>}
            </div>
          )}

          {err && <div className="ihx-alert bad"><i className="bi bi-exclamation-triangle" aria-hidden="true" /> {err} <button className="link" onClick={load}>Try again</button></div>}
          {!data || (loading && !data.items.length) ? (!err && <CardSkeletons />)
            : !data.items.length ? (
              <div className="ihx-empty">
                <span className="ill"><i className={`bi ${filtered ? 'bi-search' : 'bi-chat-square-quote'}`} aria-hidden="true" /></span>
                <h2>{filtered ? 'Nothing matches those filters' : 'No experiences yet'}</h2>
                <p>{filtered ? 'Try another company, round or result — or clear the filters.' : 'Be the first: share what you were asked in your last interview and help the next batch prepare.'}</p>
                {filtered
                  ? <button className="ihx-btn" onClick={clearFilters}>Clear filters</button>
                  : <button className="ihx-btn primary" onClick={() => nav(`${base}/share`)}><i className="bi bi-mic" aria-hidden="true" /> Share your interview</button>}
              </div>
            ) : <>
              <div className={`ihx-grid ${loading ? 'dim' : ''}`}>{data.items.map((e) => <ExperienceCard key={e.id} e={e} onOpen={() => nav(`${base}/${e.id}`)} />)}</div>
              {data.total > 24 && (
                <div className="ihx-pager">
                  <button className="ihx-btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}><i className="bi bi-chevron-left" aria-hidden="true" /> Previous</button>
                  <span>Page {page + 1} of {Math.ceil(data.total / 24)}</span>
                  <button className="ihx-btn sm" disabled={(page + 1) * 24 >= data.total} onClick={() => setPage(page + 1)}>Next <i className="bi bi-chevron-right" aria-hidden="true" /></button>
                </div>
              )}
            </>}
        </>}
      </div>
    </div>
  );
};

export default Feed;
