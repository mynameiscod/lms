import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import passportApi, { AdminGamification, XpRuleRow } from '../../api/passportApi';
import './adminXpRewards.css';

/**
 * XP & Rewards — what a member earns, and what they can spend it on.
 *
 * XP: what each type of journey task pays, what the other activities (assessment, mock interview,
 * orientation…) pay, the day bonus, and the tasks priced one by one in the Content Builder. Every figure
 * here is the figure the day player shows and the ledger pays — one price list, read by both.
 *
 * A change applies to XP earned from now on. XP already paid is never re-priced.
 */

type Tab = 'xp';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'xp', label: 'XP', icon: 'bi-lightning-charge-fill' },
];

/** The task-XP rule is priced per task, below; its own amount is only a fallback nobody should edit. */
const TASK_EVENT = 'FOUNDATION_ACTIVITY_COMPLETED';
const DAY_EVENT = 'FOUNDATION_DAY_COMPLETED';

const AdminXpRewards: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'xp') as Tab;

  return <div className="xr">
    <header className="xr-head">
      <div>
        <span className="xr-eyebrow">CareerPilot</span>
        <h1>XP &amp; Rewards</h1>
        <p>Set what members earn for their work. Changes apply to XP earned from now on.</p>
      </div>
    </header>

    {TABS.length > 1 && <nav className="xr-tabs" aria-label="Sections">
      {TABS.map(t => (
        <button key={t.key} type="button" className={t.key === tab ? 'on' : ''}
          onClick={() => setParams(p => { const n = new URLSearchParams(p); n.set('tab', t.key); return n; })}>
          <i className={`bi ${t.icon}`} /> {t.label}
        </button>
      ))}
    </nav>}

    {tab === 'xp' && <XpTab />}
  </div>;
};

