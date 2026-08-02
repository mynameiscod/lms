import React, { useEffect, useState, useCallback } from 'react';
import passportApi from '../../api/passportApi';

const PassportAdminStudents: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [convertId, setConvertId] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try { setRows(await passportApi.listStudents(search)); } catch { setRows([]); }
  }, [search]);
  useEffect(() => { load(); }, [load]);

  const convert = async () => {
    if (!convertId.trim()) return;
    setMsg('');
    try { const r = await passportApi.convert(convertId.trim()); setMsg('✅ ' + (r.message || 'Activated')); setConvertId(''); await load(); }
    catch (e: any) { setMsg(e?.response?.data?.message || 'Failed'); }
  };

  return (
    <div style={{ padding: '22px 26px', maxWidth: 980 }}>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>CareerPilot <span style={{ color: '#cbd5e1' }}>›</span> <b style={{ color: '#334155' }}>Students</b></div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>CareerPilot Students</h1>

      <div style={{ background: '#f8fafc', border: '1px solid #eef1f6', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Manually activate a student:</span>
        <input placeholder="student id" value={convertId} onChange={e => setConvertId(e.target.value)} style={{ padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, minWidth: 240 }} />
        <button onClick={convert} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Activate</button>
        {msg && <span style={{ fontSize: 13, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{msg}</span>}
      </div>

      <input placeholder="Search name / email…" value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13.5, width: 300, marginBottom: 12 }} />

      <div style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            {['Student', 'Email', 'Activated', 'Expires'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>No CareerPilot students yet.</td></tr> :
              rows.map(r => (
                <tr key={r._id} style={{ borderTop: '1px solid #f5f7fa' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.firstName} {r.lastName}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{r.email}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{r.passport?.activatedAt ? new Date(r.passport.activatedAt).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{r.passport?.expiresAt ? new Date(r.passport.expiresAt).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PassportAdminStudents;
