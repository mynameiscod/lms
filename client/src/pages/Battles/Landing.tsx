import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { battlePublicApi } from '../../api/battleApi';
import BattleChrome from './BattleChrome';
import './battles.css';

/** Public Tech Battle landing + self-serve registration (OTP). No login. */
const BattleLanding: React.FC = () => {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const tenant = sp.get('tenant') || 'codebegun';
  const doorCode = sp.get('door') || 'public';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'form' | 'otp' | 'done' | 'pending'>('form');
  const [form, setForm] = useState<Record<string, string>>({ name: '', mobile: '', email: '', college: '', accessCode: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [examUrl, setExamUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    (async () => {
      try { setData(await battlePublicApi.get(tenant, String(slug), doorCode)); }
      catch (e: any) { setErr(e?.response?.data?.message || 'Battle not found.'); }
      setLoading(false);
    })();
  }, [tenant, slug, doorCode]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const battle = data?.battle;
  const door = data?.door;
  const startMs = battle ? new Date(battle.startAt).getTime() : 0;
  const countdown = useMemo(() => {
    const d = Math.max(0, startMs - now);
    const days = Math.floor(d / 86400000), h = Math.floor((d % 86400000) / 3600000), m = Math.floor((d % 3600000) / 60000), s = Math.floor((d % 60000) / 1000);
    return { days, h, m, s };
  }, [startMs, now]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const register = async () => {
    setErr(''); setBusy(true);
    try {
      const extra: Record<string, any> = {};
      (battle.fields || []).forEach((f: any) => { extra[f.key] = form[f.key] || ''; });
      const res = await battlePublicApi.register(tenant, battle.slug, { ...form, doorCode, ...extra }, files);
      if (res.pending) { setStep('pending'); return; }        // approval mode → wait for admin
      setToken(res.token);
      if (res.otp?.devCode) setDevCode(res.otp.devCode);
      setStep('otp');
    } catch (e: any) { setErr(e?.response?.data?.message || 'Registration failed.'); }
    setBusy(false);
  };

  const verify = async () => {
    setErr(''); setBusy(true);
    try {
      const res = await battlePublicApi.verify(token, code);
      setExamUrl(res.examUrl);
      setStep('done');
    } catch (e: any) { setErr(e?.response?.data?.message || 'Invalid code.'); }
    setBusy(false);
  };

  if (loading) return <BattleChrome><div className="bt-page"><div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Loading…</div></div></BattleChrome>;
  if (data && data.active === false) return (
    <BattleChrome><div className="bt-page"><div className="bt-wrap" style={{ marginTop: 60 }}><div className="bt-card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>⚔️</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>No battle open right now</div>
      <div className="bt-muted">The next CodeBegun Tech Battle will be announced soon. Check back!</div>
    </div></div></div></BattleChrome>
  );
  if (!battle) return <BattleChrome><div className="bt-page"><div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>{err || 'Battle not found.'}</div></div></BattleChrome>;

  const started = now >= startMs;

  return (
    <BattleChrome>
    <div className="bt-page">
      <div className="bt-hero">
        <div className="bt-hero-in">
          <span className="bt-eyebrow">⚔️ TECH BATTLE{door?.type !== 'public' ? ` · ${door.label}` : ''}</span>
          <h1>{battle.title}</h1>
          {battle.description && <p>{battle.description}</p>}
          <div className="bt-meta">
            {battle.prize && <div>🏆 Prize: <b>{battle.prize}</b></div>}
            <div>🗓️ Starts: <b>{new Date(battle.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} IST</b></div>
          </div>
          {!started && (
            <div className="bt-count">
              <div><b>{countdown.days}</b><span>DAYS</span></div>
              <div><b>{countdown.h}</b><span>HRS</span></div>
              <div><b>{countdown.m}</b><span>MIN</span></div>
              <div><b>{countdown.s}</b><span>SEC</span></div>
            </div>
          )}
        </div>
      </div>

      <div className="bt-wrap">
        <div className="bt-card">
          {step === 'form' && (
            <>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>Register to compete</div>
              <div className="bt-muted">Verify with a quick OTP — you'll get your exam link instantly.</div>
              {!battle.registerOpen && <div className="bt-err">Registration is closed for this battle.</div>}
              <label className="bt-label">Full name *</label>
              <input className="bt-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
              <label className="bt-label">Mobile *</label>
              <input className="bt-input" value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="10-digit mobile" />
              <label className="bt-label">Email *</label>
              <input className="bt-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" />
              {door?.type === 'public' && (<><label className="bt-label">College (optional)</label><input className="bt-input" value={form.college} onChange={e => set('college', e.target.value)} placeholder="Your college" /></>)}
              {door?.needsAccessCode && (<><label className="bt-label">Access code *</label><input className="bt-input" value={form.accessCode} onChange={e => set('accessCode', e.target.value)} placeholder="Code from your college" /></>)}
              {door?.emailDomain && <div className="bt-muted" style={{ marginTop: 8 }}>Only <b>@{door.emailDomain}</b> emails can register here.</div>}
              {battle.registrationMode === 'approval' && (
                <>
                  <label className="bt-label">Upload proof {battle.proofNote ? `— ${battle.proofNote}` : '(college ID / screenshot)'}</label>
                  <input className="bt-input" type="file" multiple accept="image/*,.pdf" onChange={e => setFiles(Array.from(e.target.files || []))} />
                  {files.length > 0 && <div className="bt-muted" style={{ marginTop: 4 }}>{files.length} file(s) selected</div>}
                </>
              )}
              {(battle.fields || []).map((f: any) => (
                <div key={f.key}>
                  <label className="bt-label">{f.label}{f.required ? ' *' : ''}</label>
                  {f.type === 'select'
                    ? <select className="bt-input" value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}><option value="">Select…</option>{(f.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                    : <input className="bt-input" value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} />}
                </div>
              ))}
              {err && <div className="bt-err">{err}</div>}
              <button className="bt-btn" disabled={busy || !battle.registerOpen || !form.name || !form.mobile || !form.email} onClick={register}>
                {busy ? 'Submitting…' : battle.registrationMode === 'approval' ? 'Submit registration' : 'Register & get OTP'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 12 }}><button onClick={() => nav(`/battles/${battle.slug}/leaderboard?tenant=${tenant}`)} style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>View leaderboard →</button></div>
            </>
          )}

          {step === 'otp' && (
            <>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Enter the OTP</div>
              <div className="bt-muted">Sent to your WhatsApp/mobile. {devCode && <>Dev code: <b>{devCode}</b></>}</div>
              <input className="bt-input bt-otp" value={code} maxLength={6} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
              {err && <div className="bt-err">{err}</div>}
              <button className="bt-btn" disabled={busy || code.length < 4} onClick={verify}>{busy ? 'Verifying…' : 'Verify & confirm spot'}</button>
              <div style={{ textAlign: 'center', marginTop: 12 }}><button onClick={async () => { const r = await battlePublicApi.resend(token); if (r.otp?.devCode) setDevCode(r.otp.devCode); }} style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Resend OTP</button></div>
            </>
          )}

          {step === 'pending' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40 }}>📩</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '6px 0' }}>Registration received!</div>
              <div className="bt-ok">Our team will review your details{files.length ? ' and proof' : ''}. Once approved, we'll <b>email your exam link</b> — it unlocks at <b>{new Date(battle.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} IST</b>. Keep an eye on your inbox!</div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '6px 0' }}>You're in!</div>
              <div className="bt-ok">Your spot is confirmed. Your exam link is below and we've emailed it too. It unlocks at <b>{new Date(battle.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} IST</b>.</div>
              <button className="bt-btn" onClick={() => nav(examUrl.replace(/^https?:\/\/[^/]+/, ''))}>Go to my exam</button>
              <div className="bt-muted" style={{ marginTop: 10, wordBreak: 'break-all' }}>{examUrl}</div>
            </div>
          )}
        </div>
      </div>
    </div>
    </BattleChrome>
  );
};

export default BattleLanding;
