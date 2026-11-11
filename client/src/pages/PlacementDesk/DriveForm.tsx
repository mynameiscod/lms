import React, { useEffect, useState } from 'react';
import { batchApi } from '../../api';
import {
  placementDeskApi, Company, Drive, Officer, JOB_TYPE_LABEL, MODE_LABEL, DRIVE_STATUS_LABEL, istToday,
} from '../../api/placementDeskApi';

/** Create / edit one drive: company, date, role, package, bond, conditions, eligibility, officer, contact. */
const blank = (): any => ({
  companyId: '', day: istToday(), role: '', openings: '', jobType: 'full_time', mode: 'on_campus', location: '',
  packageMin: '', packageMax: '', salaryNotes: '', bond: { required: false, months: '', amount: '', notes: '' }, conditions: '',
  eligibility: { passoutYears: '', degrees: '', minPercent: '', skills: '', batchIds: [] as string[], notes: '' },
  officerId: '', companyContact: { name: '', designation: '', phone: '', email: '' }, rounds: '', status: 'upcoming', notes: '',
});
const fromDrive = (d: Drive): any => ({
  ...blank(), ...d,
  openings: d.openings ?? '', packageMin: d.packageMin ?? '', packageMax: d.packageMax ?? '',
  bond: { required: !!d.bond?.required, months: d.bond?.months ?? '', amount: d.bond?.amount ?? '', notes: d.bond?.notes || '' },
  eligibility: {
    passoutYears: (d.eligibility?.passoutYears || []).join(', '), degrees: (d.eligibility?.degrees || []).join(', '),
    minPercent: d.eligibility?.minPercent ?? '', skills: (d.eligibility?.skills || []).join(', '),
    batchIds: (d.eligibility?.batchIds || []).map(String), notes: d.eligibility?.notes || '',
  },
  officerId: d.officerId || '', companyContact: { name: '', designation: '', phone: '', email: '', ...(d.companyContact || {}) },
  rounds: (d.rounds || []).join(', '),
});

