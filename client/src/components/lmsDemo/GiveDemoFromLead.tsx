import React, { useState } from 'react';
import { Modal } from '../common';
import { lmsDemoApi, demoErr } from '../../api/lmsDemoApi';

/**
 * "Give LMS demo" on a CRM lead: makes (or reopens) the lead's demo account from its own name and
 * phone and hands back the one-tap link to copy or send on WhatsApp. The lead's timeline records it.
 */
export default function GiveDemoFromLead({ leadId, leadName, phone, onClose }: { leadId: string; leadName: string; phone?: string; onClose: (given: boolean) => void }) {
  const [days, setDays] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ link: string; returning: boolean; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const first = (leadName || '').split(' ')[0] || 'there';
  const wa = String(phone || '').replace(/\D/g, '').slice(-10);

  const give = async () => {
    setBusy(true); setErr('');
    try { setDone(await lmsDemoApi.giveFromLead(leadId, days === '' ? undefined : Number(days))); } catch (e) { setErr(demoErr(e)); } finally { setBusy(false); }
  };
  const msg = done ? encodeURIComponent(`Hi ${first}, here is your free CodeBegun LMS demo. Tap to start — no password needed: ${done.link}`) : '';

  return (
    <Modal isOpen onClose={() => onClose(!!done)} title="Give LMS demo" size="small">
      {!done ? (
        <>
          <p className="small text-muted">Creates a free demo account for {leadName}{phone ? ` (${phone})` : ''} with every demo course and feature, and gives you a one-tap link to send.</p>
          <label className="small fw-semibold d-block mb-3">Demo length
            <select className="form-select" value={days} onChange={e => setDays(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Default (from LMS Demo settings)</option>
              {[1, 2, 3, 5, 7, 14].map(d => <option key={d} value={d}>{d} day{d === 1 ? '' : 's'}</option>)}
            </select>
          </label>
          {err && <div className="alert alert-danger py-2 small">{err}</div>}
          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => onClose(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={busy || !phone} onClick={give}>{busy ? 'Creating…' : 'Create demo'}</button>
          </div>
          {!phone && <p className="small text-danger mt-2 mb-0">This lead has no phone number; add one first.</p>}
        </>
      ) : (
        <>
          <p className="small mb-2"><b>{done.returning ? 'Demo ready (existing demo account).' : 'Demo ready.'}</b> Open until {new Date(done.expiresAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.</p>
          <input className="form-control form-control-sm mb-3" readOnly value={done.link} onFocus={e => e.target.select()} aria-label="Demo link" />
          <div className="d-flex justify-content-end gap-2 flex-wrap">
            <button className="btn btn-outline-primary btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(done.link); setCopied(true); } catch { /* select and copy by hand */ } }}>
              <i className="bi bi-clipboard" /> {copied ? 'Copied' : 'Copy link'}
            </button>
            {wa.length === 10 && <a className="btn btn-success btn-sm" href={`https://wa.me/91${wa}?text=${msg}`} target="_blank" rel="noreferrer"><i className="bi bi-whatsapp" /> Send on WhatsApp</a>}
            <button className="btn btn-primary btn-sm" onClick={() => onClose(true)}>Done</button>
          </div>
        </>
      )}
    </Modal>
  );
}
