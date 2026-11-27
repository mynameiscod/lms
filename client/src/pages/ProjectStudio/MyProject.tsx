import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { projectStudioApi, MyProjectData, PTask, TaskState, CatalogItem, PROOF_LABEL, errMsg } from '../../api/projectStudioApi';
import { Modal, Markdown, useToast } from '../ProblemBank/shared';
import { PctBar } from './PctBar';
import '../ProblemBank/ProblemBank.css';
import './ProjectStudio.css';

/**
 * A student's project: pick one released project (once), add the GitHub repository, then work
 * through the tasks — read the brief, build in your own repo, submit proof, answer the interview
 * questions.
 */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'task';
const STATUS_TEXT: Record<string, string> = { submitted: 'Waiting for review', changes: 'Changes requested', done: 'Done' };

/* ── Picking a project ────────────────────────────────────────────────────── */

const Catalog: React.FC<{ items: CatalogItem[]; onPicked: () => void; toast: (t: string, bad?: boolean) => void }> = ({ items, onPicked, toast }) => {
  const [confirm, setConfirm] = useState<CatalogItem | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    if (!confirm) return;
    setBusy(true);
    try { await projectStudioApi.pick(confirm._id); toast('Project picked — let’s build it'); onPicked(); }
    catch (e) { toast(errMsg(e, 'Could not pick this project'), true); }
    setBusy(false); setConfirm(null);
  };
  if (!items.length) return (
    <div className="pb-card pb-empty">
      <h2>No project yet</h2>
      <p className="pb-muted">Your mentors have not released a project to your batch yet. It will appear here.</p>
    </div>
  );
  return (
    <>
      <p className="pb-muted">Pick the project you will build end to end. <b>Choose carefully — you cannot switch later.</b></p>
      <div className="ps-catalog">
        {items.map((c) => (
          <div key={c._id} className="pb-card ps-cat-card">
            <h3>{c.title}</h3>
            <div className="ps-stack">
              {c.domain && <span className="pb-pill pb-badge-accent">{c.domain}</span>}
              <span className="pb-pill pb-badge-neutral">{c.level}</span>
              {c.techStack.map((s) => <span key={s} className="pb-tag">{s}</span>)}
            </div>
            <div className="pb-muted" style={{ fontSize: 13 }}>{c.sprintCount} sprints · {c.dayCount} days · {c.taskCount} tasks</div>
            {open === c._id ? (
              <>
                <Markdown text={c.summary} empty="" />
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
                  {c.sprints.map((s, i) => <li key={i}><b>{s.title}</b>{s.goal ? ` — ${s.goal}` : ''} <span className="pb-muted">({s.days} days)</span></li>)}
                </ul>
              </>
            ) : <button className="pb-linkbtn" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(c._id)}>See the plan</button>}
            <span className="pb-grow" />
            <button className="pb-btn pb-btn-primary" onClick={() => setConfirm(c)}>Pick this project</button>
          </div>
        ))}
      </div>
      {confirm && (
        <Modal title={`Build "${confirm.title}"?`} onClose={() => setConfirm(null)} footer={<>
          <button className="pb-btn" onClick={() => setConfirm(null)}>Not yet</button>
          <button className="pb-btn pb-btn-primary" disabled={busy} onClick={pick}>{busy ? <span className="pb-spinner" /> : null} Yes, this is my project</button>
        </>}>
          <p>This becomes your project for the course. <b>You cannot switch to another one later</b> — only your mentor can change it.</p>
          <p className="pb-muted">Tech stack: {confirm.techStack.join(', ') || '—'} · {confirm.taskCount} tasks at your own pace.</p>
        </Modal>
      )}
    </>
  );
};

/* ── Repository ───────────────────────────────────────────────────────────── */

const RepoCard: React.FC<{ repoUrl?: string; title: string; onSaved: (u: string) => void; toast: (t: string, bad?: boolean) => void }> = ({ repoUrl, title, onSaved, toast }) => {
  const [editing, setEditing] = useState(!repoUrl);
  const [url, setUrl] = useState(repoUrl || '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { const r = await projectStudioApi.setRepo(url); onSaved(r.repoUrl); setEditing(false); toast('Repository saved'); }
    catch (e) { toast(errMsg(e, 'Could not save the repository'), true); }
    setBusy(false);
  };
  if (!editing && repoUrl) return (
    <div className="pb-card pb-row" style={{ padding: '10px 14px', marginBottom: 14 }}>
      <i className="fa-brands fa-github" style={{ fontSize: 18 }} />
      <a className="pb-grow" href={repoUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 650 }}>{repoUrl.replace('https://github.com/', '')}</a>
      <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={() => setEditing(true)}>Change</button>
    </div>
  );
  return (
    <div className="pb-card" style={{ padding: 16, marginBottom: 14 }}>
      <b><i className="fa-brands fa-github" /> Step 1 — create your own GitHub repository</b>
      <ol style={{ margin: '8px 0', paddingLeft: 20, fontSize: 13.5 }}>
        <li>Open <a href="https://github.com/new" target="_blank" rel="noreferrer">github.com/new</a>, name it e.g. <code>{slug(title)}</code>, keep it <b>Public</b> (it goes on your resume), tick “Add a README”.</li>
        <li>Clone it to your laptop and open it in VS Code.</li>
        <li>Paste the repository link below. Every task is submitted from this repository.</li>
      </ol>
      <div className="pb-row" style={{ gap: 8 }}>
        <input className="pb-input pb-grow" value={url} placeholder="https://github.com/your-name/project-name" onChange={(e) => setUrl(e.target.value)} />
        <button className="pb-btn pb-btn-primary" disabled={busy || !url.trim()} onClick={save}>Save</button>
        {repoUrl && <button className="pb-btn" onClick={() => { setUrl(repoUrl); setEditing(false); }}>Cancel</button>}
      </div>
    </div>
  );
};

