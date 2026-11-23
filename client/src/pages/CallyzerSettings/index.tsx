import React, { useCallback, useEffect, useState } from 'react';
import {
  callyzerApi, callyzerErr, CallyzerConfig, CallyzerEnv, CallyzerSyncStatus, CallyzerDelivery,
  CallyzerEmployee, CallyzerStaff, CallyzerCallRow,
} from '../../api/callyzerApi';
import '../OutperoSettings/outperoSettings.css';
import './callyzerSettings.css';

/**
 * Leads → Callyzer calls. Callyzer is the app on each counsellor's phone: it reads the call log and
 * uploads the phone's call recordings. Connected here, every call to or from a lead lands on that
 * lead with its talk time, outcome and recording. Calls to other numbers are ignored.
 */

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
const talk = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);
const DIR: Record<CallyzerCallRow['direction'], string> = { outgoing: 'Outgoing', incoming: 'Incoming', missed: 'Missed' };
const REC: Record<CallyzerCallRow['recording'], string> = { saved: 'Recording saved', callyzer: 'Recording (on Callyzer)', waiting: 'Recording not arrived yet', none: 'No recording' };

const CallyzerSettings: React.FC = () => {
  const [cfg, setCfg] = useState<CallyzerConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [webhook, setWebhook] = useState('');
  const [sync, setSync] = useState<CallyzerSyncStatus | null>(null);
  const [delivery, setDelivery] = useState<CallyzerDelivery | null>(null);
  const [emps, setEmps] = useState<{ employees: CallyzerEmployee[]; staff: CallyzerStaff[] } | null>(null);
  const [calls, setCalls] = useState<{ total: number; withRecording: number; rows: CallyzerCallRow[] } | null>(null);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const say = (kind: 'ok' | 'err', text: string) => { setMsg({ kind, text }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const loadStatus = useCallback(() => callyzerApi.config().then((r) => { setSync(r.lastSync); setDelivery(r.lastDelivery); }).catch(() => {}), []);
  const loadCalls = useCallback(() => callyzerApi.calls().then(setCalls).catch(() => {}), []);

  useEffect(() => {
    callyzerApi.config().then((r) => { setCfg(r.config); setWebhook(r.webhook.url); setSync(r.lastSync); setDelivery(r.lastDelivery); })
      .catch((e) => say('err', callyzerErr(e)));
    loadCalls();
    const t = setInterval(() => { loadStatus(); loadCalls(); }, 20_000);
    return () => clearInterval(t);
  }, [loadStatus, loadCalls]);

  if (!cfg) return <div className="opo"><p className="opo-muted">{msg?.text || 'Loading…'}</p></div>;

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e) { say('err', callyzerErr(e)); }
    setBusy('');
  };

  const save = () => run('save', async () => {
    const next = await callyzerApi.save({ enabled: cfg.enabled, env: cfg.env, keepRecordings: cfg.keepRecordings, ...(apiKey ? { apiKey } : {}) });
    setCfg(next); setApiKey('');
    say('ok', next.enabled ? 'Saved. Calls from counsellors\' phones now land on their leads.' : 'Saved. The integration is switched off: nothing is received or fetched.');
  });
  const test = () => run('test', async () => {
    const r = await callyzerApi.test();
    say('ok', `Connected to Callyzer (${r.env === 'production' ? 'Production' : 'Sandbox'}). ${r.employees} phone${r.employees === 1 ? '' : 's'} registered.`);
  });
  const copy = async () => {
    try { await navigator.clipboard.writeText(webhook); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy the webhook address:', webhook); }
  };
  const rotate = () => {
    if (!window.confirm('Make a new address? The old one stops working, so paste the new one into Callyzer straight away.')) return;
    run('rotate', async () => { const w = await callyzerApi.rotateWebhook(); setWebhook(w.url); say('ok', 'New address made. Update it in Callyzer now.'); });
  };
  const loadEmps = () => run('emps', async () => setEmps(await callyzerApi.employees()));
  const map = (e: CallyzerEmployee, staffId: string) => run('map', async () => {
    await callyzerApi.mapEmployee(e.empNumber, staffId || null);
    setEmps(await callyzerApi.employees());
  });
  const syncNow = () => run('sync', async () => {
    const r: any = await callyzerApi.sync();
    say(r.ok === false ? 'err' : 'ok', r.message || 'Sync finished.');
    loadStatus(); loadCalls();
  });
  const backfill = () => run('backfill', async () => {
    await callyzerApi.sync(days);
    say('ok', `Fetching the last ${days} day${days > 1 ? 's' : ''} in the background. The result shows under "Sync" in a minute or two.`);
    loadStatus();
  });

  const unmatched = emps?.employees.filter((e) => !e.staffId).length || 0;

  return (
    <div className="opo">
      <div className="opo-head">
        <h1><i className="fa-solid fa-mobile-screen-button" /> Callyzer calls</h1>
        <p>Counsellors call from their own phones. Callyzer (the app on each phone) sends every call with a lead here, with its talk time and recording.</p>
      </div>
      {msg && <div className={`opo-msg ${msg.kind}`} role="status">{msg.text}</div>}

      <section className="opo-card">
        <h2>1. Connect <span className={`opo-pill ${cfg.enabled && cfg.apiKeySet ? 'ok' : 'warn'}`}>{cfg.enabled && cfg.apiKeySet ? 'On' : 'Off'}</span></h2>
        <p className="opo-hint">In Callyzer go to <b>Connectors → API &amp; Webhook → API Config → Generate API Access Key</b> and paste the key here.</p>

        <label className="opo-label">Which Callyzer account</label>
        <div className="opo-modes cz-env" role="radiogroup">
          {(['sandbox', 'production'] as CallyzerEnv[]).map((env) => (
            <label key={env} className={`opo-mode${cfg.env === env ? ' on' : ''}`}>
              <input type="radio" name="cz-env" checked={cfg.env === env} onChange={() => setCfg({ ...cfg, env })} />
              <b>{env === 'sandbox' ? 'Sandbox (free trial)' : 'Production'}</b>
              <span>{env === 'sandbox'
                ? 'Real calls, but only inside the 15 days you locked in Callyzer.'
                : 'After buying the API add-on. Use the production API key.'}</span>
            </label>
          ))}
        </div>

        <label className="opo-label" htmlFor="cz-key">API access key</label>
        <input id="cz-key" className="opo-input" type="password" autoComplete="off" placeholder={cfg.apiKeySet ? 'Saved. Leave blank to keep it' : 'Paste the API access key'} value={apiKey} onChange={(e) => setApiKey(e.target.value.trim())} />

        <label className="opo-check">
          <input type="checkbox" checked={cfg.keepRecordings} onChange={(e) => setCfg({ ...cfg, keepRecordings: e.target.checked })} />
          Keep our own copy of each recording (so it still plays if it is removed from Callyzer)
        </label>
        {cfg.keepRecordings && !cfg.storageReady && <p className="opo-warn">File storage is not set up, so recordings play from Callyzer instead of being copied.</p>}

        <label className="opo-check">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
          <b>Switch on</b>: receive calls from the webhook and fetch them every 10 minutes
        </label>

        <div className="opo-actions">
          <button className="opo-btn" onClick={save} disabled={busy === 'save'}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
          <button className="opo-btn ghost" onClick={test} disabled={!cfg.apiKeySet || busy === 'test'}>{busy === 'test' ? 'Testing…' : 'Test connection'}</button>
        </div>
      </section>

      <section className="opo-card">
        <h2>2. Webhook in Callyzer <span className={`opo-pill ${delivery ? 'ok' : 'warn'}`}>{delivery ? `Last delivery ${when(delivery.at)}` : 'Nothing received yet'}</span></h2>
        <p className="opo-hint">
          In Callyzer go to <b>Connectors → API &amp; Webhook → Webhook Config → Webhook</b>. Paste this address as the <b>Webhook URL</b>,
          choose the latest <b>Version</b>, set <b>Skip Exclude Numbers</b> to <b>No</b>, add your email under <b>Alert Email</b>,
          press <b>Test Webhook</b>, then <b>Create Webhook</b>. The <b>Secret</b> can stay empty: this address already contains our own secret.
        </p>
        <div className="opo-test">
          <input className="opo-input" readOnly value={webhook} onFocus={(e) => e.currentTarget.select()} aria-label="Webhook address" />
          <button className="opo-btn" onClick={copy} disabled={!webhook}>{copied ? 'Copied' : 'Copy'}</button>
          <button className="opo-btn ghost" onClick={rotate} disabled={!webhook || busy === 'rotate'}>New address</button>
        </div>
        <p className="opo-warn">Keep this address private. Anyone with it could post fake calls.</p>
        {delivery && (
          <p className="opo-hint">
            Last delivery: {delivery.calls} call{delivery.calls === 1 ? '' : 's'} from {delivery.employees} phone{delivery.employees === 1 ? '' : 's'}, {delivery.matched} with leads.
            {!cfg.enabled && ' The integration is switched off, so they were not stored.'}
          </p>
        )}
      </section>

      <section className="opo-card">
        <h2>3. Counsellor phones {emps && <span className={`opo-pill ${unmatched ? 'warn' : 'ok'}`}>{unmatched ? `${unmatched} not matched` : 'All matched'}</span>}</h2>
        <p className="opo-hint">
          Each phone in Callyzer is matched to a staff member by the mobile number on their profile. Pick someone where the match is missing or wrong.
          Calls from an unmatched phone still land on the lead, under the lead's owner.
        </p>
        {!emps ? (
          <button className="opo-btn ghost" onClick={loadEmps} disabled={!cfg.apiKeySet || busy === 'emps'}>{busy === 'emps' ? 'Loading…' : 'Load phones from Callyzer'}</button>
        ) : emps.employees.length === 0 ? (
          <p className="opo-hint">No phones registered in Callyzer yet. Install the Callyzer Biz app on each counsellor's phone and log in.</p>
        ) : (
          <div className="cz-table-wrap">
            <table className="cz-table">
              <thead><tr><th>Phone in Callyzer</th><th>Recording</th><th>Last synced</th><th>Staff member</th></tr></thead>
              <tbody>
                {emps.employees.map((e) => (
                  <tr key={e.empNumber}>
                    <td data-label="Phone"><b>{e.empName || 'No name'}</b><div className="opo-muted">{e.empNumber}{e.appUninstalled ? ' · app uninstalled' : ''}</div></td>
                    <td data-label="Recording">{e.recordingOn ? <span className="opo-pill ok">On</span> : <span className="opo-pill warn">Off in Callyzer</span>}</td>
                    <td data-label="Last synced">{e.lastSyncAt ? e.lastSyncAt.replace(/:\d{2}( [A-Z]+)?$/, '') : '—'}</td>
                    <td data-label="Staff member">
                      <select className="opo-input sm" value={e.staffId || ''} onChange={(ev) => map(e, ev.target.value)} disabled={busy === 'map'} aria-label={`Staff member for ${e.empNumber}`}>
                        <option value="">Not matched</option>
                        {emps.staff.map((s) => <option key={s._id} value={s._id}>{s.name}{s.phone ? ` (${s.phone})` : ''}</option>)}
                      </select>
                      {e.matchedBy === 'profile' && <div className="opo-muted">Matched by profile number</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="opo-card">
        <h2>4. Sync {sync && <span className={`opo-pill ${sync.ok ? 'ok' : 'warn'}`}>{sync.running ? 'Running…' : sync.ok ? 'OK' : 'Failed'}</span>}</h2>
        <p className="opo-hint">Every 10 minutes the CRM asks Callyzer for new calls and for recordings that arrived late. Calls with numbers that are not leads are ignored and never stored.</p>
        {sync && <p className={sync.ok ? 'opo-hint' : 'opo-warn'}>{when(sync.at)}: {sync.message}</p>}
        <div className="opo-test">
          <button className="opo-btn" onClick={syncNow} disabled={!cfg.enabled || busy === 'sync'}>{busy === 'sync' ? 'Syncing…' : 'Sync now'}</button>
          <span className="opo-hint">or fetch the last</span>
          <input className="opo-input xs" type="number" min={1} max={30} value={days} onChange={(e) => setDays(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} aria-label="Days" />
          <span className="opo-hint">days</span>
          <button className="opo-btn ghost" onClick={backfill} disabled={!cfg.enabled || busy === 'backfill'}>Fetch</button>
        </div>
        {cfg.env === 'sandbox' && <p className="opo-muted">Sandbox only returns calls inside the 15 days you locked in Callyzer.</p>}
      </section>

      <section className="opo-card">
        <h2>Recent calls with leads</h2>
        {calls && (
          <div className="opo-stats">
            <div><b>{calls.total}</b><span>calls on leads</span></div>
            <div><b>{calls.withRecording}</b><span>with a recording</span></div>
          </div>
        )}
        {!calls || calls.rows.length === 0 ? (
          <p className="opo-hint">No calls yet. Once switched on, make a test call from a counsellor's phone to a lead's number.</p>
        ) : (
          <ul className="cz-calls">
            {calls.rows.map((c) => (
              <li key={c._id}>
                <div className="cz-call-head">
                  {c.lead ? <a href={`/leads/${c.lead._id}`}>{c.lead.name || c.lead.phone}</a> : <span>Lead removed</span>}
                  <span className="opo-muted"> · {DIR[c.direction]} · {c.durationSec ? talk(c.durationSec) : 'no talk time'} · {c.counsellor} · {when(c.at)}</span>
                  {c.matchedBy === 'click' && <span className="opo-pill ok">Call button</span>}
                </div>
                {c.recordingUrl
                  ? <audio controls preload="none" src={c.recordingUrl} className="cz-audio">Recording</audio>
                  : <span className="opo-muted">{REC[c.recording]}{c.recordingError ? ` (${c.recordingError})` : ''}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default CallyzerSettings;
