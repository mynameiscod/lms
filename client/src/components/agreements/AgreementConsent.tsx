import React, { useCallback, useEffect, useState } from 'react';
import { agreementsApi, acceptAll, Consent, StudentAgreement, SignedRecord } from '../../api/agreementsApi';
import { Modal } from '../../pages/ProblemBank/shared';
import SignaturePad from './SignaturePad';
import '../../pages/ProblemBank/ProblemBank.css';

/**
 * The "I agree to the Terms & Conditions" checkboxes students see when they submit their profile.
 * The title is a link that opens every point in a modal; the box is ticked from the modal's
 * "I agree" button (after signing, when a signature is required), so nobody agrees unseen.
 */

export const allAgreed = (list: StudentAgreement[], consents: Record<string, Consent>) =>
  list.every((a) => consents[a.id]?.agreed && (!a.requireSignature || (consents[a.id]?.signature && consents[a.id]?.signedName)));

/** The modal with all the points, the document and (when asked) the signature box. */
export const AgreementModal: React.FC<{
  agreement: StudentAgreement; initial?: Consent; onClose: () => void; onAgree?: (c: Consent) => void; readOnly?: boolean;
}> = ({ agreement: a, initial, onClose, onAgree, readOnly }) => {
  const [signature, setSignature] = useState(initial?.signature || '');
  const [signedName, setSignedName] = useState(initial?.signedName || '');
  const ready = !a.requireSignature || (signature && signedName.trim().length >= 2);
  return (
    <Modal
      title={a.title}
      onClose={onClose}
      wide
      footer={readOnly || !onAgree ? <button className="pb-btn" onClick={onClose}>Close</button> : (
        <>
          <span className="pb-grow pb-muted" style={{ fontSize: 13 }}>{a.requireSignature && !ready ? 'Sign and type your name to agree.' : ''}</span>
          <button className="pb-btn pb-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pb-btn pb-btn-primary" disabled={!ready} onClick={() => onAgree({ agreed: true, signature: signature || undefined, signedName: signedName.trim() || undefined })}>
            <i className="fa-solid fa-check" /> I have read and agree
          </button>
        </>
      )}
    >
      {a.intro && <p style={{ whiteSpace: 'pre-wrap', marginTop: 0 }}>{a.intro}</p>}
      {a.points.length > 0 && (
        <ol style={{ paddingLeft: 22, margin: '0 0 12px', lineHeight: 1.6 }}>
          {a.points.map((p, i) => <li key={i} style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>{p}</li>)}
        </ol>
      )}
      {a.document && (
        <div className="pb-alert pb-alert-info" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fa-solid fa-file-contract" />
          <span className="pb-grow">Please read the attached document: <b>{a.document.name}</b></span>
          <a className="pb-btn pb-btn-sm" href={a.document.url} target="_blank" rel="noreferrer">Open document</a>
        </div>
      )}
      {a.requireSignature && !readOnly && onAgree && (
        <div style={{ marginTop: 16 }}>
          <div className="pb-label" style={{ marginBottom: 6 }}>Your signature</div>
          <SignaturePad onChange={setSignature} />
          <label className="pb-label" style={{ display: 'block', marginTop: 8 }}>
            Full name
            <input className="pb-input" value={signedName} onChange={(e) => setSignedName(e.target.value)} placeholder="Type your full name" style={{ width: '100%', marginTop: 4 }} />
          </label>
        </div>
      )}
    </Modal>
  );
};

