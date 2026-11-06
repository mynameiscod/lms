import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { leadPipelineApi } from '../../api';
import { Modal } from '../../components/common';
import PicklistEditor from './PicklistEditor';
import './LeadStages.css';

/**
 * Pipeline settings — Stages → Sub-stages → Reasons.
 *
 * Every name here is the institute's own. What a stage MEANS for reports and Meta comes from
 * its milestone (server: config/leadMilestones.ts), so renaming a stage never breaks them.
 */

interface Reason { _id: string; name: string; order: number; isActive: boolean; requiresDetail: boolean }
interface SubStage {
  _id: string; name: string; color?: string; order: number; isActive: boolean;
  requiresReason: boolean; requiresNote: boolean; requiresFollowUp: boolean;
  leadCount: number; reasons: Reason[];
}
interface Stage {
  _id: string; name: string; color: string; order: number; isActive: boolean; isDefault: boolean;
  description?: string; milestone?: string; milestoneEffective: string;
  requiresReason?: boolean; requiresNote?: boolean; isFinal?: boolean; metaEventName?: string;
  leadCount: number; usedByOutpero: boolean; subStages: SubStage[];
}
interface Milestone { value: string; label: string }

type Editing =
  | { kind: 'stage'; item?: Stage }
  | { kind: 'sub'; item?: SubStage }
  | { kind: 'reason'; item?: Reason }
  | null;

const MILESTONE_HELP: Record<string, string> = {
  new: 'Lead just arrived; nobody has reached them.',
  contacting: 'Counsellor is trying to reach them.',
  connected: 'A two-way conversation happened.',
  qualified: 'Eligibility and genuine interest verified.',
  demo: 'Demo scheduled, attended or being managed.',
  seat_reserved: 'Reservation payment verified.',
  enrolled: 'Admission confirmed / converted.',
  nurture: 'Interested, but later. Keeps the counsellor and a reactivation date.',
  lost: 'Closed. Counsellors moving a lead here need manager approval.',
  none: 'Not counted in the admissions funnel or sent to Meta.',
};

const Toggle: React.FC<{ label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, hint, checked, onChange }) => (
  <label className="pl-toggle">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span>
      <span className="pl-toggle-label">{label}</span>
      {hint && <span className="pl-toggle-hint">{hint}</span>}
    </span>
  </label>
);

