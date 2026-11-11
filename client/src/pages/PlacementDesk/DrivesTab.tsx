import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { placementDeskApi, Drive, Officer, DRIVE_STATUS_LABEL, JOB_TYPE_LABEL, fmtDay, fmtPkg } from '../../api/placementDeskApi';
import DriveForm from './DriveForm';

const DrivesTab: React.FC<{ officers: Officer[]; canManage: boolean }> = ({ officers, canManage }) => {
  const navigate = useNavigate();
  const [drives, setDrives] = useState<Drive[] | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState<Drive | null | 'new'>(null);
  const [err, setErr] = useState('');

  const load = () => {
    const params: Record<string, string> = {};
    if (q) params.q = q; if (status) params.status = status; if (officerId) params.officerId = officerId;
    if (from) params.from = from; if (to) params.to = to;
    placementDeskApi.drives(params).then(setDrives).catch(e => setErr(e.message));
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, status, officerId, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pd-section">
      <div className="pd-toolbar">
        <input className="pd-search" placeholder="Search company or role" value={q} onChange={e => setQ(e.target.value)} />
        <select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(DRIVE_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={officerId} onChange={e => setOfficerId(e.target.value)}><option value="">All officers</option>{officers.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}</select>
        <div className="pd-dates"><input type="date" value={from} onChange={e => setFrom(e.target.value)} /><span>to</span><input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        <div className="pd-spacer" />
        {canManage && <button className="pd-btn primary" onClick={() => setEditing('new')}><i className="fa-solid fa-plus" /> New drive</button>}
      </div>
      {err && <div className="pd-err">{err}</div>}
      <div className="pd-card">
        {!drives ? <div className="pd-empty">Loading…</div> : drives.length === 0 ? <div className="pd-empty">No drives yet. {canManage && 'Click "New drive" to record the first company.'}</div> : (
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead><tr><th>Date</th><th>Company · Role</th><th>Type</th><th>Package</th><th>Bond</th><th>Officer</th><th>Status</th><th>Put up</th><th>Attended</th><th>Offers</th></tr></thead>
              <tbody>{drives.map(d => (
                <tr key={d._id} className="pd-click" onClick={() => navigate(`/placement-desk/drives/${d._id}`)}>
                  <td data-label="Date">{fmtDay(d.day)}</td>
                  <td data-label="Company"><b>{d.companyName}</b><small>{d.role}</small></td>
                  <td data-label="Type">{JOB_TYPE_LABEL[d.jobType]}</td>
                  <td data-label="Package">{fmtPkg(d.packageMin, d.packageMax)}</td>
                  <td data-label="Bond">{d.bond?.required ? `${d.bond.months || '?'} mo` : 'No'}</td>
                  <td data-label="Officer">{d.officerName || '—'}</td>
                  <td data-label="Status"><span className={`pd-dstatus d-${d.status}`}>{DRIVE_STATUS_LABEL[d.status]}</span></td>
                  <td data-label="Put up">{d.counts?.total || 0}</td>
                  <td data-label="Attended">{d.counts?.attended || 0}</td>
                  <td data-label="Offers" className="pd-good">{d.counts?.offers || 0}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {editing && <DriveForm drive={editing === 'new' ? null : editing} officers={officers} onClose={() => setEditing(null)} onSaved={d => { setEditing(null); navigate(`/placement-desk/drives/${d._id}`); }} />}
    </div>
  );
};

export default DrivesTab;
