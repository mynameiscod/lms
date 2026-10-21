import React, { useEffect, useState } from 'react';
import { communicationApi } from '../../api/communicationApi';

/** Trainer view of the Communication Coach: who has never started, who went quiet, who sounds frozen, who is ready. */

const FLAG: Record<string, { label: string; color: string; bg: string }> = {
  never_started: { label: 'Never started', color: '#b91c1c', bg: '#fef2f2' },
  inactive: { label: 'Gone quiet (3+ days)', color: '#b45309', bg: '#fffbeb' },
  high_hesitation: { label: 'High hesitation', color: '#b45309', bg: '#fffbeb' },
  low_score: { label: 'Low score', color: '#b45309', bg: '#fffbeb' },
};
const th: React.CSSProperties = { textAlign: 'left', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6b7280', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' };
const td: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 13.5, color: '#374151' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.05)' };

const CoachOverviewPanel: React.FC<{ batches: { _id: string; name: string }[] }> = ({ batches }) => {
  const [batchId, setBatchId] = useState('');
  const [data, setData] = useState<any>(null);
  const [only, setOnly] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { setData(null); setErr(''); communicationApi.adminCoachOverview(batchId || undefined).then(setData).catch(() => setErr('Could not load the coach overview.')); }, [batchId]);

  if (err) return <div style={{ color: '#b91c1c', padding: 24 }}>{err}</div>;
  if (!data) return <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading…</div>;
  const s = data.summary;
  const stat = (label: string, value: number, color: string, key = '') => (
    <button key={label} onClick={() => setOnly(only === key ? '' : key)} style={{ ...card, padding: '14px 16px', textAlign: 'left', cursor: key ? 'pointer' : 'default', outline: only === key && key ? '2px solid #1a5490' : 'none' }}>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div><div style={{ fontSize: 12.5, color: '#6b7280' }}>{label}</div>
    </button>
  );
  const rows = data.students.filter((r: any) => !only || (only === 'ready' ? r.ready : r.flags.includes(only)));
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={batchId} onChange={(e) => setBatchId(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13.5, width: 220 }}>
          <option value="">All batches</option>
          {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <span style={{ color: '#6b7280', fontSize: 13 }}>Ready = baseline done, steady, scoring well, practising most days. Needs a readiness of {data.threshold}.</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
        {stat('Students', s.students, '#111827')}
        {stat('Practised today', s.practisedToday, '#16a34a')}
        {stat('Never started', s.neverStarted, '#dc2626', 'never_started')}
        {stat('Gone quiet', s.inactive, '#d97706', 'inactive')}
        {stat('High hesitation', s.highHesitation, '#d97706', 'high_hesitation')}
        {stat('Ready for companies', s.ready, '#16a34a', 'ready')}
      </div>
      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Student</th><th style={th}>Last practised</th><th style={th}>Recordings</th><th style={th}>Level</th><th style={th}>Avg score</th><th style={th}>Hesitation</th><th style={th}>Readiness</th><th style={th}>Needs attention</th></tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.studentId}>
                <td style={td}><b>{r.name}</b></td>
                <td style={td}>{r.lastPracticeDate ? (r.daysSincePractice === 0 ? 'Today' : `${r.daysSincePractice}d ago`) : '—'}</td>
                <td style={td}>{r.recordings}{r.baselineAreas < 4 && r.recordings > 0 ? <span style={{ color: '#b45309' }}> · baseline {r.baselineAreas}/4</span> : null}</td>
                <td style={td}>{r.recordings ? r.level : '—'}</td>
                <td style={td}>{r.recordings ? r.avgScore : '—'}</td>
                <td style={td}>{r.recordings ? r.avgHesitation : '—'}</td>
                <td style={td}><b style={{ color: r.ready ? '#16a34a' : '#374151' }}>{r.recordings ? r.readiness : '—'}</b>{r.ready ? ' ✓' : ''}</td>
                <td style={td}>{r.flags.length ? r.flags.map((f: string) => <span key={f} style={{ display: 'inline-block', margin: '0 4px 4px 0', padding: '2px 8px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: FLAG[f].color, background: FLAG[f].bg }}>{FLAG[f].label}</span>) : <span style={{ color: '#16a34a' }}>On track</span>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td style={{ ...td, textAlign: 'center', color: '#9ca3af' }} colSpan={8}>No students here.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CoachOverviewPanel;
