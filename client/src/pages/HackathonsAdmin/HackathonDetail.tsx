import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import hackathonApi, { Hackathon, HackathonRegistration } from '../../api/hackathonApi';
import './hackathons.css';

/**
 * Who registered, and who is owed money.
 *
 * This is the screen used at the desk on the day, so it shows the whole team on one row —
 * names, and the contact details the organiser needs to reach them. That is real PII for
 * people who are not students here, which is why the CSV that takes it off the platform sits
 * behind its own permission and a 403 here says so plainly rather than downloading an error.
 */

const STATUSES: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'pending_payment', label: 'Awaiting payment' },
  { key: 'refund_due', label: 'Refund due' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  pending_payment: 'Awaiting payment',
  refund_due: 'Refund due',
  cancelled: 'Cancelled',
};

const fmt = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const HackathonDetail: React.FC = () => {
  const { id = '' } = useParams();
  const nav = useNavigate();

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [rows, setRows] = useState<HackathonRegistration[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [h, regs] = await Promise.all([
        hackathonApi.get(id),
        hackathonApi.registrations(id, status || undefined),
      ]);
      setHackathon(h.hackathon);
      setRows(regs);
    } catch (e: any) {
      setErr(e?.response?.status === 403
        ? 'Your role does not include permission to view these registrations.'
        : (e?.response?.data?.message || 'Could not load registrations.'));
    }
    setLoading(false);
  }, [id, status]);

  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 6000); };

  /**
   * Counts come from the full list, so a filter never changes them.
   *
   * "3 refund due" that disappears when you filter to Confirmed is a number nobody can
   * trust — and this particular number is money somebody is owed.
   */
  const totals = useMemo(() => {
    const t = { confirmed: 0, pending_payment: 0, refund_due: 0, cancelled: 0, people: 0 };
    for (const r of rows) {
      (t as any)[r.status] = ((t as any)[r.status] || 0) + 1;
      if (r.status === 'confirmed') t.people += (r.members || []).length;
    }
    return t;
  }, [rows]);

  const download = async () => {
    try {
      await hackathonApi.downloadCsv(id, hackathon?.slug || 'hackathon', status || undefined);
    } catch (e: any) {
      setErr(e?.response?.status === 403
        ? 'Exporting registration data needs the "Export Registration Data" permission — it contains public PII.'
        : 'Could not export the registrations.');
    }
  };

  const markRefunded = async (r: HackathonRegistration) => {
    if (!window.confirm(
      `Mark ${r.teamName} (${r.registrationCode}) as refunded?\n\n`
      + 'Refund the payment in the Razorpay dashboard first — this only records that it was done.',
    )) return;
    setBusyId(r._id);
    try {
      await hackathonApi.markRefunded(id, r._id);
      await load();
      flash(`${r.registrationCode} marked as refunded.`);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not update that registration.');
    }
    setBusyId('');
  };

  return (
    <div className="hk">
      <div className="hk-crumb">
        <a onClick={() => nav('/admin/hackathons')}>Hackathons</a> <span style={{ color: '#cbd5e1' }}>›</span>{' '}
        <b>{hackathon?.title || 'Registrations'}</b>
      </div>

      <div className="hk-hd">
        <div>
          <h1>{hackathon?.title || 'Registrations'}</h1>
          <p>
            {hackathon
              ? <>{fmt(hackathon.startAt)}{hackathon.venue ? ` · ${hackathon.venue}` : ''} · teams of {hackathon.minTeamSize}–{hackathon.maxTeamSize} · {hackathon.feeInr ? `₹${hackathon.feeInr} per team` : 'free entry'}</>
              : 'Loading…'}
          </p>
        </div>
        <div className="hk-acts">
          <button className="hk-btn" onClick={load} disabled={loading}>Refresh</button>
          <button className="hk-btn primary" onClick={download} disabled={!rows.length}>Export CSV</button>
        </div>
      </div>

      {err && <div className="hk-msg err">{err}</div>}
      {msg && <div className="hk-msg ok">{msg}</div>}

      {/*
        Surfaced above the table rather than left to a filter. A refund_due row is money
        taken for a place the team did not get, and it stays owed until somebody acts.
      */}
      {!!totals.refund_due && (
        <div className="hk-msg warn">
          <b>{totals.refund_due} team(s) are owed a refund.</b> Their payment succeeded but the place
          could not be held — refund them in the Razorpay dashboard, then mark each one refunded below.
        </div>
      )}

      <div className="hk-filters">
        {STATUSES.map(s => (
          <button key={s.key} className={`hk-chip${status === s.key ? ' on' : ''}`} onClick={() => setStatus(s.key)}>
            {s.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#7c8aa0' }}>
          <b style={{ color: '#0f172a' }}>{totals.confirmed}</b> confirmed team(s) ·{' '}
          <b style={{ color: '#0f172a' }}>{totals.people}</b> people expected
        </span>
      </div>

      {loading ? (
        <div className="hk-panel hk-empty">Loading registrations…</div>
      ) : !rows.length ? (
        <div className="hk-panel hk-empty">
          {status ? 'No registrations with that status.' : 'Nobody has registered yet.'}
        </div>
      ) : (
        <div className="hk-table-wrap">
          <table className="hk-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Team</th>
                <th>College</th>
                <th>Members</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Registered</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id}>
                  <td><span className="hk-code">{r.registrationCode}</span></td>
                  <td><b>{r.teamName}</b></td>
                  <td>
                    {r.college}
                    {/* Typed rather than picked — worth adding to the dropdown for next time. */}
                    {r.collegeIsOther && <div><small style={{ color: '#b45309' }}>not in the list</small></div>}
                  </td>
                  <td>
                    <ul className="hk-members">
                      {(r.members || []).map((m, i) => (
                        <li key={i} className={m.isLead ? 'lead' : ''}>
                          {m.name}{m.isLead ? ' (lead)' : ''}
                          <br /><small>{m.mobile}{m.email ? ` · ${m.email}` : ''}</small>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <span className={`hk-st ${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
                    {r.cancelReason && <div><small style={{ color: '#94a3b8' }}>{r.cancelReason}</small></div>}
                  </td>
                  <td>
                    {r.amountInr ? `₹${r.amountInr}` : 'Free'}
                    {r.payment?.paymentId && <div><small style={{ color: '#94a3b8' }}>{r.payment.paymentId}</small></div>}
                  </td>
                  <td><small>{fmt(r.createdAt)}</small></td>
                  <td>
                    {r.status === 'refund_due' && (
                      <button className="hk-btn sm" onClick={() => markRefunded(r)} disabled={busyId === r._id}>
                        {busyId === r._id ? 'Saving…' : 'Mark refunded'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HackathonDetail;
