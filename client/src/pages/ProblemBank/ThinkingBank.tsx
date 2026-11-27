import React, { useCallback, useEffect, useState } from 'react';
import passportApi, { ThinkingBankMeta, ThinkingQuestionDetail, ThinkingQuestionRow, ThinkingStatus, ThinkingType } from '../../api/passportApi';
import { pbError } from '../../api/problemBankApi';
import { BankTabs } from './Sets';
import { DifficultyPill, Menu, Modal, relTime, useToast } from './shared';
import './ProblemBank.css';
import './thinkingBank.css';

/**
 * Problem Bank → Thinking Lab.
 *
 * The questions CareerPilot's Thinking Lab serves: math puzzles, logical thinking, critical thinking
 * and coding. One bank for every institute, written here (by hand or drafted with AI) and published
 * by a super admin or a role they gave the permission. Kept apart from the coding problems on the
 * other tab, so a puzzle can never reach Practice or an exam.
 */

const TYPE_ICON: Record<ThinkingType, string> = { math: 'fa-calculator', logical: 'fa-puzzle-piece', critical: 'fa-scale-balanced', coding: 'fa-code' };
const STATUS_CLS: Record<ThinkingStatus, string> = { PUBLISHED: 'pb-badge-ok', DRAFT: 'pb-badge-neutral', RETIRED: 'pb-badge-warn' };
const STATUS_LABEL: Record<ThinkingStatus, string> = { PUBLISHED: 'Published', DRAFT: 'Draft', RETIRED: 'Retired' };

type Draft = Omit<ThinkingQuestionDetail, 'estimatedMinutes' | 'order'> & { estimatedMinutes: string; order: string };

const blank = (type: ThinkingType): Draft => ({
  id: '', number: 0, code: '', type, subCategory: '', difficulty: 'easy', years: [], title: '', status: 'DRAFT', source: 'manual',
  order: '', timesServed: 0, timesSolved: 0, ready: false, updatedAt: '', statement: '', imageUrl: '',
  answerFormat: type === 'critical' ? 'choice' : type === 'math' ? 'number' : 'text', choices: type === 'critical' ? ['', '', '', ''] : [],
  answer: '', acceptedAnswers: [], keySteps: ['', '', ''], explanation: '', hints: [], estimatedMinutes: '',
  language: 'python', starterCode: '', examples: [], testCases: [{ input: '', expectedOutput: '', hidden: false }], referenceSolution: '', topics: [],
  problems: [], approvedAt: null,
});
const toDraft = (q: ThinkingQuestionDetail): Draft => ({ ...q, estimatedMinutes: q.estimatedMinutes == null ? '' : String(q.estimatedMinutes), order: q.order == null ? '' : String(q.order) });