const LeadStages: React.FC = () => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [stageId, setStageId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [tab, setTab] = useState<'pipeline' | 'lists'>('pipeline');

  const notify = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    window.setTimeout(() => setAlert(null), type === 'error' ? 6000 : 3000);
  };
  const notifyError = useCallback((m: string) => notify('error', m), []);

  const load = useCallback(async () => {
    try {
      const res: any = await leadPipelineApi.get();
      const list: Stage[] = res.data?.stages || [];
      setStages(list);
      setMilestones(res.data?.milestones || []);
      setStageId(prev => (prev && list.some(s => s._id === prev) ? prev : list[0]?._id || null));
    } catch (e: any) {
      notify('error', e.message || 'Could not load the pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stage = useMemo(() => stages.find(s => s._id === stageId) || null, [stages, stageId]);
  const landingCount = useMemo(() => stages.filter(s => s.isDefault).length, [stages]);
  const sub = useMemo(() => stage?.subStages.find(s => s._id === subId) || null, [stage, subId]);

  useEffect(() => {
    if (stage && !stage.subStages.some(s => s._id === subId)) setSubId(stage.subStages[0]?._id || null);
  }, [stage, subId]);

  const milestoneLabel = (v?: string) => milestones.find(m => m.value === v)?.label || v || '—';

  const run = async (fn: () => Promise<any>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) notify('success', ok);
      await load();
      return true;
    } catch (e: any) {
      notify('error', e.message || 'Something went wrong');
      return false;
    } finally {
      setBusy(false);
    }
  };

  // ── open editors ──
  const openStage = (item?: Stage) => {
    setEditing({ kind: 'stage', item });
    setForm(item
      ? { name: item.name, color: item.color, description: item.description || '', metaEventName: item.metaEventName || '', milestone: item.milestone || item.milestoneEffective, requiresReason: !!item.requiresReason, requiresNote: !!item.requiresNote, isFinal: !!item.isFinal, isActive: item.isActive }
      : { name: '', color: '#005897', description: '', metaEventName: '', milestone: 'none', requiresReason: false, requiresNote: false, isFinal: false, isActive: true });
  };
  const openSub = (item?: SubStage) => {
    setEditing({ kind: 'sub', item });
    setForm(item
      ? { name: item.name, color: item.color || '', requiresReason: item.requiresReason, requiresNote: item.requiresNote, requiresFollowUp: item.requiresFollowUp, isActive: item.isActive }
      : { name: '', color: '', requiresReason: false, requiresNote: false, requiresFollowUp: false, isActive: true });
  };
  const openReason = (item?: Reason) => {
    setEditing({ kind: 'reason', item });
    setForm(item ? { name: item.name, requiresDetail: item.requiresDetail, isActive: item.isActive } : { name: '', requiresDetail: false, isActive: true });
  };

  const save = async () => {
    if (!editing) return;
    if (!String(form.name || '').trim()) { notify('error', 'Name is required'); return; }
    const data = { ...form, name: form.name.trim() };
    let done = false;
    if (editing.kind === 'stage') {
      done = await run(() => (editing.item ? leadPipelineApi.updateStage(editing.item._id, data) : leadPipelineApi.createStage(data)), 'Stage saved');
    } else if (editing.kind === 'sub' && stage) {
      done = await run(() => (editing.item ? leadPipelineApi.updateSubStage(editing.item._id, data) : leadPipelineApi.createSubStage({ ...data, stageId: stage._id })), 'Sub-stage saved');
    } else if (editing.kind === 'reason' && sub) {
      done = await run(() => (editing.item ? leadPipelineApi.updateReason(editing.item._id, data) : leadPipelineApi.createReason({ ...data, subStageId: sub._id })), 'Reason saved');
    }
    if (done) setEditing(null);
  };

  // ── delete / reorder ──
  const remove = (kind: 'stage' | 'sub' | 'reason', id: string, name: string) => {
    const what = kind === 'stage' ? 'stage (and its sub-stages and reasons)' : kind === 'sub' ? 'sub-stage (and its reasons)' : 'reason';
    if (!window.confirm(`Delete the ${what} "${name}"? This cannot be undone.`)) return;
    const fn = kind === 'stage' ? leadPipelineApi.deleteStage : kind === 'sub' ? leadPipelineApi.deleteSubStage : leadPipelineApi.deleteReason;
    run(() => fn(id), 'Deleted');
  };

  const move = <T extends { _id: string }>(list: T[], index: number, dir: -1 | 1, persist: (ids: string[]) => Promise<any>) => {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const ids = list.map(x => x._id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => persist(ids));
  };

  const addStarter = () => {
    if (!window.confirm('Add the starter admissions pipeline (New Lead, Contacting, Connected, Qualified, Demo, Seat Reserved, Enrolled, Nurture, Lost) with their sub-stages and reasons?\n\nNothing you already have is changed or removed. Stages with the same name are reused.')) return;
    setBusy(true);
    leadPipelineApi.addStarter()
      .then((res: any) => {
        const d = res.data || {};
        notify('success', `Added ${d.stagesCreated} stage(s), ${d.subStagesCreated} sub-stage(s), ${d.reasonsCreated} reason(s). Reused ${d.stagesReused} existing stage(s).`);
        return load();
      })
      .catch((e: any) => notify('error', e.message || 'Failed to add starter stages'))
      .finally(() => setBusy(false));
  };

  if (loading) return <div className="pl-page"><div className="pl-loading">Loading pipeline…</div></div>;

  return (
    <div className="pl-page">
      <header className="pl-header">
        <div>
          <h1>Lead pipeline</h1>
          <p>Stages your leads move through, the sub-stages inside each, and the reasons counsellors pick. All names are yours to change.</p>
        </div>
        <div className="pl-header-actions">
          <button className="btn btn-outline-secondary btn-sm" onClick={addStarter} disabled={busy}>Add starter stages</button>
          <button className="btn btn-primary btn-sm" onClick={() => openStage()} disabled={busy}>+ Stage</button>
        </div>
      </header>

      {alert && <div className={`alert ${alert.type === 'error' ? 'alert-danger' : 'alert-success'} py-2`}>{alert.message}</div>}

      <ul className="nav nav-tabs pl-tabs">
        <li className="nav-item"><button className={`nav-link${tab === 'pipeline' ? ' active' : ''}`} onClick={() => setTab('pipeline')}>Stages, sub-stages &amp; reasons</button></li>
        <li className="nav-item"><button className={`nav-link${tab === 'lists' ? ' active' : ''}`} onClick={() => setTab('lists')}>Call outcomes &amp; follow-up reasons</button></li>
      </ul>

      {tab === 'lists' ? (
        <>
          <div className="pl-two">
            <PicklistEditor list="call_outcome" title="Call outcomes" onError={notifyError}
              hint="What counsellors pick after a call. “Reached the person” counts the call as connected; “Retry after” suggests the next try." />
            <PicklistEditor list="followup_reason" title="Follow-up reasons" onError={notifyError}
              hint="Why a follow-up is scheduled. Shown when a counsellor schedules a follow-up." />
          </div>
          <a className="pl-link-card" href="/qualification-settings">Qualification checklist — choose which questions must be answered before a lead can be marked Qualified →</a>
        </>
      ) : stages.length === 0 ? (
        <div className="pl-empty">
          <h3>No stages yet</h3>
          <p>Start from the starter admissions pipeline, or create your own stages.</p>
          <button className="btn btn-primary btn-sm me-2" onClick={addStarter}>Add starter stages</button>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => openStage()}>Create a stage</button>
        </div>
      ) : (
        <div className="pl-columns">
          {/* ── Stages ── */}
          <section className="pl-col">
            <div className="pl-col-head"><h2>Stages</h2><span className="pl-count">{stages.length}</span></div>
            <ul className="pl-list">
              {stages.map((s, i) => (
                <li key={s._id} className={`pl-row${s._id === stageId ? ' active' : ''}${s.isActive ? '' : ' off'}`} onClick={() => setStageId(s._id)}>
                  <div className="pl-move" onClick={e => e.stopPropagation()}>
                    <button aria-label="Move up" disabled={i === 0 || busy} onClick={() => move(stages, i, -1, leadPipelineApi.reorderStages)}>▲</button>
                    <button aria-label="Move down" disabled={i === stages.length - 1 || busy} onClick={() => move(stages, i, 1, leadPipelineApi.reorderStages)}>▼</button>
                  </div>
                  <span className="pl-dot" style={{ background: s.color }} />
                  <div className="pl-row-main">
                    <div className="pl-row-name">{s.name}</div>
                    <div className="pl-row-meta">
                      <span className={`pl-ms pl-ms-${s.milestoneEffective}`}>{milestoneLabel(s.milestoneEffective)}{!s.milestone && s.milestoneEffective !== 'none' ? ' (guessed)' : ''}</span>
                      <span>{s.leadCount} lead{s.leadCount === 1 ? '' : 's'}</span>
                      <span>{s.subStages.length} sub-stage{s.subStages.length === 1 ? '' : 's'}</span>
                      {s.isDefault && <span className="pl-tag" title={landingCount > 1 ? 'Several stages are marked as the landing stage. Open the one new leads should go to and choose “Make this the only landing stage”.' : undefined}>New leads land here{landingCount > 1 ? ' (one of several)' : ''}</span>}
                      {s.usedByOutpero && <span className="pl-tag">Outpero</span>}
                      {!s.isActive && <span className="pl-tag pl-tag-off">Off</span>}
                    </div>
                  </div>
                  <div className="pl-row-actions" onClick={e => e.stopPropagation()}>
                    <button className="btn btn-link btn-sm" onClick={() => openStage(s)}>Edit</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Sub-stages ── */}
          <section className="pl-col">
            <div className="pl-col-head">
              <h2>Sub-stages {stage && <small>in {stage.name}</small>}</h2>
              {stage && <button className="btn btn-outline-primary btn-sm" onClick={() => openSub()} disabled={busy}>+ Sub-stage</button>}
            </div>
            {!stage ? <p className="pl-hint">Pick a stage.</p> : stage.subStages.length === 0 ? (
              <p className="pl-hint">No sub-stages. Leads in “{stage.name}” are recorded at stage level only.</p>
            ) : (
              <ul className="pl-list">
                {stage.subStages.map((ss, i) => (
                  <li key={ss._id} className={`pl-row${ss._id === subId ? ' active' : ''}${ss.isActive ? '' : ' off'}`} onClick={() => setSubId(ss._id)}>
                    <div className="pl-move" onClick={e => e.stopPropagation()}>
                      <button aria-label="Move up" disabled={i === 0 || busy} onClick={() => move(stage.subStages, i, -1, ids => leadPipelineApi.reorderSubStages(stage._id, ids))}>▲</button>
                      <button aria-label="Move down" disabled={i === stage.subStages.length - 1 || busy} onClick={() => move(stage.subStages, i, 1, ids => leadPipelineApi.reorderSubStages(stage._id, ids))}>▼</button>
                    </div>
                    <span className="pl-dot" style={{ background: ss.color || stage.color }} />
                    <div className="pl-row-main">
                      <div className="pl-row-name">{ss.name}</div>
                      <div className="pl-row-meta">
                        {ss.requiresReason && <span className="pl-tag">Reason required</span>}
                        {ss.requiresNote && <span className="pl-tag">Note required</span>}
                        {ss.requiresFollowUp && <span className="pl-tag">Follow-up required</span>}
                        <span>{ss.reasons.length} reason{ss.reasons.length === 1 ? '' : 's'}</span>
                        {!ss.isActive && <span className="pl-tag pl-tag-off">Off</span>}
                      </div>
                    </div>
                    <div className="pl-row-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-link btn-sm" onClick={() => openSub(ss)}>Edit</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Reasons ── */}
          <section className="pl-col">
            <div className="pl-col-head">
              <h2>Reasons {sub && <small>for {sub.name}</small>}</h2>
              {sub && <button className="btn btn-outline-primary btn-sm" onClick={() => openReason()} disabled={busy}>+ Reason</button>}
            </div>
            {!sub ? <p className="pl-hint">Pick a sub-stage.</p> : sub.reasons.length === 0 ? (
              <p className="pl-hint">{sub.requiresReason ? 'This sub-stage requires a reason but has none yet — add at least one.' : 'No reasons. Add some if counsellors should say why.'}</p>
            ) : (
              <ul className="pl-list">
                {sub.reasons.map((r, i) => (
                  <li key={r._id} className={`pl-row${r.isActive ? '' : ' off'}`}>
                    <div className="pl-move">
                      <button aria-label="Move up" disabled={i === 0 || busy} onClick={() => move(sub.reasons, i, -1, ids => leadPipelineApi.reorderReasons(sub._id, ids))}>▲</button>
                      <button aria-label="Move down" disabled={i === sub.reasons.length - 1 || busy} onClick={() => move(sub.reasons, i, 1, ids => leadPipelineApi.reorderReasons(sub._id, ids))}>▼</button>
                    </div>
                    <div className="pl-row-main">
                      <div className="pl-row-name">{r.name}</div>
                      <div className="pl-row-meta">
                        {r.requiresDetail && <span className="pl-tag">Asks for details</span>}
                        {!r.isActive && <span className="pl-tag pl-tag-off">Off</span>}
                      </div>
                    </div>
                    <div className="pl-row-actions">
                      <button className="btn btn-link btn-sm" onClick={() => openReason(r)}>Edit</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── Editor ── */}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.item ? 'Edit' : 'New'} ${editing.kind === 'stage' ? 'stage' : editing.kind === 'sub' ? 'sub-stage' : 'reason'}` : ''}
      >
        {editing && (
          <div className="pl-form">
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input className="form-control" autoFocus value={form.name || ''} maxLength={editing.kind === 'reason' ? 120 : 80}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={editing.kind === 'stage' ? 'e.g. Contacting' : editing.kind === 'sub' ? 'e.g. No answer' : 'e.g. Fee too high'} />
            </div>

            {editing.kind === 'stage' && (
              <>
                <div className="mb-3">
                  <label className="form-label">Milestone — what this stage means</label>
                  <select className="form-select" value={form.milestone} onChange={e => setForm(f => ({ ...f, milestone: e.target.value }))}>
                    {milestones.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <div className="form-text">{MILESTONE_HELP[form.milestone] || ''} Reports and Meta use this, never the stage name.</div>
                </div>
                {form.milestone && form.milestone !== 'none' && (
                  <div className="mb-3">
                    <label className="form-label">Meta event name <span className="text-muted">(optional)</span></label>
                    <input className="form-control" value={form.metaEventName || ''} maxLength={60} placeholder="Leave blank for the default" onChange={e => setForm(f => ({ ...f, metaEventName: e.target.value }))} />
                    <div className="form-text">What Meta sees when a lead first reaches this milestone (Meta sync page). Changing it later starts a new event name in Meta.</div>
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Description <span className="text-muted">(optional)</span></label>
                  <input className="form-control" value={form.description || ''} maxLength={300} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Colour</label>
                  <input type="color" className="form-control form-control-color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                </div>
                <Toggle label="Always ask for a reason" hint="When a counsellor moves a lead into this stage." checked={!!form.requiresReason} onChange={v => setForm(f => ({ ...f, requiresReason: v }))} />
                <Toggle label="Final stage" hint="Automatic calling stops once a lead is here." checked={!!form.isFinal} onChange={v => setForm(f => ({ ...f, isFinal: v }))} />
                <Toggle label="On" hint="Switched-off stages are hidden from pickers; leads already in them stay." checked={!!form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} />
              </>
            )}

            {editing.kind === 'sub' && (
              <>
                <div className="mb-3">
                  <label className="form-label">Colour <span className="text-muted">(optional — defaults to the stage colour)</span></label>
                  <div className="d-flex gap-2 align-items-center">
                    <input type="color" className="form-control form-control-color" value={form.color || stage?.color || '#005897'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                    {form.color && <button type="button" className="btn btn-link btn-sm" onClick={() => setForm(f => ({ ...f, color: '' }))}>Use stage colour</button>}
                  </div>
                </div>
                <Toggle label="Reason required" hint="Counsellor must pick one of this sub-stage’s reasons." checked={!!form.requiresReason} onChange={v => setForm(f => ({ ...f, requiresReason: v }))} />
                <Toggle label="Note required" hint="Counsellor must type a note." checked={!!form.requiresNote} onChange={v => setForm(f => ({ ...f, requiresNote: v }))} />
                <Toggle label="Next follow-up required" hint="Counsellor must set when to follow up." checked={!!form.requiresFollowUp} onChange={v => setForm(f => ({ ...f, requiresFollowUp: v }))} />
                <Toggle label="On" checked={!!form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} />
              </>
            )}

            {editing.kind === 'reason' && (
              <>
                <Toggle label="Ask for details" hint="Shows a text box the counsellor must fill — use for “Other”." checked={!!form.requiresDetail} onChange={v => setForm(f => ({ ...f, requiresDetail: v }))} />
                <Toggle label="On" hint="Switched-off reasons stay on leads already closed with them." checked={!!form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} />
              </>
            )}

            <div className="pl-form-actions">
              {editing.item && (
                <div className="me-auto d-flex gap-2">
                  {/* Old setups flagged EVERY stage as a landing stage; offer to make this one the only one. */}
                  {editing.kind === 'stage' && (editing.item as Stage).isActive && (!(editing.item as Stage).isDefault || landingCount > 1) && (
                    <button type="button" className="btn btn-outline-secondary btn-sm" disabled={busy}
                      onClick={async () => { if (await run(() => leadPipelineApi.setLandingStage(editing.item!._id), 'New leads will now land here only')) setEditing(null); }}>
                      {(editing.item as Stage).isDefault ? 'Make this the only landing stage' : 'New leads land here'}
                    </button>
                  )}
                  <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy}
                    onClick={() => { const k = editing.kind; const it = editing.item!; setEditing(null); remove(k, it._id, it.name); }}>
                    Delete
                  </button>
                </div>
              )}
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LeadStages;
