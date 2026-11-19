import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  referralApi, refErr, AdminReferral, AdminSummary, Payout, Program, ReferralStatus, STATUS_LABEL, inr, shortDate,
} from '../../api/referralApi';
import { Modal } from './Modal';
import './referEarn.css';
import './adminReferrals.css';

/**
 * REFERRALS — admin screen for LMS Refer & Earn (manage_referrals).
 *   Referrals  every referred friend, their fee progress and status; add one by code, reject, restore.
 *   Payouts    withdrawals waiting to be sent: pay by UPI / bank, then mark paid with the reference.
 *   Settings   reward, hold days, smallest withdrawal, courses on the form, terms.
 * The status moves on its own (full fee paid → on hold → earned); this screen is for the exceptions.
 */

type Tab = 'referrals' | 'payouts' | 'settings';

export default function AdminReferrals() {
  const [tab, setTab] = useState<Tab>('referrals');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [toast, setToast] = useState('');
  const loadSummary = useCallback(() => { referralApi.summary().then(setSummary).catch(() => {}); }, []);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); }, [toast]);
  const say = (s: string) => { setToast(s); loadSummary(); };

  return (
    <div className="rfa">
      <header className="rfa-head">
        <div>
          <span className="rfa-eyebrow">LMS · Refer &amp; Earn</span>
          <h1>Referrals</h1>
          <p>Students share their link; a friend who joins and pays the full fee earns them the reward after the hold period. Statuses move on their own as fees are paid. You send the payouts.</p>
        </div>
        {summary && (
          <div className="rfa-pills">
            <span className="rfa-pill"><i className="bi bi-people" /> {summary.total} referred</span>
            {summary.requested.n > 0 && <button type="button" className="rfa-pill warn" onClick={() => setTab('payouts')}><i className="bi bi-hourglass-split" /> {summary.requested.n} payout{summary.requested.n === 1 ? '' : 's'} to send · {inr(summary.requested.amount)}</button>}
          </div>
        )}
      </header>

      <nav className="rfa-tabs" role="tablist">
        {([['referrals', 'bi-people', 'Referrals'], ['payouts', 'bi-cash-coin', 'Payouts'], ['settings', 'bi-sliders', 'Settings']] as const).map(([k, ic, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            <i className={`bi ${ic}`} /> {l}{k === 'payouts' && summary && summary.requested.n > 0 ? <em>{summary.requested.n}</em> : null}
          </button>
        ))}
      </nav>

      {tab === 'referrals' && <ReferralsTab summary={summary} onToast={say} />}
      {tab === 'payouts' && <PayoutsTab onToast={say} />}
      {tab === 'settings' && <SettingsTab onToast={say} />}

      {toast && <div className="rfe-toast" role="status"><i className="bi bi-check-circle-fill" /> {toast}</div>}
    </div>
  );
}

/* ───────────────────────────── Referrals ───────────────────────────── */

const FILTERS: [string, string][] = [['all', 'All'], ['pending', 'Enquired'], ['joined', 'Joined'], ['on_hold', 'On hold'], ['earned', 'Earned'], ['rejected', 'Not counted']];

