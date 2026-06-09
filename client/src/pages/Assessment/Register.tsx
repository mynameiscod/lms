import React, { useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { assessmentApi, PROFILE_OPTIONS, PRIMARY_LANGUAGES } from '../../api/assessmentApi';
import './assessment.css';

const isMobileDevice = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(max-width: 768px)').matches || /Mobi|Android|iPhone/i.test(navigator.userAgent));

const Register: React.FC = () => {
  const { tenantId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const presetSegment = params.get('segment') || '';
  const presetProfile = PROFILE_OPTIONS.find((p) => p.segment === presetSegment)?.value || '';

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    profile: presetProfile, yearsExperience: '', primaryLanguage: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [token, setToken] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devCode, setDevCode] = useState('');

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const profileMeta = PROFILE_OPTIONS.find((p) => p.value === form.profile);

  const utmParams = useMemo(() => {
    const u: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach((k) => { const v = params.get(k); if (v) u[k.replace('utm_', '')] = v; });
    return u;
  }, [params]);

  const submitForm = async () => {
    setErr('');
    if (!form.firstName.trim() || !form.lastName.trim()) return setErr('Please enter your first and last name.');
    if (!/\S+@\S+\.\S+/.test(form.email)) return setErr('Please enter a valid email — your account login is sent here.');
    if (form.phone.replace(/\D/g, '').length < 10) return setErr('Please enter a valid 10-digit phone number.');
    if (!profileMeta) return setErr('Please select where you are right now.');
    setBusy(true);
    try {
      const res = await assessmentApi.register({
        tenantId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone,
        segment: profileMeta.segment,
        year: profileMeta.year,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
        primaryLanguage: form.primaryLanguage || undefined,
        isMobile: isMobileDevice(),
        utmParams,
      });
      setToken(res.token);
      if (res.otp?.devCode) setDevCode(res.otp.devCode);

      // Upload resume (optional, best-effort) before moving to OTP.
      if (resumeFile) {
        try { await assessmentApi.uploadResume(res.token, resumeFile); } catch { /* non-blocking */ }
      }
      setStep('otp');
    } catch (e: any) {
      setErr(e.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onOtpChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) (document.getElementById(`otp-${i + 1}`) as HTMLInputElement)?.focus();
  };

  const verify = async () => {
    setErr('');
    const code = otp.join('');
    if (code.length !== 6) return setErr('Enter the 6-digit code.');
    setBusy(true);
    try {
      await assessmentApi.verifyOtp(token, code);
      navigate(`/assessment/exam/${token}`);
    } catch (e: any) {
      setErr(e.message || 'Invalid code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setErr('');
    try {
      const r = await assessmentApi.resendOtp(token);
      if (r.otp?.devCode) setDevCode(r.otp.devCode);
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <div className="as-root">
      <div className="as-wrap">
        <div className="as-brand"><span className="as-dot" /><b>CodeBegun</b><span>Compass</span></div>

        {step === 'form' && (
          <>
            <div className="as-hero">
              <div className="as-pill">⚡ Free · personalized to you · get your roadmap</div>
              <h1>Developer Readiness Assessment</h1>
              <p>Tell us about yourself and we'll build an assessment tailored to your level — then a personalized roadmap to your goal.</p>
            </div>

            <div className="as-card">
              <div className="as-field">
                <label>Where are you right now?</label>
                <div className="as-chips">
                  {PROFILE_OPTIONS.map((p) => (
                    <div key={p.value} className={`as-chip ${form.profile === p.value ? 'active' : ''}`} onClick={() => set('profile', p.value)}>{p.label}</div>
                  ))}
                </div>
              </div>

              <div className="as-row">
                <div className="as-field"><label>First name</label><input className="as-input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="First name" /></div>
                <div className="as-field"><label>Last name</label><input className="as-input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Last name" /></div>
              </div>
              <div className="as-row">
                <div className="as-field"><label>Email (your login is sent here)</label><input className="as-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" /></div>
                <div className="as-field"><label>Mobile number</label><input className="as-input" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="10-digit mobile" /></div>
              </div>

              <div className="as-row">
                {profileMeta?.professional && (
                  <div className="as-field"><label>Years of experience</label><input className="as-input" type="number" inputMode="numeric" value={form.yearsExperience} onChange={(e) => set('yearsExperience', e.target.value)} placeholder="e.g. 5" /></div>
                )}
                <div className="as-field"><label>Primary programming language</label>
                  <select className="as-select" value={form.primaryLanguage} onChange={(e) => set('primaryLanguage', e.target.value)}>
                    <option value="">Select</option>
                    {PRIMARY_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="as-field">
                <label>Resume (optional — sharpens your assessment & roadmap)</label>
                <input className="as-input" type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
                {resumeFile && <div className="as-note">Selected: {resumeFile.name}</div>}
              </div>

              {err && <div className="as-err">{err}</div>}
              <button className="as-btn" disabled={busy} onClick={submitForm} style={{ marginTop: 8 }}>{busy ? 'Please wait…' : 'Continue →'}</button>
              <div className="as-note">We'll send a one-time code to verify your number, then create your free account.</div>
            </div>
          </>
        )}

        {step === 'otp' && (
          <div className="as-card as-center">
            <h1 style={{ fontSize: 22, marginBottom: 6 }}>Verify your number</h1>
            <p className="as-note" style={{ marginBottom: 18 }}>Enter the 6-digit code sent to {form.phone} on WhatsApp. We'll create your account and email your login.</p>
            <div className="as-otp">
              {otp.map((d, i) => (
                <input key={i} id={`otp-${i}`} value={d} inputMode="numeric" maxLength={1}
                  onChange={(e) => onOtpChange(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) (document.getElementById(`otp-${i - 1}`) as HTMLInputElement)?.focus(); }} />
              ))}
            </div>
            {devCode && <div className="as-dev">Dev mode: your code is {devCode}</div>}
            {err && <div className="as-err">{err}</div>}
            <button className="as-btn" disabled={busy} onClick={verify} style={{ marginTop: 16 }}>{busy ? 'Verifying…' : 'Verify & Start Assessment'}</button>
            <button className="as-btn ghost small" onClick={resend} style={{ marginTop: 10 }}>Resend code</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
