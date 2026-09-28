import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { placementDriveApi } from '../../api';
import { useToast } from '../ProblemBank/shared';
import { CompanyLogo, fmtDate } from '../InterviewHub/parts';
import '../ProblemBank/ProblemBank.css';
import '../InterviewHub/hub.css';

/**
 * Drives — the student side. Open placement drives to apply to, and every application with
 * its result. Each drive links to what earlier candidates were asked at that company, so a
 * student prepares from real interviews rather than guesses.
 */
interface Drive {
  _id: string; companyName: string; role: string; ctcMin?: number; ctcMax?: number; location?: string;
  driveType?: string; status: string; applyDeadline?: string; driveDate?: string; description?: string;
  eligibility?: { minCgpa?: number; allowedBranches?: string[]; allowedYears?: number[]; maxBacklogs?: number };
  applicants?: string[]; applicantCount?: number; applicantStatuses?: Record<string, string>;
  rounds?: { name: string; date?: string; venue?: string }[];
}
interface Application {
  _id: string; companyName: string; role: string; ctcMin?: number; ctcMax?: number; location?: string;
  driveDate?: string; applyDeadline?: string; status: string; driveStatus: string; rounds: { name: string; date?: string }[];
}

const slug = (s: string) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const ctc = (d: { ctcMin?: number; ctcMax?: number }) =>
  d.ctcMin && d.ctcMax ? `₹${d.ctcMin}–${d.ctcMax} LPA` : d.ctcMin ? `₹${d.ctcMin}+ LPA` : d.ctcMax ? `up to ₹${d.ctcMax} LPA` : 'CTC not disclosed';
const STATUS: Record<string, [string, string]> = {
  applied: ['pb-badge-accent', 'Applied'], shortlisted: ['pb-badge-warn', 'Shortlisted'], interviewing: ['pb-badge-warn', 'Interviewing'],
  selected: ['pb-badge-ok', 'Selected'], placed: ['pb-badge-ok', 'Placed'], rejected: ['pb-badge-bad', 'Not selected'], withdrawn: ['pb-badge-neutral', 'Withdrawn'],
};

