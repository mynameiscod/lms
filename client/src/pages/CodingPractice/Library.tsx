import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { codingPracticeApi, LibraryFacets, LibraryPage } from '../../api/problemSetApi';
import { pbError } from '../../api/problemBankApi';
import { LANG_SHORT } from '../ProblemBank/shared';
import LibrarySolve from './LibrarySolve';
import '../ProblemBank/ProblemBank.css';
import './practiceLibrary.css';

/**
 * The practice library: every published Problem Bank problem, chosen by the member. Filters live
 * in the address, so a filtered list can be bookmarked, shared, and survives opening a problem
 * and pressing Back.
 */

const SORTS: [string, string][] = [['number', 'Problem number'], ['newest', 'Latest'], ['easiest', 'Easiest first'], ['hardest', 'Hardest first'], ['acceptance', 'Most solved']];
const STATUS: [string, string][] = [['', 'All'], ['todo', 'Not started'], ['attempted', 'Attempted'], ['solved', 'Solved']];
const FILTERS = ['q', 'difficulty', 'topic', 'tag', 'company', 'language', 'status', 'sort', 'page'] as const;

const kfmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}K` : String(n));
const cap = (d: string) => d[0].toUpperCase() + d.slice(1);
const DCOL: Record<string, string> = { easy: '#10b981', medium: '#f59e0b', hard: '#f43f5e' };

export const PracticeLibrary: React.FC<{ base: string }> = ({ base }) => {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const get = (k: string) => params.get(k) || '';
  const [data, setData] = useState<LibraryPage | null>(null);
  const [facets, setFacets] = useState<LibraryFacets | null>(null);
  const [err, setErr] = useState('');
  const [text, setText] = useState(get('q'));
  const [picking, setPicking] = useState(false);
  const seq = useRef(0);

  const set = useCallback((patch: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    if (!keepPage) next.delete('page');
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => { codingPracticeApi.libraryFacets().then(setFacets).catch((e) => setErr(pbError(e))); }, []);

  const query = () => ({
    q: get('q'), difficulty: get('difficulty'), topic: get('topic'), tag: get('tag'), company: get('company'),
    language: get('language'), status: get('status'), sort: get('sort'),
  });
  const key = FILTERS.map(get).join('|');
  useEffect(() => {
    const me = ++seq.current;
    codingPracticeApi.library({ ...query(), page: Number(get('page')) || 1, limit: 20 })
      .then((r) => { if (me === seq.current) { setData(r); setErr(''); } })
      .catch((e) => { if (me === seq.current) setErr(pbError(e, 'Could not load the problems.')); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Search as they type, without a request per keystroke.
  useEffect(() => {
    if (text.trim() === get('q')) return;
    const t = setTimeout(() => set({ q: text.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  /** A random problem among those the filters currently show (not yet solved, unless a status is chosen). */
  const randomProblem = async () => {
    if (!data || picking) return;
    setPicking(true);
    try {
      const q = { ...query(), status: get('status') || 'todo' };
      const probe = await codingPracticeApi.library({ ...q, limit: 1, page: 1 });
      if (!probe.total) { setErr('Nothing to pick from with these filters.'); return; }
      const one = await codingPracticeApi.library({ ...q, limit: 1, page: 1 + Math.floor(Math.random() * probe.total) });
      if (one.rows[0]) nav(`${base}/${one.rows[0]._id}`);
    } catch (e) { setErr(pbError(e)); } finally { setPicking(false); }
  };

  const active = FILTERS.filter((k) => k !== 'sort' && k !== 'page' && k !== 'status' && get(k));
  const prog = data?.progress;
  const pct = (a?: number, b?: number) => (b ? Math.round(((a || 0) / b) * 100) : 0);
  const reset = () => { setText(''); setParams({}, { replace: true }); };
  const start = () => { if (data?.next) nav(`${base}/${data.next._id}`); else if (data?.rows[0]) nav(`${base}/${data.rows[0]._id}`); };
  const from = data ? (data.page - 1) * data.limit + 1 : 0;

  return (
    <div className="pl">
      <div className="pl-grid">
        <div>
          <section className="pl-hero">
            <div className="pl-eyebrow">PRACTICE &nbsp;•&nbsp; LEARN &nbsp;•&nbsp; IMPROVE</div>
            <h1>Turn Problems into <span>Progress</span></h1>
            <p>Solve real-world coding problems, track your progress and get interview ready with structured practice.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="pl-btn primary" onClick={start} disabled={!data}><i className="fa-solid fa-play" /> {prog?.solved ? 'Continue practicing' : 'Start Practicing'}</button>
              <button className="pl-btn" onClick={() => nav('/careerpilot/roadmap')}><i className="fa-regular fa-map" /> View My Roadmap</button>
            </div>
            <div className="pl-hero-art" aria-hidden><i /><i /><i /><i /><i /></div>
          </section>

          <div className="pl-stats">
            <div className="pl-card pl-stat"><span className="ic" style={{ background: '#d1fae5', color: '#047857' }}><i className="fa-solid fa-chart-simple" /></span>
              <div><b>{prog?.solved ?? 0} <span style={{ color: '#2F3F56', fontWeight: 600, fontSize: 15 }}>/ {prog?.total ?? '…'}</span></b><small>Problems Solved</small></div></div>
            {(['easy', 'medium', 'hard'] as const).map((d) => {
              const x = prog?.byDifficulty[d];
              return (
                <div key={d} className="pl-card pl-stat"><span className="ic" style={{ background: d === 'easy' ? '#d1fae5' : d === 'medium' ? '#fef3c7' : '#ffe4e6', color: d === 'easy' ? '#047857' : d === 'medium' ? '#b45309' : '#be123c' }}><i className={`fa-solid ${d === 'easy' ? 'fa-seedling' : d === 'medium' ? 'fa-bolt' : 'fa-fire-flame-curved'}`} /></span>
                  <div style={{ flex: 1 }}><b>{x?.solved ?? 0} <span style={{ color: '#2F3F56', fontWeight: 600, fontSize: 15 }}>/ {x?.total ?? '…'}</span></b><small>{cap(d)} solved</small>
                    <div className="bar"><span style={{ width: `${pct(x?.solved, x?.total)}%`, background: DCOL[d] }} /></div></div></div>
              );
            })}
          </div>

          <section className="pl-card pl-panel">
            <div className="pl-tabs">
              {STATUS.map(([v, l]) => (
                <button key={v} className={`pl-tab${get('status') === v ? ' on' : ''}`} onClick={() => set({ status: v })}>
                  <i className={`fa-${v === '' ? 'solid fa-table-cells-large' : v === 'todo' ? 'regular fa-star' : v === 'attempted' ? 'solid fa-clock-rotate-left' : 'regular fa-circle-check'}`} /> {l}
                </button>
              ))}
              <span className="grow" />
              <button className="pl-btn" onClick={randomProblem} disabled={!data || picking}><i className="fa-solid fa-shuffle" /> Random Problem</button>
            </div>

            <div className="pl-filters">
              <div className="pl-search"><i className="fa-solid fa-magnifying-glass" />
                <input placeholder="Search by title, topic, tag or number…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Search problems" /></div>
              <label className="pl-field">Difficulty
                <select value={get('difficulty')} onChange={(e) => set({ difficulty: e.target.value })}>
                  <option value="">All</option>
                  {(['easy', 'medium', 'hard'] as const).map((d) => <option key={d} value={d}>{cap(d)}{facets ? ` (${facets.difficulties[d] || 0})` : ''}</option>)}
                </select></label>
              <label className="pl-field">Topic
                <select value={get('topic')} onChange={(e) => set({ topic: e.target.value })}>
                  <option value="">All</option>{(facets?.topics || []).map((t) => <option key={t.name} value={t.name}>{t.name} ({t.count})</option>)}
                </select></label>
              <label className="pl-field">Company
                <select value={get('company')} onChange={(e) => set({ company: e.target.value })}>
                  <option value="">All</option>{(facets?.companies || []).map((t) => <option key={t.name} value={t.name}>{t.name} ({t.count})</option>)}
                </select></label>
              <label className="pl-field">Language
                <select value={get('language')} onChange={(e) => set({ language: e.target.value })}>
                  <option value="">All</option>{(facets?.languages || []).map((t) => <option key={t.name} value={t.name}>{LANG_SHORT[t.name] || t.name} ({t.count})</option>)}
                </select></label>
              <button className="pl-btn" onClick={reset} disabled={!active.length && !get('status') && !get('sort')}><i className="fa-solid fa-rotate" /> Reset</button>
            </div>

            <div className="pl-meta">
              <span>{data ? (data.total ? `Showing ${from} - ${from + data.rows.length - 1} of ${data.total.toLocaleString()} problems` : 'No problems') : 'Loading…'}</span>
              <span>Sort by
                <select value={get('sort') || 'number'} onChange={(e) => set({ sort: e.target.value === 'number' ? '' : e.target.value })} aria-label="Sort">
                  {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></span>
            </div>

            {err && <div className="pb-alert pb-alert-bad">{err}</div>}
            {data && !data.rows.length && <div className="pl-empty"><h3>{active.length || get('status') ? 'No problems match' : 'No problems yet'}</h3><p>{active.length || get('status') ? 'Try removing a filter.' : 'Problems appear here as they are published.'}</p></div>}
            {data?.rows.map((r) => (
              <div key={r._id} className="pl-row" onClick={() => nav(`${base}/${r._id}`)} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') nav(`${base}/${r._id}`); }}>
                <span title={r.status === 'solved' ? 'Solved' : r.status === 'attempted' ? 'Attempted' : 'Not started'}>
                  {r.status === 'solved' ? <i className="fa-solid fa-circle-check" style={{ color: '#059669' }} />
                    : r.status === 'attempted' ? <i className="fa-solid fa-circle-half-stroke" style={{ color: '#d97706' }} />
                      : <i className="fa-regular fa-circle" style={{ color: '#a3acc0' }} />}
                </span>
                <span className="num">{r.number}</span>
                <span className="t">{r.title}</span>
                <span className="pl-chips hide-sm">{r.topics.slice(0, 3).map((t) => <span key={t} className="pl-chip" onClick={(e) => { e.stopPropagation(); set({ topic: t }); }}>{t}</span>)}</span>
                <span className="pl-chips hide-sm">{r.companies.slice(0, 2).map((c) => <span key={c} className="pl-chip co">{c}</span>)}</span>
                <span className="hide-sm" style={{ color: '#475569' }}>{r.acceptance != null ? `${r.acceptance}%` : ''}</span>
                <span className="pl-att hide-sm">{r.attempts ? <>{kfmt(r.attempts)}<br />attempts</> : ''}</span>
                <span className={`pl-diff ${r.difficulty}`}>{cap(r.difficulty)}</span>
                <button className={`pl-solve${r.status === 'solved' ? ' done' : ''}`} onClick={(e) => { e.stopPropagation(); nav(`${base}/${r._id}`); }}>{r.status === 'solved' ? 'Review' : 'Solve →'}</button>
                <i className="fa-solid fa-chevron-right hide-sm" style={{ color: '#a3acc0', fontSize: 11 }} />
              </div>
            ))}

            {data && data.pages > 1 && (
              <div className="pl-pager">
                <button className="pl-btn sm" disabled={data.page <= 1} onClick={() => set({ page: String(data.page - 1) }, true)}><i className="fa-solid fa-chevron-left" /> Previous</button>
                <span>Page {data.page} of {data.pages}</span>
                <button className="pl-btn sm" disabled={data.page >= data.pages} onClick={() => set({ page: String(data.page + 1) }, true)}>Next <i className="fa-solid fa-chevron-right" /></button>
              </div>
            )}
          </section>
        </div>

        <aside className="pl-rail">
          {data?.next && (
            <div className="pl-card">
              <h3><i className="fa-solid fa-bolt" style={{ color: '#d97706' }} /> Up next for you</h3>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{data.next.number}. {data.next.title}</div>
              <span className={`pl-diff ${data.next.difficulty}`} style={{ display: 'inline-block', padding: '3px 14px', marginBottom: 12 }}>{cap(data.next.difficulty)}</span>
              <button className="pl-btn go" style={{ width: '100%', justifyContent: 'center' }} onClick={() => nav(`${base}/${data.next!._id}`)}>Solve it →</button>
            </div>
          )}
          <div className="pl-card">
            <h3><i className="fa-solid fa-bullseye" style={{ color: '#4f46e5' }} /> Your progress</h3>
            {(['easy', 'medium', 'hard'] as const).map((d) => {
              const x = prog?.byDifficulty[d];
              return (
                <div key={d} className="pl-diffrow">
                  <div className="h"><span>{cap(d)}</span><span style={{ color: '#2F3F56' }}>{x?.solved ?? 0} / {x?.total ?? 0}</span></div>
                  <div className="bar"><span style={{ width: `${pct(x?.solved, x?.total)}%`, background: DCOL[d] }} /></div>
                </div>
              );
            })}
          </div>
          <figure className="pl-card pl-quote"><blockquote><span className="q" aria-hidden="true">“</span>Consistency today creates opportunities tomorrow.<span className="q" aria-hidden="true">”</span></blockquote><figcaption>— CodeBegun</figcaption></figure>
          <div className="pl-card">
            <div className="pl-help"><span className="ic"><i className="fa-solid fa-robot" /></span><div><b>Need Help?</b><div style={{ color: '#2F3F56', fontSize: 13 }}>Get hints, explanations and learning resources from AI Mentor.</div></div></div>
            <button className="pl-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => nav('/careerpilot/mentor')}>Open AI Mentor →</button>
          </div>
        </aside>
      </div>
    </div>
  );
};

/**
 * `/careerpilot/practice/:problemId`. A library problem is a database id; anything else is the
 * address of an older built-in or Thinking Lab problem, which still opens where it always did.
 */
export const LibraryProblemOr: React.FC<{ base: string; legacy: React.ReactElement }> = ({ base, legacy }) => {
  const { problemId } = useParams();
  return /^[a-f0-9]{24}$/i.test(problemId || '') ? <LibrarySolve base={base} /> : legacy;
};

export default PracticeLibrary;
