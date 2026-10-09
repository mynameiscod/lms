import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userApi } from '../../api';

/**
 * "Profile" for staff (admins, instructors, staff). Students keep the student profile wizard;
 * an admin opening Profile used to land in that wizard (degree, skills, resume…), which is not
 * their kind of profile.
 */
const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Platform administrator', TENANT_ADMIN: 'Institute administrator', INSTRUCTOR: 'Instructor',
  STAFF: 'Staff', ATTENDANCE_ADMIN: 'Attendance administrator', PLACEMENT_OFFICER: 'Placement officer',
};

const AccountProfile: React.FC = () => {
  const { user } = useAuth();
  const u: any = user || {};
  const [phone, setPhone] = useState<string>(u.phone || '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await userApi.updateProfile(u._id || u.id, { phone: phone.trim() });
      setMsg({ ok: true, text: 'Saved.' });
    } catch (e: any) { setMsg({ ok: false, text: e?.message || 'Could not save.' }); }
    setBusy(false);
  };

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #eef1f6', fontSize: 14 }}>
      <span style={{ width: 160, color: '#64748b', fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#0f172a', flex: 1 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: '24px 26px', maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>My account</h1>
      <p style={{ color: '#64748b', fontSize: 13.5, margin: '0 0 16px' }}>Your login and contact details.</p>
      <div style={{ background: '#fff', border: '1px solid #e8edf4', borderRadius: 14, padding: '8px 20px 18px' }}>
        {row('Name', [u.firstName, u.lastName].filter(Boolean).join(' ') || '—')}
        {row('Email (login)', u.email || '—')}
        {row('Role', ROLE_LABEL[u.role] || u.role || '—')}
        {row('Mobile', (
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile"
              style={{ border: '1px solid #dbe2ec', borderRadius: 8, padding: '6px 9px', fontSize: 14, width: 200 }} />
            <button onClick={save} disabled={busy}
              style={{ border: 0, borderRadius: 8, padding: '7px 14px', fontWeight: 700, background: '#4f46e5', color: '#fff', cursor: 'pointer' }}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </span>
        ))}
        {row('Password', <Link to="/forgot-password" style={{ color: '#4f46e5', fontWeight: 700 }}>Change password (we email you a link)</Link>)}
        {msg && <p role="status" style={{ margin: '12px 0 0', fontSize: 13, color: msg.ok ? '#15803d' : '#b91c1c' }}>{msg.text}</p>}
      </div>
    </div>
  );
};

export default AccountProfile;
