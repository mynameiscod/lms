import React, { useEffect, useRef, useState } from 'react';
import { placementAdminApi, PlacementConfig, errMsg } from '../../api/placementProgramApi';
import LinesTextarea from '../../components/common/LinesTextarea';

/** Fee, refund share, the "payment before booking" switch, and how slots are cut. */
const PlacementSettings: React.FC = () => {
  const [cfg, setCfg] = useState<PlacementConfig | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<[string, string][]>([]);
  const [preview, setPreview] = useState<{ title: string; text: string } | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    placementAdminApi.getConfig().then(setCfg).catch(e => setMsg({ ok: false, text: errMsg(e) }));
    placementAdminApi.agreementPreview().then(p => setFields(p.fields)).catch(() => undefined);
  }, []);
  if (!cfg) return <div className="ppa-card">{msg?.text || 'Loading…'}</div>;

  const set = (k: keyof PlacementConfig, v: any) => setCfg({ ...cfg, [k]: v });
  const num = (k: keyof PlacementConfig) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value === '' ? '' : Number(e.target.value));
  const save = async () => {
    setBusy(true); setMsg(null);
    try { setCfg(await placementAdminApi.saveConfig(cfg)); setMsg({ ok: true, text: 'Saved.' }); }
    catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
    setBusy(false);
  };
  const refund = Math.floor(((Number(cfg.feeInr) || 0) * (Number(cfg.refundablePct) || 0)) / 100);
  const ag = cfg.agreement || { title: '', body: '', version: 0 };
  const setAg = (patch: Partial<typeof ag>) => setCfg({ ...cfg, agreement: { ...ag, ...patch } });
  /** Put {{field}} where the cursor is in the agreement body. */
  const insertField = (k: string) => {
    const el = bodyRef.current;
    const tag = `{{${k}}}`;
    if (!el) return setAg({ body: ag.body + tag });
    const start = el.selectionStart ?? ag.body.length, end = el.selectionEnd ?? start;
    setAg({ body: ag.body.slice(0, start) + tag + ag.body.slice(end) });
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + tag.length; });
  };
  const showPreview = async () => {
    try { await placementAdminApi.saveConfig(cfg).then(setCfg); setPreview(await placementAdminApi.agreementPreview()); }
    catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
  };

  return (
    <div className="ppa-card">
      <h3 className="ppa-card-title">Interview fee</h3>
      <div className="ppa-form">
        <label>Fee (₹)<input type="number" min={0} value={cfg.feeInr} onChange={num('feeInr')} /><small>0 means no fee.</small></label>
        <label>Refundable share (%)<input type="number" min={0} max={100} value={cfg.refundablePct} onChange={num('refundablePct')} /><small>Refund button gives back ₹{refund.toLocaleString('en-IN')}.</small></label>
        <label className="ppa-switch-row">
          <span>
            <b>Payment before booking</b>
            <small>{cfg.paymentBeforeBooking ? 'On — candidates pay first, then the calendar opens.' : 'Off — candidates book straight away; the fee can be paid later.'}</small>
          </span>
          <button type="button" role="switch" aria-checked={cfg.paymentBeforeBooking} className={`ppa-sw${cfg.paymentBeforeBooking ? ' on' : ''}`} onClick={() => set('paymentBeforeBooking', !cfg.paymentBeforeBooking)} />
        </label>
      </div>
      <p className="ppa-note">You can still waive the fee for any candidate from their page.</p>

      <h3 className="ppa-card-title">Interview slots</h3>
      <div className="ppa-form">
        <label>Interview length (minutes)<input type="number" min={10} max={180} value={cfg.slotMinutes} onChange={num('slotMinutes')} /></label>
        <label>Gap after each (minutes)<input type="number" min={0} max={120} value={cfg.bufferMinutes} onChange={num('bufferMinutes')} /></label>
        <label>Book up to (days ahead)<input type="number" min={1} max={90} value={cfg.bookingWindowDays} onChange={num('bookingWindowDays')} /></label>
        <label>Minimum notice (hours)<input type="number" min={0} max={168} value={cfg.minNoticeHours} onChange={num('minNoticeHours')} /><small>Also how late a candidate may cancel.</small></label>
      </div>

      <h3 className="ppa-card-title">Interview scorecard</h3>
      <div className="ppa-form one">
        <label>What interviewers rate, 1–5 — one per line ({(cfg.scorecardCriteria || []).length} of 8)
          <LinesTextarea rows={5} value={cfg.scorecardCriteria || []} onChange={v => set('scorecardCriteria', v)} />
          <small>Interviewers fill this when they mark a candidate attended, with a recommendation and notes. Changing it does not alter scorecards already filled.</small>
        </label>
      </div>

      <h3 className="ppa-card-title">Agreement {ag.version ? <span className="ppa-sub2">— version {ag.version}</span> : null}</h3>
      <div className="ppa-form one">
        <label>Title<input value={ag.title} maxLength={120} placeholder="Placement Program Agreement" onChange={e => setAg({ title: e.target.value })} /></label>
        <label>Agreement text
          <div className="ppa-fieldchips">
            {fields.map(([k, l]) => <button type="button" key={k} title={l} onClick={() => insertField(k)}>{`{{${k}}}`}</button>)}
          </div>
          <textarea ref={bodyRef} rows={16} value={ag.body} placeholder="Write the agreement. Click a field above to insert it — e.g. I, {{name}}, agree to …" onChange={e => setAg({ body: e.target.value })} />
          <small>Fields are filled for each candidate when you send it, and the exact text is frozen for them — editing here later never changes what someone already received. Each change makes a new version.</small>
        </label>
      </div>
      <button type="button" className="ppa-btn ghost" onClick={showPreview}><i className="bi bi-eye" /> Save &amp; preview with sample data</button>
      {preview && (
        <div className="ppa-agreement-preview">
          <b>{preview.title || 'Agreement'}</b>
          <div>{preview.text}</div>
        </div>
      )}

      <div className="ppa-save-row">
        <button className="ppa-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button>
        {msg && <span className={msg.ok ? 'ppa-ok' : 'ppa-bad'}>{msg.text}</span>}
      </div>
    </div>
  );
};

export default PlacementSettings;
