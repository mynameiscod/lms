import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { placementPortalApi, PortalView, istTime, errMsg } from '../../api/placementProgramApi';
import { loadRazorpay } from '../../api/paymentApi';
import { AgreementStep, ChequeStep } from './PortalSteps';
import './placementProgram.css';

/**
 * The candidate's own page: pay the interview fee, then pick an interview time.
 * No login — the link in their WhatsApp/registration is the key, and it only ever shows their record.
 */

const istDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
const dayLabel = (day: string) => new Date(`${day}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });

/** A one-off .ics so the candidate can add the interview to any calendar. */
function downloadIcs(b: NonNullable<PortalView['booking']>, org: string) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CodeBegun//Placement//EN', 'BEGIN:VEVENT',
    `UID:placement-${b.id}@codebegun`, `DTSTAMP:${f(new Date().toISOString())}`, `DTSTART:${f(b.startsAt)}`, `DTEND:${f(b.endsAt)}`,
    `SUMMARY:${org} — interview`, `LOCATION:${b.meetingUrl}`, `URL:${b.meetingUrl}`, `DESCRIPTION:Join: ${b.meetingUrl}`,
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Interview', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'interview.ics';
  a.click();
}

const PlacementPortal: React.FC = () => {
  const { token = '' } = useParams();
  const [view, setView] = useState<PortalView | null>(null);
  const [slots, setSlots] = useState<{ startsAt: string; endsAt: string }[]>([]);
  const [day, setDay] = useState('');
  const [picked, setPicked] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const v = await placementPortalApi.view(token);
      setView(v); setError('');
      if (v.canBook) {
        const s = await placementPortalApi.slots(token);
        setSlots(s);
        setDay(d => (d && s.some(x => istDay(x.startsAt) === d)) ? d : (s[0] ? istDay(s[0].startsAt) : ''));
      } else setSlots([]);
    } catch (e) { setError(errMsg(e, 'Could not open this page.')); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => [...new Set(slots.map(s => istDay(s.startsAt)))], [slots]);
  const daySlots = slots.filter(s => istDay(s.startsAt) === day);

  const pay = async () => {
    setBusy('pay'); setError(''); setNotice('');
    try {
      if (!(await loadRazorpay())) throw new Error('Could not load the payment window. Check your connection and try again.');
      const o = await placementPortalApi.order(token);
      await new Promise<void>((resolve) => {
        const rzp = new (window as any).Razorpay({
          key: o.keyId, amount: o.amount, currency: o.currency || 'INR', order_id: o.orderId,
          name: view?.org || 'CodeBegun', description: 'Placement Program — interview fee',
          prefill: { name: o.name, contact: o.mobile, email: o.email || '' }, theme: { color: '#0b1a66' },
          handler: async (resp: any) => {
            try {
              await placementPortalApi.verify(token, { orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature });
              setNotice('Payment received. You can book your interview now.');
            } catch (e) { setNotice('Payment received — we are confirming it. This page will update in a moment.'); }
            resolve();
          },
          modal: { ondismiss: () => resolve() },
        });
        rzp.on('payment.failed', (r: any) => { setError(r?.error?.description || 'Payment failed. You can try again.'); resolve(); });
        rzp.open();
      });
      await load();
    } catch (e) { setError(errMsg(e)); }
    setBusy('');
  };

  const book = async () => {
    if (!picked) return;
    setBusy('book'); setError(''); setNotice('');
    try { await placementPortalApi.book(token, picked); setPicked(''); setNotice('Your interview is booked. We have sent the details to you.'); await load(); }
    catch (e) { setError(errMsg(e)); await load(); }
    setBusy('');
  };

  const cancel = async () => {
    if (!window.confirm('Cancel this interview? You can pick another time after.')) return;
    setBusy('cancel'); setError(''); setNotice('');
    try { await placementPortalApi.cancel(token); setNotice('Interview cancelled. Pick a new time below.'); await load(); }
    catch (e) { setError(errMsg(e)); }
    setBusy('');
  };

  if (!view) {
    return <div className="ppr"><main className="ppr-portal">{error ? <div className="ppr-err">{error}</div> : <p className="ppr-muted">Loading…</p>}</main></div>;
  }

  const showFee = view.fee.amountInr > 0 && !view.fee.waived;
  return (
    <div className="ppr">
      <header className="ppr-nav">
        <img src="/assets/careerpilot/careerpilot-logo.png" alt={view.org} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      </header>
      <main className="ppr-portal">
        <h1>Hi {view.name} 👋</h1>
        <p className="ppr-lead">Your {view.org} Placement Program page. {view.booking ? 'Your interview is booked.' : 'Two quick steps to your interview.'}</p>
        {error && <div className="ppr-err" role="alert">{error}</div>}
        {notice && <div className="ppr-ok" role="status">{notice}</div>}

        {showFee && (
          <section className={`ppr-step${view.fee.paid ? ' done' : ''}`}>
            <div className="ppr-step-head"><b>1</b><div><strong>Interview fee</strong><small>₹{view.fee.amountInr.toLocaleString('en-IN')}{view.fee.refundablePct ? ` · ${view.fee.refundablePct}% refundable if you are not selected` : ''}</small></div></div>
            {view.fee.paid ? <p className="ppr-done-line"><i className="bi bi-check-circle-fill" /> Paid</p> : (
              <button className="ppr-submit" disabled={!!busy} onClick={pay}>{busy === 'pay' ? 'Opening payment…' : <>Pay ₹{view.fee.amountInr.toLocaleString('en-IN')} <i className="bi bi-lock-fill" /></>}</button>
            )}
          </section>
        )}

        <section className={`ppr-step${view.booking ? ' done' : ''}`}>
          <div className="ppr-step-head"><b>{showFee ? 2 : 1}</b><div><strong>Book your interview</strong><small>Online, with our placement team. Times are in IST.</small></div></div>

          {view.booking ? (
            <div className="ppr-booked">
              <div className="when">{istTime(view.booking.startsAt)}</div>
              {view.booking.interviewer && <div className="with">with {view.booking.interviewer}</div>}
              <div className="ppr-booked-actions">
                <a className="ppr-btn primary" href={view.booking.meetingUrl} target="_blank" rel="noreferrer"><i className="bi bi-camera-video" /> Join interview</a>
                <button className="ppr-btn" onClick={() => downloadIcs(view.booking!, view.org)}><i className="bi bi-calendar-plus" /> Add to calendar</button>
                {view.booking.canCancel && <button className="ppr-btn danger" disabled={!!busy} onClick={cancel}>Cancel / change time</button>}
              </div>
            </div>
          ) : view.fee.payFirst ? (
            <p className="ppr-muted"><i className="bi bi-lock" /> Pay the interview fee above to unlock the calendar.</p>
          ) : !slots.length ? (
            <p className="ppr-muted">No interview times are open right now. Please check again later — our team will also contact you.</p>
          ) : (
            <>
              <div className="ppr-days" role="tablist">
                {days.map(d => <button key={d} className={d === day ? 'on' : ''} onClick={() => { setDay(d); setPicked(''); }}>{dayLabel(d)}</button>)}
              </div>
              <div className="ppr-times">
                {daySlots.map(s => <button key={s.startsAt} className={picked === s.startsAt ? 'on' : ''} onClick={() => setPicked(s.startsAt)}>{timeLabel(s.startsAt)}</button>)}
              </div>
              <button className="ppr-submit" disabled={!picked || !!busy} onClick={book}>
                {busy === 'book' ? 'Booking…' : picked ? <>Book {istTime(picked)} <i className="bi bi-arrow-right" /></> : 'Pick a time'}
              </button>
            </>
          )}
        </section>

        {view.agreement && <AgreementStep token={token} view={view} step={showFee ? 3 : 2} onDone={() => { setNotice('Agreement signed. Thank you.'); load(); }} />}
        {view.cheque && <ChequeStep token={token} view={view} step={showFee ? 4 : 3} onDone={() => { setNotice('Cheque uploaded. We will verify it.'); load(); }} />}
      </main>
    </div>
  );
};

export default PlacementPortal;
