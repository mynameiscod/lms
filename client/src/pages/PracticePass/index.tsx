import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { practicePassApi, Overview, StandingRow, TaskCounts, Effective } from '../../api/practicePassApi';
import { problemSetAdminApi } from '../../api/problemSetApi';
import { PracticeCalendar } from './MyPractice';
import { Modal, useToast } from '../ProblemBank/shared';
import '../ProblemBank/ProblemBank.css';

/**
 * Practice Pass — admin. Switch it on, set the daily tasks and threshold (institute default,
 * per batch, per student), and watch who is practising, who missed yesterday and who is on
 * placement hold.
 */

const TASKS: { key: keyof TaskCounts; label: string }[] = [
  { key: 'communication', label: 'Communication Lab' },
  { key: 'coding_problem', label: 'Coding problem' },
  { key: 'assignment', label: 'Assignment' },
  { key: 'thinking_lab', label: 'Thinking Lab' },
];

const statusOf = (r: StandingRow) => r.exempt ? 'exempt' : r.onHold ? 'hold' : r.pct < r.thresholdPct ? 'risk' : 'ok';
const STATUS_PILL: Record<string, [string, string]> = {
  hold: ['pb-badge-bad', 'On hold'], risk: ['pb-badge-warn', 'At risk'], ok: ['pb-badge-ok', 'Eligible'], exempt: ['pb-badge-neutral', 'Exempt'],
};

/** Edit one rule level. `inherit` shows what applies when a field is left empty. */
const RuleEditor: React.FC<{
  title: string; scope: 'tenant' | 'batch' | 'student'; targetId: string; policy: any; inherit: Effective; onClose: () => void; onSaved: () => void;
}> = ({ title, scope, targetId, policy, inherit, onClose, onSaved }) => {
  const [useOwnTasks, setUseOwnTasks] = useState(scope === 'tenant' || !!policy?.requirements);
  const [req, setReq] = useState<TaskCounts>(policy?.requirements || inherit.requirements);
  const [threshold, setThreshold] = useState<string>(policy?.thresholdPct !== undefined ? String(policy.thresholdPct) : '');
  const [windowDays, setWindowDays] = useState<string>(policy?.windowDays !== undefined ? String(policy.windowDays) : '');
  const [enforce, setEnforce] = useState<string>(policy?.enforce === undefined ? '' : policy.enforce ? 'yes' : 'no');
  const [exempt, setExempt] = useState(!!policy?.exempt);
  const [reminders, setReminders] = useState(policy?.remindersEnabled !== false);
  const [note, setNote] = useState(policy?.note || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    setBusy(true); setErr('');
    try {
      await practicePassApi.savePolicy({
        scope, targetId, note,
        requirements: useOwnTasks ? req : null,
        thresholdPct: threshold === '' ? null : Number(threshold),
        windowDays: windowDays === '' ? null : Number(windowDays),
        enforce: enforce === '' ? (scope === 'tenant' ? true : null) : enforce === 'yes',
        ...(scope === 'student' ? { exempt } : {}),
        ...(scope === 'tenant' ? { remindersEnabled: reminders } : {}),
      });
      onSaved();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save.'); }
    setBusy(false);
  };
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <button className="pb-btn" onClick={onClose}>Cancel</button>
      <button className="pb-btn pb-btn-primary" disabled={busy} onClick={save}>{busy ? <span className="pb-spinner" /> : null} Save & recalculate</button>
    </>}>
      {scope !== 'tenant' && (
        <label className="pb-switch" style={{ marginBottom: 6 }}><input type="checkbox" checked={useOwnTasks} onChange={(e) => setUseOwnTasks(e.target.checked)} /> Set different daily tasks here</label>
      )}
      {useOwnTasks ? (
        <div className="pb-card" style={{ padding: 12 }}>
          <div className="pb-muted" style={{ fontSize: 12.5, marginBottom: 8 }}>How many of each a student must complete every working day (0 = not required).</div>
          {TASKS.map((t) => (
            <div key={t.key} className="pb-row" style={{ marginBottom: 6 }}>
              <span className="pb-grow" style={{ fontWeight: 600 }}>{t.label}</span>
              <input className="pb-input" type="number" min={0} max={10} style={{ width: 80 }} value={req[t.key] ?? 0} onChange={(e) => setReq({ ...req, [t.key]: Number(e.target.value) })} />
            </div>
          ))}
          {(req.assignment || 0) > 0 && <div className="pb-help" style={{ color: 'var(--pb-warn)' }}>Only require assignments if this batch gets one every working day — otherwise every day without one counts as missed.</div>}
        </div>
      ) : <div className="pb-muted" style={{ fontSize: 13 }}>Uses: {TASKS.filter((t) => inherit.requirements[t.key] > 0).map((t) => `${t.label}${inherit.requirements[t.key] > 1 ? ` ×${inherit.requirements[t.key]}` : ''}`).join(', ')}</div>}
      <div className="pb-field-row">
        <div><label className="pb-label">Placement threshold % <small>{scope === 'tenant' ? '' : `empty = ${inherit.thresholdPct}%`}</small></label>
          <input className="pb-input" type="number" min={0} max={100} value={threshold} placeholder={String(inherit.thresholdPct)} onChange={(e) => setThreshold(e.target.value)} /></div>
        <div><label className="pb-label">Window (days) <small>{scope === 'tenant' ? '' : `empty = ${inherit.windowDays}`}</small></label>
          <input className="pb-input" type="number" min={7} max={180} value={windowDays} placeholder={String(inherit.windowDays)} onChange={(e) => setWindowDays(e.target.value)} /></div>
      </div>
      <label className="pb-label">Placement hold when below threshold</label>
      <select className="pb-select" value={enforce} onChange={(e) => setEnforce(e.target.value)}>
        {scope !== 'tenant' && <option value="">Inherit ({inherit.enforce ? 'on' : 'off'})</option>}
        <option value="yes">On — block placement support automatically</option>
        <option value="no">Off — show only</option>
      </select>
      {scope === 'student' && <label className="pb-switch" style={{ marginTop: 12 }}><input type="checkbox" checked={exempt} onChange={(e) => setExempt(e.target.checked)} /> Exempt this student (medical, special case)</label>}
      {scope === 'tenant' && <label className="pb-switch" style={{ marginTop: 12 }}><input type="checkbox" checked={reminders} onChange={(e) => setReminders(e.target.checked)} /> 7 PM WhatsApp reminder to students with tasks left <small className="pb-faint">(needs the "Daily practice — evening reminder" template assigned)</small></label>}
      <label className="pb-label">Note <small>why this rule</small></label>
      <input className="pb-input" value={note} onChange={(e) => setNote(e.target.value)} />
      {err && <div className="pb-alert pb-alert-bad">{err}</div>}
    </Modal>
  );
};

