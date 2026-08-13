import React, { useEffect, useRef, useState } from 'react';
import PassportShell from './PassportShell';
import studentProfileAPI, { StudentProfileData } from '../../api/studentProfileAPI';
import passportApi from '../../api/passportApi';
import './member.css';

/**
 * The member's own profile — photo, personal details, education and links.
 *
 * Backed by the SAME StudentProfile record the LMS uses, not a CareerPilot copy. A member
 * is an ordinary user, the record is keyed by user, and 71 of them already have a photo
 * here. A second store would have meant two versions of someone's degree and no way to
 * say which was right.
 *
 * Saving also refreshes the handful of fields the roadmap engine reads off `passport.*`
 * (server side, in the profile controller), so correcting a degree here re-stages the
 * member instead of leaving them on a pathway matched to the old one.
 */

const SECTIONS = ['Personal', 'Education', 'Links'] as const;
type Section = typeof SECTIONS[number];

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;
const STATUSES = ['Student', 'Graduate', 'Working Professional'] as const;
const QUALS = ['10th Standard', '12th Standard', 'Diploma', 'Polytechnic',
  'Bachelors', 'Masters', 'PhD', 'Other'];

/** Photos are stored as a server path; anything already absolute is left alone. */
const photoSrc = (p?: string) => {
  if (!p) return '';
  return /^https?:\/\//i.test(p) ? p : `${window.location.origin}${p}`;
};

const blank = (): StudentProfileData => ({
  personalInfo: {}, professionalProfiles: {}, education: {},
  technicalBackground: {}, courseInterest: {}, additionalInfo: {},
});

