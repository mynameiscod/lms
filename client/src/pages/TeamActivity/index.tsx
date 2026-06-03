import React, { useEffect, useState, useCallback } from 'react';
import { leadApi } from '../../api';
import './TeamActivity.css';

type Range = 'today' | 'week' | 'month' | 'custom';

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

const TeamActivity: React.FC = () => {
  const [range, setRange] = useState<Range>('today');
  const [customDate, setCustomDate] = useState(fmtDate(new Date()));
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

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

  return (
    <div className="ta-page">
      <div className="ta-header">
        <div>
          <h1>📊 Team Activity</h1>
          <p>What each team member did — calls, WhatsApp, notes, stage moves & leads touched</p>
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
                  <td>{r.call}</td><td>{r.whatsapp}</td><td>{r.note}</td><td>{r.stageMoves}</td>
                  <td>{r.leadsTouched}</td>
                  <td><b>{r.total}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TeamActivity;