const ThinkingBank: React.FC = () => {
  const toast = useToast();
  const [meta, setMeta] = useState<ThinkingBankMeta | null>(null);
  const [rows, setRows] = useState<ThinkingQuestionRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [year, setYear] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<Draft | null>(null);
  const [ai, setAi] = useState(false);

  const loadMeta = useCallback(() => passportApi.thinkingBankMeta().then(setMeta).catch((e) => setErr(pbError(e, 'Could not load the question bank.'))), []);
  const load = useCallback(() => {
    passportApi.thinkingBankList({ type, difficulty, year, status, q: q.trim(), page })
      .then((r) => { setRows(r.questions); setTotal(r.total); setPages(r.pages); setErr(''); })
      .catch((e) => setErr(pbError(e, 'Could not load the questions.')));
  }, [type, difficulty, year, status, q, page]);
  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { const t = window.setTimeout(load, q ? 250 : 0); return () => window.clearTimeout(t); }, [load, q]);
  useEffect(() => { setPage(1); }, [type, difficulty, year, status, q]);
  const refresh = () => { load(); loadMeta(); };

  const open = async (id: string) => {
    try { setEdit(toDraft((await passportApi.thinkingBankGet(id)).question)); }
    catch (e) { toast.show(pbError(e, 'Could not open the question.'), true); }
  };
  const setQuestionStatus = async (r: ThinkingQuestionRow, next: ThinkingStatus) => {
    try {
      const { question } = await passportApi.thinkingBankGet(r.id);
      await passportApi.thinkingBankSave(r.id, { ...question, status: next });
      toast.show(next === 'PUBLISHED' ? `${r.code} is published.` : next === 'RETIRED' ? `${r.code} is retired. Members will not be given it again.` : `${r.code} is back to draft.`);
      refresh();
    } catch (e: any) {
      const problems: string[] = e?.response?.data?.problems || [];
      toast.show(problems.length ? `${r.code} is not ready: ${problems[0]}` : pbError(e, 'Could not change it.'), true);
    }
  };
  const remove = async (r: ThinkingQuestionRow) => {
    if (!window.confirm(`Delete ${r.code} “${r.title}”? This cannot be undone.`)) return;
    try { await passportApi.thinkingBankDelete(r.id); toast.show(`${r.code} deleted.`); refresh(); }
    catch (e) { toast.show(pbError(e, 'Could not delete it.'), true); }
  };

  const typeLabel = (t: string) => meta?.types.find((x) => x.key === t)?.label || t;
  const yearLabel = (k: string) => meta?.years.find((y) => y.key === k)?.label || k;

  return (
    <div className="pb-root tb">
      <div className="pb-page">
        <div className="pb-head">
          <div className="pb-grow">
            <h1>Problem Bank</h1>
            <p>Thinking Lab questions for CareerPilot members in every institute: math puzzles, logical and critical thinking, and coding from Year 2. Members only see published questions.</p>
          </div>
          <div className="pb-row pb-wrap">
            <button className="pb-btn" onClick={() => setAi(true)} disabled={!meta}><i className="fa-solid fa-wand-magic-sparkles" /> Draft with AI</button>
            <Menu trigger={<button className="pb-btn pb-btn-primary" disabled={!meta}><i className="fa-solid fa-plus" /> New question <i className="fa-solid fa-chevron-down" style={{ fontSize: 11 }} /></button>}>
              {(close) => <>{(meta?.types || []).map((t) => (
                <button key={t.key} onClick={() => { close(); setEdit(blank(t.key)); }}><i className={`fa-solid ${TYPE_ICON[t.key]}`} /> {t.label}</button>
              ))}</>}
            </Menu>
          </div>
        </div>

        <BankTabs active="thinking" />

        {meta && (
          <div className="pb-stats tb-stats">
            {meta.types.map((t) => {
              const c = meta.stats.byType[t.key] || { published: 0, total: 0 };
              return (
                <button key={t.key} className={`pb-card pb-stat tb-stat${type === t.key ? ' on' : ''}`} onClick={() => setType(type === t.key ? '' : t.key)} aria-pressed={type === t.key}>
                  <div className="l"><i className={`fa-solid ${TYPE_ICON[t.key]}`} /> {t.label}</div>
                  <div className="n">{c.published.toLocaleString()}</div>
                  <div className="pb-muted" style={{ fontSize: 12.5 }}>published · {c.total.toLocaleString()} in all</div>
                </button>
              );
            })}
          </div>
        )}

        <div className="pb-card pb-filters">
          <div className="pb-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input className="pb-input" placeholder="Search title, sub-category or TQ number" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="pb-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
            <option value="">All types</option>
            {(meta?.types || []).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <div className="pb-seg" role="group" aria-label="Difficulty">
            {(meta?.difficulties || ['easy', 'medium', 'hard']).map((d) => (
              <button key={d} className={difficulty === d ? 'on' : ''} onClick={() => setDifficulty(difficulty === d ? '' : d)}>{d[0].toUpperCase() + d.slice(1)}</button>
            ))}
          </div>
          <select className="pb-select" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year">
            <option value="">All years</option>
            {(meta?.years || []).map((y) => <option key={y.key} value={y.key}>{y.label}</option>)}
          </select>
          <select className="pb-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Any status</option>
            {(['DRAFT', 'PUBLISHED', 'RETIRED'] as ThinkingStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}{meta ? ` (${meta.stats.byStatus[s] || 0})` : ''}</option>)}
          </select>
        </div>

        {err && <div className="pb-alert pb-alert-bad">{err}</div>}

        <div className="pb-card">
          {!rows ? <div className="pb-empty"><span className="pb-spinner" /> Loading…</div>
            : !rows.length ? (
              <div className="pb-empty">
                <i className="fa-solid fa-lightbulb" style={{ fontSize: 26, color: 'var(--pb-faint)' }} />
                <div><b>{type || difficulty || year || status || q ? 'No question matches these filters.' : 'No Thinking Lab questions yet.'}</b></div>
                {!(type || difficulty || year || status || q) && <div className="pb-muted">Write one with “New question”, or let AI draft a few for you to check and publish.</div>}
              </div>
            ) : <>
              <div className="pb-table-wrap">
                <table className="pb-table tb-table">
                  <thead><tr><th>Question</th><th>Type</th><th>Difficulty</th><th>Years</th><th>Status</th><th>Used</th><th aria-label="Actions" /></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} onClick={() => open(r.id)} style={{ cursor: 'pointer' }}>
                        <td className="pb-title-cell">
                          <div className="t">{r.title}</div>
                          <div className="sub">
                            <span className="pb-mono pb-muted">{r.code}</span>
                            {r.subCategory && <span className="pb-tag">{r.subCategory}</span>}
                            {r.source === 'ai' && <span className="pb-tag" title="Drafted by AI — check it before publishing"><i className="fa-solid fa-wand-magic-sparkles" /> AI draft</span>}
                            {r.source === 'migrated' && <span className="pb-tag" title="Copied from the old per-institute Thinking Lab bank">Copied</span>}
                            {r.status !== 'PUBLISHED' && !r.ready && <span className="pb-tag tb-incomplete" title="Not complete enough to publish">Incomplete</span>}
                          </div>
                        </td>
                        <td><span className="tb-type"><i className={`fa-solid ${TYPE_ICON[r.type]}`} /> {typeLabel(r.type)}</span></td>
                        <td><DifficultyPill d={r.difficulty} /></td>
                        <td className="pb-muted tb-years">{r.years.length ? r.years.map(yearLabel).join(', ') : r.type === 'coding' ? 'Year 2 onward' : 'All years'}</td>
                        <td><span className={`pb-pill ${STATUS_CLS[r.status]}`}><span className="pb-dot" /> {STATUS_LABEL[r.status]}</span></td>
                        <td className="pb-muted" title={`Given ${r.timesServed} times, solved ${r.timesSolved} times`}>{r.timesServed ? `${r.timesSolved}/${r.timesServed} solved` : '—'}<div className="tb-when">{relTime(r.updatedAt)}</div></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <Menu trigger={<button className="pb-btn pb-btn-ghost pb-btn-icon" aria-label={`Actions for ${r.code}`}><i className="fa-solid fa-ellipsis" /></button>}>
                            {(close) => <>
                              <button onClick={() => { close(); open(r.id); }}><i className="fa-solid fa-pen" /> Edit</button>
                              {r.status !== 'PUBLISHED' && <button onClick={() => { close(); setQuestionStatus(r, 'PUBLISHED'); }}><i className="fa-solid fa-upload" /> Publish</button>}
                              {r.status === 'PUBLISHED' && <button onClick={() => { close(); setQuestionStatus(r, 'DRAFT'); }}><i className="fa-solid fa-eye-slash" /> Back to draft</button>}
                              {r.status !== 'RETIRED' && r.timesServed > 0 && <button onClick={() => { close(); setQuestionStatus(r, 'RETIRED'); }}><i className="fa-solid fa-box-archive" /> Retire</button>}
                              {r.timesServed === 0 && <><hr /><button className="pb-btn-danger" onClick={() => { close(); remove(r); }}><i className="fa-solid fa-trash" style={{ color: 'var(--pb-bad)' }} /> Delete</button></>}
                            </>}
                          </Menu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pages > 1 && (
                <div className="pb-pager">
                  <span className="pb-muted">{((page - 1) * 25 + 1).toLocaleString()}–{Math.min(page * 25, total).toLocaleString()} of {total.toLocaleString()}</span>
                  <span className="pb-spacer" />
                  <button className="pb-btn pb-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><i className="fa-solid fa-chevron-left" /> Prev</button>
                  <button className="pb-btn pb-btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next <i className="fa-solid fa-chevron-right" /></button>
                </div>
              )}
            </>}
        </div>
      </div>

      {edit && meta && <Editor draft={edit} meta={meta} onClose={() => setEdit(null)} onSaved={(m) => { setEdit(null); toast.show(m); refresh(); }} />}
      {ai && meta && <AiDrafts meta={meta} onClose={() => setAi(false)} onDone={(n, failed) => { setAi(false); setStatus('DRAFT'); toast.show(`${n} AI draft${n === 1 ? '' : 's'} added${failed ? ` (${failed} could not be used)` : ''}. Check each one, then publish.`); refresh(); }} />}
      {toast.node}
    </div>
  );
};

