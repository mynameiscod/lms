import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { placementDeskApi, History, STATUS_LABEL, fmtDay, fmtPkg } from '../../api/placementDeskApi';
import './PlacementDesk.css';

/** Admin-only "Placement History" tab on a student's profile. Students never see this. */
const StudentPlacementHistory: React.FC<{ studentId: string }> = ({ studentId }) => {
  const navigate = useNavigate();
  const [h, setH] = useState<History | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { placementDeskApi.studentHistory(studentId).then(setH).catch(e => setErr(e.message)); }, [studentId]);
  if (err) return <div className="pd-empty">{/access denied/i.test(err) ? 'You do not have access to Placement Desk records.' : err}</div>;
  if (!h) return <div className="pd-empty">Loading…</div>;
  const c = h.counts;
  return (
    <div className="pd-history">
      <p className="pd-hint"><i className="fa-solid fa-lock" /> Visible to the placement team only.</p>
      <div className="pd-tiles small">
        {[['Drives', c.total, 'blue'], ['Attended', c.attended, 'teal'], ['No-show', c.noShow, 'grey'], ['Offers', c.offers, 'green'], ['Rejected', c.rejected, 'red'], ['Pending', c.pending, 'amber']].map(([k, v, cl]) => (
          <div key={k as string} className={`pd-tile ${cl}`}><span>{k}</span><b>{v}</b></div>
        ))}
      </div>
      {h.rows.length === 0 ? <div className="pd-empty">Not put up for any company yet.</div> : (
        <div className="pd-table-wrap">
          <table className="pd-table">
            <thead><tr><th>Date</th><th>Company · Role</th><th>Package</th><th>Status</th><th>Offer</th><th>Feedback</th></tr></thead>
            <tbody>{h.rows.map(r => (
              <tr key={r._id}>
                <td data-label="Date">{fmtDay(r.day)}</td>
                <td data-label="Company"><button className="pd-link" onClick={() => navigate(`/placement-desk/drives/${r.driveId}`)}>{r.companyName}</button><small>{r.role}{r.roundReached ? ` · reached ${r.roundReached}` : ''}</small></td>
                <td data-label="Package">{fmtPkg(r.packageMin, r.packageMax)}</td>
                <td data-label="Status"><span className={`pd-status s-${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                <td data-label="Offer">{r.offerCtc ? `₹${r.offerCtc} LPA` : '—'}</td>
                <td data-label="Feedback" className="pd-fb-cell">{r.companyFeedback && <span>{r.companyFeedback}</span>}{r.internalRemarks && <small><i className="fa-solid fa-lock" /> {r.internalRemarks}</small>}{!r.companyFeedback && !r.internalRemarks && <span className="pd-dim">—</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentPlacementHistory;
