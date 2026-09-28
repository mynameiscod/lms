import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { problemBankApi, pbError, PbListItem } from '../../api/problemBankApi';
import { AudienceEntry, problemSetAdminApi, SetInput, SetReport, SetItemAdmin } from '../../api/problemSetApi';
import { DifficultyPill, LANG_SHORT, Modal, useToast } from './shared';
import './ProblemBank.css';

const toLocal = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Pick published problems from the bank to add to a set. */
const ProblemPicker: React.FC<{ exclude: Set<string>; onAdd: (items: PbListItem[]) => void; onClose: () => void }> = ({ exclude, onAdd, onClose }) => {
  const [q, setQ] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [rows, setRows] = useState<PbListItem[]>([]);
  const [picked, setPicked] = useState<Map<string, PbListItem>>(new Map());
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      problemBankApi.list({ q: q || undefined, difficulty: difficulty || undefined, status: 'published', sort: 'number', limit: 50 })
        .then((r) => setRows(r.items)).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, difficulty]);
  const toggle = (p: PbListItem) => { const m = new Map(picked); if (m.has(p._id)) m.delete(p._id); else m.set(p._id, p); setPicked(m); };
  return (
    <Modal title="Add problems from the bank" onClose={onClose} wide footer={<>
      <span className="pb-muted pb-grow">{picked.size} selected · only published problems can be assigned</span>
      <button className="pb-btn" onClick={onClose}>Cancel</button>
      <button className="pb-btn pb-btn-primary" disabled={!picked.size} onClick={() => onAdd(Array.from(picked.values()))}><i className="fa-solid fa-plus" /> Add {picked.size || ''}</button>
    </>}>
      <div className="pb-row" style={{ marginBottom: 10 }}>
        <div className="pb-search pb-grow"><i className="fa-solid fa-magnifying-glass" /><input className="pb-input" autoFocus placeholder="Search title, tag or #number" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="pb-select" style={{ width: 'auto' }} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">Any difficulty</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </select>
      </div>
      <div className="pb-card pb-table-wrap" style={{ maxHeight: 440, overflowY: 'auto' }}>
        <table className="pb-table">
          <thead><tr><th style={{ width: 36 }} /><th>#</th><th>Title</th><th>Difficulty</th><th>Languages</th><th>Tests</th></tr></thead>
          <tbody>
            {loading && !rows.length && <tr><td colSpan={6} className="pb-muted" style={{ textAlign: 'center', padding: 24 }}><span className="pb-spinner" /></td></tr>}
            {!loading && !rows.length && <tr><td colSpan={6} className="pb-muted" style={{ textAlign: 'center', padding: 24 }}>No published problems match.</td></tr>}
            {rows.map((p) => {
              const already = exclude.has(p._id);
              return (
                <tr key={p._id} onClick={() => !already && toggle(p)} style={{ opacity: already ? 0.5 : 1 }}>
                  <td><input type="checkbox" disabled={already} checked={already || picked.has(p._id)} readOnly /></td>
                  <td className="pb-muted pb-mono">{p.number}</td>
                  <td style={{ fontWeight: 650 }}>{p.title}{already && <span className="pb-faint"> · already in set</span>}</td>
                  <td><DifficultyPill d={p.difficulty} /></td>
                  <td><div className="pb-langs">{p.languages.map((l) => <span key={l} className="pb-lang">{LANG_SHORT[l] || l}</span>)}</div></td>
                  <td className="pb-muted">{p.testCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};

/** Choose batches, people, or everyone in a product. */
const AudienceEditor: React.FC<{ value: AudienceEntry[]; onChange: (v: AudienceEntry[]) => void }> = ({ value, onChange }) => {
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<{ _id: string; name: string; email: string; role: string }[]>([]);
  useEffect(() => { problemSetAdminApi.batches().then(setBatches).catch(() => undefined); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setPeople([]); return; }
    const t = setTimeout(() => problemSetAdminApi.users(q).then(setPeople).catch(() => undefined), 300);
    return () => clearTimeout(t);
  }, [q]);
  const has = (type: string, id?: string) => value.some((a) => a.type === type && (a.id || '') === (id || ''));
  const toggle = (e: AudienceEntry) => onChange(has(e.type, e.id) ? value.filter((a) => !(a.type === e.type && (a.id || '') === (e.id || ''))) : [...value, e]);
  return (
    <div>
      <div className="pb-chips" style={{ marginBottom: 10 }}>
        <button type="button" className={`pb-chip ${has('all_lms') ? 'on' : ''}`} onClick={() => toggle({ type: 'all_lms', name: 'All LMS students' })}><i className="fa-solid fa-graduation-cap" /> All LMS students</button>
        <button type="button" className={`pb-chip ${has('all_careerpilot') ? 'on' : ''}`} onClick={() => toggle({ type: 'all_careerpilot', name: 'All CareerPilot members' })}><i className="fa-solid fa-compass" /> All CareerPilot members</button>
      </div>
      <label className="pb-label" style={{ marginTop: 4 }}>Batches</label>
      <div className="pb-chips" style={{ maxHeight: 150, overflowY: 'auto' }}>
        {batches.map((b) => <button type="button" key={b._id} className={`pb-chip ${has('batch', b._id) ? 'on' : ''}`} onClick={() => toggle({ type: 'batch', id: b._id, name: b.name })}>{b.name}</button>)}
        {!batches.length && <span className="pb-faint">No batches found.</span>}
      </div>
      <label className="pb-label">Individual people</label>
      <input className="pb-input" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      {!!people.length && (
        <div className="pb-card" style={{ marginTop: 6 }}>
          {people.map((p) => (
            <div key={p._id} className="pb-row" style={{ padding: '7px 10px', borderBottom: '1px solid var(--pb-line)', cursor: 'pointer' }} onClick={() => toggle({ type: 'user', id: p._id, name: p.name })}>
              <input type="checkbox" readOnly checked={has('user', p._id)} /><span className="pb-grow"><b>{p.name}</b> <span className="pb-muted">{p.email}</span></span><span className="pb-tag">{p.role}</span>
            </div>
          ))}
        </div>
      )}
      {value.some((a) => a.type === 'user') && (
        <div className="pb-chips" style={{ marginTop: 8 }}>
          {value.filter((a) => a.type === 'user').map((a) => <span key={a.id} className="pb-chip on">{a.name} <i className="fa-solid fa-xmark" style={{ cursor: 'pointer' }} onClick={() => toggle(a)} /></span>)}
        </div>
      )}
    </div>
  );
};

/** Per-learner progress grid. */
const ReportView: React.FC<{ id: string }> = ({ id }) => {
  const [r, setR] = useState<SetReport | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<{ userId: string; name: string } | null>(null);
  const [subs, setSubs] = useState<any[] | null>(null);
  useEffect(() => { problemSetAdminApi.report(id).then(setR).catch((e) => setErr(pbError(e))); }, [id]);
  useEffect(() => { if (open) { setSubs(null); problemSetAdminApi.learnerSubmissions(id, open.userId).then(setSubs).catch(() => setSubs([])); } }, [open, id]);

  const exportCsv = () => {
    if (!r) return;
    const head = ['Name', 'Email', ...r.problems.map((p) => p.title), 'Solved', 'Score', 'Out of'];
    const lines = r.rows.map((x) => [x.name, x.email, ...x.cells.map((c) => c.status === 'todo' ? '' : `${c.status}${c.score !== undefined ? ` (${c.score})` : ''}`), x.solved, x.score, x.totalMarks]);
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${r.set.title.replace(/[^a-z0-9]+/gi, '-')}-report.csv`;
    a.click();
  };

  if (err) return <div className="pb-alert pb-alert-bad">{err}</div>;
  if (!r) return <div className="pb-muted"><span className="pb-spinner" /> Building the report…</div>;
  const problemTitle = (pid: string) => r.problems.find((p) => String(p._id) === String(pid))?.title || 'Problem';
  return (
    <div>
      <div className="pb-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="pb-card pb-stat"><div className="l">Learners</div><div className="n">{r.summary.learners}</div></div>
        <div className="pb-card pb-stat"><div className="l">Started</div><div className="n">{r.summary.started}</div></div>
        <div className="pb-card pb-stat"><div className="l">Completed everything</div><div className="n">{r.summary.completed}</div></div>
        <div className="pb-card pb-stat"><div className="l">Average score</div><div className="n">{r.summary.averageScore}<span className="pb-faint" style={{ fontSize: 15 }}> / {r.summary.totalMarks}</span></div></div>
      </div>
      <div className="pb-row" style={{ marginBottom: 8 }}><span className="pb-spacer" /><button className="pb-btn pb-btn-sm" onClick={exportCsv}><i className="fa-solid fa-file-csv" /> Export CSV</button></div>
      <div className="pb-card pb-table-wrap">
        <table className="pb-table">
          <thead><tr><th>Learner</th>{r.problems.map((p, i) => <th key={p._id} title={p.title}>P{i + 1}</th>)}<th>Solved</th><th>Score</th></tr></thead>
          <tbody>
            {!r.rows.length && <tr><td colSpan={r.problems.length + 3} className="pb-muted" style={{ textAlign: 'center', padding: 24 }}>No learners in this set's audience yet.</td></tr>}
            {r.rows.map((x) => (
              <tr key={x.userId} onClick={() => setOpen({ userId: x.userId, name: x.name })}>
                <td><b>{x.name}</b><div className="pb-faint" style={{ fontSize: 12 }}>{x.email}</div></td>
                {x.cells.map((c, i) => (
                  <td key={i} title={c.status === 'todo' ? 'Not started' : `${c.attempts} attempt(s)${c.late ? ' · late' : ''}`}>
                    {c.status === 'solved' ? <i className="fa-solid fa-circle-check" style={{ color: 'var(--pb-ok)' }} />
                      : c.status === 'attempted' ? <span style={{ color: 'var(--pb-warn)', fontWeight: 700, fontSize: 12.5 }}>{c.score}</span>
                        : <span className="pb-faint">—</span>}
                    {c.late && <sup style={{ color: 'var(--pb-bad)' }}>L</sup>}
                  </td>
                ))}
                <td>{x.solved}/{r.problems.length}</td>
                <td><b>{x.score}</b><span className="pb-faint"> / {x.totalMarks}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pb-help">✓ solved · number = best partial score · L = submitted after the due date. Click a learner to read their code.</div>
      {open && (
        <Modal title={`${open.name} — submissions`} onClose={() => setOpen(null)} wide>
          {!subs ? <span className="pb-spinner" /> : !subs.length ? <div className="pb-muted">No submissions yet.</div> : subs.map((s) => (
            <details key={s._id} className="pb-card" style={{ padding: '8px 12px', marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer' }}>
                <b>{problemTitle(s.problemId)}</b> · <span className={`pb-pill ${s.verdict === 'AC' ? 'pb-badge-ok' : 'pb-badge-bad'}`}>{s.verdict}</span> {s.passed}/{s.total} · {s.score}/{s.maxScore} · {LANG_SHORT[s.language] || s.language} · {new Date(s.createdAt).toLocaleString()}{s.late ? ' · late' : ''}
              </summary>
              <pre className="pb-mono" style={{ fontSize: 12.5, background: 'var(--pb-soft)', padding: 10, borderRadius: 8, overflow: 'auto', maxHeight: 360, marginTop: 8 }}>{s.code}</pre>
            </details>
          ))}
        </Modal>
      )}
    </div>
  );
};

/** Create or edit a problem set, and see how learners are doing on it. */
const SetEditor: React.FC = () => {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<'setup' | 'report'>('setup');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  const [status, setStatus] = useState<'draft' | 'published' | 'closed'>('draft');
  const [f, setF] = useState({ title: '', description: '', kind: 'assignment' as 'assignment' | 'practice', opensAt: '', dueAt: '', allowLate: true });
  const [items, setItems] = useState<SetItemAdmin[]>([]);
  const [audience, setAudience] = useState<AudienceEntry[]>([]);

  const load = useCallback(() => {
    if (isNew) return;
    setLoading(true);
    problemSetAdminApi.get(id!).then((s) => {
      setF({ title: s.title, description: s.description, kind: s.kind, opensAt: toLocal(s.opensAt), dueAt: toLocal(s.dueAt), allowLate: s.allowLate });
      setItems(s.items); setAudience(s.audience); setStatus(s.status);
    }).catch((e) => toast.show(pbError(e), true)).finally(() => setLoading(false));
  }, [id, isNew]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const totalMarks = useMemo(() => items.reduce((s, i) => s + (typeof i.marks === 'number' ? i.marks : i.problem?.marks || 0), 0), [items]);

  const save = async (nextStatus?: 'draft' | 'published' | 'closed') => {
    setSaving(true);
    const body: SetInput = {
      ...f, opensAt: f.opensAt ? new Date(f.opensAt).toISOString() : null, dueAt: f.dueAt ? new Date(f.dueAt).toISOString() : null,
      items: items.map((i) => ({ problemId: i.problemId, marks: typeof i.marks === 'number' ? i.marks : null })),
      audience: audience.map((a) => ({ type: a.type, id: a.id })), status: nextStatus || status,
    };
    try {
      if (isNew) { const r = await problemSetAdminApi.create(body); toast.show('Saved.'); nav(`/problem-bank/sets/${r.id}`, { replace: true }); }
      else { const r = await problemSetAdminApi.update(id!, body); setStatus(r.status as any); toast.show(nextStatus === 'published' ? 'Published — learners can see it now.' : nextStatus === 'closed' ? 'Closed for submissions.' : 'Saved.'); load(); }
    } catch (e) { toast.show(pbError(e, 'Could not save.'), true); }
    setSaving(false);
  };

  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= items.length) return; const n = [...items]; [n[i], n[j]] = [n[j], n[i]]; setItems(n); };

  if (loading) return <div className="pb-root"><div className="pb-page pb-muted"><span className="pb-spinner" /> Loading…</div></div>;

  return (
    <div className="pb-root">
      <div className="pb-page" style={{ maxWidth: 1180 }}>
        <div className="pb-row pb-wrap" style={{ marginBottom: 14 }}>
          <button className="pb-btn pb-btn-ghost pb-btn-icon" onClick={() => nav('/problem-bank/sets')} aria-label="Back"><i className="fa-solid fa-arrow-left" /></button>
          <h1 className="pb-grow" style={{ fontSize: 22 }}>{f.title || 'New problem set'}</h1>
          <span className={`pb-pill ${status === 'published' ? 'pb-badge-ok' : status === 'closed' ? 'pb-badge-warn' : 'pb-badge-neutral'}`}><span className="pb-dot" /> {status}</span>
          <button className="pb-btn" disabled={saving} onClick={() => save()}>{saving ? <span className="pb-spinner" /> : <i className="fa-solid fa-floppy-disk" />} Save</button>
          {status !== 'published'
            ? <button className="pb-btn pb-btn-success" disabled={saving} onClick={() => save('published')}><i className="fa-solid fa-upload" /> Publish to learners</button>
            : <button className="pb-btn" disabled={saving} onClick={() => save('closed')}><i className="fa-solid fa-lock" /> Close submissions</button>}
          {!isNew && <button className="pb-btn pb-btn-ghost" onClick={async () => {
            if (!window.confirm('Delete this set? If learners have submitted, it is closed instead so results are kept.')) return;
            try { const r = await problemSetAdminApi.remove(id!); toast.show(r.closed ? 'Closed (it has submissions).' : 'Deleted.'); if (r.deleted) nav('/problem-bank/sets'); else load(); } catch (e) { toast.show(pbError(e), true); }
          }}><i className="fa-solid fa-trash" /></button>}
        </div>

        {!isNew && (
          <div className="pb-tabs" style={{ padding: 0, background: 'transparent', marginBottom: 14 }}>
            <button className={tab === 'setup' ? 'on' : ''} onClick={() => setTab('setup')}>Setup</button>
            <button className={tab === 'report' ? 'on' : ''} onClick={() => setTab('report')}>Progress report</button>
          </div>
        )}

        {tab === 'report' && !isNew ? <ReportView id={id!} /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 16 }} className="pb-set-grid">
            <div>
              <div className="pb-card" style={{ padding: 16 }}>
                <label className="pb-label" style={{ marginTop: 0 }}>Title</label>
                <input className="pb-input" value={f.title} placeholder="e.g. Week 3 — Arrays & Two Pointers" onChange={(e) => setF({ ...f, title: e.target.value })} />
                <label className="pb-label">Instructions <small>optional</small></label>
                <textarea className="pb-textarea" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="What learners should focus on." />
                <label className="pb-label">Type</label>
                <div className="pb-seg">
                  <button type="button" className={f.kind === 'assignment' ? 'on' : ''} onClick={() => setF({ ...f, kind: 'assignment' })}>Assignment (graded, due date)</button>
                  <button type="button" className={f.kind === 'practice' ? 'on' : ''} onClick={() => setF({ ...f, kind: 'practice' })}>Practice track</button>
                </div>
              </div>

              <div className="pb-card" style={{ padding: 16, marginTop: 14 }}>
                <div className="pb-row"><h3 className="pb-grow" style={{ margin: 0 }}>Problems <span className="pb-faint" style={{ fontWeight: 500 }}>· {items.length} · {totalMarks} marks</span></h3>
                  <button className="pb-btn pb-btn-sm pb-btn-primary" onClick={() => setPicker(true)}><i className="fa-solid fa-plus" /> Add from bank</button></div>
                {!items.length && <div className="pb-empty pb-muted" style={{ padding: 28 }}>No problems yet. Add published problems from the bank.</div>}
                {items.map((i, k) => (
                  <div key={i.problemId} className="pb-row" style={{ padding: '9px 0', borderBottom: '1px solid var(--pb-line)' }}>
                    <span className="pb-faint pb-mono" style={{ width: 22 }}>{k + 1}</span>
                    <span className="pb-grow"><b>{i.problem?.title || 'Missing problem'}</b>
                      <div className="pb-row" style={{ gap: 5, marginTop: 3 }}>{i.problem && <DifficultyPill d={i.problem.difficulty} />}
                        {i.problem?.status !== 'published' && <span className="pb-pill pb-badge-bad">not published</span>}
                        <span className="pb-faint" style={{ fontSize: 12 }}>{(i.problem?.languages || []).map((l) => LANG_SHORT[l.language] || l.language).join(' · ')}</span></div></span>
                    <label className="pb-row" style={{ gap: 5, fontSize: 12.5 }}>Marks
                      <input className="pb-input" type="number" min={0} style={{ width: 70, padding: '4px 7px' }} placeholder={String(i.problem?.marks ?? '')}
                        value={typeof i.marks === 'number' ? i.marks : ''} onChange={(e) => setItems(items.map((x, j) => j === k ? { ...x, marks: e.target.value === '' ? undefined : Number(e.target.value) } : x))} /></label>
                    <button className="pb-btn pb-btn-ghost pb-btn-icon" disabled={k === 0} onClick={() => move(k, -1)} aria-label="Up"><i className="fa-solid fa-arrow-up" /></button>
                    <button className="pb-btn pb-btn-ghost pb-btn-icon" disabled={k === items.length - 1} onClick={() => move(k, 1)} aria-label="Down"><i className="fa-solid fa-arrow-down" /></button>
                    <button className="pb-btn pb-btn-ghost pb-btn-icon" onClick={() => setItems(items.filter((_, j) => j !== k))} aria-label="Remove"><i className="fa-solid fa-xmark" /></button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="pb-card" style={{ padding: 16 }}>
                <h3>Who is it for?</h3>
                <AudienceEditor value={audience} onChange={setAudience} />
              </div>
              <div className="pb-card" style={{ padding: 16, marginTop: 14 }}>
                <h3>When</h3>
                <label className="pb-label" style={{ marginTop: 0 }}>Opens <small>empty = as soon as published</small></label>
                <input className="pb-input" type="datetime-local" value={f.opensAt} onChange={(e) => setF({ ...f, opensAt: e.target.value })} />
                <label className="pb-label">Due <small>optional</small></label>
                <input className="pb-input" type="datetime-local" value={f.dueAt} onChange={(e) => setF({ ...f, dueAt: e.target.value })} />
                <label className="pb-switch" style={{ marginTop: 12 }}><input type="checkbox" checked={f.allowLate} onChange={(e) => setF({ ...f, allowLate: e.target.checked })} /> Accept late submissions (marked late)</label>
              </div>
            </div>
          </div>
        )}
      </div>
      {picker && <ProblemPicker exclude={new Set(items.map((i) => i.problemId))} onClose={() => setPicker(false)}
        onAdd={(ps) => { setItems([...items, ...ps.map((p) => ({ problemId: p._id, problem: { ...p, languages: p.languages.map((l) => ({ language: l })), verification: p.verification } as any }))]); setPicker(false); }} />}
      <style>{`@media (max-width: 900px) { .pb-set-grid { grid-template-columns: 1fr !important; } }`}</style>
      {toast.node}
    </div>
  );
};

export default SetEditor;
