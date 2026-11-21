import React, { useCallback, useEffect, useState } from 'react';
import { leadApi, leadPipelineApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { readPendingCall, clearPendingCall, snoozePendingCall, PENDING_CALL_EVENT, LEAD_ACTIVITY_EVENT, PendingCall } from '../../utils/pendingCall';
import './callOutcomePrompt.css';

/**
 * "How did the call go?" — asked when the person comes back to the app after starting a call from it
 * (any page: lead page, follow-up queue, lead list). One tap records the outcome; the server completes
 * the "Call started" entry in place, so the call is counted once and the daily report shows Connected /
 * Not answered instead of "outcome not recorded". "I didn't call" drops it; "Later" asks again next time.
 */
const RETURN_AFTER_MS = 4000;
const FALLBACK = [
  { code: 'connected', label: 'Connected' }, { code: 'not_answered', label: 'Not answered' }, { code: 'busy', label: 'Busy' },
  { code: 'switched_off', label: 'Switched off' }, { code: 'callback_requested', label: 'Callback requested' }, { code: 'wrong_number', label: 'Wrong number' },
];

export default function CallOutcomePrompt() {
  const { user } = useAuth() as any;
  const isStaff = !!user && user.role !== 'STUDENT';
  const [pending, setPending] = useState<PendingCall | null>(null);
  const [name, setName] = useState('');
  const [outcomes, setOutcomes] = useState<{ code: string; label: string }[]>([]);
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const check = useCallback(() => {
    if (!isStaff || document.hidden) return;
    const p = readPendingCall();
    if (!p) { setPending(null); return; }
    if (Date.now() - p.at < RETURN_AFTER_MS) return;
    if (p.snoozedUntil && Date.now() < p.snoozedUntil) return;
    setPending(cur => (cur && cur.leadId === p.leadId && cur.at === p.at ? cur : p));
  }, [isStaff]);

  useEffect(() => {
    if (!isStaff) return;
    check();
    const onVis = () => check();
    const onMark = () => setTimeout(check, RETURN_AFTER_MS + 200);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    window.addEventListener(PENDING_CALL_EVENT, onMark);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
      window.removeEventListener(PENDING_CALL_EVENT, onMark);
    };
  }, [isStaff, check]);

  useEffect(() => {
    if (!pending) return;
    setOutcome(''); setNote(''); setErr('');
    setName(pending.name || '');
    if (!pending.name) leadApi.getLeadById(pending.leadId).then((r: any) => setName(r?.data?.name || r?.name || '')).catch(() => {});
    if (!outcomes.length) leadPipelineApi.getPicklist('call_outcome', true).then((r: any) => setOutcomes((r?.data || []).length ? r.data : FALLBACK)).catch(() => setOutcomes(FALLBACK));
  }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pending) return null;
  const close = () => setPending(null);
  const label = (outcomes.find(o => o.code === outcome)?.label) || outcome;
  const save = async () => {
    if (!outcome) { setErr('Choose how the call went.'); return; }
    setBusy(true); setErr('');
    try {
      await leadApi.addActivity(pending.leadId, { type: 'call', description: note.trim() || `Call: ${label}`, callOutcome: outcome });
      clearPendingCall();
      window.dispatchEvent(new CustomEvent(LEAD_ACTIVITY_EVENT, { detail: { leadId: pending.leadId } }));
      close();
    } catch (e: any) {
      setErr(e?.message || 'Could not save. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="cop-bg" role="presentation">
      <div className="cop" role="dialog" aria-modal="true" aria-labelledby="cop-title">
        <div className="cop-head">
          <span className="cop-ic"><i className="bi bi-telephone-outbound" /></span>
          <div>
            <h2 id="cop-title">How did the call go?</h2>
            <p>{name ? <b>{name}</b> : 'Your last call'} · started {new Date(pending.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="cop-outcomes" role="radiogroup" aria-label="Call outcome">
          {(outcomes.length ? outcomes : FALLBACK).map(o => (
            <button key={o.code} type="button" role="radio" aria-checked={outcome === o.code} className={`${outcome === o.code ? 'on' : ''}${o.code === 'connected' ? ' good' : ''}`} onClick={() => setOutcome(o.code)}>{o.label}</button>
          ))}
        </div>
        <label className="cop-note">
          <span>Note <em>(optional)</em></span>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={1000} placeholder="What did they say?" />
        </label>
        {err && <div className="cop-err" role="alert">{err}</div>}
        <div className="cop-actions">
          <button type="button" className="cop-link" onClick={() => { clearPendingCall(); close(); }}>I didn't call</button>
          <span className="cop-grow" />
          <button type="button" className="cop-btn" onClick={() => { snoozePendingCall(60 * 1000); close(); }}>Later</button>
          <button type="button" className="cop-btn primary" disabled={busy || !outcome} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
