import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { codingPracticeApi, LibraryFacets, LibraryPage } from '../../api/problemSetApi';
import { pbError } from '../../api/problemBankApi';
import { LANG_SHORT } from '../ProblemBank/shared';
import LibrarySolve from './LibrarySolve';
import '../ProblemBank/ProblemBank.css';
import './practiceLibrary.css';
import { barWidth } from '../../utils/barWidth';

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
    <div className="pl pl2x">
      {/*
        * ONE TOP CARD, EVERYTHING ONCE. The page used to say the same things twice: a Start button
        * and an "Up next · Solve it" card that opened the same problem; four figure cards and a
        * "Your progress" card with the same Easy/Medium/Hard bars; plus a decorative picture, a
        * quote and an AI Mentor card that repeats the sidebar. Now: what to do next on the left,
        * where they stand on the right, and the list across the page below.
        */}
      <section className="plx-hero">
        <div className="plx-copy">
          <span className="plx-eyebrow">Practice Lab</span>
          <h1>Turn problems into <span>progress</span></h1>
          <p>Real coding problems with tests that run your code. Pick by topic, company or difficulty, or carry on from where you stopped.</p>
          {data?.next ? (
            <div className="plx-next">
              <small>{prog?.solved ? 'Up next for you' : 'Start with'}</small>
              <b>{data.next.number}. {data.next.title}</b>
              <span className={`pl-diff ${data.next.difficulty}`}>{cap(data.next.difficulty)}</span>
            </div>
          ) : null}
          <div className="plx-actions">
            <button className="pl-btn primary" onClick={start} disabled={!data || (!data.next && !data.rows.length)}>
              <i className="fa-solid fa-play" /> {prog?.solved ? 'Continue practising' : 'Start practising'}
            </button>
            <button type="button" className="plx-link" onClick={() => nav('/careerpilot/mentor')}>
              <i className="fa-solid fa-robot" /> Stuck? Ask AI Mentor
            </button>
          </div>
        </div>

        <div className="plx-progress" aria-label="Your progress">
          <div className="plx-total">
            <b>{prog?.solved ?? 0}<em> / {prog?.total ?? 0}</em></b>
            <span>problems solved</span>
          </div>
          <div className="plx-bar"><i style={{ width: `${barWidth(pct(prog?.solved, prog?.total))}%` }} /></div>
          {(['easy', 'medium', 'hard'] as const).map((d) => {
            const x = prog?.byDifficulty[d];
            return (
              <div key={d} className="plx-diffrow">
                <div className="h"><span><i className={`dot ${d}`} />{cap(d)}</span><span>{x?.solved ?? 0} / {x?.total ?? 0}</span></div>
                <div className="bar"><span style={{ width: `${barWidth(pct(x?.solved, x?.total))}%`, background: DCOL[d] }} /></div>
              </div>
            );
          })}
        </div>
      </section>

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
