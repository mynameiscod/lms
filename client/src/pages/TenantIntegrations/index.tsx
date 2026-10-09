import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Settings → Integrations: the institute's OWN Razorpay, UPI, email sender and Meta pixel.
 * Without its own Razorpay keys an institute cannot take online payments (it no longer falls
 * back to CodeBegun's account); without its own WhatsApp connection nothing is sent on WhatsApp.
 */

const BASE = '/api/v1/tenant-integrations';
const h = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) } };
};
const err = (e: any) => e?.response?.data?.message || e?.message || 'Something went wrong';

interface Field { key: string; secret: boolean; set: boolean; value: string; masked: string; source: 'own' | 'platform' | 'unset' }
interface Data {
  isPlatformOwner: boolean;
  groups: { id: string; title: string; fields: Field[] }[];
  whatsapp: { connected: boolean; phoneNumberId: string | null };
  razorpayWebhookUrl: string;
  status: { payments: boolean; whatsapp: boolean };
}

const LABEL: Record<string, [string, string?]> = {
  RAZORPAY_KEY_ID: ['Key ID', 'Razorpay Dashboard → Account & Settings → API Keys. Starts with rzp_live_ or rzp_test_.'],
  RAZORPAY_KEY_SECRET: ['Key secret', 'Shown once when the key is generated.'],
  RAZORPAY_WEBHOOK_SECRET: ['Webhook secret', 'The secret you type when adding the webhook below in Razorpay.'],
  UPI_ID: ['UPI ID', 'Shown on fee reminders, e.g. institute@okaxis.'],
  EMAIL_SERVICE: ['Provider', 'ses, smtp, gmail or brevo. Leave blank to use the platform sender.'],
  EMAIL_FROM: ['From', 'Your Institute <no-reply@yourdomain.com> — the domain must be verified with your provider.'],
  SES_REGION: ['SES region'], SES_ACCESS_KEY_ID: ['SES access key ID'], SES_SECRET_ACCESS_KEY: ['SES secret access key'],
  SMTP_HOST: ['SMTP host'], SMTP_PORT: ['SMTP port'], SMTP_SECURE: ['SMTP secure (true/false)'],
  EMAIL_USER: ['SMTP / Gmail user'], EMAIL_PASSWORD: ['SMTP / Gmail password'], BREVO_API_KEY: ['Brevo API key'],
  META_PIXEL_ID: ['Pixel ID', 'Meta Events Manager → your pixel.'], META_CAPI_ACCESS_TOKEN: ['Conversions API token'],
};

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8edf4', borderRadius: 14, padding: '16px 20px', marginBottom: 14 };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid #dbe2ec', borderRadius: 9, padding: '8px 10px', fontSize: 13.5 };
const btn = (primary = true): React.CSSProperties => ({ border: primary ? 0 : '1px solid #dbe2ec', borderRadius: 9, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', background: primary ? '#4f46e5' : '#fff', color: primary ? '#fff' : '#334155' });
const pill = (ok: boolean): React.CSSProperties => ({ fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '2px 9px', background: ok ? '#dcfce7' : '#fef3c7', color: ok ? '#15803d' : '#b45309' });

const TenantIntegrations: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [testTo, setTestTo] = useState<string>((user as any)?.email || '');

  const load = () => axios.get(`${BASE}`, h()).then((r) => { setData(r.data.data); setEdit({}); }).catch((e) => setMsg({ ok: false, text: err(e) }));
  useEffect(() => { load(); }, []);

  const save = async (groupId: string) => {
    const g = data?.groups.find((x) => x.id === groupId);
    if (!g) return;
    const values = Object.fromEntries(g.fields.filter((f) => edit[f.key] !== undefined).map((f) => [f.key, edit[f.key]]));
    if (!Object.keys(values).length) { setMsg({ ok: false, text: 'Nothing changed.' }); return; }
    setBusy(groupId); setMsg(null);
    try { const r = await axios.put(BASE, { values }, h()); setData(r.data.data); setEdit({}); setMsg({ ok: true, text: 'Saved.' }); }
    catch (e) { setMsg({ ok: false, text: err(e) }); }
    setBusy('');
  };

  const test = async (kind: 'razorpay' | 'email') => {
    setBusy(kind); setMsg(null);
    try {
      const r = await axios.post(`${BASE}/test/${kind}`, kind === 'email' ? { to: testTo } : {}, h());
      setMsg({ ok: true, text: kind === 'razorpay' ? `Razorpay accepted the keys (${r.data.data.mode} mode).` : `Test email sent to ${testTo}.` });
    } catch (e) { setMsg({ ok: false, text: err(e) }); }
    setBusy('');
  };

  if (!data) return <div style={{ padding: 26, color: '#94a3b8' }}>{msg?.text || 'Loading…'}</div>;

  return (
    <div style={{ padding: '22px 26px 40px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}><i className="fa-solid fa-plug" /> Integrations</h1>
      <p style={{ color: '#64748b', fontSize: 13.5, margin: '0 0 14px' }}>
        Your institute's own accounts. Payments go into <b>your</b> Razorpay account and messages go out from <b>your</b> WhatsApp number and email sender.
      </p>
      {msg && <div role="status" style={{ borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12, background: msg.ok ? '#dcfce7' : '#fef2f2', color: msg.ok ? '#15803d' : '#b91c1c' }}>{msg.text}</div>}

      <section style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 6px', display: 'flex', gap: 8, alignItems: 'center' }}>
          WhatsApp <span style={pill(data.status.whatsapp)}>{data.whatsapp.connected ? 'Connected' : data.isPlatformOwner ? 'Platform number' : 'Not connected'}</span>
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          Connect your WhatsApp Business number in <Link to="/lead-sources">Leads → Lead Sources → WhatsApp</Link>.
          {!data.status.whatsapp && ' Until then no WhatsApp message (OTP, reminders, chat) is sent for your institute — logins fall back to email codes.'}
        </p>
      </section>

      {data.groups.map((g) => (
        <section key={g.id} style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 6px', display: 'flex', gap: 8, alignItems: 'center' }}>
            {g.title}
            {g.id === 'payments' && <span style={pill(data.status.payments)}>{data.status.payments ? 'Ready' : 'Not set up — online payment is off'}</span>}
          </h2>
          {g.id === 'payments' && (
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 8px' }}>
              In Razorpay → Webhooks add <code>{data.razorpayWebhookUrl}</code> with events <code>payment.captured</code>, <code>order.paid</code>, <code>payment.failed</code>, <code>refund.processed</code>.
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px 16px' }}>
            {g.fields.map((f) => (
              <label key={f.key} style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                {LABEL[f.key]?.[0] || f.key}
                {f.source === 'platform' && <span style={{ fontWeight: 500, color: '#64748b' }}> · using platform value</span>}
                <input style={{ ...input, marginTop: 4 }} type={f.secret ? 'password' : 'text'} autoComplete="off"
                  placeholder={f.secret ? (f.set ? `Saved (${f.masked}) — leave blank to keep` : 'Not set') : ''}
                  value={edit[f.key] ?? (f.secret ? '' : f.value)}
                  onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
                {LABEL[f.key]?.[1] && <span style={{ display: 'block', fontWeight: 400, color: '#64748b', marginTop: 3 }}>{LABEL[f.key][1]}</span>}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button style={btn()} disabled={busy === g.id} onClick={() => save(g.id)}>{busy === g.id ? 'Saving…' : 'Save'}</button>
            {g.id === 'payments' && <button style={btn(false)} disabled={busy === 'razorpay'} onClick={() => test('razorpay')}>{busy === 'razorpay' ? 'Checking…' : 'Check keys with Razorpay'}</button>}
            {g.id === 'email' && <>
              <input style={{ ...input, width: 240 }} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Send a test to…" />
              <button style={btn(false)} disabled={busy === 'email'} onClick={() => test('email')}>{busy === 'email' ? 'Sending…' : 'Send test email'}</button>
            </>}
          </div>
        </section>
      ))}
    </div>
  );
};

export default TenantIntegrations;
