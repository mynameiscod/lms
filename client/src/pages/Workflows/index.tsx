import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workflowApi, WorkflowRow, OfficeHours as Hours, Options } from '../../api/workflowApi';
import { RECIPES, RECIPE_LOOK, TRIGGERS, triggerSummary, DEFAULT_SETTINGS, suggestRecipe } from './meta';
import Runs, { StatCard } from './Runs';
import './workflows.css';
import './workflowsHome.css';

/**
 * Workflows — WhatsApp and lead automations the admin builds (server: services/workflow/engine.ts).
 *   Workflows     the list; switch on/off; new from a recipe
 *   Runs & Logs   who is inside which workflow right now, and what happened
 *   Office Hours  used by out-of-office replies and "send only in office hours"
 */
const fmt = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
const STATUS_TEXT: Record<string, string> = { active: 'On', paused: 'Paused', draft: 'Draft' };

/* ── Banner art (decorative) ─────────────────────────────────────────────── */

const Tile: React.FC<{ icon: string; tone?: string; className?: string }> = ({ icon, tone = '', className = '' }) => (
  <span className={`wf-art-tile ${tone} ${className}`}><i className={icon} /></span>
);

const HeroArt: React.FC<{ kind: 'flow' | 'runs' | 'hours' }> = ({ kind }) => {
  if (kind === 'runs') return (
    <div className="wf-art chain" aria-hidden>
      <Tile icon="fa-brands fa-whatsapp" tone="wa" /><i className="fa-solid fa-arrow-right" />
      <Tile icon="fa-solid fa-robot" tone="violet" className="spark" /><i className="fa-solid fa-arrow-right" />
      <Tile icon="fa-regular fa-calendar-days" tone="violet" /><i className="fa-solid fa-arrow-right" />
      <Tile icon="fa-solid fa-user-group" tone="violet" />
    </div>
  );
  if (kind === 'hours') return (
    <div className="wf-art hours" aria-hidden>
      <i className="fa-solid fa-leaf leaf" />
      <span className="cal"><i className="fa-regular fa-calendar-days" /></span>
      <span className="clock"><i className="fa-regular fa-clock" /></span>
    </div>
  );
  return (
    <div className="wf-art flow" aria-hidden>
      <span className="line" />
      <Tile icon="fa-brands fa-whatsapp" tone="wa" className="t1" />
      <Tile icon="fa-solid fa-align-left" tone="violet" className="t2" />
      <span className="wf-art-dot t3"><i className="fa-regular fa-clock" /></span>
      <Tile icon="fa-solid fa-user-group" tone="violet" className="t4" />
    </div>
  );
};

/* ── Create New Workflow ─────────────────────────────────────────────────── */

const SECTIONS: { key: 'recommended' | 'engage' | 'advanced'; icon: string; title: string; sub: string }[] = [
  { key: 'recommended', icon: 'fa-wand-magic-sparkles', title: 'Recommended for You', sub: 'Most used workflows to save time and improve lead response.' },
  { key: 'engage', icon: 'fa-user-group', title: 'Follow-ups & Engagement', sub: 'Keep leads active, reduce drop-offs and improve conversions.' },
  { key: 'advanced', icon: 'fa-layer-group', title: 'Advanced & Custom', sub: 'AI, sequences and fully custom workflows for your growth needs.' },
];

