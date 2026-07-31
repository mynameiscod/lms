import React, { useEffect, useState } from 'react';
import * as api from '../../api/labTrackApi';
import { Lab } from '../../api/labTrackApi';
import { Spinner } from '../../components/common';

/**
 * Who is actually doing the daily lab.
 *
 * Before this the only signal was a streak buried on an individual profile, so nobody
 * could answer "is this batch keeping up?" without opening 18 pages. Students are sorted
 * WORST FIRST, because the list exists to find the people who have stopped — a roster
 * sorted alphabetically buries exactly the rows worth acting on.
 *
 * "Expected" comes from each batch's own calendar, so a batch that has had two holidays
 * is not measured against one that has not.
 */

const base = () => (process.env.REACT_APP_API_URL || '/api/v1');
const headers = () => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem('token'); if (t) h.Authorization = `Bearer ${t}`;
  const x = localStorage.getItem('tenantId'); if (x) h['X-Tenant-Id'] = x;
  return h;
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—';

const ProgressPanel: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [batchId, setBatchId] = useState('');
  const [lab, setLab] = useState<Lab>('thinking');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch(`${base()}/batches`, { headers: headers() })
      .then(r => r.json())
      .then(b => {
        const list = b?.data?.batches || b?.batches || b?.data || [];
        setBatches(Array.isArray(list) ? list : []);
      })
      .catch(() => setBatches([]));
  }, []);

  useEffect(() => {
    if (!batchId) { setData(null); return; }
    setLoading(true); setErr('');
    fetch(`${base()}/lab-tracks/progress?batchId=${batchId}&lab=${lab}`, { headers: headers() })
      .then(async r => {
        const b = await r.json();
        if (!r.ok || b.success === false) throw new Error(b.message || 'Failed');
        setData(b.data);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [batchId, lab]);

  return (
    <div className="lt-assign">
      <div className="lt-form">
        <h4>Daily lab progress</h4>
        <div className="lt-form-grid">
          <label>Batch
            <select value={batchId} onChange={e => setBatchId(e.target.value)}>
              <option value="">Select a batch…</option>
              {batches.map((b: any) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </label>
          <label>Lab
            <select value={lab} onChange={e => setLab(e.target.value as Lab)}>
              <option value="thinking">Thinking Lab</option>
              <option value="communication">Communication Lab</option>
            </select>
          </label>
        </div>
      </div>

      {err && <div className="lt-err">{err}</div>}
      {loading && <div className="lt-loading"><Spinner /></div>}

      {data && !data.assigned && (
        <p className="lt-hint">
          No {lab === 'thinking' ? 'Thinking' : 'Communication'} track is attached to this batch,
          so no daily challenge is being delivered and there is nothing to measure.
        </p>
      )}

      {data && data.assigned && (
        <>
          <div className="lt-prog-cards">
            <div className="lt-pc"><span>Students</span><b>{data.summary.students}</b></div>
            <div className="lt-pc good"><span>Done today</span><b>{data.summary.doneToday}</b></div>
            <div className="lt-pc"><span>On track</span><b>{data.summary.onTrack}</b></div>
            <div className="lt-pc bad"><span>Behind</span><b>{data.summary.behind}</b></div>
            <div className="lt-pc"><span>Avg completion</span><b>{data.summary.avgRate}%</b></div>
            <div className="lt-pc"><span>Day now</span><b>{data.currentDay ?? '—'}</b></div>
          </div>

          <p className="lt-hint">
            {data.track?.name} · started {fmt(data.startDate)} · {data.expected} day(s) expected so far ·
            gating <b>{data.gate}</b>
            {data.currentDay === null && ' · today is not a learning day for this batch'}
          </p>

          {data.students.length === 0 ? (
            <p className="lt-hint">This batch has no active students.</p>
          ) : (
            <div className="lt-table-wrap">
              <table className="lt-table">
                <thead>
                  <tr><th>Student</th><th>Done</th><th>Expected</th><th>Missed</th><th>Completion</th><th>Today</th><th>Last activity</th></tr>
                </thead>
                <tbody>
                  {data.students.map((s: any) => (
                    <tr key={s._id}>
                      <td>
                        <div className="lt-stu">{s.name}</div>
                        <div className="lt-stu-mail">{s.email}</div>
                      </td>
                      <td>{s.completed}</td>
                      <td>{s.expected}</td>
                      <td>{s.missed > 0 ? <b className="lt-bad">{s.missed}</b> : '0'}</td>
                      <td>
                        <div className="lt-prog-bar">
                          <div className={s.rate >= 80 ? 'ok' : s.rate >= 50 ? 'warn' : 'bad'}
                               style={{ width: `${s.rate}%` }} />
                        </div>
                        <span className="lt-rate">{s.rate}%</span>
                      </td>
                      {/* Words as well as colour — the state must not depend on seeing green. */}
                      <td>{s.doneToday
                        ? <span className="lt-gate off" style={{ background: '#dcfce7', color: '#166534' }}>Done</span>
                        : <span className="lt-gate" style={{ background: '#fef3c7', color: '#92400e' }}>Pending</span>}</td>
                      <td>{fmt(s.lastActivity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProgressPanel;
