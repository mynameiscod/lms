import React, { useEffect, useState } from 'react';
import { portalApi, fileObjectUrl, empErr, Address, Employee, PortalMe, SensitiveFields } from '../../../api/employeesApi';
import { fmtDate, initials } from './portalUtils';
import '../employees.css';
import './portal.css';

interface Props { me: PortalMe; reload: () => void }

type Contact = NonNullable<Employee['emergencyContacts']>[number];
type Edu = NonNullable<Employee['education']>[number];
type Exp = NonNullable<Employee['experience']>[number];

const SENSITIVE: { k: keyof SensitiveFields; label: string; upper?: boolean }[] = [
  { k: 'bankAccountHolder', label: 'Account holder name' },
  { k: 'bankName', label: 'Bank name' },
  { k: 'bankAccountNumber', label: 'Account number' },
  { k: 'bankIfsc', label: 'IFSC code', upper: true },
  { k: 'bankBranch', label: 'Branch' },
  { k: 'pan', label: 'PAN', upper: true },
  { k: 'aadhaar', label: 'Aadhaar number' },
  { k: 'uan', label: 'UAN (PF number)' },
];
const ADDR: { k: keyof Address; label: string }[] = [
  { k: 'line1', label: 'Address line 1' }, { k: 'line2', label: 'Address line 2' },
  { k: 'city', label: 'City' }, { k: 'state', label: 'State' }, { k: 'pincode', label: 'PIN code' },
];
const MARITAL = ['', 'single', 'married', 'divorced', 'widowed'];
const BLOOD = ['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const AddressFields: React.FC<{ id: string; title: string; value: Address; onChange: (a: Address) => void }> = ({ id, title, value, onChange }) => (
  <div>
    <h3>{title}</h3>
    <div className="emp-grid c2">
      {ADDR.map((a) => (
        <div className="emp-field" key={a.k}>
          <label htmlFor={`${id}-${a.k}`}>{a.label}</label>
          <input id={`${id}-${a.k}`} className="emp-input" value={value[a.k] || ''} onChange={(e) => onChange({ ...value, [a.k]: e.target.value })} />
        </div>
      ))}
    </div>
  </div>
);

