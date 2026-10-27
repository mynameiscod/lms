import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import passportApi from '../../api/passportApi';
import './adminMemberProfile.css';
import MemberActivityCard from './MemberActivity';

/**
 * CareerPilot admin → Members → one member's full profile.
 *
 * Staff could list members but not see them: the only "profile" page read the LMS StudentProfile,
 * which most members never fill in, and the Members list linked to nothing but the roadmap. This page
 * puts the member's whole picture on one screen — who they are, what they told CareerPilot at setup,
 * their membership and payments, Skill DNA and role readiness, roadmap progress, activity, and what
 * they wrote and recorded. Every figure comes from the same endpoints the member's own screens use.
 */

const STAGE: Record<string, string> = {
  foundation: 'Year 1 — Foundation', build: 'Year 2 — Build', specialize: 'Year 3 — Specialize',
  placement: 'Year 4 — Placement', job_seeker: 'Job seeker',
};
const PURPOSE: Record<string, string> = { passport_membership: 'CareerPilot membership', subscription: 'Subscription', fee: 'Fee', fee_installment: 'Fee instalment', certificate: 'Certificate', item: 'Item', learning_plan_unlock: 'Learning plan' };
const pretty = (k?: string | null) => (k ? String(k).toLowerCase().split('_').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ').replace(/\bSdet\b/, 'SDET').replace(/\bQa\b/, 'QA').replace(/\bAi\b/, 'AI') : '—');
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const initials = (n: string) => n.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Load<T> = { data: T | null; error: string | null };
const ok = <T,>(data: T): Load<T> => ({ data, error: null });
/** The member's activity trail is shown to the platform super admin only. */
const isSuperAdmin = (): boolean => {
  try { return JSON.parse(localStorage.getItem('user') || '{}')?.role === 'SUPER_ADMIN'; } catch { return false; }
};
/** One marketing touch, in words: the campaign tags, the site that sent them, the page they landed on. */
const TouchFields: React.FC<{ t: any }> = ({ t }) => (
  <dl className="amp-fields">
    <Field label="Source / medium" value={[t.utm_source, t.utm_medium].filter(Boolean).join(' / ') || null} />
    <Field label="Campaign" value={[t.utm_campaign, t.utm_content, t.utm_term].filter(Boolean).join(' · ') || null} />
    <Field label="Ad click" value={t.gclid ? 'Google Ads (gclid)' : t.fbclid ? 'Meta ads (fbclid)' : null} />
    <Field label="Referred by" value={t.referrer || null} />
    <Field label="Landed on" value={t.landing_url || t.landing_page || t.entry_path || null} />
    <Field label="When" value={t.captured_at ? new Date(t.captured_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null} />
  </dl>
);

const failed = (e: any): Load<any> => ({ data: null, error: e?.response?.data?.message || 'Could not load this section.' });

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="amp-field"><dt>{label}</dt><dd>{value === null || value === undefined || value === '' ? '—' : value}</dd></div>
);
const Card: React.FC<{ title: string; icon: string; action?: React.ReactNode; className?: string; error?: string | null; children: React.ReactNode }> = ({ title, icon, action, className, error, children }) => (
  <section className={`amp-card ${className || ''}`}>
    <header className="amp-card-head"><h2><i className={`bi ${icon}`} aria-hidden="true" /> {title}</h2>{action}</header>
    {error ? <p className="amp-error"><i className="bi bi-exclamation-circle" /> {error}</p> : children}
  </section>
);

const AdminMemberProfile: React.FC = () => {
  const { studentId = '' } = useParams<{ studentId: string }>();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Load<any>>({ data: null, error: null });
  const [skills, setSkills] = useState<Load<any>>({ data: null, error: null });
  const [readiness, setReadiness] = useState<Load<any>>({ data: null, error: null });
  const [journey, setJourney] = useState<Load<any>>({ data: null, error: null });
  const [answers, setAnswers] = useState<Load<any[]>>({ data: null, error: null });
  const [interviews, setInterviews] = useState<Load<any[]>>({ data: null, error: null });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // Each section loads on its own: one that fails says so, the rest still show.
    Promise.allSettled([
      passportApi.getMemberProfile(studentId),
      passportApi.getStudentSkillDna(studentId),
      passportApi.getStudentReadiness(studentId),
      passportApi.getStudentFoundationJourney(studentId),
      passportApi.listStudentAnswers(studentId),
      passportApi.listStudentInterviews(studentId),
    ]).then(([p, s, r, j, a, i]) => {
      if (!alive) return;
      setProfile(p.status === 'fulfilled' ? ok(p.value) : failed(p.reason));
      setSkills(s.status === 'fulfilled' ? ok(s.value) : failed(s.reason));
      setReadiness(r.status === 'fulfilled' ? ok(r.value) : failed(r.reason));
      setJourney(j.status === 'fulfilled' ? ok(j.value) : failed(j.reason));
      setAnswers(a.status === 'fulfilled' ? ok((a.value as any).answers || []) : failed(a.reason));
      setInterviews(i.status === 'fulfilled' ? ok((i.value as any).interviews || []) : failed(i.reason));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [studentId]);

  const skillRows: any[] = useMemo(() => (skills.data?.skills || []).slice().sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0)), [skills.data]);
  const avgSkill = skillRows.length ? Math.round(skillRows.reduce((t, s) => t + (s.score || 0), 0) / skillRows.length) : null;
  const jDays: any[] = journey.data?.days || [];
  const phaseCount = (ph: string) => jDays.filter((d) => d.phase === ph).length;
  const gaps: any[] = (readiness.data?.skills || []).filter((s: any) => s.status === 'PRIORITY_GAP' || s.status === 'NEEDS_WORK').slice(0, 5);

  if (loading) return <div className="amp"><div className="amp-loading">Loading member…</div></div>;
  if (!profile.data) {
    return (
      <div className="amp">
        <button className="cpx-btn" onClick={() => nav('/admin/passport/students')}><i className="bi bi-arrow-left" /> Members</button>
        <p className="amp-error amp-big"><i className="bi bi-exclamation-circle" /> {profile.error || 'Member not found.'}</p>
      </div>
    );
  }

  const { account, setup, membership, payments, progress, resume, lmsProfile, joined } = profile.data;
  const track = setup.careerTrack && typeof setup.careerTrack === 'object' ? setup.careerTrack.key : setup.careerTrack;
  const grad = setup.graduationYear ? `${setup.graduationMonth ? MONTHS[setup.graduationMonth] + ' ' : ''}${setup.graduationYear}` : null;
  const paidTotal = (payments as any[]).filter((p) => p.status === 'paid').reduce((t, p) => t + (p.amountInr || 0), 0);
  const expired = membership.expiresAt && new Date(membership.expiresAt) < new Date();

  return (
    <div className="amp">
      <Link className="amp-back" to="/admin/passport/students"><i className="bi bi-arrow-left" /> Members</Link>

      {/* Who */}
      <header className="amp-hero">
        <span className="amp-avatar" aria-hidden="true">
          {account.profilePicture ? <img src={account.profilePicture} alt="" /> : initials(account.name)}
        </span>
        <div className="amp-who">
          <h1>{account.name}</h1>
          <p>
            <span><i className="bi bi-envelope" /> {account.email}</span>
            {account.phone && <span><i className="bi bi-telephone" /> {account.phone}</span>}
            <span><i className="bi bi-building" /> {account.tenant.name || '—'}</span>
          </p>
          <div className="amp-pills">
            <span className={`amp-pill ${membership.active && !expired ? 'paid' : 'free'}`}>{membership.active && !expired ? 'Member' : expired ? 'Membership expired' : 'Free'}</span>
            {membership.complimentary && <span className="amp-pill comp" title={membership.complimentary.reason}>Complimentary</span>}
            {!account.isActive && <span className="amp-pill off">Deactivated</span>}
            {account.alsoLmsStudent && <span className="amp-pill lms">Also an LMS student</span>}
            {setup.stage && <span className="amp-pill stage">{STAGE[setup.stage] || pretty(setup.stage)}</span>}
          </div>
        </div>
        <div className="amp-hero-actions">
          <button className="cpx-btn primary" onClick={() => nav(`/admin/passport/students/${studentId}/roadmap`)}><i className="bi bi-map" /> Roadmap</button>
          {lmsProfile && <button className="cpx-btn" onClick={() => nav(`/users/${studentId}`)}><i className="bi bi-person-vcard" /> LMS profile</button>}
        </div>
      </header>

      {/* The numbers */}
      <div className="amp-stats">
        <div><span>Role readiness</span><b>{readiness.data?.available ? `${readiness.data.readiness}%` : '—'}</b><small>{readiness.data?.role?.name || pretty(setup.primaryRole)}</small></div>
        <div><span>Skill DNA</span><b>{avgSkill !== null ? avgSkill : '—'}{avgSkill !== null && <em>/100</em>}</b><small>{skillRows.length} skill{skillRows.length === 1 ? '' : 's'} measured</small></div>
        <div><span>Roadmap</span><b>{journey.data?.available ? `Day ${journey.data.currentDay}` : '—'}</b><small>{journey.data?.available ? `of ${journey.data.totalDays} · ${journey.data.completedCount} done` : 'No roadmap yet'}</small></div>
        <div><span>Level</span><b>{progress.level?.level ?? '—'}</b><small>{progress.xp.toLocaleString('en-IN')} XP · {progress.level?.title || ''}</small></div>
        <div><span>Streak</span><b>{progress.streak}<em> day{progress.streak === 1 ? '' : 's'}</em></b><small>Best {progress.longestStreak}</small></div>
        <div><span>Coins</span><b>{progress.coins ? progress.coins.balance.toLocaleString('en-IN') : '—'}</b><small>{progress.coins ? `${progress.coins.spendable.toLocaleString('en-IN')} spendable` : ''}</small></div>
        <div><span>Practice solved</span><b>{progress.practiceSolved}</b><small>problems</small></div>
        <div><span>Mock interviews</span><b>{progress.interviews.completed}</b><small>{progress.interviews.started} started</small></div>
      </div>

      <div className="amp-grid">
        <Card title="CareerPilot setup" icon="bi-person-lines-fill">
          <dl className="amp-fields">
            <Field label="Year" value={setup.yearOfStudy || (setup.stage ? STAGE[setup.stage] : null)} />
            <Field label="Programme" value={setup.program} />
            <Field label="Branch" value={setup.branch} />
            <Field label="Graduates" value={setup.graduated ? 'Graduated' : grad} />
            <Field label="Background" value={setup.background === 'cs' ? 'Computer science' : setup.background === 'non_cs' ? 'Non computer science' : setup.background} />
            <Field label="Target role" value={readiness.data?.role?.key === setup.primaryRole ? readiness.data.role.name : pretty(setup.primaryRole)} />
            <Field label="Second role" value={setup.secondaryRole ? pretty(setup.secondaryRole) : null} />
            <Field label="Career track" value={track ? pretty(track) : null} />
            <Field label="Languages" value={(setup.preferredLanguages || []).join(', ')} />
            <Field label="College" value={setup.college} />
            <Field label="Setup finished" value={setup.setupCompletedAt ? fmtDate(setup.setupCompletedAt) : 'Not yet'} />
            <Field label="Verified" value={setup.verifiedAt ? fmtDate(setup.verifiedAt) : 'Not yet'} />
          </dl>
        </Card>

        <Card title="Membership & payments" icon="bi-credit-card">
          <dl className="amp-fields">
            <Field label="Status" value={membership.active && !expired ? 'Active member' : expired ? 'Expired' : 'Free'} />
            <Field label="Activated" value={fmtDate(membership.activatedAt)} />
            <Field label="Expires" value={fmtDate(membership.expiresAt)} />
            <Field label="Paid in total" value={paidTotal ? `₹${paidTotal.toLocaleString('en-IN')}` : '—'} />
            {membership.complimentary && <Field label="Complimentary" value={`${membership.complimentary.reason || 'granted'} — by ${membership.complimentary.byName || 'admin'}, ${fmtDate(membership.complimentary.at)}`} />}
          </dl>
          {(payments as any[]).length > 0 ? (
            <table className="amp-table">
              <thead><tr><th>Date</th><th>For</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {(payments as any[]).map((p, i) => (
                  <tr key={i}>
                    <td>{fmtDate(p.paidAt || p.createdAt)}</td>
                    <td>{PURPOSE[p.purpose] || pretty(p.purpose)}</td>
                    <td>₹{p.amountInr.toLocaleString('en-IN')}</td>
                    <td><span className={`amp-tag ${p.status}`}>{p.refunded ? 'refunded' : p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="amp-muted">No payments recorded.</p>}
        </Card>

        <Card title="Role readiness" icon="bi-bullseye" error={readiness.error}
          action={<Link className="amp-link" to={`/admin/passport/students/${studentId}/roadmap`}>Details</Link>}>
          {readiness.data?.available ? (
            <>
              <div className="amp-readiness">
                <div className="amp-ring" style={{ ['--p' as any]: `${readiness.data.readiness}%` }}><b>{readiness.data.readiness}%</b></div>
                <dl className="amp-fields compact">
                  <Field label="Role" value={readiness.data.role?.name} />
                  <Field label="Coverage" value={`${readiness.data.coverage}% of the role measured`} />
                  <Field label="Confidence" value={pretty(readiness.data.confidence)} />
                  <Field label="Skills measured" value={`${readiness.data.summary?.assessedSkills} of ${readiness.data.summary?.requiredSkills}`} />
                </dl>
              </div>
              <h3 className="amp-sub">Biggest gaps</h3>
              {gaps.length ? (
                <ul className="amp-gaps">
                  {gaps.map((g) => (
                    <li key={g.skillKey}><b>{g.skillName}</b><span>{g.studentScore ?? '—'} now · target {g.targetScore}</span><em className={g.status === 'PRIORITY_GAP' ? 'hot' : ''}>{g.status === 'PRIORITY_GAP' ? 'Priority' : 'Needs work'}</em></li>
                  ))}
                </ul>
              ) : <p className="amp-muted">No gaps among the measured skills.</p>}
            </>
          ) : <p className="amp-muted">{readiness.data?.reason || 'Not measured yet — the member has not taken the skill check.'}</p>}
        </Card>

        <Card title="Skill DNA" icon="bi-diagram-3" error={skills.error}>
          {skillRows.length ? (
            <ul className="amp-skills">
              {skillRows.slice(0, 12).map((s) => (
                <li key={s.skillKey}>
                  <span className="amp-skill-name">{s.skillName}</span>
                  <span className="amp-bar"><i style={{ width: `${Math.max(2, s.score || 0)}%` }} className={(s.score || 0) >= 70 ? 'good' : (s.score || 0) >= 40 ? 'mid' : 'low'} /></span>
                  <b>{s.score ?? '—'}</b>
                  <small>{pretty(s.confidence)}</small>
                </li>
              ))}
            </ul>
          ) : <p className="amp-muted">No skills measured yet.</p>}
          {skillRows.length > 12 && <p className="amp-muted">+ {skillRows.length - 12} more</p>}
        </Card>

        <Card title="Roadmap" icon="bi-signpost-split" error={journey.error}
          action={<Link className="amp-link" to={`/admin/passport/students/${studentId}/roadmap`}>Open roadmap</Link>}>
          {journey.data?.available ? (
            <>
              <div className="amp-progress"><span style={{ width: `${journey.data.percentComplete || 0}%` }} /></div>
              <dl className="amp-fields">
                <Field label="Length" value={`${journey.data.totalDays} days`} />
                <Field label="Today" value={`Day ${journey.data.currentDay}`} />
                <Field label="Days done" value={`${journey.data.completedCount} (${journey.data.percentComplete || 0}%)`} />
                <Field label="Started" value={fmtDate(journey.data.startedAt)} />
                <Field label="Bridge days" value={phaseCount('BRIDGE') || '—'} />
                <Field label="Revision days" value={phaseCount('REVISION') || '—'} />
              </dl>
            </>
          ) : <p className="amp-muted">{journey.data?.reason || 'No roadmap yet.'}</p>}
        </Card>

        <Card title="Activity & documents" icon="bi-activity">
          <dl className="amp-fields">
            <Field label="Joined" value={fmtDate(account.joinedAt)} />
            <Field label="Last seen" value={fmtDateTime(account.lastSeenAt)} />
            <Field label="Last active day" value={progress.lastActiveDay ? fmtDate(progress.lastActiveDay) : null} />
            <Field label="Resume" value={resume ? (resume.score !== null ? `ATS score ${resume.score}/100 · updated ${fmtDate(resume.updatedAt)}` : `Started · updated ${fmtDate(resume.updatedAt)}`) : 'Not started'} />
            <Field label="LMS profile" value={lmsProfile ? `${lmsProfile.completeness}% complete` : 'Not filled in (normal for CareerPilot members)'} />
          </dl>
        </Card>

        <Card title="How they joined" icon="bi-signpost-split">
          <dl className="amp-fields">
            <Field label="Found us through" value={joined?.source} />
            <Field label="Signed up via" value={joined?.via} />
            <Field label="Verified" value={fmtDateTime(joined?.verifiedAt)} />
          </dl>
          {joined?.firstTouch ? <>
            <h3 className="amp-sub">First visit</h3>
            <TouchFields t={joined.firstTouch} />
            {joined.lastTouch && joined.lastTouch.captured_at !== joined.firstTouch.captured_at && <>
              <h3 className="amp-sub">Latest campaign visit</h3>
              <TouchFields t={joined.lastTouch} />
            </>}
          </> : <p className="amp-muted">No link information was recorded — they joined before sign-up sources were tracked, or came straight to the join page with no link tags or referring site.</p>}
        </Card>

        {isSuperAdmin() && <MemberActivityCard studentId={studentId} />}

        <Card title={`Mission answers${answers.data ? ` (${answers.data.length})` : ''}`} icon="bi-chat-left-text" className="wide" error={answers.error}>
          {answers.data?.length ? (
            <div className="amp-answers">
              {answers.data.slice(0, 6).map((a: any) => (
                <article key={`${a.day}-${a.key}`}>
                  <header><span className="amp-tag">Day {a.day}</span><b>{a.title}</b><small>{fmtDate(a.at)}</small></header>
                  <p>{a.answer}</p>
                </article>
              ))}
              {answers.data.length > 6 && <p className="amp-muted">+ {answers.data.length - 6} more answers</p>}
            </div>
          ) : <p className="amp-muted">No written mission answers yet.</p>}
        </Card>

        <Card title={`Mock interviews${interviews.data ? ` (${interviews.data.length})` : ''}`} icon="bi-mic" className="wide" error={interviews.error}>
          {interviews.data?.length ? (
            <table className="amp-table">
              <thead><tr><th>Date</th><th>Role</th><th>Answers</th><th>Score</th><th>Status</th></tr></thead>
              <tbody>
                {interviews.data.slice(0, 10).map((s: any) => (
                  <tr key={s.id}>
                    <td>{fmtDate(s.startedAt)}</td><td>{s.role}</td><td>{s.answers}</td>
                    <td>{s.evaluation ? `${s.evaluation.overallScore}%` : '—'}</td>
                    <td><span className={`amp-tag ${s.status === 'completed' ? 'paid' : ''}`}>{String(s.status).replace(/_/g, ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="amp-muted">No mock interviews yet.</p>}
        </Card>
      </div>
    </div>
  );
};

export default AdminMemberProfile;
