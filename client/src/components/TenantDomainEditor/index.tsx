import React, { useEffect, useState } from 'react';

/**
 * Custom domain for one institute (platform administrator, Tenant Management):
 * set it → the college points DNS here → Check DNS → run the shown command on the server.
 */
interface Status { domain: string; verifiedAt: string | null; platformHost: string; platformIp: string; installCommand: string }

const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const box: React.CSSProperties = { border: '1px solid #e8edf4', borderRadius: 12, padding: '12px 14px', margin: '12px 0', background: '#fff', fontSize: 13 };

const TenantDomainEditor: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [st, setSt] = useState<Status | null>(null);
  const [domain, setDomain] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    fetch(`/api/v1/tenants/${tenantId}/domain`, { headers: headers() }).then((r) => r.json())
      .then((j) => { if (j.success) { setSt(j.data); setDomain(j.data.domain || ''); } }).catch(() => {});
  }, [tenantId]);

  const call = async (kind: 'save' | 'verify') => {
    setBusy(kind); setMsg(null);
    const r = await fetch(`/api/v1/tenants/${tenantId}/domain${kind === 'verify' ? '/verify' : ''}`, {
      method: kind === 'verify' ? 'POST' : 'PUT', headers: headers(), body: kind === 'save' ? JSON.stringify({ domain }) : undefined,
    }).then((x) => x.json()).catch(() => null);
    if (r?.success) { setSt(r.data); setMsg({ ok: true, text: kind === 'verify' ? 'DNS points here — run the command below on the server.' : 'Saved. Now ask the college to point DNS here, then Check DNS.' }); }
    else setMsg({ ok: false, text: r?.message || 'Failed' });
    setBusy('');
  };

  if (!st) return null;
  return (
    <div style={box}>
      <b>Custom domain</b> <span style={{ color: '#64748b' }}>(optional — e.g. lms.college.edu)</span>
      <div style={{ display: 'flex', gap: 8, margin: '8px 0', flexWrap: 'wrap' }}>
        <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="lms.college.edu"
          style={{ border: '1px solid #dbe2ec', borderRadius: 8, padding: '6px 9px', fontSize: 13, width: 240 }} />
        <button onClick={() => call('save')} disabled={!!busy} style={{ border: 0, borderRadius: 8, padding: '6px 12px', fontWeight: 700, background: '#4f46e5', color: '#fff', cursor: 'pointer' }}>Save</button>
        {st.domain && <button onClick={() => call('verify')} disabled={!!busy} style={{ border: '1px solid #dbe2ec', borderRadius: 8, padding: '6px 12px', fontWeight: 700, background: '#fff', cursor: 'pointer' }}>{busy === 'verify' ? 'Checking…' : 'Check DNS'}</button>}
      </div>
      {st.domain && (
        <p style={{ margin: '4px 0', color: '#475569' }}>
          {st.verifiedAt ? '✅ DNS verified.' : '⏳ Not verified yet.'} The college adds a <b>CNAME</b> record <code>{st.domain}</code> → <code>{st.platformHost}</code>
          {st.platformIp && <> (or an A record → <code>{st.platformIp}</code>)</>}.
        </p>
      )}
      {st.verifiedAt && st.installCommand && (
        <p style={{ margin: '4px 0', color: '#475569' }}>Then on the server (once): <code>{st.installCommand}</code></p>
      )}
      {msg && <p style={{ margin: '6px 0 0', color: msg.ok ? '#15803d' : '#b91c1c' }}>{msg.text}</p>}
    </div>
  );
};

export default TenantDomainEditor;