const DriveForm: React.FC<{ drive?: Drive | null; officers: Officer[]; onClose: () => void; onSaved: (d: Drive) => void }> = ({ drive, officers, onClose, onSaved }) => {
  const [f, setF] = useState<any>(drive ? fromDrive(drive) : blank());
  const [companies, setCompanies] = useState<Company[]>([]);
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [newCo, setNewCo] = useState<{ name: string; website: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    placementDeskApi.companies().then(setCompanies).catch(() => setCompanies([]));
    batchApi.getBatches().then((r: any) => setBatches((r.data || []).filter((b: any) => b.isActive !== false))).catch(() => setBatches([]));
  }, []);

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const setIn = (g: string, k: string, v: any) => setF((p: any) => ({ ...p, [g]: { ...p[g], [k]: v } }));

  // Picking a company pre-fills the contact from its saved contacts when none is entered.
  const pickCompany = (id: string) => {
    const c = companies.find(x => x._id === id);
    setF((p: any) => ({ ...p, companyId: id, companyContact: p.companyContact?.name || !c?.contacts?.[0] ? p.companyContact : { designation: '', phone: '', email: '', ...c.contacts[0] }, location: p.location || c?.city || '' }));
  };

  const addCompany = async () => {
    if (!newCo?.name.trim()) return;
    try {
      const c = await placementDeskApi.saveCompany({ name: newCo.name.trim(), website: newCo.website.trim(), contacts: [] });
      setCompanies(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
      set('companyId', c._id); setNewCo(null);
    } catch (e: any) { setErr(e.message); }
  };

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const body = { ...f, rounds: String(f.rounds || '').split(',').map((s: string) => s.trim()).filter(Boolean), officerId: f.officerId || undefined };
      onSaved(await placementDeskApi.saveDrive(body));
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const toggleBatch = (id: string) => setIn('eligibility', 'batchIds', f.eligibility.batchIds.includes(id) ? f.eligibility.batchIds.filter((x: string) => x !== id) : [...f.eligibility.batchIds, id]);

  return (
    <div className="pd-overlay" onClick={onClose}>
      <div className="pd-modal wide" onClick={e => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>{drive ? 'Edit drive' : 'New drive'}</h3><button className="pd-x" onClick={onClose}>×</button></div>
        {err && <div className="pd-err">{err}</div>}
        <div className="pd-modal-body">
          <fieldset><legend>Company & date</legend>
            <div className="pd-grid">
              <label className="span2"><span>Company *</span>
                {newCo ? (
                  <div className="pd-inline">
                    <input autoFocus placeholder="Company name" value={newCo.name} onChange={e => setNewCo({ ...newCo, name: e.target.value })} />
                    <input placeholder="Website" value={newCo.website} onChange={e => setNewCo({ ...newCo, website: e.target.value })} />
                    <button className="pd-btn primary" onClick={addCompany}>Add</button><button className="pd-btn" onClick={() => setNewCo(null)}>Cancel</button>
                  </div>
                ) : (
                  <div className="pd-inline">
                    <select value={f.companyId} onChange={e => pickCompany(e.target.value)}>
                      <option value="">Select company</option>
                      {companies.map(c => <option key={c._id} value={c._id}>{c.name}{c.city ? ` — ${c.city}` : ''}</option>)}
                    </select>
                    <button className="pd-btn" onClick={() => setNewCo({ name: '', website: '' })}>+ New company</button>
                  </div>
                )}
              </label>
              <label><span>Drive date *</span><input type="date" value={f.day} onChange={e => set('day', e.target.value)} /></label>
              <label><span>Status</span><select value={f.status} onChange={e => set('status', e.target.value)}>{Object.entries(DRIVE_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            </div>
          </fieldset>

          <fieldset><legend>Role & package</legend>
            <div className="pd-grid">
              <label className="span2"><span>Role *</span><input value={f.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Java Developer" /></label>
              <label><span>Job type</span><select value={f.jobType} onChange={e => set('jobType', e.target.value)}>{Object.entries(JOB_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label><span>Openings</span><input type="number" min={0} value={f.openings} onChange={e => set('openings', e.target.value)} /></label>
              <label><span>Minimum package (LPA)</span><input type="number" min={0} step="0.1" value={f.packageMin} onChange={e => set('packageMin', e.target.value)} /></label>
              <label><span>Maximum package (LPA)</span><input type="number" min={0} step="0.1" value={f.packageMax} onChange={e => set('packageMax', e.target.value)} /></label>
              <label><span>Mode</span><select value={f.mode} onChange={e => set('mode', e.target.value)}>{Object.entries(MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label><span>Job location</span><input value={f.location} onChange={e => set('location', e.target.value)} /></label>
              <label className="span4"><span>Salary details</span><input value={f.salaryNotes} onChange={e => set('salaryNotes', e.target.value)} placeholder="e.g. ₹15k stipend for 6 months, then 3.6 LPA" /></label>
            </div>
          </fieldset>

          <fieldset><legend>Bond & conditions</legend>
            <div className="pd-grid">
              <label className="pd-check"><input type="checkbox" checked={f.bond.required} onChange={e => setIn('bond', 'required', e.target.checked)} /><span>Bond required</span></label>
              {f.bond.required && <>
                <label><span>Bond period (months)</span><input type="number" min={0} value={f.bond.months} onChange={e => setIn('bond', 'months', e.target.value)} /></label>
                <label><span>Bond amount (₹)</span><input type="number" min={0} value={f.bond.amount} onChange={e => setIn('bond', 'amount', e.target.value)} /></label>
                <label><span>Bond notes</span><input value={f.bond.notes} onChange={e => setIn('bond', 'notes', e.target.value)} placeholder="e.g. original certificates held" /></label>
              </>}
              <label className="span4"><span>Conditions</span><textarea rows={2} value={f.conditions} onChange={e => set('conditions', e.target.value)} placeholder="Shifts, relocation, notice period, documents…" /></label>
            </div>
          </fieldset>

          <fieldset><legend>Who is eligible</legend>
            <div className="pd-grid">
              <label><span>Passout years</span><input value={f.eligibility.passoutYears} onChange={e => setIn('eligibility', 'passoutYears', e.target.value)} placeholder="2024, 2025" /></label>
              <label><span>Degrees</span><input value={f.eligibility.degrees} onChange={e => setIn('eligibility', 'degrees', e.target.value)} placeholder="B.Tech, MCA" /></label>
              <label><span>Minimum %</span><input type="number" min={0} max={100} value={f.eligibility.minPercent} onChange={e => setIn('eligibility', 'minPercent', e.target.value)} /></label>
              <label><span>Skills</span><input value={f.eligibility.skills} onChange={e => setIn('eligibility', 'skills', e.target.value)} placeholder="Java, SQL" /></label>
              <div className="span4 pd-chips-field"><span>Batches (optional)</span>
                <div className="pd-chips">{batches.map(b => <button type="button" key={b._id} className={`pd-chip ${f.eligibility.batchIds.includes(b._id) ? 'on' : ''}`} onClick={() => toggleBatch(b._id)}>{b.name}</button>)}</div>
              </div>
              <label className="span4"><span>Other eligibility notes</span><input value={f.eligibility.notes} onChange={e => setIn('eligibility', 'notes', e.target.value)} placeholder="e.g. no active backlogs, good communication" /></label>
            </div>
          </fieldset>

          <fieldset><legend>Who brought it</legend>
            <div className="pd-grid">
              <label><span>Placement officer</span><select value={f.officerId} onChange={e => set('officerId', e.target.value)}><option value="">Not set</option>{officers.filter(o => o.active || o._id === f.officerId).map(o => <option key={o._id} value={o._id}>{o.name}</option>)}</select></label>
              <label><span>Company contact</span><input value={f.companyContact.name} onChange={e => setIn('companyContact', 'name', e.target.value)} placeholder="Name" /></label>
              <label><span>Designation</span><input value={f.companyContact.designation} onChange={e => setIn('companyContact', 'designation', e.target.value)} /></label>
              <label><span>Phone</span><input value={f.companyContact.phone} onChange={e => setIn('companyContact', 'phone', e.target.value)} /></label>
              <label className="span2"><span>Email</span><input value={f.companyContact.email} onChange={e => setIn('companyContact', 'email', e.target.value)} /></label>
              <label className="span2"><span>Rounds</span><input value={f.rounds} onChange={e => set('rounds', e.target.value)} placeholder="Aptitude, Technical, HR" /></label>
              <label className="span4"><span>Notes</span><textarea rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} /></label>
            </div>
          </fieldset>
          {officers.length === 0 && <p className="pd-hint">Add your placement officers on the Placement Officers tab to record who brought each company.</p>}
        </div>
        <div className="pd-modal-foot"><button className="pd-btn" onClick={onClose} disabled={saving}>Cancel</button><button className="pd-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save drive'}</button></div>
      </div>
    </div>
  );
};

export default DriveForm;
