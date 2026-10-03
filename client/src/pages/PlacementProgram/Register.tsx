import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { placementProgramApi, PlacementRegistration, errMsg } from '../../api/placementProgramApi';
import './placementProgram.css';

/**
 * Placement Program — the page every ad points at.
 *
 * Ad links carry ?tenant=<slug> plus the usual utm_* / fbclid / gclid. The tracking parameters are
 * captured site-wide on arrival (App.tsx) and sent with the form, so each candidate records which
 * campaign and ad brought them. One record per mobile: submitting again updates it.
 */

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 12 }, (_, i) => String(thisYear + 4 - i));
const DEGREES = ['B.Tech / B.E', 'M.Tech / M.E', 'MCA', 'BCA', 'B.Sc', 'M.Sc', 'Diploma', 'Other'];
const EXPERIENCE: [string, string][] = [['fresher', 'Fresher'], ['0-1', 'Less than 1 year'], ['1-3', '1–3 years'], ['3+', '3+ years']];

const EMPTY: PlacementRegistration = {
  name: '', mobile: '', email: '', college: '', degree: '', branch: '', graduationYear: '', experience: '', skills: '', targetRole: '', city: '',
};

const PlacementProgramRegister: React.FC = () => {
  const [params] = useSearchParams();
  const tenant = params.get('tenant') || 'codebegun';
  const [form, setForm] = useState<PlacementRegistration>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ returning: boolean; portalToken?: string } | null>(null);

  const set = (k: keyof PlacementRegistration) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: k === 'mobile' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Please enter your name.');
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return setError('Enter your 10-digit WhatsApp mobile number.');
    setBusy(true); setError('');
    try { setDone(await placementProgramApi.register(tenant, form)); }
    catch (err) { setError(errMsg(err, 'Could not submit. Please try again.')); }
    setBusy(false);
  };

  return (
    <div className="ppr">
      <header className="ppr-nav">
        <img src="/assets/careerpilot/careerpilot-logo.png" alt="CodeBegun" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      </header>

      <main className="ppr-main">
        <section className="ppr-copy">
          <span className="ppr-eyebrow"><i className="bi bi-briefcase-fill" /> Placement Program</span>
          <h1>Get placed with a team<br /><span>that walks with you.</span></h1>
          <p className="ppr-lead">
            Register in under a minute. We will confirm on WhatsApp and set up a short interview to understand your goals.
          </p>
          <ol className="ppr-steps">
            <li><b>1</b><div><strong>Register</strong><small>Tell us about your education and the role you want.</small></div></li>
            <li><b>2</b><div><strong>WhatsApp confirmation</strong><small>Sent to the number you enter here.</small></div></li>
            <li><b>3</b><div><strong>Interview</strong><small>Pick a time that suits you with our placement team.</small></div></li>
          </ol>
        </section>

        <section className="ppr-card" aria-labelledby="ppr-title">
          {done ? (
            <div className="ppr-done" role="status">
              <span className="ppr-done-ic"><i className="bi bi-check2-circle" /></span>
              <h2>{done.returning ? 'Your details are updated' : 'Registration received'}</h2>
              <p>Thank you, {form.name.split(' ')[0]}. We will confirm on WhatsApp at <b>+91 {form.mobile}</b>.</p>
              {done.portalToken && (
                <a className="ppr-submit ppr-continue" href={`/placement-program/me/${done.portalToken}`}>Continue: book your interview <i className="bi bi-arrow-right" /></a>
              )}
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h2 id="ppr-title">Register for the Placement Program</h2>
              {error && <div className="ppr-err" role="alert">{error}</div>}
              <div className="ppr-grid">
                <label className="full">Full name <em>*</em><input value={form.name} onChange={set('name')} autoComplete="name" maxLength={80} /></label>
                <label>WhatsApp mobile <em>*</em><input value={form.mobile} onChange={set('mobile')} inputMode="numeric" autoComplete="tel" placeholder="10-digit number" /></label>
                <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" maxLength={120} /></label>
                <label className="full">College<input value={form.college} onChange={set('college')} maxLength={120} /></label>
                <label>Degree
                  <select value={form.degree} onChange={set('degree')}><option value="">Select…</option>{DEGREES.map(d => <option key={d}>{d}</option>)}</select>
                </label>
                <label>Branch<input value={form.branch} onChange={set('branch')} placeholder="e.g. CSE, ECE" maxLength={80} /></label>
                <label>Graduation year
                  <select value={form.graduationYear} onChange={set('graduationYear')}><option value="">Select…</option>{YEARS.map(y => <option key={y}>{y}</option>)}</select>
                </label>
                <label>Experience
                  <select value={form.experience} onChange={set('experience')}><option value="">Select…</option>{EXPERIENCE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </label>
                <label>Role you want<input value={form.targetRole} onChange={set('targetRole')} placeholder="e.g. Java Developer" maxLength={80} /></label>
                <label>City<input value={form.city} onChange={set('city')} maxLength={60} /></label>
                <label className="full">Key skills<textarea rows={2} value={form.skills} onChange={set('skills')} placeholder="e.g. Java, Spring Boot, SQL, React" maxLength={300} /></label>
              </div>
              <button className="ppr-submit" disabled={busy}>{busy ? 'Submitting…' : <>Register now <i className="bi bi-arrow-right" /></>}</button>
              <p className="ppr-fine"><i className="bi bi-shield-check" /> We use your number only to contact you about the Placement Program.</p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
};

export default PlacementProgramRegister;
