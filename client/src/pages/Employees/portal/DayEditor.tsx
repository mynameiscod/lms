import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { portalApi, empErr, DailyLog, DayMode, PortalMe, Task } from '../../../api/employeesApi';
import { DAY_MODES, hoursText, isOffDay, todayIST } from './portalUtils';
import '../employees.css';
import './portal.css';

interface Props {
  date: string;
  config: PortalMe['config'];
  onChanged: () => void;
  /** Bump to make the editor reload the day (e.g. after a check-in). */
  version?: number;
  /** Show the day without allowing changes (older than the edit window). */
  readOnly?: boolean;
}

const emptyTask = (): Task => ({ title: '', category: '', hours: 1, status: 'done', note: '' });

const DayEditor: React.FC<Props> = ({ date, config, onChanged, version = 0, readOnly = false }) => {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState('');
  const [blockers, setBlockers] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [workMode, setWorkMode] = useState<DayMode>('office');
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const apply = useCallback((l: DailyLog) => {
    setLog(l);
    setTasks((l.tasks || []).map((t) => ({ ...t })));
    setSummary(l.summary || '');
    setBlockers(l.blockers || '');
    setTomorrowPlan(l.tomorrowPlan || '');
    setWorkMode(l.workMode || 'office');
    setDirty(false);
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    portalApi.day(date)
      .then((l) => { if (live) { apply(l); setMsg(null); } })
      .catch((e) => { if (live) setMsg({ kind: 'err', text: empErr(e, 'Could not load this day') }); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [date, version, apply]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const policy = config.activityPolicy;
  const locked = readOnly || log?.status === 'submitted' || log?.status === 'approved';
  const off = isOffDay(workMode);
  const total = useMemo(() => tasks.reduce((s, t) => s + (Number(t.hours) || 0), 0), [tasks]);
  const expected = policy.expectedHours || 8;
  const pct = Math.min(100, Math.round((total / expected) * 100));
  const isToday = date === todayIST();

  const touch = () => setDirty(true);
  const setTask = (i: number, patch: Partial<Task>) => { setTasks((ts) => ts.map((t, k) => (k === i ? { ...t, ...patch } : t))); touch(); };

  let blockReason = '';
  if (!off && tasks.length === 0) blockReason = 'Add at least one task before submitting.';
  else if (!off && tasks.some((t) => !t.title.trim())) blockReason = 'Every task needs a title.';
  else if (isToday && policy.requireCheckIn && !off && !log?.checkInAt) blockReason = 'Check in first, then you can submit your day.';

  const body = (): Partial<DailyLog> => ({
    tasks: tasks.filter((t) => t.title.trim()).map((t) => ({ ...t, hours: Math.max(0, Math.min(24, Number(t.hours) || 0)) })),
    summary, blockers, tomorrowPlan, workMode,
  });

  const save = async () => {
    setBusy('save'); setMsg(null);
    try {
      apply(await portalApi.saveDay(date, body()));
      setMsg({ kind: 'ok', text: 'Draft saved.' });
      onChanged();
    } catch (e) { setMsg({ kind: 'err', text: empErr(e) }); } finally { setBusy(''); }
  };

  const submit = async () => {
    setBusy('submit'); setMsg(null);
    try {
      await portalApi.saveDay(date, body());
      apply(await portalApi.submitDay(date));
      setMsg({ kind: 'ok', text: 'Day submitted. Your reviewer will look at it.' });
      onChanged();
    } catch (e) { setMsg({ kind: 'err', text: empErr(e) }); } finally { setBusy(''); }
  };

  if (loading) return <p className="emp-empty">Loading…</p>;
  if (!log) return msg ? <div className="emp-msg err">{msg.text}</div> : null;

  return (
    <div>
      {msg && <div className={`emp-msg ${msg.kind}`} role="status">{msg.text}</div>}
      {locked && !readOnly && <div className="emp-msg info">This day is {log.status === 'approved' ? 'approved' : 'submitted and waiting for review'}, so it cannot be changed.</div>}

      <div className="emp-field">
        <span className="emp-label">Where did you work?</span>
        <div className="emp-modes">
          {DAY_MODES.map((m) => (
            <button key={m.k} type="button" disabled={locked} className={`emp-chip${workMode === m.k ? ' on' : ''}`}
              onClick={() => { setWorkMode(m.k); touch(); }}>{m.label}</button>
          ))}
        </div>
      </div>

      {!off && (
        <>
          <h3>What did you do?</h3>
          {tasks.length === 0 && <p className="emp-hint">No tasks yet. Add what you worked on, one line each.</p>}
          {tasks.map((t, i) => (
            <div className="emp-task" key={i}>
              <div className="emp-task-grid">
                <div className="emp-field">
                  <label htmlFor={`t-title-${date}-${i}`}>Task</label>
                  <input id={`t-title-${date}-${i}`} className="emp-input" value={t.title} disabled={locked} maxLength={200}
                    placeholder="e.g. Called 25 leads" onChange={(e) => setTask(i, { title: e.target.value })} />
                </div>
                <div className="emp-field">
                  <label htmlFor={`t-cat-${date}-${i}`}>Type</label>
                  <select id={`t-cat-${date}-${i}`} className="emp-select" value={t.category || ''} disabled={locked}
                    onChange={(e) => setTask(i, { category: e.target.value })}>
                    <option value="">Choose…</option>
                    {config.activityCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="emp-task-grid3">
                <div className="emp-field">
                  <label htmlFor={`t-hrs-${date}-${i}`}>Hours</label>
                  <input id={`t-hrs-${date}-${i}`} className="emp-input" type="number" inputMode="decimal" min={0} max={24} step={0.25}
                    value={t.hours} disabled={locked} onChange={(e) => setTask(i, { hours: Number(e.target.value) })} />
                </div>
                <div className="emp-field">
                  <label htmlFor={`t-st-${date}-${i}`}>Status</label>
                  <select id={`t-st-${date}-${i}`} className="emp-select" value={t.status} disabled={locked}
                    onChange={(e) => setTask(i, { status: e.target.value as Task['status'] })}>
                    <option value="done">Done</option>
                    <option value="in_progress">In progress</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                <div className="emp-field">
                  <label htmlFor={`t-note-${date}-${i}`}>Note (optional)</label>
                  <input id={`t-note-${date}-${i}`} className="emp-input" value={t.note || ''} disabled={locked} maxLength={300}
                    onChange={(e) => setTask(i, { note: e.target.value })} />
                </div>
              </div>
              {!locked && (
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="emp-btn ghost sm" onClick={() => { setTasks((ts) => ts.filter((_, k) => k !== i)); touch(); }}>Remove task</button>
                </div>
              )}
            </div>
          ))}
          {!locked && (
            <button type="button" className="emp-btn ghost" onClick={() => { setTasks((ts) => [...ts, emptyTask()]); touch(); }}>＋ Add task</button>
          )}

          <div style={{ margin: '14px 0' }}>
            <b>{hoursText(total)}</b> <span className="emp-muted">of {hoursText(expected)} expected</span>
            <div className={`emp-progress${pct >= 100 ? ' full' : ''}`}><i style={{ width: `${pct}%` }} /></div>
          </div>
        </>
      )}

      <div className="emp-field" style={{ marginTop: 10 }}>
        <label htmlFor={`d-sum-${date}`}>Summary of the day</label>
        <textarea id={`d-sum-${date}`} className="emp-textarea" value={summary} disabled={locked} maxLength={2000}
          onChange={(e) => { setSummary(e.target.value); touch(); }} />
      </div>
      {!off && (
        <div className="emp-grid c2" style={{ marginTop: 10 }}>
          <div className="emp-field">
            <label htmlFor={`d-blk-${date}`}>Anything blocking you?</label>
            <textarea id={`d-blk-${date}`} className="emp-textarea" value={blockers} disabled={locked} maxLength={1000}
              onChange={(e) => { setBlockers(e.target.value); touch(); }} />
          </div>
          <div className="emp-field">
            <label htmlFor={`d-plan-${date}`}>Plan for tomorrow</label>
            <textarea id={`d-plan-${date}`} className="emp-textarea" value={tomorrowPlan} disabled={locked} maxLength={1000}
              onChange={(e) => { setTomorrowPlan(e.target.value); touch(); }} />
          </div>
        </div>
      )}

      {!locked && (
        <>
          {dirty && <p className="emp-unsaved">You have unsaved changes.</p>}
          {blockReason && <p className="emp-hint">{blockReason}</p>}
          <div className="emp-sticky-actions">
            <button type="button" className="emp-btn ghost" disabled={!!busy || !dirty} onClick={save}>{busy === 'save' ? 'Saving…' : 'Save draft'}</button>
            <button type="button" className="emp-btn good" disabled={!!busy || !!blockReason} onClick={submit}>{busy === 'submit' ? 'Submitting…' : 'Submit day'}</button>
          </div>
        </>
      )}
    </div>
  );
};

export default DayEditor;
