import React, { useEffect, useState } from 'react';
import { placementAdminApi, RECOMMENDATIONS, Recommendation, errMsg } from '../../api/placementProgramApi';

/**
 * "Attended" + the scorecard, in one step. The interviewer rates each configured criterion 1–5,
 * picks a recommendation and adds notes — "attended" on its own would tell the admin nothing about
 * whether to select the candidate.
 */
const ScorecardModal: React.FC<{ bookingId: string; candidateName: string; onClose: () => void; onSaved: () => void }> = ({ bookingId, candidateName, onClose, onSaved }) => {
  const [criteria, setCriteria] = useState<string[] | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [rec, setRec] = useState<Recommendation | ''>('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { placementAdminApi.scorecardCriteria().then(setCriteria).catch(e => setErr(errMsg(e))); }, []);

  const ready = !!criteria && criteria.every(c => scores[c]) && !!rec;
  const save = async () => {
    if (!criteria || !rec) return;
    setBusy(true); setErr('');
    try {
      await placementAdminApi.outcome(bookingId, 'attended', { ratings: criteria.map(c => ({ criterion: c, score: scores[c] })), recommendation: rec, notes });
      onSaved();
    } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  return (
    <div className="ppa-drawer-wrap ppa-modal-wrap" onClick={onClose}>
      <div className="ppa-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Interview scorecard">
        <button className="ppa-x" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
        <h2>Scorecard — {candidateName}</h2>
        <p className="ppa-note">Rate 1 (weak) to 5 (excellent). Saving marks the candidate as attended.</p>
        {err && <div className="ppa-err">{err}</div>}
        {!criteria ? <p className="ppa-muted">Loading…</p> : (
          <>
            <div className="ppa-score-rows">
              {criteria.map(c => (
                <div key={c} className="ppa-score-row">
                  <span>{c}</span>
                  <div className="ppa-score-btns" role="radiogroup" aria-label={c}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" role="radio" aria-checked={scores[c] === n} className={scores[c] === n ? 'on' : ''} onClick={() => setScores({ ...scores, [c]: n })}>{n}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <h3>Recommendation</h3>
            <div className="ppa-seg ppa-rec">
              {RECOMMENDATIONS.map(([k, l]) => <button key={k} type="button" className={rec === k ? `on r-${k}` : ''} onClick={() => setRec(k)}>{l}</button>)}
            </div>
            <h3>Notes</h3>
            <textarea rows={4} value={notes} maxLength={2000} placeholder="Strengths, gaps, anything the team should know" onChange={e => setNotes(e.target.value)} style={{ width: '100%' }} />
            <div className="ppa-save-row">
              <button className="ppa-btn" disabled={!ready || busy} onClick={save}>{busy ? 'Saving…' : 'Save — attended'}</button>
              {!ready && <span className="ppa-note" style={{ margin: 0 }}>Rate every line and choose a recommendation.</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ScorecardModal;
