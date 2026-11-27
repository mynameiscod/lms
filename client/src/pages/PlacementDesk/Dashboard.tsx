import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { placementDeskApi, Report, STATUS_LABEL, fmtDay, fmtPkg, istToday } from '../../api/placementDeskApi';

type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
const shift = (day: string, n: number) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
function rangeFor(p: Preset): [string, string] {
  const t = istToday();
  if (p === 'today') return [t, t];
  if (p === 'yesterday') return [shift(t, -1), shift(t, -1)];
  if (p === 'week') { const dow = (new Date(`${t}T00:00:00Z`).getUTCDay() + 6) % 7; return [shift(t, -dow), t]; }
  return [`${t.slice(0, 7)}-01`, t];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<Preset>('today');
  const [range, setRange] = useState<[string, string]>(rangeFor('today'));
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setErr('');
    placementDeskApi.report(range[0], range[1]).then(setReport).catch(e => setErr(e.message));
  }, [range]);

  const pick = (p: Preset) => { setPreset(p); if (p !== 'custom') setRange(rangeFor(p)); };
  const label = range[0] === range[1] ? fmtDay(range[0]) : `${fmtDay(range[0])} – ${fmtDay(range[1])}`;

  // A plain-text summary to paste into WhatsApp / email for management.
  const summaryText = useMemo(() => {
    if (!report) return '';
    const t = report.totals;
    const lines = [
      `*Placement update — ${label}*`, '',
      `Companies: ${t.companies} · Drives: ${t.drives}`,
      `Attended: ${t.attended} · No-show: ${t.noShow}`,
      `Offers: ${t.offers} · Rejected: ${t.rejected} · Result pending: ${t.pending}`,
      ...(t.highestOffer ? [`Highest offer: ₹${t.highestOffer} LPA`] : []), '',
      ...report.drives.filter(d => d.status !== 'cancelled').map(d =>
        `• ${d.companyName} — ${d.role} (${fmtPkg(d.packageMin, d.packageMax)}): ${d.counts.attended} attended, ${d.counts.offers} offers, ${d.counts.rejected} rejected${d.officerName ? ` · by ${d.officerName}` : ''}`),
    ];
    return lines.join('\n');
  }, [report, label]);

  const copy = async () => { try { await navigator.clipboard.writeText(summaryText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } };
  const t = report?.totals;
  const tiles = t ? [
    { k: 'Companies', v: t.companies, c: 'blue' }, { k: 'Drives', v: t.drives, c: 'blue' },
    { k: 'Attended', v: t.attended, c: 'teal' }, { k: 'No-show', v: t.noShow, c: 'grey' },
    { k: 'Offers', v: t.offers, c: 'green' }, { k: 'Rejected', v: t.rejected, c: 'red' },
    { k: 'Result pending', v: t.pending, c: 'amber' }, { k: 'Highest offer', v: t.highestOffer ? `₹${t.highestOffer} LPA` : '—', c: 'green' },
  ] : [];

  return (
    <div className="pd-section">
      <div className="pd-toolbar">
        <div className="pd-seg">
          {(['today', 'yesterday', 'week', 'month', 'custom'] as Preset[]).map(p => (
            <button key={p} className={preset === p ? 'on' : ''} onClick={() => pick(p)}>
              {{ today: 'Today', yesterday: 'Yesterday', week: 'This week', month: 'This month', custom: 'Custom' }[p]}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="pd-dates">
            <input type="date" value={range[0]} max={range[1]} onChange={e => setRange([e.target.value, range[1]])} />
            <span>to</span>
            <input type="date" value={range[1]} min={range[0]} onChange={e => setRange([range[0], e.target.value])} />
          </div>
        )}
        <div className="pd-spacer" />
        <button className="pd-btn" onClick={copy} disabled={!report}><i className="fa-brands fa-whatsapp" /> {copied ? 'Copied' : 'Copy summary'}</button>
        <button className="pd-btn" onClick={() => placementDeskApi.exportReport(range[0], range[1]).catch(e => setErr(e.message))}><i className="fa-solid fa-file-excel" /> Excel</button>
      </div>

      {err && <div className="pd-err">{err}</div>}
      <h3 className="pd-range">{label}</h3>
      <div className="pd-tiles">
        {tiles.map(x => <div key={x.k} className={`pd-tile ${x.c}`}><span>{x.k}</span><b>{x.v}</b></div>)}
      </div>

      <div className="pd-card">
        <div className="pd-card-head"><h4>Drives and outcomes</h4><span>{report?.drives.length || 0} drive(s)</span></div>
        {!report ? <div className="pd-empty">Loading…</div> : report.drives.length === 0 ? <div className="pd-empty">No drives in this period.</div> : (
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead><tr><th>Date</th><th>Company · Role</th><th>Package</th><th>Officer</th><th>Put up</th><th>Attended</th><th>Offers</th><th>Rejected</th><th>Pending</th><th /></tr></thead>
              <tbody>
                {report.drives.map(d => (
                  <React.Fragment key={d._id}>
                    <tr className={d.status === 'cancelled' ? 'pd-muted' : ''}>
                      <td data-label="Date">{fmtDay(d.day)}</td>
                      <td data-label="Company"><button className="pd-link" onClick={() => navigate(`/placement-desk/drives/${d._id}`)}>{d.companyName}</button><small>{d.role}{d.status === 'cancelled' ? ' · cancelled' : ''}</small></td>
                      <td data-label="Package">{fmtPkg(d.packageMin, d.packageMax)}</td>
                      <td data-label="Officer">{d.officerName || '—'}</td>
                      <td data-label="Put up">{d.counts.total}</td>
                      <td data-label="Attended">{d.counts.attended}</td>
                      <td data-label="Offers" className="pd-good">{d.counts.offers}</td>
                      <td data-label="Rejected" className="pd-bad">{d.counts.rejected}</td>
                      <td data-label="Pending">{d.counts.pending}</td>
                      <td>{d.feedback.length > 0 && <button className="pd-link" onClick={() => setOpen(open === d._id ? null : d._id)}>{open === d._id ? 'Hide' : 'Feedback'}</button>}</td>
                    </tr>
                    {open === d._id && (
                      <tr className="pd-feedback-row"><td colSpan={10}>
                        <div className="pd-feedback">
                          {d.feedback.map((f, i) => (
                            <div key={i} className="pd-fb">
                              <div><b>{f.name}</b>{f.kind === 'external' && <span className="pd-tag">Outside</span>}<span className={`pd-status s-${f.status}`}>{STATUS_LABEL[f.status]}</span>{f.offerCtc ? <span className="pd-tag green">₹{f.offerCtc} LPA</span> : null}{f.roundReached && <small> · reached {f.roundReached}</small>}</div>
                              {f.companyFeedback && <p><i className="fa-solid fa-building" /> {f.companyFeedback}</p>}
                              {f.internalRemarks && <p className="pd-remark"><i className="fa-solid fa-lock" /> {f.internalRemarks}</p>}
                            </div>
                          ))}
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {report && report.byOfficer.length > 0 && (
        <div className="pd-card">
          <div className="pd-card-head"><h4>By placement officer</h4></div>
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead><tr><th>Officer</th><th>Companies</th><th>Drives</th><th>Attended</th><th>Offers</th></tr></thead>
              <tbody>{report.byOfficer.map(o => (
                <tr key={o.officerId || 'none'}><td data-label="Officer">{o.name}</td><td data-label="Companies">{o.companies}</td><td data-label="Drives">{o.drives}</td><td data-label="Attended">{o.attended}</td><td data-label="Offers" className="pd-good">{o.offers}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
