import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workflowApi, WorkflowRow, OfficeHours as Hours, Options } from '../../api/workflowApi';
import { RECIPES, TRIGGERS, triggerSummary, DEFAULT_SETTINGS } from './meta';
import Runs from './Runs';
import './workflows.css';

/**
 * Workflows — WhatsApp and lead automations the admin builds (server: services/workflow/engine.ts).
 *   Workflows    the list; switch on/off; new from a recipe
 *   Runs         who is inside which workflow right now, and what happened
 *   Office hours used by out-of-office replies and "send only in office hours"
 */
const fmt = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

const RecipeGrid: React.FC<{ onPick: (key: string) => void; busy: boolean }> = ({ onPick, busy }) => (
  <div className="wf-recipes">
    {RECIPES.map(r => (
      <button key={r.key} className="wf-recipe" disabled={busy} onClick={() => onPick(r.key)}>
        <span className={`wf-ico ${r.tone}`}><i className={`fa-solid ${r.icon}`} /></span>
        <span><b>{r.title}</b><p>{r.what}</p></span>
      </button>
    ))}
    <button className="wf-recipe" disabled={busy} onClick={() => onPick('blank')}>
      <span className="wf-ico grey"><i className="fa-solid fa-plus" /></span>
      <span><b>Start from scratch</b><p>An empty workflow: pick a trigger and add steps.</p></span>
    </button>
  </div>
);

