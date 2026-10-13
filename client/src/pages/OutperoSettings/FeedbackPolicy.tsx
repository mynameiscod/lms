import React, { useEffect, useState } from 'react';
import { outperoApi, outperoErr, OutperoPolicy, LeadFilterOptions } from '../../api/outperoApi';
const outcomes = ['interested', 'callback', 'demo', 'no_answer', 'not_interested', 'wrong_number', 'opt_out', 'needs_review'];
export default function FeedbackPolicy({ stages }: { stages: LeadFilterOptions['stages'] }) {
  const [policy, setPolicy] = useState<OutperoPolicy | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<Awaited<ReturnType<typeof outperoApi.feedbackQueue>>>([]);
  useEffect(() => {
    outperoApi.policy().then(setPolicy).catch(e => setMessage(outperoErr(e)));
    const load = () => outperoApi.feedbackQueue().then(setQueue).catch(e => setMessage(outperoErr(e)));
    load(); const timer = setInterval(load, 20000); return () => clearInterval(timer);
  }, []);
  const save = async () => {
    if (!policy) return;
    setBusy(true);
    try { setPolicy(await outperoApi.savePolicy(policy)); setMessage('Feedback policy saved.'); }
    catch (e) { setMessage(outperoErr(e)); } finally { setBusy(false); }
  };
  return <section className="opo-card">
    <h2>After an AI call</h2>
    {message && <p role="status">{message}</p>}
    {policy && <>
      <label className="opo-check"><input type="checkbox" checked={policy.enabled} onChange={e => setPolicy({ ...policy, enabled: e.target.checked })} /> Hold new leads for Outpero, then update the stage and assign from the call result</label>
      <label className="opo-label" htmlFor="feedback-timing">When to assign new leads</label>
      <select id="feedback-timing" className="opo-input" value={policy.assignmentTiming} onChange={e => setPolicy({ ...policy, assignmentTiming: e.target.value as OutperoPolicy['assignmentTiming'] })}>
        <option value="on_creation">When the lead arrives</option><option value="after_call">After AI feedback (automatically sent leads)</option>
      </select>
      <p className="opo-hint">While Outpero is calling, a lead has no owner. When the result arrives (any result), it is moved to the stage you map below and given to the next person by round robin, using Lead Distribution if it is on, otherwise Lead Scoring assignment. Existing owners are retained. No available owner: the lead waits below.</p>
      <label className="opo-label" htmlFor="sent-stage">Stage while Outpero is calling</label>
      <select id="sent-stage" className="opo-input" value={policy.sentStageId || ''} onChange={e => setPolicy({ ...policy, sentStageId: e.target.value })}>
        <option value="">Keep current stage</option>{stages.map(stage => <option key={stage._id} value={stage._id}>{stage.name}</option>)}
      </select>
      <label className="opo-label" htmlFor="fallback-hours">Hours to wait for Outpero before assigning anyway</label>
      <input id="fallback-hours" className="opo-input xs" type="number" min={1} max={168} value={policy.fallbackHours ?? 24} onChange={e => setPolicy({ ...policy, fallbackHours: Number(e.target.value) })} />
      <p className="opo-hint">If Outpero cannot be reached, or never reports a result, the lead is assigned after this time and a note is added to its timeline.</p>
      <label className="opo-check"><input type="checkbox" checked={policy.callAnalysis !== false} onChange={e => setPolicy({ ...policy, callAnalysis: e.target.checked })} /> Write a full summary of each answered call from its recording</label>
      <p className="opo-hint">Outpero sends only a one-line summary and no transcript. With this on, each call where someone actually spoke is listened to (speech to text, then a short write-up of what they want, when, their concerns and the next step), which costs about ₹1 per call. The recording is also copied to our storage, because Outpero links stop working after 24 hours.</p>
      <p className="opo-hint">Calls run 9 AM to 8 PM (India time). A lead that arrives outside those hours shows as "With Outpero" at once, and can be told on WhatsApp that the team will call from 9 AM. To switch that message on, create a UTILITY template in <a href="/admin/whatsapp-templates">WhatsApp Templates</a> and assign it under Where used → "CRM — lead arrived after calling hours". With no template assigned, nothing is sent.</p>
      <label className="opo-label" htmlFor="ai-attempts">Maximum AI call attempts</label>
      <input id="ai-attempts" className="opo-input xs" type="number" min={1} max={5} value={policy.maxCallAttempts} onChange={e => setPolicy({ ...policy, maxCallAttempts: Number(e.target.value) })} />
      <label className="opo-label" htmlFor="ai-retry-gap">Minutes before retrying no answer</label>
      <input id="ai-retry-gap" className="opo-input xs" type="number" min={30} max={1440} value={policy.retryGapMinutes} onChange={e => setPolicy({ ...policy, retryGapMinutes: Number(e.target.value) })} />
      {outcomes.map(outcome => <div key={outcome}>
        <label className="opo-label" htmlFor={'stage-' + outcome}>{outcome.replace(/_/g, ' ')}</label>
        <select id={'stage-' + outcome} className="opo-input" value={policy.stageMapping[outcome] || ''} onChange={e => setPolicy({ ...policy, stageMapping: { ...policy.stageMapping, [outcome]: e.target.value } })}>
          <option value="">Keep current stage</option>{stages.map(stage => <option key={stage._id} value={stage._id}>{stage.name}</option>)}
        </select>
      </div>)}
      <p className="opo-hint">Wrong numbers and opt-outs stop further LMS-triggered AI calls. Final stages and newer human stage changes are preserved. No-answer calls retry between 9 AM and 8 PM IST, up to the attempt limit, then go to human follow-up. Use one attempt to disable automatic retries.</p>
      <div className="opo-actions"><button className="opo-btn" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save feedback policy'}</button></div>
    </>}
    <p className="opo-hint"><a href="/lead-distribution-settings">Configure lead distribution</a></p>
    <h3>Needs attention</h3>
    {queue.length ? <ul>{queue.map(lead => <li key={lead._id}><a href={'/leads/' + lead._id}>{lead.name || lead.phone}</a> - {lead.aiFeedback.state.replace(/_/g, ' ')} - {lead.aiFeedback.outcome.replace(/_/g, ' ')}</li>)}</ul> : <p className="opo-hint">No leads awaiting assignment or outcome review.</p>}
  </section>;
}
