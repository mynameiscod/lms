import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

/**
 * Settings → Branding: the institute's name, logo, colours and support contact. Used on the login
 * page, the sidebar, every email (sender name, footer, contact lines) and certificates/PDFs.
 */

interface Branding {
  name: string; slug: string; logo: string; website: string; primaryColor: string; secondaryColor: string;
  portalTitle: string; welcomeMessage: string; faviconUrl: string; supportEmail: string; supportPhone: string; address: string;
}

const FIELDS: { key: keyof Branding; label: string; hint?: string; type?: 'color' | 'textarea' }[] = [
  { key: 'name', label: 'Institute name' },
  { key: 'portalTitle', label: 'Name shown to students', hint: 'Optional — e.g. a shorter name. Used in the browser tab, emails and the login page.' },
  { key: 'logo', label: 'Logo link', hint: 'An https:// link to a PNG/SVG (about 300×80). Shown in the sidebar, login page and emails.' },
  { key: 'faviconUrl', label: 'Browser tab icon link', hint: 'Optional https:// link to a square PNG.' },
  { key: 'primaryColor', label: 'Main colour', type: 'color' },
  { key: 'secondaryColor', label: 'Accent colour', type: 'color' },
  { key: 'welcomeMessage', label: 'Login page message', type: 'textarea', hint: 'Shown under your logo on the login page.' },
  { key: 'supportEmail', label: 'Support email', hint: 'Replaces the contact email in every email footer and PDF.' },
  { key: 'supportPhone', label: 'Support phone' },
  { key: 'address', label: 'Address', type: 'textarea' },
  { key: 'website', label: 'Website', hint: 'https://…' },
];

const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid #dbe2ec', borderRadius: 9, padding: '8px 10px', fontSize: 13.5, fontFamily: 'inherit' };

const TenantBranding: React.FC = () => {
  const { user } = useAuth();
  const { setTenant } = useTenant();
  const tenantId = String(user?.tenantId || '');
  const [b, setB] = useState<Branding | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}`, 'X-Tenant-Id': tenantId });

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/v1/tenants/${tenantId}/branding`, { headers: headers() }).then((r) => r.json())
      .then((j) => (j.success ? setB(j.data) : setMsg({ ok: false, text: j.message || 'Could not load' })))
      .catch(() => setMsg({ ok: false, text: 'Could not load' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const save = async () => {
    if (!b) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/v1/tenants/${tenantId}/branding`, { method: 'PUT', headers: headers(), body: JSON.stringify(b) }).then((x) => x.json());
      if (!r.success) throw new Error(r.message);
      setB(r.data);
      setTenant(null); // reload the brand everywhere (sidebar, colours)
      setMsg({ ok: true, text: 'Saved. Emails, the login page and certificates now use this.' });
    } catch (e: any) { setMsg({ ok: false, text: e?.message || 'Could not save' }); }
    setBusy(false);
  };

  if (!b) return <div style={{ padding: 26, color: '#94a3b8' }}>{msg?.text || 'Loading…'}</div>;
  const loginLink = `${window.location.origin}/login?tenantId=${tenantId}`;

  return (
    <div style={{ padding: '22px 26px 40px', maxWidth: 820 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}><i className="fa-solid fa-palette" /> Branding</h1>
      <p style={{ color: '#64748b', fontSize: 13.5, margin: '0 0 14px' }}>How your institute appears to students and staff — login page, sidebar, emails and certificates.</p>
      {msg && <div role="status" style={{ borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12, background: msg.ok ? '#dcfce7' : '#fef2f2', color: msg.ok ? '#15803d' : '#b91c1c' }}>{msg.text}</div>}
      <div style={{ background: '#fff', border: '1px solid #e8edf4', borderRadius: 14, padding: '16px 20px' }}>
        {b.logo && <img src={b.logo} alt="Logo preview" style={{ maxHeight: 60, marginBottom: 12 }} />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px 18px' }}>
          {FIELDS.map((f) => (
            <label key={f.key} style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
              {f.label}
              {f.type === 'textarea'
                ? <textarea style={{ ...input, marginTop: 4, minHeight: 60 }} value={b[f.key]} onChange={(e) => setB({ ...b, [f.key]: e.target.value })} />
                : f.type === 'color'
                  ? <span style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <input type="color" value={b[f.key] || '#4f46e5'} onChange={(e) => setB({ ...b, [f.key]: e.target.value })} style={{ width: 44, height: 36, border: 0, background: 'none' }} />
                      <input style={input} value={b[f.key]} placeholder="#4f46e5" onChange={(e) => setB({ ...b, [f.key]: e.target.value })} />
                    </span>
                  : <input style={{ ...input, marginTop: 4 }} value={b[f.key]} onChange={(e) => setB({ ...b, [f.key]: e.target.value })} />}
              {f.hint && <span style={{ display: 'block', fontWeight: 400, color: '#64748b', marginTop: 3 }}>{f.hint}</span>}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={save} disabled={busy} style={{ border: 0, borderRadius: 9, padding: '9px 16px', fontWeight: 700, background: '#4f46e5', color: '#fff', cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save'}</button>
          <span style={{ fontSize: 12.5, color: '#64748b' }}>Your login link: <code>{loginLink}</code></span>
        </div>
      </div>
    </div>
  );
};

export default TenantBranding;