const ProfileTab: React.FC<Props> = ({ me, reload }) => {
  const e = me.employee;
  const [personalEmail, setPersonalEmail] = useState(e.personalEmail || '');
  const [phone, setPhone] = useState(e.phone || '');
  const [altPhone, setAltPhone] = useState(e.altPhone || '');
  const [bloodGroup, setBloodGroup] = useState(e.bloodGroup || '');
  const [maritalStatus, setMaritalStatus] = useState(e.maritalStatus || '');
  const [cur, setCur] = useState<Address>(e.currentAddress || {});
  const [perm, setPerm] = useState<Address>(e.permanentAddress || {});
  const [contacts, setContacts] = useState<Contact[]>(e.emergencyContacts || []);
  const [edu, setEdu] = useState<Edu[]>(e.education || []);
  const [exp, setExp] = useState<Exp[]>(e.experience || []);
  const [skills, setSkills] = useState((e.skills || []).join(', '));
  const [sens, setSens] = useState<Partial<Record<keyof SensitiveFields, string>>>({});
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const photoId = e.photoFileId;
  useEffect(() => {
    if (!photoId) { setPhotoUrl(''); return undefined; }
    let url = '';
    let live = true;
    fileObjectUrl(photoId).then((u) => { if (live) { url = u; setPhotoUrl(u); } else URL.revokeObjectURL(u); }).catch(() => setPhotoUrl(''));
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [photoId]);

  const say = (kind: 'ok' | 'err', text: string) => { setMsg({ kind, text }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true); setMsg(null);
    const sensitive: SensitiveFields = {};
    SENSITIVE.forEach(({ k, upper }) => {
      const v = (sens[k] || '').trim();
      if (v) sensitive[k] = upper ? v.toUpperCase() : v;
    });
    try {
      await portalApi.saveMe({
        personalEmail: personalEmail.trim(), phone: phone.trim(), altPhone: altPhone.trim(), bloodGroup, maritalStatus,
        currentAddress: cur, permanentAddress: perm,
        emergencyContacts: contacts.filter((c) => c.name.trim() || c.phone.trim()),
        education: edu.filter((x) => x.degree.trim() || x.institution.trim()),
        experience: exp.filter((x) => x.company.trim() || x.role.trim()),
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        ...(Object.keys(sensitive).length ? { sensitive } : {}),
      });
      setSens({});
      say('ok', 'Your details are saved.');
      reload();
    } catch (er) { say('err', empErr(er)); } finally { setBusy(false); }
  };

  const changePhoto = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { say('err', 'The photo must be 5 MB or smaller.'); return; }
    setPhotoBusy(true);
    try { await portalApi.uploadPhoto(file); say('ok', 'Photo updated.'); reload(); } catch (er) { say('err', empErr(er, 'Could not upload the photo')); } finally { setPhotoBusy(false); }
  };

  const setAt = <T,>(list: T[], i: number, patch: Partial<T>): T[] => list.map((x, k) => (k === i ? { ...x, ...patch } : x));
  const masked = e.sensitive || {};

  const job: [string, string][] = [
    ['Employee code', e.employeeCode], ['Designation', e.designation || '—'], ['Department', e.department || '—'],
    ['Reports to', me.managerName || '—'], ['Joined on', fmtDate(e.joiningDate)],
    ['Employment type', (e.employmentType || '—').replace(/_/g, ' ')], ['Work mode', e.workMode || '—'],
    ['Work email', e.workEmail || '—'],
  ];

  return (
    <form onSubmit={save}>
      {msg && <div className={`emp-msg ${msg.kind}`} role="status">{msg.text}</div>}

      <div className="emp-card">
        <div className="emp-row" style={{ gap: 14 }}>
          <span className="emp-avatar lg">{photoUrl ? <img src={photoUrl} alt={e.name} /> : initials(e.name)}</span>
          <div>
            <b style={{ fontSize: 17 }}>{e.name}</b>
            <div className="emp-muted">{e.designation || ''}</div>
            <label className="emp-btn ghost sm" style={{ display: 'inline-flex', alignItems: 'center', marginTop: 6 }}>
              {photoBusy ? 'Uploading…' : 'Change photo'}
              <input type="file" accept="image/*" hidden disabled={photoBusy} onChange={(ev) => { changePhoto(ev.target.files); ev.target.value = ''; }} />
            </label>
          </div>
        </div>
      </div>

      <div className="emp-card">
        <h2>Job details</h2>
        <dl className="emp-kv">
          {job.map(([k, v]) => (<React.Fragment key={k}><dt>{k}</dt><dd style={{ textTransform: k === 'Work email' ? 'none' : 'capitalize' }}>{v}</dd></React.Fragment>))}
        </dl>
        <p className="emp-hint">To change these, please talk to HR.</p>
      </div>

      <div className="emp-card">
        <h2>Contact</h2>
        <div className="emp-grid c2">
          <div className="emp-field"><label htmlFor="pf-email">Personal email</label><input id="pf-email" type="email" className="emp-input" value={personalEmail} onChange={(x) => setPersonalEmail(x.target.value)} /></div>
          <div className="emp-field"><label htmlFor="pf-phone">Phone</label><input id="pf-phone" type="tel" className="emp-input" value={phone} onChange={(x) => setPhone(x.target.value)} /></div>
          <div className="emp-field"><label htmlFor="pf-alt">Alternate phone</label><input id="pf-alt" type="tel" className="emp-input" value={altPhone} onChange={(x) => setAltPhone(x.target.value)} /></div>
          <div className="emp-field">
            <label htmlFor="pf-blood">Blood group</label>
            <select id="pf-blood" className="emp-select" value={bloodGroup} onChange={(x) => setBloodGroup(x.target.value)}>{BLOOD.map((b) => <option key={b} value={b}>{b || 'Not set'}</option>)}</select>
          </div>
          <div className="emp-field">
            <label htmlFor="pf-marital">Marital status</label>
            <select id="pf-marital" className="emp-select" value={maritalStatus} onChange={(x) => setMaritalStatus(x.target.value)}>{MARITAL.map((b) => <option key={b} value={b}>{b ? b[0].toUpperCase() + b.slice(1) : 'Not set'}</option>)}</select>
          </div>
        </div>
        <AddressFields id="cur" title="Current address" value={cur} onChange={setCur} />
        <AddressFields id="perm" title="Permanent address" value={perm} onChange={setPerm} />
      </div>

      <div className="emp-card">
        <h2>Emergency contacts <span className="emp-muted" style={{ fontSize: 12 }}>{contacts.length}/5</span></h2>
        {contacts.length === 0 && <p className="emp-hint">Add someone we can call in an emergency.</p>}
        {contacts.map((c, i) => (
          <div className="emp-sub-row" key={i}>
            <div className="emp-field"><label htmlFor={`ec-n-${i}`}>Name</label><input id={`ec-n-${i}`} className="emp-input" value={c.name} onChange={(x) => setContacts(setAt(contacts, i, { name: x.target.value }))} /></div>
            <div className="emp-field"><label htmlFor={`ec-r-${i}`}>Relation</label><input id={`ec-r-${i}`} className="emp-input" value={c.relation} onChange={(x) => setContacts(setAt(contacts, i, { relation: x.target.value }))} /></div>
            <div className="emp-field"><label htmlFor={`ec-p-${i}`}>Phone</label><input id={`ec-p-${i}`} type="tel" className="emp-input" value={c.phone} onChange={(x) => setContacts(setAt(contacts, i, { phone: x.target.value }))} /></div>
            <button type="button" className="emp-btn ghost sm" onClick={() => setContacts(contacts.filter((_, k) => k !== i))}>Remove</button>
          </div>
        ))}
        {contacts.length < 5 && <button type="button" className="emp-btn ghost sm" onClick={() => setContacts([...contacts, { name: '', relation: '', phone: '' }])}>＋ Add contact</button>}
      </div>

      <div className="emp-card">
        <h2>Education</h2>
        {edu.map((x, i) => (
          <div className="emp-sub-row" key={i}>
            <div className="emp-field"><label htmlFor={`ed-d-${i}`}>Degree</label><input id={`ed-d-${i}`} className="emp-input" value={x.degree} onChange={(v) => setEdu(setAt(edu, i, { degree: v.target.value }))} /></div>
            <div className="emp-field"><label htmlFor={`ed-i-${i}`}>College / university</label><input id={`ed-i-${i}`} className="emp-input" value={x.institution} onChange={(v) => setEdu(setAt(edu, i, { institution: v.target.value }))} /></div>
            <div className="emp-field"><label htmlFor={`ed-y-${i}`}>Year</label><input id={`ed-y-${i}`} className="emp-input" value={x.year} onChange={(v) => setEdu(setAt(edu, i, { year: v.target.value }))} /></div>
            <button type="button" className="emp-btn ghost sm" onClick={() => setEdu(edu.filter((_, k) => k !== i))}>Remove</button>
          </div>
        ))}
        <button type="button" className="emp-btn ghost sm" onClick={() => setEdu([...edu, { degree: '', institution: '', year: '', grade: '' }])}>＋ Add education</button>

        <h2 style={{ marginTop: 18 }}>Work experience</h2>
        {exp.map((x, i) => (
          <div className="emp-sub-row" key={i}>
            <div className="emp-field"><label htmlFor={`ex-c-${i}`}>Company</label><input id={`ex-c-${i}`} className="emp-input" value={x.company} onChange={(v) => setExp(setAt(exp, i, { company: v.target.value }))} /></div>
            <div className="emp-field"><label htmlFor={`ex-r-${i}`}>Role</label><input id={`ex-r-${i}`} className="emp-input" value={x.role} onChange={(v) => setExp(setAt(exp, i, { role: v.target.value }))} /></div>
            <div className="emp-field"><label htmlFor={`ex-y-${i}`}>Years (e.g. 2019-2022)</label><input id={`ex-y-${i}`} className="emp-input" value={`${x.from || ''}${x.to ? `-${x.to}` : ''}`}
              onChange={(v) => { const [a, b] = v.target.value.split('-'); setExp(setAt(exp, i, { from: (a || '').trim(), to: (b || '').trim() })); }} /></div>
            <button type="button" className="emp-btn ghost sm" onClick={() => setExp(exp.filter((_, k) => k !== i))}>Remove</button>
          </div>
        ))}
        <button type="button" className="emp-btn ghost sm" onClick={() => setExp([...exp, { company: '', role: '', from: '', to: '' }])}>＋ Add experience</button>

        <div className="emp-field" style={{ marginTop: 18 }}>
          <label htmlFor="pf-skills">Skills (separate with commas)</label>
          <input id="pf-skills" className="emp-input" value={skills} onChange={(x) => setSkills(x.target.value)} placeholder="Counselling, Excel, Java" />
        </div>
      </div>

      <div className="emp-card">
        <h2>Bank &amp; ID details</h2>
        <p className="emp-hint" style={{ marginTop: 0 }}>Used to pay your reimbursements. Only you and the accounts team can see these. Saved values are hidden; type a new value only if you want to change it.</p>
        <div className="emp-grid c2">
          {SENSITIVE.map(({ k, label }) => (
            <div className="emp-field" key={k}>
              <label htmlFor={`sn-${k}`}>{label}</label>
              <input id={`sn-${k}`} className="emp-input" autoComplete="off" value={sens[k] || ''} placeholder={masked[k] || 'Not added yet'}
                onChange={(x) => setSens({ ...sens, [k]: x.target.value })} />
            </div>
          ))}
        </div>
      </div>

      <button type="submit" className="emp-btn good" style={{ width: '100%', fontSize: 16 }} disabled={busy}>{busy ? 'Saving…' : 'Save my details'}</button>
    </form>
  );
};

export default ProfileTab;
