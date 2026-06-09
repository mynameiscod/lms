import React, { useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { assessmentApi, SEGMENT_OPTIONS } from '../../api/assessmentApi';
import './assessment.css';

const STACK_OPTIONS = ['Java', 'Spring', 'Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'C++', 'Android', '.NET'];
const YEAR_OPTIONS = ['1st', '2nd', '3rd', 'Final', 'Passed out'];

const isMobileDevice = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(max-width: 768px)').matches || /Mobi|Android|iPhone/i.test(navigator.userAgent));

const Register: React.FC = () => {
  const { tenantId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const presetSegment = params.get('segment') || '';
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [form, setForm] = useState({
    name: '', phone: '', email: '', city: '',
    segment: presetSegment, year: '', yearsExperience: '',
    currentStack: [] as string[], currentPackage: '',
    targetRole: '', targetCompany: '', targetSalary: '',
  });

  const [token, setToken] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devCode, setDevCode] = useState('');

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleStack = (s: string) =>
    setForm((f) => ({ ...f, currentStack: f.currentStack.includes(s) ? f.currentStack.filter((x) => x !== s) : [...f.currentStack, s] }));

  const isProfessional = form.segment === 'job_switcher' || form.segment === 'graduate';
  const isStudent = form.segment && !isProfessional;

  const utmParams = useMemo(() => {
    const u: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach((k) => { const v = params.get(k); if (v) u[k.replace('utm_', '')] = v; });
    return u;
  }, [params]);

  const submitForm = async () => {
    setErr('');
    if (!form.name.trim()) return setErr('Please enter your name.');
    if (form.phone.replace(/\D/g, '').length < 10) return setErr('Please enter a valid 10-digit phone number.');
    if (!form.segment) return setErr('Please tell us where you are right now.');
    setBusy(true);
    try {
      const res = await assessmentApi.register({
        tenantId,
        name: form.name.trim(),
        phone: form.phone,
        email: form.email || undefined,
        city: form.city || undefined,
        segment: form.segment,
        year: form.year || undefined,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
        currentStack: form.currentStack,
        currentPackage: form.currentPackage ? Number(form.currentPackage) : undefined,
        targetRole: form.targetRole || undefined,
        targetCompany: form.targetCompany || undefined,
        targetSalary: form.targetSalary ? Number(form.targetSalary) : undefined,
        isMobile: isMobileDevice(),
        utmParams,
      });
      setToken(res.token);
      if (res.otp?.devCode) setDevCode(res.otp.devCode);
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
              <div className="as-pill">⚡ Free · ~20–30 min · Get your roadmap</div>
              <h1>Developer Readiness Assessment</h1>
              <p>Find out exactly where you stand and get a personalized roadmap to your target role. Real code tasks, instant score.</p>
            </div>

            <div className="as-card">
              <div className="as-field">
                <label>Where are you right now?</label>
                <div className="as-chips">
                  {SEGMENT_OPTIONS.map((s) => (
                    <div key={s.value} className={`as-chip ${form.segment === s.value ? 'active' : ''}`} onClick={() => set('segment', s.value)}>{s.label}</div>
                  ))}
                </div>
              </div>

              <div className="as-row">
                <div className="as-field"><label>Full name</label><input className="as-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" /></div>
                <div className="as-field"><label>Mobile number</label><input className="as-input" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="10-digit mobile" /></div>
              </div>
              <div className="as-row">
                <div className="as-field"><label>Email (optional)</label><input className="as-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" /></div>
                <div className="as-field"><label>City</label><input className="as-input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="City" /></div>
              </div>

              {isStudent && (
                <div className="as-field"><label>Year of study</label>
                  <select className="as-select" value={form.year} onChange={(e) => set('year', e.target.value)}>
                    <option value="">Select</option>
                    {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}

              {isProfessional && (
                <div className="as-row">
                  <div className="as-field"><label>Years of experience</label><input className="as-input" type="number" inputMode="numeric" value={form.yearsExperience} onChange={(e) => set('yearsExperience', e.target.value)} placeholder="e.g. 4" /></div>
                  <div className="as-field"><label>Current package (LPA)</label><input className="as-input" type="number" inputMode="decimal" value={form.currentPackage} onChange={(e) => set('currentPackage', e.target.value)} placeholder="e.g. 6.5" /></div>
                </div>
              )}

              <div className="as-field"><label>Your current skills</label>
                <div className="as-chips">
                  {STACK_OPTIONS.map((s) => (
                    <div key={s} className={`as-chip ${form.currentStack.includes(s) ? 'active' : ''}`} onClick={() => toggleStack(s)}>{s}</div>
                  ))}
                </div>
              </div>

              <div className="as-row">
                <div className="as-field"><label>Target role</label><input className="as-input" value={form.targetRole} onChange={(e) => set('targetRole', e.target.value)} placeholder="e.g. Backend SDE" /></div>
                <div className="as-field"><label>Target company</label><input className="as-input" value={form.targetCompany} onChange={(e) => set('targetCompany', e.target.value)} placeholder="e.g. a product company" /></div>
              </div>
              <div className="as-field"><label>Target salary (LPA)</label><input className="as-input" type="number" inputMode="decimal" value={form.targetSalary} onChange={(e) => set('targetSalary', e.target.value)} placeholder="e.g. 15" /></div>

              {err && <div className="as-err">{err}</div>}
              <button className="as-btn" disabled={busy} onClick={submitForm} style={{ marginTop: 8 }}>{busy ? 'Please wait…' : 'Continue →'}</button>
              <div className="as-note">We'll send a one-time code to verify your number. No spam.</div>
            </div>
          </>
        )}

        {step === 'otp' && (
          <div className="as-card as-center">
            <h1 style={{ fontSize: 22, marginBottom: 6 }}>Verify your number</h1>
            <p className="as-note" style={{ marginBottom: 18 }}>Enter the 6-digit code sent to {form.phone} on WhatsApp.</p>
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