const NewWorkflowModal: React.FC<{ busy: boolean; onPick: (key: string) => void; onClose: () => void }> = ({ busy, onPick, onClose }) => {
  const [goal, setGoal] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [miss, setMiss] = useState(false);
  const suggest = () => {
    const k = suggestRecipe(goal);
    setHint(k); setMiss(!k);
    if (k) document.getElementById(`wf-recipe-${k}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  const card = (key: string) => {
    const r = RECIPES.find(x => x.key === key);
    if (!r) return null;
    const look = RECIPE_LOOK[key];
    return (
      <button key={key} id={`wf-recipe-${key}`} className={`wf-rcard ${hint === key ? 'hint' : ''}`} disabled={busy} onClick={() => onPick(key)}>
        <span className="wf-rcard-top">
          <span className={`wf-ico lg ${r.tone}`}><i className={`fa-solid ${r.icon}`} /></span>
          <span className={`wf-tag ${r.tone}`}>{look?.tag}</span>
        </span>
        <b>{r.title}</b>
        <p>{r.what}</p>
      </button>
    );
  };
  return (
    <div className="wf-overlay" onClick={onClose}>
      <div className="wf-modal wf-new" onClick={e => e.stopPropagation()} role="dialog" aria-label="Create New Workflow">
        <div className="wf-new-head">
          <span className="wf-hero-ico"><i className="fa-solid fa-diagram-project" /></span>
          <div>
            <h2>Create New Workflow</h2>
            <p>Automate communication, follow-ups and lead engagement.</p>
          </div>
          <div className="wf-art modal" aria-hidden>
            <span className="line" />
            <span className="wf-art-tile ghost m1" />
            <Tile icon="fa-solid fa-play" className="m2" />
            <Tile icon="fa-solid fa-ellipsis" tone="violet" className="m3" />
            <Tile icon="fa-solid fa-envelope" tone="violet" className="m4" />
            <Tile icon="fa-regular fa-calendar" tone="violet" className="m5" />
          </div>
          <button className="wf-close" onClick={onClose} aria-label="Close"><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="wf-new-body">
          {SECTIONS.map(s => (
            <section key={s.key}>
              <div className="wf-sec-head"><i className={`fa-solid ${s.icon}`} /><div><h4>{s.title}</h4><p>{s.sub}</p></div></div>
              <div className="wf-rgrid">
                {Object.entries(RECIPE_LOOK).filter(([, l]) => l.section === s.key).map(([k]) => card(k))}
                {s.key === 'advanced' && (
                  <button className="wf-rcard" disabled={busy} onClick={() => onPick('blank')}>
                    <span className="wf-rcard-top"><span className="wf-ico lg grey"><i className="fa-solid fa-plus" /></span><span className="wf-tag grey">Custom</span></span>
                    <b>Start from scratch</b>
                    <p>An empty workflow: pick a trigger and add steps.</p>
                  </button>
                )}
              </div>
            </section>
          ))}
          <div className="wf-help">
            <span className="wf-help-ico"><i className="fa-regular fa-lightbulb" /></span>
            <div className="wf-help-text">
              <b>Not sure which workflow to use?</b>
              <p>Tell us your goal (e.g., “follow up after 3 days”) and we’ll suggest the best workflow.</p>
              <div className="wf-help-ask">
                <input className="wf-input" value={goal} placeholder="Your goal…" onChange={e => { setGoal(e.target.value); setMiss(false); }} onKeyDown={e => { if (e.key === 'Enter' && goal.trim()) suggest(); }} />
                <button className="wf-btn" disabled={!goal.trim()} onClick={suggest}>Suggest</button>
              </div>
              {hint && <small className="wf-help-hit">Try <b>{RECIPES.find(r => r.key === hint)?.title}</b> — highlighted above.</small>}
              {miss && <small className="wf-help-miss">No ready-made match — start from scratch and add the steps you need.</small>}
            </div>
            <button className="wf-btn primary lg" disabled={busy} onClick={() => onPick('blank')}><i className="fa-solid fa-plus" /> Start from scratch</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Workflows tab ───────────────────────────────────────────────────────── */

const QUICK = ['ooo', 'welcome', 'faq', 'demo', 'noshow'];
const QUICK_ICON: Record<string, [string, string]> = {
  ooo: ['fa-brands fa-whatsapp', 'wa'], welcome: ['fa-solid fa-user-plus', 'violet'], faq: ['fa-regular fa-circle-question', 'violet'],
  demo: ['fa-regular fa-bell', 'orange'], noshow: ['fa-solid fa-user-clock', 'violet'],
};

const WorkflowList: React.FC<{ onNew: () => void; onPick: (key: string) => void; busy: boolean }> = ({ onNew, onPick, busy }) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<WorkflowRow[] | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState<string[]>([]);
  const load = useCallback(() => workflowApi.list().then(setRows).catch(e => { setRows([]); setErr(e.message); }), []);
  useEffect(() => { load(); workflowApi.options().then(setOptions).catch(() => undefined); }, [load]);

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
  const bulk = async (what: 'active' | 'paused' | 'delete') => {
    const picked = (rows || []).filter(r => sel.includes(r._id));
    if (what === 'delete' && !window.confirm(`Delete ${picked.length} workflow${picked.length === 1 ? '' : 's'}? Anyone inside them is stopped.`)) return;
    const errors: string[] = [];
    for (const w of picked) {
      try {
        if (what === 'delete') await workflowApi.remove(w._id);
        else if (w.status !== what) await workflowApi.setStatus(w._id, what);
      } catch (e: any) { errors.push(`${w.name}: ${e.message}`); }
    }
    setErr(errors.join(' · ')); setSel([]); load();
  };

  const stats = useMemo(() => {
    const r = rows || [];
    const last = r.map(w => w.stats?.lastRunAt).filter(Boolean).sort().pop();
    return { total: r.length, live: r.reduce((a, w) => a + (w.liveRuns || 0), 0), done: r.reduce((a, w) => a + (w.stats?.completed || 0), 0), last };
  }, [rows]);
  const shown = (rows || []).filter(w => filter === 'all' || w.status === filter);
  const allOn = shown.length > 0 && shown.every(w => sel.includes(w._id));

  return (
    <>
      {err && <div className="wf-err">{err}</div>}
      <div className="wf-stats">
        <StatCard tone="violet" icon="fa-diagram-project" label="Total Workflows" value={rows ? stats.total : '–'} />
        <StatCard tone="blue" icon="fa-play" label="In Progress" value={rows ? stats.live : '–'} />
        <StatCard tone="green" icon="fa-check" label="Completed (Runs)" value={rows ? stats.done : '–'} />
        <StatCard tone="orange" icon="fa-regular fa-calendar" label="Last Run" value={<span className={stats.last ? 'wf-stat-date' : ''}>{fmt(stats.last)}</span>} />
      </div>

      <div className="wf-card wf-panel-card">
        <div className="wf-card-head">
          <span className="wf-head-ico plain"><i className="fa-solid fa-bolt" /></span>
          <div><h3>Quick Start Templates</h3><p>Create a workflow in seconds using ready templates.</p></div>
          <span className="wf-spacer" />
          <button className="wf-link" onClick={onNew}>View all templates <i className="fa-solid fa-arrow-right" /></button>
        </div>
        <div className="wf-quick">
          {QUICK.map(k => {
            const r = RECIPES.find(x => x.key === k);
            if (!r) return null;
            const [icon, tone] = QUICK_ICON[k];
            return (
              <button key={k} className="wf-qtile" disabled={busy} onClick={() => onPick(k)}>
                <span className={`wf-ico lg ${tone}`}><i className={icon} /></span>
                <b>{r.title}</b>
                <small>{RECIPE_LOOK[k]?.short}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="wf-list-head">
        <span className="wf-head-ico plain"><i className="fa-solid fa-bars" /></span>
        <div><h3>Your Workflows</h3><p>Manage, edit and monitor all your automation workflows.</p></div>
        <span className="wf-spacer" />
        <label className="wf-period">
          <i className="fa-solid fa-filter" />
          <select value={filter} onChange={e => { setFilter(e.target.value); setSel([]); }} aria-label="Status">
            <option value="all">All Status</option><option value="active">On</option><option value="paused">Paused</option><option value="draft">Draft</option>
          </select>
        </label>
        <button className="wf-btn primary lg" onClick={onNew}><i className="fa-solid fa-plus" /> New workflow</button>
      </div>

      {sel.length > 0 && (
        <div className="wf-bulk">
          <b>{sel.length} selected</b>
          <button className="wf-btn sm" onClick={() => bulk('active')}><i className="fa-solid fa-toggle-on" /> Switch on</button>
          <button className="wf-btn sm" onClick={() => bulk('paused')}><i className="fa-solid fa-pause" /> Pause</button>
          <button className="wf-btn sm danger" onClick={() => bulk('delete')}><i className="fa-solid fa-trash" /> Delete</button>
          <button className="wf-btn sm ghost" onClick={() => setSel([])}>Clear</button>
        </div>
      )}

      <div className="wf-card wf-table-card">
        {!rows ? <p className="wf-muted" style={{ padding: 18 }}>Loading…</p> : (
          <table className="wf-table big">
            <thead><tr>
              <th style={{ width: 36 }}><input type="checkbox" aria-label="Select all" checked={allOn} onChange={() => setSel(allOn ? [] : shown.map(w => w._id))} /></th>
              <th style={{ width: 56 }} /><th>Workflow</th><th>Trigger (When)</th><th>Steps</th><th>Status</th><th>Runs (Done/Total)</th><th>Last Run</th><th style={{ textAlign: 'center' }}>Actions</th>
            </tr></thead>
            <tbody>
              {!shown.length && (
                <tr><td colSpan={9} className="wf-table-empty">
                  {rows.length ? 'No workflows with this status.' : <>No workflows yet — pick a Quick Start template above, or <button className="wf-link" onClick={onNew}>create a new workflow</button>.</>}
                </td></tr>
              )}
              {shown.map(w => {
                const t = TRIGGERS[w.trigger.type];
                const wa = w.trigger.type === 'message_received';
                return (
                  <tr key={w._id} className="click" onClick={() => navigate(`/workflows/${w._id}`)}>
                    <td onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${w.name}`} checked={sel.includes(w._id)} onChange={() => setSel(s => (s.includes(w._id) ? s.filter(x => x !== w._id) : [...s, w._id]))} /></td>
                    <td onClick={e => e.stopPropagation()}><button className={`wf-switch violet ${w.status === 'active' ? 'on' : ''}`} title={w.status === 'active' ? 'Pause' : 'Switch on'} aria-label={w.status === 'active' ? 'Pause' : 'Switch on'} onClick={() => toggle(w)} /></td>
                    <td><div className="wf-name">{w.name}</div><span className={`wf-pill ${w.status}`}>{STATUS_TEXT[w.status]}</span></td>
                    <td>
                      <div className="wf-trig">
                        <span className={`wf-ico ${wa ? 'wa' : 'orange'}`}><i className={wa ? 'fa-brands fa-whatsapp' : `fa-solid ${t.icon}`} /></span>
                        <span><div className="wf-trig-label">{t.label}</div><div className="wf-small wf-muted">{triggerSummary(w.trigger, options)}</div></span>
                      </div>
                    </td>
                    <td><span className="wf-steps"><i className="fa-solid fa-layer-group" /> {w.stepCount}</span></td>
                    <td><span className={`wf-pill dot ${w.status}`}>{STATUS_TEXT[w.status]}</span></td>
                    <td>{w.stats?.completed || 0} / {w.stats?.started || 0}{w.liveRuns ? <div className="wf-small wf-muted">{w.liveRuns} in progress</div> : null}</td>
                    <td className="wf-small wf-muted">{fmt(w.stats?.lastRunAt)}</td>
                    <td onClick={e => e.stopPropagation()} className="wf-actions">
                      <button className="wf-icon-btn" title="Edit" aria-label="Edit" onClick={() => navigate(`/workflows/${w._id}`)}><i className="fa-solid fa-pen" /></button>
                      <button className="wf-icon-btn" title="Duplicate" aria-label="Duplicate" onClick={() => dup(w)}><i className="fa-regular fa-copy" /></button>
                      <button className="wf-icon-btn danger" title="Delete" aria-label="Delete" onClick={() => del(w)}><i className="fa-solid fa-trash" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

/* ── Office Hours tab ────────────────────────────────────────────────────── */

const DAYS: [string, string, string][] = [['mon', 'Monday', 'Mon'], ['tue', 'Tuesday', 'Tue'], ['wed', 'Wednesday', 'Wed'], ['thu', 'Thursday', 'Thu'], ['fri', 'Friday', 'Fri'], ['sat', 'Saturday', 'Sat'], ['sun', 'Sunday', 'Sun']];
const ZONES: [string, string][] = [
  ['Asia/Kolkata', 'Asia/Kolkata (IST, UTC+05:30)'], ['Asia/Dubai', 'Asia/Dubai (GST, UTC+04:00)'], ['Asia/Singapore', 'Asia/Singapore (SGT, UTC+08:00)'],
  ['Europe/London', 'Europe/London (UK time)'], ['America/New_York', 'America/New_York (US Eastern)'], ['America/Los_Angeles', 'America/Los_Angeles (US Pacific)'],
  ['Australia/Sydney', 'Australia/Sydney (Sydney time)'],
];
const DEFAULT_OOO = 'We are currently out of office.\nWe will get back to you {{next_opening}}.';

/** "Mon – Sat", "Mon – Wed, Fri", or "—". Days run Monday first. */
function dayRanges(open: boolean[]): string {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    if (!open[i]) continue;
    let j = i;
    while (j + 1 < 7 && open[j + 1]) j++;
    out.push(j - i >= 2 ? `${DAYS[i][2]} – ${DAYS[j][2]}` : j > i ? `${DAYS[i][2]}, ${DAYS[j][2]}` : DAYS[i][2]);
    i = j;
  }
  return out.join(', ') || '—';
}

/** {{next_opening}} shown as a highlighted token, like in the editor. */
const withVars = (text: string) => text.split(/(\{\{[a-z_]+\}\})/g).map((p, i) => (/^\{\{/.test(p) ? <b key={i} className="wf-var">{p}</b> : <React.Fragment key={i}>{p}</React.Fragment>));

const OfficeHoursTab: React.FC = () => {
  const [h, setH] = useState<Hours | null>(null);
  const [saved, setSaved] = useState<Hours | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);
  const [holiday, setHoliday] = useState({ date: '', name: '' });
  const [ooo, setOoo] = useState<{ text: string; id?: string; name?: string }>({ text: DEFAULT_OOO });
  const take = (x: Hours) => { setH(x); setSaved(x); setSel(DAYS.filter(([d]) => x.days[d]?.open).map(([d]) => d)); };
  const load = useCallback(() => { setErr(''); setOk(''); workflowApi.settings().then(take).catch(e => setErr(e.message)); }, []);
  useEffect(() => {
    load();
    // Show the institute's real out-of-office text when such a workflow exists.
    workflowApi.list().then(async rows => {
      const w = rows.find(r => r.trigger.type === 'message_received' && (r.trigger.config as any)?.officeHours === 'outside');
      if (!w) return;
      const full = await workflowApi.get(w._id);
      const step: any = (full.steps || []).find((s: any) => s.type === 'send_message' && s.config?.text);
      if (step) setOoo({ text: step.config.text, id: w._id, name: w.name });
    }).catch(() => undefined);
  }, [load]);

  if (!h) return err ? <div className="wf-err">{err}</div> : <p className="wf-muted">Loading…</p>;
  const enabled = h.enabled !== false;
  const setDay = (d: string, patch: any) => { setOk(''); setH({ ...h, days: { ...h.days, [d]: { ...h.days[d], ...patch } } }); };
  const sameHours = () => {
    const targets = sel.length ? sel : DAYS.filter(([d]) => h.days[d]?.open).map(([d]) => d);
    const from = DAYS.find(([d]) => targets.includes(d) && h.days[d]?.open)?.[0] || targets[0];
    if (!from) return;
    const { start, end } = h.days[from];
    setOk('');
    setH({ ...h, days: { ...h.days, ...Object.fromEntries(targets.map(d => [d, { open: true, start, end }])) } });
  };
  const save = async () => {
    setSaving(true); setErr(''); setOk('');
    try { take(await workflowApi.saveSettings(h)); setOk('Office hours saved.'); } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };
  const dirty = JSON.stringify(h) !== JSON.stringify(saved);
  const openFlags = DAYS.map(([d]) => !!h.days[d]?.open);
  const openDays = DAYS.filter(([d]) => h.days[d]?.open);
  const spans = Array.from(new Set(openDays.map(([d]) => `${h.days[d].start} – ${h.days[d].end}`)));
  const closed = DAYS.filter(([d]) => !h.days[d]?.open).map(([, l]) => l);

  return (
    <div className="wf-oh">
      <div className="wf-card wf-oh-main">
        <div className="wf-card-head">
          <span className="wf-head-ico"><i className="fa-regular fa-calendar-days" /></span>
          <div><h3>Office Hours</h3><p>Set when the office is open to send and receive replies (e.g., auto-reply outside office hours).</p></div>
          <span className="wf-spacer" />
          <label className="wf-enable">
            Enable Office Hours
            <button className={`wf-switch violet ${enabled ? 'on' : ''}`} aria-label="Enable Office Hours" onClick={() => { setOk(''); setH({ ...h, enabled: !enabled }); }} />
          </label>
        </div>

        {!enabled ? (
          <div className="wf-status off"><i className="fa-solid fa-circle-pause" /><div><b>Office hours are switched off.</b><span>The office counts as always open, so out-of-office replies never go out and “send only in office hours” has no effect.</span></div></div>
        ) : h.openNow ? (
          <div className="wf-status open"><i className="fa-regular fa-circle-check" /><div><b>The office is open now.</b><span>Out-of-office replies use “<b className="wf-var">{'{{next_opening}}'}</b>” for that time.</span></div></div>
        ) : (
          <div className="wf-status closed"><i className="fa-regular fa-moon" /><div><b>The office is closed now — it opens {h.nextOpening}.</b><span>Out-of-office replies use “<b className="wf-var">{'{{next_opening}}'}</b>” for that time.</span></div></div>
        )}

        <div className={enabled ? '' : 'wf-dim'}>
          <div className="wf-oh-row">
            <span className="wf-oh-label"><i className="fa-solid fa-globe" /> Timezone</span>
            <select className="wf-select" style={{ maxWidth: 320 }} value={h.timezone} onChange={e => { setOk(''); setH({ ...h, timezone: e.target.value }); }}>
              {ZONES.map(([z, l]) => <option key={z} value={z}>{l}</option>)}
              {!ZONES.some(([z]) => z === h.timezone) && <option value={h.timezone}>{h.timezone}</option>}
            </select>
          </div>

          <div className="wf-oh-sub">
            <span className="wf-oh-label"><i className="fa-regular fa-clock" /> Working Hours</span>
            <span className="wf-spacer" />
            <button className="wf-link" onClick={sameHours} title="Copies the first ticked day's hours to every ticked day"><i className="fa-regular fa-copy" /> Set same hours for all working days</button>
          </div>
          <div className="wf-days">
            {DAYS.map(([d, label]) => {
              const day = h.days[d] || { open: false, start: '09:30', end: '18:30' };
              return (
                <div key={d} className={`wf-day ${day.open ? '' : 'off'}`}>
                  <label className="wf-day-name">
                    <input type="checkbox" checked={sel.includes(d)} onChange={() => setSel(s => (s.includes(d) ? s.filter(x => x !== d) : [...s, d]))} aria-label={`Tick ${label}`} />
                    {label}
                  </label>
                  <button className={`wf-switch ${day.open ? 'on' : ''}`} onClick={() => setDay(d, { open: !day.open })} aria-label={`${label} open`} />
                  {day.open ? (
                    <span className="wf-day-times">
                      <input className="wf-input" type="time" value={day.start} onChange={e => setDay(d, { start: e.target.value })} aria-label={`${label} opens`} />
                      <span className="wf-muted">to</span>
                      <input className="wf-input" type="time" value={day.end} onChange={e => setDay(d, { end: e.target.value })} aria-label={`${label} closes`} />
                    </span>
                  ) : <span className="wf-closed-pill">Closed</span>}
                </div>
              );
            })}
          </div>

          <div className="wf-oh-sub"><span className="wf-oh-label"><i className="fa-regular fa-calendar" /> Holidays</span></div>
          <div className="wf-row">
            <input className="wf-input" type="date" style={{ width: 180 }} value={holiday.date} onChange={e => setHoliday({ ...holiday, date: e.target.value })} aria-label="Holiday date" />
            <input className="wf-input" style={{ width: 230 }} placeholder="Name (optional)" value={holiday.name} onChange={e => setHoliday({ ...holiday, name: e.target.value })} />
            <button className="wf-btn soft" disabled={!holiday.date} onClick={() => { setOk(''); setH({ ...h, holidays: [...h.holidays.filter(x => x.date !== holiday.date), holiday].sort((a, b) => a.date.localeCompare(b.date)) }); setHoliday({ date: '', name: '' }); }}>Add</button>
          </div>
          <div className="wf-holidays">
            {h.holidays.map(x => (
              <span key={x.date} className="wf-holiday">
                <i className="fa-regular fa-calendar" /> {new Date(`${x.date}T00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{x.name ? ` · ${x.name}` : ''}
                <button className="wf-x" aria-label="Remove holiday" onClick={() => { setOk(''); setH({ ...h, holidays: h.holidays.filter(y => y.date !== x.date) }); }}><i className="fa-solid fa-xmark" /></button>
              </span>
            ))}
            {!h.holidays.length && <span className="wf-muted">No holidays added yet.</span>}
          </div>
        </div>

        {err && <div className="wf-err">{err}</div>}
        {ok && <div className="wf-ok">{ok}</div>}
        <div className="wf-row" style={{ marginTop: 18 }}>
          <button className="wf-btn primary lg" disabled={saving || !dirty} onClick={save}><i className="fa-regular fa-floppy-disk" /> {saving ? 'Saving…' : 'Save Office Hours'}</button>
          <button className="wf-btn lg" disabled={saving || !dirty} onClick={load}><i className="fa-solid fa-rotate" /> Reset</button>
          {dirty && <span className="wf-unsaved">Unsaved changes</span>}
        </div>
      </div>

      <div className="wf-oh-side">
        <div className="wf-card wf-side-card">
          <div className="wf-card-head"><span className="wf-head-ico"><i className="fa-solid fa-chart-simple" /></span><div><h3>Summary</h3><p>Your current office hours configuration.</p></div></div>
          {enabled ? (
            <div className="wf-sum">
              <div><i className="fa-regular fa-calendar" /><span>Working Days</span><b>{dayRanges(openFlags)}</b></div>
              <div><i className="fa-regular fa-clock" /><span>Daily Hours</span><b>{spans.length === 1 ? spans[0] : spans.length ? 'Varies by day' : '—'}</b></div>
              <div><i className="fa-solid fa-ban" /><span>Closed On</span><b>{closed.length ? closed.join(', ') : 'Never'}</b></div>
            </div>
          ) : <p className="wf-muted" style={{ margin: 0 }}>Office hours are off — always open.</p>}
        </div>

        <div className="wf-card wf-side-card">
          <div className="wf-card-head"><span className="wf-head-ico"><i className="fa-regular fa-message" /></span><div><h3>Out-of-Office Auto Reply (Preview)</h3><p>This message will be sent outside your office hours.</p></div></div>
          <div className="wf-quote"><i className="fa-solid fa-quote-left" /><p>{withVars(ooo.text)}</p></div>
          <small className="wf-hint">
            {ooo.id
              ? <>From the workflow <a href={`/workflows/${ooo.id}`}>{ooo.name}</a>. {'{{next_opening}}'} becomes e.g. “{h.nextOpening || 'tomorrow at 9:30 AM'}”.</>
              : <>No out-of-office workflow yet — create one from the <b>Out-of-office reply</b> template on the Workflows tab.</>}
          </small>
        </div>

        <div className="wf-card wf-side-card tips">
          <div className="wf-card-head"><span className="wf-head-ico"><i className="fa-regular fa-lightbulb" /></span><div><h3>Tips for Office Hours</h3></div></div>
          <ul className="wf-tips">
            <li>Use your business time zone (e.g., Asia/Kolkata).</li>
            <li>Keep working hours consistent across weekdays.</li>
            <li>Add holidays to avoid automated replies on those days.</li>
            <li>Use <b className="wf-var">{'{{next_opening}}'}</b> in your out-of-office message.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

/* ── Page ────────────────────────────────────────────────────────────────── */

const TABS: [string, string][] = [['workflows', 'Workflows'], ['runs', 'Runs & Logs'], ['hours', 'Office Hours']];

const WorkflowsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'workflows';
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const create = async (key: string) => {
    setBusy(true); setErr('');
    try {
      const r = RECIPES.find(x => x.key === key);
      const body = r ? r.build() : { name: 'New workflow', trigger: { type: 'lead_created' as const, config: {} }, steps: [], settings: { ...DEFAULT_SETTINGS } };
      const w = await workflowApi.create(body);
      navigate(`/workflows/${w._id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); setShowNew(false); }
  };

  return (
    <div className="wf-page wf-home">
      <div className="wf-hero">
        <div className="wf-hero-top">
          <span className="wf-hero-ico"><i className="fa-solid fa-diagram-project" /></span>
          <div className="wf-hero-text">
            <h1>Workflows</h1>
            <p>Automate WhatsApp replies, questions, demo reminders and lead follow-ups — built step by step, running by themselves.</p>
          </div>
          <HeroArt kind={tab === 'runs' ? 'runs' : tab === 'hours' ? 'hours' : 'flow'} />
        </div>
        <div className="wf-hero-tabs" role="tablist">
          {TABS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setParams({ tab: k })}>{l}</button>
          ))}
        </div>
      </div>
      {err && <div className="wf-err">{err}</div>}
      <div className="wf-home-body">
        {tab === 'workflows' && <WorkflowList onNew={() => setShowNew(true)} onPick={create} busy={busy} />}
        {tab === 'runs' && <Runs onStart={() => setShowNew(true)} onGoWorkflows={() => setParams({ tab: 'workflows' })} />}
        {tab === 'hours' && <OfficeHoursTab />}
      </div>
      {showNew && <NewWorkflowModal busy={busy} onPick={create} onClose={() => setShowNew(false)} />}
    </div>
  );
};

export default WorkflowsPage;
