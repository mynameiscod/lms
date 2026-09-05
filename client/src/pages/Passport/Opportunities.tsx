import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collegeMembershipApi, placementDriveApi } from '../../api';
import passportApi, { CompanyRow } from '../../api/passportApi';
import { useMember } from './MemberLayout';
import './opportunities.css';

type AppStatus = 'applied' | 'shortlisted' | 'selected' | 'rejected' | 'placed';

interface Drive {
  _id: string;
  companyName: string;
  companyLogo?: string;
  role: string;
  ctcMin?: number;
  ctcMax?: number;
  location?: string;
  driveType: string;
  status: string;
  applyDeadline?: string;
  driveDate?: string;
  description?: string;
  eligibility?: {
    minCgpa?: number;
    allowedBranches?: string[];
    allowedYears?: number[];
    maxBacklogs?: number;
  };
  applicants?: string[];
}

interface Application {
  _id: string;
  companyName: string;
  companyLogo?: string;
  role: string;
  location?: string;
  status: AppStatus;
  rounds?: { name: string; date?: string }[];
}

interface Membership {
  departmentId?: { code?: string } | null;
  yearOfStudy?: number;
  cgpa?: number;
  backlogs?: number;
}

const SAVED_KEY = 'careerpilot_saved_opportunities';

const statusLabel: Record<AppStatus, string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  selected: 'Selected',
  rejected: 'Rejected',
  placed: 'Offer / Placed',
};

