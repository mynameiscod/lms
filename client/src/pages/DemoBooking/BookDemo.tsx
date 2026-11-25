import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  demoPublicApi, demoErr, demoErrCode, demoFieldErrors, Catalog, PublicSlot, istDayKey, fmtTime, fmtDayShort, fmtWhen,
} from '../../api/demoBookingApi';
import './demoBooking.css';

/**
 * /book-demo/<institute>?course=<key>&utm_source=… — the page the website's "Book a demo" button opens.
 * No login. Pick a course and a slot, give a name and mobile, verify the mobile by WhatsApp OTP, booked.
 * Then the visitor lands on their personal booking page (/demo-booking/<token>).
 */
type Step = 'slot' | 'details' | 'otp';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export default function BookDemo() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [course, setCourse] = useState(params.get('course') || '');
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState<PublicSlot | null>(null);
  const [step, setStep] = useState<Step>('slot');
  const [form, setForm] = useState({ name: '', phone: '', email: '', website: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState({ requestId: '', code: '', resendIn: 0, devCode: '' });
  const topRef = useRef<HTMLDivElement>(null);

  const load = () => demoPublicApi.catalog(slug).then((c) => { setCat(c); setLoadErr(''); }).catch((e) => setLoadErr(demoErr(e, 'Could not load the booking page.')));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [slug]);
  useEffect(() => { if (cat?.institute.name) document.title = `${cat.page.title} · ${cat.institute.name}`; }, [cat]);
  useEffect(() => { if (!otp.resendIn) return; const t = setTimeout(() => setOtp((o) => ({ ...o, resendIn: o.resendIn - 1 })), 1000); return () => clearTimeout(t); }, [otp.resendIn]);
  useEffect(() => { topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [step]);

  // A course link the site sent that has no slots falls back to all courses.
  const courseKey = cat?.courses.some((c) => c.key === course) ? course : cat?.courses.length === 1 ? cat.courses[0].key : '';
  const list = useMemo(() => (cat?.slots || []).filter((s) => !courseKey || s.courseKey === courseKey), [cat, courseKey]);
  const days = useMemo(() => [...new Set(list.map((s) => istDayKey(s.startsAt)))], [list]);
  const activeDay = day && days.includes(day) ? day : days[0] || '';
  const daySlots = list.filter((s) => istDayKey(s.startsAt) === activeDay);
  const utm = useMemo(() => Object.fromEntries(UTM_KEYS.map((k) => [k, params.get(k) || '']).filter(([, v]) => v)), [params]);

  const pickSlot = (s: PublicSlot) => { setSlot(s); setErr(''); setStep('details'); };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr(''); setFields({});
    const f: Record<string, string> = {};
    if (form.name.trim().length < 2) f.name = 'Enter your full name';
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '').slice(-10))) f.phone = 'Enter a valid 10-digit mobile number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) f.email = 'Enter a valid email, or leave it empty';
    if (Object.keys(f).length) { setFields(f); return; }
    setBusy(true);
    try {
      const r = await demoPublicApi.sendOtp(slug, form.phone, step === 'otp' ? otp.requestId : undefined);
      setOtp({ requestId: r.requestId, code: '', resendIn: r.resendAfterSec || 30, devCode: r.devCode || '' });
      setStep('otp');
    } catch (e2: any) {
      const wait = e2?.response?.data?.data?.resendAfterSec;
      if (wait) setOtp((o) => ({ ...o, resendIn: wait }));
      setErr(demoErr(e2, 'We could not send the code. Please try again.'));
    } finally { setBusy(false); }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot) return;
    if (!/^\d{4,8}$/.test(otp.code.trim())) { setErr('Enter the code we sent on WhatsApp.'); return; }
    setErr(''); setBusy(true);
    try {
      const v = await demoPublicApi.verifyOtp(slug, otp.requestId, otp.code.trim());
      const r = await demoPublicApi.book(slug, {
        slotId: slot._id, name: form.name.trim(), phone: form.phone, email: form.email.trim(), website: form.website,
        verificationToken: v.verificationToken, pageUrl: document.referrer || window.location.href, ...utm,
      });
      if (r.token) navigate(`/demo-booking/${r.token}?${r.rescheduled ? 'moved' : 'new'}=1`, { replace: true });
    } catch (e2) {
      const code = demoErrCode(e2);
      if (code === 'SLOT_GONE') { setErr(demoErr(e2)); setSlot(null); setStep('slot'); load(); }
      else if (Object.keys(demoFieldErrors(e2)).length) { setFields(demoFieldErrors(e2)); setStep('details'); }
      else setErr(demoErr(e2, 'Could not book. Please try again.'));
    } finally { setBusy(false); }
  };

  return (
    <div className="dmp">
      <div className="dmp-wrap" ref={topRef}>
        <header className="dmp-brand">
          {cat?.institute.logo ? <img src={cat.institute.logo} alt={cat.institute.name} /> : <span className="dmp-mark" aria-hidden="true">{(cat?.institute.name || 'D').charAt(0)}</span>}
          <span>{cat?.institute.name || ''}</span>
        </header>

        {loadErr ? <div className="dmp-card dmp-center"><i className="bi bi-calendar-x dmp-big-ic" /><h1>Booking unavailable</h1><p>{loadErr}</p></div> : !cat ? (
          <div className="dmp-card dmp-center"><span className="dmp-spin" /> Loading…</div>
        ) : (
          <>
            <div className="dmp-hero">
              <h1>{cat.page.title}</h1>
              {cat.page.subtitle && <p>{cat.page.subtitle}</p>}
              <ol className="dmp-steps" aria-label="Steps">
                {(['Pick a time', 'Your details', 'Verify'] as const).map((l, i) => {
                  const n = step === 'slot' ? 0 : step === 'details' ? 1 : 2;
                  return <li key={l} className={i === n ? 'on' : i < n ? 'done' : ''}><span>{i < n ? <i className="bi bi-check-lg" /> : i + 1}</span>{l}</li>;
                })}
              </ol>
            </div>

            {err && <div className="dmp-alert" role="alert"><i className="bi bi-exclamation-circle" /> {err}</div>}

            {step === 'slot' && (
              <section className="dmp-card">
                {cat.slots.length === 0 ? (
                  <div className="dmp-center"><i className="bi bi-calendar2-week dmp-big-ic" /><h2>No demo times open right now</h2><p>New times are added regularly. Please check again soon.</p></div>
                ) : (
                  <>
                    {cat.courses.length > 1 && (
                      <div className="dmp-block">
                        <h2 className="dmp-h">Course</h2>
                        <div className="dmp-chips" role="radiogroup" aria-label="Course">
                          {cat.courses.map((c) => (
                            <button key={c.key} type="button" role="radio" aria-checked={courseKey === c.key} className={courseKey === c.key ? 'on' : ''} onClick={() => { setCourse(c.key); setDay(''); }}>{c.name}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {cat.courses.length > 1 && !courseKey ? <p className="dmp-muted">Choose a course to see its demo times.</p> : (
                      <>
                        <div className="dmp-block">
                          <h2 className="dmp-h">Date</h2>
                          <div className="dmp-days" role="tablist" aria-label="Date">
                            {days.map((d) => {
                              const first = list.find((s) => istDayKey(s.startsAt) === d)!;
                              const [wd, dd, mm] = fmtDayShort(first.startsAt).replace(',', '').split(' ');
                              return (
                                <button key={d} type="button" role="tab" aria-selected={activeDay === d} className={activeDay === d ? 'on' : ''} onClick={() => setDay(d)}>
                                  <small>{wd}</small><b>{dd}</b><small>{mm}</small>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="dmp-block">
                          <h2 className="dmp-h">Time <span>(India time)</span></h2>
                          <div className="dmp-slots">
                            {daySlots.map((s) => (
                              <button key={s._id} type="button" className="dmp-slot" onClick={() => pickSlot(s)}>
                                <span className="dmp-slot-time">{fmtTime(s.startsAt)}</span>
                                <span className="dmp-slot-info">
                                  <b>{s.title}</b>
                                  <small>{s.durationMin} min{s.hostName ? ` · with ${s.hostName}` : ''}</small>
                                </span>
                                <span className={`dmp-seats${s.seatsLeft <= 5 ? ' few' : ''}`}>{s.seatsLeft <= 5 ? `Only ${s.seatsLeft} left` : `${s.seatsLeft} seats`}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </section>
            )}

            {step !== 'slot' && slot && (
              <section className="dmp-card">
                <div className="dmp-picked">
                  <i className="bi bi-calendar-check" />
                  <div><b>{slot.title}</b><span>{fmtWhen(slot.startsAt)} IST · {slot.durationMin} min</span></div>
                  <button type="button" className="dmp-link" onClick={() => { setStep('slot'); setErr(''); }}>Change</button>
                </div>
                {slot.description && <p className="dmp-muted dmp-desc">{slot.description}</p>}

                {step === 'details' ? (
                  <form className="dmp-form" onSubmit={sendCode} noValidate>
                    <label>Full name
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" maxLength={120} aria-invalid={!!fields.name} />
                      {fields.name && <em role="alert">{fields.name}</em>}
                    </label>
                    <label>Mobile number <small>(WhatsApp)</small>
                      <div className="dmp-phone"><span>+91</span><input inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10) })} autoComplete="tel-national" aria-invalid={!!fields.phone} /></div>
                      {fields.phone && <em role="alert">{fields.phone}</em>}
                    </label>
                    <label>Email <small>(optional, for the calendar invite)</small>
                      <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" maxLength={200} aria-invalid={!!fields.email} />
                      {fields.email && <em role="alert">{fields.email}</em>}
                    </label>
                    {/* Bots fill every field; people never see this one. */}
                    <input className="dmp-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                    <button type="submit" className="dmp-btn" disabled={busy}>{busy ? 'Sending code…' : <>Continue <i className="bi bi-arrow-right" /></>}</button>
                    <p className="dmp-fine">We'll send a code on WhatsApp to confirm your number.</p>
                  </form>
                ) : (
                  <form className="dmp-form" onSubmit={confirm}>
                    <p className="dmp-otp-line">Enter the code sent on WhatsApp to <b>+91 {form.phone}</b>. <button type="button" className="dmp-link" onClick={() => setStep('details')}>Edit number</button></p>
                    {otp.devCode && <p className="dmp-dev">Test code: <b>{otp.devCode}</b></p>}
                    <input className="dmp-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={otp.code} onChange={(e) => setOtp({ ...otp, code: e.target.value.replace(/\D/g, '') })} aria-label="Verification code" autoFocus />
                    <button type="submit" className="dmp-btn" disabled={busy}>{busy ? 'Booking…' : <>Confirm my seat <i className="bi bi-check2" /></>}</button>
                    <p className="dmp-fine">{otp.resendIn > 0 ? `Resend the code in ${otp.resendIn}s` : <button type="button" className="dmp-link" onClick={() => sendCode()} disabled={busy}>Resend the code</button>}</p>
                  </form>
                )}
              </section>
            )}
            <p className="dmp-foot">Free · Online · Join from your phone or laptop with no installation</p>
          </>
        )}
      </div>
    </div>
  );
}
