import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import supportApi, {
  SupportMe, SupportSummary, SupportTrends, SupportBreakdown, SupportIncidents, errorText, moduleLabel, categoryLabel, STAFF_STATUS_LABEL, TicketStatus,
} from '../../api/supportApi';
import { Loading, ErrorState } from './supportUi';
import './support.css';

/**
 * The support command centre. Every number comes from the server's queries over the caller's
 * reach (a coordinator sees their college only). Charts and the heatmap link to the matching
 * tickets in the queue. A figure that needs settings the organisation has not made (SLA
 * targets, incident rules) says so instead of showing a number.
 */
const RANGES: [string, number][] = [['7 days', 7], ['30 days', 30], ['90 days', 90]];
const fmtMin = (m: number | null) => (m == null ? '—' : m < 60 ? `${m} min` : m < 1440 ? `${(m / 60).toFixed(1)} h` : `${(m / 1440).toFixed(1)} d`);
const pct = (v: number | null | undefined) => (v == null ? '—' : `${v}%`);
const SOURCE_LABEL: Record<string, string> = { help_center: 'Help Center', ai_chat: 'Assistant', staff: 'Staff' };

export const IncidentBanner: React.FC<{ me: SupportMe | null; tenantId?: string; queueBase: string; onChange?: () => void }> = ({ me, tenantId, queueBase, onChange }) => {
  const nav = useNavigate();
  const [data, setData] = useState<SupportIncidents | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const load = useCallback(() => { supportApi.incidents(tenantId ? { tenantId } : {}).then(setData).catch(() => setData(null)); }, [tenantId]);
  useEffect(() => { load(); }, [load]);
  if (!data || (!data.possible.length && !data.confirmed.length)) return null;
  const since = data.rules ? new Date(Date.now() - data.rules.windowMinutes * 60_000).toISOString() : undefined;
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setMsg('');
    try { await fn(); setMsg(ok); load(); onChange?.(); } catch (e) { setMsg(errorText(e)); }
    setBusy(false);
  };
  return (
    <div className="sp-stack" style={{ marginBottom: 14 }}>
      {data.possible.map(p => (
        <div key={p.module} className="sp-banner sp-banner-warn" role="status">
          <i className="bi bi-exclamation-triangle-fill" aria-hidden />
          <div style={{ flex: 1 }}>
            <b>Possible shared incident — {moduleLabel(p.module)}</b>
            <div>{p.tickets} tickets from {p.people} people{p.colleges > 1 ? ` across ${p.colleges} colleges` : ''} in the last {data.rules?.windowMinutes} minutes. Not confirmed.</div>
          </div>
          <button type="button" className="sp-btn sp-btn-ghost" onClick={() => nav(`${queueBase}?module=${p.module}${since ? `&from=${since}` : ''}${tenantId ? `&tenantId=${tenantId}` : ''}`)}>View tickets</button>
          {me?.can.manage && <button type="button" className="sp-btn sp-btn-primary" disabled={busy} onClick={() => {
            const title = window.prompt('Short title members will not see — for your team (e.g. "Roadmap not loading")', `Problem affecting ${moduleLabel(p.module)}`);
            if (title !== null) act(() => supportApi.confirmIncident({ module: p.module, title, tenantId }), 'Incident confirmed. Affected members were told support is working on it.');
          }}>Confirm incident</button>}
        </div>
      ))}
      {data.confirmed.map(c => (
        <div key={c.id} className="sp-banner sp-banner-err" role="status">
          <i className="bi bi-broadcast" aria-hidden />
          <div style={{ flex: 1 }}><b>Confirmed incident — {c.title}</b><div>{moduleLabel(c.module)} · {c.ticketCount} tickets, {c.peopleCount} people · {c.notifiedCount} members notified</div></div>
          {me?.can.manage && <button type="button" className="sp-btn sp-btn-ghost" disabled={busy} onClick={() => act(() => supportApi.resolveIncident(c.id), 'Incident marked resolved.')}>Mark resolved</button>}
        </div>
      ))}
      {msg && <p className="sp-hint" role="status">{msg}</p>}
    </div>
  );
};

