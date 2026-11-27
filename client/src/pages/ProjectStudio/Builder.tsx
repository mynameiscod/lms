import React, { useEffect, useMemo, useState } from 'react';
import { projectStudioApi, PTemplate, PSprint, PDay, PTask, ProofType, PROOF_LABEL, errMsg } from '../../api/projectStudioApi';

/**
 * Project builder: outline on the left (sprints → days → tasks), editor for the picked item on the
 * right, one Save for the whole project. Ids already saved are sent back so students' progress
 * stays attached to the same tasks after an edit.
 */

type Sel = { kind: 'project' } | { kind: 'sprint'; s: number } | { kind: 'day'; s: number; d: number } | { kind: 'task'; s: number; d: number; t: number };

const blankTask = (n: number): PTask => ({ title: `Task ${n}`, story: '', brief: '', acceptance: [], proofType: 'commit', weight: 1, questions: [] });
const blankDay = (n: number): PDay => ({ title: `Day ${n}`, tasks: [] });
const blankSprint = (n: number): PSprint => ({ title: `Sprint ${n}`, goal: '', days: [] });

/** Move an item one place up or down in a copy of the list. */
const move = <T,>(list: T[], i: number, dir: -1 | 1): T[] => {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};

const ListEditor: React.FC<{ items: string[]; onChange: (v: string[]) => void; placeholder: string }> = ({ items, onChange, placeholder }) => (
  <div>
    {items.map((it, i) => (
      <div key={i} className="ps-list-row">
        <input className="pb-input" value={it} placeholder={placeholder} onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))} />
        <button className="pb-btn pb-btn-ghost pb-btn-icon" aria-label="Remove" onClick={() => onChange(items.filter((_, k) => k !== i))}><i className="fa-solid fa-xmark" /></button>
      </div>
    ))}
    <button className="ps-add" onClick={() => onChange([...items, ''])}>+ Add</button>
  </div>
);

const RowTools: React.FC<{ onUp: () => void; onDown: () => void; onDelete: () => void; what: string }> = ({ onUp, onDown, onDelete, what }) => (
  <div className="pb-row" style={{ gap: 6, marginBottom: 12 }}>
    <button className="pb-btn pb-btn-sm" onClick={onUp}><i className="fa-solid fa-arrow-up" /> Up</button>
    <button className="pb-btn pb-btn-sm" onClick={onDown}><i className="fa-solid fa-arrow-down" /> Down</button>
    <span className="pb-grow" />
    <button className="pb-btn pb-btn-sm pb-btn-danger" onClick={() => { if (window.confirm(`Delete this ${what}? Students' work on it stops counting.`)) onDelete(); }}>
      <i className="fa-solid fa-trash" /> Delete {what}
    </button>
  </div>
);

