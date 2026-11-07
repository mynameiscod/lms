import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { codingPracticeApi, LibraryFacets, LibraryPage } from '../../api/problemSetApi';
import { pbError } from '../../api/problemBankApi';
import { LANG_SHORT } from '../ProblemBank/shared';
import LibrarySolve from './LibrarySolve';
import '../ProblemBank/ProblemBank.css';
import './practiceLibrary.css';
import './practiceHub.css';

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
  const reset = () => { setText(''); setParams({}, { replace: true }); };
  const start = () => { if (data?.next) nav(`${base}/${data.next._id}`); else if (data?.rows[0]) nav(`${base}/${data.rows[0]._id}`); };
  const from = data ? (data.page - 1) * data.limit + 1 : 0;

  /** The tabs' counts are the learner's own, across the whole library — not the filtered list. */
  const attempted = prog?.attempted ?? null;
  const counts: Record<string, number | null> = prog ? {
    '': prog.total,
    todo: attempted === null ? null : Math.max(0, prog.total - prog.solved - attempted),
    attempted,
    solved: prog.solved,
  } : { '': null, todo: null, attempted: null, solved: null };
  const accuracy = prog?.accuracy ?? null;
  const to = data ? from + data.rows.length - 1 : 0;
  const open = (id: string) => nav(`${base}/${id}`);

  return (
    <div className="pl pl2x plh">
      {/*
        * THE TOP OF THE PAGE: what to do next on the left, the learner's three figures beside it,
        * and the list across the page below — filters in the address, so a filtered list can be
        * bookmarked and survives opening a problem and pressing Back.
        */}
      <section className="plh-top">
        <div className="plh-copy">
          <span className="plh-eyebrow">Practice Lab</span>
          <h1>Turn Problems into <span>Progress</span></h1>
          <p>Solve real coding problems, build strong problem-solving skills and get ready for interviews.</p>
          {data?.trial && (
            <p className="plx-trial"><i className="bi bi-hourglass-split" /> Your trial includes <b>{data.trial.problems}</b> of the {data.trial.libraryTotal.toLocaleString('en-IN')} problems. Membership opens all of them.</p>
          )}
        </div>
        <div className="plh-bar">
          <div className="plh-actions">
            <button type="button" className="plh-btn primary" onClick={start} disabled={!data}>
              <i className="fa-solid fa-play" aria-hidden /> {prog?.solved ? 'Continue Practising' : 'Start Practising'}
            </button>
            <button type="button" className="plh-btn" onClick={() => nav('/careerpilot/mentor')}>
              <i className="fa-solid fa-robot" aria-hidden /> Ask AI Mentor
            </button>
          </div>
          <div className="plh-stats">
            <div className="plh-stat"><i className="fa-solid fa-code ic blue" aria-hidden /><span><b>{prog ? prog.total.toLocaleString('en-IN') : '—'}</b><small>Problems</small></span></div>
            <div className="plh-stat"><i className="fa-regular fa-circle-check ic green" aria-hidden /><span><b>{prog ? prog.solved.toLocaleString('en-IN') : '—'}</b><small>Solved</small></span></div>
            <div className="plh-stat"><i className="fa-solid fa-chart-simple ic violet" aria-hidden /><span><b>{accuracy !== null ? `${accuracy}%` : '—'}</b><small>Accuracy</small></span></div>
          </div>
        </div>
        {data?.next && (
          <p className="plh-next">
            <span>{prog?.solved ? 'Up next for you' : 'Start with'}</span>
            <button type="button" onClick={() => open(data.next!._id)}>{data.next.number}. {data.next.title}</button>
            <em className={`pl-diff ${data.next.difficulty}`}>{cap(data.next.difficulty)}</em>
          </p>
        )}
      </section>

      <section className="pl-card pl-panel plh-panel">
        <div className="pl-tabs">
          {STATUS.map(([v, l]) => (
            <button key={v} className={`pl-tab${get('status') === v ? ' on' : ''}`} onClick={() => set({ status: v })} aria-pressed={get('status') === v}>
              <i className={`fa-${v === '' ? 'solid fa-table-cells-large' : v === 'todo' ? 'regular fa-star' : v === 'attempted' ? 'solid fa-rotate' : 'regular fa-circle-check'}`} aria-hidden /> {l}{counts[v] !== null ? ` (${(counts[v] as number).toLocaleString('en-IN')})` : ''}
            </button>
          ))}
          <span className="grow" />
          <button className="pl-btn plh-random" onClick={randomProblem} disabled={!data || picking}><i className="fa-solid fa-shuffle" aria-hidden /> Random Problem</button>
        </div>

        <div className="pl-filters">
          <div className="pl-search"><i className="fa-solid fa-magnifying-glass" />
            <input placeholder="Search by title, topic, company or number…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Search problems" /></div>
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
          <button className="pl-btn" onClick={reset} disabled={!active.length && !get('status') && !get('sort')}><i className="fa-solid fa-rotate-left" aria-hidden /> Reset</button>
        </div>

        <div className="pl-meta">
          <span>{data ? (data.total ? `Showing ${from} – ${to} of ${data.total.toLocaleString('en-IN')} problems` : 'No problems') : 'Loading…'}</span>
          <label className="plh-sort">Sort by
            <select value={get('sort') || 'number'} onChange={(e) => set({ sort: e.target.value === 'number' ? '' : e.target.value })}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></label>
        </div>

        {err && <div className="pb-alert pb-alert-bad">{err}</div>}
        {data && !data.rows.length && <div className="pl-empty"><h3>{active.length || get('status') ? 'No problems match' : 'No problems yet'}</h3><p>{active.length || get('status') ? 'Try removing a filter.' : 'Problems appear here as they are published.'}</p></div>}

        {!!data?.rows.length && (
          <div className="plh-table" role="table" aria-label="Problems">
            <div className="plh-row plh-thead" role="row">
              <span role="columnheader" className="c-st" aria-label="Status" />
              <span role="columnheader" className="c-num">#</span>
              <span role="columnheader" className="c-title">Problem Title</span>
              <span role="columnheader" className="c-topic">Topic</span>
              <span role="columnheader" className="c-att">Attempts</span>
              <span role="columnheader" className="c-acc">Acceptance</span>
              <span role="columnheader" className="c-diff">Difficulty</span>
              <span role="columnheader" className="c-act">Action</span>
            </div>
            {data.rows.map((r) => (
              <div key={r._id} className={`plh-row s-${r.status}`} role="row" tabIndex={0} onClick={() => open(r._id)} onKeyDown={(e) => { if (e.key === 'Enter') open(r._id); }}>
                <span role="cell" className="c-st" title={r.status === 'solved' ? 'Solved' : r.status === 'attempted' ? 'Attempted' : 'Not started'}>
                  {r.status === 'solved' ? <i className="fa-solid fa-circle-check" aria-label="Solved" />
                    : r.status === 'attempted' ? <i className="fa-solid fa-circle-half-stroke" aria-label="Attempted" />
                      : <i className="fa-regular fa-circle" aria-label="Not started" />}
                </span>
                <span role="cell" className="c-num">{r.number}</span>
                <span role="cell" className="c-title">
                  <b>{r.title}</b>
                  {!!r.companies.length && <small>{r.companies.slice(0, 2).join(' · ')}</small>}
                </span>
                <span role="cell" className="c-topic">
                  {r.topics[0] && <span className="plh-topic" onClick={(e) => { e.stopPropagation(); set({ topic: r.topics[0] }); }} title={`Show ${r.topics[0]} problems`}>{r.topics[0]}</span>}
                </span>
                <span role="cell" className="c-att">{r.attempts ? `${kfmt(r.attempts)} attempt${r.attempts === 1 ? '' : 's'}` : '—'}</span>
                <span role="cell" className="c-acc">{r.acceptance != null ? `${r.acceptance}%` : '—'}</span>
                <span role="cell" className="c-diff"><span className={`pl-diff ${r.difficulty}`}>{cap(r.difficulty)}</span></span>
                <span role="cell" className="c-act">
                  <button type="button" className={`plh-solve${r.status === 'solved' ? ' done' : ''}`} onClick={(e) => { e.stopPropagation(); open(r._id); }}>
                    {r.status === 'solved' ? 'Review' : <>Solve <i className="fa-solid fa-arrow-right" aria-hidden /></>}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

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
