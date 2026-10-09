import React, { useEffect, useState } from 'react';

/**
 * Plan & limits for one institute (platform administrator, Tenant Management). Blank = unlimited.
 * The institute's AI, live classes and storage run on the platform's accounts — these keep its
 * use within what it pays for.
 */
interface Data {
  limits: { maxStudents?: number | null; maxStaff?: number | null; aiBudgetInrMonthly?: number | null };
  usage: { students: number; staff: number; aiSpendInrThisMonth: number };
  unlimited: boolean;
}

const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const box: React.CSSProperties = { border: '1px solid #e8edf4', borderRadius: 12, padding: '12px 14px', margin: '12px 0', background: '#fff' };
const input: React.CSSProperties = { width: 110, border: '1px solid #dbe2ec', borderRadius: 8, padding: '6px 8px', fontSize: 13 };

const TenantLimitsEditor: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [d, setD] = useState<Data | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`/api/v1/tenants/${tenantId}/limits`, { headers: headers() }).then((r) => r.json()).then((j) => {
      if (!j.success) return;
      setD(j.data);
      const l = j.data.limits || {};
      setForm({ maxStudents: l.maxStudents ?? '', maxStaff: l.maxStaff ?? '', aiBudgetInrMonthly: l.aiBudgetInrMonthly ?? '' } as any);
    }).catch(() => {});
  }, [tenantId]);

  const save = async () => {
    setMsg('');
    const r = await fetch(`/api/v1/tenants/${tenantId}/limits`, { method: 'PUT', headers: headers(), body: JSON.stringify(form) }).then((x) => x.json()).catch(() => null);
    if (r?.success) { setD(r.data); setMsg('Limits saved.'); } else setMsg(r?.message || 'Could not save.');
  };

  if (!d) return null;
  if (d.unlimited) return <div style={box}><b>Plan & limits</b><p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>Platform owner — never limited.</p></div>;

  const row = (key: string, label: string, used: string, suffix = '') => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, margin: '6px 0' }}>
      <span style={{ width: 170, fontWeight: 600 }}>{label}</span>
      <input style={input} type="number" min={0} placeholder="Unlimited" value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      <span style={{ color: '#64748b' }}>{suffix} · using {used}</span>
    </div>
  );

  return (
    <div style={box}>
      <b>Plan & limits</b> <span style={{ fontSize: 12, color: '#64748b' }}>(blank = unlimited)</span>
      {row('maxStudents', 'Max students', String(d.usage.students))}
      {row('maxStaff', 'Max staff accounts', String(d.usage.staff))}
      {row('aiBudgetInrMonthly', 'AI budget per month', `₹${d.usage.aiSpendInrThisMonth} this month`, '₹')}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
        <button onClick={save} style={{ border: 0, borderRadius: 8, padding: '6px 14px', fontWeight: 700, background: '#4f46e5', color: '#fff', cursor: 'pointer' }}>Save limits</button>
        {msg && <span style={{ fontSize: 12.5, color: '#475569' }}>{msg}</span>}
      </div>
    </div>
  );
};

export default TenantLimitsEditor;
