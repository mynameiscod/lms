import React, { useState } from 'react';
import { placementPortalApi, PortalView, errMsg } from '../../api/placementProgramApi';

/** The agreement and security-cheque steps on the candidate's page (Phase 4). */

export const AgreementStep: React.FC<{ token: string; view: PortalView; step: number; onDone: () => void }> = ({ token, view, step, onDone }) => {
  const a = view.agreement!;
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  const sendCode = async () => {
    setBusy('otp'); setErr(''); setInfo('');
    try {
      const r = await placementPortalApi.agreementOtp(token);
      setCodeSent(true);
      setInfo(r.sent ? `We sent a 6-digit code to your ${r.channel === 'email' ? 'email' : 'WhatsApp'}.`
        : r.devCode ? `Test code: ${r.devCode}`
        : r.throttledSeconds ? 'A code was sent a moment ago — use that one.'
        : 'We could not deliver a code just now. Try again in a minute.');
    } catch (e) { setErr(errMsg(e)); }
    setBusy('');
  };
  const sign = async () => {
    setBusy('sign'); setErr('');
    try { await placementPortalApi.sign(token, { name, code, agree }); onDone(); }
    catch (e) { setErr(errMsg(e)); }
    setBusy('');
  };

  return (
    <section className={`ppr-step${a.signed ? ' done' : ''}`}>
      <div className="ppr-step-head"><b>{step}</b><div><strong>{a.title}</strong><small>{a.signed ? 'Signed' : 'Read it fully, then sign below.'}</small></div></div>
      <div className="ppr-agreement" tabIndex={0} aria-label="Agreement text">{a.text}</div>
      <a className="ppr-btn ppr-pdf" href={placementPortalApi.agreementPdfUrl(token)} target="_blank" rel="noreferrer"><i className="bi bi-file-earmark-pdf" /> Download PDF</a>
      {a.signed ? (
        <p className="ppr-done-line"><i className="bi bi-check-circle-fill" /> Signed by {a.signedName}{a.signedAt ? ` on ${new Date(a.signedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</p>
      ) : (
        <div className="ppr-sign">
          {err && <div className="ppr-err" role="alert">{err}</div>}
          {info && <div className="ppr-ok" role="status">{info}</div>}
          <label className="ppr-check"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /> I have read this agreement and I agree to it.</label>
          <label className="ppr-field">Type your full name to sign<input value={name} onChange={e => setName(e.target.value)} placeholder={a.fullName} autoComplete="name" /></label>
          {!codeSent ? (
            <button className="ppr-submit" disabled={!agree || !name.trim() || !!busy} onClick={sendCode}>{busy === 'otp' ? 'Sending code…' : 'Send code to my WhatsApp'}</button>
          ) : (
            <>
              <label className="ppr-field">6-digit code<input value={code} inputMode="numeric" maxLength={6} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" /></label>
              <button className="ppr-submit" disabled={!agree || !name.trim() || code.length !== 6 || !!busy} onClick={sign}>{busy === 'sign' ? 'Signing…' : 'Sign the agreement'}</button>
              <button type="button" className="ppr-linkbtn" disabled={!!busy} onClick={sendCode}>Send the code again</button>
            </>
          )}
        </div>
      )}
    </section>
  );
};

const CHEQUE_LABEL: Record<string, string> = {
  received: 'Received — we are checking it', verified: 'Verified', held: 'Held as security',
  returned: 'Returned to you', deposited: 'Deposited',
};

export const ChequeStep: React.FC<{ token: string; view: PortalView; step: number; onDone: () => void }> = ({ token, view, step, onDone }) => {
  const ch = view.cheque!;
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({ number: '', bank: '', amountInr: '', date: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const canUpload = !ch.status || ch.status === 'received';

  const upload = async () => {
    if (!file) return setErr('Attach a clear photo of the cheque.');
    if (file.size > 8 * 1024 * 1024) return setErr('The file is larger than 8 MB. Take a smaller photo.');
    setBusy(true); setErr('');
    try { await placementPortalApi.uploadCheque(token, file, f); setFile(null); onDone(); }
    catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  return (
    <section className={`ppr-step${ch.status && ch.status !== 'received' ? ' done' : ''}`}>
      <div className="ppr-step-head"><b>{step}</b><div><strong>Security cheque</strong><small>A signed cheque held as security for the program. It is returned at the end.</small></div></div>
      {ch.status && (
        <p className="ppr-done-line"><i className="bi bi-receipt" /> {CHEQUE_LABEL[ch.status] || ch.status}{ch.number ? ` · No. ${ch.number}` : ''}{ch.bank ? ` · ${ch.bank}` : ''}</p>
      )}
      {canUpload && (
        <div className="ppr-sign">
          {err && <div className="ppr-err" role="alert">{err}</div>}
          {ch.status === 'received' && <p className="ppr-muted">You can replace it until we verify it.</p>}
          <label className="ppr-field">Photo of the cheque (JPG, PNG or PDF, up to 8 MB)
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          <div className="ppr-grid">
            <label>Cheque number<input value={f.number} inputMode="numeric" maxLength={6} placeholder="6 digits" onChange={e => setF({ ...f, number: e.target.value.replace(/\D/g, '') })} /></label>
            <label>Bank<input value={f.bank} maxLength={80} onChange={e => setF({ ...f, bank: e.target.value })} /></label>
            <label>Amount (₹)<input value={f.amountInr} inputMode="numeric" onChange={e => setF({ ...f, amountInr: e.target.value.replace(/\D/g, '') })} /></label>
            <label>Date on the cheque<input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
          </div>
          <button className="ppr-submit" disabled={busy} onClick={upload}>{busy ? 'Uploading…' : ch.status ? 'Replace the cheque' : 'Upload the cheque'}</button>
          <p className="ppr-fine"><i className="bi bi-lock" /> Only our placement team can see this. It is never shared.</p>
        </div>
      )}
    </section>
  );
};