const StudentDrives: React.FC = () => {
  const nav = useNavigate();
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'applications' ? 'applications' : 'open';
  const [drives, setDrives] = useState<Drive[] | null>(null);
  const [apps, setApps] = useState<Application[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const me = localStorage.getItem('userId') || '';

  const load = useCallback(async () => {
    try { const r: any = await placementDriveApi.list('active'); setDrives(Array.isArray(r?.data) ? r.data : []); } catch { setDrives([]); }
    try { const r: any = await placementDriveApi.getMyApplications(); setApps(Array.isArray(r?.data) ? r.data : []); } catch { setApps([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const applied = (d: Drive) => (d.applicants || []).map(String).includes(me) || !!apps?.some((a) => a._id === d._id);
  const toggle = async (d: Drive) => {
    const was = applied(d);
    if (was && !window.confirm(`Withdraw your application to ${d.companyName}?`)) return;
    setBusy(d._id);
    try {
      if (was) await placementDriveApi.withdraw(d._id); else await placementDriveApi.apply(d._id);
      toast.show(was ? 'Application withdrawn.' : `Applied to ${d.companyName}. Read what they asked earlier candidates while you wait.`);
      await load();
    } catch (e: any) { toast.show(e?.message || 'Could not update your application.', true); }
    setBusy(null);
  };
  const setTab = (t: string) => { const n = new URLSearchParams(sp); if (t === 'open') n.delete('tab'); else n.set('tab', t); setSp(n); };

  return (
    <div className="pb-root">
      <div className="pb-page">
        <div className="ih-hero">
          <div className="pb-grow">
            <h1>Drives</h1>
            <p>Placement drives you can apply to, and every application you have made. Before each interview, read what that company asked the candidates before you.</p>
          </div>
          <button className="pb-btn" onClick={() => nav('/interview-experiences')}><i className="fa-solid fa-comments" /> Interview experiences</button>
        </div>

        <div className="pb-seg" style={{ marginBottom: 14 }}>
          <button className={tab === 'open' ? 'on' : ''} onClick={() => setTab('open')}>Open drives{drives ? ` (${drives.length})` : ''}</button>
          <button className={tab === 'applications' ? 'on' : ''} onClick={() => setTab('applications')}>My applications{apps?.length ? ` (${apps.length})` : ''}</button>
        </div>

        {tab === 'open' ? (
          !drives ? <div className="pb-muted"><span className="pb-spinner" /> Loading…</div>
            : !drives.length ? <div className="pb-card pb-empty"><h2>No open drives right now</h2><p className="pb-muted">New drives appear here the moment they are posted. Meanwhile, prepare from real interview experiences.</p>
              <button className="pb-btn pb-btn-primary" onClick={() => nav('/interview-experiences')}>Read interview experiences</button></div>
              : (
                <div className="ih-grid">
                  {drives.map((d) => {
                    const on = applied(d);
                    const elig = d.eligibility || {};
                    return (
                      <div key={d._id} className="pb-card ih-card" style={{ cursor: 'default' }}>
                        <div className="pb-row" style={{ alignItems: 'flex-start' }}>
                          <CompanyLogo name={d.companyName} />
                          <div className="pb-grow" style={{ minWidth: 0 }}>
                            <div className="co">{d.companyName}</div>
                            <div className="meta">{d.role}</div>
                          </div>
                          <span className={`pb-pill ${d.status === 'ongoing' ? 'pb-badge-ok' : 'pb-badge-accent'}`}>{d.status === 'ongoing' ? 'Ongoing' : 'Upcoming'}</span>
                        </div>
                        <div className="pb-chips">
                          <span className="pb-tag">{ctc(d)}</span>
                          {d.location && <span className="pb-tag"><i className="fa-solid fa-location-dot" />&nbsp;{d.location}</span>}
                          {d.driveType && <span className="pb-tag">{d.driveType}</span>}
                          {elig.minCgpa != null && <span className="pb-tag">CGPA ≥ {elig.minCgpa}</span>}
                          {elig.maxBacklogs != null && <span className="pb-tag">Backlogs ≤ {elig.maxBacklogs}</span>}
                          {(elig.allowedBranches || []).map((b) => <span key={b} className="pb-tag">{b}</span>)}
                        </div>
                        <div className="meta">
                          {d.driveDate && <>Drive on <b>{fmtDate(d.driveDate)}</b> · </>}
                          {d.applyDeadline && <>Apply by <b>{fmtDate(d.applyDeadline)}</b> · </>}
                          {d.applicantCount ?? d.applicants?.length ?? 0} applied
                        </div>
                        {!!d.rounds?.length && <div className="pb-chips">{d.rounds.map((r, i) => <span key={i} className="pb-tag">{i + 1}. {r.name}</span>)}</div>}
                        <div className="pb-row" style={{ marginTop: 'auto', paddingTop: 6 }}>
                          <button className="pb-btn pb-btn-sm pb-grow" style={{ justifyContent: 'center' }} onClick={() => nav(`/interview-experiences/company/${slug(d.companyName)}`)}>
                            <i className="fa-regular fa-lightbulb" /> What they asked before
                          </button>
                          <button className={`pb-btn pb-btn-sm ${on ? 'pb-btn-ghost' : 'pb-btn-primary'}`} disabled={busy === d._id} onClick={() => toggle(d)}>
                            {busy === d._id ? <span className="pb-spinner" /> : on ? 'Withdraw' : 'Apply'}
                          </button>
                        </div>
                        {on && <div className="pb-alert pb-alert-ok" style={{ margin: 0, fontSize: 12.5 }}><i className="fa-solid fa-circle-check" /> You have applied.</div>}
                      </div>
                    );
                  })}
                </div>
              )
        ) : (
          !apps ? <div className="pb-muted"><span className="pb-spinner" /> Loading…</div>
            : !apps.length ? <div className="pb-card pb-empty"><h2>No applications yet</h2><p className="pb-muted">Apply to an open drive and follow your result here.</p></div>
              : (
                <div className="pb-card pb-table-wrap">
                  <table className="pb-table">
                    <thead><tr><th>Company</th><th>Drive date</th><th>CTC</th><th>Result</th><th /></tr></thead>
                    <tbody>
                      {apps.map((a) => {
                        const [cls, label] = STATUS[a.status] || ['pb-badge-neutral', a.status];
                        const done = a.driveStatus === 'completed' || (a.driveDate && new Date(a.driveDate) < new Date());
                        return (
                          <tr key={a._id} style={{ cursor: 'default' }}>
                            <td><span className="pb-row"><CompanyLogo name={a.companyName} /><span><b>{a.companyName}</b><div className="pb-faint" style={{ fontSize: 12 }}>{a.role}</div></span></span></td>
                            <td className="pb-muted">{fmtDate(a.driveDate) || '—'}</td>
                            <td className="pb-muted">{ctc(a)}</td>
                            <td><span className={`pb-pill ${cls}`}>{label}</span></td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <button className="pb-btn pb-btn-sm" onClick={() => nav(`/interview-experiences/company/${slug(a.companyName)}`)}>Prepare</button>
                              {done && <button className="pb-btn pb-btn-sm pb-btn-primary" onClick={() => nav(`/interview-experiences/share?company=${encodeURIComponent(a.companyName)}`)}>Share how it went</button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
        )}
      </div>
      {toast.node}
    </div>
  );
};

export default StudentDrives;