/** A list of short lines (key steps, hints, choices, other accepted answers), edited one per box. */
const Lines: React.FC<{ label: React.ReactNode; values: string[]; onChange: (v: string[]) => void; max: number; placeholder: (i: number) => string; numbered?: boolean; min?: number }> =
  ({ label, values, onChange, max, placeholder, numbered, min = 0 }) => (
    <div className="tb-lines">
      <label className="pb-label">{label}</label>
      {values.map((v, i) => (
        <div key={i} className="tb-line">
          {numbered && <span className="tb-n">{i + 1}</span>}
          <input className="pb-input" value={v} placeholder={placeholder(i)} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className="pb-btn pb-btn-ghost pb-btn-icon" disabled={values.length <= min} onClick={() => onChange(values.filter((_, j) => j !== i))} aria-label="Remove"><i className="fa-solid fa-xmark" /></button>
        </div>
      ))}
      {values.length < max && <button type="button" className="pb-linkbtn" onClick={() => onChange([...values, ''])}><i className="fa-solid fa-plus" /> Add</button>}
    </div>
  );

const Editor: React.FC<{ draft: Draft; meta: ThinkingBankMeta; onClose: () => void; onSaved: (msg: string) => void }> = ({ draft, meta, onClose, onSaved }) => {
  const [d, setD] = useState<Draft>(draft);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>(draft.id && draft.status !== 'PUBLISHED' ? draft.problems : []);
  const [err, setErr] = useState('');
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const coding = d.type === 'coding';
  const typeMeta = meta.types.find((t) => t.key === d.type);

  const save = async (status: ThinkingStatus) => {
    if (!d.title.trim()) { setErr('Give it a title.'); return; }
    setBusy(true); setErr(''); setProblems([]);
    try {
      const body: any = { ...d, status, estimatedMinutes: d.estimatedMinutes === '' ? null : Number(d.estimatedMinutes), order: d.order === '' ? null : Number(d.order) };
      const { question } = await passportApi.thinkingBankSave(d.id || null, body);
      onSaved(status === 'PUBLISHED' ? `${question.code} is published.` : `${question.code} saved${question.problems.length ? ' as a draft. Finish it before publishing.' : '.'}`);
    } catch (e: any) {
      const list: string[] = e?.response?.data?.problems || [];
      if (list.length) setProblems(list); else setErr(pbError(e, 'Could not save the question.'));
    }
    setBusy(false);
  };

  return (
    <Modal wide onClose={() => { if (!busy) onClose(); }}
      title={<><i className={`fa-solid ${TYPE_ICON[d.type]}`} style={{ color: 'var(--pb-accent)' }} /> {d.id ? `${d.code} · ${typeMeta?.label}` : `New ${typeMeta?.label.toLowerCase()} question`}</>}
      footer={<>
        {d.id && <span className={`pb-pill ${STATUS_CLS[d.status]}`}><span className="pb-dot" /> {STATUS_LABEL[d.status]}</span>}
        <span className="pb-spacer" />
        <button className="pb-btn" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="pb-btn" disabled={busy} onClick={() => save(d.status === 'PUBLISHED' ? 'DRAFT' : d.status === 'RETIRED' ? 'RETIRED' : 'DRAFT')}>{d.status === 'PUBLISHED' ? 'Save as draft' : 'Save draft'}</button>
        <button className="pb-btn pb-btn-primary" disabled={busy} onClick={() => save('PUBLISHED')}>{busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-upload" />} {d.status === 'PUBLISHED' ? 'Save' : 'Publish'}</button>
      </>}>
      {d.source === 'ai' && d.status !== 'PUBLISHED' && <div className="pb-alert pb-alert-warn">Drafted by AI. Work the answer out yourself and check every key step before publishing.</div>}
      {(problems.length > 0) && <div className="pb-alert pb-alert-bad"><b>Not ready to publish:</b><ul className="tb-problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul></div>}
      {err && <div className="pb-alert pb-alert-bad">{err}</div>}

      <div className="pb-field-row tb-row3">
        <div>
          <label className="pb-label">Sub-category</label>
          <input className="pb-input" list={`tb-sub-${d.type}`} value={d.subCategory} maxLength={60} placeholder={typeMeta?.suggestions[0]} onChange={(e) => set({ subCategory: e.target.value })} />
          <datalist id={`tb-sub-${d.type}`}>{typeMeta?.suggestions.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div>
          <label className="pb-label">Difficulty</label>
          <div className="pb-seg">{meta.difficulties.map((x) => <button key={x} type="button" className={d.difficulty === x ? 'on' : ''} onClick={() => set({ difficulty: x })}>{x[0].toUpperCase() + x.slice(1)}</button>)}</div>
        </div>
        <div>
          <label className="pb-label">Minutes <small>optional</small></label>
          <input className="pb-input" type="number" min={1} max={120} value={d.estimatedMinutes} placeholder="5" onChange={(e) => set({ estimatedMinutes: e.target.value })} />
        </div>
      </div>

      <label className="pb-label">Years <small>{coding ? 'none ticked = Year 2 onward · coding is never given in Year 1' : 'none ticked = every year'}</small></label>
      <div className="pb-chips">
        {meta.years.map((y) => {
          const on = d.years.includes(y.key);
          const off = coding && y.key === 'foundation';
          return <button key={y.key} type="button" disabled={off} className={`pb-chip ${on ? 'on' : ''}`} onClick={() => set({ years: on ? d.years.filter((k) => k !== y.key) : [...d.years, y.key] })}>{y.label}</button>;
        })}
      </div>

      <label className="pb-label">Title</label>
      <input className="pb-input" value={d.title} maxLength={120} placeholder={coding ? 'Sum of even numbers' : 'The three light switches'} onChange={(e) => set({ title: e.target.value })} />

      <label className="pb-label">Question</label>
      <textarea className="pb-textarea" rows={6} value={d.statement} onChange={(e) => set({ statement: e.target.value })}
        placeholder={coding ? 'What the program reads, what it prints, and an example.' : 'The full question, exactly as the member will read it.'} />

      {!coding ? <>
        <div className="pb-field-row">
          <div>
            <label className="pb-label">Answer is</label>
            <div className="pb-seg">
              {(['number', 'text', 'choice'] as const).map((f) => (
                <button key={f} type="button" className={d.answerFormat === f ? 'on' : ''} onClick={() => set({ answerFormat: f, choices: f === 'choice' && !d.choices.length ? ['', '', '', ''] : d.choices })}>
                  {f === 'number' ? 'A number' : f === 'text' ? 'Short text' : 'A choice'}
                </button>
              ))}
            </div>
          </div>
          {d.answerFormat !== 'choice' && (
            <div>
              <label className="pb-label">Correct answer</label>
              <input className="pb-input" value={d.answer} inputMode={d.answerFormat === 'number' ? 'decimal' : undefined} placeholder={d.answerFormat === 'number' ? '42' : 'Switch B'} onChange={(e) => set({ answer: e.target.value })} />
            </div>
          )}
        </div>
        {d.answerFormat === 'choice' && (
          <div className="tb-lines">
            <label className="pb-label">Choices <small>tick the correct one</small></label>
            {d.choices.map((c, i) => (
              <div key={i} className="tb-line">
                <input type="radio" name="tb-correct" aria-label={`Choice ${i + 1} is correct`} checked={!!c && d.answer === c} onChange={() => set({ answer: c })} />
                <input className="pb-input" value={c} placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                  onChange={(e) => set({ choices: d.choices.map((x, j) => (j === i ? e.target.value : x)), answer: d.answer === c ? e.target.value : d.answer })} />
                <button type="button" className="pb-btn pb-btn-ghost pb-btn-icon" disabled={d.choices.length <= 2} onClick={() => set({ choices: d.choices.filter((_, j) => j !== i), answer: d.answer === c ? '' : d.answer })} aria-label="Remove choice"><i className="fa-solid fa-xmark" /></button>
              </div>
            ))}
            {d.choices.length < 6 && <button type="button" className="pb-linkbtn" onClick={() => set({ choices: [...d.choices, ''] })}><i className="fa-solid fa-plus" /> Add a choice</button>}
          </div>
        )}
        {d.answerFormat !== 'choice' && (
          <Lines label={<>Other accepted answers <small>optional · e.g. “1/2” and “0.5”</small></>} values={d.acceptedAnswers} max={10} onChange={(v) => set({ acceptedAnswers: v })} placeholder={() => 'Another way to write the same answer'} />
        )}
        <Lines label={<>Key steps <small>{meta.limits.keyStepsMin}–{meta.limits.keyStepsMax} steps a correct reasoning must contain · partial XP is counted from these</small></>}
          values={d.keySteps} max={meta.limits.keyStepsMax} min={1} numbered onChange={(v) => set({ keySteps: v })} placeholder={(i) => ['Notice what is given', 'Set up the relationship', 'Work out the result'][i] || 'Another step'} />
        <label className="pb-label">Model explanation <small>shown after the member answers</small></label>
        <textarea className="pb-textarea" rows={4} value={d.explanation} onChange={(e) => set({ explanation: e.target.value })} placeholder="The full reasoning, step by step." />
      </> : <>
        <div className="pb-field-row">
          <div>
            <label className="pb-label">Starting language</label>
            <select className="pb-select" value={d.language} onChange={(e) => set({ language: e.target.value })}>
              {['python', 'javascript', 'java', 'cpp', 'c'].map((l) => <option key={l} value={l}>{l === 'cpp' ? 'C++' : l[0].toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="pb-label">Topics <small>comma separated · a member is given it only after learning these</small></label>
            <input className="pb-input" value={d.topics.join(', ')} placeholder="loops, lists" onChange={(e) => set({ topics: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </div>
        </div>
        <label className="pb-label">Starter code <small>optional</small></label>
        <textarea className="pb-textarea pb-mono" rows={4} value={d.starterCode} onChange={(e) => set({ starterCode: e.target.value })} />
        <div className="tb-lines">
          <label className="pb-label">Test cases <small>input, then the exact expected output</small></label>
          {d.testCases.map((t, i) => (
            <div key={i} className="tb-test">
              <textarea className="pb-textarea pb-mono" rows={2} value={t.input} placeholder="Input" onChange={(e) => set({ testCases: d.testCases.map((x, j) => (j === i ? { ...x, input: e.target.value } : x)) })} />
              <textarea className="pb-textarea pb-mono" rows={2} value={t.expectedOutput} placeholder="Expected output" onChange={(e) => set({ testCases: d.testCases.map((x, j) => (j === i ? { ...x, expectedOutput: e.target.value } : x)) })} />
              <div className="tb-test-side">
                <label className="tb-hidden"><input type="checkbox" checked={t.hidden} onChange={(e) => set({ testCases: d.testCases.map((x, j) => (j === i ? { ...x, hidden: e.target.checked } : x)) })} /> Hidden</label>
                <button type="button" className="pb-btn pb-btn-ghost pb-btn-icon" disabled={d.testCases.length <= 1} onClick={() => set({ testCases: d.testCases.filter((_, j) => j !== i) })} aria-label="Remove test"><i className="fa-solid fa-xmark" /></button>
              </div>
            </div>
          ))}
          <button type="button" className="pb-linkbtn" onClick={() => set({ testCases: [...d.testCases, { input: '', expectedOutput: '', hidden: true }] })}><i className="fa-solid fa-plus" /> Add a test</button>
        </div>
        <label className="pb-label">Explanation <small>optional · shown after solving</small></label>
        <textarea className="pb-textarea" rows={3} value={d.explanation} onChange={(e) => set({ explanation: e.target.value })} />
      </>}

      <Lines label={<>Hints <small>optional · up to {meta.limits.hintsMax}, gentle first</small></>} values={d.hints} max={meta.limits.hintsMax} onChange={(v) => set({ hints: v })} placeholder={(i) => ['A gentle nudge', 'A bigger clue', 'Almost the whole idea'][i] || 'Hint'} />
    </Modal>
  );
};

const AiDrafts: React.FC<{ meta: ThinkingBankMeta; onClose: () => void; onDone: (n: number, failed: number) => void }> = ({ meta, onClose, onDone }) => {
  const [type, setType] = useState<ThinkingType>('math');
  const [subCategory, setSub] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [year, setYear] = useState('');
  const [count, setCount] = useState(3);
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [secs, setSecs] = useState(0);
  useEffect(() => { if (!busy) return; const t = window.setInterval(() => setSecs((s) => s + 1), 1000); return () => window.clearInterval(t); }, [busy]);
  const coding = type === 'coding';
  const max = coding ? 3 : meta.limits.aiBatchMax;
  const typeMeta = meta.types.find((t) => t.key === type);

  const go = async () => {
    setBusy(true); setErr(''); setSecs(0);
    try {
      const r = await passportApi.thinkingBankGenerate({ type, difficulty, subCategory: subCategory.trim() || undefined, year: year || undefined, count: Math.min(count, max), brief: brief.trim() || undefined });
      onDone(r.questions.length, r.failed);
    } catch (e) { setErr(pbError(e, 'Could not draft questions.')); }
    setBusy(false);
  };

  return (
    <Modal onClose={() => { if (!busy) onClose(); }} title={<><i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--pb-accent)' }} /> Draft Thinking Lab questions with AI</>}
      footer={<>
        <span className="pb-muted tb-ai-note">Drafts only. Nothing reaches members until you publish it.</span>
        <span className="pb-spacer" />
        <button className="pb-btn" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="pb-btn pb-btn-primary" disabled={busy} onClick={go}>{busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-wand-magic-sparkles" />} {busy ? `Drafting… ${secs}s` : `Draft ${Math.min(count, max)}`}</button>
      </>}>
      <label className="pb-label">Type</label>
      <div className="pb-seg tb-types">{meta.types.map((t) => <button key={t.key} type="button" className={type === t.key ? 'on' : ''} disabled={busy} onClick={() => { setType(t.key); setSub(''); }}><i className={`fa-solid ${TYPE_ICON[t.key]}`} /> {t.label}</button>)}</div>
      <div className="pb-field-row">
        <div>
          <label className="pb-label">Sub-category <small>optional</small></label>
          <input className="pb-input" list="tb-ai-sub" value={subCategory} disabled={busy} placeholder={typeMeta?.suggestions[0]} onChange={(e) => setSub(e.target.value)} />
          <datalist id="tb-ai-sub">{typeMeta?.suggestions.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div>
          <label className="pb-label">For</label>
          <select className="pb-select" value={year} disabled={busy} onChange={(e) => setYear(e.target.value)}>
            <option value="">Every year</option>
            {meta.years.filter((y) => !(coding && y.key === 'foundation')).map((y) => <option key={y.key} value={y.key}>{y.label}</option>)}
          </select>
        </div>
      </div>
      <div className="pb-field-row">
        <div>
          <label className="pb-label">Difficulty</label>
          <div className="pb-seg">{meta.difficulties.map((x) => <button key={x} type="button" disabled={busy} className={difficulty === x ? 'on' : ''} onClick={() => setDifficulty(x)}>{x[0].toUpperCase() + x.slice(1)}</button>)}</div>
        </div>
        <div>
          <label className="pb-label">How many <small>up to {max}</small></label>
          <select className="pb-select" value={Math.min(count, max)} disabled={busy} onChange={(e) => setCount(Number(e.target.value))}>
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <label className="pb-label">Note for the AI <small>optional</small></label>
      <textarea className="pb-textarea" rows={2} value={brief} disabled={busy} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. Set in a college fest; avoid trains and clocks." />
      {busy && <div className="pb-alert pb-alert-info" style={{ marginTop: 12 }}><span className="pb-spinner" /> {coding ? 'Writing and test-running each coding problem. About a minute each.' : 'Writing and checking the answers. Usually under a minute.'}</div>}
      {err && <div className="pb-alert pb-alert-bad" style={{ marginTop: 12 }}>{err}</div>}
    </Modal>
  );
};

export default ThinkingBank;
