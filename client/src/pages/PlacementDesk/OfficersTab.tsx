import React, { useState } from 'react';
import { placementDeskApi, Officer } from '../../api/placementDeskApi';

/** Placement officers have no logins — this is just the list drives are credited to. */
const OfficersTab: React.FC<{ officers: Officer[]; canManage: boolean; onChanged: () => void }> = ({ officers, canManage, onChanged }) => {
  const [form, setForm] = useState<Partial<Officer> | null>(null);
  const [err, setErr] = useState('');
  const save = async (o: Partial<Officer>) => {
    setErr('');
    try { await placementDeskApi.saveOfficer(o); setForm(null); onChanged(); } catch (e: any) { setErr(e.message); }
  };
  return (
    <div className="pd-section">
      <div className="pd-toolbar">
        <p className="pd-hint">Officers don't need a login. Each drive records which officer brought the company, and the Dashboard shows companies and offers per officer.</p>
        <div className="pd-spacer" />
        {canManage && <button className="pd-btn primary" onClick={() => setForm({ name: '', phone: '', email: '', active: true })}><i className="fa-solid fa-plus" /> Add officer</button>}
      </div>
      {err && <div className="pd-err">{err}</div>}
      {form && (
        <div className="pd-card pd-officer-form">
          <input autoFocus placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Phone" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
          <button className="pd-btn primary" onClick={() => save(form)}>Save</button>
          <button className="pd-btn" onClick={() => setForm(null)}>Cancel</button>
        </div>
      )}
      <div className="pd-card">
        {officers.length === 0 ? <div className="pd-empty">No officers yet.</div> : (
          <table className="pd-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Status</th>{canManage && <th />}</tr></thead>
            <tbody>{officers.map(o => (
              <tr key={o._id} className={o.active ? '' : 'pd-muted'}>
                <td data-label="Name"><b>{o.name}</b></td><td data-label="Phone">{o.phone || '—'}</td><td data-label="Email">{o.email || '—'}</td>
                <td data-label="Status">{o.active ? 'Active' : 'Inactive'}</td>
                {canManage && <td className="pd-row-actions"><button className="pd-link" onClick={() => setForm(o)}>Edit</button><button className="pd-link" onClick={() => save({ ...o, active: !o.active })}>{o.active ? 'Deactivate' : 'Activate'}</button></td>}
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default OfficersTab;