const Builder: React.FC<{ id: string; onBack: () => void; toast: (t: string, bad?: boolean) => void }> = ({ id, onBack, toast }) => {
  const [p, setP] = useState<PTemplate | null>(null);
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [sel, setSel] = useState<Sel>({ kind: 'project' });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    projectStudioApi.template(id).then(setP).catch((e) => setErr(errMsg(e, 'Could not load the project')));
    projectStudioApi.batches().then(setBatches).catch(() => setBatches([]));
  }, [id]);

  // Warn before leaving the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const update = (fn: (draft: PTemplate) => PTemplate) => { setP((cur) => (cur ? fn(cur) : cur)); setDirty(true); };
  const setSprints = (fn: (s: PSprint[]) => PSprint[]) => update((x) => ({ ...x, sprints: fn(x.sprints) }));
  const setSprint = (s: number, fn: (x: PSprint) => PSprint) => setSprints((list) => list.map((x, i) => (i === s ? fn(x) : x)));
  const setDay = (s: number, d: number, fn: (x: PDay) => PDay) => setSprint(s, (sp) => ({ ...sp, days: sp.days.map((x, i) => (i === d ? fn(x) : x)) }));
  const setTask = (s: number, d: number, t: number, fn: (x: PTask) => PTask) => setDay(s, d, (dy) => ({ ...dy, tasks: dy.tasks.map((x, i) => (i === t ? fn(x) : x)) }));

  const totals = useMemo(() => {
    let tasks = 0, weight = 0, days = 0;
    for (const s of p?.sprints || []) { days += s.days.length; for (const d of s.days) for (const t of d.tasks) { tasks++; weight += t.weight || 1; } }
    return { tasks, weight, days };
  }, [p]);

  const save = async (status?: PTemplate['status']) => {
    if (!p?._id) return;
    setBusy(true); setErr('');
    try {
      const r = await projectStudioApi.save(p._id, { ...p, ...(status ? { status } : {}) });
      setP(r.template); setDirty(false);
      toast(status === 'published' ? 'Published — students in the released batches can pick it now' : status === 'draft' ? 'Moved back to draft' : `Saved${r.rescored ? ` · ${r.rescored} student(s) re-scored` : ''}`);
    } catch (e) { setErr(errMsg(e, 'Could not save')); }
    setBusy(false);
  };

  if (err && !p) return <div className="pb-page"><div className="pb-alert pb-alert-bad">{err}</div><button className="pb-btn" onClick={onBack}>Back</button></div>;
  if (!p) return <div className="pb-page pb-muted"><span className="pb-spinner" /> Loading…</div>;

  const back = () => { if (!dirty || window.confirm('Leave without saving your changes?')) onBack(); };
  const isOn = (k: Sel) => JSON.stringify(k) === JSON.stringify(sel);

  /* ── Editor for the selected item ─────────────────────────────────────────── */
  let editor: React.ReactNode = null;
  if (sel.kind === 'project') {
    editor = (
      <>
        <h3>Project details</h3>
        <label className="pb-label">Title</label>
        <input className="pb-input" value={p.title} onChange={(e) => update((x) => ({ ...x, title: e.target.value }))} />
        <div className="pb-field-row">
          <div><label className="pb-label">Domain <small>e.g. Clinic, Hostel, Inventory</small></label>
            <input className="pb-input" value={p.domain} onChange={(e) => update((x) => ({ ...x, domain: e.target.value }))} /></div>
          <div><label className="pb-label">Level</label>
            <select className="pb-select" value={p.level} onChange={(e) => update((x) => ({ ...x, level: e.target.value as any }))}>
              <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
            </select></div>
        </div>
        <label className="pb-label">Tech stack <small>fixed for every student on this project — comma separated</small></label>
        <input className="pb-input" value={p.techStack.join(', ')} placeholder="Spring Boot, MySQL, React"
          onChange={(e) => update((x) => ({ ...x, techStack: e.target.value.split(',').map((s) => s.trimStart()) }))}
          onBlur={() => update((x) => ({ ...x, techStack: x.techStack.map((s) => s.trim()).filter(Boolean) }))} />
        <label className="pb-label">What the finished app does <small>Markdown</small></label>
        <textarea className="pb-textarea" rows={6} value={p.summary} onChange={(e) => update((x) => ({ ...x, summary: e.target.value }))} />
        <label className="pb-label">How a task counts as done</label>
        <div className="pb-seg">
          <button className={p.reviewMode !== 'auto' ? 'on' : ''} onClick={() => update((x) => ({ ...x, reviewMode: 'mentor' }))}>A mentor approves each task</button>
          <button className={p.reviewMode === 'auto' ? 'on' : ''} onClick={() => update((x) => ({ ...x, reviewMode: 'auto' }))}>Done as soon as submitted</button>
        </div>
        <label className="pb-label" style={{ marginTop: 14 }}>Released to batches <small>only these students can pick it (once published)</small></label>
        {batches.length === 0 ? <div className="pb-muted">No active batches.</div> : (
          <div className="pb-chips">
            {batches.map((b) => {
              const on = (p.releasedBatchIds || []).includes(b._id);
              return <button key={b._id} className={`pb-chip ${on ? 'on' : ''}`}
                onClick={() => update((x) => ({ ...x, releasedBatchIds: on ? (x.releasedBatchIds || []).filter((i) => i !== b._id) : [...(x.releasedBatchIds || []), b._id] }))}>{b.name}</button>;
            })}
          </div>
        )}
        <div className="pb-help" style={{ marginTop: 12 }}>{p.sprints.length} sprints · {totals.days} days · {totals.tasks} tasks · total weight {totals.weight}</div>
      </>
    );
  } else if (sel.kind === 'sprint') {
    const sp = p.sprints[sel.s];
    if (sp) editor = (
      <>
        <h3>Sprint</h3>
        <RowTools what="sprint" onUp={() => { setSprints((l) => move(l, sel.s, -1)); setSel({ kind: 'sprint', s: Math.max(0, sel.s - 1) }); }}
          onDown={() => { setSprints((l) => move(l, sel.s, 1)); setSel({ kind: 'sprint', s: Math.min(p.sprints.length - 1, sel.s + 1) }); }}
          onDelete={() => { setSprints((l) => l.filter((_, i) => i !== sel.s)); setSel({ kind: 'project' }); }} />
        <label className="pb-label">Title</label>
        <input className="pb-input" value={sp.title} onChange={(e) => setSprint(sel.s, (x) => ({ ...x, title: e.target.value }))} />
        <label className="pb-label">Sprint goal</label>
        <textarea className="pb-textarea" rows={3} value={sp.goal} placeholder="By the end of this sprint the app has working sign-up, login and roles."
          onChange={(e) => setSprint(sel.s, (x) => ({ ...x, goal: e.target.value }))} />
      </>
    );
  } else if (sel.kind === 'day') {
    const dy = p.sprints[sel.s]?.days[sel.d];
    if (dy) editor = (
      <>
        <h3>Day</h3>
        <RowTools what="day" onUp={() => { setSprint(sel.s, (x) => ({ ...x, days: move(x.days, sel.d, -1) })); setSel({ ...sel, d: Math.max(0, sel.d - 1) }); }}
          onDown={() => { setSprint(sel.s, (x) => ({ ...x, days: move(x.days, sel.d, 1) })); setSel({ ...sel, d: Math.min(p.sprints[sel.s].days.length - 1, sel.d + 1) }); }}
          onDelete={() => { setSprint(sel.s, (x) => ({ ...x, days: x.days.filter((_, i) => i !== sel.d) })); setSel({ kind: 'sprint', s: sel.s }); }} />
        <label className="pb-label">Title</label>
        <input className="pb-input" value={dy.title} placeholder="Day 3 — Login API" onChange={(e) => setDay(sel.s, sel.d, (x) => ({ ...x, title: e.target.value }))} />
        <div className="pb-help">Days are a suggested order — students are self-paced.</div>
      </>
    );
  } else if (sel.kind === 'task') {
    const tk = p.sprints[sel.s]?.days[sel.d]?.tasks[sel.t];
    const set = (fn: (x: PTask) => PTask) => setTask(sel.s, sel.d, sel.t, fn);
    if (tk) editor = (
      <>
        <h3>Task</h3>
        <RowTools what="task"
          onUp={() => { setDay(sel.s, sel.d, (x) => ({ ...x, tasks: move(x.tasks, sel.t, -1) })); setSel({ ...sel, t: Math.max(0, sel.t - 1) }); }}
          onDown={() => { setDay(sel.s, sel.d, (x) => ({ ...x, tasks: move(x.tasks, sel.t, 1) })); setSel({ ...sel, t: Math.min(p.sprints[sel.s].days[sel.d].tasks.length - 1, sel.t + 1) }); }}
          onDelete={() => { setDay(sel.s, sel.d, (x) => ({ ...x, tasks: x.tasks.filter((_, i) => i !== sel.t) })); setSel({ kind: 'day', s: sel.s, d: sel.d }); }} />
        <label className="pb-label">Title</label>
        <input className="pb-input" value={tk.title} placeholder="Login API" onChange={(e) => set((x) => ({ ...x, title: e.target.value }))} />
        <label className="pb-label">User story</label>
        <input className="pb-input" value={tk.story} placeholder="As a user I can log in with email and password and receive a JWT." onChange={(e) => set((x) => ({ ...x, story: e.target.value }))} />
        <label className="pb-label">What to build <small>Markdown — steps, hints, snippets</small></label>
        <textarea className="pb-textarea" rows={9} value={tk.brief} onChange={(e) => set((x) => ({ ...x, brief: e.target.value }))} />
        <label className="pb-label">Done when <small>the checklist the student and mentor check against</small></label>
        <ListEditor items={tk.acceptance} placeholder="POST /auth/login returns a token" onChange={(v) => set((x) => ({ ...x, acceptance: v }))} />
        <div className="pb-field-row">
          <div><label className="pb-label">Proof the student gives</label>
            <select className="pb-select" value={tk.proofType} onChange={(e) => set((x) => ({ ...x, proofType: e.target.value as ProofType }))}>
              {(Object.keys(PROOF_LABEL) as ProofType[]).map((k) => <option key={k} value={k}>{PROOF_LABEL[k]}</option>)}
            </select></div>
          <div><label className="pb-label">Weight <small>1–10, share of completion %</small></label>
            <input className="pb-input" type="number" min={1} max={10} value={tk.weight} onChange={(e) => set((x) => ({ ...x, weight: Math.min(10, Math.max(1, Number(e.target.value) || 1)) }))} /></div>
        </div>
        <label className="pb-label">Interview questions <small>shown after the student submits; they self-check against your answer</small></label>
        {tk.questions.map((q, i) => (
          <div key={i} className="ps-q">
            <div className="ps-list-row">
              <input className="pb-input" value={q.q} placeholder="How is JWT different from a session?" onChange={(e) => set((x) => ({ ...x, questions: x.questions.map((y, k) => (k === i ? { ...y, q: e.target.value } : y)) }))} />
              <button className="pb-btn pb-btn-ghost pb-btn-icon" aria-label="Remove question" onClick={() => set((x) => ({ ...x, questions: x.questions.filter((_, k) => k !== i) }))}><i className="fa-solid fa-xmark" /></button>
            </div>
            <textarea className="pb-textarea" rows={3} value={q.a} placeholder="Model answer" onChange={(e) => set((x) => ({ ...x, questions: x.questions.map((y, k) => (k === i ? { ...y, a: e.target.value } : y)) }))} />
          </div>
        ))}
        <button className="ps-add" onClick={() => set((x) => ({ ...x, questions: [...x.questions, { q: '', a: '' }] }))}>+ Add question</button>
      </>
    );
  }

  return (
    <div className="pb-studio">
      <div className="pb-studio-bar">
        <button className="pb-btn pb-btn-ghost" onClick={back}><i className="fa-solid fa-arrow-left" /> Projects</button>
        <span className="ttl">{p.title || 'Untitled project'}</span>
        <span className={`pb-pill ${p.status === 'published' ? 'pb-badge-ok' : p.status === 'archived' ? 'pb-badge-neutral' : 'pb-badge-warn'}`}>{p.status}</span>
        {dirty && <span className="ps-dirty">Unsaved changes</span>}
        <span className="pb-grow" />
        {err && <span style={{ color: 'var(--pb-bad)', fontSize: 13 }}>{err}</span>}
        {p.status === 'published'
          ? <button className="pb-btn" disabled={busy} onClick={() => save('draft')}>Unpublish</button>
          : <button className="pb-btn pb-btn-success" disabled={busy} onClick={() => save('published')}>Publish</button>}
        <button className="pb-btn pb-btn-primary" disabled={busy || !dirty} onClick={() => save()}>{busy ? <span className="pb-spinner" /> : null} Save</button>
      </div>
      <div className="pb-studio-body" style={{ gridTemplateColumns: 'minmax(260px, 0.7fr) minmax(0, 1.6fr)' }}>
        <div className="pb-studio-left">
          <div className="ps-outline">
            <button className={`ps-node sprint ${isOn({ kind: 'project' }) ? 'on' : ''}`} onClick={() => setSel({ kind: 'project' })}>
              <i className="fa-solid fa-gear" /><span className="ps-node-t">Project details & release</span>
            </button>
            {p.sprints.map((sp, s) => (
              <div key={sp._id || `s${s}`}>
                <button className={`ps-node sprint ${isOn({ kind: 'sprint', s }) ? 'on' : ''}`} onClick={() => setSel({ kind: 'sprint', s })}>
                  <i className="fa-solid fa-flag" /><span className="ps-node-t">{sp.title}</span><span className="ps-node-m">{sp.days.length}d</span>
                </button>
                {sp.days.map((dy, d) => (
                  <div key={dy._id || `d${d}`}>
                    <button className={`ps-node day ${isOn({ kind: 'day', s, d }) ? 'on' : ''}`} onClick={() => setSel({ kind: 'day', s, d })}>
                      <i className="fa-regular fa-calendar" /><span className="ps-node-t">{dy.title}</span><span className="ps-node-m">{dy.tasks.length}</span>
                    </button>
                    {dy.tasks.map((tk, t) => (
                      <button key={tk._id || `t${t}`} className={`ps-node task ${isOn({ kind: 'task', s, d, t }) ? 'on' : ''}`} onClick={() => setSel({ kind: 'task', s, d, t })}>
                        <i className="fa-regular fa-square-check" /><span className="ps-node-t">{tk.title}</span>
                        {tk.questions.length > 0 && <span className="ps-node-m" title="Interview questions">{tk.questions.length}Q</span>}
                      </button>
                    ))}
                    <button className="ps-add task" onClick={() => { setDay(s, d, (x) => ({ ...x, tasks: [...x.tasks, blankTask(x.tasks.length + 1)] })); setSel({ kind: 'task', s, d, t: dy.tasks.length }); }}>+ Task</button>
                  </div>
                ))}
                <button className="ps-add day" onClick={() => {
                  const n = p.sprints.reduce((k, x, i) => k + (i < s ? x.days.length : 0), 0) + sp.days.length + 1;
                  setSprint(s, (x) => ({ ...x, days: [...x.days, blankDay(n)] })); setSel({ kind: 'day', s, d: sp.days.length });
                }}>+ Day</button>
              </div>
            ))}
            <div><button className="ps-add" onClick={() => { setSprints((l) => [...l, blankSprint(l.length + 1)]); setSel({ kind: 'sprint', s: p.sprints.length }); }}>+ Sprint</button></div>
          </div>
        </div>
        <div className="pb-studio-right"><div className="ps-editor">{editor || <div className="pb-muted">Pick something on the left.</div>}</div></div>
      </div>
    </div>
  );
};

export default Builder;