const Opportunities: React.FC = () => {
  const nav = useNavigate();
  const { data: member } = useMember();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'jobs' | 'internships' | 'companies'>('all');
  /**
   * Twelve to a page. The cards are tall — company, role, pay, deadline, eligibility and two
   * buttons each — so a single college drive season put forty of them in one scroll and the
   * resume prompt at the bottom of the list became unreachable in practice.
   */
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;
  /**
   * Companies a student can prepare AGAINST, which is a different thing from a drive they
   * can apply TO. The endpoint has existed since Module 15 and nothing rendered it, so a
   * member could only reach a company page by knowing its slug.
   */
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [location, setLocation] = useState('');
  const [saved, setSaved] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]')); }
    catch { return new Set(); }
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [upcoming, ongoing, apps, profile, ready, cos] = await Promise.all([
        placementDriveApi.list('upcoming').catch(() => ({ data: [] })),
        placementDriveApi.list('ongoing').catch(() => ({ data: [] })),
        placementDriveApi.getMyApplications().catch(() => ({ data: [] })),
        collegeMembershipApi.getMe().catch(() => ({ data: null })),
        passportApi.getMyReadiness().catch(() => null),
        // Failure is not fatal to the page: drives and companies are independent, and a
        // company list that will not load should cost its own tab, not the whole screen.
        passportApi.listCompanies().catch(() => ({ companies: [] as CompanyRow[] })),
      ]);
      setCompanies((cos as any)?.companies || []);
      const open = [...(upcoming?.data || []), ...(ongoing?.data || [])] as Drive[];
      const uniq = Array.from(new Map(open.map(d => [d._id, d])).values());
      setDrives(uniq);

      const appPayload: any = apps && typeof apps.json === 'function' ? await apps.json() : apps;
      setApplications((appPayload?.data || []) as Application[]);
      setMembership((profile?.data || null) as Membership | null);
      setReadiness(ready);
    } catch (e: any) {
      setError(e?.message || 'Could not load opportunities right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Any change to what is being listed starts again at the first page.
  useEffect(() => { setPage(1); }, [type, query, location]);

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(saved)));
  }, [saved]);

  const appByDrive = useMemo(() => {
    const map = new Map<string, Application>();
    for (const a of applications) map.set(a._id, a);
    return map;
  }, [applications]);

  const isInternship = (d: Drive) => /intern|trainee/i.test(`${d.role} ${d.driveType}`);

  const eligibility = (d: Drive) => {
    if (!membership) return { eligible: true, reasons: [] as string[] };
    const e = d.eligibility || {};
    const reasons: string[] = [];
    if (e.minCgpa != null && membership.cgpa != null && membership.cgpa < e.minCgpa) reasons.push(`CGPA ${e.minCgpa}+ required`);
    if (e.maxBacklogs != null && membership.backlogs != null && membership.backlogs > e.maxBacklogs) reasons.push(`Max ${e.maxBacklogs} backlog${e.maxBacklogs === 1 ? '' : 's'}`);
    const branch = membership.departmentId?.code;
    if (e.allowedBranches?.length && branch && !e.allowedBranches.includes(branch)) reasons.push('Branch not eligible');
    if (e.allowedYears?.length && membership.yearOfStudy && !e.allowedYears.includes(membership.yearOfStudy)) reasons.push('Year not eligible');
    return { eligible: reasons.length === 0, reasons };
  };

  const locations = useMemo(() => Array.from(new Set(drives.map(d => d.location).filter(Boolean) as string[])).sort(), [drives]);

  const shown = useMemo(() => drives.filter(d => {
    const text = `${d.companyName} ${d.role} ${d.location || ''}`.toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (location && d.location !== location) return false;
    if (type === 'internships' && !isInternship(d)) return false;
    if (type === 'jobs' && isInternship(d)) return false;
    return true;
  }), [drives, query, location, type]);

  const recommended = shown.filter(d => eligibility(d).eligible);
  const listed = type === 'all' ? [...recommended, ...shown.filter(d => !eligibility(d).eligible)] : shown;

  const pageCount = Math.max(1, Math.ceil(listed.length / PER_PAGE));
  // Clamped rather than trusted: switching from a tab of 40 to one of 5 while on page 3 would
  // otherwise render nothing and read as "no opportunities" rather than "wrong page".
  const current = Math.min(page, pageCount);
  const pageItems = listed.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const toggleSave = (id: string) => setSaved(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const apply = async (d: Drive) => {
    const existing = appByDrive.get(d._id);
    if (existing && existing.status !== 'rejected') return;
    setBusyId(d._id); setMessage(''); setError('');
    try {
      await placementDriveApi.apply(d._id);
      setMessage(`Application sent to ${d.companyName}.`);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not submit the application.');
    } finally {
      setBusyId(null);
    }
  };

  const ctc = (d: Drive) => {
    if (d.ctcMin != null && d.ctcMax != null) return `${d.ctcMin}–${d.ctcMax} LPA`;
    if (d.ctcMin != null) return `${d.ctcMin}+ LPA`;
    if (d.ctcMax != null) return `Up to ${d.ctcMax} LPA`;
    return '';
  };

  const readinessValue = readiness?.available ? readiness.readiness : null;
  const readinessLabel = readinessValue == null ? 'Keep building evidence' : readinessValue >= 80 ? 'Strong readiness' : readinessValue >= 60 ? 'Getting close' : 'Keep building';
  const gaps = readiness?.available ? (readiness.skills || []).filter((s: any) => s.status === 'PRIORITY_GAP' || s.status === 'NEEDS_WORK').slice(0, 3) : [];
  const interviewCount = applications.filter(a => (a.rounds || []).some(r => r.date && new Date(r.date).getTime() >= Date.now())).length;
  const statusCounts = applications.reduce<Record<string, number>>((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

  const shareProfile = async () => {
    if (!member?.shareSlug) return;
    const url = `${window.location.origin}/careerpilot/card/${member.shareSlug}`;
    try { await navigator.clipboard.writeText(url); setMessage('CareerPilot profile link copied.'); }
    catch { window.prompt('Copy your CareerPilot link:', url); }
  };

  if (loading) return <div className="opp-state">Loading opportunities…</div>;

  return (
    <div className="opp-shell">
      <header className="opp-head">
        <div>
          <div className="opp-kicker">CAREER OPPORTUNITIES</div>
          <h1>Opportunities</h1>
          <p>Discover jobs and internships available through your college and CodeBegun network.</p>
        </div>
        <div className="opp-head-actions">
          <button className="opp-btn secondary" onClick={shareProfile} disabled={!member?.shareSlug}><i className="bi bi-share" /> Share My Profile</button>
          <button className="opp-btn primary" onClick={() => document.getElementById('application-status')?.scrollIntoView({ behavior: 'smooth' })}><i className="bi bi-briefcase" /> Track Applications</button>
        </div>
      </header>

      {message && <div className="opp-alert success">{message}<button onClick={() => setMessage('')}>×</button></div>}
      {error && <div className="opp-alert error">{error}<button onClick={() => setError('')}>×</button></div>}

      <section className="opp-overview">
        <div className="opp-metrics">
          <Metric icon="bi-briefcase-fill" value={recommended.length} label="Open & eligible" tone="teal" />
          <Metric icon="bi-bookmark-fill" value={saved.size} label="Saved opportunities" tone="violet" />
          <Metric icon="bi-send-fill" value={applications.length} label="Applications" tone="blue" />
          <Metric icon="bi-calendar-check-fill" value={interviewCount} label="Interviews scheduled" tone="green" />
        </div>
      </section>

      <div className="opp-layout">
        <main className="opp-main">
          <div className="opp-filters">
            <label className="opp-search"><i className="bi bi-search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by role, company, or keyword…" /></label>
            <select value={location} onChange={e => setLocation(e.target.value)}><option value="">All locations</option>{locations.map(l => <option key={l}>{l}</option>)}</select>
          </div>

          <div className="opp-tabs">
            <button className={type === 'all' ? 'on' : ''} onClick={() => setType('all')}>Recommended for You</button>
            <button className={type === 'jobs' ? 'on' : ''} onClick={() => setType('jobs')}>Jobs</button>
            <button className={type === 'internships' ? 'on' : ''} onClick={() => setType('internships')}>Internships</button>
            {/* Companies to PREPARE for, as opposed to drives to apply to. */}
            <button className={type === 'companies' ? 'on' : ''} onClick={() => setType('companies')}>
              Companies{companies.length ? ` (${companies.length})` : ''}
            </button>
            <span>{type === 'companies' ? `${companies.length} to prepare for` : `${listed.length} open`}</span>
          </div>

          {type === 'companies' ? (
            !companies.length ? (
              /* Said precisely. A company is hidden until it has an overview, an interview
                 pattern, 20+ questions and human-verified eligibility — so "none yet" here
                 means unpublished, not missing, and an admin can act on that sentence. */
              <div className="opp-empty">
                <i className="bi bi-building" />
                <h3>No company guides published yet</h3>
                <p>A company appears here once its overview, interview pattern, questions and eligibility have been completed and verified.</p>
              </div>
            ) : (
              <div className="opp-co-grid">
                {companies
                  .filter(co => !query || co.name.toLowerCase().includes(query.toLowerCase()))
                  .map(co => (
                    <button className="opp-co" key={co.slug} onClick={() => nav(`/careerpilot/companies/${co.slug}`)}>
                      {co.logoUrl
                        ? <img className="opp-co-logo" src={co.logoUrl} alt="" />
                        : <span className="opp-co-fallback">{co.name.slice(0, 1).toUpperCase()}</span>}
                      <span className="opp-co-body">
                        <b>{co.name}</b>
                        <p>{co.about || 'Interview pattern and past questions.'}</p>
                        <span className="opp-co-meta">{co.questionCount} past question{co.questionCount === 1 ? '' : 's'}</span>
                      </span>
                    </button>
                  ))}
              </div>
            )
          ) : !listed.length ? (
            <div className="opp-empty"><i className="bi bi-briefcase" /><h3>No matching opportunities right now</h3><p>Try another filter or check back when new placement drives are published.</p></div>
          ) : (
            <div className="opp-list">
              {pageItems.map(d => {
                const check = eligibility(d);
                const app = appByDrive.get(d._id);
                const isSaved = saved.has(d._id);
                return (
                  <article className={`opp-card${!check.eligible ? ' limited' : ''}`} key={d._id}>
                    <div className="opp-company-logo">
                      {d.companyLogo ? <img src={d.companyLogo} alt="" /> : <span>{d.companyName.slice(0, 2).toUpperCase()}</span>}
                    </div>
                    <div className="opp-card-body">
                      <div className="opp-card-title-row">
                        <div><h3>{d.role}</h3><div className="opp-company-name">{d.companyName}</div></div>
                        <span className={`opp-fit ${check.eligible ? 'good' : 'warn'}`}><i className={`bi ${check.eligible ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} /> {check.eligible ? 'Eligible' : 'Check eligibility'}</span>
                      </div>
                      <div className="opp-meta">
                        <span><i className="bi bi-briefcase" /> {d.driveType || 'Placement drive'}</span>
                        {d.location && <span><i className="bi bi-geo-alt" /> {d.location}</span>}
                        {ctc(d) && <span><i className="bi bi-cash-stack" /> {ctc(d)}</span>}
                        {d.applyDeadline && <span><i className="bi bi-clock" /> Apply by {new Date(d.applyDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                      {d.description && <p className="opp-desc">{d.description}</p>}
                      <div className={`opp-match-note ${check.eligible ? '' : 'warning'}`}>
                        <i className={`bi ${check.eligible ? 'bi-stars' : 'bi-info-circle'}`} />
                        <span>{check.eligible ? 'Your current college profile meets the published eligibility rules.' : check.reasons.join(' · ')}</span>
                      </div>
                    </div>
                    <div className="opp-card-actions">
                      <button className={`opp-save${isSaved ? ' on' : ''}`} onClick={() => toggleSave(d._id)}><i className={`bi ${isSaved ? 'bi-bookmark-fill' : 'bi-bookmark'}`} /> {isSaved ? 'Saved' : 'Save'}</button>
                      {app && app.status !== 'rejected' ? (
                        <div className="opp-applied"><i className="bi bi-check-circle-fill" /> {statusLabel[app.status] || app.status}</div>
                      ) : (
                        <button className="opp-apply" disabled={!check.eligible || busyId === d._id} onClick={() => apply(d)}>{busyId === d._id ? 'Applying…' : <>Apply Now <i className="bi bi-arrow-right" /></>}</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Only when there is more than one page. A pager over a single page of results is
              chrome that tells the reader nothing. */}
          {type !== 'companies' && pageCount > 1 && (
            <nav className="opp-pager" aria-label="Opportunity pages">
              <button className="opp-pager-step" onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={current <= 1} aria-label="Previous page">
                <i className="bi bi-chevron-left" /> Previous
              </button>
              <span className="opp-pager-nums">
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  // Long lists collapse to first, last and a window around the current page,
                  // so twenty drives do not produce twenty buttons.
                  .filter(n => n === 1 || n === pageCount || Math.abs(n - current) <= 1)
                  .map((n, idx, arr) => (
                    <React.Fragment key={n}>
                      {idx > 0 && arr[idx - 1] !== n - 1 && <em className="opp-pager-gap">…</em>}
                      <button className={`opp-pager-num${n === current ? ' on' : ''}`}
                              onClick={() => setPage(n)}
                              aria-current={n === current ? 'page' : undefined}>{n}</button>
                    </React.Fragment>
                  ))}
              </span>
              <button className="opp-pager-step" onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                      disabled={current >= pageCount} aria-label="Next page">
                Next <i className="bi bi-chevron-right" />
              </button>
              <span className="opp-pager-count">
                {(current - 1) * PER_PAGE + 1}–{Math.min(current * PER_PAGE, listed.length)} of {listed.length}
              </span>
            </nav>
          )}

          <div className="opp-resume-cta">
            <span className="opp-trophy"><i className="bi bi-trophy-fill" /></span>
            <div><b>Keep applying consistently!</b><span>A strong profile and focused preparation improve every application.</span></div>
            <button onClick={() => nav('/careerpilot/resume')}>Explore Resume Center <i className="bi bi-arrow-right" /></button>
          </div>
        </main>

        <aside className="opp-aside">
          <section className="opp-side-card readiness">
            <div className="opp-side-hd"><h3>Your Job Readiness</h3><button onClick={() => nav('/careerpilot/readiness')}>Details</button></div>
            <div className="opp-ready-row">
              <div className="opp-ready-ring" style={{ '--pct': `${Math.max(readinessValue || 0, 3)}%` } as React.CSSProperties}><span>{readinessValue == null ? '—' : `${readinessValue}%`}</span></div>
              <div><b>{readinessLabel}</b><p>Improve priority skills to become a stronger fit for more roles.</p></div>
            </div>
            <button className="opp-side-cta" onClick={() => nav('/careerpilot/readiness')}><i className="bi bi-sliders" /> Improve Skills</button>
          </section>

          <section className="opp-side-card">
            <div className="opp-side-hd"><h3>Priority Skills</h3><button onClick={() => nav('/careerpilot/skills')}>View Skill DNA</button></div>
            {!gaps.length ? <p className="opp-side-empty">Complete your skill assessment to unlock gap-based guidance.</p> : gaps.map((g: any) => (
              <div className="opp-skill-row" key={g.skillKey || g.skillLabel}><span>{g.skillLabel || g.skillKey}</span><b>{g.studentScore == null ? '—' : `${g.studentScore}%`}</b></div>
            ))}
          </section>

          <section className="opp-side-card" id="application-status">
            <div className="opp-side-hd"><h3>Application Status</h3><button onClick={() => nav('/student/my-applications')}>View All</button></div>
            {(Object.keys(statusLabel) as AppStatus[]).map(s => (
              <div className="opp-status-row" key={s}><span><i className={`bi ${s === 'applied' ? 'bi-send' : s === 'shortlisted' ? 'bi-star' : s === 'selected' || s === 'placed' ? 'bi-check-circle' : 'bi-x-circle'}`} /> {statusLabel[s]}</span><b>{statusCounts[s] || 0}</b></div>
            ))}
          </section>

          <section className="opp-side-card premium">
            <div><span className="opp-premium-kicker">CAREERPILOT JOURNEY</span><h3>Prepare before you apply</h3><p>Use your roadmap, practice lab and interview preparation to strengthen your profile before the next opportunity.</p><button onClick={() => nav('/careerpilot/roadmap')}>Explore Roadmap <i className="bi bi-arrow-right" /></button></div>
            <i className="bi bi-rocket-takeoff-fill rocket" />
          </section>
        </aside>
      </div>
    </div>
  );
};

const Metric: React.FC<{ icon: string; value: number; label: string; tone: string }> = ({ icon, value, label, tone }) => (
  <div className="opp-metric"><span className={`icon ${tone}`}><i className={`bi ${icon}`} /></span><div><b>{value}</b><span>{label}</span></div></div>
);

export default Opportunities;
