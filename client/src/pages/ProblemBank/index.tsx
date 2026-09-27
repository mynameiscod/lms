import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { problemBankApi, pbError, PbListItem, PbMeta } from '../../api/problemBankApi';
import { DifficultyPill, LANG_SHORT, Menu, ScopePill, StatusPill, VerifyBadge, relTime, useToast } from './shared';
import ImportDialog from './ImportDialog';
import AiDialog from './AiDialog';
import MigrationDialog from './MigrationDialog';
import './ProblemBank.css';

/**
 * Problem Bank — the library.
 *
 * Laid out the way solvers already know from LeetCode's problem list (number, title, difficulty,
 * topics) with the author's columns HackerRank's content manager adds (languages, tests,
 * verification, status, ownership). Filters live in the URL-less state on purpose: this is an
 * authoring tool, not a shareable listing.
 */

const PAGE = 25;

const ProblemBank: React.FC = () => {
  const nav = useNavigate();
  const toast = useToast();
  const [meta, setMeta] = useState<PbMeta | null>(null);
  const [rows, setRows] = useState<PbListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [dialog, setDialog] = useState<'' | 'import' | 'ai' | 'migrate'>('');

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [difficulty, setDifficulty] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('');
  const [company, setCompany] = useState('');
  const [scope, setScope] = useState<'all' | 'global' | 'tenant'>('all');
  const [status, setStatus] = useState('');
  const [verification, setVerification] = useState('');
  const [sort, setSort] = useState('updated');
  const [page, setPage] = useState(1);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [debouncedQ, difficulty, topic, language, company, scope, status, verification, sort]);

  const loadMeta = useCallback(() => problemBankApi.meta().then(setMeta).catch((e) => setErr(pbError(e, 'Could not load the Problem Bank.'))), []);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await problemBankApi.list({
        q: debouncedQ || undefined, difficulty: difficulty.join(',') || undefined, topic: topic || undefined,
        language: language || undefined, company: company || undefined, scope, status: status || undefined,
        verification: verification || undefined, sort, page, limit: PAGE,
      });
      setRows(r.items); setTotal(r.total); setPages(r.pages); setErr('');
    } catch (e) { setErr(pbError(e, 'Could not load problems.')); }
    setLoading(false);
  }, [debouncedQ, difficulty, topic, language, company, scope, status, verification, sort, page]);
  useEffect(() => { load(); }, [load]);

  const refresh = () => { load(); loadMeta(); };
  const topicLabel = useMemo(() => Object.fromEntries((meta?.topics || []).map((t) => [t.key, t.label])), [meta]);
  const topicGroups = useMemo(() => {
    const g: Record<string, { key: string; label: string }[]> = {};
    (meta?.topics || []).forEach((t) => { (g[t.group] = g[t.group] || []).push(t); });
    return g;
  }, [meta]);
  const filtersOn = !!(q || difficulty.length || topic || language || company || scope !== 'all' || status || verification);
  const clearFilters = () => { setQ(''); setDifficulty([]); setTopic(''); setLanguage(''); setCompany(''); setScope('all'); setStatus(''); setVerification(''); };

  const act = async (fn: () => Promise<any>, ok: string) => {
    try { await fn(); toast.show(ok); refresh(); } catch (e) { toast.show(pbError(e), true); }
  };

  const s = meta?.stats;
  const pct = (n: number) => (s && s.total ? `${(n / s.total) * 100}%` : '0%');

  return (
    <div className="pb-root">
      <div className="pb-page">
        <div className="pb-head">
          <div className="pb-grow">
            <h1>Problem Bank</h1>
            <p>One home for every runnable coding problem — authored once, used across the LMS, CareerPilot, exams and the API.
              {meta?.canEditGlobal ? ' You can edit the CodeBegun global library.' : ' CodeBegun library problems are read-only; duplicate one to customise it.'}</p>
          </div>
          <div className="pb-row pb-wrap">
            <Menu trigger={<button className="pb-btn"><i className="fa-solid fa-ellipsis" /> More</button>}>
              {(close) => <>
                <button onClick={() => { close(); problemBankApi.downloadTemplate('json'); }}><i className="fa-solid fa-file-code" /> Download JSON template</button>
                <button onClick={() => { close(); problemBankApi.downloadTemplate('csv'); }}><i className="fa-solid fa-file-csv" /> Download CSV template</button>
                <hr />
                <button onClick={() => { close(); setDialog('migrate'); }}><i className="fa-solid fa-right-to-bracket" /> Bring in problems from other modules</button>
              </>}
            </Menu>
            <button className="pb-btn" onClick={() => setDialog('import')}><i className="fa-solid fa-file-import" /> Import</button>
            <button className="pb-btn" onClick={() => setDialog('ai')}><i className="fa-solid fa-wand-magic-sparkles" /> Generate with AI</button>
            <button className="pb-btn pb-btn-primary" onClick={() => nav('/problem-bank/new')}><i className="fa-solid fa-plus" /> New problem</button>
          </div>
        </div>

        {s && (
          <div className="pb-stats">
            <div className="pb-card pb-stat">
              <div className="l">Problems</div>
              <div className="n">{s.total.toLocaleString()}</div>
              <div className="pb-muted" style={{ fontSize: 12.5 }}>{s.global.toLocaleString()} CodeBegun · {s.mine.toLocaleString()} your institute</div>
            </div>
            <div className="pb-card pb-stat">
              <div className="l">By difficulty</div>
              <div className="pb-diffbar">
                <span style={{ width: pct(s.easy), background: 'var(--pb-easy)' }} />
                <span style={{ width: pct(s.medium), background: '#f59e0b' }} />
                <span style={{ width: pct(s.hard), background: 'var(--pb-hard)' }} />
              </div>
              <div className="pb-row" style={{ gap: 14, fontSize: 12.5 }}>
                <span><b style={{ color: 'var(--pb-easy)' }}>{s.easy}</b> Easy</span>
                <span><b style={{ color: 'var(--pb-medium)' }}>{s.medium}</b> Medium</span>
                <span><b style={{ color: 'var(--pb-hard)' }}>{s.hard}</b> Hard</span>
              </div>
            </div>
            <div className="pb-card pb-stat">
              <div className="l">Published</div>
              <div className="n">{s.published.toLocaleString()}</div>
              <div className="pb-muted" style={{ fontSize: 12.5 }}>visible to learners</div>
            </div>
            <div className="pb-card pb-stat">
              <div className="l">Verified</div>
              <div className="n">{s.total ? Math.round((s.verified / s.total) * 100) : 0}%</div>
              <div className="pb-muted" style={{ fontSize: 12.5 }}>solutions pass every test</div>
            </div>
          </div>
        )}

        <div className="pb-card pb-filters">
          <div className="pb-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input className="pb-input" placeholder="Search title, tag, company or #number" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="pb-seg" role="group" aria-label="Difficulty">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button key={d} className={difficulty.includes(d) ? 'on' : ''}
                onClick={() => setDifficulty((x) => x.includes(d) ? x.filter((y) => y !== d) : [...x, d])}>{d[0].toUpperCase() + d.slice(1)}</button>
            ))}
          </div>
          <select className="pb-select" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Topic">
            <option value="">All topics</option>
            {Object.entries(topicGroups).map(([g, ts]) => (
              <optgroup key={g} label={g}>{ts.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>
            ))}
          </select>
          <select className="pb-select" value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language">
            <option value="">All languages</option>
            {(meta?.languages || []).map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            <option value="sql">SQL</option>
          </select>
          {!!s?.companies.length && (
            <select className="pb-select" value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company">
              <option value="">All companies</option>
              {s.companies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select className="pb-select" value={scope} onChange={(e) => setScope(e.target.value as any)} aria-label="Owner">
            <option value="all">All owners</option>
            <option value="global">CodeBegun library</option>
            <option value="tenant">My institute</option>
          </select>
          <select className="pb-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Draft & published</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <select className="pb-select" value={verification} onChange={(e) => setVerification(e.target.value)} aria-label="Verification">
            <option value="">Any verification</option>
            <option value="verified">Verified</option>
            <option value="failed">Failing</option>
            <option value="stale">Needs re-verify</option>
            <option value="unverified">Not verified</option>
          </select>
          <select className="pb-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="updated">Recently updated</option>
            <option value="newest">Newest</option>
            <option value="number">Number</option>
            <option value="title">Title A–Z</option>
            <option value="difficulty">Difficulty</option>
          </select>
          {filtersOn && <button className="pb-btn pb-btn-ghost pb-btn-sm" onClick={clearFilters}><i className="fa-solid fa-xmark" /> Clear</button>}
        </div>

        {err && <div className="pb-alert pb-alert-bad">{err}</div>}

        {!loading && !rows.length && !filtersOn ? (
          <div className="pb-card pb-empty">
            <h2>Start your problem bank</h2>
            <p className="pb-muted">Add problems one at a time, bring in a whole set from a file, or let AI draft them — every answer is checked by actually running the code.</p>
            <div className="pb-create-cards">
              <div className="pb-create-card" onClick={() => nav('/problem-bank/new')}>
                <div className="ic"><i className="fa-solid fa-pen-to-square" /></div><b>Write a problem</b>
                <span className="pb-muted">Statement, tests, starter code and solutions in the studio, with a live test runner.</span>
              </div>
              <div className="pb-create-card" onClick={() => setDialog('import')}>
                <div className="ic"><i className="fa-solid fa-file-import" /></div><b>Import a file</b>
                <span className="pb-muted">JSON, CSV or Excel. Preview every row before anything is saved.</span>
              </div>
              <div className="pb-create-card" onClick={() => setDialog('ai')}>
                <div className="ic"><i className="fa-solid fa-wand-magic-sparkles" /></div><b>Generate with AI</b>
                <span className="pb-muted">Pick a topic and difficulty. Solutions are run to produce verified answers.</span>
              </div>
            </div>
            <button className="pb-btn pb-btn-ghost" style={{ marginTop: 18 }} onClick={() => setDialog('migrate')}>
              <i className="fa-solid fa-right-to-bracket" /> Or bring in the coding problems already in Assignments, Thinking Lab and the exam bank
            </button>
          </div>
        ) : (
          <div className="pb-card">
            <div className="pb-table-wrap">
              <table className="pb-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#</th><th>Title</th><th>Difficulty</th><th>Languages</th><th>Tests</th>
                    <th>Verification</th><th>Status</th><th>Owner</th><th>Updated</th><th style={{ width: 44 }} />
                  </tr>
                </thead>
                <tbody>
                  {loading && !rows.length && (
                    <tr><td colSpan={10} className="pb-muted" style={{ textAlign: 'center', padding: 36 }}><span className="pb-spinner" /> Loading…</td></tr>
                  )}
                  {!loading && !rows.length && (
                    <tr><td colSpan={10} className="pb-muted" style={{ textAlign: 'center', padding: 36 }}>No problems match these filters.</td></tr>
                  )}
                  {rows.map((p) => (
                    <tr key={p._id} onClick={() => nav(`/problem-bank/${p._id}`)}>
                      <td className="pb-muted pb-mono">{p.scope === 'global' ? '' : 'I-'}{p.number}</td>
                      <td className="pb-title-cell">
                        <div className="t">{p.title}{p.kind === 'sql' && <span className="pb-tag" style={{ marginLeft: 6 }}>SQL</span>}</div>
                        <div className="sub">
                          {p.topics.slice(0, 3).map((t) => <span key={t} className="pb-tag">{topicLabel[t] || t}</span>)}
                          {p.topics.length > 3 && <span className="pb-faint" style={{ fontSize: 12 }}>+{p.topics.length - 3}</span>}
                          {p.companies.slice(0, 2).map((c) => <span key={c} className="pb-tag" style={{ background: '#fdf4ff', color: '#86198f' }}>{c}</span>)}
                        </div>
                      </td>
                      <td><DifficultyPill d={p.difficulty} /><div className="pb-faint" style={{ fontSize: 11.5, marginTop: 3 }}>{p.marks} marks</div></td>
                      <td><div className="pb-langs">{p.languages.map((l) => <span key={l} className="pb-lang">{LANG_SHORT[l] || l}</span>)}{!p.languages.length && <span className="pb-faint">—</span>}</div></td>
                      <td className="pb-muted" style={{ whiteSpace: 'nowrap' }}>{p.testCount} <span className="pb-faint">({p.sampleCount} sample)</span></td>
                      <td><VerifyBadge s={p.verification?.status} /></td>
                      <td><StatusPill s={p.status} /></td>
                      <td><ScopePill scope={p.scope} /></td>
                      <td className="pb-muted" style={{ whiteSpace: 'nowrap' }}>{relTime(p.updatedAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Menu trigger={<button className="pb-btn pb-btn-ghost pb-btn-icon" aria-label="Actions"><i className="fa-solid fa-ellipsis-vertical" /></button>}>
                          {(close) => <>
                            <button onClick={() => { close(); nav(`/problem-bank/${p._id}`); }}><i className="fa-solid fa-pen" /> {p.editable ? 'Open in studio' : 'View'}</button>
                            <button onClick={() => { close(); act(() => problemBankApi.duplicate(p._id), 'Copied to your institute as a draft.'); }}><i className="fa-solid fa-copy" /> Duplicate to my institute</button>
                            {p.editable && p.status !== 'published' && (
                              <button onClick={() => { close(); act(() => problemBankApi.setStatus(p._id, 'published'), 'Published.'); }}><i className="fa-solid fa-upload" /> Publish</button>
                            )}
                            {p.editable && p.status === 'published' && (
                              <button onClick={() => { close(); act(() => problemBankApi.setStatus(p._id, 'draft'), 'Moved back to draft.'); }}><i className="fa-solid fa-eye-slash" /> Unpublish</button>
                            )}
                            {meta?.canEditGlobal && p.scope === 'tenant' && p.editable && (
                              <button onClick={() => { close(); act(() => problemBankApi.promote(p._id), 'Moved to the CodeBegun global library.'); }}><i className="fa-solid fa-globe" /> Move to CodeBegun library</button>
                            )}
                            {p.editable && <>
                              <hr />
                              <button className="pb-btn-danger" onClick={() => {
                                close();
                                if (window.confirm(`Remove "${p.title}"? A problem that was ever published is archived instead of deleted.`)) {
                                  act(() => problemBankApi.remove(p._id), 'Removed.');
                                }
                              }}><i className="fa-solid fa-trash" style={{ color: 'var(--pb-bad)' }} /> Delete / archive</button>
                            </>}
                          </>}
                        </Menu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 0 && (
              <div className="pb-pager">
                <span className="pb-muted">{((page - 1) * PAGE + 1).toLocaleString()}–{Math.min(page * PAGE, total).toLocaleString()} of {total.toLocaleString()}</span>
                <span className="pb-spacer" />
                <button className="pb-btn pb-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><i className="fa-solid fa-chevron-left" /> Prev</button>
                <span className="pb-muted">Page {page} of {pages}</span>
                <button className="pb-btn pb-btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next <i className="fa-solid fa-chevron-right" /></button>
              </div>
            )}
          </div>
        )}
      </div>

      {dialog === 'import' && meta && <ImportDialog canGlobal={meta.canEditGlobal} onClose={() => setDialog('')} onDone={(n) => { setDialog(''); toast.show(`Imported ${n} problem(s) as drafts.`); refresh(); }} />}
      {dialog === 'ai' && meta && <AiDialog meta={meta} onClose={() => setDialog('')} onSaved={(n) => { toast.show(`Saved ${n} draft(s).`); refresh(); }} />}
      {dialog === 'migrate' && <MigrationDialog onClose={() => setDialog('')} onDone={(n) => { toast.show(`Brought in ${n} problem(s) as drafts.`); refresh(); }} />}
      {toast.node}
    </div>
  );
};

export default ProblemBank;
