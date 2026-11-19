import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { referralApi, refErr, PublicInfo } from '../../api/referralApi';
import './referLanding.css';

/**
 * /refer/:code — the page a friend opens from a student's referral link. No account: the friend
 * leaves their name and number, becomes a CRM lead tagged with the referrer, and a counsellor calls.
 */
export default function ReferLanding() {
  const { code = '' } = useParams();
  const [info, setInfo] = useState<PublicInfo | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    referralApi.publicInfo(code).then(setInfo).catch(e => setLoadErr(refErr(e, 'This referral link is not valid.')));
  }, [code]);
  useEffect(() => { if (info) document.title = `Join ${info.institute.name}`; }, [info]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await referralApi.publicSubmit(code, { name, mobile, email: email || undefined, course: course || undefined }); setDone(true); }
    catch (x) { setErr(refErr(x)); } finally { setBusy(false); }
  };

  const brand = info?.institute;
  return (
    <div className="rfl">
      <div className="rfl-wrap">
        <div className="rfl-brand">
          <img src={brand?.logo || `${process.env.PUBLIC_URL}/assets/logo.png`} alt={brand?.name || 'CodeBegun'} />
        </div>

        {loadErr && (
          <div className="rfl-card rfl-center">
            <i className="bi bi-link-45deg rfl-big warn" />
            <h1>Link not found</h1>
            <p>{loadErr}</p>
          </div>
        )}

        {!loadErr && !info && <div className="rfl-card rfl-center"><span className="rfl-spin" /></div>}

        {info && done && (
          <div className="rfl-card rfl-center">
            <i className="bi bi-check-circle-fill rfl-big ok" />
            <h1>Thanks, {name.split(' ')[0]}!</h1>
            <p>A counsellor from {info.institute.name} will call you on {mobile} soon to help you pick the right course.</p>
          </div>
        )}

        {info && !done && (
          <div className="rfl-grid">
            <section className="rfl-pitch">
              <span className="rfl-eyebrow"><i className="bi bi-gift" /> Invited by {info.referrerFirstName}</span>
              <h1><span>{info.referrerFirstName}</span> thinks you'd love learning at {info.institute.name}</h1>
              <p>Job-ready courses with live classes, daily practice, AI interview prep and placement support. Leave your details and a counsellor will call you. There's no cost and no commitment.</p>
              <ul>
                <li><i className="bi bi-camera-video" /> Live classes and recorded lessons</li>
                <li><i className="bi bi-code-slash" /> Daily coding practice and projects</li>
                <li><i className="bi bi-robot" /> AI mock interviews and resume help</li>
                <li><i className="bi bi-briefcase" /> Placement support</li>
              </ul>
            </section>

            <section className="rfl-card">
              {!info.open ? (
                <div className="rfl-center">
                  <i className="bi bi-pause-circle rfl-big warn" />
                  <h2>Referrals are paused</h2>
                  <p>Please contact {info.institute.name} directly to ask about courses.</p>
                </div>
              ) : (
                <form className="rfl-form" onSubmit={submit}>
                  <h2>Get a call from a counsellor</h2>
                  <label>Your name<input value={name} onChange={e => setName(e.target.value)} required maxLength={80} autoComplete="name" /></label>
                  <label>Mobile number<input value={mobile} onChange={e => setMobile(e.target.value)} required inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" maxLength={16} /></label>
                  <label><span>Email <em>(optional)</em></span><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={120} /></label>
                  <label>Course you're interested in
                    <select value={course} onChange={e => setCourse(e.target.value)}>
                      <option value="">Not sure yet</option>
                      {info.courses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  {err && <div className="rfl-err">{err}</div>}
                  <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Request a call'}</button>
                  <small>Referral code {info.code}</small>
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
