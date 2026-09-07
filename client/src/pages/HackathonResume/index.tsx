/**
 * "Finish paying for your hackathon place."
 *
 * THE PAGE THE LINK POINTS AT. The confirmation email and the WhatsApp message both send a
 * student to /hackathons/resume/:code, and until now there was nothing here — the registration
 * form lives on codebegun.com, so the platform had no public hackathon page at all and every
 * one of those links landed on a 404. That is the whole reported fault seen from the student's
 * side: they were told to come back, and there was nowhere to come back to.
 *
 * THE CODE IS THE ONLY CREDENTIAL, which is why this screen shows only what the team already
 * knows about itself — its name, its members' names, what it owes. No contact details are
 * rendered, because the server does not return any.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { loadRazorpay } from '../../api/paymentApi';
import './resume.css';

const API = (process.env.REACT_APP_API_URL || '/api/v1') + '/public';

interface Member { name: string; isLead?: boolean }
interface Registration {
  registrationCode: string; teamName: string; college: string;
  status: string; amountInr?: number; teamSize: number; members: Member[];
  confirmedAt?: string | null; createdAt?: string;
}
interface EventInfo { title: string; slug?: string; startAt?: string; venue?: string }

const rupees = (n?: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const when = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN',
      { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
};

const HackathonResume: React.FC = () => {
  const { code = '' } = useParams<{ code: string }>();
  const [reg, setReg] = useState<Registration | null>(null);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/hackathons/registration/${encodeURIComponent(code)}`);
      const d = await r.json();
      if (!r.ok || !d.success) { setError(d.message || 'We could not find that registration.'); return; }
      setReg(d.registration); setEvent(d.hackathon || null);
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally { setLoading(false); }
  }, [code]);

  useEffect(() => { load(); }, [load]);

  const paid = reg?.status === 'confirmed';

  const pay = async () => {
    setError(''); setNotice(''); setPaying(true);
    try {
      const ready = await loadRazorpay();
      if (!ready) { setError('Could not open the payment window. Check your connection and try again.'); return; }

      const r = await fetch(`${API}/hackathons/registration/${encodeURIComponent(code)}/pay`, { method: 'POST' });
      const d = await r.json();
      if (!r.ok || !d.success) { setError(d.message || 'Could not reopen that payment.'); return; }
      // Settled while they were away — the webhook beat the browser back.
      if (d.alreadyPaid) { await load(); setNotice('This registration is already paid. You are in.'); return; }

      /**
       * Redirect mode as well as the in-page handler. On a phone, in incognito, or with popups
       * blocked, the handler never fires and the student is left staring at a spinner having
       * genuinely paid — the exact failure this whole feature exists to stop.
       */
      const apiRoot = process.env.REACT_APP_API_URL || '/api/v1';
      const base = apiRoot.startsWith('http') ? apiRoot : window.location.origin + apiRoot;
      const backHere = `/hackathons/resume/${encodeURIComponent(code)}`;
      const callbackUrl = `${base}/payments/return?to=${encodeURIComponent(backHere)}`;

      const rzp = new (window as any).Razorpay({
        key: d.payment.keyId,
        amount: d.payment.amount,
        currency: d.payment.currency || 'INR',
        name: event?.title || 'Hackathon',
        description: `Team ${reg?.teamName || ''}`.trim(),
        order_id: d.payment.orderId,
        theme: { color: '#051D64' },
        callback_url: callbackUrl,
        handler: async (resp: any) => {
          try {
            const v = await fetch(`${API}/hackathons/payment/verify`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(resp),
            });
            const vd = await v.json();
            if (vd.pending) setNotice(vd.message || 'Payment received — we are confirming it now.');
            await load();
          } catch {
            // The money has left their account; never show a failure for a payment that
            // probably worked. The webhook settles it either way.
            setNotice('Payment received. We are confirming it — you will get a message shortly.');
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.on('payment.failed', (resp: any) =>
        setError(resp?.error?.description || 'That payment did not go through. You can try again.'));
      rzp.open();
    } catch {
      setError('Something went wrong opening the payment window. Please try again.');
    } finally { setPaying(false); }
  };

  if (loading) {
    return <div className="hkr-wrap"><div className="hkr-card hkr-muted">Loading your registration…</div></div>;
  }

  if (!reg) {
    return (
      <div className="hkr-wrap">
        <div className="hkr-card">
          <h1 className="hkr-title">Registration not found</h1>
          <p className="hkr-muted">
            {error || 'Check the link in your email or WhatsApp — the code may be incomplete.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="hkr-wrap">
      <div className="hkr-card">
        <div className={`hkr-status ${paid ? 'is-paid' : 'is-pending'}`}>
          {paid ? 'Confirmed' : 'Payment pending'}
        </div>

        <h1 className="hkr-title">{event?.title || 'Your registration'}</h1>
        {event?.startAt && (
          <p className="hkr-sub">{when(event.startAt)}{event.venue ? ` · ${event.venue}` : ''}</p>
        )}

        {paid ? (
          <p className="hkr-lede">Your team is registered. Bring your registration code to the venue.</p>
        ) : (
          <p className="hkr-lede">
            Your team is saved, but <strong>your place is not confirmed until payment is complete</strong>.
          </p>
        )}

        <dl className="hkr-facts">
          <div><dt>Team</dt><dd>{reg.teamName}</dd></div>
          <div><dt>Registration code</dt><dd className="hkr-code">{reg.registrationCode}</dd></div>
          <div><dt>College</dt><dd>{reg.college}</dd></div>
          <div><dt>Members</dt><dd>{reg.members.map(m => m.name).join(', ')}</dd></div>
          {!!reg.amountInr && (
            <div><dt>{paid ? 'Fee paid' : 'Amount due'}</dt><dd>{rupees(reg.amountInr)}</dd></div>
          )}
        </dl>

        {notice && <div className="hkr-notice">{notice}</div>}
        {error && <div className="hkr-error">{error}</div>}

        {!paid && (
          <>
            <button className="hkr-pay" onClick={pay} disabled={paying}>
              {paying ? 'Opening payment…' : `Complete payment — ${rupees(reg.amountInr)}`}
            </button>
            <p className="hkr-fine">
              If your payment failed or the page closed, use this link again rather than filling
              the form a second time — it returns you to this same registration.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default HackathonResume;