const PracticePassAdmin: React.FC = () => {
  const toast = useToast();
  const [tab, setTab] = useState<'standings' | 'rules'>('standings');
  const [ov, setOv] = useState<Overview | null>(null);
  const [err, setErr] = useState('');
  const [batchId, setBatchId] = useState('');
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState<{ rows: StandingRow[]; summary: any } | null>(null);
  const [editing, setEditing] = useState<{ title: string; scope: 'tenant' | 'batch' | 'student'; targetId: string; policy: any; inherit: Effective } | null>(null);
  const [cal, setCal] = useState<{ row: StandingRow; days: any[] } | null>(null);
  const [grace, setGrace] = useState(7);
  const [busy, setBusy] = useState(false);
  const [studentQ, setStudentQ] = useState('');
  const [studentHits, setStudentHits] = useState<{ _id: string; name: string; email: string; role: string }[]>([]);

  const loadOv = useCallback(() => practicePassApi.overview().then(setOv).catch((e) => setErr(e?.response?.data?.message || 'Could not load.')), []);
  const loadStandings = useCallback(() => practicePassApi.standings({ batchId: batchId || undefined, filter: filter || undefined }).then(setData).catch(() => undefined), [batchId, filter]);
  useEffect(() => { loadOv(); }, [loadOv]);
  useEffect(() => { if (ov?.enabled) loadStandings(); }, [ov?.enabled, loadStandings]);
  useEffect(() => {
    if (studentQ.trim().length < 2) { setStudentHits([]); return; }
    const t = setTimeout(() => problemSetAdminApi.users(studentQ).then((r) => setStudentHits(r.filter((u) => u.role === 'STUDENT'))).catch(() => undefined), 300);
    return () => clearTimeout(t);
  }, [studentQ]);

  const rows = useMemo(() => (data?.rows || []).filter((r) => !q || `${r.name} ${r.email} ${r.phone || ''}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const effTenant = ov?.tenant.effective;

  const exportCsv = () => {
    const head = ['Name', 'Email', 'Phone', 'Batch', 'Practice %', 'Days met', 'Days counted', 'Threshold', 'Streak', 'Done today', 'Missed yesterday', 'Status'];
    const lines = rows.map((r) => [r.name, r.email, r.phone || '', r.batchName, r.pct, r.metDays, r.countedDays, r.thresholdPct, r.streak, r.todayMet ? 'yes' : 'no', r.missedYesterday ? 'yes' : 'no', STATUS_PILL[statusOf(r)][1]]);
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `practice-standings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (err) return <div className="pb-root"><div className="pb-page"><div className="pb-alert pb-alert-bad">{err}</div></div></div>;
  if (!ov) return <div className="pb-root"><div className="pb-page pb-muted"><span className="pb-spinner" /> Loading…</div></div>;

  return (
    <div className="pb-root">
      <div className="pb-page">
        <div className="pb-head">
          <div className="pb-grow">
            <h1>Practice Pass</h1>
            <p>Every working day students complete the tasks you set. Their practice attendance decides placement support — below the threshold, placement support is put on hold automatically.</p>
          </div>
          {ov.enabled ? (
            <div className="pb-row">
              <span className="pb-pill pb-badge-ok"><span className="pb-dot" /> On since {ov.tenant.startDate}</span>
              {effTenant && effTenant.enforceFrom > new Date().toISOString().slice(0, 10) && <span className="pb-pill pb-badge-warn">Holds start {effTenant.enforceFrom}</span>}
              <button className="pb-btn pb-btn-sm" onClick={async () => { const r = await practicePassApi.recompute(); toast.show(`Recalculated ${r.students} students.`); loadStandings(); }}><i className="fa-solid fa-rotate" /> Recalculate</button>
              <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={async () => { if (!window.confirm('Switch the Practice Pass off? All placement holds are lifted.')) return; await practicePassApi.disable(); loadOv(); }}>Switch off</button>
            </div>
          ) : null}
        </div>

        {!ov.enabled ? (
          <div className="pb-card" style={{ padding: 22 }}>
            <h2>Switch on the Practice Pass</h2>
            <p className="pb-muted">Counting starts today — nobody is judged on days before it. Default daily tasks: 1 Communication Lab, 1 coding problem, 1 Thinking Lab (change them under Rules). Default threshold: 80% over 30 days. Weekly offs, holidays and approved leave are excused automatically.</p>
            <div className="pb-row" style={{ marginTop: 10 }}>
              <label className="pb-row" style={{ gap: 6 }}>Grace period <input className="pb-input" type="number" min={0} max={60} style={{ width: 80 }} value={grace} onChange={(e) => setGrace(Number(e.target.value))} /> days before holds start</label>
              <button className="pb-btn pb-btn-primary" disabled={busy} onClick={async () => {
                setBusy(true);
                try { const r = await practicePassApi.enable(grace); toast.show(`Switched on. Holds start ${r.enforceFrom}.`); await loadOv(); } catch (e: any) { toast.show(e?.response?.data?.message || 'Could not switch on.', true); }
                setBusy(false);
              }}>{busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-power-off" />} Switch on for all LMS batches</button>
            </div>
          </div>
        ) : <>
          <div className="pb-tabs" style={{ padding: 0, background: 'transparent', marginBottom: 14 }}>
            <button className={tab === 'standings' ? 'on' : ''} onClick={() => setTab('standings')}><i className="fa-solid fa-ranking-star" /> Standings</button>
            <button className={tab === 'rules' ? 'on' : ''} onClick={() => setTab('rules')}><i className="fa-solid fa-sliders" /> Rules</button>
          </div>

          {tab === 'standings' && <>
            {data && (
              <div className="pb-stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                <div className="pb-card pb-stat"><div className="l">Students</div><div className="n">{data.summary.students}</div></div>
                <div className="pb-card pb-stat"><div className="l">Done today</div><div className="n" style={{ color: 'var(--pb-ok)' }}>{data.summary.doneToday}</div></div>
                <div className="pb-card pb-stat" style={{ cursor: 'pointer' }} onClick={() => setFilter('missed')}><div className="l">Missed yesterday</div><div className="n" style={{ color: 'var(--pb-warn)' }}>{data.summary.missedYesterday}</div></div>
                <div className="pb-card pb-stat" style={{ cursor: 'pointer' }} onClick={() => setFilter('hold')}><div className="l">On placement hold</div><div className="n" style={{ color: 'var(--pb-bad)' }}>{data.summary.onHold}</div></div>
                <div className="pb-card pb-stat"><div className="l">Average practice</div><div className="n">{data.summary.avgPct}%</div></div>
              </div>
            )}
            <div className="pb-card pb-filters">
              <div className="pb-search"><i className="fa-solid fa-magnifying-glass" /><input className="pb-input" placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <select className="pb-select" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value="">All batches</option>{ov.batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
              <select className="pb-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="">Everyone</option><option value="missed">Missed yesterday</option><option value="hold">On placement hold</option>
              </select>
              <button className="pb-btn pb-btn-sm" onClick={exportCsv}><i className="fa-solid fa-file-csv" /> Export</button>
            </div>
            <div className="pb-card pb-table-wrap">
              <table className="pb-table">
                <thead><tr><th>Student</th><th>Batch</th><th>Practice</th><th>Days</th><th>Streak</th><th>Today</th><th>Yesterday</th><th>Status</th></tr></thead>
                <tbody>
                  {!rows.length && <tr><td colSpan={8} className="pb-muted" style={{ textAlign: 'center', padding: 24 }}>No students match.</td></tr>}
                  {rows.map((r) => {
                    const st = statusOf(r);
                    return (
                      <tr key={r.studentId} onClick={async () => { const c = await practicePassApi.student(r.studentId); setCal({ row: r, days: c.days }); }}>
                        <td><b>{r.name}</b><div className="pb-faint" style={{ fontSize: 12 }}>{r.phone || r.email}</div></td>
                        <td className="pb-muted">{r.batchName}</td>
                        <td style={{ minWidth: 140 }}>
                          <b style={{ color: r.pct < r.thresholdPct ? 'var(--pb-bad)' : 'var(--pb-ok)' }}>{r.pct}%</b> <span className="pb-faint">/ {r.thresholdPct}%</span>
                          <div className="pb-diffbar" style={{ margin: '4px 0 0', height: 5 }}><span style={{ width: `${Math.min(100, r.pct)}%`, background: r.pct < r.thresholdPct ? 'var(--pb-bad)' : 'var(--pb-ok)' }} /></div>
                        </td>
                        <td className="pb-muted">{r.metDays}/{r.countedDays}</td>
                        <td>🔥 {r.streak}</td>
                        <td>{r.todayMet ? <i className="fa-solid fa-circle-check" style={{ color: 'var(--pb-ok)' }} /> : <span className="pb-faint">—</span>}</td>
                        <td>{r.missedYesterday ? <span className="pb-pill pb-badge-warn">Missed</span> : <span className="pb-faint">—</span>}</td>
                        <td><span className={`pb-pill ${STATUS_PILL[st][0]}`}>{STATUS_PILL[st][1]}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>}

          {tab === 'rules' && effTenant && <>
            <div className="pb-card" style={{ padding: 16, marginBottom: 14 }}>
              <div className="pb-row"><h3 className="pb-grow" style={{ margin: 0 }}>Institute default</h3>
                <button className="pb-btn pb-btn-sm" onClick={() => setEditing({ title: 'Institute default rule', scope: 'tenant', targetId: '', policy: ov.tenant, inherit: effTenant })}><i className="fa-solid fa-pen" /> Edit</button></div>
              <div className="pb-muted" style={{ marginTop: 6, fontSize: 13.5 }}>
                Daily: <b>{TASKS.filter((t) => effTenant.requirements[t.key] > 0).map((t) => `${t.label}${effTenant.requirements[t.key] > 1 ? ` ×${effTenant.requirements[t.key]}` : ''}`).join(' + ')}</b> ·
                threshold <b>{effTenant.thresholdPct}%</b> over <b>{effTenant.windowDays} days</b> · hold <b>{effTenant.enforce ? 'on' : 'off'}</b> · reminders <b>{effTenant.remindersEnabled ? 'on' : 'off'}</b>
              </div>
            </div>
            <div className="pb-card pb-table-wrap" style={{ marginBottom: 14 }}>
              <table className="pb-table">
                <thead><tr><th>Batch</th><th>Daily tasks</th><th>Threshold</th><th>Hold</th><th>Rule</th><th /></tr></thead>
                <tbody>{ov.batches.map((b) => (
                  <tr key={b._id} style={{ cursor: 'default' }}>
                    <td><b>{b.name}</b>{!b.isActive && <span className="pb-faint"> · inactive</span>}</td>
                    <td style={{ fontSize: 13 }}>{TASKS.filter((t) => b.effective.requirements[t.key] > 0).map((t) => `${t.label}${b.effective.requirements[t.key] > 1 ? ` ×${b.effective.requirements[t.key]}` : ''}`).join(' + ')}</td>
                    <td>{b.effective.thresholdPct}%</td>
                    <td>{b.effective.enforce ? 'On' : 'Off'}</td>
                    <td>{b.policy ? <span className="pb-pill pb-badge-accent">Custom</span> : <span className="pb-faint">Institute default</span>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="pb-btn pb-btn-sm" onClick={() => setEditing({ title: `Rule for ${b.name}`, scope: 'batch', targetId: b._id, policy: b.policy, inherit: effTenant })}><i className="fa-solid fa-pen" /> {b.policy ? 'Edit' : 'Customise'}</button>
                      {b.policy && <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={async () => { await practicePassApi.removeOverride('batch', b._id); toast.show('Back to the institute default.'); loadOv(); }}>Reset</button>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="pb-card" style={{ padding: 16 }}>
              <h3>Individual students</h3>
              <p className="pb-muted" style={{ marginTop: 0, fontSize: 13 }}>Give one student a different threshold or tasks, or exempt them (medical, special case). Every exception is listed here.</p>
              <input className="pb-input" placeholder="Find a student by name or email" value={studentQ} onChange={(e) => setStudentQ(e.target.value)} />
              {!!studentHits.length && (
                <div className="pb-card" style={{ marginTop: 6 }}>
                  {studentHits.map((s) => (
                    <div key={s._id} className="pb-row" style={{ padding: '7px 10px', borderBottom: '1px solid var(--pb-line)' }}>
                      <span className="pb-grow"><b>{s.name}</b> <span className="pb-muted">{s.email}</span></span>
                      <button className="pb-btn pb-btn-sm" onClick={() => { setStudentQ(''); setEditing({ title: `Rule for ${s.name}`, scope: 'student', targetId: s._id, policy: ov.students.find((x) => x.targetId === s._id) || null, inherit: effTenant }); }}>Set rule</button>
                    </div>
                  ))}
                </div>
              )}
              {ov.students.map((s) => (
                <div key={s.targetId} className="pb-row" style={{ padding: '9px 0', borderBottom: '1px solid var(--pb-line)' }}>
                  <span className="pb-grow"><b>{s.targetName}</b> <span className="pb-muted" style={{ fontSize: 12.5 }}>
                    {s.exempt ? 'Exempt' : [s.thresholdPct !== undefined ? `threshold ${s.thresholdPct}%` : '', s.requirements ? 'custom tasks' : ''].filter(Boolean).join(' · ')}{s.note ? ` — ${s.note}` : ''}</span></span>
                  <button className="pb-btn pb-btn-sm" onClick={() => setEditing({ title: `Rule for ${s.targetName}`, scope: 'student', targetId: s.targetId, policy: s, inherit: effTenant })}><i className="fa-solid fa-pen" /></button>
                  <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={async () => { await practicePassApi.removeOverride('student', s.targetId); toast.show('Exception removed.'); loadOv(); }}>Remove</button>
                </div>
              ))}
            </div>
          </>}
        </>}
      </div>
      {editing && <RuleEditor {...editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); toast.show('Saved and recalculated.'); loadOv(); loadStandings(); }} />}
      {cal && (
        <Modal title={`${cal.row.name} — ${cal.row.pct}% practice`} onClose={() => setCal(null)} wide>
          <div className="pb-muted" style={{ marginBottom: 10, fontSize: 13 }}>{cal.row.batchName} · {cal.row.metDays} of {cal.row.countedDays} working days · streak {cal.row.streak} · {cal.row.phone || cal.row.email}</div>
          <PracticeCalendar days={cal.days.slice(0, 42)} today={new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10)} />
        </Modal>
      )}
      {toast.node}
    </div>
  );
};

export default PracticePassAdmin;
