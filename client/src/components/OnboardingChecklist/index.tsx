import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * "Set up your institute" — what is still to do, with a link to each place. Shown on an institute
 * admin's dashboard until every required item is done, and inside Tenant Management for the
 * platform administrator (with "Run setup", which only adds what is missing).
 */

interface Item { key: string; label: string; done: boolean; required: boolean; link?: string; hint?: string }

const authHeaders = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

const OnboardingChecklist: React.FC<{ tenantId: string; mode: 'dashboard' | 'admin' }> = ({ tenantId, mode }) => {
  const [data, setData] = useState<{ items: Item[]; percent: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    fetch(`/api/v1/tenants/${tenantId}/onboarding`, { headers: authHeaders() })
      .then((r) => r.json()).then((j) => { if (j.success) setData(j.data); }).catch(() => {});
  }, [tenantId]);
  useEffect(() => { if (tenantId) load(); }, [tenantId, load]);

  const runSetup = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`/api/v1/tenants/${tenantId}/onboard`, { method: 'POST', headers: authHeaders() }).then((x) => x.json());
      if (!r.success) throw new Error(r.message);
      setData({ items: r.data.items, percent: r.data.percent });
      setMsg(r.data.added?.length ? `Added: ${r.data.added.join(', ')}.` : 'Nothing was missing.');
    } catch (e: any) { setMsg(e?.message || 'Setup failed'); }
    setBusy(false);
  };

  if (!data) return null;
  const requiredLeft = data.items.filter((i) => i.required && !i.done).length;
  if (mode === 'dashboard' && requiredLeft === 0 && data.percent >= 80) return null;

  return (
    <div style={{ background: '#fff', border: '1px solid #e8edf4', borderRadius: 14, padding: '16px 18px', margin: mode === 'dashboard' ? '0 0 16px' : '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
          <i className="fa-solid fa-list-check" /> {mode === 'dashboard' ? 'Set up your institute' : 'Setup checklist'}
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: '#64748b' }}>{data.percent}% done</span>
        </h3>
        {mode === 'admin' && (
          <button onClick={runSetup} disabled={busy} style={{ border: '1px solid #dbe2ec', background: '#fff', borderRadius: 8, padding: '5px 12px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
            {busy ? 'Running…' : 'Run setup'}
          </button>
        )}
      </div>
      <div style={{ height: 6, background: '#eef1f6', borderRadius: 99, margin: '10px 0 12px' }}>
        <div style={{ height: 6, width: `${data.percent}%`, background: '#16a34a', borderRadius: 99 }} />
      </div>
      {msg && <p style={{ fontSize: 12.5, color: '#475569', margin: '0 0 8px' }}>{msg}</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        {data.items.map((i) => (
          <li key={i.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
            <i className={i.done ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'} style={{ color: i.done ? '#16a34a' : '#94a3b8', marginTop: 3 }} aria-hidden="true" />
            <span style={{ flex: 1 }}>
              {i.link && !i.done && mode === 'dashboard' ? <Link to={i.link} style={{ color: '#4f46e5', fontWeight: 600 }}>{i.label}</Link> : <span style={{ fontWeight: 600, color: i.done ? '#64748b' : '#0f172a' }}>{i.label}</span>}
              {i.required && !i.done && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: '#b45309' }}>required</span>}
              {!i.done && i.hint && <span style={{ display: 'block', color: '#64748b', fontSize: 12 }}>{i.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OnboardingChecklist;