function ReferralsTab({ summary, onToast }: { summary: AdminSummary | null; onToast: (s: string) => void }) {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: AdminReferral[]; total: number; pages: number } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState('');
  const [adding, setAdding] = useState(false);
  const [rejecting, setRejecting] = useState<AdminReferral | null>(null);

  const load = useCallback(() => {
    referralApi.list({ status, search: q, page }).then(d => { setData(d); setErr(''); }).catch(e => setErr(refErr(e, 'Could not load referrals.')));
  }, [status, q, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);

  const act = async (id: string, fn: () => Promise<any>, done: string) => {
    setBusy(id);
    try { await fn(); onToast(done); load(); } catch (e) { onToast(refErr(e)); } finally { setBusy(''); }
  };
  const c = summary?.counts;

  return (
    <>
      {summary && (
        <div className="rfa-tiles">
          <div><span>Enquired</span><b>{c?.pending ?? 0}</b></div>
          <div><span>Joined, fee pending</span><b>{c?.joined ?? 0}</b></div>
          <div className="amber"><span>On hold</span><b>{c?.on_hold ?? 0}</b><small>{inr(summary.onHoldAmount)}</small></div>
          <div className="green"><span>Earned</span><b>{c?.earned ?? 0}</b><small>{inr(summary.earnedAmount)}</small></div>
          <div><span>Paid out</span><b>{inr(summary.paidOut)}</b></div>
          <div className="rfa-top">
            <span>Top referrers</span>
            {summary.top.length === 0 ? <small>None yet</small> : (
              <ol>{summary.top.slice(0, 3).map(t => <li key={t._id}><b>{t.name}</b> <small>{t.joined} joined</small></li>)}</ol>
            )}
          </div>
        </div>
      )}

      <section className="rfa-card">
        <div className="rfa-toolbar">
          <div className="rfa-seg" role="tablist">
            {FILTERS.map(([k, l]) => (
              <button key={k} type="button" className={status === k ? 'on' : ''} onClick={() => { setStatus(k); setPage(1); }}>
                {l}{k !== 'all' && c ? <em>{c[k as ReferralStatus] ?? 0}</em> : null}
              </button>
            ))}
          </div>
          <div className="rfa-toolbar-end">
            <label className="rfa-search"><i className="bi bi-search" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Friend, phone, student or code" /></label>
            <button type="button" className="rfe-btn primary" onClick={() => setAdding(true)}><i className="bi bi-plus-lg" /> Add referral</button>
          </div>
        </div>

        {err && <div className="rfe-alert">{err}</div>}
        {!data ? <div className="rfe-state"><span className="rfe-spin" /></div> : data.rows.length === 0 ? (
          <div className="rfe-empty"><i className="bi bi-people" /> No referrals {status !== 'all' || q ? 'match this filter' : 'yet'}.</div>
        ) : (
          <div className="rfa-table-wrap">
            <table className="rfa-table">
              <thead><tr><th>Friend</th><th>Referred by</th><th>Fee</th><th>Status</th><th>Referred</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {data.rows.map(r => {
                  const pct = r.fee && r.fee.net > 0 ? Math.min(100, Math.round((r.fee.paid / r.fee.net) * 100)) : 0;
                  return (
                    <React.Fragment key={r._id}>
                      <tr>
                        <td data-label="Friend">
                          <b>{r.friendName}</b>
                          <small>{r.friendPhone}{r.course ? ` · ${r.course}` : ''}</small>
                          {r.leadId && <Link className="rfa-link" to={`/leads/${r.leadId}`}>Open lead</Link>}
                        </td>
                        <td data-label="Referred by"><b>{r.referrerName}</b><small>{r.code} · {r.via === 'link' ? 'link' : r.via === 'app' ? 'in app' : 'added by admin'}</small></td>
                        <td data-label="Fee">
                          {!r.fee ? <small>Not a student yet</small> : r.fee.net === 0 ? <small>No fee set</small> : (
                            <div className="rfa-fee"><div className="rfa-bar"><i style={{ width: `${pct}%` }} className={pct >= 100 ? 'full' : ''} /></div><small>{inr(r.fee.paid)} of {inr(r.fee.net)}</small></div>
                          )}
                        </td>
                        <td data-label="Status">
                          <span className={`rfe-chip ${r.status}`}>{STATUS_LABEL[r.status]}</span>
                          <small>
                            {r.status === 'on_hold' && `${inr(r.rewardAmount)} on ${shortDate(r.holdUntil)}`}
                            {r.status === 'earned' && `${inr(r.rewardAmount)} · ${shortDate(r.earnedAt)}`}
                            {r.status === 'rejected' && r.rejectedReason}
                          </small>
                        </td>
                        <td data-label="Referred"><small>{shortDate(r.createdAt)}</small></td>
                        <td className="rfa-actions">
                          <button type="button" className="rfe-btn sm ghost" title="History" aria-expanded={open === r._id} onClick={() => setOpen(open === r._id ? '' : r._id)}><i className="bi bi-clock-history" /></button>
                          {r.status !== 'rejected' && r.status !== 'earned' && <button type="button" className="rfe-btn sm" disabled={busy === r._id} title="Check fees and status now" onClick={() => act(r._id, () => referralApi.recheck(r._id), 'Status checked')}><i className="bi bi-arrow-repeat" /></button>}
                          {r.status === 'rejected'
                            ? <button type="button" className="rfe-btn sm" disabled={busy === r._id} onClick={() => act(r._id, () => referralApi.restore(r._id), 'Referral restored')}>Restore</button>
                            : <button type="button" className="rfe-btn sm danger" disabled={busy === r._id} onClick={() => setRejecting(r)}>Reject</button>}
                        </td>
                      </tr>
                      {open === r._id && (
                        <tr className="rfa-history"><td colSpan={6}>
                          <ul>{[...r.history].reverse().map((h, i) => <li key={i}><span className={`rfe-chip ${h.status}`}>{STATUS_LABEL[h.status as ReferralStatus] || h.status}</span> <b>{new Date(h.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</b> {h.note}{h.by ? <small> · {h.by}</small> : null}</li>)}</ul>
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && data.pages > 1 && (
          <div className="rfa-pager">
            <button type="button" className="rfe-btn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><i className="bi bi-chevron-left" /> Previous</button>
            <span>Page {page} of {data.pages} · {data.total} referrals</span>
            <button type="button" className="rfe-btn sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next <i className="bi bi-chevron-right" /></button>
          </div>
        )}
      </section>

      {adding && <AddModal onClose={() => setAdding(false)} onDone={() => { setAdding(false); onToast('Referral added'); load(); }} />}
      {rejecting && (
        <ReasonModal
          title={`Reject the referral of ${rejecting.friendName}?`}
          note={rejecting.status === 'earned' ? 'This reward was already earned. It can only be cancelled if the student has not withdrawn it.' : 'It will not count for the student, and they are told why.'}
          action="Reject referral"
          onClose={() => setRejecting(null)}
          onSubmit={async (reason) => { await referralApi.reject(rejecting._id, reason); setRejecting(null); onToast('Referral rejected'); load(); }}
        />
      )}
    </>
  );
}

function AddModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ code: '', name: '', phone: '', email: '', course: '' });
  const [courses, setCourses] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { referralApi.program().then(p => setCourses(p.courses)).catch(() => {}); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await referralApi.add({ ...f, email: f.email || undefined, course: f.course || undefined }); onDone(); }
    catch (x) { setErr(refErr(x)); } finally { setBusy(false); }
  };
  return (
    <Modal title="Add a referral" onClose={onClose}>
      <form className="rfe-form" onSubmit={submit}>
        <p className="rfe-form-note">For a friend who came in person or forgot the link. If the number is already a lead or a student, it is linked to this referral.</p>
        <label>Student's referral code<input value={f.code} onChange={e => setF({ ...f, code: e.target.value.toUpperCase().trim() })} required placeholder="e.g. RAVI7K2P" maxLength={12} autoFocus /></label>
        <label>Friend's name<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required maxLength={80} /></label>
        <label>Friend's mobile<input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} required inputMode="tel" maxLength={16} /></label>
        <div className="rfe-two">
          <label><span>Email <em>(optional)</em></span><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} maxLength={120} /></label>
          <label><span>Course <em>(optional)</em></span>
            <select value={f.course} onChange={e => setF({ ...f, course: e.target.value })}>
              <option value="">Not sure</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        {err && <div className="rfe-alert">{err}</div>}
        <div className="rfe-form-actions">
          <button type="button" className="rfe-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="rfe-btn primary" disabled={busy}>{busy ? 'Adding…' : 'Add referral'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ReasonModal({ title, note, action, onClose, onSubmit }: { title: string; note: string; action: string; onClose: () => void; onSubmit: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await onSubmit(reason); } catch (x) { setErr(refErr(x)); setBusy(false); }
  };
  return (
    <Modal title={title} onClose={onClose}>
      <form className="rfe-form" onSubmit={submit}>
        <p className="rfe-form-note">{note}</p>
        <label>Reason<textarea value={reason} onChange={e => setReason(e.target.value)} required minLength={3} maxLength={300} autoFocus /></label>
        {err && <div className="rfe-alert">{err}</div>}
        <div className="rfe-form-actions">
          <button type="button" className="rfe-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="rfe-btn primary" disabled={busy}>{busy ? 'Saving…' : action}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ───────────────────────────── Payouts ───────────────────────────── */

function PayoutsTab({ onToast }: { onToast: (s: string) => void }) {
  const [status, setStatus] = useState<'requested' | 'paid' | 'rejected'>('requested');
  const [rows, setRows] = useState<Payout[] | null>(null);
  const [err, setErr] = useState('');
  const [paying, setPaying] = useState<Payout | null>(null);
  const [rejecting, setRejecting] = useState<Payout | null>(null);

  const load = useCallback(() => {
    setRows(null);
    referralApi.payouts(status).then(r => { setRows(r); setErr(''); }).catch(e => setErr(refErr(e, 'Could not load payouts.')));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); onToast('Copied'); } catch { onToast(text); } };
  const exportCsv = () => {
    if (!rows?.length) return;
    const cell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Student', 'Phone', 'Amount', 'Method', 'UPI ID', 'Account holder', 'Account number', 'IFSC', 'Bank', 'Asked on', 'Status', 'Reference', 'Paid on'];
    const lines = rows.map(p => [p.referrerName, p.phone, p.amount, p.details.method.toUpperCase(), p.details.upiId, p.details.holderName, p.details.accountNumber ? `'${p.details.accountNumber}` : '', p.details.ifsc, p.details.bankName, shortDate(p.createdAt), p.status, p.reference, p.paidAt ? shortDate(p.paidAt) : ''].map(cell).join(','));
    const blob = new Blob([[head.map(cell).join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `referral-payouts-${status}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="rfa-card">
      <div className="rfa-toolbar">
        <div className="rfa-seg">
          {([['requested', 'To send'], ['paid', 'Paid'], ['rejected', 'Not sent']] as const).map(([k, l]) => (
            <button key={k} type="button" className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{l}</button>
          ))}
        </div>
        <button type="button" className="rfe-btn" disabled={!rows?.length} onClick={exportCsv}><i className="bi bi-download" /> Export CSV</button>
      </div>
      {err && <div className="rfe-alert">{err}</div>}
      {!rows ? <div className="rfe-state"><span className="rfe-spin" /></div> : rows.length === 0 ? (
        <div className="rfe-empty"><i className="bi bi-cash-coin" /> {status === 'requested' ? 'No withdrawals waiting.' : 'Nothing here yet.'}</div>
      ) : (
        <div className="rfa-table-wrap">
          <table className="rfa-table">
            <thead><tr><th>Student</th><th>Amount</th><th>Pay to</th><th>Asked on</th><th>{status === 'requested' ? '' : 'Outcome'}</th></tr></thead>
            <tbody>
              {rows.map(p => (
                <tr key={p._id}>
                  <td data-label="Student"><b>{p.referrerName}</b><small>{[p.phone, p.email].filter(Boolean).join(' · ')}</small></td>
                  <td data-label="Amount"><b className="rfa-amt">{inr(p.amount)}</b></td>
                  <td data-label="Pay to">
                    {p.details.method === 'upi' ? (
                      <div className="rfa-pay"><span className="rfa-tag">UPI</span> <code>{p.details.upiId}</code> <button type="button" className="rfa-copy" aria-label="Copy UPI ID" onClick={() => copy(p.details.upiId || '')}><i className="bi bi-copy" /></button></div>
                    ) : (
                      <div className="rfa-pay col">
                        <span><span className="rfa-tag">Bank</span> {p.details.holderName}{p.details.bankName ? ` · ${p.details.bankName}` : ''}</span>
                        <span>A/c <code>{p.details.accountNumber}</code> <button type="button" className="rfa-copy" aria-label="Copy account number" onClick={() => copy(p.details.accountNumber || '')}><i className="bi bi-copy" /></button> IFSC <code>{p.details.ifsc}</code> <button type="button" className="rfa-copy" aria-label="Copy IFSC" onClick={() => copy(p.details.ifsc || '')}><i className="bi bi-copy" /></button></span>
                      </div>
                    )}
                  </td>
                  <td data-label="Asked on"><small>{shortDate(p.createdAt)}</small></td>
                  <td className="rfa-actions">
                    {p.status === 'requested' ? (
                      <>
                        <button type="button" className="rfe-btn sm primary" onClick={() => setPaying(p)}><i className="bi bi-check2" /> Mark paid</button>
                        <button type="button" className="rfe-btn sm danger" onClick={() => setRejecting(p)}>Reject</button>
                      </>
                    ) : p.status === 'paid' ? (
                      <small className="rfa-outcome">Paid {shortDate(p.paidAt)} · Ref {p.reference}{p.paidByName ? ` · ${p.paidByName}` : ''}</small>
                    ) : (
                      <small className="rfa-outcome">{p.rejectedReason}{p.paidByName ? ` · ${p.paidByName}` : ''}</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {paying && <PaidModal payout={paying} onClose={() => setPaying(null)} onDone={() => { setPaying(null); onToast('Marked as paid'); load(); }} />}
      {rejecting && (
        <ReasonModal
          title={`Reject ${rejecting.referrerName}'s withdrawal?`}
          note="Nothing is sent. The amount goes back to the student's balance and they are told why (for example, a wrong UPI ID)."
          action="Reject withdrawal"
          onClose={() => setRejecting(null)}
          onSubmit={async (reason) => { await referralApi.payoutReject(rejecting._id, reason); setRejecting(null); onToast('Withdrawal rejected'); load(); }}
        />
      )}
    </section>
  );
}

function PaidModal({ payout, onClose, onDone }: { payout: Payout; onClose: () => void; onDone: () => void }) {
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await referralApi.payoutPaid(payout._id, { reference, paidAt }); onDone(); } catch (x) { setErr(refErr(x)); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Mark ${inr(payout.amount)} as paid`} onClose={onClose}>
      <form className="rfe-form" onSubmit={submit}>
        <p className="rfe-form-note">Send {inr(payout.amount)} to {payout.referrerName} by {payout.details.method === 'upi' ? `UPI (${payout.details.upiId})` : `bank transfer (${payout.details.holderName}, ${payout.details.ifsc})`} first, then record it here. The student sees the reference.</p>
        <label>UPI / bank transaction reference (UTR)<input value={reference} onChange={e => setReference(e.target.value)} required minLength={3} maxLength={120} autoFocus /></label>
        <label>Paid on<input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} required max={new Date().toISOString().slice(0, 10)} /></label>
        {err && <div className="rfe-alert">{err}</div>}
        <div className="rfe-form-actions">
          <button type="button" className="rfe-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="rfe-btn primary" disabled={busy}>{busy ? 'Saving…' : 'Mark paid'}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ───────────────────────────── Settings ───────────────────────────── */

function SettingsTab({ onToast }: { onToast: (s: string) => void }) {
  const [p, setP] = useState<Program | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { referralApi.program().then(setP).catch(e => setErr(refErr(e, 'Could not load the settings.'))); }, []);
  if (!p) return <section className="rfa-card">{err ? <div className="rfe-alert">{err}</div> : <div className="rfe-state"><span className="rfe-spin" /></div>}</section>;

  const addCourse = () => {
    const v = draft.trim();
    if (v && !p.courses.some(c => c.toLowerCase() === v.toLowerCase())) setP({ ...p, courses: [...p.courses, v] });
    setDraft('');
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const courses = draft.trim() ? [...p.courses, draft.trim()] : p.courses;
      const saved = await referralApi.saveProgram({ ...p, courses });
      setP(saved); setDraft(''); onToast('Settings saved');
    } catch (x) { setErr(refErr(x)); } finally { setBusy(false); }
  };

  return (
    <form className="rfa-card rfa-settings" onSubmit={save}>
      <label className="rfa-switch">
        <input type="checkbox" checked={p.enabled} onChange={e => setP({ ...p, enabled: e.target.checked })} />
        <span className="rfa-switch-ui" aria-hidden />
        <span><b>Refer &amp; Earn is {p.enabled ? 'open' : 'paused'}</b><small>When paused, links stop taking new friends. Earned rewards and payouts carry on.</small></span>
      </label>
      <div className="rfa-fields">
        <label>Reward per referral (₹)<input type="number" min={0} max={100000} value={p.rewardAmount} onChange={e => setP({ ...p, rewardAmount: Number(e.target.value) })} required /><small>Same for every course. A change applies to friends who pay in full from now on.</small></label>
        <label>Hold days<input type="number" min={0} max={365} value={p.holdDays} onChange={e => setP({ ...p, holdDays: Number(e.target.value) })} required /><small>Days after the full fee is paid before the reward can be withdrawn.</small></label>
        <label>Smallest withdrawal (₹)<input type="number" min={0} max={1000000} value={p.minPayout} onChange={e => setP({ ...p, minPayout: Number(e.target.value) })} required /><small>A student can always withdraw their whole balance, even if it is smaller.</small></label>
      </div>
      <div className="rfa-courses">
        <span className="rfa-label">Courses on the referral form</span>
        <div className="rfa-chips">
          {p.courses.map(c => <span key={c} className="rfa-chip">{c}<button type="button" aria-label={`Remove ${c}`} onClick={() => setP({ ...p, courses: p.courses.filter(x => x !== c) })}>×</button></span>)}
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCourse(); } }} placeholder="Add a course and press Enter" maxLength={80} />
        </div>
      </div>
      <label className="rfa-terms">Terms shown to students (one per line)<textarea value={p.terms} onChange={e => setP({ ...p, terms: e.target.value })} rows={6} maxLength={4000} /></label>
      {err && <div className="rfe-alert">{err}</div>}
      <div className="rfe-form-actions"><button type="submit" className="rfe-btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div>
    </form>
  );
}