/** Controlled list of checkboxes (used inside the profile form). */
export const AgreementConsentList: React.FC<{
  agreements: StudentAgreement[]; consents: Record<string, Consent>; onChange: (next: Record<string, Consent>) => void; showErrors?: boolean;
}> = ({ agreements, consents, onChange, showErrors }) => {
  const [open, setOpen] = useState<StudentAgreement | null>(null);
  if (!agreements.length) return null;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {agreements.map((a) => {
        const c = consents[a.id];
        const missing = showErrors && !c?.agreed;
        return (
          <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${missing ? '#f87171' : '#e2e8f0'}`, background: missing ? '#fef2f2' : '#f8fafc' }}>
            <input
              type="checkbox"
              checked={!!c?.agreed}
              onChange={(e) => {
                if (e.target.checked) setOpen(a); // ticking opens the terms; the modal's "I agree" ticks it
                else onChange({ ...consents, [a.id]: { agreed: false } });
              }}
              style={{ marginTop: 4, width: 18, height: 18, cursor: 'pointer' }}
              aria-label={`I agree to the ${a.title}`}
            />
            <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>
              I have read and agree to the{' '}
              <button type="button" onClick={() => setOpen(a)} style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', font: 'inherit', fontWeight: 600 }}>
                {a.title}
              </button>
              <span style={{ color: '#dc2626' }}> *</span>
              {a.requireSignature && <div style={{ fontSize: 12.5, color: c?.signature ? '#15803d' : '#64748b' }}>{c?.signature ? <><i className="fa-solid fa-signature" /> Signed as {c.signedName}</> : 'Your signature is needed — open the link to sign.'}</div>}
              {missing && <div style={{ fontSize: 12.5, color: '#dc2626' }}>Please open and accept this to continue.</div>}
            </div>
          </div>
        );
      })}
      {open && (
        <AgreementModal
          agreement={open}
          initial={consents[open.id]}
          onClose={() => setOpen(null)}
          onAgree={(c) => { onChange({ ...consents, [open.id]: c }); setOpen(null); }}
        />
      )}
    </div>
  );
};

/** Pending agreements for this student, loaded from the server. */
export function usePendingAgreements(enabled = true) {
  const [pending, setPending] = useState<StudentAgreement[]>([]);
  const [accepted, setAccepted] = useState<StudentAgreement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await agreementsApi.mine();
      setPending(r.pending);
      setAccepted(r.accepted);
    } catch { /* not a student / offline: show nothing */ }
    setLoaded(true);
  }, [enabled]);
  useEffect(() => { reload(); }, [reload]);
  return { pending, accepted, loaded, reload };
}

/**
 * Stand-alone card: for students whose profile is already saved when a new agreement is rolled out
 * to them. Shows the checkboxes and a Submit button.
 */
export const PendingAgreementsCard: React.FC<{ pending: StudentAgreement[]; onDone: () => void }> = ({ pending, onDone }) => {
  const [consents, setConsents] = useState<Record<string, Consent>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tried, setTried] = useState(false);
  if (!pending.length) return null;
  const submit = async () => {
    setTried(true);
    if (!allAgreed(pending, consents)) { setErr('Please open and accept each item below.'); return; }
    setBusy(true); setErr('');
    try { await acceptAll(pending, consents); onDone(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>
        <i className="fa-solid fa-file-signature" /> Please review and accept {pending.length === 1 ? 'this' : `these ${pending.length}`} before continuing
      </div>
      <div style={{ fontSize: 13.5, color: '#1e40af', marginBottom: 10 }}>Click each title to read all the points{pending.some((p) => p.requireSignature) ? ' and sign' : ''}.</div>
      <AgreementConsentList agreements={pending} consents={consents} onChange={setConsents} showErrors={tried} />
      {err && <div style={{ color: '#b91c1c', fontSize: 13.5, marginTop: 8 }}>{err}</div>}
      <div style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</button>
      </div>
    </div>
  );
};

/** A signed record, exactly as it was agreed — printable. */
export const SignedRecordModal: React.FC<{ record: SignedRecord; onClose: () => void }> = ({ record: r, onClose }) => (
  <Modal title={`Signed copy — ${r.snapshot.title}`} onClose={onClose} wide footer={<><button className="pb-btn" onClick={() => printRecord(r)}><i className="fa-solid fa-print" /> Print</button><button className="pb-btn pb-btn-primary" onClick={onClose}>Close</button></>}>
    <RecordBody r={r} />
  </Modal>
);

const RecordBody: React.FC<{ r: SignedRecord }> = ({ r }) => (
  <div>
    <p className="pb-muted" style={{ marginTop: 0 }}>
      Accepted by <b>{r.student.name}</b>{r.student.email ? ` (${r.student.email})` : ''} on {new Date(r.acceptedAt).toLocaleString('en-IN')} · version {r.version}{r.ip ? ` · from ${r.ip}` : ''}
    </p>
    {r.snapshot.intro && <p style={{ whiteSpace: 'pre-wrap' }}>{r.snapshot.intro}</p>}
    <ol style={{ paddingLeft: 22, lineHeight: 1.6 }}>{r.snapshot.points.map((p, i) => <li key={i} style={{ whiteSpace: 'pre-wrap', marginBottom: 6 }}>{p}</li>)}</ol>
    {r.snapshot.document?.url && <p>Attached document: <a href={r.snapshot.document.url} target="_blank" rel="noreferrer">{r.snapshot.document.name}</a></p>}
    {r.signature && (
      <div style={{ marginTop: 14 }}>
        <img src={r.signature} alt="Signature" style={{ maxWidth: 280, maxHeight: 120, display: 'block', borderBottom: '1px solid #cbd5e1' }} />
        <div style={{ fontSize: 13 }}>{r.signedName}</div>
      </div>
    )}
  </div>
);

function printRecord(r: SignedRecord) {
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  w.document.write(`<!doctype html><html><head><title>${esc(r.snapshot.title)}</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:32px auto;line-height:1.55;color:#111}li{margin-bottom:6px;white-space:pre-wrap}.m{color:#555;font-size:13px}</style></head><body>
<h2>${esc(r.snapshot.title)}</h2>
<p class="m">Accepted by <b>${esc(r.student.name || '')}</b>${r.student.email ? ` (${esc(r.student.email)})` : ''} on ${esc(new Date(r.acceptedAt).toLocaleString('en-IN'))} · version ${r.version}${r.ip ? ` · from ${esc(r.ip)}` : ''}</p>
${r.snapshot.intro ? `<p style="white-space:pre-wrap">${esc(r.snapshot.intro)}</p>` : ''}
<ol>${r.snapshot.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
${r.snapshot.document?.url ? `<p>Attached document: ${esc(r.snapshot.document.name)}</p>` : ''}
${r.signature ? `<div style="margin-top:24px"><img src="${r.signature}" style="max-width:280px;max-height:120px;border-bottom:1px solid #999"><div>${esc(r.signedName || '')}</div></div>` : ''}
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