const Card: React.FC<{ label: string; value: React.ReactNode; hint?: string; onClick?: () => void; tone?: 'warn' | 'err' }> = ({ label, value, hint, onClick, tone }) => {
  const body = (<><span className="sp-metric-label">{label}</span><span className={`sp-metric-value${tone ? ` sp-tone-${tone}` : ''}`}>{value}</span>{hint && <span className="sp-hint">{hint}</span>}</>);
  return onClick ? <button type="button" className="sp-metric" onClick={onClick}>{body}</button> : <div className="sp-metric">{body}</div>;
};

const Bars: React.FC<{ title: string; rows: { key: string; label: string; count: number }[]; onPick?: (k: string) => void }> = ({ title, rows, onPick }) => {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <div className="sp-card">
      <h2>{title}</h2>
      {rows.length === 0 ? <p className="sp-hint">Nothing in this period.</p> : (
        <ul className="sp-bars">
          {rows.map(r => (
            <li key={r.key}>
              <button type="button" disabled={!onPick} onClick={() => onPick?.(r.key)}>
                <span className="sp-bar-label">{r.label}</span>
                <span className="sp-bar-track"><span className="sp-bar-fill" style={{ width: `${(r.count / max) * 100}%` }} /></span>
                <span className="sp-bar-n">{r.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const SupportDashboard: React.FC<{ me: SupportMe | null; queueBase: string; faqBase: string; settingsBase: string }> = ({ me, queueBase, faqBase, settingsBase }) => {
  const nav = useNavigate();
  const [days, setDays] = useState(30);
  const [tenantId, setTenantId] = useState('');
  const [sum, setSum] = useState<SupportSummary | null>(null);
  const [trend, setTrend] = useState<SupportTrends | null>(null);
  const [brk, setBrk] = useState<SupportBreakdown | null>(null);
  const [colleges, setColleges] = useState<{ id: string; name: string }[]>([]);
  const [err, setErr] = useState('');

  const q = useMemo(() => ({ from: new Date(Date.now() - days * 86_400_000).toISOString(), tenantId: tenantId || undefined }), [days, tenantId]);
  const load = useCallback(async () => {
    setErr(''); setSum(null); setTrend(null); setBrk(null);
    try {
      const [s, t, b] = await Promise.all([supportApi.summary(q), supportApi.trends(q), supportApi.breakdown(q)]);
      setSum(s); setTrend(t); setBrk(b);
      if (!tenantId) setColleges(b.byCollege.map(c => ({ id: c.id, name: c.name })));
    } catch (e) { setErr(errorText(e, 'The dashboard could not be loaded.')); }
  }, [q, tenantId]);
  useEffect(() => { load(); }, [load]);

  const toQueue = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ from: q.from, ...(tenantId ? { tenantId } : {}), ...extra });
    nav(`${queueBase}?${p.toString()}`);
  };

  const heat = useMemo(() => {
    if (!brk) return null;
    const used = brk.heatmap.modules.filter(m => brk.heatmap.cells.some(c => c.module === m));
    const max = Math.max(1, ...brk.heatmap.cells.map(c => c.count));
    const at = (t: string, m: string) => brk.heatmap.cells.find(c => c.tenantId === t && c.module === m)?.count || 0;
    return { used, max, at };
  }, [brk]);

  return (
    <div>
      <div className="sp-filters" style={{ alignItems: 'center' }}>
        <div role="group" aria-label="Period" className="sp-filters" style={{ margin: 0 }}>
          {RANGES.map(([l, d]) => <button key={d} type="button" className={`sp-chip${days === d ? ' on' : ''}`} aria-pressed={days === d} onClick={() => setDays(d)}>{l}</button>)}
        </div>
        {me?.allTenants && colleges.length > 0 && (
          <select className="sp-select" style={{ width: 'auto' }} aria-label="College" value={tenantId} onChange={e => setTenantId(e.target.value)}>
            <option value="">All colleges</option>
            {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      <IncidentBanner me={me} tenantId={tenantId || undefined} queueBase={queueBase} onChange={load} />

      {err ? <ErrorState text={err} onRetry={load} /> : !sum ? <Loading text="Loading dashboard…" /> : (
        <>
          <div className="sp-metrics">
            <Card label="Open" value={sum.current.open} onClick={() => nav(`${queueBase}?status=open,in_progress,waiting_on_user${tenantId ? `&tenantId=${tenantId}` : ''}`)} />
            <Card label="Unassigned" value={sum.current.unassigned} tone={sum.current.unassigned ? 'warn' : undefined} onClick={() => nav(`${queueBase}?assignee=none&status=open,in_progress,waiting_on_user${tenantId ? `&tenantId=${tenantId}` : ''}`)} />
            <Card label="High & critical" value={sum.current.highCritical} tone={sum.current.highCritical ? 'err' : undefined} onClick={() => nav(`${queueBase}?priority=high,critical&status=open,in_progress,waiting_on_user${tenantId ? `&tenantId=${tenantId}` : ''}`)} />
            <Card label="Waiting on member" value={sum.current.waitingOnUser} onClick={() => nav(`${queueBase}?status=waiting_on_user${tenantId ? `&tenantId=${tenantId}` : ''}`)} />
            <Card label={`Raised (${days} d)`} value={sum.period.created} hint={`${sum.period.fromAssistant} via the assistant`} onClick={() => toQueue({})} />
            <Card label="Reopened" value={sum.period.reopened} onClick={() => toQueue({ reopened: 'true' })} />
            <Card label="Avg first response" value={fmtMin(sum.period.avgFirstResponseMinutes)} />
            <Card label="Avg resolution" value={fmtMin(sum.period.avgResolutionMinutes)} hint={`${sum.period.resolved} resolved`} />
            {sum.sla.configured
              ? <Card label="Within response target" value={pct(sum.sla.firstResponsePct)} hint={`Resolution target: ${pct(sum.sla.resolutionPct)}`} />
              : <Card label="Response targets" value="Not set" hint={me?.can.manage ? 'Set them in Settings' : 'Set by a support manager'} onClick={me?.can.manage ? () => nav(settingsBase) : undefined} />}
            <Card label="Assistant resolved" value={pct(sum.assistant.resolutionRate)} hint={`${sum.assistant.sessions} conversations`} />
            <Card label="Assistant escalated" value={pct(sum.assistant.escalationRate)} hint={`${sum.assistant.failedSessions} with errors`} />
            <Card label="Answer feedback" value={`${sum.assistant.thumbsUp} 👍 · ${sum.assistant.thumbsDown} 👎`} hint={`${sum.assistant.fallbackAnswers} of ${sum.assistant.answers} answers were "couldn't confirm"`} />
          </div>

          <div className="sp-card" style={{ marginTop: 16 }}>
            <h2>Tickets over time</h2>
            {trend && trend.releases.length === 0 && <p className="sp-hint">Release markers appear here once releases are recorded.</p>}
            <div style={{ width: '100%', height: 260 }} role="img" aria-label="Tickets raised and resolved per day">
              {trend && (
                <ResponsiveContainer>
                  <LineChart data={trend.series} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2EAF2" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                    <Tooltip />
                    <Legend />
                    <Line type="linear" dataKey="created" name="Raised" stroke="#051D64" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="linear" dataKey="resolved" name="Resolved" stroke="#359AAD" strokeWidth={2} dot={{ r: 2 }} />
                    {trend.releases.map(r => <ReferenceLine key={r.version} x={r.day} stroke="#B86B00" strokeDasharray="4 3" label={{ value: r.version, fontSize: 10, fill: '#B86B00', position: 'top' }} />)}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {brk && heat && (
            <div className="sp-card" style={{ marginTop: 16, overflowX: 'auto' }}>
              <h2>Where the problems are</h2>
              {heat.used.length === 0 ? <p className="sp-hint">No tickets in this period.</p> : (
                <table className="sp-table sp-heat">
                  <caption className="sp-sr">Tickets by college and area. Choose a cell to see those tickets.</caption>
                  <thead><tr><th scope="col">College</th>{heat.used.map(m => <th key={m} scope="col">{moduleLabel(m)}</th>)}</tr></thead>
                  <tbody>
                    {brk.heatmap.colleges.map(c => (
                      <tr key={c.id}>
                        <th scope="row">{c.name}</th>
                        {heat.used.map(m => {
                          const n = heat.at(c.id, m);
                          return (
                            <td key={m}>
                              {n ? <button type="button" className="sp-heat-cell" style={{ background: `rgba(5,29,100,${0.08 + 0.72 * (n / heat.max)})`, color: n / heat.max > 0.45 ? '#fff' : '#102A4F' }}
                                aria-label={`${n} tickets, ${c.name}, ${moduleLabel(m)}`} onClick={() => nav(`${queueBase}?${new URLSearchParams({ from: q.from, tenantId: c.id, module: m }).toString()}`)}>{n}</button> : <span className="sp-hint">·</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {brk && (
            <div className="sp-dash-grid">
              <Bars title="Still open, by area" rows={brk.unresolvedByModule.map(r => ({ key: r.key, label: moduleLabel(r.key), count: r.count }))} onPick={k => nav(`${queueBase}?module=${k}&status=open,in_progress,waiting_on_user${tenantId ? `&tenantId=${tenantId}` : ''}`)} />
              <Bars title="By type" rows={brk.byCategory.map(r => ({ key: r.key, label: categoryLabel(r.key), count: r.count }))} onPick={k => toQueue({ category: k })} />
              <Bars title="By source" rows={brk.bySource.map(r => ({ key: r.key, label: SOURCE_LABEL[r.key] || r.key, count: r.count }))} onPick={k => toQueue({ source: k })} />
              <Bars title="By status" rows={brk.byStatus.map(r => ({ key: r.key, label: STAFF_STATUS_LABEL[r.key as TicketStatus] || r.key, count: r.count }))} onPick={k => toQueue({ status: k })} />
              <div className="sp-card">
                <h2>Same problem, many people</h2>
                <p className="sp-hint">Area and type reported by 3 or more people in this period.</p>
                {brk.repeatedIssues.length === 0 ? <p className="sp-hint">None.</p> : (
                  <ul className="sp-list">
                    {brk.repeatedIssues.map(r => (
                      <li key={`${r.module}-${r.category}`}><button type="button" className="sp-item" onClick={() => toQueue({ module: r.module, category: r.category })}>
                        <div className="sp-item-main"><div className="sp-item-subj">{moduleLabel(r.module)} · {categoryLabel(r.category)}</div><div className="sp-item-meta">{r.tickets} tickets from {r.people} people</div></div>
                      </button></li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="sp-card">
                <h2>Searches with no answer</h2>
                {brk.unansweredSearches.length === 0 ? <p className="sp-hint">None.</p> : (
                  <ul className="sp-list">
                    {brk.unansweredSearches.map(u => <li key={u.query} className="sp-item" style={{ cursor: 'default' }}><div className="sp-item-main"><div className="sp-item-subj" style={{ whiteSpace: 'normal' }}>{u.query}</div><div className="sp-item-meta">{u.count} searches · {u.people} people</div></div></li>)}
                  </ul>
                )}
                {me?.can.manage && <button type="button" className="sp-back" style={{ marginTop: 8 }} onClick={() => nav(faqBase)}>Write articles for these →</button>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SupportDashboard;
