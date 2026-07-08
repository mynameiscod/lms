import React, { useEffect, useState } from 'react';
import { drillApi, DrillStudentRow, WeakConcept } from '../../api/drillApi';
import { batchApi } from '../../api';

const rateColor = (n: number) => (n >= 70 ? '#16a34a' : n >= 40 ? '#d97706' : '#dc2626');

const DrillsAdmin: React.FC = () => {
  const [students, setStudents] = useState<DrillStudentRow[]>([]);
  const [weak, setWeak] = useState<WeakConcept[]>([]);
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [batchId, setBatchId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (bId?: string) => {
    setLoading(true);
    try { const d = await drillApi.adminOverview(bId || undefined); setStudents(d.students); setWeak(d.weakConcepts); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    batchApi.getBatches().then((b: any) => setBatches((Array.isArray(b) ? b : (b?.data || b?.batches || [])).map((x: any) => ({ _id: x._id, name: x.name })))).catch(() => {});
    load();
  }, []);

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 22 }}>
      <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>🧠 Problem-Solving Dashboard</h1>
      <p style={{ color: '#64748b', fontSize: 13.5 }}>Track who's practising logic drills, their solve rate, and which concepts the batch struggles with.</p>

      <div style={{ margin: '14px 0' }}>
        <select value={batchId} onChange={e => { setBatchId(e.target.value); load(e.target.value); }} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', fontSize: 13.5 }}>
          <option value="">All students</option>
          {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      {loading ? <div style={{ color: '#94a3b8', padding: 30 }}>Loading…</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          <div style={{ overflowX: 'auto', border: '1px solid #e6e8f0', borderRadius: 12 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13.5, minWidth: 480 }}>
              <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>{['Student', 'Solved', 'Attempts', 'Avg score', 'Last active'].map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', color: '#64748b' }}>{h}</th>)}</tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.studentId} style={{ borderTop: '1px solid #eef1f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{s.name}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#16a34a' }}>{s.solved}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>{s.attempts}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{s.avg || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 12.5 }}>{s.last ? new Date(s.last).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {students.length === 0 && <tr><td colSpan={5} style={{ padding: 24, color: '#94a3b8', textAlign: 'center' }}>No drill activity yet.</td></tr>}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Concept solve rate</div>
            {weak.length === 0 ? <div style={{ color: '#94a3b8', fontSize: 13 }}>No data yet.</div> : weak.map(c => (
              <div key={c.concept} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}><span style={{ color: '#475569', fontWeight: 600 }}>{c.concept}</span><b style={{ color: rateColor(c.rate) }}>{c.rate}%</b></div>
                <div style={{ height: 6, background: '#eef1f6', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${c.rate}%`, height: '100%', background: rateColor(c.rate) }} /></div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{c.solved}/{c.total} solved</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DrillsAdmin;
