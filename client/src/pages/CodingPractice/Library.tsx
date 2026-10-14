import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { codingPracticeApi, LibraryFacets, LibraryPage } from '../../api/problemSetApi';
import { pbError } from '../../api/problemBankApi';
import { DifficultyPill, LANG_SHORT } from '../ProblemBank/shared';
import Solve from './Solve';
import '../ProblemBank/ProblemBank.css';

/**
 * The practice library: every published Problem Bank problem, chosen by the member. Filters live
 * in the address, so a filtered list can be bookmarked, shared, and survives opening a problem
 * and pressing Back.
 */

const SORTS: [string, string][] = [['number', 'Problem number'], ['easiest', 'Easiest first'], ['hardest', 'Hardest first'], ['acceptance', 'Most solved'], ['newest', 'Newest']];
const STATUS: [string, string][] = [['', 'All'], ['todo', 'Not started'], ['attempted', 'Attempted'], ['solved', 'Solved']];
const FILTERS = ['q', 'difficulty', 'topic', 'tag', 'company', 'language', 'status', 'sort', 'page'] as const;

export const PracticeLibrary: React.FC<{ base: string }> = ({ base }) => {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const get = (k: string) => params.get(k) || '';
  const [data, setData] = useState<LibraryPage | null>(null);
  const [facets, setFacets] = useState<LibraryFacets | null>(null);
  const [err, setErr] = useState('');
  const [text, setText] = useState(get('q'));
  const seq = useRef(0);

  const set = useCallback((patch: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    if (!keepPage) next.delete('page');
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => { codingPracticeApi.libraryFacets().then(setFacets).catch((e) => setErr(pbError(e))); }, []);

  const key = FILTERS.map(get).join('|');
  useEffect(() => {
    const me = ++seq.current;
    codingPracticeApi.library({
      q: get('q'), difficulty: get('difficulty'), topic: get('topic'), tag: get('tag'), company: get('company'),
      language: get('language'), status: get('status'), sort: get('sort'), page: Number(get('page')) || 1, limit: 25,
    }).then((r) => { if (me === seq.current) { setData(r); setErr(''); } })
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

  const active = FILTERS.filter((k) => k !== 'sort' && k !== 'page' && get(k));
  const prog = data?.progress;
  const pct = prog && prog.total ? Math.round((prog.solved / prog.total) * 100) : 0;
  const picks = useMemo(() => ({
    topic: facets?.topics || [], company: facets?.companies || [], language: facets?.languages || [],
  }), [facets]);

  return (
    <div className="pb-root">
      <div className="pb-page" style={{ maxWidth: 'none' }}>
        <div className="pb-head">
          <div className="pb-grow">
            <h1>Practice</h1>
            <p>Every problem in the library. Pick any one, any time. Run checks the examples; Submit checks every hidden test. Your first solve of a problem earns XP and coins.</p>
          </div>
          {prog && (
            <div className="pb-card pb-stat" style={{ minWidth: 240 }}>
              <div className="l">Solved</div>
              <div className="n">{prog.solved}<span className="pb-faint" style={{ fontSize: 16 }}> / {prog.total}</span></div>
              <div className="pb-diffbar" style={{ margin: '6px 0' }}><span style={{ width: `${pct}%`, background: 'var(--pb-ok)' }} /></div>
              <div className="pb-muted" style={{ fontSize: 12 }}>
                {(['easy', 'medium', 'hard'] as const).map((d) => `${d[0].toUpperCase() + d.slice(1)} ${prog.byDifficulty[d]?.solved ?? 0}/${prog.byDifficulty[d]?.total ?? 0}`).join(' · ')}
              </div>
            </div>
          )}
        </div>

        {data?.next && (
          <div className="pb-card" style={{ padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <i className="fa-solid fa-bolt" style={{ color: '#d97706' }} />
            <span>Up next for you: <b>{data.next.number}. {data.next.title}</b></span>
            <DifficultyPill d={data.next.difficulty} />
            <span className="pb-spacer" />
            <button className="pb-btn pb-btn-sm pb-btn-success" onClick={() => nav(`${base}/${data.next!._id}`)}>Solve it</button>
          </div>
        )}

        <div className="pb-card" style={{ padding: 12, marginBottom: 12 }}>
          <div className="pb-row pb-wrap" style={{ gap: 8 }}>
            <input className="pb-input" style={{ flex: '1 1 220px' }} placeholder="Search by title, topic, tag or number" value={text} onChange={(e) => setText(e.target.value)} aria-label="Search problems" />
            <select className="pb-select" style={{ width: 'auto' }} value={get('difficulty')} onChange={(e) => set({ difficulty: e.target.value })} aria-label="Difficulty">
              <option value="">Any difficulty</option>
              {(['easy', 'medium', 'hard'] as const).map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}{facets ? ` (${facets.difficulties[d] || 0})` : ''}</option>)}
            </select>
            <select className="pb-select" style={{ width: 'auto' }} value={get('topic')} onChange={(e) => set({ topic: e.target.value })} aria-label="Topic">
              <option value="">Any topic</option>
              {picks.topic.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.count})</option>)}
            </select>
            <select className="pb-select" style={{ width: 'auto' }} value={get('company')} onChange={(e) => set({ company: e.target.value })} aria-label="Company">
              <option value="">Any company</option>
              {picks.company.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.count})</option>)}
            </select>
            <select className="pb-select" style={{ width: 'auto' }} value={get('language')} onChange={(e) => set({ language: e.target.value })} aria-label="Language">
              <option value="">Any language</option>
              {picks.language.map((t) => <option key={t.name} value={t.name}>{LANG_SHORT[t.name] || t.name} ({t.count})</option>)}
            </select>
            <select className="pb-select" style={{ width: 'auto' }} value={get('sort') || 'number'} onChange={(e) => set({ sort: e.target.value === 'number' ? '' : e.target.value })} aria-label="Sort">
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="pb-row pb-wrap" style={{ gap: 6, marginTop: 10 }}>
            {STATUS.map(([v, l]) => (
              <button key={v} className={`pb-btn pb-btn-sm ${get('status') === v ? 'pb-btn-primary' : 'pb-btn-ghost'}`} onClick={() => set({ status: v })}>{l}</button>
            ))}
            {!!active.length && <button className="pb-btn pb-btn-ghost pb-btn-sm" onClick={() => { setText(''); setParams({}, { replace: true }); }}><i className="fa-solid fa-xmark" /> Clear filters</button>}
            {get('tag') && <span className="pb-tag">tag: {get('tag')}</span>}
          </div>
        </div>

        {err && <div className="pb-alert pb-alert-bad">{err}</div>}
        {!data && !err ? <div className="pb-muted"><span className="pb-spinner" /> Loading…</div> : data && (
          !data.rows.length ? (
            <div className="pb-card pb-empty"><h2>{active.length ? 'No problems match' : 'No problems yet'}</h2>
              <p className="pb-muted">{active.length ? 'Try removing a filter.' : 'Problems appear here as they are published.'}</p></div>
          ) : (
            <div className="pb-card" style={{ padding: 0, overflow: 'hidden' }}>
              {data.rows.map((r) => (
                <div key={r._id} onClick={() => nav(`${base}/${r._id}`)} role="link" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') nav(`${base}/${r._id}`); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--pb-line)', cursor: 'pointer', flexWrap: 'wrap' }}>
                  <span style={{ width: 22, textAlign: 'center' }} title={r.status === 'solved' ? 'Solved' : r.status === 'attempted' ? 'Attempted' : 'Not started'}>
                    {r.status === 'solved' ? <i className="fa-solid fa-circle-check" style={{ color: 'var(--pb-ok)' }} />
                      : r.status === 'attempted' ? <i className="fa-solid fa-circle-half-stroke" style={{ color: '#d97706' }} />
                        : <i className="fa-regular fa-circle pb-faint" />}
                  </span>
                  <span className="pb-faint" style={{ width: 40 }}>{r.number}</span>
                  <b style={{ flex: '1 1 220px' }}>{r.title}</b>
                  <span className="pb-row pb-wrap" style={{ gap: 4 }}>
                    {r.topics.slice(0, 3).map((t) => <span key={t} className="pb-tag" onClick={(e) => { e.stopPropagation(); set({ topic: t }); }}>{t}</span>)}
                    {r.companies.slice(0, 2).map((c) => <span key={c} className="pb-tag" style={{ background: '#fdf4ff', color: '#86198f' }}>{c}</span>)}
                  </span>
                  <span className="pb-muted" style={{ width: 54, textAlign: 'right', fontSize: 12.5 }}>{r.acceptance != null ? `${r.acceptance}%` : ''}</span>
                  <span style={{ width: 70, textAlign: 'right' }}><DifficultyPill d={r.difficulty} /></span>
                </div>
              ))}
            </div>
          )
        )}

        {data && data.pages > 1 && (
          <div className="pb-row" style={{ justifyContent: 'center', gap: 12, marginTop: 14 }}>
            <button className="pb-btn pb-btn-sm" disabled={data.page <= 1} onClick={() => set({ page: String(data.page - 1) }, true)}><i className="fa-solid fa-chevron-left" /> Previous</button>
            <span className="pb-muted">Page {data.page} of {data.pages} · {data.total} problems</span>
            <button className="pb-btn pb-btn-sm" disabled={data.page >= data.pages} onClick={() => set({ page: String(data.page + 1) }, true)}>Next <i className="fa-solid fa-chevron-right" /></button>
          </div>
        )}
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
  return /^[a-f0-9]{24}$/i.test(problemId || '') ? <Solve base={base} /> : legacy;
};

export default PracticeLibrary;
