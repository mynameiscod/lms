import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { leadApi } from '../../api';
import './TeamActivity.css';
import './teamActivityV2.css';

type Range = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

/** Days here are Indian days, whatever timezone the browser is in. */
const istToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const shiftDay = (day: string, n: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const istMinuteNow = () => { const d = new Date(Date.now() + 330 * 60000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const istMin = (iso: string) => { const d = new Date(new Date(iso).getTime() + 330 * 60000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const clock = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }) : '—');
const minLabel = (m: number) => { const h = Math.floor(m / 60); const mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`; };
const dur = (sec: number) => { if (!sec) return '0m'; const h = Math.floor(sec / 3600); const m = Math.round((sec % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; };
const dayCount = (from: string, to: string) => Math.max(1, Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86400000) + 1);
const niceDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });

// Maps a clicked metric key to a human label for the drill-down modal.
const METRIC_LABELS: Record<string, string> = {
  call: '📞 Calls',
  whatsapp: '💬 WhatsApp',
  note: '📝 Notes',
  stageMoves: '🔄 Stage Moves',
  leadsTouched: '🎯 Leads Touched',
  total: '🎯 All Activities',
};

const ACTIVITY_ICON: Record<string, string> = {
  call: '📞', whatsapp: '💬', note: '📝', email: '✉️', status_change: '🔄', stage_change: '🔄', lead: '🎯', meeting: '🤝',
};
const TYPE_COLOR: Record<string, string> = { call: '#16a34a', whatsapp: '#0891b2', note: '#7c3aed', email: '#ca8a04', status_change: '#ea580c', stage_change: '#ea580c', meeting: '#db2777' };
const OUTCOME_LABEL: Record<string, string> = { connected: 'Connected', not_answered: 'Not answered', not_connected: 'Not connected', busy: 'Busy', rejected: 'Rejected', wrong_number: 'Wrong number', switched_off: 'Switched off' };

interface Alert { level: 'bad' | 'warn'; text: string }

const buildAlerts = (rows: any[], totals: any, today: string, toDay: string): Alert[] => {
  if (toDay !== today) return [];
  const out: Alert[] = [];
  const now = istMinuteNow();
  const working = now >= 10 * 60 && now <= 19 * 60 + 30;
  rows.forEach((r) => {
    if (r.assigned > 0 && now >= 10 * 60 + 30 && r.activeSeconds === 0 && r.total === 0) out.push({ level: 'bad', text: `${r.name} has not opened the CRM today (${r.assigned} leads assigned).` });
    else if (r.assigned > 0 && now >= 11 * 60 && r.calls === 0) out.push({ level: 'bad', text: `${r.name} has made no calls yet today (${r.assigned} leads assigned).` });
    if (working && r.lastSeenAt && r.activeSeconds > 0) {
      const ago = Math.round((Date.now() - new Date(r.lastSeenAt).getTime()) / 60000);
      if (ago >= 60) out.push({ level: 'warn', text: `${r.name} was last active ${dur(ago * 60)} ago (${clock(r.lastSeenAt)}).` });
    }
    if (r.followUpsOverdue > 0) out.push({ level: 'warn', text: `${r.name} has ${r.followUpsOverdue} overdue follow-up${r.followUpsOverdue === 1 ? '' : 's'}.` });
    if (r.pendingOutcome > 0) out.push({ level: 'warn', text: `${r.name} started ${r.pendingOutcome} call${r.pendingOutcome === 1 ? '' : 's'} with no outcome recorded.` });
  });
  if (totals?.neverTouched > 0) {
    const top = rows.filter((r) => r.neverTouched > 0).sort((a, b) => b.neverTouched - a.neverTouched).slice(0, 3).map((r) => `${r.name} ${r.neverTouched}`).join(', ');
    out.push({ level: 'bad', text: `${totals.neverTouched} assigned lead${totals.neverTouched === 1 ? ' has' : 's have'} never been worked (${top}).` });
  }
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'bad' ? -1 : 1)).slice(0, 12);
};

/** One person's day on a time strip: when they were active, and what they did when. */
const DayStrip: React.FC<{ data: any }> = ({ data }) => {
  const slots: number[] = data.presence.slots || [];
  const acts: any[] = data.activities || [];
  const actMins = acts.map((a) => istMin(a.at));
  const all = [...slots, ...actMins];
  const winStart = Math.floor(Math.min(9 * 60, all.length ? Math.min(...all) : 9 * 60) / 60) * 60;
  const winEnd = Math.ceil(Math.max(20 * 60, all.length ? Math.max(...all) + 1 : 20 * 60) / 60) * 60;
  const W = 1000; const span = winEnd - winStart;
  const x = (m: number) => ((m - winStart) / span) * W;

  // Merge consecutive active minutes (a gap of two minutes or less is the same stretch).
  const runs: { a: number; b: number }[] = [];
  slots.forEach((m) => { const last = runs[runs.length - 1]; if (last && m - last.b <= 2) last.b = m; else runs.push({ a: m, b: m }); });
  const wd = data.workDay || { startHour: 10, endHour: 19 };
  const ws = wd.startHour * 60; const we = wd.endHour * 60;
  // Quiet periods of half an hour or more inside the working day, between the first and last active minute.
  const quiet: { a: number; b: number }[] = [];
  for (let i = 1; i < runs.length; i++) {
    const a = Math.max(runs[i - 1].b + 1, ws); const b = Math.min(runs[i].a, we);
    if (b - a >= 30) quiet.push({ a, b });
  }
  const hours: number[] = []; for (let h = winStart / 60; h <= winEnd / 60; h++) hours.push(h);

  return <div className="ta2-strip">
    <svg viewBox={`0 0 ${W} 86`} role="img" aria-label="Active time and actions through the day">
      <rect x={x(ws)} y="26" width={Math.max(0, x(we) - x(ws))} height="34" className="wd" rx="4" />
      {hours.map((h) => <g key={h}><line x1={x(h * 60)} x2={x(h * 60)} y1="22" y2="64" className="tick" /><text x={x(h * 60)} y="80" textAnchor="middle" className="lbl">{minLabel(h * 60).replace(':00 ', '')}</text></g>)}
      {runs.map((r, i) => <rect key={i} x={x(r.a)} y="32" width={Math.max(3, x(r.b + 1) - x(r.a))} height="22" rx="3" className="act"><title>{`Active ${minLabel(r.a)} to ${minLabel(r.b + 1)}`}</title></rect>)}
      {acts.map((a, i) => <circle key={i} cx={x(actMins[i])} cy="12" r="5" fill={TYPE_COLOR[a.type] || '#64748b'} stroke="#fff" strokeWidth="1.5"><title>{`${clock(a.at)} · ${a.type} · ${a.leadName || ''}`}</title></circle>)}
    </svg>
    <div className="ta2-legend">
      <span><i className="sw act" /> Active in the app</span>
      {['call', 'whatsapp', 'note', 'status_change'].map((t) => <span key={t}><i className="dot" style={{ background: TYPE_COLOR[t] }} /> {t === 'status_change' ? 'stage move' : t}</span>)}
    </div>
    {quiet.length > 0 && <div className="ta2-quiet"><b>Quiet periods (30 min or more, working hours):</b> {quiet.map((q) => `${minLabel(q.a)} to ${minLabel(q.b)}`).join(' · ')}</div>}
  </div>;
};

const PersonModal: React.FC<{ userId: string; name: string; startDay: string; maxDay: string; onClose: () => void }> = ({ userId, name, startDay, maxDay, onClose }) => {
  const [day, setDay] = useState(startDay);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true; setLoading(true); setErr('');
    leadApi.getTeamPerson(userId, day).then((r: any) => { if (live) setData(r?.data || r); }).catch((e: any) => { if (live) setErr(e?.message || 'Could not load this day'); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [userId, day]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (data?.activities || []).forEach((a: any) => { c[a.type] = (c[a.type] || 0) + 1; });
    return c;
  }, [data]);

  return <div className="ta-modal-overlay" onClick={onClose}>
    <div className="ta-modal ta2-person" onClick={(e) => e.stopPropagation()}>
      <div className="ta-modal-head">
        <h3>{name} · {niceDay(day)}</h3>
        <div className="ta2-daynav">
          <button className="ta-tab" onClick={() => setDay(shiftDay(day, -1))} aria-label="Previous day">‹</button>
          <input type="date" className="ta-date" value={day} max={maxDay} onChange={(e) => e.target.value && setDay(e.target.value)} />
          <button className="ta-tab" disabled={day >= maxDay} onClick={() => setDay(shiftDay(day, 1))} aria-label="Next day">›</button>
        </div>
        <button className="ta-modal-close" onClick={onClose}>×</button>
      </div>
      <div className="ta-modal-body ta2-person-body">
        {loading && !data ? <div className="ta-msg">Loading…</div> : err ? <div className="ta-msg err">{err}</div> : data && <>
          <div className="ta2-pstats">
            <div><span>Active time</span><b>{dur(data.presence.activeSeconds)}</b></div>
            <div><span>First seen</span><b>{clock(data.presence.firstSeenAt)}</b></div>
            <div><span>Last seen</span><b>{clock(data.presence.lastSeenAt)}</b></div>
            <div><span>Calls</span><b>{counts.call || 0}</b></div>
            <div><span>WhatsApp</span><b>{counts.whatsapp || 0}</b></div>
            <div><span>Notes</span><b>{counts.note || 0}</b></div>
          </div>
          {data.presence.activeSeconds === 0 && <p className="ta2-hint">No working time was recorded for this day. Working time is recorded only while the person is using the app, and only from the day this feature went live.</p>}
          <DayStrip data={data} />
          {data.leadTime?.length > 0 && <>
            <h4 className="ta2-h">Time spent on each lead</h4>
            <ul className="ta2-leadtime">{data.leadTime.map((l: any) => <li key={l.leadId}><b>{l.name}</b><span>{l.phone}</span><em>{dur(l.seconds)}</em></li>)}</ul>
          </>}
          <h4 className="ta2-h">Everything they did ({data.activities.length})</h4>
          {data.activities.length === 0 ? <div className="ta-msg">No actions recorded on this day.</div> : <ul className="ta-detail-list">
            {data.activities.map((a: any, i: number) => <li key={i} className="ta-detail">
              <span className="ta-detail-icon">{ACTIVITY_ICON[a.type] || '•'}</span>
              <div className="ta-detail-body">
                <div className="ta-detail-top"><b>{a.leadName || 'Lead'}</b>{a.phone && <span className="ta-detail-phone">{a.phone}</span>}<span className="ta-detail-time" style={{ marginLeft: 'auto' }}>{clock(a.at)}</span></div>
                {a.description && <div className="ta-detail-desc">{a.description}</div>}
                <div className="ta-detail-meta"><span className="ta-detail-type">{a.type === 'status_change' ? 'stage move' : a.type}</span>{a.callOutcome && <span className="ta-detail-outcome">{OUTCOME_LABEL[a.callOutcome] || a.callOutcome}</span>}{a.started && <span className="ta-detail-outcome">outcome not recorded</span>}</div>
              </div>
            </li>)}
          </ul>}
        </>}
      </div>
    </div>
  </div>;
};

const TeamActivity: React.FC = () => {
  const today = istToday();
  const [range, setRange] = useState<Range>('today');
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [person, setPerson] = useState<{ userId: string; name: string } | null>(null);

  // Drill-down modal state
  const [drill, setDrill] = useState<{ title: string; userId: string | null; type: string } | null>(null);
  const [drillItems, setDrillItems] = useState<any[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillErr, setDrillErr] = useState('');

  const span = useMemo(() => {
    if (range === 'today') return { from: today, to: today };
    if (range === 'yesterday') { const y = shiftDay(today, -1); return { from: y, to: y }; }
    if (range === 'week') { const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); return { from: shiftDay(today, -((dow + 6) % 7)), to: today }; }
    if (range === 'month') return { from: `${today.slice(0, 8)}01`, to: today };
    const [a, b] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
    return { from: a, to: b };
  }, [range, customFrom, customTo, today]);
  const buildParams = useCallback(() => ({ from: span.from, to: span.to }), [span]);
  const days = dayCount(span.from, span.to);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res: any = await leadApi.getTeamOverview(buildParams());
      const d = res?.data || res;
      setRows(d.rows || []);
      setTotals(d.totals || null);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load team activity');
    } finally { setLoading(false); }
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);
  // Today's view refreshes itself every two minutes, so it stays a live picture.
  useEffect(() => {
    if (span.to !== today) return undefined;
    const t = window.setInterval(load, 120000);
    return () => window.clearInterval(t);
  }, [span.to, today, load]);

  const alerts = useMemo(() => buildAlerts(rows, totals, today, span.to), [rows, totals, today, span.to]);

  const openDrill = useCallback(async (userId: string | null, type: string, personName: string, count: number) => {
    if (!count) return; // nothing to show
    const title = `${METRIC_LABELS[type] || type} · ${personName}`;
    setDrill({ title, userId, type });
    setDrillItems([]); setDrillErr(''); setDrillLoading(true);
    try {
      const res: any = await leadApi.getTeamActivityDetails({ userId, type, ...buildParams() });
      const d = res?.data || res;
      setDrillItems(d.items || []);
    } catch (e: any) {
      setDrillErr(e?.message || 'Failed to load details');
    } finally { setDrillLoading(false); }
  }, [buildParams]);

  const closeDrill = useCallback(() => setDrill(null), []);

  // A clickable metric cell: shows a count and opens the drill-down when > 0.
  const MetricCell = ({ value, userId, type, name, sub }: { value: number; userId: string | null; type: string; name: string; sub?: React.ReactNode }) => (
    <td>
      {value > 0
        ? <button type="button" className="ta-link" onClick={() => openDrill(userId, type, name, value)}>{value}</button>
        : <span className="ta-zero">0</span>}
      {sub && <div className="ta2-sub">{sub}</div>}
    </td>
  );

  const workSeconds = 9 * 3600 * days;
  const label = (r: Range) => (r === 'today' ? 'Today' : r === 'yesterday' ? 'Yesterday' : r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : 'Custom');

  return (
    <div className="ta-page ta2">
      <div className="ta-header">
        <div>
          <h1>📊 Team Activity</h1>
          <p>Who is working, for how long, how many leads they are calling, and what is being missed. Click a name for their whole day, or any number for the leads behind it.</p>
        </div>
      </div>

      <div className="ta-filters">
        {(['today', 'yesterday', 'week', 'month', 'custom'] as Range[]).map(r => (
          <button key={r} className={`ta-tab ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{label(r)}</button>
        ))}
        {range === 'custom' && <>
          <input type="date" className="ta-date" value={customFrom} max={today} onChange={e => e.target.value && setCustomFrom(e.target.value)} aria-label="From" />
          <span className="ta2-to">to</span>
          <input type="date" className="ta-date" value={customTo} max={today} onChange={e => e.target.value && setCustomTo(e.target.value)} aria-label="To" />
        </>}
        <span className="ta2-range">{span.from === span.to ? niceDay(span.from) : `${niceDay(span.from)} to ${niceDay(span.to)}`}</span>
      </div>

      {alerts.length > 0 && (
        <section className="ta2-alerts" aria-label="Needs attention">
          <h3>⚠️ Needs attention</h3>
          <ul>{alerts.map((a, i) => <li key={i} className={a.level}>{a.text}</li>)}</ul>
        </section>
      )}

      {totals && (
        <div className="ta-totals ta2-totals">
          <div className="ta-total"><span>⏱ Active time</span><b>{dur(totals.activeSeconds)}</b></div>
          <div className="ta-total"><span>📞 Calls</span><b>{totals.calls}</b><small>{totals.connected} connected</small></div>
          <div className="ta-total"><span>👥 Leads called</span><b>{totals.leadsCalled}</b></div>
          <div className="ta-total"><span>💬 WhatsApp</span><b>{totals.whatsapp}</b></div>
          <div className="ta-total"><span>📝 Notes</span><b>{totals.note}</b></div>
          <div className="ta-total warn"><span>🚫 Untouched 24h+</span><b>{totals.untouched24h}</b><small>{totals.neverTouched} never worked</small></div>
          <div className="ta-total warn"><span>⏰ Overdue follow-ups</span><b>{totals.followUpsOverdue}</b></div>
        </div>
      )}

      <div className="ta-table-wrap">
        {loading && !rows.length ? <div className="ta-msg">Loading…</div> :
          err ? <div className="ta-msg err">{err}</div> :
          rows.length === 0 ? <div className="ta-msg">No team activity in this period.</div> : (
          <table className="ta-table ta2-table">
            <thead><tr>
              <th>Team Member</th>
              <th>⏱ Active time</th>
              <th>📞 Calls</th><th>👥 Leads called</th>
              <th>💬 WhatsApp</th><th>📝 Notes</th><th>🔄 Stage moves</th>
              <th title="Assigned leads nobody has worked in 24 hours">🚫 Untouched</th>
              <th title="Done of due in this period, and overdue now">⏰ Follow-ups</th>
              <th title="Average time from a new lead arriving to the first call">⚡ First call</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => {
                const pct = Math.min(100, Math.round((r.activeSeconds / workSeconds) * 100));
                return (
                  <tr key={r.userId}>
                    <td><button type="button" className="ta2-who" onClick={() => setPerson({ userId: r.userId, name: r.name })}>
                      <span className="ta-avatar">{(r.name || '?').split(' ').map((s: string) => s[0]).slice(0, 2).join('')}</span>
                      <span><b>{r.name}</b><small>{r.role || ''}{r.assigned ? ` · ${r.assigned} leads` : ''}</small></span>
                    </button></td>
                    <td>
                      <b>{dur(r.activeSeconds)}</b>
                      <div className="ta2-bar" title={`${pct}% of a 9-hour working day`}><i style={{ width: `${pct}%` }} /></div>
                      <div className="ta2-sub">{r.firstSeenAt ? `${clock(r.firstSeenAt)} to ${clock(r.lastSeenAt)}` : 'not seen'}</div>
                    </td>
                    <MetricCell value={r.calls} userId={r.userId} type="call" name={r.name}
                      sub={r.calls ? <>{r.connected} connected · {r.notReached} not reached{r.pendingOutcome ? ` · ${r.pendingOutcome} no outcome` : ''}</> : undefined} />
                    <td>{r.leadsCalled > 0 ? <b>{r.leadsCalled}</b> : <span className="ta-zero">0</span>}</td>
                    <MetricCell value={r.whatsapp} userId={r.userId} type="whatsapp" name={r.name} />
                    <MetricCell value={r.note} userId={r.userId} type="note" name={r.name} />
                    <MetricCell value={r.stageMoves} userId={r.userId} type="stageMoves" name={r.name} />
                    <td>{r.assigned ? <><b className={r.untouched24h ? 'ta2-bad' : ''}>{r.untouched24h}</b><div className="ta2-sub">of {r.assigned}{r.neverTouched ? ` · ${r.neverTouched} never` : ''}</div></> : <span className="ta-zero">—</span>}</td>
                    <td>{r.followUpsDue || r.followUpsOverdue ? <><b>{r.followUpsDone}/{r.followUpsDue}</b><div className={`ta2-sub ${r.followUpsOverdue ? 'ta2-bad' : ''}`}>{r.followUpsOverdue ? `${r.followUpsOverdue} overdue` : 'none overdue'}</div></> : <span className="ta-zero">—</span>}</td>
                    <td>{r.avgFirstCallMin != null ? <><b>{r.avgFirstCallMin < 60 ? `${r.avgFirstCallMin}m` : dur(r.avgFirstCallMin * 60)}</b><div className="ta2-sub">{r.newLeadsCalled}/{r.newLeads} new called</div></> : r.newLeads ? <><b className="ta2-bad">none</b><div className="ta2-sub">0/{r.newLeads} new called</div></> : <span className="ta-zero">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="ta2-foot">A call or WhatsApp is counted the moment the button is pressed, and updated (not counted again) when the outcome or message is recorded. Active time counts only minutes when the person was using the app, from the day this feature went live. Untouched means an open assigned lead with no call, message, note or stage move by anyone in 24 hours.</p>

      {person && <PersonModal userId={person.userId} name={person.name} startDay={span.to} maxDay={today} onClose={() => setPerson(null)} />}

      {drill && (
        <div className="ta-modal-overlay" onClick={closeDrill}>
          <div className="ta-modal" onClick={e => e.stopPropagation()}>
            <div className="ta-modal-head">
              <h3>{drill.title}</h3>
              <button className="ta-modal-close" onClick={closeDrill}>×</button>
            </div>
            <div className="ta-modal-body">
              {drillLoading ? <div className="ta-msg">Loading…</div> :
                drillErr ? <div className="ta-msg err">{drillErr}</div> :
                drillItems.length === 0 ? <div className="ta-msg">No details found.</div> :
                drill.type === 'leadsTouched' ? (
                <ul className="ta-lead-list">
                  {drillItems.map((it, idx) => (
                    <li key={idx} className="ta-lead-card">
                      <div className="ta-lead-head">
                        <b>{it.leadName || 'Unknown lead'}</b>
                        {it.phone && <a className="ta-lead-phone" href={`tel:${it.phone}`}>📞 {it.phone}</a>}
                        {it.email && <span className="ta-lead-email">{it.email}</span>}
                      </div>
                      <div className="ta-lead-meta">
                        <span>🆕 Entered: <b>{new Date(it.enteredAt).toLocaleDateString()}</b></span>
                        {it.source && <span>📍 Source: <b>{it.source}</b></span>}
                        {it.stageName && <span>🔖 Stage: <b>{it.stageName}</b></span>}
                        {it.assignedToName && <span>👤 Owner: <b>{it.assignedToName}</b></span>}
                      </div>
                      <div className="ta-lead-touched">
                        ✋ Touched <b>{it.touchedCount}</b> time{it.touchedCount === 1 ? '' : 's'} this period
                        {it.touchedTypes?.length ? ` · ${it.touchedTypes.join(', ')}` : ''}
                      </div>
                      {it.timeline?.length > 0 && (
                        <div className="ta-lead-timeline">
                          <div className="ta-lead-timeline-title">Full timeline ({it.totalActivities})</div>
                          {it.timeline.map((t: any, ti: number) => (
                            <div key={ti} className="ta-tl-row">
                              <span className="ta-tl-icon">{ACTIVITY_ICON[t.type] || '•'}</span>
                              <div className="ta-tl-body">
                                <div className="ta-tl-line">
                                  <span className="ta-tl-type">{t.typeLabel}</span>
                                  {t.callOutcome && <span className="ta-tl-outcome">{t.callOutcome}</span>}
                                  <span className="ta-tl-time">{new Date(t.at).toLocaleString()}</span>
                                </div>
                                {t.description && <div className="ta-tl-desc">{t.description}</div>}
                                <div className="ta-tl-by">by {t.byName}</div>
                              </div>
                            </div>
                          ))}
                          {it.totalActivities > it.timeline.length && (
                            <div className="ta-tl-more">+{it.totalActivities - it.timeline.length} earlier…</div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                ) : (
                <ul className="ta-detail-list">
                  {drillItems.map((it, idx) => (
                    <li key={idx} className="ta-detail">
                      <span className="ta-detail-icon">{ACTIVITY_ICON[it.activityType] || '•'}</span>
                      <div className="ta-detail-body">
                        <div className="ta-detail-top">
                          <b>{it.leadName || 'Unknown lead'}</b>
                          {it.phone && <a className="ta-detail-phone" href={`tel:${it.phone}`}>{it.phone}</a>}
                        </div>
                        {it.description && <div className="ta-detail-desc">{it.description}</div>}
                        <div className="ta-detail-meta">
                          {it.activityType && it.activityType !== 'lead' && <span className="ta-detail-type">{it.activityType}</span>}
                          {it.callOutcome && <span className="ta-detail-outcome">{it.callOutcome}</span>}
                          <span className="ta-detail-time">{new Date(it.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {!drillLoading && !drillErr && drillItems.length > 0 && (
              <div className="ta-modal-foot">{drillItems.length} item{drillItems.length === 1 ? '' : 's'}{drillItems.length >= 500 ? ' (showing first 500)' : ''}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamActivity;
