import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { workflowApi, Workflow, Options, Step, StepType, Problem, RunLog } from '../../api/workflowApi';
import { TRIGGERS, STEPS, STEP_GROUPS, newStep, newPath, stepSummary, triggerSummary, uid, DEFAULT_SETTINGS } from './meta';
import { insertStep, removeStep, updateStep, moveStep, updatePath, movePath, findStep, numberSteps, cloneStep } from './tree';
import { TriggerEditor, SettingsEditor, StepEditor, PathEditor } from './editors';
import Runs from './Runs';
import './workflows.css';

/**
 * Workflow Builder canvas — trigger at the top, steps below with a + between every two, a Paths
 * step fans out into side-by-side branches. Click a card to edit it in the panel on the right.
 */
type Sel = { kind: 'trigger' } | { kind: 'settings' } | { kind: 'step'; id: string } | { kind: 'path'; stepId: string; pathId: string } | null;
type Loc = { pathId: string | null; index: number };

const Menu: React.FC<{ items: { label: string; icon: string; onClick: () => void; danger?: boolean; disabled?: boolean }[] }> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} onClick={e => e.stopPropagation()} style={{ marginLeft: 'auto' }}>
      <button className="wf-kebab" aria-label="Actions" onClick={() => setOpen(o => !o)}><i className="fa-solid fa-ellipsis-vertical" /></button>
      {open && (
        <div className="wf-menu">
          {items.map(it => <button key={it.label} className={it.danger ? 'danger' : ''} disabled={it.disabled} onClick={() => { setOpen(false); it.onClick(); }}><i className={`fa-solid ${it.icon}`} style={{ width: 14 }} /> {it.label}</button>)}
        </div>
      )}
    </div>
  );
};

