import React, { useCallback, useEffect, useState } from 'react';
import { projectStudioApi, TemplateRow, ProgressRow, ReviewItem, Enrollment, PTemplate, PROOF_LABEL, errMsg } from '../../api/projectStudioApi';
import { Modal, useToast, relTime } from '../ProblemBank/shared';
import Builder from './Builder';
import { PctBar } from './PctBar';
import '../ProblemBank/ProblemBank.css';
import './ProjectStudio.css';

/**
 * Project Studio — admin. Write guided projects (sprints → days → tasks), release them to batches,
 * watch each student's completion %, and approve submitted tasks.
 */

const STATUS_PILL: Record<string, string> = { published: 'pb-badge-ok', draft: 'pb-badge-warn', archived: 'pb-badge-neutral' };

/* ── Projects ─────────────────────────────────────────────────────────────── */

const ProjectsTab: React.FC<{ onOpen: (id: string) => void; toast: (t: string, bad?: boolean) => void }> = ({ onOpen, toast }) => {
  const [rows, setRows] = useState<TemplateRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('');
  const [stack, setStack] = useState('');
  const load = useCallback(() => { projectStudioApi.templates().then(setRows).catch((e) => { setRows([]); toast(errMsg(e), true); }); }, [toast]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    try {
      const t = await projectStudioApi.create({ title, domain, techStack: stack.split(',').map((s) => s.trim()).filter(Boolean) });
      setCreating(false); setTitle(''); setDomain(''); setStack('');
      if (t._id) onOpen(t._id);
    } catch (e) { toast(errMsg(e, 'Could not create'), true); }
  };
  const duplicate = async (r: TemplateRow) => {
    try { const t = await projectStudioApi.duplicate(r._id); toast('Copied — rename it and change the domain'); if (t._id) onOpen(t._id); } catch (e) { toast(errMsg(e), true); }
  };
  const remove = async (r: TemplateRow) => {
    if (!window.confirm(r.students ? `${r.students} student(s) are on "${r.title}". It will be archived (hidden from new picks), not deleted.` : `Delete "${r.title}"? This cannot be undone.`)) return;
    try { const x = await projectStudioApi.remove(r._id); toast(x.archived ? 'Archived' : 'Deleted'); load(); } catch (e) { toast(errMsg(e), true); }
  };

  if (!rows) return <div className="pb-muted"><span className="pb-spinner" /> Loading…</div>;
  return (
    <>
      <div className="pb-row" style={{ marginBottom: 12 }}>
        <span className="pb-grow pb-muted">Write a project once, publish it, and release it to batches. Students pick one and cannot switch.</span>
        <button className="pb-btn pb-btn-primary" onClick={() => setCreating(true)}><i className="fa-solid fa-plus" /> New project</button>
      </div>
      {rows.length === 0 ? (
        <div className="pb-card pb-empty">
          <h2>No projects yet</h2>
          <p className="pb-muted">Start with one project, e.g. a Clinic Appointment System, split into sprints, days and small tasks.</p>
          <button className="pb-btn pb-btn-primary" onClick={() => setCreating(true)}>Create the first project</button>
        </div>
      ) : (
        <div className="pb-card pb-table-wrap">
          <table className="pb-table">
            <thead><tr><th>Project</th><th>Status</th><th>Size</th><th>Batches</th><th>Students</th><th style={{ width: 160 }}>Average</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="pb-title-cell"><button className="pb-linkbtn" onClick={() => onOpen(r._id)}><b>{r.title}</b></button>
                    <div className="pb-muted" style={{ fontSize: 12.5 }}>{[r.domain, r.techStack.join(' · ')].filter(Boolean).join(' — ')}</div></td>
                  <td><span className={`pb-pill ${STATUS_PILL[r.status] || ''}`}>{r.status}</span></td>
                  <td className="pb-muted">{r.sprintCount} sprints · {r.dayCount} days · {r.taskCount} tasks</td>
                  <td>{r.releasedBatchIds.length}</td>
                  <td>{r.students}{r.completed ? <span className="pb-muted"> · {r.completed} done</span> : null}</td>
                  <td>{r.students ? <PctBar pct={r.avgPct} /> : <span className="pb-faint">—</span>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="pb-btn pb-btn-sm" onClick={() => onOpen(r._id)}>Edit</button>{' '}
                    <button className="pb-btn pb-btn-sm" title="Copy as a new project (e.g. another domain)" onClick={() => duplicate(r)}>Copy</button>{' '}
                    <button className="pb-btn pb-btn-sm pb-btn-ghost" aria-label="Delete" onClick={() => remove(r)}><i className="fa-solid fa-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && (
        <Modal title="New project" onClose={() => setCreating(false)} footer={<>
          <button className="pb-btn" onClick={() => setCreating(false)}>Cancel</button>
          <button className="pb-btn pb-btn-primary" disabled={!title.trim()} onClick={create}>Create & open builder</button>
        </>}>
          <label className="pb-label">Title</label>
          <input className="pb-input" autoFocus value={title} placeholder="Clinic Appointment System" onChange={(e) => setTitle(e.target.value)} />
          <label className="pb-label">Domain</label>
          <input className="pb-input" value={domain} placeholder="Healthcare" onChange={(e) => setDomain(e.target.value)} />
          <label className="pb-label">Tech stack <small>comma separated, fixed for all students</small></label>
          <input className="pb-input" value={stack} placeholder="Spring Boot, MySQL, React" onChange={(e) => setStack(e.target.value)} />
        </Modal>
      )}
    </>
  );
};

/* ── Progress ─────────────────────────────────────────────────────────────── */

const StudentDetail: React.FC<{ id: string; onClose: () => void; onChanged: () => void; toast: (t: string, bad?: boolean) => void }> = ({ id, onClose, onChanged, toast }) => {
  const [data, setData] = useState<{ enrollment: Enrollment; template: PTemplate; student: { name: string; email: string } } | null>(null);
  useEffect(() => { projectStudioApi.enrollment(id).then(setData).catch((e) => { toast(errMsg(e), true); onClose(); }); }, [id, toast, onClose]);
  const reset = async () => {
    const reason = window.prompt('Reset this student? They lose their place and can pick a project again. Their old work is kept for the record.\n\nReason:');
    if (reason === null) return;
    try { await projectStudioApi.reset(id, reason); toast('Reset — the student can pick again'); onChanged(); onClose(); } catch (e) { toast(errMsg(e), true); }
  };
  if (!data) return null;
  const st = new Map(data.enrollment.tasks.map((t) => [t.taskId, t]));
  return (
    <Modal wide title={`${data.student.name} — ${data.template.title}`} onClose={onClose} footer={<>
      <button className="pb-btn pb-btn-danger" onClick={reset}>Reset project</button><span className="pb-grow" /><button className="pb-btn" onClick={onClose}>Close</button>
    </>}>
      <PctBar pct={data.enrollment.completionPct} />
      <p className="pb-muted" style={{ fontSize: 13 }}>
        Started {relTime(data.enrollment.startedAt)} · last activity {relTime(data.enrollment.lastActivityAt)}
        {data.enrollment.repoUrl ? <> · <a href={data.enrollment.repoUrl} target="_blank" rel="noreferrer">{data.enrollment.repoUrl.replace('https://github.com/', '')}</a></> : ' · no repository yet'}
      </p>
      {data.template.sprints.map((s) => (
        <div key={s._id} style={{ marginBottom: 10 }}>
          <b>{s.title}</b>
          {s.days.map((d) => d.tasks.map((t) => {
            const x = t._id ? st.get(t._id) : undefined;
            return (
              <div key={t._id} className="pb-row" style={{ padding: '4px 0 4px 12px', fontSize: 13.5 }}>
                <span className={`ps-dot ${x?.status || ''}`}>{x?.status === 'done' ? '✓' : ''}</span>
                <span className="pb-grow">{d.title} · {t.title}</span>
                {x?.proofUrl && <a href={x.proofUrl} target="_blank" rel="noreferrer">proof</a>}
                <span className="pb-muted">{x ? x.status : 'not started'}</span>
              </div>
            );
          }))}
        </div>
      ))}
    </Modal>
  );
};

const ProgressTab: React.FC<{ toast: (t: string, bad?: boolean) => void }> = ({ toast }) => {
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [batchId, setBatchId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [rows, setRows] = useState<ProgressRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [minPct, setMinPct] = useState('');
  useEffect(() => {
    projectStudioApi.batches().then(setBatches).catch(() => setBatches([]));
    projectStudioApi.templates().then(setTemplates).catch(() => setTemplates([]));
  }, []);
  const load = useCallback(() => {
    setRows(null);
    projectStudioApi.progress({ batchId: batchId || undefined, templateId: templateId || undefined }).then(setRows).catch((e) => { setRows([]); toast(errMsg(e), true); });
  }, [batchId, templateId, toast]);
  useEffect(() => { load(); }, [load]);
  const shown = (rows || []).filter((r) => !minPct || r.completionPct >= Number(minPct));
  const started = (rows || []).filter((r) => !r.notStarted);
  return (
    <>
      <div className="pb-card pb-filters">
        <select className="pb-select" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
          <option value="">All batches (students who picked)</option>
          {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select className="pb-select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          <option value="">All projects</option>
          {templates.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
        </select>
        <label className="pb-row" style={{ gap: 6 }}><span className="pb-muted">At least</span>
          <input className="pb-input" type="number" min={0} max={100} style={{ width: 80 }} value={minPct} placeholder="0" onChange={(e) => setMinPct(e.target.value)} />%</label>
        <span className="pb-grow" />
        <span className="pb-muted">{started.length} started · {started.filter((r) => r.completionPct >= 100).length} finished{batchId ? ` · ${(rows || []).length - started.length} not started` : ''}</span>
      </div>
      {!rows ? <div className="pb-muted"><span className="pb-spinner" /> Loading…</div> : shown.length === 0 ? (
        <div className="pb-card pb-empty"><p className="pb-muted">{batchId ? 'No students match.' : 'No student has picked a project yet. Pick a batch to see who has not started.'}</p></div>
      ) : (
        <div className="pb-card pb-table-wrap">
          <table className="pb-table">
            <thead><tr><th>Student</th><th>Batch</th><th>Project</th><th style={{ width: 170 }}>Completion</th><th>Tasks</th><th>Review</th><th>Last activity</th><th /></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.studentId}>
                  <td><b>{r.name}</b><div className="pb-muted" style={{ fontSize: 12 }}>{r.email}</div></td>
                  <td>{r.batch}</td>
                  <td>{r.notStarted ? <span className="pb-pill pb-badge-bad">Not picked</span> : r.project}</td>
                  <td>{r.notStarted ? <span className="pb-faint">—</span> : <PctBar pct={r.completionPct} />}</td>
                  <td>{r.notStarted ? '' : `${r.doneTasks}/${r.totalTasks}`}</td>
                  <td>{r.awaitingReview ? <span className="pb-pill pb-badge-warn">{r.awaitingReview} waiting</span> : ''}</td>
                  <td className="pb-muted">{r.lastActivityAt ? relTime(r.lastActivityAt) : ''}</td>
                  <td>{r.enrollmentId && <button className="pb-btn pb-btn-sm" onClick={() => setOpen(r.enrollmentId!)}>View</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <StudentDetail id={open} onClose={() => setOpen(null)} onChanged={load} toast={toast} />}
    </>
  );
};

/* ── Review ───────────────────────────────────────────────────────────────── */

const ReviewTab: React.FC<{ toast: (t: string, bad?: boolean) => void; onCount: (n: number) => void }> = ({ toast, onCount }) => {
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const load = useCallback(() => {
    projectStudioApi.reviewQueue().then((x) => { setItems(x); onCount(x.length); }).catch((e) => { setItems([]); toast(errMsg(e), true); });
  }, [toast, onCount]);
  useEffect(() => { load(); }, [load]);
  const act = async (it: ReviewItem, action: 'approve' | 'changes') => {
    const k = `${it.enrollmentId}:${it.taskId}`;
    if (action === 'changes' && !(notes[k] || '').trim()) { toast('Write what the student should change', true); return; }
    setBusy(k);
    try { await projectStudioApi.review(it.enrollmentId, it.taskId, action, notes[k]); toast(action === 'approve' ? `Approved — ${it.name}` : `Sent back to ${it.name}`); load(); }
    catch (e) { toast(errMsg(e), true); }
    setBusy('');
  };
  if (!items) return <div className="pb-muted"><span className="pb-spinner" /> Loading…</div>;
  if (!items.length) return <div className="pb-card pb-empty"><h2>All caught up</h2><p className="pb-muted">No task is waiting for review.</p></div>;
  return (
    <>
      {items.map((it) => {
        const k = `${it.enrollmentId}:${it.taskId}`;
        return (
          <div key={k} className="pb-card" style={{ padding: 14, marginBottom: 10 }}>
            <div className="pb-row" style={{ alignItems: 'flex-start' }}>
              <div className="pb-grow">
                <b>{it.task}</b> <span className="pb-muted">· {it.where}</span>
                <div className="pb-muted" style={{ fontSize: 13 }}>{it.name} · {it.project} · submitted {relTime(it.submittedAt)}{it.attempts > 1 ? ` · attempt ${it.attempts}` : ''}</div>
              </div>
              {it.repoUrl && <a className="pb-btn pb-btn-sm" href={it.repoUrl} target="_blank" rel="noreferrer"><i className="fa-brands fa-github" /> Repo</a>}
            </div>
            <div style={{ margin: '8px 0', fontSize: 13.5 }}>
              <span className="pb-muted">{PROOF_LABEL[it.proofType] || 'Proof'}: </span>
              {it.proofUrl ? <a href={it.proofUrl} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{it.proofUrl}</a> : <span className="pb-faint">no link</span>}
              {it.note && <div className="pb-pre-text" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{it.note}</div>}
            </div>
            <div className="pb-row" style={{ gap: 8 }}>
              <input className="pb-input pb-grow" placeholder="Feedback (required to ask for changes)" value={notes[k] || ''} onChange={(e) => setNotes({ ...notes, [k]: e.target.value })} />
              <button className="pb-btn" disabled={busy === k} onClick={() => act(it, 'changes')}>Ask for changes</button>
              <button className="pb-btn pb-btn-success" disabled={busy === k} onClick={() => act(it, 'approve')}><i className="fa-solid fa-check" /> Approve</button>
            </div>
          </div>
        );
      })}
    </>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────── */

const ProjectStudioAdmin: React.FC = () => {
  const [tab, setTab] = useState<'projects' | 'progress' | 'review'>('projects');
  const [editing, setEditing] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const { show, node } = useToast();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const toast = useCallback(show, []);
  useEffect(() => { projectStudioApi.reviewQueue().then((x) => setReviewCount(x.length)).catch(() => setReviewCount(null)); }, []);

  if (editing) return <div className="pb-root"><Builder id={editing} onBack={() => setEditing(null)} toast={toast} />{node}</div>;
  return (
    <div className="pb-root">
      <div className="pb-page">
        <div className="pb-head">
          <div className="pb-grow">
            <h1 style={{ margin: 0 }}>Project Studio</h1>
            <p>Guided end-to-end projects: sprints, days and small tasks with interview questions. Students build in their own GitHub repo and submit proof per task.</p>
          </div>
        </div>
        <div className="pb-tabs" style={{ marginBottom: 16, borderRadius: 10 }}>
          <button className={tab === 'projects' ? 'on' : ''} onClick={() => setTab('projects')}>Projects</button>
          <button className={tab === 'progress' ? 'on' : ''} onClick={() => setTab('progress')}>Student progress</button>
          <button className={tab === 'review' ? 'on' : ''} onClick={() => setTab('review')}>Review{reviewCount ? <span className="cnt">{reviewCount}</span> : null}</button>
        </div>
        {tab === 'projects' && <ProjectsTab onOpen={setEditing} toast={toast} />}
        {tab === 'progress' && <ProgressTab toast={toast} />}
        {tab === 'review' && <ReviewTab toast={toast} onCount={setReviewCount} />}
      </div>
      {node}
    </div>
  );
};

export default ProjectStudioAdmin;
