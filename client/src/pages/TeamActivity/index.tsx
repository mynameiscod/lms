import React, { useEffect, useState, useCallback } from 'react';
import { leadApi } from '../../api';
import './TeamActivity.css';

type Range = 'today' | 'week' | 'month' | 'custom';

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

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
  call: '📞', whatsapp: '💬', note: '📝', email: '✉️', status_change: '🔄', stage_change: '🔄', lead: '🎯',
};

const TeamActivity: React.FC = () => {
  const [range, setRange] = useState<Range>('today');
  const [customDate, setCustomDate] = useState(fmtDate(new Date()));
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Drill-down modal state
  const [drill, setDrill] = useState<{ title: string; userId: string | null; type: string } | null>(null);
  const [drillItems, setDrillItems] = useState<any[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillErr, setDrillErr] = useState('');

  const buildParams = useCallback(() => {
    const now = new Date();
    if (range === 'today') return { date: fmtDate(now) };
    if (range === 'custom') return { date: customDate };
    if (range === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1);
      return { from: fmtDate(start), to: fmtDate(now) };
    }
    // month
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmtDate(start), to: fmtDate(now) };
  }, [range, customDate]);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res: any = await leadApi.getTeamActivity(buildParams());
      const d = res?.data || res;
      setRows(d.rows || []);
      setTotals(d.totals || null);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load team activity');
    } finally { setLoading(false); }
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);

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

  // A clickable metric cell — shows a count and opens the drill-down when > 0.
  const MetricCell = ({ value, userId, type, name }: { value: number; userId: string | null; type: string; name: string }) => (
    <td>
      {value > 0
        ? <button type="button" className="ta-link" onClick={() => openDrill(userId, type, name, value)}>{value}</button>
        : <span className="ta-zero">0</span>}
    </td>
  );

  return (
    <div className="ta-page">
      <div className="ta-header">
        <div>
          <h1>📊 Team Activity</h1>
          <p>What each team member did — calls, WhatsApp, notes, stage moves & leads touched. Click any number for details.</p>
        </div>
      </div>

      <div className="ta-filters">
        {(['today', 'week', 'month', 'custom'] as Range[]).map(r => (
          <button key={r} className={`ta-tab ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>
            {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : 'Pick a Day'}
          </button>
        ))}
        {range === 'custom' && (
          <input type="date" className="ta-date" value={customDate} max={fmtDate(new Date())} onChange={e => setCustomDate(e.target.value)} />
        )}
      </div>

      {totals && (
        <div className="ta-totals">
          <div className="ta-total"><span>Total Activities</span><b>{totals.total}</b></div>
          <div className="ta-total"><span>📞 Calls</span><b>{totals.call}</b></div>
          <div className="ta-total"><span>💬 WhatsApp</span><b>{totals.whatsapp}</b></div>
          <div className="ta-total"><span>📝 Notes</span><b>{totals.note}</b></div>
          <div className="ta-total"><span>🔄 Stage Moves</span><b>{totals.stageMoves}</b></div>
        </div>
      )}

      <div className="ta-table-wrap">
        {loading ? <div className="ta-msg">Loading…</div> :
          err ? <div className="ta-msg err">{err}</div> :
          rows.length === 0 ? <div className="ta-msg">No activity in this period.</div> : (
          <table className="ta-table">
            <thead><tr>
              <th>Team Member</th><th>Role</th>
              <th>📞 Calls</th><th>💬 WhatsApp</th><th>📝 Notes</th><th>🔄 Stage Moves</th>
              <th>🎯 Leads Touched</th><th>Total</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.userId || i}>
                  <td><div className="ta-person"><span className="ta-avatar">{(r.name || '?').split(' ').map((s: string) => s[0]).slice(0, 2).join('')}</span><div><b>{r.name}</b><span>{r.email}</span></div></div></td>
                  <td><span className="ta-role">{r.role || '—'}</span></td>
                  <MetricCell value={r.call} userId={r.userId} type="call" name={r.name} />
                  <MetricCell value={r.whatsapp} userId={r.userId} type="whatsapp" name={r.name} />
                  <MetricCell value={r.note} userId={r.userId} type="note" name={r.name} />
                  <MetricCell value={r.stageMoves} userId={r.userId} type="stageMoves" name={r.name} />
                  <MetricCell value={r.leadsTouched} userId={r.userId} type="leadsTouched" name={r.name} />
                  <td>
                    {r.total > 0
                      ? <button type="button" className="ta-link ta-link-strong" onClick={() => openDrill(r.userId, 'total', r.name, r.total)}>{r.total}</button>
                      : <b>0</b>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
