import React, { useEffect, useState } from 'react';
import passportApi from '../../api/passportApi';
import './setPasswordDialog.css';

/* The same four rules the server enforces (server/src/utils/passwordPolicy.ts). */
const RULES: Array<{ label: string; test: (p: string) => boolean }> = [
  { label: 'At least 8 characters', test: p => p.length >= 8 },
  { label: 'One capital letter (A–Z)', test: p => /[A-Z]/.test(p) },
  { label: 'One number (0–9)', test: p => /\d/.test(p) },
  { label: 'One special character (!@#$…)', test: p => /[^A-Za-z0-9\s]/.test(p) },
];
const STRENGTH = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

/** A dialog for a member to set their password: live rule checklist, strength meter, confirm field, show/hide. */
const SetPasswordDialog: React.FC<{ onClose: () => void; onDone: () => void }> = ({ onClose, onDone }) => {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const passed = RULES.filter(r => r.test(pwd)).length;
  const allOk = passed === RULES.length;
  const matches = confirm.length > 0 && confirm === pwd;
  const canSave = allOk && matches && !busy;

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSave) return;
    setBusy(true); setMsg('');
    try {
      await passportApi.setPassword(pwd);
      setSaved(true);
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Could not save your password. Please try again.');
    }
    setBusy(false);
  };

  return <div className="spw-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <div className="spw" role="dialog" aria-modal="true" aria-labelledby="spw-title">
      <div className="spw-hd">
        <span className="spw-ic"><i className={`bi ${saved ? 'bi-shield-fill-check' : 'bi-shield-lock-fill'}`} /></span>
        <div>
          <h2 id="spw-title">{saved ? 'Password saved' : 'Set your password'}</h2>
          <p>{saved ? 'Next time, log in with your phone number or email and this password.' : 'Log in any time without waiting for a WhatsApp code.'}</p>
        </div>
        <button className="spw-x" aria-label="Close" onClick={saved ? onDone : onClose} disabled={busy}><i className="bi bi-x-lg" /></button>
      </div>

      {saved ? <div className="spw-body spw-done">
        <div className="spw-tick"><i className="bi bi-check-lg" /></div>
        <b>Your account is secure.</b>
        <button className="spw-save" onClick={onDone}>Done</button>
      </div> : <form className="spw-body" onSubmit={save}>
        <label className="spw-field">
          <span>New password</span>
          <div className="spw-input">
            <i className="bi bi-lock" />
            <input type={show ? 'text' : 'password'} value={pwd} autoFocus autoComplete="new-password" placeholder="Create a strong password" onChange={e => { setPwd(e.target.value); setMsg(''); }} />
            <button type="button" className="spw-eye" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}><i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`} /></button>
          </div>
        </label>

        <div className={`spw-meter s${pwd ? passed : 0}`}>
          <div className="bars">{RULES.map((_, i) => <i key={i} className={pwd && i < passed ? 'on' : ''} />)}</div>
          <span>{pwd ? STRENGTH[passed] : 'Password strength'}</span>
        </div>

        <ul className="spw-rules">
          {RULES.map(r => { const ok = r.test(pwd); return <li key={r.label} className={ok ? 'ok' : ''}><i className={`bi ${ok ? 'bi-check-circle-fill' : 'bi-circle'}`} />{r.label}</li>; })}
        </ul>

        <label className="spw-field">
          <span>Confirm password</span>
          <div className={`spw-input${confirm && !matches ? ' bad' : ''}${matches ? ' good' : ''}`}>
            <i className="bi bi-lock" />
            <input type={show ? 'text' : 'password'} value={confirm} autoComplete="new-password" placeholder="Type it again" onChange={e => { setConfirm(e.target.value); setMsg(''); }} />
            {matches && <i className="bi bi-check-circle-fill spw-match" />}
          </div>
          {confirm && !matches && <em className="spw-hint">Passwords do not match yet.</em>}
        </label>

        {msg && <div className="spw-err"><i className="bi bi-exclamation-circle" />{msg}</div>}

        <div className="spw-acts">
          <button type="button" className="spw-cancel" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="spw-save" disabled={!canSave}>{busy ? 'Saving…' : 'Save password'}</button>
        </div>
      </form>}
    </div>
  </div>;
};

export default SetPasswordDialog;