const Builder: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [wf, setWf] = useState<Workflow | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [sel, setSel] = useState<Sel>({ kind: 'trigger' });
  const [picker, setPicker] = useState<Loc | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showRuns, setShowRuns] = useState(false);
  const [showTest, setShowTest] = useState(false);

  useEffect(() => {
    workflowApi.get(id).then(w => { setWf({ ...w, settings: { ...DEFAULT_SETTINGS, ...(w.settings || {}) } }); setProblems(w.problems || []); }).catch(e => setErr(e.message));
    workflowApi.options().then(setOptions).catch(() => setOptions({ stages: [], sources: [], templates: [], users: [], courses: [] }));
  }, [id]);
  useEffect(() => { if (!ok) return undefined; const t = setTimeout(() => setOk(''), 3500); return () => clearTimeout(t); }, [ok]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const change = (patch: Partial<Workflow>) => { setWf(w => (w ? { ...w, ...patch } : w)); setDirty(true); };
  const setSteps = (fn: (s: Step[]) => Step[]) => { setWf(w => (w ? { ...w, steps: fn(w.steps) } : w)); setDirty(true); };

  const save = useCallback(async (): Promise<boolean> => {
    if (!wf) return false;
    setSaving(true); setErr('');
    try {
      const r = await workflowApi.save(wf._id, { name: wf.name, description: wf.description, trigger: wf.trigger, steps: wf.steps, settings: wf.settings });
      setWf(w => (w ? { ...w, ...r, settings: { ...DEFAULT_SETTINGS, ...r.settings } } : w));
      setProblems(r.problems || []);
      setDirty(false);
      setOk('Saved');
      return true;
    } catch (e: any) { setErr(e.message); return false; } finally { setSaving(false); }
  }, [wf]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [save]);

  const setStatus = async (status: Workflow['status']) => {
    if (!wf) return;
    if (status === 'draft' && wf.liveRuns && !window.confirm(`Switch off? ${wf.liveRuns} ${wf.liveRuns === 1 ? 'person is' : 'people are'} still in this workflow — their runs will end. (Pause keeps them waiting instead.)`)) return;
    if (dirty && !(await save())) return;
    setErr('');
    try {
      await workflowApi.setStatus(wf._id, status);
      setWf(w => (w ? { ...w, status } : w));
      setOk(status === 'active' ? 'Switched on — it now runs by itself.' : status === 'paused' ? 'Paused — people inside wait until you resume.' : 'Switched off.');
    } catch (e: any) {
      setErr(e.message);
      if (e.problems) setProblems(e.problems);
    }
  };

  const numbers = useMemo(() => numberSteps(wf?.steps || []), [wf?.steps]);
  const problemsByStep = useMemo(() => {
    const m: Record<string, string[]> = {};
    problems.forEach(p => { if (p.stepId) (m[p.stepId] = m[p.stepId] || []).push(p.message.replace(/^Step [^:]+: /, '')); });
    return m;
  }, [problems]);

  if (err && !wf) return <div className="wf-page"><div className="wf-err">{err}</div><button className="wf-btn" onClick={() => navigate('/workflows')}>Back</button></div>;
  if (!wf) return <div className="wf-page wf-muted">Loading…</div>;

  const pick = (type: StepType) => {
    if (!picker) return;
    const s = newStep(type);
    setSteps(st => insertStep(st, picker.pathId, picker.index, s));
    setSel({ kind: 'step', id: s.id });
    setPicker(null);
  };

  const Plus: React.FC<{ loc: Loc }> = ({ loc }) => (
    <div className="wf-conn"><button className="wf-plus" title="Add a step here" onClick={() => setPicker(loc)}><i className="fa-solid fa-plus" /></button></div>
  );

  const renderList = (list: Step[], pathId: string | null, continues: boolean): React.ReactNode => (
    <>
      <Plus loc={{ pathId, index: 0 }} />
      {list.map((s, i) => {
        const meta = STEPS[s.type];
        const bad = problemsByStep[s.id];
        const isSel = sel?.kind === 'step' && sel.id === s.id;
        const after = i < list.length - 1 || continues;
        return (
          <React.Fragment key={s.id}>
            <div className={`wf-node ${isSel ? 'sel' : ''} ${bad ? 'bad' : ''}`} onClick={() => setSel({ kind: 'step', id: s.id })} title={bad ? bad.join('\n') : ''}>
              <div className="wf-node-top">
                {bad ? <i className="fa-solid fa-circle-exclamation wf-bang" /> : <i className="fa-solid fa-circle-check wf-check" />}
                <span className={`wf-app ${meta.tone}`}><i className={`fa-solid ${meta.icon}`} /> {meta.app}</span>
                <Menu items={[
                  { label: 'Move up', icon: 'fa-arrow-up', disabled: i === 0, onClick: () => setSteps(st => moveStep(st, s.id, -1)) },
                  { label: 'Move down', icon: 'fa-arrow-down', disabled: i === list.length - 1, onClick: () => setSteps(st => moveStep(st, s.id, 1)) },
                  { label: 'Duplicate', icon: 'fa-copy', onClick: () => setSteps(st => insertStep(st, pathId, i + 1, cloneStep(s, uid))) },
                  { label: 'Delete', icon: 'fa-trash', danger: true, onClick: () => { if (s.type !== 'paths' || window.confirm('Delete this Paths step and every step inside its paths?')) { setSteps(st => removeStep(st, s.id)); setSel(null); } } },
                ]} />
              </div>
              <div className="wf-node-title">{numbers[s.id]}. {meta.label}</div>
              <div className="wf-node-sum">{stepSummary(s, options)}</div>
            </div>
            {s.type === 'paths' ? (
              <>
                <div className="wf-conn" style={{ height: 22 }} />
                <div className="wf-branches">
                  {(s.paths || []).map((p, pi) => {
                    const pathSel = sel?.kind === 'path' && sel.pathId === p.id;
                    const cond = p.conditions.length ? `${p.conditions.length} condition${p.conditions.length > 1 ? 's' : ''}` : 'everyone else';
                    const pBad = (problemsByStep[s.id] || []).some(m => m.includes(`"${p.name}"`));
                    return (
                      <div className="wf-branch" key={p.id}>
                        <div className="wf-branch-stem" />
                        <div className={`wf-path-head ${pathSel ? 'sel' : ''} ${pBad ? 'bad' : ''}`} onClick={() => setSel({ kind: 'path', stepId: s.id, pathId: p.id })}>
                          <span>{String.fromCharCode(65 + pi)}. {p.name}</span><small>· {cond}</small>
                          <Menu items={[
                            { label: 'Move left', icon: 'fa-arrow-left', disabled: pi === 0, onClick: () => setSteps(st => movePath(st, s.id, p.id, -1)) },
                            { label: 'Move right', icon: 'fa-arrow-right', disabled: pi === (s.paths || []).length - 1, onClick: () => setSteps(st => movePath(st, s.id, p.id, 1)) },
                            { label: 'Delete path', icon: 'fa-trash', danger: true, disabled: (s.paths || []).length <= 1, onClick: () => { setSteps(st => updateStep(st, s.id, x => ({ ...x, paths: (x.paths || []).filter(y => y.id !== p.id) }))); setSel({ kind: 'step', id: s.id }); } },
                          ]} />
                        </div>
                        {renderList(p.steps, p.id, after)}
                      </div>
                    );
                  })}
                  {(s.paths || []).length < 8 && (
                    <button className="wf-btn sm wf-addpath" onClick={() => {
                      const ps = s.paths || [];
                      const np = newPath(`Path ${String.fromCharCode(65 + ps.length)}`, true);
                      // New paths go before a trailing "everyone else" path so it stays last.
                      const lastIsElse = ps.length && !ps[ps.length - 1].conditions.length;
                      setSteps(st => updateStep(st, s.id, x => ({ ...x, paths: lastIsElse ? [...ps.slice(0, -1), np, ps[ps.length - 1]] : [...ps, np] })));
                      setSel({ kind: 'path', stepId: s.id, pathId: np.id });
                    }}><i className="fa-solid fa-plus" /> Add path</button>
                  )}
                </div>
                {i < list.length - 1 && <div className="wf-conn" style={{ height: 30 }}><span className="wf-end" style={{ position: 'relative', zIndex: 1, marginTop: 4 }}>then continues ↓</span></div>}
                {i < list.length - 1 && <Plus loc={{ pathId, index: i + 1 }} />}
              </>
            ) : (
              s.type !== 'stop' && <Plus loc={{ pathId, index: i + 1 }} />
            )}
          </React.Fragment>
        );
      })}
      {(!list.length || list[list.length - 1].type !== 'paths') && (
        <span className="wf-end">{list.length && list[list.length - 1].type === 'stop' ? 'Stops here' : continues ? 'then continues after the paths' : 'End'}</span>
      )}
    </>
  );

  const selStep = sel?.kind === 'step' ? findStep(wf.steps, sel.id) : null;
  const selPathStep = sel?.kind === 'path' ? findStep(wf.steps, sel.stepId) : null;
  const selPath = sel?.kind === 'path' ? selPathStep?.paths?.find(p => p.id === sel.pathId) : null;
  const trig = TRIGGERS[wf.trigger.type];

  return (
    <div className="wf-page">
      <div className="wf-builder">
        <div className="wf-bar">
          <button className="wf-btn ghost" onClick={() => { if (!dirty || window.confirm('Leave without saving?')) navigate('/workflows'); }}><i className="fa-solid fa-arrow-left" /></button>
          <input className="wf-title" value={wf.name} onChange={e => change({ name: e.target.value })} aria-label="Workflow name" />
          <span className={`wf-pill ${wf.status}`}>{wf.status === 'active' ? '● On' : wf.status === 'paused' ? 'Paused' : 'Draft'}</span>
          {dirty && <span className="wf-unsaved">Unsaved changes</span>}
          {ok && <span className="wf-small" style={{ color: '#16A34A' }}>{ok}</span>}
          <span className="wf-spacer" />
          <button className="wf-btn" onClick={() => setSel({ kind: 'settings' })}><i className="fa-solid fa-gear" /> Settings</button>
          <button className="wf-btn" onClick={() => setShowRuns(true)}><i className="fa-solid fa-list-check" /> Runs{wf.liveRuns ? ` (${wf.liveRuns})` : ''}</button>
          <button className="wf-btn" onClick={async () => { if (dirty && !(await save())) return; setShowTest(true); }}><i className="fa-solid fa-play" /> Test run</button>
          <button className="wf-btn" disabled={saving || !dirty} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
          {wf.status === 'draft' && <button className="wf-btn green" onClick={() => setStatus('active')}><i className="fa-solid fa-power-off" /> Switch on</button>}
          {wf.status === 'active' && <button className="wf-btn" onClick={() => setStatus('paused')}><i className="fa-solid fa-pause" /> Pause</button>}
          {wf.status === 'paused' && <button className="wf-btn green" onClick={() => setStatus('active')}><i className="fa-solid fa-play" /> Resume</button>}
          {wf.status !== 'draft' && <button className="wf-btn danger" onClick={() => setStatus('draft')}>Switch off</button>}
        </div>
        {err && <div className="wf-err" style={{ margin: '8px 16px 0' }}>{err}</div>}

        <div className="wf-body">
          <div className="wf-canvas" onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
            <div className="wf-canvas-inner" style={{ zoom } as any} onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
              <div className={`wf-node ${sel?.kind === 'trigger' ? 'sel' : ''}`} onClick={() => setSel({ kind: 'trigger' })}>
                <div className="wf-node-top">
                  <i className="fa-solid fa-circle-check wf-check" />
                  <span className="wf-app trigger orange"><i className={`fa-solid ${trig.icon}`} /> {trig.app}</span>
                  <span className="wf-small wf-muted" style={{ marginLeft: 'auto' }}>WHEN</span>
                </div>
                <div className="wf-node-title">{trig.label}</div>
                <div className="wf-node-sum">{triggerSummary(wf.trigger, options)}</div>
              </div>
              {renderList(wf.steps, null, false)}
            </div>
            <div className="wf-zoom">
              <button onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(2)))} aria-label="Zoom out"><i className="fa-solid fa-minus" /></button>
              <span>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(2)))} aria-label="Zoom in"><i className="fa-solid fa-plus" /></button>
              <button onClick={() => setZoom(1)} aria-label="Reset zoom"><i className="fa-solid fa-expand" /></button>
            </div>
          </div>

          <aside className="wf-panel">
            {sel?.kind === 'trigger' && (
              <>
                <div className="wf-panel-head"><span className="wf-ico orange"><i className={`fa-solid ${trig.icon}`} /></span><div><h3>Trigger</h3><p>What starts this workflow.</p></div><button className="wf-x" style={{ marginLeft: 'auto' }} onClick={() => setSel(null)}><i className="fa-solid fa-xmark" /></button></div>
                <div className="wf-panel-body"><TriggerEditor wf={wf} options={options} onChange={t => change({ trigger: t })} /></div>
              </>
            )}
            {sel?.kind === 'settings' && (
              <>
                <div className="wf-panel-head"><span className="wf-ico indigo"><i className="fa-solid fa-gear" /></span><div><h3>Workflow settings</h3><p>Who can enter, when messages go out, when it stops.</p></div><button className="wf-x" style={{ marginLeft: 'auto' }} onClick={() => setSel(null)}><i className="fa-solid fa-xmark" /></button></div>
                <div className="wf-panel-body"><SettingsEditor wf={wf} options={options} onChange={change} /></div>
              </>
            )}
            {selStep && (
              <>
                <div className="wf-panel-head">
                  <span className={`wf-ico ${STEPS[selStep.type].tone}`}><i className={`fa-solid ${STEPS[selStep.type].icon}`} /></span>
                  <div><h3>{numbers[selStep.id]}. {STEPS[selStep.type].label}</h3><p>{STEPS[selStep.type].what}</p></div>
                  <button className="wf-x" style={{ marginLeft: 'auto' }} onClick={() => setSel(null)}><i className="fa-solid fa-xmark" /></button>
                </div>
                <div className="wf-panel-body">
                  {problemsByStep[selStep.id] && <div className="wf-err">{problemsByStep[selStep.id].map(m => <div key={m}>{m}</div>)}</div>}
                  <StepEditor key={selStep.id} step={selStep} wf={wf} options={options} onChange={ns => setSteps(st => updateStep(st, selStep.id, () => ns))} />
                  <hr style={{ border: 0, borderTop: '1px solid #F1F5F9', margin: '18px 0 12px' }} />
                  <button className="wf-btn sm danger" onClick={() => { setSteps(st => removeStep(st, selStep.id)); setSel(null); }}><i className="fa-solid fa-trash" /> Delete step</button>
                </div>
              </>
            )}
            {selPath && selPathStep && (
              <>
                <div className="wf-panel-head"><span className="wf-ico orange"><i className="fa-solid fa-code-branch" /></span><div><h3>Path: {selPath.name}</h3><p>Who goes down this branch.</p></div><button className="wf-x" style={{ marginLeft: 'auto' }} onClick={() => setSel(null)}><i className="fa-solid fa-xmark" /></button></div>
                <div className="wf-panel-body">
                  <PathEditor key={selPath.id} path={selPath} steps={wf.steps} options={options} isLast={(selPathStep.paths || []).slice(-1)[0]?.id === selPath.id}
                    onChange={np => setSteps(st => updatePath(st, selPathStep.id, selPath.id, () => np))} />
                </div>
              </>
            )}
            {!sel && (
              <>
                <div className="wf-panel-head"><span className="wf-ico indigo"><i className="fa-solid fa-diagram-project" /></span><div><h3>{wf.name}</h3><p>Click a card to edit it. Press + to add a step.</p></div></div>
                <div className="wf-panel-body">
                  {problems.length ? (
                    <div className="wf-warn">
                      <b>Before switching on, fix:</b>
                      <ul className="wf-problems">{problems.map((p, i) => <li key={i} onClick={() => p.stepId && setSel({ kind: 'step', id: p.stepId })}>{p.message}</li>)}</ul>
                      {dirty && <div style={{ marginTop: 6 }}>Save to check again.</div>}
                    </div>
                  ) : <div className="wf-ok">Everything needed is filled in{dirty ? ' (save to confirm)' : ''}.</div>}
                  {wf.stats && <p className="wf-small wf-muted">Started {wf.stats.started} · completed {wf.stats.completed} · stopped {wf.stats.stopped} · failed {wf.stats.failed}</p>}
                  <div className="wf-info"><b>How it runs.</b> Each person goes through the steps top to bottom. “Ask a question” and “Wait” steps pause only that person. Editing a live workflow is fine: people continue from the step they are on.</div>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>

      {picker && (
        <div className="wf-overlay" onClick={() => setPicker(null)}>
          <div className="wf-modal" onClick={e => e.stopPropagation()}>
            <div className="wf-modal-head"><h3>Add a step</h3><button className="wf-x" onClick={() => setPicker(null)}><i className="fa-solid fa-xmark" /></button></div>
            <div className="wf-modal-body">
              {STEP_GROUPS.map(g => (
                <div className="wf-picker-group" key={g}>
                  <h4>{g}</h4>
                  <div className="wf-picker-grid">
                    {(Object.keys(STEPS) as StepType[]).filter(t => STEPS[t].group === g).map(t => (
                      <button key={t} className="wf-pick" onClick={() => pick(t)}>
                        <span className={`wf-ico ${STEPS[t].tone}`}><i className={`fa-solid ${STEPS[t].icon}`} /></span>
                        <span><b>{STEPS[t].label}</b><small>{STEPS[t].what}</small></span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showRuns && (
        <div className="wf-overlay" onClick={() => setShowRuns(false)}>
          <div className="wf-modal" style={{ maxWidth: 980 }} onClick={e => e.stopPropagation()}>
            <div className="wf-modal-head"><h3>Runs — {wf.name}</h3><button className="wf-x" onClick={() => setShowRuns(false)}><i className="fa-solid fa-xmark" /></button></div>
            <div className="wf-modal-body"><Runs workflowId={wf._id} compact /></div>
          </div>
        </div>
      )}

      {showTest && <TestRun wf={wf} onClose={() => setShowTest(false)} />}
    </div>
  );
};

/** Put one lead through the workflow now (real messages). */
const TestRun: React.FC<{ wf: Workflow; onClose: () => void }> = ({ wf, onClose }) => {
  const [q, setQ] = useState('');
  const [found, setFound] = useState<{ _id: string; name: string; phone: string }[]>([]);
  const [lead, setLead] = useState<{ _id: string; name: string; phone: string } | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [log, setLog] = useState<RunLog[] | null>(null);
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return undefined; }
    const t = setTimeout(() => workflowApi.findLeads(q.trim()).then(setFound).catch(() => setFound([])), 300);
    return () => clearTimeout(t);
  }, [q]);
  const run = async () => {
    if (!lead) return;
    setBusy(true); setErr('');
    try { const r = await workflowApi.test(wf._id, lead._id, message); setLog(r.log); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="wf-overlay" onClick={onClose}>
      <div className="wf-modal narrow" onClick={e => e.stopPropagation()}>
        <div className="wf-modal-head"><h3>Test run</h3><button className="wf-x" onClick={onClose}><i className="fa-solid fa-xmark" /></button></div>
        <div className="wf-modal-body">
          <div className="wf-warn">This really runs the steps for the lead you pick — messages are sent and the lead is updated. Create a test lead with your own WhatsApp number to try it safely. Works for drafts too.</div>
          {!lead ? (
            <div className="wf-field">
              <label>Lead</label>
              <input className="wf-input" autoFocus placeholder="Search name, phone or email" value={q} onChange={e => setQ(e.target.value)} />
              {found.map(l => <button key={l._id} className="wf-pick" style={{ width: '100%', marginTop: 6 }} onClick={() => setLead(l)}><span><b>{l.name}</b><small>{l.phone}</small></span></button>)}
            </div>
          ) : (
            <div className="wf-row" style={{ marginBottom: 12 }}><b>{lead.name}</b><span className="wf-muted">{lead.phone}</span><button className="wf-btn sm" onClick={() => { setLead(null); setLog(null); }}>Change</button></div>
          )}
          {wf.trigger.type === 'message_received' && (
            <div className="wf-field"><label>Pretend they sent</label><input className="wf-input" value={message} onChange={e => setMessage(e.target.value)} placeholder="What are the fees?" /></div>
          )}
          {err && <div className="wf-err">{err}</div>}
          {log && (
            <>
              <div className="wf-ok">Started. What happened so far:</div>
              <ul className="wf-log">{log.map((l, i) => <li key={i} className={l.ok ? '' : 'bad'}>{l.note}</li>)}</ul>
              <small className="wf-hint">Questions and waits continue by themselves — follow it in Runs.</small>
            </>
          )}
        </div>
        <div className="wf-modal-foot">
          <button className="wf-btn" onClick={onClose}>Close</button>
          <button className="wf-btn primary" disabled={!lead || busy} onClick={run}>{busy ? 'Running…' : 'Run now'}</button>
        </div>
      </div>
    </div>
  );
};

export default Builder;
