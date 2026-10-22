import React, { useEffect, useState } from 'react';
import supportApi, { SupportConfig, SupportMe, errorText } from '../../api/supportApi';
import { Loading, ErrorState } from './supportUi';
import './support.css';

/**
 * Support settings. Every box starts EMPTY and empty means "not set": no response target is
 * shown to members, no SLA figure is computed, incident detection is off and nothing is deleted
 * automatically. Only what is typed here is ever treated as a commitment.
 */
const PRIORITIES: ['low' | 'medium' | 'high' | 'critical', string][] = [['critical', 'Critical'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']];
type Form = Record<string, string>;

const toForm = (c: SupportConfig): Form => {
  const f: Form = {};
  const put = (k: string, v: unknown) => { f[k] = v === null || v === undefined ? '' : String(v); };
  PRIORITIES.forEach(([p]) => { put(`fr.${p}`, c.firstResponseMinutes?.[p]); put(`rs.${p}`, c.resolutionMinutes?.[p]); });
  f['reopen.allowed'] = c.reopen?.allowed === true ? 'yes' : c.reopen?.allowed === false ? 'no' : '';
  put('reopen.windowDays', c.reopen?.windowDays); put('reopen.maxReopens', c.reopen?.maxReopens);
  put('incident.minTickets', c.incident?.minTickets); put('incident.minDistinctUsers', c.incident?.minDistinctUsers); put('incident.windowMinutes', c.incident?.windowMinutes);
  put('retention.chatDays', c.retention?.chatDays); put('retention.attachmentDays', c.retention?.attachmentDays);
  return f;
};
const v = (s: string) => (s.trim() === '' ? null : Number(s));

const SupportSettings: React.FC<{ me: SupportMe | null }> = ({ me }) => {
  const [scope, setScope] = useState<'institute' | 'platform'>('institute');
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [busy, setBusy] = useState(false);

  const load = () => { setForm(null); setErr(''); supportApi.getConfig(scope === 'platform' ? 'platform' : undefined).then(c => setForm(toForm(c))).catch(e => setErr(errorText(e, 'Settings could not be loaded.'))); };
  useEffect(load, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!form) return;
    setBusy(true); setMsg({});
    const byP = (prefix: string) => Object.fromEntries(PRIORITIES.map(([p]) => [p, v(form[`${prefix}.${p}`])]));
    try {
      const saved = await supportApi.saveConfig({
        scope,
        firstResponseMinutes: byP('fr'), resolutionMinutes: byP('rs'),
        reopen: { allowed: form['reopen.allowed'] === 'yes' ? true : form['reopen.allowed'] === 'no' ? false : null, windowDays: v(form['reopen.windowDays']), maxReopens: v(form['reopen.maxReopens']) },
        incident: { minTickets: v(form['incident.minTickets']), minDistinctUsers: v(form['incident.minDistinctUsers']), windowMinutes: v(form['incident.windowMinutes']) },
        retention: { chatDays: v(form['retention.chatDays']), attachmentDays: v(form['retention.attachmentDays']) },
      } as any);
      setForm(toForm(saved)); setMsg({ ok: 'Settings saved.' });
    } catch (e) { setMsg({ err: errorText(e, 'Settings could not be saved.') }); }
    setBusy(false);
  };

  if (!me) return <Loading />;
  if (!me.can.manage) return <p className="sp-err" role="alert">Support settings need the Support manager permission.</p>;
  const input = (k: string, label: string, hint?: string) => (
    <div className="sp-field">
      <label htmlFor={`cfg-${k}`}>{label}</label>
      <input id={`cfg-${k}`} className="sp-input" inputMode="numeric" value={form?.[k] ?? ''} placeholder="Not set" onChange={e => setForm(f => ({ ...f!, [k]: e.target.value.replace(/[^\d]/g, '') }))} />
      {hint && <span className="sp-hint">{hint}</span>}
    </div>
  );

  return (
    <form className="sp-stack" onSubmit={e => { e.preventDefault(); save(); }}>
      <p className="sp-warn">Leave a box empty to leave it unset. Members only see a target once one is set here, so set only what your team can keep.</p>
      {me.allTenants && (
        <div className="sp-filters" role="group" aria-label="Which settings">
          <button type="button" className={`sp-chip${scope === 'institute' ? ' on' : ''}`} aria-pressed={scope === 'institute'} onClick={() => setScope('institute')}>This institute</button>
          <button type="button" className={`sp-chip${scope === 'platform' ? ' on' : ''}`} aria-pressed={scope === 'platform'} onClick={() => setScope('platform')}>Default for every institute</button>
        </div>
      )}
      {err ? <ErrorState text={err} onRetry={load} /> : !form ? <Loading /> : (
        <>
          <fieldset className="sp-card">
            <legend className="sp-legend">Response targets (minutes)</legend>
            <table className="sp-table">
              <thead><tr><th scope="col">Priority</th><th scope="col">First reply within</th><th scope="col">Resolved within</th></tr></thead>
              <tbody>
                {PRIORITIES.map(([p, l]) => (
                  <tr key={p}><th scope="row">{l}</th>
                    <td><input className="sp-input" aria-label={`${l}: first reply within, minutes`} inputMode="numeric" placeholder="Not set" value={form[`fr.${p}`]} onChange={e => setForm(f => ({ ...f!, [`fr.${p}`]: e.target.value.replace(/[^\d]/g, '') }))} /></td>
                    <td><input className="sp-input" aria-label={`${l}: resolved within, minutes`} inputMode="numeric" placeholder="Not set" value={form[`rs.${p}`]} onChange={e => setForm(f => ({ ...f!, [`rs.${p}`]: e.target.value.replace(/[^\d]/g, '') }))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="sp-hint">1 hour = 60, 1 day = 1440. The clock runs from when the ticket is raised.</p>
          </fieldset>
          <fieldset className="sp-card">
            <legend className="sp-legend">Reopening</legend>
            <div className="sp-field">
              <label htmlFor="cfg-reopen">Members may reopen a resolved ticket</label>
              <select id="cfg-reopen" className="sp-select" value={form['reopen.allowed']} onChange={e => setForm(f => ({ ...f!, 'reopen.allowed': e.target.value }))}>
                <option value="">Not set (allowed)</option><option value="yes">Yes</option><option value="no">No</option>
              </select>
            </div>
            <div className="sp-row">{input('reopen.windowDays', 'Within (days of resolution)')}{input('reopen.maxReopens', 'At most (times per ticket)')}</div>
          </fieldset>
          <fieldset className="sp-card">
            <legend className="sp-legend">Possible shared incidents</legend>
            <p className="sp-hint">Flag an area when this many tickets from this many different people arrive within the window. All three are needed; otherwise detection is off.</p>
            <div className="sp-row">{input('incident.minTickets', 'Tickets (at least)')}{input('incident.minDistinctUsers', 'Different people (at least)')}</div>
            {input('incident.windowMinutes', 'Within (minutes)')}
          </fieldset>
          <fieldset className="sp-card">
            <legend className="sp-legend">Keeping data</legend>
            <div className="sp-row">{input('retention.chatDays', 'Delete assistant conversations after (days)', 'Empty keeps them.')}{input('retention.attachmentDays', 'Delete ticket attachments after (days)', 'Empty keeps them.')}</div>
          </fieldset>
          {msg.ok && <p className="sp-ok" role="status">{msg.ok}</p>}
          {msg.err && <p className="sp-err" role="alert">{msg.err}</p>}
          <div className="sp-actions"><button type="submit" className="sp-btn sp-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div>
        </>
      )}
    </form>
  );
};

export default SupportSettings;
