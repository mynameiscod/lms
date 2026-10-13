import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { userCan } from '../../utils/permissions';
import {
  employeesApi, empErr, fileObjectUrl, Address, ChangeInput, Employee, EmployeeConfig, EmployeeStatus, SensitiveFields, WorkMode,
} from '../../api/employeesApi';
import './employees.css';
import './employeesAdmin.css';

type Draft = Partial<Employee>;
type Pick = { _id: string; name: string; code: string; designation: string };
type Tab = 'profile' | 'job' | 'pay' | 'docs' | 'login' | 'notes';

const STATUSES: { k: EmployeeStatus; label: string }[] = [
  { k: 'active', label: 'Active' }, { k: 'probation', label: 'On probation' }, { k: 'on_notice', label: 'On notice' },
  { k: 'on_leave', label: 'On leave' }, { k: 'exited', label: 'Exited' },
];
const STATUS_TONE: Record<EmployeeStatus, string> = { active: 'green', probation: 'amber', on_notice: 'red', on_leave: 'blue', exited: 'grey' };
const MODES: WorkMode[] = ['office', 'remote', 'hybrid'];

const d10 = (s?: string) => (s ? String(s).slice(0, 10) : '');
const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const inr = (n?: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

const toDraft = (e: Employee): Draft => ({
  ...e,
  dob: d10(e.dob), joiningDate: d10(e.joiningDate), probationEndDate: d10(e.probationEndDate),
  confirmationDate: d10(e.confirmationDate), exitDate: d10(e.exitDate),
  reportingManagerId: e.reportingManagerId || '',
  assets: (e.assets || []).map((a) => ({ ...a, issuedOn: d10(a.issuedOn), returnedOn: d10(a.returnedOn) })),
});

const pickKeys = (o: Draft, keys: (keyof Employee)[]): Draft => {
  const out: Record<string, unknown> = {};
  keys.forEach((k) => { if (o[k] !== undefined) out[k] = o[k]; });
  return out as Draft;
};
const PROFILE_KEYS: (keyof Employee)[] = ['firstName', 'lastName', 'workEmail', 'personalEmail', 'phone', 'altPhone', 'dob', 'gender', 'maritalStatus', 'bloodGroup',
  'nationality', 'currentAddress', 'permanentAddress', 'emergencyContacts', 'education', 'experience', 'assets', 'customFields'];
const JOB_KEYS: (keyof Employee)[] = ['department', 'designation', 'grade', 'employmentType', 'workMode', 'workLocation', 'joiningDate',
  'probationEndDate', 'confirmationDate', 'noticePeriodDays', 'status', 'exitDate', 'exitReason'];

// ── Small building blocks ────────────────────────────────────────────────────

const TextF: React.FC<{ id: string; label: string; value?: string | number; onChange: (v: string) => void; type?: string; disabled?: boolean; required?: boolean; placeholder?: string }> =
  ({ id, label, value, onChange, type = 'text', disabled, required, placeholder }) => (
    <div className="emp-field">
      <label htmlFor={id}>{label}{required ? ' *' : ''}</label>
      <input id={id} className="emp-input" type={type} value={value ?? ''} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );

const SelectF: React.FC<{ id: string; label: string; value?: string; options: string[]; onChange: (v: string) => void; disabled?: boolean; blank?: string }> =
  ({ id, label, value, options, onChange, disabled, blank = 'Select…' }) => {
    const opts = value && !options.includes(value) ? [value, ...options] : options;
    return (
      <div className="emp-field">
        <label htmlFor={id}>{label}</label>
        <select id={id} className="emp-select" value={value || ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          <option value="">{blank}</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  };

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="emp-modal-back" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
    <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
      <h2>{title}</h2>
      {children}
    </div>
  </div>
);

interface RowField<T> { key: keyof T & string; label: string; type?: string }
function RowList<T extends Record<string, string | undefined>>({ idp, rows, onChange, blank, fields, max, addLabel, disabled }: {
  idp: string; rows: T[]; onChange: (r: T[]) => void; blank: T; fields: RowField<T>[]; max?: number; addLabel: string; disabled?: boolean;
}) {
  return (
    <div className="emp-rowlist">
      {rows.length === 0 && <div className="emp-muted" style={{ fontSize: 13 }}>None added.</div>}
      {rows.map((r, i) => (
        <div className="emp-rowlist-item" key={i}>
          {fields.map((f) => (
            <TextF key={f.key} id={`${idp}-${i}-${f.key}`} label={f.label} type={f.type} value={r[f.key] ?? ''} disabled={disabled}
              onChange={(v) => onChange(rows.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))} />
          ))}
          {!disabled && <button type="button" className="emp-btn ghost sm" aria-label={`Remove row ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</button>}
        </div>
      ))}
      {!disabled && (max === undefined || rows.length < max) && (
        <div><button type="button" className="emp-btn ghost sm" onClick={() => onChange([...rows, { ...blank }])}>{addLabel}</button></div>
      )}
    </div>
  );
}

const AddressFields: React.FC<{ idp: string; value?: Address; onChange: (a: Address) => void; disabled?: boolean }> = ({ idp, value, onChange, disabled }) => {
  const a = value || {};
  const s = (k: keyof Address) => (v: string) => onChange({ ...a, [k]: v });
  return (
    <div className="emp-grid c3">
      <TextF id={`${idp}-l1`} label="Address line 1" value={a.line1} onChange={s('line1')} disabled={disabled} />
      <TextF id={`${idp}-l2`} label="Address line 2" value={a.line2} onChange={s('line2')} disabled={disabled} />
      <TextF id={`${idp}-city`} label="City" value={a.city} onChange={s('city')} disabled={disabled} />
      <TextF id={`${idp}-state`} label="State" value={a.state} onChange={s('state')} disabled={disabled} />
      <TextF id={`${idp}-pin`} label="Pincode" value={a.pincode} onChange={s('pincode')} disabled={disabled} />
      <TextF id={`${idp}-country`} label="Country" value={a.country} onChange={s('country')} disabled={disabled} />
    </div>
  );
};

interface SectionProps { d: Draft; set: (p: Draft) => void; ro: boolean; cfg: EmployeeConfig; }

const PersonalCard: React.FC<SectionProps> = ({ d, set, ro }) => (
  <div className="emp-card">
    <h2>Personal</h2>
    <div className="emp-grid c3">
      <TextF id="p-fn" label="First name" required value={d.firstName} onChange={(v) => set({ firstName: v })} disabled={ro} />
      <TextF id="p-ln" label="Last name" value={d.lastName} onChange={(v) => set({ lastName: v })} disabled={ro} />
      <TextF id="p-we" label="Work email (also their login)" type="email" value={d.workEmail} onChange={(v) => set({ workEmail: v })} disabled={ro} />
      <TextF id="p-pe" label="Personal email" type="email" value={d.personalEmail} onChange={(v) => set({ personalEmail: v })} disabled={ro} />
      <TextF id="p-ph" label="Phone" value={d.phone} onChange={(v) => set({ phone: v })} disabled={ro} />
      <TextF id="p-ap" label="Alternate phone" value={d.altPhone} onChange={(v) => set({ altPhone: v })} disabled={ro} />
      <TextF id="p-dob" label="Date of birth" type="date" value={d.dob} onChange={(v) => set({ dob: v })} disabled={ro} />
      <SelectF id="p-g" label="Gender" value={d.gender} options={['Male', 'Female', 'Other']} onChange={(v) => set({ gender: v })} disabled={ro} />
      <SelectF id="p-ms" label="Marital status" value={d.maritalStatus} options={['Single', 'Married', 'Other']} onChange={(v) => set({ maritalStatus: v })} disabled={ro} />
      <SelectF id="p-bg" label="Blood group" value={d.bloodGroup} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} onChange={(v) => set({ bloodGroup: v })} disabled={ro} />
    </div>
  </div>
);

const AddressCard: React.FC<SectionProps & { same: boolean; setSame: (b: boolean) => void }> = ({ d, set, ro, same, setSame }) => (
  <div className="emp-card">
    <h2>Address</h2>
    <h3 style={{ marginTop: 0 }}>Current address</h3>
    <AddressFields idp="ca" value={d.currentAddress} onChange={(a) => set({ currentAddress: a })} disabled={ro} />
    <h3>Permanent address</h3>
    <label className="emp-row" style={{ fontSize: 13, marginBottom: 8 }}>
      <input type="checkbox" checked={same} disabled={ro} onChange={(e) => setSame(e.target.checked)} /> Same as current address
    </label>
    {!same && <AddressFields idp="pa" value={d.permanentAddress} onChange={(a) => set({ permanentAddress: a })} disabled={ro} />}
  </div>
);

const EmergencyCard: React.FC<SectionProps> = ({ d, set, ro }) => (
  <div className="emp-card">
    <h2>Emergency contacts</h2>
    <RowList idp="ec" rows={d.emergencyContacts || []} onChange={(r) => set({ emergencyContacts: r })} max={5} disabled={ro}
      blank={{ name: '', relation: '', phone: '' }} addLabel="Add contact"
      fields={[{ key: 'name', label: 'Name' }, { key: 'relation', label: 'Relation' }, { key: 'phone', label: 'Phone' }]} />
  </div>
);

const JobFields: React.FC<SectionProps & { managers: Pick[]; selfId?: string }> = ({ d, set, ro, cfg, managers, selfId }) => (
  <div className="emp-grid c3">
    <SelectF id="j-dept" label="Department" value={d.department} options={cfg.departments} onChange={(v) => set({ department: v })} disabled={ro} />
    <SelectF id="j-desig" label="Designation" value={d.designation} options={cfg.designations} onChange={(v) => set({ designation: v })} disabled={ro} />
    <TextF id="j-grade" label="Grade" value={d.grade} onChange={(v) => set({ grade: v })} disabled={ro} />
    <SelectF id="j-type" label="Employment type" value={d.employmentType} options={cfg.employmentTypes} onChange={(v) => set({ employmentType: v })} disabled={ro} />
    <SelectF id="j-loc" label="Work location" value={d.workLocation} options={cfg.workLocations} onChange={(v) => set({ workLocation: v })} disabled={ro} />
    <div className="emp-field">
      <label htmlFor="j-mode">Work mode</label>
      <select id="j-mode" className="emp-select" value={d.workMode || ''} disabled={ro} onChange={(e) => set({ workMode: (e.target.value || undefined) as WorkMode | undefined })}>
        <option value="">Select…</option>
        {MODES.map((m) => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}
      </select>
    </div>
    <div className="emp-field">
      <label htmlFor="j-mgr">Reporting manager</label>
      <select id="j-mgr" className="emp-select" value={d.reportingManagerId || ''} disabled={ro} onChange={(e) => set({ reportingManagerId: e.target.value })}>
        <option value="">No manager</option>
        {managers.filter((m) => m._id !== selfId).map((m) => <option key={m._id} value={m._id}>{m.name}{m.designation ? ` (${m.designation})` : ''}</option>)}
      </select>
    </div>
    <TextF id="j-join" label="Joining date" type="date" value={d.joiningDate} onChange={(v) => set({ joiningDate: v })} disabled={ro} />
    <TextF id="j-prob" label="Probation ends" type="date" value={d.probationEndDate} onChange={(v) => set({ probationEndDate: v })} disabled={ro} />
    <TextF id="j-notice" label="Notice period (days)" type="number" value={d.noticePeriodDays} onChange={(v) => set({ noticePeriodDays: v === '' ? undefined : Number(v) })} disabled={ro} />
    <div className="emp-field">
      <label htmlFor="j-status">Status</label>
      <select id="j-status" className="emp-select" value={d.status || 'active'} disabled={ro} onChange={(e) => set({ status: e.target.value as EmployeeStatus })}>
        {STATUSES.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}
      </select>
    </div>
  </div>
);

const CustomFieldsCard: React.FC<SectionProps> = ({ d, set, ro, cfg }) => {
  if (!cfg.customFields.length) return null;
  return (
    <div className="emp-card">
      <h2>Extra fields</h2>
      <div className="emp-grid c3">
        {cfg.customFields.map((f) => (
          <TextF key={f.key} id={`cf-${f.key}`} label={f.label} required={f.required} value={d.customFields?.[f.key]} disabled={ro}
            onChange={(v) => set({ customFields: { ...(d.customFields || {}), [f.key]: v } })} />
        ))}
      </div>
    </div>
  );
};

const SensitiveFieldsForm: React.FC<{ value: SensitiveFields; onChange: (s: SensitiveFields) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  const f = (k: keyof SensitiveFields, id: string, label: string) => (
    <TextF id={id} label={label} value={value[k]} onChange={(v) => onChange({ ...value, [k]: v })} disabled={disabled} />
  );
  return (
    <>
      <div className="emp-grid c3">
        {f('pan', 's-pan', 'PAN')}{f('aadhaar', 's-aad', 'Aadhaar')}{f('uan', 's-uan', 'UAN')}
        {f('pfNumber', 's-pf', 'PF number')}{f('esiNumber', 's-esi', 'ESI number')}
      </div>
      <h3>Bank account</h3>
      <div className="emp-grid c3">
        {f('bankAccountHolder', 's-bh', 'Account holder')}{f('bankName', 's-bn', 'Bank name')}{f('bankAccountNumber', 's-ba', 'Account number')}
        {f('bankIfsc', 's-ifsc', 'IFSC')}{f('bankBranch', 's-br', 'Branch')}
      </div>
    </>
  );
};

// ── Create form ──────────────────────────────────────────────────────────────

const stripEmpty = (o: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  Object.entries(o).forEach(([k, v]) => { if (v !== '' && v !== undefined && v !== null) out[k] = v; });
  return out;
};

const CreateForm: React.FC<{ cfg: EmployeeConfig; managers: Pick[]; canSensitive: boolean; canManage: boolean }> = ({ cfg, managers, canSensitive, canManage }) => {
  const navigate = useNavigate();
  const [d, setD] = useState<Draft>({ status: 'active', workMode: 'office', customFields: {} });
  const [sens, setSens] = useState<SensitiveFields>({});
  const [ctc, setCtc] = useState('');
  const [freq, setFreq] = useState<'monthly' | 'annual'>('monthly');
  const [same, setSame] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (p: Draft) => setD((x) => ({ ...x, ...p }));
  const ro = !canManage;
  const sp: SectionProps = { d, set, ro, cfg };

  const save = async () => {
    if (!d.firstName?.trim()) { setErr('First name is required.'); return; }
    setBusy(true); setErr('');
    try {
      const body: Record<string, unknown> = stripEmpty({ ...d, reportingManagerId: d.reportingManagerId });
      if (same && d.currentAddress) body.permanentAddress = d.currentAddress;
      if (canSensitive) {
        body.sensitive = stripEmpty({ ...sens });
        if (ctc !== '') { body.currentCtc = Number(ctc); body.payFrequency = freq; }
      }
      const created = await employeesApi.create(body as Draft & { sensitive?: SensitiveFields });
      navigate(`/employees/${created._id}`);
    } catch (e) { setErr(empErr(e, 'Could not create the employee')); } finally { setBusy(false); }
  };

  return (
    <div className="emp-page">
      <div className="emp-head">
        <div><h1>Add employee</h1><p className="emp-sub">Their work email becomes their login once you create one on the profile.</p></div>
        <div className="emp-actions">
          <button type="button" className="emp-btn ghost" onClick={() => navigate('/employees')}>Cancel</button>
          <button type="button" className="emp-btn" disabled={busy || ro} onClick={save}>{busy ? 'Saving…' : 'Create employee'}</button>
        </div>
      </div>
      {ro && <div className="emp-msg info">You can view employees but not add them.</div>}
      {err && <div className="emp-msg err" role="alert">{err}</div>}
      <PersonalCard {...sp} />
      <AddressCard {...sp} same={same} setSame={setSame} />
      <EmergencyCard {...sp} />
      <div className="emp-card">
        <h2>Job</h2>
        <JobFields {...sp} managers={managers} />
      </div>
      <CustomFieldsCard {...sp} />
      {canSensitive && (
        <div className="emp-card">
          <h2>Pay and IDs</h2>
          <div className="emp-grid c3" style={{ marginBottom: 8 }}>
            <TextF id="c-ctc" label="Current CTC (₹ annual)" type="number" value={ctc} onChange={setCtc} disabled={ro} />
            <SelectF id="c-freq" label="Pay frequency" value={freq} options={['monthly', 'annual']} blank="Select…" onChange={(v) => setFreq(v === 'annual' ? 'annual' : 'monthly')} disabled={ro} />
          </div>
          <SensitiveFieldsForm value={sens} onChange={setSens} disabled={ro} />
        </div>
      )}
      <div className="emp-actions">
        <button type="button" className="emp-btn" disabled={busy || ro} onClick={save}>{busy ? 'Saving…' : 'Create employee'}</button>
      </div>
    </div>
  );
};

// ── Tabs (view / edit) ───────────────────────────────────────────────────────

interface TabProps { emp: Employee; d: Draft; set: (p: Draft) => void; cfg: EmployeeConfig; canManage: boolean; managers: Pick[]; reload: () => Promise<void>; say: (k: 'ok' | 'err', t: string) => void; }

const ProfileTab: React.FC<TabProps> = ({ emp, d, set, cfg, canManage, reload, say }) => {
  const [same, setSame] = useState(false);
  const [skills, setSkills] = useState((emp.skills || []).join(', '));
  const [busy, setBusy] = useState(false);
  const ro = !canManage;
  const sp: SectionProps = { d, set, ro, cfg };
  const save = async () => {
    if (!d.firstName?.trim()) { say('err', 'First name is required.'); return; }
    setBusy(true);
    try {
      const body = pickKeys(d, PROFILE_KEYS);
      if (same) body.permanentAddress = d.currentAddress;
      body.skills = skills.split(',').map((s) => s.trim()).filter(Boolean);
      await employeesApi.update(emp._id, body);
      await reload(); say('ok', 'Profile saved.');
    } catch (e) { say('err', empErr(e)); } finally { setBusy(false); }
  };
  return (
    <>
      <PersonalCard {...sp} />
      <AddressCard {...sp} same={same} setSame={setSame} />
      <EmergencyCard {...sp} />
      <div className="emp-card">
        <h2>Education</h2>
        <RowList idp="ed" rows={d.education || []} onChange={(r) => set({ education: r })} disabled={ro} addLabel="Add education"
          blank={{ degree: '', institution: '', year: '', grade: '' }}
          fields={[{ key: 'degree', label: 'Degree' }, { key: 'institution', label: 'Institution' }, { key: 'year', label: 'Year' }, { key: 'grade', label: 'Grade' }]} />
      </div>
      <div className="emp-card">
        <h2>Previous experience</h2>
        <RowList idp="ex" rows={d.experience || []} onChange={(r) => set({ experience: r })} disabled={ro} addLabel="Add experience"
          blank={{ company: '', role: '', from: '', to: '', note: '' }}
          fields={[{ key: 'company', label: 'Company' }, { key: 'role', label: 'Role' }, { key: 'from', label: 'From' }, { key: 'to', label: 'To' }, { key: 'note', label: 'Note' }]} />
      </div>
      <div className="emp-card">
        <h2>Skills</h2>
        <TextF id="sk" label="Skills (comma separated)" value={skills} onChange={setSkills} disabled={ro} />
      </div>
      <div className="emp-card">
        <h2>Assets issued</h2>
        <RowList idp="as" rows={d.assets || []} onChange={(r) => set({ assets: r })} disabled={ro} addLabel="Add asset"
          blank={{ name: '', tag: '', issuedOn: '', returnedOn: '', note: '' }}
          fields={[{ key: 'name', label: 'Asset' }, { key: 'tag', label: 'Tag / serial' }, { key: 'issuedOn', label: 'Issued on', type: 'date' }, { key: 'returnedOn', label: 'Returned on', type: 'date' }, { key: 'note', label: 'Note' }]} />
      </div>
      <CustomFieldsCard {...sp} />
      {canManage && <button type="button" className="emp-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>}
    </>
  );
};

const ChangeModal: React.FC<{ emp: Employee; cfg: EmployeeConfig; managers: Pick[]; mode: 'role' | 'pay'; onClose: () => void; onDone: () => Promise<void>; say: TabProps['say'] }> = ({ emp, cfg, managers, mode, onClose, onDone, say }) => {
  const [type, setType] = useState(mode === 'role' ? 'promotion' : 'hike');
  const [eff, setEff] = useState(new Date().toISOString().slice(0, 10));
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [grade, setGrade] = useState('');
  const [mgr, setMgr] = useState('');
  const [ctc, setCtc] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const types = mode === 'role' ? ['promotion', 'transfer', 'role_change', 'correction'] : ['hike', 'promotion', 'revision', 'correction'];
  const go = async () => {
    const body: ChangeInput = { type, effectiveFrom: eff, note: note || undefined };
    if (mode === 'role') {
      if (designation) body.designation = designation;
      if (department) body.department = department;
      if (grade) body.grade = grade;
      if (mgr) body.reportingManagerId = mgr === '__none' ? null : mgr;
      if (!designation && !department && !grade && !mgr) { say('err', 'Enter at least one thing that changes.'); return; }
    } else {
      if (ctc === '' || Number(ctc) < 0) { say('err', 'Enter the new CTC.'); return; }
      body.newCtc = Number(ctc);
    }
    setBusy(true);
    try { await employeesApi.change(emp._id, body); await onDone(); onClose(); say('ok', 'Change recorded.'); } catch (e) { say('err', empErr(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={mode === 'role' ? 'Record promotion / change' : 'Record hike / pay change'} onClose={onClose}>
      <div className="emp-grid c2">
        <div className="emp-field">
          <label htmlFor="ch-type">Type</label>
          <select id="ch-type" className="emp-select" value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
        <TextF id="ch-eff" label="Effective date" type="date" value={eff} onChange={setEff} />
        {mode === 'role' ? (
          <>
            <SelectF id="ch-des" label="New designation" value={designation} options={cfg.designations} onChange={setDesignation} blank="No change" />
            <SelectF id="ch-dep" label="New department" value={department} options={cfg.departments} onChange={setDepartment} blank="No change" />
            <TextF id="ch-gr" label="New grade" value={grade} onChange={setGrade} />
            <div className="emp-field">
              <label htmlFor="ch-mgr">New reporting manager</label>
              <select id="ch-mgr" className="emp-select" value={mgr} onChange={(e) => setMgr(e.target.value)}>
                <option value="">No change</option>
                <option value="__none">Remove manager</option>
                {managers.filter((m) => m._id !== emp._id).map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
          </>
        ) : (
          <TextF id="ch-ctc" label="New CTC (₹ annual)" type="number" value={ctc} onChange={setCtc} />
        )}
      </div>
      <div className="emp-field" style={{ marginTop: 10 }}>
        <label htmlFor="ch-note">Note</label>
        <textarea id="ch-note" className="emp-textarea" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="emp-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
        <button type="button" className="emp-btn ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="emp-btn" disabled={busy} onClick={go}>{busy ? 'Saving…' : 'Record'}</button>
      </div>
    </Modal>
  );
};

const JobTab: React.FC<TabProps> = (props) => {
  const { emp, d, set, cfg, canManage, managers, reload, say } = props;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [deact, setDeact] = useState(false);
  const [modal, setModal] = useState(false);
  const ro = !canManage;
  const save = async () => {
    setBusy(true);
    try {
      const body = pickKeys(d, JOB_KEYS) as Draft & { deactivateLogin?: boolean };
      body.reportingManagerId = d.reportingManagerId || null;
      if (d.status === 'exited' && emp.hasLogin && deact) body.deactivateLogin = true;
      await employeesApi.update(emp._id, body);
      await reload(); say('ok', 'Job details saved.');
    } catch (e) { say('err', empErr(e)); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!window.confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    try { await employeesApi.remove(emp._id); navigate('/employees'); } catch (e) { say('err', empErr(e)); }
  };
  const history = [...(emp.roleHistory || [])].sort((a, b) => +new Date(b.effectiveFrom) - +new Date(a.effectiveFrom));
  return (
    <>
      <div className="emp-card">
        <h2>Job
          {canManage && <button type="button" className="emp-btn ghost sm" onClick={() => setModal(true)}>Record promotion / change</button>}
        </h2>
        <JobFields d={d} set={set} ro={ro} cfg={cfg} managers={managers} selfId={emp._id} />
        {d.status === 'exited' && (
          <div className="emp-grid c2" style={{ marginTop: 12 }}>
            <TextF id="j-exit" label="Exit date" type="date" value={d.exitDate} onChange={(v) => set({ exitDate: v })} disabled={ro} />
            <TextF id="j-reason" label="Exit reason" value={d.exitReason} onChange={(v) => set({ exitReason: v })} disabled={ro} />
          </div>
        )}
        {d.status === 'exited' && emp.hasLogin && canManage && (
          <label className="emp-row" style={{ fontSize: 13, marginTop: 10 }}>
            <input type="checkbox" checked={deact} onChange={(e) => setDeact(e.target.checked)} /> Also switch off their login
          </label>
        )}
        {canManage && <div style={{ marginTop: 14 }}><button type="button" className="emp-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save job details'}</button></div>}
      </div>
      <div className="emp-card">
        <h2>Role history</h2>
        {history.length === 0 ? <div className="emp-muted">No changes recorded yet.</div> : (
          <ul className="emp-timeline">
            {history.map((h, i) => (
              <li key={i}>
                <b>{fmtDate(h.effectiveFrom)}</b> <span className="emp-badge violet">{h.type.replace('_', ' ')}</span>
                <div>{[h.designation, h.department, h.grade && `grade ${h.grade}`].filter(Boolean).join(' · ') || '—'}</div>
                {h.note && <div className="emp-muted">{h.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {canManage && <button type="button" className="emp-link-danger" onClick={del}>Delete employee</button>}
      {modal && <ChangeModal emp={emp} cfg={cfg} managers={managers} mode="role" onClose={() => setModal(false)} onDone={reload} say={say} />}
    </>
  );
};

const PayTab: React.FC<TabProps> = ({ emp, d, set, cfg, canManage, managers, reload, say }) => {
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const hist = [...(emp.compensationHistory || [])].sort((a, b) => +new Date(b.effectiveFrom) - +new Date(a.effectiveFrom));
  const saveIds = async () => {
    setBusy(true);
    try { await employeesApi.update(emp._id, { sensitive: d.sensitive || {} }); await reload(); say('ok', 'Bank and ID details saved.'); } catch (e) { say('err', empErr(e)); } finally { setBusy(false); }
  };
  return (
    <>
      <div className="emp-card">
        <h2>Current pay
          {canManage && <button type="button" className="emp-btn ghost sm" onClick={() => setModal(true)}>Record hike / pay change</button>}
        </h2>
        <div className="emp-grid c3">
          <div className="emp-stat"><b>{emp.currentCtc != null ? inr(emp.currentCtc) : '—'}</b><span>Current CTC (annual)</span></div>
          <div className="emp-stat"><b style={{ textTransform: 'capitalize' }}>{emp.payFrequency || '—'}</b><span>Pay frequency</span></div>
        </div>
      </div>
      <div className="emp-card">
        <h2>Compensation history</h2>
        {hist.length === 0 ? <div className="emp-muted">No pay changes recorded yet.</div> : (
          <div className="emp-table-wrap">
            <table className="emp-table">
              <thead><tr><th>Effective</th><th>Type</th><th className="num">Previous</th><th className="num">New</th><th className="num">Hike</th><th>Note</th></tr></thead>
              <tbody>
                {hist.map((h, i) => (
                  <tr key={i}>
                    <td>{fmtDate(h.effectiveFrom)}</td>
                    <td><span className="emp-badge blue">{h.type}</span></td>
                    <td className="num">{inr(h.previousCtc)}</td>
                    <td className="num">{inr(h.ctc)}</td>
                    <td className={`num${h.hikePercent > 0 ? ' emp-pos' : ''}`}>{h.hikePercent > 0 ? `+${h.hikePercent}%` : `${h.hikePercent || 0}%`}</td>
                    <td>{h.note || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {emp.sensitive !== undefined && (
        <div className="emp-card">
          <h2>Bank and ID details</h2>
          <SensitiveFieldsForm value={d.sensitive || {}} onChange={(s) => set({ sensitive: s })} disabled={!canManage} />
          {canManage && <div style={{ marginTop: 12 }}><button type="button" className="emp-btn" disabled={busy} onClick={saveIds}>{busy ? 'Saving…' : 'Save bank and ID details'}</button></div>}
        </div>
      )}
      {modal && <ChangeModal emp={emp} cfg={cfg} managers={managers} mode="pay" onClose={() => setModal(false)} onDone={reload} say={say} />}
    </>
  );
};

const DocsTab: React.FC<TabProps> = ({ emp, cfg, canManage, reload, say }) => {
  const [type, setType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const open = async (fileId: string) => {
    const w = window.open('', '_blank');
    try { const url = await fileObjectUrl(fileId); if (w) w.location.href = url; } catch (e) { if (w) w.close(); say('err', empErr(e, 'Could not open the file')); }
  };
  const upload = async () => {
    if (!file) { say('err', 'Choose a file first.'); return; }
    if (!type) { say('err', 'Choose a document type.'); return; }
    setBusy(true);
    try {
      await employeesApi.uploadFile(emp._id, file, 'document', type);
      setFile(null); setType(''); if (fileRef.current) fileRef.current.value = '';
      await reload(); say('ok', 'Document uploaded.');
    } catch (e) { say('err', empErr(e)); } finally { setBusy(false); }
  };
  const remove = async (fileId: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await employeesApi.removeDocument(emp._id, fileId); await reload(); say('ok', 'Document deleted.'); } catch (e) { say('err', empErr(e)); }
  };
  const docs = emp.documents || [];
  return (
    <>
      <div className="emp-card">
        <h2>Documents</h2>
        {docs.length === 0 ? <div className="emp-muted">No documents uploaded.</div> : (
          <div className="emp-table-wrap">
            <table className="emp-table">
              <thead><tr><th>Name</th><th>Type</th><th>Uploaded</th><th /></tr></thead>
              <tbody>
                {docs.map((x) => (
                  <tr key={x.fileId}>
                    <td><button type="button" className="emp-dir-link" onClick={() => open(x.fileId)}>{x.name}</button></td>
                    <td>{x.kind}</td>
                    <td>{fmtDate(x.uploadedAt)}</td>
                    <td className="num">{canManage && <button type="button" className="emp-btn danger sm" onClick={() => remove(x.fileId, x.name)}>Delete</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {canManage && (
        <div className="emp-card">
          <h2>Upload a document</h2>
          <div className="emp-grid c3">
            <SelectF id="doc-type" label="Document type" value={type} options={cfg.documentTypes} onChange={setType} />
            <div className="emp-field">
              <label htmlFor="doc-file">File</label>
              <input id="doc-file" ref={fileRef} className="emp-input" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="emp-field" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="emp-btn" disabled={busy} onClick={upload}>{busy ? 'Uploading…' : 'Upload'}</button>
            </div>
          </div>
          <p className="emp-hint">JPG, PNG, WebP or PDF, up to 5 MB.</p>
        </div>
      )}
    </>
  );
};

const LoginTab: React.FC<TabProps> = ({ emp, canManage, reload, say }) => {
  const [busy, setBusy] = useState(false);
  const [switchOff, setSwitchOff] = useState(false);
  const [result, setResult] = useState<{ emailSent: boolean; emailError?: string; setupLink?: string } | null>(null);
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<{ _id: string; name: string; email: string; role: string }[] | null>(null);
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { say('err', empErr(e)); } finally { setBusy(false); } };
  const copy = () => { if (result?.setupLink) navigator.clipboard?.writeText(result.setupLink).then(() => say('ok', 'Link copied.')).catch(() => say('err', 'Could not copy; select the link and copy it.')); };

  if (emp.hasLogin) {
    return (
      <div className="emp-card">
        <h2>Login and access</h2>
        <p><span className="emp-badge green">Has a login</span> {emp.portalOnly && <span className="emp-badge violet">Portal only</span>}</p>
        <p className="emp-hint">{emp.portalOnly ? 'This login can only open the employee portal.' : 'This is an existing staff login. It keeps its current access and also opens the employee portal.'}</p>
        {canManage && (
          <div style={{ marginTop: 10 }}>
            {emp.portalOnly && (
              <label className="emp-row" style={{ fontSize: 13, marginBottom: 8 }}>
                <input type="checkbox" checked={switchOff} onChange={(e) => setSwitchOff(e.target.checked)} /> Also switch the account off
              </label>
            )}
            <button type="button" className="emp-btn danger" disabled={busy} onClick={() => {
              if (!window.confirm('Remove this login from the employee?')) return;
              run(async () => { await employeesApi.removeLogin(emp._id, emp.portalOnly ? switchOff : false); await reload(); say('ok', 'Login removed.'); });
            }}>Remove login</button>
          </div>
        )}
      </div>
    );
  }
  return (
    <>
      <p className="emp-hint" style={{ marginBottom: 12 }}>Portal-only logins can only open the employee portal. Linking an existing staff login keeps their current access and adds the portal.</p>
      <div className="emp-card">
        <h2>Create login</h2>
        <p className="emp-muted" style={{ fontSize: 13 }}>Uses the work email: <b>{emp.workEmail || 'not set. Add a work email on the Profile tab first.'}</b></p>
        {result && (
          result.emailSent ? <div className="emp-msg ok">Login created and an invite email was sent.</div> : (
            <div className="emp-msg err">
              The login was created but the email could not be sent{result.emailError ? ` (${result.emailError})` : ''}. Share this setup link with them yourself.
              {result.setupLink && <div className="emp-copybox" style={{ marginTop: 6 }}>{result.setupLink}</div>}
              {result.setupLink && <button type="button" className="emp-btn ghost sm" style={{ marginTop: 6 }} onClick={copy}>Copy link</button>}
            </div>
          )
        )}
        {canManage && <button type="button" className="emp-btn" disabled={busy || !emp.workEmail} onClick={() => run(async () => { const r = await employeesApi.createLogin(emp._id); setResult(r); await reload(); })}>Create login</button>}
      </div>
      {canManage && (
        <div className="emp-card">
          <h2>Link an existing login</h2>
          <div className="emp-row">
            <div className="emp-field" style={{ flex: 1, minWidth: 200 }}>
              <label htmlFor="lk-search">Search staff by name or email</label>
              <input id="lk-search" className="emp-input" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button type="button" className="emp-btn ghost" style={{ alignSelf: 'flex-end' }} disabled={busy} onClick={() => run(async () => setFound(await employeesApi.unlinkedUsers(search.trim())))}>Search</button>
          </div>
          {found && (found.length === 0 ? <div className="emp-muted" style={{ marginTop: 8 }}>No unlinked logins found.</div> : (
            <ul className="emp-pick-list">
              {found.map((u) => (
                <li key={u._id}>
                  <span><b>{u.name}</b> <span className="emp-muted">{u.email} · {u.role}</span></span>
                  <button type="button" className="emp-btn sm" disabled={busy} onClick={() => run(async () => { await employeesApi.linkUser(emp._id, u._id); await reload(); say('ok', 'Login linked.'); })}>Link</button>
                </li>
              ))}
            </ul>
          ))}
        </div>
      )}
    </>
  );
};

const NotesTab: React.FC<TabProps> = ({ emp, canManage, reload, say }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const notes = [...(emp.hrNotes || [])].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await employeesApi.addNote(emp._id, text.trim()); setText(''); await reload(); } catch (e) { say('err', empErr(e)); } finally { setBusy(false); }
  };
  return (
    <div className="emp-card">
      <h2>HR notes</h2>
      <p className="emp-hint" style={{ marginTop: 0 }}>Visible to admins only, never to the employee.</p>
      {canManage && (
        <div className="emp-field" style={{ marginBottom: 12 }}>
          <label htmlFor="note-text">Add a note</label>
          <textarea id="note-text" className="emp-textarea" value={text} onChange={(e) => setText(e.target.value)} />
          <div><button type="button" className="emp-btn" disabled={busy || !text.trim()} onClick={add}>Add note</button></div>
        </div>
      )}
      {notes.length === 0 ? <div className="emp-muted">No notes yet.</div> : (
        <ul className="emp-timeline">
          {notes.map((n, i) => (
            <li key={i}><div style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div><div className="emp-muted" style={{ fontSize: 12 }}>{n.byName} · {fmtDate(n.at)}</div></li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

const EmployeeProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = userCan(user, ['manage_employees']);
  const canSensitive = userCan(user, ['view_employee_sensitive']);
  const [cfg, setCfg] = useState<EmployeeConfig | null>(null);
  const [managers, setManagers] = useState<Pick[]>([]);
  const [emp, setEmp] = useState<Employee | null>(null);
  const [d, setD] = useState<Draft>({});
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [tab, setTab] = useState<Tab>('profile');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);

  const say = useCallback((kind: 'ok' | 'err', text: string) => { setMsg({ kind, text }); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const set = useCallback((p: Draft) => setD((x) => ({ ...x, ...p })), []);

  const reload = useCallback(async () => {
    if (!id) return;
    const e = await employeesApi.get(id);
    setEmp(e); setD(toDraft(e));
  }, [id]);

  useEffect(() => {
    let live = true;
    setLoading(true); setLoadErr('');
    Promise.all([employeesApi.config(), employeesApi.pick(), id ? employeesApi.get(id) : Promise.resolve(null)])
      .then(([c, p, e]) => { if (!live) return; setCfg(c); setManagers(p); if (e) { setEmp(e); setD(toDraft(e)); } })
      .catch((e) => { if (live) setLoadErr(empErr(e, 'Could not load this employee')); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id]);

  const photoId = emp?.photoFileId;
  useEffect(() => {
    let url = '';
    let live = true;
    setPhotoUrl('');
    if (photoId) fileObjectUrl(photoId).then((u) => { url = u; if (live) setPhotoUrl(u); else URL.revokeObjectURL(u); }).catch(() => undefined);
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [photoId]);

  if (loading) return <div className="emp-page"><div className="emp-empty">Loading…</div></div>;
  if (loadErr || !cfg) return <div className="emp-page"><div className="emp-msg err" role="alert">{loadErr || 'Could not load settings.'}</div></div>;
  if (!id) return <CreateForm cfg={cfg} managers={managers} canSensitive={canSensitive} canManage={canManage} />;
  if (!emp) return <div className="emp-page"><div className="emp-msg err">Employee not found.</div></div>;

  const changePhoto = async (f: File | undefined) => {
    if (!f) return;
    setPhotoBusy(true);
    try { await employeesApi.uploadFile(emp._id, f, 'photo'); await reload(); say('ok', 'Photo updated.'); } catch (e) { say('err', empErr(e)); } finally { setPhotoBusy(false); }
  };

  const tabs: { k: Tab; label: string; show: boolean }[] = [
    { k: 'profile', label: 'Profile', show: true },
    { k: 'job', label: 'Job & history', show: true },
    { k: 'pay', label: 'Pay & hikes', show: emp.compensationHistory !== undefined },
    { k: 'docs', label: 'Documents', show: true },
    { k: 'login', label: 'Login & access', show: true },
    { k: 'notes', label: 'Notes', show: true },
  ];
  const props: TabProps = { emp, d, set, cfg, canManage, managers, reload, say };

  return (
    <div className="emp-page">
      <div className="emp-prof-head">
        <span className="emp-avatar lg">{photoUrl ? <img src={photoUrl} alt={emp.name} /> : initials(emp.name)}</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1>{emp.name}</h1>
          <p className="emp-sub">{emp.employeeCode}{emp.designation ? ` · ${emp.designation}` : ''}{emp.department ? ` · ${emp.department}` : ''}</p>
          <span className={`emp-badge ${STATUS_TONE[emp.status]}`}>{STATUSES.find((s) => s.k === emp.status)?.label}</span>
          {canManage && (
            <div style={{ marginTop: 6 }}>
              <label htmlFor="photo-in" className="emp-muted" style={{ fontSize: 12, marginRight: 6 }}>{photoBusy ? 'Uploading…' : 'Change photo'}</label>
              <input id="photo-in" type="file" accept=".jpg,.jpeg,.png,.webp" disabled={photoBusy} onChange={(e) => changePhoto(e.target.files?.[0])} />
            </div>
          )}
        </div>
        <button type="button" className="emp-btn ghost" onClick={() => navigate('/employees')}>Back to directory</button>
      </div>
      {!canManage && <div className="emp-msg info">Read-only view. You do not have permission to edit employees.</div>}
      {msg && <div className={`emp-msg ${msg.kind}`} role={msg.kind === 'err' ? 'alert' : 'status'}>{msg.text}</div>}
      <div className="emp-tabs" role="tablist">
        {tabs.filter((t) => t.show).map((t) => (
          <button key={t.k} type="button" role="tab" aria-selected={tab === t.k} className={`emp-tab${tab === t.k ? ' on' : ''}`} onClick={() => setTab(t.k)}>{t.label}</button>
        ))}
      </div>
      {tab === 'profile' && <ProfileTab {...props} />}
      {tab === 'job' && <JobTab {...props} />}
      {tab === 'pay' && emp.compensationHistory !== undefined && <PayTab {...props} />}
      {tab === 'docs' && <DocsTab {...props} />}
      {tab === 'login' && <LoginTab {...props} />}
      {tab === 'notes' && <NotesTab {...props} />}
    </div>
  );
};

export default EmployeeProfile;