/* ── One task ─────────────────────────────────────────────────────────────── */

const TaskView: React.FC<{
  task: PTask; where: string; state?: TaskState; repoUrl?: string; onClose: () => void; onChanged: () => void; toast: (t: string, bad?: boolean) => void;
}> = ({ task, where, state, repoUrl, onClose, onChanged, toast }) => {
  const [proofUrl, setProofUrl] = useState(state?.proofUrl || '');
  const [note, setNote] = useState(state?.note || '');
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [checks, setChecks] = useState(state?.selfCheck || []);
  const branch = `feature/${slug(task.title)}`;
  const needsRepo = (task.proofType === 'commit' || task.proofType === 'pr') && !repoUrl;
  const canSubmit = state?.status !== 'done';

  const submit = async () => {
    setBusy(true);
    try {
      const r = await projectStudioApi.submit(String(task._id), { proofUrl, note });
      toast(r.status === 'done' ? 'Task done — answer the interview questions below' : 'Submitted — your mentor will review it');
      onChanged();
    } catch (e) { toast(errMsg(e, 'Could not submit'), true); }
    setBusy(false);
  };
  const mark = async (i: number, knew: boolean) => {
    try { const r = await projectStudioApi.selfCheck(String(task._id), i, knew); setChecks(r.selfCheck); } catch (e) { toast(errMsg(e), true); }
  };

  return (
    <Modal wide title={task.title} onClose={onClose}>
      <div className="pb-muted" style={{ fontSize: 13, marginBottom: 6 }}>{where}</div>
      {state && <div className={`pb-alert ${state.status === 'done' ? 'pb-alert-ok' : state.status === 'changes' ? 'pb-alert-bad' : 'pb-alert-warn'}`}>
        <b>{STATUS_TEXT[state.status]}</b>{state.reviewNote ? <> — {state.reviewNote}</> : null}
      </div>}
      {task.story && <p style={{ fontSize: 15, fontWeight: 600 }}>{task.story}</p>}
      {task.brief && <Markdown text={task.brief} empty="" />}
      {task.acceptance.length > 0 && <>
        <h4 style={{ margin: '14px 0 6px' }}>Done when</h4>
        <ul className="ps-check">{task.acceptance.map((a, i) => <li key={i}>{a}</li>)}</ul>
      </>}
      <h4 style={{ margin: '14px 0 6px' }}>Work on it like a developer</h4>
      <div className="ps-git">{`git checkout main && git pull
git checkout -b ${branch}
# … build the task …
git add .
git commit -m "${task.title.replace(/"/g, "'")}"
git push -u origin ${branch}
# open a pull request on GitHub and merge it into main`}</div>

      {canSubmit && <>
        <h4 style={{ margin: '16px 0 6px' }}>Submit — {PROOF_LABEL[task.proofType]}</h4>
        {needsRepo ? <div className="pb-alert pb-alert-warn">Add your GitHub repository at the top of the page first.</div> : <>
          {task.proofType !== 'text' && <input className="pb-input" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)}
            placeholder={task.proofType === 'commit' ? `${repoUrl}/commit/…` : task.proofType === 'pr' ? `${repoUrl}/pull/…` : 'https://…'} />}
          <textarea className="pb-textarea" rows={task.proofType === 'text' ? 5 : 2} style={{ marginTop: 8 }} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={task.proofType === 'text' ? 'Explain what you built and how it works (at least 20 characters)' : 'Anything your mentor should know (optional)'} />
          <div className="pb-row" style={{ marginTop: 8 }}>
            <span className="pb-grow pb-muted" style={{ fontSize: 12.5 }}>Check every “Done when” point before you submit.</span>
            <button className="pb-btn pb-btn-primary" disabled={busy} onClick={submit}>{busy ? <span className="pb-spinner" /> : null} {state ? 'Submit again' : 'Submit'}</button>
          </div>
        </>}
      </>}

      <h4 style={{ margin: '18px 0 6px' }}>Interview questions</h4>
      {(task.questionCount || 0) === 0 ? <div className="pb-muted">None for this task.</div>
        : task.questions.length === 0 ? <div className="pb-muted"><i className="fa-solid fa-lock" /> {task.questionCount} question(s) unlock when you submit this task.</div>
        : task.questions.map((q, i) => {
          const c = checks.find((x) => x.i === i);
          return (
            <div key={i} className="ps-qa">
              <b>{i + 1}. {q.q}</b>
              {shown.has(i) ? <div className="a">{q.a || <span className="pb-faint">No model answer given.</span>}</div>
                : <div><button className="pb-linkbtn" onClick={() => setShown(new Set([...shown, i]))}>Answer it in your head (or out loud), then show the model answer</button></div>}
              {shown.has(i) && <div className="pb-row" style={{ gap: 6, marginTop: 8 }}>
                <button className={`pb-btn pb-btn-sm ${c?.knew === true ? 'pb-btn-success' : ''}`} onClick={() => mark(i, true)}>I knew it</button>
                <button className={`pb-btn pb-btn-sm ${c?.knew === false ? 'pb-btn-danger' : ''}`} onClick={() => mark(i, false)}>Need practice</button>
              </div>}
            </div>
          );
        })}
    </Modal>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────── */

