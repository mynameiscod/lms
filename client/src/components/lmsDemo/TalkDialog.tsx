import React, { useEffect, useState } from 'react';
import { lmsDemoApi, DemoMe } from '../../api/lmsDemoApi';

/**
 * "Talk to a counsellor". Tells the CRM first (the lead turns hot and due for a call now), then
 * offers the ways to reach someone straight away: call, WhatsApp, or wait for the call back.
 */
export default function TalkDialog({ me, onClose }: { me: DemoMe | null; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const phone = (me?.counsellor?.phone || '').replace(/[^\d+]/g, '');
  const wa = (me?.counsellor?.whatsapp || me?.counsellor?.phone || '').replace(/\D/g, '');
  const waNumber = wa.length === 10 ? `91${wa}` : wa;

  // Once per opening: the dialog's parent re-renders, and every render hands it a new onClose.
  useEffect(() => {
    lmsDemoApi.talk('button').then(() => setSent(true)).catch(() => setSent(true));
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const text = encodeURIComponent(`Hi, I'm ${me?.firstName || ''}. I tried the CodeBegun LMS demo and would like to know more about joining.`);

  return (
    <div className="dsh-modal" role="dialog" aria-modal="true" aria-labelledby="dsh-talk-t" onClick={onClose}>
      <div className="dsh-modal-card" onClick={e => e.stopPropagation()}>
        <button type="button" className="dsh-modal-x" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
        <div className="dsh-modal-ic"><i className="bi bi-headset" /></div>
        <h2 id="dsh-talk-t">Talk to a counsellor</h2>
        <p>{sent ? 'We have let our team know. A counsellor will call you shortly — or reach us right now:' : 'Letting our team know…'}</p>
        <div className="dsh-modal-actions">
          {phone && <a className="dsh-btn navy" href={`tel:${phone}`}><i className="bi bi-telephone" /> Call {me?.counsellor?.phone}</a>}
          {waNumber && <a className="dsh-btn wa" href={`https://wa.me/${waNumber}?text=${text}`} target="_blank" rel="noreferrer"><i className="bi bi-whatsapp" /> Chat on WhatsApp</a>}
          <button type="button" className="dsh-btn ghost" onClick={onClose}>I'll wait for the call</button>
        </div>
      </div>
    </div>
  );
}
