import React, { useCallback, useEffect, useState } from 'react';
import { certificateApi, CertificateRow } from '../../api/certificateApi';

const INK = '#0f172a', SUB = '#64748b', BLUE = '#2563eb';
const TYPE_COLOR: Record<string, string> = { placement: '#16a34a', course: '#2563eb', quiz: '#7c3aed', assignment: '#0ea5e9', assessment: '#d97706', internship: '#0f766e', custom: '#64748b' };

const CertificatesAdmin: React.FC = () => {
  const [rows, setRows] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', search: '' });
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await certificateApi.list({ type: filter.type || undefined, search: filter.search || undefined }); setRows(r.data.data); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [filter.type, filter.search]);
  useEffect(() => { load(); }, [load]);

  const toggleRevoke = async (c: CertificateRow) => {
    if (!c.revoked && !window.confirm(`Revoke ${c.certificateNumber} for ${c.studentName}? The public verify page will show it as revoked.`)) return;
    await certificateApi.revoke(c.id, !c.revoked, c.revoked ? undefined : 'Revoked by admin');
    load();
  };
  const copyLink = (c: CertificateRow) => {
    const url = `${window.location.origin}/verify/${c.verifyCode}`;
    navigator.clipboard?.writeText(url); setCopied(c.id); setTimeout(() => setCopied(''), 1500);
  };

  const inp: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 11px', fontSize: 13.5 };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 22 }}>
      <h1 style={{ margin: 0, fontSize: 24, color: INK, fontWeight: 800 }}>Certificates</h1>
      <p style={{ color: SUB, fontSize: 13.5 }}>Every issued certificate is recorded with a number and a public verification link. Revoke any certificate to invalidate it.</p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '14px 0', flexWrap: 'wrap' }}>
        <input style={{ ...inp, minWidth: 240 }} placeholder="Search name / company / number…" value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} />
        <select style={inp} value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
          <option value="">All types</option>
          {['placement', 'course', 'quiz', 'assignment', 'assessment', 'internship', 'custom'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 13, color: SUB }}>{rows.length} certificate{rows.length === 1 ? '' : 's'}</span>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, minWidth: 820 }}>
          <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>{['Number', 'Type', 'Student', 'Details', 'Issued', 'Status', ''].map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', color: SUB }}>{h}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 24, color: SUB, textAlign: 'center' }}>Loading…</td></tr> :
              rows.length === 0 ? <tr><td colSpan={7} style={{ padding: 26, color: SUB, textAlign: 'center' }}>No certificates issued yet. They're created automatically when students are marked placed.</td></tr> :
                rows.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid #eef1f6', opacity: c.revoked ? 0.6 : 1 }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: INK, fontFamily: 'ui-monospace,monospace', fontSize: 12 }}>{c.certificateNumber}</td>
                    <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: TYPE_COLOR[c.type] || '#64748b', borderRadius: 999, padding: '2px 9px', textTransform: 'capitalize' }}>{c.type}</span></td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: INK }}>{c.studentName}</td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>{[c.company, c.role].filter(Boolean).join(' · ')}{c.ctc ? ` · ₹${c.ctc}L` : ''}</td>
                    <td style={{ padding: '10px 12px', color: SUB }}>{new Date(c.issuedAt).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '10px 12px' }}>{c.revoked ? <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 12 }}>Revoked</span> : <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 12 }}>Valid</span>}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => copyLink(c)} style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 7, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: BLUE, marginRight: 6 }}>{copied === c.id ? '✓ Copied' : '🔗 Verify link'}</button>
                      <button onClick={() => toggleRevoke(c)} style={{ border: 'none', background: 'none', color: c.revoked ? '#16a34a' : '#dc2626', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>{c.revoked ? 'Restore' : 'Revoke'}</button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CertificatesAdmin;
