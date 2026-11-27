import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { placementDeskApi, Company, Contact, Counts, Drive, fmtDay, fmtPkg, DRIVE_STATUS_LABEL } from '../../api/placementDeskApi';

const blank = (): Partial<Company> => ({ name: '', website: '', careersUrl: '', address: '', city: '', industry: '', contacts: [], notes: '' });
const blankContact = (): Contact => ({ name: '', designation: '', phone: '', email: '' });

const CompaniesTab: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const navigate = useNavigate();
  const [list, setList] = useState<Company[] | null>(null);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<Partial<Company> | null>(null);
  const [view, setView] = useState<{ company: Company; totals: Counts; drives: Drive[] } | null>(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => placementDeskApi.companies(q || undefined).then(setList).catch(e => setErr(e.message));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!form) return;
    setSaving(true); setErr('');
    try { await placementDeskApi.saveCompany({ ...form, contacts: (form.contacts || []).filter(c => c.name.trim()) }); setForm(null); load(); }
    catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };
  const open = (c: Company) => placementDeskApi.company(c._id).then(setView).catch(e => setErr(e.message));
  const setC = (i: number, k: keyof Contact, v: string) => setForm(f => ({ ...f!, contacts: (f!.contacts || []).map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));
  const link = (u?: string) => (u ? <a href={/^https?:/i.test(u) ? u : `https://${u}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{u.replace(/^https?:\/\//, '')}</a> : '—');

  return (
    <div className="pd-section">
      <div className="pd-toolbar">
        <input className="pd-search" placeholder="Search companies" value={q} onChange={e => setQ(e.target.value)} />
        <div className="pd-spacer" />
        {canManage && <button className="pd-btn primary" onClick={() => setForm(blank())}><i className="fa-solid fa-plus" /> New company</button>}
      </div>
      {err && <div className="pd-err">{err}</div>}
      <div className="pd-card">
        {!list ? <div className="pd-empty">Loading…</div> : list.length === 0 ? <div className="pd-empty">No companies yet.</div> : (
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead><tr><th>Company</th><th>Website</th><th>City</th><th>Contact</th><th>Drives</th><th>Last drive</th>{canManage && <th />}</tr></thead>
              <tbody>{list.map(c => (
                <tr key={c._id} className="pd-click" onClick={() => open(c)}>
                  <td data-label="Company"><b>{c.name}</b><small>{c.industry || ''}</small></td>
                  <td data-label="Website">{link(c.website)}</td>
                  <td data-label="City">{c.city || '—'}</td>
                  <td data-label="Contact">{c.contacts?.[0] ? <>{c.contacts[0].name}<small>{c.contacts[0].phone || c.contacts[0].email || ''}</small></> : '—'}</td>
                  <td data-label="Drives">{c.drives || 0}</td>
                  <td data-label="Last drive">{fmtDay(c.lastDay)}</td>
                  {canManage && <td><button className="pd-link" onClick={e => { e.stopPropagation(); setForm({ ...c, contacts: c.contacts?.length ? c.contacts : [] }); }}>Edit</button></td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <div className="pd-overlay" onClick={() => setForm(null)}>
          <div className="pd-modal" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-head"><h3>{form._id ? 'Edit company' : 'New company'}</h3><button className="pd-x" onClick={() => setForm(null)}>×</button></div>
            {err && <div className="pd-err">{err}</div>}
            <div className="pd-modal-body">
              <div className="pd-grid">
                <label className="span2"><span>Company name *</span><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
                <label><span>Industry</span><input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="IT services, Product…" /></label>
                <label><span>City</span><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></label>
                <label className="span2"><span>Website</span><input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="acme.com" /></label>
                <label className="span2"><span>Careers / JD link</span><input value={form.careersUrl} onChange={e => setForm({ ...form, careersUrl: e.target.value })} /></label>
                <label className="span4"><span>Address</span><textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
              </div>
              <div className="pd-subhead">HR contacts</div>
              {(form.contacts || []).map((c, i) => (
                <div key={i} className="pd-contact-row">
                  <input placeholder="Name" value={c.name} onChange={e => setC(i, 'name', e.target.value)} />
                  <input placeholder="Designation" value={c.designation || ''} onChange={e => setC(i, 'designation', e.target.value)} />
                  <input placeholder="Phone" value={c.phone || ''} onChange={e => setC(i, 'phone', e.target.value)} />
                  <input placeholder="Email" value={c.email || ''} onChange={e => setC(i, 'email', e.target.value)} />
                  <button className="pd-x small" onClick={() => setForm({ ...form, contacts: (form.contacts || []).filter((_, j) => j !== i) })}>×</button>
                </div>
              ))}
              <button className="pd-link" onClick={() => setForm({ ...form, contacts: [...(form.contacts || []), blankContact()] })}>+ Add contact</button>
              <label className="pd-block"><span>Notes</span><textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
            </div>
            <div className="pd-modal-foot"><button className="pd-btn" onClick={() => setForm(null)} disabled={saving}>Cancel</button><button className="pd-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save company'}</button></div>
          </div>
        </div>
      )}

      {view && (
        <div className="pd-overlay" onClick={() => setView(null)}>
          <div className="pd-modal wide" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-head"><h3>{view.company.name}</h3><button className="pd-x" onClick={() => setView(null)}>×</button></div>
            <div className="pd-modal-body">
              <div className="pd-info">
                <div><span>Website</span><div>{link(view.company.website)}</div></div>
                <div><span>Careers / JD</span><div>{link(view.company.careersUrl)}</div></div>
                <div><span>Address</span><div>{view.company.address || view.company.city || '—'}</div></div>
                <div><span>Contacts</span><div>{view.company.contacts?.length ? view.company.contacts.map((c, i) => <div key={i}>{c.name}{c.designation ? ` (${c.designation})` : ''} {c.phone} {c.email}</div>) : '—'}</div></div>
              </div>
              <div className="pd-tiles small">
                {[['Drives', view.drives.length, 'blue'], ['Put up', view.totals.total, 'blue'], ['Attended', view.totals.attended, 'teal'], ['Offers', view.totals.offers, 'green'], ['Rejected', view.totals.rejected, 'red']].map(([k, v, c]) => <div key={k as string} className={`pd-tile ${c}`}><span>{k}</span><b>{v}</b></div>)}
              </div>
              {view.drives.length === 0 ? <div className="pd-empty">No drives yet.</div> : (
                <table className="pd-table">
                  <thead><tr><th>Date</th><th>Role</th><th>Package</th><th>Status</th><th>Attended</th><th>Offers</th></tr></thead>
                  <tbody>{view.drives.map(d => (
                    <tr key={d._id} className="pd-click" onClick={() => navigate(`/placement-desk/drives/${d._id}`)}>
                      <td data-label="Date">{fmtDay(d.day)}</td><td data-label="Role">{d.role}</td><td data-label="Package">{fmtPkg(d.packageMin, d.packageMax)}</td>
                      <td data-label="Status">{DRIVE_STATUS_LABEL[d.status]}</td><td data-label="Attended">{d.counts?.attended || 0}</td><td data-label="Offers" className="pd-good">{d.counts?.offers || 0}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompaniesTab;
