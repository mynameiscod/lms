import React, { useEffect, useRef, useState } from 'react';
import { leadAiCallsApi, LeadAiCall } from '../../api/leadAiCallsApi';
import './leadAiCalls.css';

/**
 * The AI calls made to this lead: what was said (a full write-up from the recording when there
 * is one, Outpero's own line otherwise), the answers captured, the transcript, and the recording
 * itself. Renders nothing for a lead that has had no AI call.
 */

const OUTCOME: Record<string, { label: string; cls: string }> = {
  interested: { label: 'Interested', cls: 'good' }, qualified: { label: 'Qualified', cls: 'good' }, callback: { label: 'Callback', cls: 'info' },
  demo: { label: 'Demo', cls: 'good' }, 'not-interested': { label: 'Not interested', cls: 'bad' }, not_interested: { label: 'Not interested', cls: 'bad' },
  missed: { label: 'Missed', cls: 'muted' }, voicemail: { label: 'Voicemail', cls: 'muted' }, no_answer: { label: 'No answer', cls: 'muted' },
};
const INTENT: Record<string, { label: string; cls: string }> = { high: { label: 'High interest', cls: 'good' }, medium: { label: 'Some interest', cls: 'info' }, low: { label: 'Low interest', cls: 'muted' }, none: { label: 'No interest shown', cls: 'muted' } };

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '');
const mmss = (s?: number) => (typeof s === 'number' ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '');
const label = (k: string) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const Recording: React.FC<{ leadId: string; call: LeadAiCall }> = ({ leadId, call }) => {
  const [src, setSrc] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'gone' | 'error'>('idle');
  const url = useRef('');
  useEffect(() => () => { if (url.current) URL.revokeObjectURL(url.current); }, []);

  if (call.recording === 'none') return null;
  if (call.recording === 'expired') return <p className="lac-muted">The recording is no longer available. Outpero links stop working after 24 hours and no copy was saved.</p>;
  if (src) return <audio className="lac-audio" controls autoPlay src={src} />;
  const load = async () => {
    setState('loading');
    try { url.current = await leadAiCallsApi.recording(leadId, call.callId); setSrc(url.current); }
    catch (e: unknown) { setState((e as { response?: { status?: number } })?.response?.status === 410 ? 'gone' : 'error'); }
  };
  return (
    <div>
      <button type="button" className="lac-btn" onClick={load} disabled={state === 'loading'}>{state === 'loading' ? 'Loading…' : '▶ Play recording'}</button>
      {state === 'gone' && <span className="lac-muted"> The recording is no longer available.</span>}
      {state === 'error' && <span className="lac-muted"> Could not load the recording. Try again.</span>}
      {call.recording === 'link' && state === 'idle' && <span className="lac-muted"> Outpero copy, available for a limited time.</span>}
    </div>
  );
};

const CallCard: React.FC<{ leadId: string; call: LeadAiCall }> = ({ leadId, call }) => {
  const [showText, setShowText] = useState(false);
  const o = OUTCOME[String(call.outcome || '').toLowerCase()];
  const a = call.analysis;
  const intent = a && INTENT[a.intent];
  return (
    <div className="lac-call">
      <div className="lac-head">
        <b>{when(call.at)}</b>
        {call.durationSec !== undefined && <span className="lac-muted">{mmss(call.durationSec)}</span>}
        {o ? <span className={`lac-badge ${o.cls}`}>{o.label}</span> : call.outcome ? <span className="lac-badge muted">{call.outcome}</span> : null}
        {intent && a.intent !== 'none' && <span className={`lac-badge ${intent.cls}`}>{intent.label}</span>}
      </div>
      <p className="lac-summary">{a?.summary || call.summary || 'No summary was sent for this call.'}</p>
      {a && (
        <ul className="lac-facts">
          {a.course && <li><b>Course</b> {a.course}</li>}
          {a.background && <li><b>Background</b> {a.background}</li>}
          {a.timing && <li><b>Timing</b> {a.timing}</li>}
          {a.budget && <li><b>Fees / money</b> {a.budget}</li>}
          {a.callbackWhen && <li><b>Call back</b> {a.callbackWhen}</li>}
          {a.language && <li><b>Language</b> {a.language}</li>}
          {a.objections.length > 0 && <li><b>Concerns</b> {a.objections.join('; ')}</li>}
          {a.nextStep && <li className="lac-next"><b>Next step</b> {a.nextStep}</li>}
        </ul>
      )}
      {call.captured && (
        <ul className="lac-facts">
          {Object.entries(call.captured).map(([k, v]) => <li key={k}><b>{label(k)}</b> {String(v)}</li>)}
        </ul>
      )}
      <Recording leadId={leadId} call={call} />
      {call.transcript && (
        <div>
          <button type="button" className="lac-link" onClick={() => setShowText((x) => !x)}>{showText ? 'Hide transcript' : 'Show transcript'}</button>
          {showText && <pre className="lac-transcript">{call.transcript}</pre>}
        </div>
      )}
    </div>
  );
};

const LeadAiCalls: React.FC<{ leadId: string }> = ({ leadId }) => {
  const [calls, setCalls] = useState<LeadAiCall[] | null>(null);
  useEffect(() => {
    let live = true;
    leadAiCallsApi.list(leadId).then((r) => { if (live) setCalls(r); }).catch(() => { if (live) setCalls([]); });
    return () => { live = false; };
  }, [leadId]);
  if (!calls || calls.length === 0) return null;
  return (
    <section className="lac-card">
      <h3>AI calls <span className="lac-count">{calls.length}</span></h3>
      {calls.map((c) => <CallCard key={c.callId} leadId={leadId} call={c} />)}
    </section>
  );
};

export default LeadAiCalls;
