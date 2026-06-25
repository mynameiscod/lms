import React, { useState } from 'react';
import { concernApi } from '../api/concernApi';

/**
 * Reusable "Raise a concern" button + modal (Slice 5). Drop it anywhere in the
 * student experience; pass optional context (plan/day) so the mentor sees where
 * the concern came from.
 */
const PURPLE = '#6650d8', TEAL = '#14a89c';

const CATEGORIES = [
  { v: 'content', l: '📘 Lesson / content' },
  { v: 'technical', l: '🛠️ Technical issue' },
  { v: 'mentor', l: '🧑‍🏫 Need mentor help' },
  { v: 'payment', l: '💳 Payment / unlock' },
  { v: 'other', l: '💬 Something else' },
];

const RaiseConcern: React.FC<{ context?: { enrollmentId?: string; curriculumTitle?: string; dayNumber?: number }; variant?: 'button' | 'link' }> = ({ context, variant = 'button' }) => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('content');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!message.trim()) { setErr('Please describe your concern.'); return; }
    setBusy(true); setErr('');
    try {
      await concernApi.raise({ category, message: message.trim(), context: { ...context, page: window.location.pathname } });
      setDone(true);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not submit. Please try again.');
    } finally { setBusy(false); }
  };

  const close = () => { setOpen(false); setTimeout(() => { setDone(false); setMessage(''); setErr(''); }, 200); };

  const trigger = variant === 'link'
    ? <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: PURPLE, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>🙋 Raise a concern</button>
    : <button onClick={() => setOpen(true)} style={{ background: '#fff', color: PURPLE, border: `1.5px solid ${PURPLE}`, borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🙋 Raise a concern</button>;

  return (
    <>
      {trigger}
      {open && (
        <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '12px 4px' }}>
                <div style={{ fontSize: 42 }}>✅</div>
                <h3 style={{ margin: '8px 0 6px', color: '#0f172a' }}>Concern raised</h3>
                <p style={{ color: '#64748b', fontSize: 13.5, margin: '0 0 16px' }}>A mentor will get back to you shortly. You can track it under your concerns.</p>
                <button onClick={close} style={{ background: `linear-gradient(90deg,${PURPLE},${TEAL})`, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, cursor: 'pointer' }}>Done</button>
              </div>
            ) : (
              <>
                <h3 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: 18 }}>Raise a concern</h3>
                <p style={{ color: '#64748b', fontSize: 12.8, margin: '0 0 14px' }}>Stuck, confused, or need help? Tell us — a mentor will respond.{context?.curriculumTitle ? ` (Re: ${context.curriculumTitle}${context.dayNumber ? `, Day ${context.dayNumber}` : ''})` : ''}</p>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', margin: '5px 0 14px', padding: '9px 10px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13.5 }}>
                  {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Your concern</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={2000} placeholder="Describe what you need help with…" style={{ width: '100%', margin: '5px 0 6px', padding: '10px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13.5, resize: 'vertical', fontFamily: 'inherit' }} />
                {err && <div style={{ color: '#dc2626', fontSize: 12.5, marginBottom: 8 }}>{err}</div>}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button onClick={close} style={{ background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={submit} disabled={busy} style={{ background: `linear-gradient(90deg,${PURPLE},${TEAL})`, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: busy ? .6 : 1 }}>{busy ? 'Sending…' : 'Submit'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default RaiseConcern;