const WorkflowList: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<WorkflowRow[] | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const load = useCallback(() => workflowApi.list().then(setRows).catch(e => { setRows([]); setErr(e.message); }), []);
  useEffect(() => { load(); workflowApi.options().then(setOptions).catch(() => undefined); }, [load]);

  const create = async (key: string) => {
    setBusy(true); setErr('');
    try {
      const r = RECIPES.find(x => x.key === key);
      const body = r ? r.build() : { name: 'New workflow', trigger: { type: 'lead_created' as const, config: {} }, steps: [], settings: { ...DEFAULT_SETTINGS } };
      const w = await workflowApi.create(body);
      navigate(`/workflows/${w._id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };
  const toggle = async (w: WorkflowRow) => {
    setErr('');
    try { await workflowApi.setStatus(w._id, w.status === 'active' ? 'paused' : 'active'); load(); }
    catch (e: any) { setErr(`${w.name}: ${e.message}`); }
  };
  const dup = async (w: WorkflowRow) => { try { const r = await workflowApi.duplicate(w._id); navigate(`/workflows/${r._id}`); } catch (e: any) { setErr(e.message); } };
  const del = async (w: WorkflowRow) => {
    if (!window.confirm(`Delete "${w.name}"?${w.liveRuns ? ` ${w.liveRuns} people inside it will be stopped.` : ''}`)) return;
    try { await workflowApi.remove(w._id); load(); } catch (e: any) { setErr(e.message); }
  };

  if (!rows) return <p className="wf-muted">Loading…</p>;
  return (
    <>
      {err && <div className="wf-err">{err}</div>}
      {!rows.length ? (
        <>
          <div className="wf-info" style={{ marginBottom: 14 }}>No workflows yet. Start from a ready-made recipe — you can change every step before switching it on.</div>
          <RecipeGrid onPick={create} busy={busy} />
        </>
      ) : (
        <>
          <div className="wf-row" style={{ marginBottom: 12 }}>
            <span className="wf-muted wf-small">{rows.filter(r => r.status === 'active').length} on · {rows.length} total</span>
            <span className="wf-spacer" />
            <button className="wf-btn primary" onClick={() => setShowNew(true)}><i className="fa-solid fa-plus" /> New workflow</button>
          </div>
          <div className="wf-card" style={{ overflow: 'hidden' }}>
            <table className="wf-table">
              <thead><tr><th style={{ width: 52 }}>On</th><th>Workflow</th><th>When</th><th>Steps</th><th>In progress</th><th>Done</th><th>Last run</th><th /></tr></thead>
              <tbody>
                {rows.map(w => {
                  const t = TRIGGERS[w.trigger.type];
                  return (
                    <tr key={w._id} className="click" onClick={() => navigate(`/workflows/${w._id}`)}>
                      <td onClick={e => e.stopPropagation()}><button className={`wf-switch ${w.status === 'active' ? 'on' : ''}`} title={w.status === 'active' ? 'Pause' : 'Switch on'} onClick={() => toggle(w)} /></td>
                      <td><div className="wf-name">{w.name}</div><span className={`wf-pill ${w.status}`}>{w.status === 'active' ? 'On' : w.status === 'paused' ? 'Paused' : 'Draft'}</span></td>
                      <td><div className="wf-row" style={{ gap: 8, flexWrap: 'nowrap' }}><span className="wf-ico orange" style={{ width: 26, height: 26 }}><i className={`fa-solid ${t.icon}`} /></span><span><div className="wf-small" style={{ fontWeight: 600 }}>{t.label}</div><div className="wf-small wf-muted">{triggerSummary(w.trigger, options)}</div></span></div></td>
                      <td>{w.stepCount}</td>
                      <td>{w.liveRuns || 0}</td>
                      <td className="wf-small">{w.stats?.completed || 0}<span className="wf-muted"> / {w.stats?.started || 0}</span></td>
                      <td className="wf-small wf-muted">{fmt(w.stats?.lastRunAt)}</td>
                      <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <button className="wf-btn sm ghost" title="Duplicate" onClick={() => dup(w)}><i className="fa-solid fa-copy" /></button>
                        <button className="wf-btn sm ghost danger" title="Delete" onClick={() => del(w)}><i className="fa-solid fa-trash" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {showNew && (
        <div className="wf-overlay" onClick={() => setShowNew(false)}>
          <div className="wf-modal" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
            <div className="wf-modal-head"><h3>New workflow</h3><button className="wf-x" onClick={() => setShowNew(false)}><i className="fa-solid fa-xmark" /></button></div>
            <div className="wf-modal-body"><RecipeGrid onPick={create} busy={busy} /></div>
          </div>
        </div>
      )}
    </>
  );
};

const DAYS: [string, string][] = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
const OfficeHoursTab: React.FC = () => {
  const [h, setH] = useState<Hours | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);
  const [holiday, setHoliday] = useState({ date: '', name: '' });
  useEffect(() => { workflowApi.settings().then(setH).catch(e => setErr(e.message)); }, []);
  if (!h) return err ? <div className="wf-err">{err}</div> : <p className="wf-muted">Loading…</p>;
  const setDay = (d: string, patch: any) => setH({ ...h, days: { ...h.days, [d]: { ...h.days[d], ...patch } } });
  const save = async () => {
    setSaving(true); setErr(''); setOk('');
    try { setH(await workflowApi.saveSettings(h)); setOk('Saved.'); } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };
  return (
    <div className="wf-card" style={{ padding: 18, maxWidth: 680 }}>
      <div className={h.openNow ? 'wf-ok' : 'wf-warn'} style={{ marginTop: 0 }}>
        {h.openNow ? 'The office is open now.' : `The office is closed now — it opens ${h.nextOpening}.`} Out-of-office replies use <code>{'{{next_opening}}'}</code> for that time.
      </div>
      <div className="wf-field" style={{ maxWidth: 260 }}>
        <label>Timezone</label>
        <select className="wf-select" value={h.timezone} onChange={e => setH({ ...h, timezone: e.target.value })}>
          {['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney'].map(z => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>
      <label className="wf-label">Working hours</label>
      <div className="wf-hours">
        {DAYS.map(([d, label]) => (
          <React.Fragment key={d}>
            <span>{label}</span>
            <button className={`wf-switch ${h.days[d]?.open ? 'on' : ''}`} onClick={() => setDay(d, { open: !h.days[d]?.open })} aria-label={`${label} open`} />
            {h.days[d]?.open ? (
              <div className="wf-inline" style={{ maxWidth: 280 }}>
                <input className="wf-input" type="time" value={h.days[d].start} onChange={e => setDay(d, { start: e.target.value })} />
                <span className="none wf-muted">to</span>
                <input className="wf-input" type="time" value={h.days[d].end} onChange={e => setDay(d, { end: e.target.value })} />
              </div>
            ) : <span className="wf-muted wf-small">Closed</span>}
          </React.Fragment>
        ))}
      </div>
      <label className="wf-label" style={{ marginTop: 18 }}>Holidays</label>
      <div className="wf-row" style={{ marginBottom: 8 }}>
        <input className="wf-input" type="date" style={{ width: 170 }} value={holiday.date} onChange={e => setHoliday({ ...holiday, date: e.target.value })} />
        <input className="wf-input" style={{ width: 200 }} placeholder="Name (optional)" value={holiday.name} onChange={e => setHoliday({ ...holiday, name: e.target.value })} />
        <button className="wf-btn sm" disabled={!holiday.date} onClick={() => { setH({ ...h, holidays: [...h.holidays.filter(x => x.date !== holiday.date), holiday].sort((a, b) => a.date.localeCompare(b.date)) }); setHoliday({ date: '', name: '' }); }}>Add</button>
      </div>
      <div className="wf-chips">
        {h.holidays.map(x => <button key={x.date} className="wf-chip" onClick={() => setH({ ...h, holidays: h.holidays.filter(y => y.date !== x.date) })}>{new Date(`${x.date}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{x.name ? ` · ${x.name}` : ''} ×</button>)}
        {!h.holidays.length && <span className="wf-hint">No holidays added.</span>}
      </div>
      {err && <div className="wf-err">{err}</div>}
      {ok && <div className="wf-ok">{ok}</div>}
      <div style={{ marginTop: 16 }}><button className="wf-btn primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save office hours'}</button></div>
    </div>
  );
};

const WorkflowsPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'workflows';
  return (
    <div className="wf-page">
      <div className="wf-row">
        <span className="wf-ico indigo" style={{ width: 40, height: 40, fontSize: 17 }}><i className="fa-solid fa-diagram-project" /></span>
        <div><h1>Workflows</h1><p className="wf-sub">Automatic WhatsApp replies, questions, demo reminders and lead follow-ups — built step by step, running by themselves.</p></div>
      </div>
      <div className="wf-tabs">
        {[['workflows', 'Workflows'], ['runs', 'Runs'], ['hours', 'Office hours']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setParams({ tab: k })}>{l}</button>
        ))}
      </div>
      {tab === 'workflows' && <WorkflowList />}
      {tab === 'runs' && <Runs />}
      {tab === 'hours' && <OfficeHoursTab />}
    </div>
  );
};

export default WorkflowsPage;
