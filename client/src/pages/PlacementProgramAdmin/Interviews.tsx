import React, { useCallback, useEffect, useState } from 'react';
import { placementAdminApi, Booking, istTime, stageLabel, recLabel, needsMarking, errMsg } from '../../api/placementProgramApi';
import ScorecardModal from './ScorecardModal';

/**
 * Interviews — upcoming and past. "Mine" shows only the ones assigned to the logged-in interviewer,
 * which is all an interviewer without placement-admin rights can load.
 */
const PlacementInterviews: React.FC<{ onOpenCandidate?: (id: string) => void; mineOnly?: boolean }> = ({ onOpenCandidate, mineOnly }) => {
  const [range, setRange] = useState<'upcoming' | 'past'>('upcoming');
  const [mine, setMine] = useState(!!mineOnly);
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [err, setErr] = useState('');
  const [scoring, setScoring] = useState<Booking | null>(null);

  const load = useCallback(() => {
    (mine ? placementAdminApi.myBookings(range) : placementAdminApi.bookings(range))
      .then(r => { setRows(r); setErr(''); }).catch(e => setErr(errMsg(e)));
  }, [mine, range]);
  useEffect(() => { load(); }, [load]);

  const noShow = async (b: Booking) => {
    if (!window.confirm(`Mark ${b.candidateId?.name || 'this candidate'} as a no-show?`)) return;
    try { await placementAdminApi.outcome(b._id, 'no_show'); load(); } catch (e) { setErr(errMsg(e)); }
  };
  const pending = (rows || []).filter(needsMarking);
  const cancel = async (b: Booking) => {
    const reason = window.prompt('Reason for cancelling (sent to the candidate by email):', 'Interviewer unavailable');
    if (reason === null) return;
    try { await placementAdminApi.cancelBooking(b._id, reason); load(); } catch (e) { setErr(errMsg(e)); }
  };
  const started = (b: Booking) => new Date(b.startsAt).getTime() <= Date.now();

  return (
    <div>
      <div className="ppa-toolbar">
        <div className="ppa-seg">
          <button className={range === 'upcoming' ? 'on' : ''} onClick={() => setRange('upcoming')}>Upcoming</button>
          <button className={range === 'past' ? 'on' : ''} onClick={() => setRange('past')}>Past</button>
        </div>
        {!mineOnly && (
          <div className="ppa-seg">
            <button className={!mine ? 'on' : ''} onClick={() => setMine(false)}>Everyone</button>
            <button className={mine ? 'on' : ''} onClick={() => setMine(true)}>Mine</button>
          </div>
        )}
      </div>
      {err && <div className="ppa-err">{err}</div>}
      {pending.length > 0 && (
        <div className="ppa-flag"><i className="bi bi-exclamation-triangle-fill" /> {pending.length} interview{pending.length === 1 ? '' : 's'} not marked yet — record attendance and the scorecard.</div>
      )}
      <div className="ppa-table-wrap">
        <table className="ppa-table">
          <thead><tr><th>When (IST)</th><th>Candidate</th><th>Role wanted</th><th>Interviewer</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {!rows ? <tr><td colSpan={6} className="ppa-muted">Loading…</td></tr> : !rows.length ? (
              <tr><td colSpan={6} className="ppa-muted">{range === 'upcoming' ? 'No upcoming interviews.' : 'No past interviews.'}</td></tr>
            ) : rows.map(b => (
              <tr key={b._id} className={needsMarking(b) ? 'flagged' : ''} onClick={() => b.candidateId && onOpenCandidate?.(b.candidateId._id)}>
                <td><b>{istTime(b.startsAt)}</b></td>
                <td>{b.candidateId?.name || '—'}<div className="ppa-sub2">+91 {b.candidateId?.mobile}</div></td>
                <td>{b.candidateId?.targetRole || '—'}</td>
                <td>{b.interviewerId?.name || '—'}</td>
                <td><span className={`ppa-stage s-${b.status === 'booked' ? 'interview_booked' : b.status === 'attended' ? 'interview_attended' : 'interview_no_show'}`}>
                  {b.status === 'booked' ? (needsMarking(b) ? 'Needs marking' : 'Booked') : b.status === 'attended' ? 'Attended' : b.status === 'no_show' ? 'No-show' : stageLabel(b.status)}
                </span>
                {b.scorecard && <div className="ppa-sub2">{b.scorecard.average}/5 · {recLabel(b.scorecard.recommendation)}</div>}</td>
                <td onClick={e => e.stopPropagation()} className="ppa-acts">
                  <a className="ppa-btn ghost" href={b.meetingUrl} target="_blank" rel="noreferrer">Join</a>
                  {b.status === 'booked' && started(b) && <>
                    <button className="ppa-btn ghost" onClick={() => setScoring(b)}>Attended</button>
                    <button className="ppa-btn ghost" onClick={() => noShow(b)}>No-show</button>
                  </>}
                  {b.status === 'booked' && !started(b) && !mineOnly && <button className="ppa-btn ghost" onClick={() => cancel(b)}>Cancel</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {scoring && <ScorecardModal bookingId={scoring._id} candidateName={scoring.candidateId?.name || 'Candidate'} onClose={() => setScoring(null)} onSaved={() => { setScoring(null); load(); }} />}
    </div>
  );
};

export default PlacementInterviews;
