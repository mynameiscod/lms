import React, { useEffect, useState } from 'react';
import passportApi, { MemberProfile } from '../../api/passportApi';
import PassportShell from './PassportShell';

/**
 * The member's own details.
 *
 * Email is shown but not editable: it is the login identity and the key the signup funnel
 * dedupes on, so editing it here would let someone walk away from an account that is
 * already in use. The mobile number IS editable and carries the same one-number-one-account
 * rule as signup — otherwise that guard is bypassed by registering with a spare number and
 * changing it afterwards.
 */

const DEGREES = ['B.Tech', 'B.E.', 'BCA', 'B.Sc.', 'MCA', 'M.Tech', 'Diploma', 'Other'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduated'];
const GOALS = ['Software Development', 'Data Analytics', 'AI-Ready', 'Not sure yet'];

const Profile: React.FC = () => {
  const [p, setP] = useState<MemberProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.getMyProfile()
      .then(r => setP(r.profile))
      .catch(e => setErr(e?.response?.data?.message || 'Could not load your profile'));
  }, []);

  const set = (k: keyof MemberProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setP(v => (v ? { ...v, [k]: e.target.value } : v));

  const save = async () => {
    if (!p) return;
    setBusy(true); setMsg(''); setErr('');
    try {
      const r = await passportApi.updateMyProfile(p);
      setP(r.profile);
      setMsg('Saved.');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save');
    }
    setBusy(false);
  };

  if (err && !p) return <PassportShell><div className="pm-msg err">{err}</div></PassportShell>;
  if (!p) return <PassportShell><div className="pm-card">Loading…</div></PassportShell>;

  return (
    <PassportShell>
      <div className="pm-head">
        <h1>My profile</h1>
        <p>Keep this current — your roadmap and your Passport card are built from it.</p>
      </div>

      <div className="pm-card" style={{ maxWidth: 620 }}>
        <label className="pf-label">Full name</label>
        <input className="pf-input" value={p.name} onChange={set('name')} />

        <label className="pf-label">Mobile</label>
        <input className="pf-input" value={p.mobile} onChange={set('mobile')} inputMode="numeric" maxLength={14} />
        <div className="pf-hint">10 digits, no country code. One number per account.</div>

        <label className="pf-label">Email</label>
        <input className="pf-input" value={p.email} disabled />
        <div className="pf-hint">This is how you log in, so it can't be changed here. Contact support if it's wrong.</div>

        <div className="pf-row">
          <div>
            <label className="pf-label">Degree</label>
            <select className="pf-input" value={p.degree} onChange={set('degree')}>
              <option value="">Select…</option>
              {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="pf-label">Academic year</label>
            <select className="pf-input" value={p.yearOfStudy} onChange={set('yearOfStudy')}>
              <option value="">Select…</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="pf-row">
          <div>
            <label className="pf-label">Branch</label>
            <input className="pf-input" value={p.branch} onChange={set('branch')} placeholder="e.g. CSE" />
          </div>
          <div>
            <label className="pf-label">City</label>
            <input className="pf-input" value={p.city} onChange={set('city')} placeholder="e.g. Hyderabad" />
          </div>
        </div>

        <label className="pf-label">Career goal</label>
        <select className="pf-input" value={p.careerGoal} onChange={set('careerGoal')}>
          <option value="">Select…</option>
          {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        {msg && <div className="pm-msg ok" style={{ marginTop: 14 }}>{msg}</div>}
        {err && <div className="pm-msg err" style={{ marginTop: 14 }}>{err}</div>}

        <button className="pm-btn primary" style={{ marginTop: 16 }} disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </PassportShell>
  );
};

export default Profile;