const XpTab: React.FC = () => {
  const [data, setData] = useState<AdminGamification | null>(null);
  const [types, setTypes] = useState<Record<string, string>>({});
  const [rules, setRules] = useState<XpRuleRow[]>([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string>('');

  const load = async () => {
    try {
      const d = await passportApi.getAdminGamification();
      setData(d);
      setTypes(Object.fromEntries(d.taskTypes.map(t => [t.key, String(t.xp)])));
      setRules(d.rules);
      setErr('');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load the XP settings.');
    }
  };
  useEffect(() => { load(); }, []);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 3200); };
  const max = data?.taskXpMax || 1000;
  const valid = (v: string) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max;

  const typesDirty = useMemo(() => !!data && data.taskTypes.some(t => String(t.xp) !== types[t.key]), [data, types]);
  const typesValid = Object.values(types).every(valid);

  const saveTypes = async () => {
    if (!typesValid) return;
    setBusy('types');
    try {
      const r = await passportApi.updateTaskXp(Object.fromEntries(Object.entries(types).map(([k, v]) => [k, Math.round(Number(v))])));
      setData(d => (d ? { ...d, taskTypes: r.taskTypes } : d));
      setTypes(Object.fromEntries(r.taskTypes.map(t => [t.key, String(t.xp)])));
      flash('Task XP saved. Members see the new amounts on their next page open.');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save the task XP.');
    }
    setBusy('');
  };

  const ruleOf = (key: string) => rules.find(r => r.eventKey === key);
  const savedRule = (key: string) => data?.rules.find(r => r.eventKey === key);
  const setRule = (key: string, patch: Partial<XpRuleRow>) => setRules(rs => rs.map(r => (r.eventKey === key ? { ...r, ...patch } : r)));
  const ruleDirty = (key: string) => {
    const a = ruleOf(key); const b = savedRule(key);
    return !!a && !!b && (a.enabled !== b.enabled || String(a.xp) !== String(b.xp) || String(a.dailyLimit) !== String(b.dailyLimit));
  };
  const saveRule = async (key: string) => {
    const r = ruleOf(key);
    if (!r) return;
    if (!valid(String(r.xp)) || !(Number(r.dailyLimit) >= 0)) { setErr('Enter whole numbers of 0 or more.'); return; }
    setBusy(key);
    try {
      const out = await passportApi.updateXpRule(key, { enabled: r.enabled, xp: Math.round(Number(r.xp)), dailyLimit: Math.round(Number(r.dailyLimit)) });
      setData(d => (d ? { ...d, rules: d.rules.map(x => (x.eventKey === key ? out.rule : x)) } : d));
      setRules(rs => rs.map(x => (x.eventKey === key ? out.rule : x)));
      setErr('');
      flash('Saved.');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save that rule.');
    }
    setBusy('');
  };

  const resetOverride = async (refKind: 'content' | 'module', refId: string) => {
    setBusy(`o:${refId}`);
    try {
      await passportApi.clearTaskXpOverride(refKind, refId);
      setData(d => (d ? { ...d, taskOverrides: d.taskOverrides.filter(o => o.refId !== refId) } : d));
      flash('Back to the price for its type.');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not reset that task.');
    }
    setBusy('');
  };

  if (!data) return err ? <div className="xr-err"><i className="bi bi-exclamation-circle" /> {err}</div> : <div className="xr-load">Loading…</div>;

  const taskRule = ruleOf(TASK_EVENT);
  const dayRule = ruleOf(DAY_EVENT);
  const otherEvents = data.events.filter(e => e.key !== TASK_EVENT && e.key !== DAY_EVENT);

  return <>
    {err && <div className="xr-err"><i className="bi bi-exclamation-circle" /> {err}</div>}
    {msg && <div className="xr-ok" role="status"><i className="bi bi-check-circle-fill" /> {msg}</div>}

    {/* ── Tasks on a learning day ───────────────────────────────────────── */}
    <section className="xr-card">
      <div className="xr-card-hd">
        <div>
          <h2>Tasks on a learning day</h2>
          <p>What each type of task pays when a member finishes it. A task priced on its own in the Content Builder keeps its own amount.</p>
        </div>
        {taskRule && <label className="xr-switch" title="Switch off to stop paying XP for day tasks">
          <input type="checkbox" checked={taskRule.enabled} onChange={e => setRule(TASK_EVENT, { enabled: e.target.checked })} />
          <span>{taskRule.enabled ? 'Paying XP' : 'Off'}</span>
        </label>}
      </div>

      <div className="xr-types">
        {data.taskTypes.map(t => {
          const v = types[t.key] ?? '';
          const changed = String(t.defaultXp) !== v;
          return <label key={t.key} className={`xr-type${valid(v) ? '' : ' bad'}`}>
            <span className="xr-type-name">{t.label}</span>
            <span className="xr-type-in">
              <input type="number" min={0} max={max} step={1} value={v} inputMode="numeric"
                onChange={e => setTypes(s => ({ ...s, [t.key]: e.target.value }))} />
              <em>XP</em>
            </span>
            {changed && <small>Default {t.defaultXp}</small>}
          </label>;
        })}
      </div>

      <div className="xr-rule-line">
        {dayRule && <div className="xr-inline">
          <span className="xr-inline-l"><b>Day bonus</b><small>Paid once when every task of a day is done</small></span>
          <span className="xr-type-in sm">
            <input type="number" min={0} max={max} step={1} value={dayRule.xp} disabled={!dayRule.enabled}
              onChange={e => setRule(DAY_EVENT, { xp: e.target.value as any })} aria-label="Day bonus XP" />
            <em>XP</em>
          </span>
          <label className="xr-switch sm"><input type="checkbox" checked={dayRule.enabled} onChange={e => setRule(DAY_EVENT, { enabled: e.target.checked })} /><span>{dayRule.enabled ? 'On' : 'Off'}</span></label>
        </div>}
        {taskRule && <div className="xr-inline">
          <span className="xr-inline-l"><b>Daily limit for tasks</b><small>Most task XP a member can earn in one day. 0 = no limit</small></span>
          <span className="xr-type-in sm">
            <input type="number" min={0} step={1} value={taskRule.dailyLimit}
              onChange={e => setRule(TASK_EVENT, { dailyLimit: e.target.value as any })} aria-label="Daily limit for task XP" />
            <em>XP</em>
          </span>
        </div>}
      </div>

      <div className="xr-actions">
        {!typesValid && <span className="xr-hint bad">Use whole numbers from 0 to {max}.</span>}
        <button type="button" className="xr-btn primary" disabled={busy !== '' || (!typesDirty && !ruleDirty(TASK_EVENT) && !ruleDirty(DAY_EVENT)) || !typesValid}
          onClick={async () => {
            if (typesDirty) await saveTypes();
            if (ruleDirty(TASK_EVENT)) await saveRule(TASK_EVENT);
            if (ruleDirty(DAY_EVENT)) await saveRule(DAY_EVENT);
          }}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </section>

    {/* ── Tasks priced one by one ───────────────────────────────────────── */}
    <section className="xr-card">
      <div className="xr-card-hd">
        <div>
          <h2>Tasks with their own XP</h2>
          <p>Set in the Content Builder by clicking a task's <span className="xr-pill">+5 XP</span>. The amount applies wherever that task is used.</p>
        </div>
        <a className="xr-btn" href="/admin/passport/content-builder"><i className="bi bi-layers" /> Open Content Builder</a>
      </div>
      {!data.taskOverrides.length
        ? <div className="xr-blank"><i className="bi bi-pin-angle" /> No task has its own XP yet. Every task pays the amount for its type.</div>
        : <ul className="xr-list">
          {data.taskOverrides.map(o => (
            <li key={`${o.refKind}:${o.refId}`}>
              <span className="xr-list-t"><b>{o.title || 'Untitled task'}</b><small>{o.refKind === 'content' ? 'Lesson content' : 'Checkpoint, assignment or code task'}</small></span>
              <span className="xr-pill strong">{o.xp} XP</span>
              <button type="button" className="xr-btn sm" disabled={busy === `o:${o.refId}`} onClick={() => resetOverride(o.refKind, o.refId)}
                title="Pay the amount for its type again"><i className="bi bi-arrow-counterclockwise" /> Use type amount</button>
            </li>
          ))}
        </ul>}
    </section>

    {/* ── Other activities ──────────────────────────────────────────────── */}
    <section className="xr-card">
      <div className="xr-card-hd">
        <div>
          <h2>Other activities</h2>
          <p>Assessments, mock interviews, orientation and tests. Each pays once per sitting.</p>
        </div>
      </div>
      <div className="xr-rules">
        {otherEvents.map(ev => {
          const r = ruleOf(ev.key);
          if (!r) return null;
          return <div key={ev.key} className={`xr-rule${r.enabled ? '' : ' off'}`}>
            <span className="xr-rule-l"><b>{ev.name}</b><small>{ev.description}</small></span>
            <label className="xr-field"><span>XP</span>
              <span className="xr-type-in sm"><input type="number" min={0} max={max} step={1} value={r.xp} disabled={!r.enabled}
                onChange={e => setRule(ev.key, { xp: e.target.value as any })} /><em>XP</em></span>
            </label>
            <label className="xr-field"><span>Daily limit</span>
              <span className="xr-type-in sm"><input type="number" min={0} step={1} value={r.dailyLimit} disabled={!r.enabled}
                onChange={e => setRule(ev.key, { dailyLimit: e.target.value as any })} /><em>XP</em></span>
            </label>
            <label className="xr-switch sm"><input type="checkbox" checked={r.enabled} onChange={e => setRule(ev.key, { enabled: e.target.checked })} /><span>{r.enabled ? 'On' : 'Off'}</span></label>
            <button type="button" className="xr-btn sm primary" disabled={busy !== '' || !ruleDirty(ev.key)} onClick={() => saveRule(ev.key)}>
              {busy === ev.key ? 'Saving…' : 'Save'}
            </button>
          </div>;
        })}
      </div>
      <p className="xr-foot">Daily limit 0 means no limit. Streak bonuses (7 and 30 days) are fixed.</p>
    </section>
  </>;
};

export default AdminXpRewards;