const PassportProfile: React.FC = () => {
  const [data, setData] = useState<StudentProfileData>(blank());
  const [career, setCareer] = useState<{ score?: number | null; level?: string; pathway?: string }>({});
  const [tab, setTab] = useState<Section>('Personal');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, d] = await Promise.all([
          studentProfileAPI.getMyProfile(),
          // The career panel is read-only context; a failure there must not stop the
          // profile from loading.
          passportApi.getDashboard().catch(() => null),
        ]);
        setData({ ...blank(), ...(p.data || {}) });
        if (d) setCareer({ score: d.careerScore, level: (d as any)?.level?.label, pathway: (d as any)?.pathwayLabel });
      } catch (e: any) {
        setErr(e?.response?.data?.message || 'Could not load your profile.');
      }
      setLoading(false);
    })();
  }, []);

  // Revoke the object URL when it is replaced or the screen closes, or every photo the
  // member previews leaks for the life of the tab.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const set = (group: keyof StudentProfileData, patch: any) =>
    setData(d => ({ ...d, [group]: { ...(d[group] as any || {}), ...patch } }));
  const setDegree = (patch: any) =>
    setData(d => ({ ...d, education: { ...(d.education || {}), degree: { ...((d.education?.degree as any) || {}), ...patch } } }));

  const pickPhoto = (f: File | null) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(f.type)) {
      setErr('Your photo must be a JPEG, PNG, GIF or WebP image.'); return;
    }
    if (f.size > 20 * 1024 * 1024) { setErr('That photo is over 20 MB. Please use a smaller one.'); return; }
    setErr('');
    if (preview) URL.revokeObjectURL(preview);
    setPhotoFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const r = await studentProfileAPI.saveProfile(data, photoFile || undefined);
      setData({ ...blank(), ...(r.data || {}) });
      setPhotoFile(null);
      if (preview) { URL.revokeObjectURL(preview); setPreview(''); }
      setMsg('Saved.');
      setTimeout(() => setMsg(''), 2500);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save your profile.');
    }
    setSaving(false);
  };

  if (loading) return <PassportShell><div className="pm-card">Loading your profile…</div></PassportShell>;

  const pi: any = data.personalInfo || {};
  const ed: any = data.education || {};
  const deg: any = ed.degree || {};
  const links: any = data.professionalProfiles || {};
  const shown = preview || photoSrc(pi.profilePhoto);
  const pct = data.profileCompletionPercentage ?? 0;
  const initials = `${(pi.firstName || '?')[0] || ''}${(pi.surname || '')[0] || ''}`.toUpperCase();

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="pfx-f"><label>{label}</label>{children}</div>
  );

  return (
    <PassportShell>
      <div className="pfx">

        {/* ── identity ── */}
        <div className="pfx-head">
          <button className="pfx-dp" onClick={() => fileRef.current?.click()}
            title="Change your photo" aria-label="Change your photo">
            {shown ? <img src={shown} alt="" /> : <span className="pfx-init">{initials || '🙂'}</span>}
            <span className="pfx-cam">📷</span>
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }} onChange={e => pickPhoto(e.target.files?.[0] || null)} />

          <div className="pfx-who">
            <h1>{[pi.firstName, pi.surname].filter(Boolean).join(' ') || 'Your profile'}</h1>
            <p>{pi.email || ''}{pi.mobileNumber ? ` · ${pi.mobileNumber}` : ''}</p>
            {photoFile && <span className="pfx-note">New photo selected — press Save to keep it.</span>}
            <div className="pfx-bar" title={`${pct}% complete`}>
              <i style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <span className="pfx-pct">{pct}% complete</span>
          </div>

          {/* Read-only: what the product concluded, next to what they told it. */}
          {(career.score != null || career.level) && (
            <div className="pfx-career">
              <div className="k">Career score</div>
              <div className="v">{career.score ?? '—'}</div>
              {career.level && <div className="lvl">{career.level}</div>}
              {career.pathway && <div className="pth">{career.pathway}</div>}
            </div>
          )}
        </div>

        {err && <div className="pm-msg err">{err}</div>}
        {msg && <div className="pm-msg ok">{msg}</div>}

        <div className="pfx-tabs">
          {SECTIONS.map(s => (
            <button key={s} className={`pfx-tab${tab === s ? ' on' : ''}`} onClick={() => setTab(s)}>{s}</button>
          ))}
        </div>

        <div className="pfx-card">
          {tab === 'Personal' && (
            <div className="pfx-grid">
              <Field label="First name"><input value={pi.firstName || ''} onChange={e => set('personalInfo', { firstName: e.target.value })} /></Field>
              <Field label="Surname"><input value={pi.surname || ''} onChange={e => set('personalInfo', { surname: e.target.value })} /></Field>
              <Field label="Mobile"><input value={pi.mobileNumber || ''} inputMode="numeric" placeholder="10-digit mobile"
                onChange={e => set('personalInfo', { mobileNumber: e.target.value })} /></Field>
              <Field label="Email"><input type="email" value={pi.email || ''} onChange={e => set('personalInfo', { email: e.target.value })} /></Field>
              <Field label="Date of birth"><input type="date" value={(pi.dateOfBirth || '').slice(0, 10)}
                onChange={e => set('personalInfo', { dateOfBirth: e.target.value })} /></Field>
              <Field label="Gender">
                <select value={pi.gender || ''} onChange={e => set('personalInfo', { gender: e.target.value })}>
                  <option value="">Select…</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="City"><input value={pi.city || ''} placeholder="e.g. Hyderabad" onChange={e => set('personalInfo', { city: e.target.value })} /></Field>
              <Field label="State"><input value={pi.state || ''} onChange={e => set('personalInfo', { state: e.target.value })} /></Field>
              <div className="pfx-f wide">
                <label>Address</label>
                <textarea value={pi.address || ''} onChange={e => set('personalInfo', { address: e.target.value })} />
              </div>
            </div>
          )}

          {tab === 'Education' && (
            <div className="pfx-grid">
              <Field label="Current status">
                <select value={ed.currentStatus || ''} onChange={e => set('education', { currentStatus: e.target.value })}>
                  <option value="">Select…</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Highest qualification">
                <select value={ed.highestQualification || ''} onChange={e => set('education', { highestQualification: e.target.value })}>
                  <option value="">Select…</option>
                  {QUALS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </Field>
              <Field label="Degree"><input value={deg.name || ''} placeholder="e.g. B.Tech" onChange={e => setDegree({ name: e.target.value })} /></Field>
              <Field label="Branch"><input value={deg.branch || ''} placeholder="e.g. CSE" onChange={e => setDegree({ branch: e.target.value })} /></Field>
              <Field label="College"><input value={deg.college || ''} onChange={e => setDegree({ college: e.target.value })} /></Field>
              <Field label="University"><input value={deg.university || ''} onChange={e => setDegree({ university: e.target.value })} /></Field>
              <Field label="Percentage / CGPA"><input value={deg.percentage ?? ''} inputMode="decimal"
                onChange={e => setDegree({ percentage: e.target.value === '' ? undefined : Number(e.target.value) })} /></Field>
              <Field label="Graduation year"><input value={deg.graduationYear ?? ''} inputMode="numeric" placeholder="e.g. 2026"
                onChange={e => setDegree({ graduationYear: e.target.value === '' ? undefined : Number(e.target.value) })} /></Field>
              <div className="pfx-f wide">
                <label>Career goal</label>
                <input value={(data.additionalInfo as any)?.careerGoal || ''} placeholder="e.g. Backend developer at a product company"
                  onChange={e => set('additionalInfo', { careerGoal: e.target.value })} />
              </div>
              <p className="pfx-hint wide">
                Degree, branch, graduation year, career goal and current status also drive your
                roadmap. Correcting them here re-fits your plan.
              </p>
            </div>
          )}

          {tab === 'Links' && (
            <div className="pfx-grid">
              <div className="pfx-f wide"><label>LinkedIn</label>
                <input value={links.linkedInUrl || ''} placeholder="https://linkedin.com/in/…"
                  onChange={e => set('professionalProfiles', { linkedInUrl: e.target.value })} /></div>
              <div className="pfx-f wide"><label>GitHub</label>
                <input value={links.githubUrl || ''} placeholder="https://github.com/…"
                  onChange={e => set('professionalProfiles', { githubUrl: e.target.value })} /></div>
              <div className="pfx-f wide"><label>Portfolio</label>
                <input value={links.portfolioUrl || ''} placeholder="https://…"
                  onChange={e => set('professionalProfiles', { portfolioUrl: e.target.value })} /></div>
              {links.resumeUrl && (
                <p className="pfx-hint wide">
                  A resume is on file. <a href={photoSrc(links.resumeUrl)} target="_blank" rel="noreferrer">View it</a> —
                  build or replace it in the Resume Centre.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="pfx-actions">
          <button className="pm-btn primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>
    </PassportShell>
  );
};

export default PassportProfile;
