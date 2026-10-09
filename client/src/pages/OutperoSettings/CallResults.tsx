import React, { useEffect, useState } from 'react';
import { outperoApi, outperoErr, OutperoCalls } from '../../api/outperoApi';

/**
 * "Call results" — Outpero posts every finished call here (Outcomes → Post-Call Webhooks →
 * Add Webhook). Shows the address to paste, what arrived, which lead each call matched and what
 * was done with it, and the last raw delivery (to confirm Outpero's field names).
 */

const ACTION_LABEL: Record<string, string> = {
  logged: 'Logged on lead', summary: 'Summary added', demo: 'Demo follow-up', callback: 'Callback follow-up',
  not_interested: 'Not-interested reason', whatsapp_consent: 'WhatsApp consent', details: 'Details filled',
};

const CallResults: React.FC = () => {
  const [url, setUrl] = useState('');
  const [calls, setCalls] = useState<OutperoCalls | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const load = () => outperoApi.calls().then(setCalls).catch(() => {});
  useEffect(() => {
    outperoApi.webhook().then((w) => setUrl(w.url)).catch((e) => setMsg(outperoErr(e)));
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy the webhook address:', url); }
  };
  const rotate = async () => {
    if (!window.confirm('Make a new address? The old one stops working — paste the new one into Outpero straight away.')) return;
    try { const w = await outperoApi.rotateWebhook(); setUrl(w.url); setMsg('New address made. Update it in Outpero now.'); }
    catch (e) { setMsg(outperoErr(e)); }
  };
  const showRaw = async () => {
    if (raw !== null) { setRaw(null); return; }
    try { const r = await outperoApi.latestRaw(); setRaw(r?.delivery ? JSON.stringify(r.delivery.body, null, 2) : 'Nothing received yet.'); }
    catch (e) { setMsg(outperoErr(e)); }
  };

  return (
    <section className="opo-card">
      <h2>Call results from Outpero</h2>
      <p className="opo-hint">
        In Outpero open the AI employee → <b>Outcomes</b> → <b>Post-Call Webhooks</b> → <b>Add Webhook</b>, paste this address and save.
        Every finished call then lands on its lead here: call log, recording, transcript, summary, captured answers, and follow-ups for demos and callbacks.
      </p>
      <div className="opo-test" style={{ marginTop: 6 }}>
        <input className="opo-input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Webhook address" />
        <button className="opo-btn" onClick={copy} disabled={!url}>{copied ? 'Copied' : 'Copy'}</button>
        <button className="opo-btn ghost" onClick={rotate} disabled={!url}>Rotate</button>
      </div>
      <p className="opo-warn">Keep this address private — anyone with it could post fake call results.</p>
      {msg && <p className="opo-hint" role="status">{msg}</p>}

      {calls && (
        <>
          <div className="opo-stats" style={{ marginTop: 12 }}>
            <div><b>{calls.total}</b><span>calls received</span></div>
            <div className={calls.unmatched ? 'bad' : ''}><b>{calls.unmatched}</b><span>not matched to a lead</span></div>
          </div>
          {calls.rows.length > 0 ? (
            <ul className="opo-fails" style={{ listStyle: 'none', paddingLeft: 0 }}>
              {calls.rows.map((c) => (
                <li key={c.callId} style={{ padding: '6px 0', borderBottom: '1px solid #eef1f6' }}>
                  {c.lead ? <a href={`/leads/${c.lead._id}`}>{c.lead.name || c.lead.phone}</a> : <span>Not matched{c.phone ? ` (${c.phone})` : ''}</span>}
                  {' · '}{new Date(c.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  {c.durationSec ? ` · ${Math.floor(c.durationSec / 60)}m ${c.durationSec % 60}s` : ''}
                  {c.outcome ? ` · ${c.outcome}` : c.status ? ` · ${c.status}` : ''}
                  {c.actions.length > 0 && <span style={{ color: '#15803d' }}> · {c.actions.map((a) => ACTION_LABEL[a] || a).join(', ')}</span>}
                </li>
              ))}
            </ul>
          ) : <p className="opo-hint">No calls received yet. After adding the webhook, use Outpero's test or make a test call.</p>}
          <div className="opo-actions">
            <button className="opo-btn ghost" onClick={showRaw}>{raw !== null ? 'Hide last delivery' : 'Show last delivery (raw)'}</button>
          </div>
          {raw !== null && <pre style={{ maxHeight: 320, overflow: 'auto', background: '#0f172a', color: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 12 }}>{raw}</pre>}
        </>
      )}
    </section>
  );
};

export default CallResults;
