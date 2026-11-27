import React, { useCallback, useEffect, useState } from 'react';
import { referralApi, refErr, MyPage, PayoutDetails, STATUS_LABEL, inr, shortDate, referLink } from '../../api/referralApi';
import { Modal } from './Modal';
import './referEarn.css';

/**
 * REFER & EARN — the student's page (LMS only; CareerPilot has its own coin referral).
 * Share the link → the friend joins and pays the full fee → the reward is held, then it can be
 * withdrawn to UPI or a bank account.
 */

type Tab = 'referrals' | 'payouts';

export default function ReferEarn() {
  const [data, setData] = useState<MyPage | null>(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<Tab>('referrals');
  const [toast, setToast] = useState('');
  const [referOpen, setReferOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const load = useCallback(() => {
    referralApi.me().then(d => { setData(d); setErr(''); }).catch(e => setErr(refErr(e, 'Could not load Refer & Earn.')));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); }, [toast]);

  if (err && !data) return <div className="rfe"><div className="rfe-alert">{err}</div></div>;
  if (!data) return <div className="rfe"><div className="rfe-state"><span className="rfe-spin" /> Loading…</div></div>;

  const { program, stats, code } = data;
  const reward = inr(program.rewardAmount);
  const link = code ? referLink(code) : '';
  const canRefer = data.eligible && program.enabled && !!code;
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setToast(`${what} copied`); } catch { setToast(text); }
  };
  const waText = encodeURIComponent(`Hey! I'm doing my course here and it has been really good. If you're thinking of learning tech, sign up with my link and a counsellor will call you: ${link}`);

  return (
    <div className="rfe">
      <header className="rfe-head">
        <div>
          <span className="rfe-eyebrow">Refer &amp; Earn</span>
          <h1>Refer a friend, earn <span>{reward}</span></h1>
          <p>When a friend you refer joins any course and pays the full fee, {reward} is yours {program.holdDays > 0 ? `${program.holdDays} days later` : 'right away'}. There's no limit on how many friends you refer.</p>
        </div>
        {canRefer && (
          <button type="button" className="rfe-btn primary lg" onClick={() => setReferOpen(true)}><i className="bi bi-person-plus" /> Refer a friend</button>
        )}
      </header>

      {!data.eligible && <div className="rfe-alert warn"><i className="bi bi-info-circle" /> {data.reason || 'Refer & Earn is not open for you yet.'}</div>}
      {data.eligible && !program.enabled && <div className="rfe-alert warn"><i className="bi bi-pause-circle" /> Refer &amp; Earn is paused right now. Your earned rewards are safe and you can still withdraw them.</div>}

      <div className="rfe-top">
        {code ? (
          <section className="rfe-card rfe-share">
            <div className="rfe-card-title"><i className="bi bi-share" /> Your referral link</div>
            <div className="rfe-code-row">
              <div className="rfe-code"><small>Your code</small><b>{code}</b></div>
              <button type="button" className="rfe-btn" onClick={() => copy(code, 'Code')}><i className="bi bi-copy" /> Copy code</button>
            </div>
            <div className="rfe-link">
              <span title={link}>{link}</span>
              <button type="button" className="rfe-btn" onClick={() => copy(link, 'Link')}><i className="bi bi-link-45deg" /> Copy link</button>
            </div>
            {canRefer && (
              <div className="rfe-share-actions">
                <a className="rfe-btn wa" href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer"><i className="bi bi-whatsapp" /> Share on WhatsApp</a>
                <button type="button" className="rfe-btn ghost" onClick={() => setReferOpen(true)}><i className="bi bi-pencil-square" /> Add a friend's details</button>
              </div>
            )}
          </section>
        ) : (
          <section className="rfe-card rfe-share"><div className="rfe-empty"><i className="bi bi-gift" /> Your referral link appears here once you're enrolled in a course.</div></section>
        )}

        <section className="rfe-card rfe-wallet">
          <div className="rfe-card-title"><i className="bi bi-wallet2" /> Your rewards</div>
          <div className="rfe-avail"><small>Ready to withdraw</small><b>{inr(stats.available)}</b></div>
          <button type="button" className="rfe-btn primary" disabled={stats.available < 1 || stats.requested > 0} onClick={() => setWithdrawOpen(true)}>
            <i className="bi bi-bank" /> {stats.requested > 0 ? 'Withdrawal in progress' : 'Withdraw'}
          </button>
          <div className="rfe-mini">
            <div><span>On hold</span><b>{inr(stats.onHoldAmount)}</b></div>
            <div><span>Being paid</span><b>{inr(stats.requested)}</b></div>
            <div><span>Paid to you</span><b>{inr(stats.paidOut)}</b></div>
          </div>
        </section>
      </div>

      <div className="rfe-stats">
        <div><b>{stats.invited}</b><span>Friends referred</span></div>
        <div><b>{stats.joined + stats.onHold + stats.earnedCount}</b><span>Joined</span></div>
        <div><b>{stats.onHold}</b><span>On hold</span></div>
        <div><b>{stats.earnedCount}</b><span>Rewards earned</span></div>
        <div className="hl"><b>{inr(stats.earned)}</b><span>Total earned</span></div>
      </div>

      <section className="rfe-steps" aria-label="How it works">
        {[
          ['bi-send', 'Share your link', 'Send it to friends who want to learn.'],
          ['bi-telephone', 'They enquire', 'A counsellor calls and helps them pick a course.'],
          ['bi-mortarboard', 'They join and pay', `Once the full fee is paid, ${reward} goes on hold for you.`],
          ['bi-cash-coin', 'You get paid', `After ${program.holdDays} days, withdraw to UPI or your bank account.`],
        ].map(([ic, t, d], i) => (
          <div key={t} className="rfe-step">
            <span className="rfe-step-n">{i + 1}</span>
            <i className={`bi ${ic}`} />
            <div><b>{t}</b><p>{d}</p></div>
          </div>
        ))}
      </section>

      <nav className="rfe-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'referrals'} className={tab === 'referrals' ? 'on' : ''} onClick={() => setTab('referrals')}>My referrals <em>{data.referrals.length}</em></button>
        <button type="button" role="tab" aria-selected={tab === 'payouts'} className={tab === 'payouts' ? 'on' : ''} onClick={() => setTab('payouts')}>Withdrawals <em>{data.payouts.length}</em></button>
      </nav>

      {tab === 'referrals' && (
        <section className="rfe-card">
          {data.referrals.length === 0 ? (
            <div className="rfe-empty"><i className="bi bi-people" /> No referrals yet. Share your link to get started.</div>
          ) : (
            <ul className="rfe-list">
              {data.referrals.map(r => (
                <li key={r._id} className="rfe-row">
                  <span className="rfe-avatar">{(r.friendName || '?').slice(0, 1).toUpperCase()}</span>
                  <div className="rfe-row-main">
                    <b>{r.friendName}</b>
                    <span>{[r.friendPhone, r.course, `Referred ${shortDate(r.createdAt)}`].filter(Boolean).join(' · ')}</span>
                  </div>
                  <div className="rfe-row-end">
                    <span className={`rfe-chip ${r.status}`}>{STATUS_LABEL[r.status]}</span>
                    <small>
                      {r.status === 'pending' && 'Waiting for them to join'}
                      {r.status === 'joined' && 'Waiting for the full fee'}
                      {r.status === 'on_hold' && `${inr(r.rewardAmount)} unlocks ${shortDate(r.holdUntil)}`}
                      {r.status === 'earned' && `${inr(r.rewardAmount)} earned`}
                      {r.status === 'rejected' && (r.rejectedReason || 'Does not count')}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'payouts' && (
        <section className="rfe-card">
          {data.payouts.length === 0 ? (
            <div className="rfe-empty"><i className="bi bi-bank" /> No withdrawals yet.</div>
          ) : (
            <ul className="rfe-list">
              {data.payouts.map(p => (
                <li key={p._id} className="rfe-row">
                  <span className="rfe-avatar money"><i className={`bi ${p.details?.method === 'upi' ? 'bi-phone' : 'bi-bank'}`} /></span>
                  <div className="rfe-row-main">
                    <b>{inr(p.amount)}</b>
                    <span>{p.details?.method === 'upi' ? `UPI · ${p.details.upiId}` : `Bank · ${p.details?.accountNumber || ''}${p.details?.ifsc ? ` · ${p.details.ifsc}` : ''}`} · Asked {shortDate(p.createdAt)}</span>
                  </div>
                  <div className="rfe-row-end">
                    <span className={`rfe-chip pay-${p.status}`}>{p.status === 'requested' ? 'Being paid' : p.status === 'paid' ? 'Paid' : 'Not sent'}</span>
                    <small>
                      {p.status === 'paid' && `${shortDate(p.paidAt)}${p.reference ? ` · Ref ${p.reference}` : ''}`}
                      {p.status === 'requested' && 'The institute will send it soon'}
                      {p.status === 'rejected' && (p.rejectedReason || 'Back in your balance')}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rfe-card rfe-terms">
        <button type="button" className="rfe-terms-toggle" aria-expanded={termsOpen} onClick={() => setTermsOpen(!termsOpen)}>
          <span><i className="bi bi-file-text" /> Terms</span><i className={`bi ${termsOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
        </button>
        {termsOpen && <ul>{program.terms.split('\n').map(l => l.trim()).filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>}
      </section>

      {referOpen && <ReferModal courses={program.courses} reward={reward} onClose={() => setReferOpen(false)} onDone={() => { setReferOpen(false); setToast('Thanks! A counsellor will call your friend.'); load(); }} />}
      {withdrawOpen && <WithdrawModal data={data} onClose={() => setWithdrawOpen(false)} onDone={(amt) => { setWithdrawOpen(false); setToast(`Withdrawal of ${inr(amt)} requested`); setTab('payouts'); load(); }} />}
      {toast && <div className="rfe-toast" role="status"><i className="bi bi-check-circle-fill" /> {toast}</div>}
    </div>
  );
}

/* ───────────────────────────── Refer a friend ───────────────────────────── */

function ReferModal({ courses, reward, onClose, onDone }: { courses: string[]; reward: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await referralApi.refer({ name, mobile, email: email || undefined, course: course || undefined }); onDone(); }
    catch (x) { setErr(refErr(x)); } finally { setBusy(false); }
  };
  return (
    <Modal title="Refer a friend" onClose={onClose}>
      <form className="rfe-form" onSubmit={submit}>
        <p className="rfe-form-note">We'll call your friend to help them pick a course. You earn {reward} when they join and pay the full fee.</p>
        <label>Friend's name<input value={name} onChange={e => setName(e.target.value)} required maxLength={80} autoFocus /></label>
        <label>Mobile number<input value={mobile} onChange={e => setMobile(e.target.value)} required inputMode="tel" placeholder="10-digit mobile" maxLength={16} /></label>
        <label><span>Email <em>(optional)</em></span><input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} /></label>
        <label><span>Course they're interested in <em>(optional)</em></span>
          <select value={course} onChange={e => setCourse(e.target.value)}>
            <option value="">Not sure yet</option>
            {courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {err && <div className="rfe-alert">{err}</div>}
        <div className="rfe-form-actions">
          <button type="button" className="rfe-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="rfe-btn primary" disabled={busy}>{busy ? 'Sending…' : 'Refer'}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ───────────────────────────── Withdraw ───────────────────────────── */

function WithdrawModal({ data, onClose, onDone }: { data: MyPage; onClose: () => void; onDone: (amount: number) => void }) {
  const saved = data.payoutDetails;
  const [method, setMethod] = useState<'upi' | 'bank'>(saved?.method || 'upi');
  const [amount, setAmount] = useState(String(data.stats.available));
  const [upiId, setUpiId] = useState(saved?.method === 'upi' ? saved.upiId || '' : '');
  const [useSaved, setUseSaved] = useState(data.hasSavedBank);
  const [bank, setBank] = useState<PayoutDetails>({ method: 'bank', holderName: '', accountNumber: '', ifsc: '', bankName: '' });
  const [confirmAcc, setConfirmAcc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const min = Math.min(data.program.minPayout, data.stats.available);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const amt = Math.round(Number(amount));
    if (method === 'bank' && !(useSaved && data.hasSavedBank) && bank.accountNumber !== confirmAcc) { setErr('The two account numbers do not match.'); return; }
    setBusy(true);
    try {
      const body = method === 'upi'
        ? { amount: amt, details: { method: 'upi' as const, upiId } }
        : useSaved && data.hasSavedBank ? { amount: amt, useSaved: true } : { amount: amt, details: bank };
      await referralApi.withdraw(body);
      onDone(amt);
    } catch (x) { setErr(refErr(x)); } finally { setBusy(false); }
  };

  return (
    <Modal title="Withdraw your rewards" onClose={onClose}>
      <form className="rfe-form" onSubmit={submit}>
        <label>Amount (₹)
          <input type="number" min={min} max={data.stats.available} step={1} value={amount} onChange={e => setAmount(e.target.value)} required />
          <small>Up to {inr(data.stats.available)}{min < data.stats.available ? ` · smallest ${inr(min)}` : ''}</small>
        </label>
        <div className="rfe-seg" role="radiogroup" aria-label="Pay to">
          <button type="button" role="radio" aria-checked={method === 'upi'} className={method === 'upi' ? 'on' : ''} onClick={() => setMethod('upi')}><i className="bi bi-phone" /> UPI</button>
          <button type="button" role="radio" aria-checked={method === 'bank'} className={method === 'bank' ? 'on' : ''} onClick={() => setMethod('bank')}><i className="bi bi-bank" /> Bank account</button>
        </div>
        {method === 'upi' && (
          <label>UPI ID<input value={upiId} onChange={e => setUpiId(e.target.value.trim())} required placeholder="name@okaxis" maxLength={120} /></label>
        )}
        {method === 'bank' && data.hasSavedBank && (
          <label className="rfe-check"><input type="checkbox" checked={useSaved} onChange={e => setUseSaved(e.target.checked)} /> Use my saved account {saved?.accountNumber} {saved?.ifsc ? `· ${saved.ifsc}` : ''}</label>
        )}
        {method === 'bank' && !(useSaved && data.hasSavedBank) && (
          <>
            <label>Account holder name<input value={bank.holderName} onChange={e => setBank({ ...bank, holderName: e.target.value })} required maxLength={100} /></label>
            <div className="rfe-two">
              <label>Account number<input value={bank.accountNumber} onChange={e => setBank({ ...bank, accountNumber: e.target.value.replace(/\D/g, '') })} required inputMode="numeric" maxLength={18} /></label>
              <label>Confirm account number<input value={confirmAcc} onChange={e => setConfirmAcc(e.target.value.replace(/\D/g, ''))} required inputMode="numeric" maxLength={18} onPaste={e => e.preventDefault()} /></label>
            </div>
            <div className="rfe-two">
              <label>IFSC<input value={bank.ifsc} onChange={e => setBank({ ...bank, ifsc: e.target.value.toUpperCase().trim() })} required placeholder="SBIN0001234" maxLength={11} /></label>
              <label><span>Bank name <em>(optional)</em></span><input value={bank.bankName} onChange={e => setBank({ ...bank, bankName: e.target.value })} maxLength={100} /></label>
            </div>
          </>
        )}
        <p className="rfe-form-note">The institute checks the details and sends the money. You'll see the transaction reference here once it's paid.</p>
        {err && <div className="rfe-alert">{err}</div>}
        <div className="rfe-form-actions">
          <button type="button" className="rfe-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="rfe-btn primary" disabled={busy}>{busy ? 'Sending…' : 'Request withdrawal'}</button>
        </div>
      </form>
    </Modal>
  );
}