const MyProject: React.FC = () => {
  const [data, setData] = useState<MyProjectData | null>(null);
  const [err, setErr] = useState('');
  const [openTask, setOpenTask] = useState<string | null>(null);
  const { show, node } = useToast();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const toast = useCallback(show, []);
  const load = useCallback(() => { projectStudioApi.me().then(setData).catch((e) => setErr(errMsg(e, 'Could not load your project'))); }, []);
  useEffect(() => { load(); }, [load]);

  const e = data?.enrollment;
  const t = data?.template;
  const states = useMemo(() => new Map((e?.tasks || []).map((s) => [s.taskId, s])), [e]);
  const flat = useMemo(() => {
    const out: { task: PTask; where: string }[] = [];
    for (const s of t?.sprints || []) for (const d of s.days) for (const k of d.tasks) out.push({ task: k, where: `${s.title} · ${d.title}` });
    return out;
  }, [t]);
  const nextId = flat.find((x) => states.get(String(x.task._id))?.status !== 'done')?.task._id;
  const doneCount = flat.filter((x) => states.get(String(x.task._id))?.status === 'done').length;
  const current = flat.find((x) => String(x.task._id) === openTask);

  return (
    <div className="pb-root">
      <div className="ps-wrap">
        {err ? <div className="pb-alert pb-alert-bad">{err}</div> : !data ? <div className="pb-muted"><span className="pb-spinner" /> Loading…</div> : !e || !t ? (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>My Project</h1>
            <Catalog items={data.catalog || []} onPicked={load} toast={toast} />
          </>
        ) : (
          <>
            <div className="pb-card ps-hero" style={{ marginBottom: 14 }}>
              <div className="pb-grow">
                <h1>{t.title}</h1>
                <div className="ps-stack">{t.techStack.map((s) => <span key={s} className="pb-tag">{s}</span>)}</div>
              </div>
              <div style={{ minWidth: 240 }}>
                <PctBar pct={e.completionPct} />
                <div className="pb-muted" style={{ fontSize: 12.5, marginTop: 4 }}>{doneCount} of {flat.length} tasks done{t.reviewMode !== 'auto' ? ' · a mentor approves each task' : ''}</div>
              </div>
            </div>
            <RepoCard repoUrl={e.repoUrl} title={t.title} toast={toast} onSaved={(u) => setData({ ...data, enrollment: { ...e, repoUrl: u } })} />
            {t.summary && <details className="pb-card" style={{ padding: '10px 14px', marginBottom: 6 }}><summary style={{ cursor: 'pointer', fontWeight: 650 }}>What you are building</summary><Markdown text={t.summary} empty="" /></details>}
            {t.sprints.map((s) => (
              <div key={s._id} className="ps-sprint">
                <div className="ps-sprint-h"><h2>{s.title}</h2>{s.goal && <span className="pb-muted">{s.goal}</span>}</div>
                {s.days.map((d) => (
                  <div key={d._id} className="pb-card ps-day">
                    <div className="ps-day-h">{d.title}</div>
                    {d.tasks.map((k) => {
                      const st = states.get(String(k._id));
                      return (
                        <div key={k._id} role="button" tabIndex={0} className={`ps-task ${k._id === nextId ? 'next' : ''}`}
                          onClick={() => setOpenTask(String(k._id))} onKeyDown={(ev) => { if (ev.key === 'Enter') setOpenTask(String(k._id)); }}>
                          <span className={`ps-dot ${st?.status || ''}`}>{st?.status === 'done' ? '✓' : st?.status === 'changes' ? '!' : ''}</span>
                          <span className="ps-task-t"><b>{k.title}</b>{k.story && <small>{k.story}</small>}</span>
                          {st ? <span className="pb-muted" style={{ fontSize: 12.5 }}>{STATUS_TEXT[st.status]}</span> : k._id === nextId ? <span className="pb-pill pb-badge-accent">Up next</span> : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
            {current && <TaskView key={String(current.task._id)} task={current.task} where={current.where} state={states.get(String(current.task._id))} repoUrl={e.repoUrl}
              onClose={() => setOpenTask(null)} onChanged={load} toast={toast} />}
          </>
        )}
      </div>
      {node}
    </div>
  );
};

export default MyProject;
