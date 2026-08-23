import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, {
  PlacementReadinessView, ResumeReadinessView, InterviewReadinessView, InterviewCoverageView,
  ClaimStatus,
} from '../../api/passportApi';
import './placementReadiness.css';

const CLAIM_META: Record<ClaimStatus, { label: string; icon: string; tone: string }> = {
  VERIFIED:               { label: 'Backed by evidence', icon: 'bi-patch-check',      tone: 'ok' },
  NEEDS_VALIDATION:       { label: 'Not measured yet',   icon: 'bi-question-circle',  tone: 'neutral' },
  CLAIM_EXCEEDS_EVIDENCE: { label: 'Ahead of evidence',  icon: 'bi-arrow-up-right',   tone: 'warn' },
  MISSING_FROM_RESUME:    { label: 'Missing from resume', icon: 'bi-file-earmark-x',  tone: 'info' },
};

const CLAIM_ORDER: ClaimStatus[] = [
  'MISSING_FROM_RESUME', 'CLAIM_EXCEEDS_EVIDENCE', 'NEEDS_VALIDATION', 'VERIFIED',
];

const DIMENSION_LABEL: Record<string, string> = {
  COMPLETENESS: 'Completeness', ROLE_ALIGNMENT: 'Role alignment', SKILL_EVIDENCE: 'Skill evidence',
  PROJECT_STRENGTH: 'Project strength', IMPACT: 'Impact', ATS_QUALITY: 'ATS quality',
  TECHNICAL: 'Technical', PROBLEM_SOLVING: 'Problem solving', COMMUNICATION: 'Communication', DELIVERY: 'Delivery',
};

const PRIORITY_LABEL: Record<string, string> = {
  CRITICAL: 'Do first', IMPORTANT: 'Worth doing', OPTIONAL: 'If you have time',
};

const band = (n: number) => (n >= 70 ? 'good' : n >= 40 ? 'mid' : 'low');
const scoreCopy = (n: number | null | undefined) => {
  if (typeof n !== 'number') return 'Not measured';
  if (n >= 80) return 'Strong';
  if (n >= 70) return 'Good';
  if (n >= 40) return 'Needs focus';
  return 'Build this next';
};

const ScoreRing: React.FC<{ value?: number | null; label: string; icon: string; detail?: string }> = ({ value, label, icon, detail }) => {
  const safe = typeof value === 'number' ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className="plr-score-card">
      <div className={`plr-ring ${typeof value === 'number' ? band(value) : 'none'}`} style={{ '--score': `${safe}%` } as React.CSSProperties}>
        <span><b>{typeof value === 'number' ? value : '—'}</b>{typeof value === 'number' && <small>%</small>}</span>
      </div>
      <div className="plr-score-copy">
        <div className="plr-score-title"><i className={`bi ${icon}`} /> {label}</div>
        <strong>{scoreCopy(value)}</strong>
        {detail && <p>{detail}</p>}
      </div>
    </div>
  );
};

const Bars: React.FC<{ rows: { dimension: string; score: number; detail?: string }[] }> = ({ rows }) => (
  <ul className="plr-bars">
    {rows.map(d => (
      <li key={d.dimension}>
        <div className="plr-bar-head"><span>{DIMENSION_LABEL[d.dimension] || d.dimension}</span><b>{d.score}%</b></div>
        <span className="track"><i className={band(d.score)} style={{ width: `${d.score}%` }} /></span>
        {d.detail && <em>{d.detail}</em>}
      </li>
    ))}
  </ul>
);

const ResumePanel: React.FC<{ data: ResumeReadinessView }> = ({ data }) => {
  const nav = useNavigate();
  if (!data.available) {
    return (
      <section className="plr-card plr-detail-card">
        <div className="plr-card-title"><span className="plr-icon blue"><i className="bi bi-file-earmark-text" /></span><div><b>Resume readiness</b><small>Does your resume show what you can do?</small></div></div>
        <div className="plr-empty"><p>{data.message}</p>
          {data.reason === 'NO_RESUME' && <button className="plr-btn primary" onClick={() => nav('/careerpilot/resume')}>Build your resume</button>}
          {data.reason === 'ROLE_NOT_SELECTED' && <button className="plr-btn primary" onClick={() => nav('/careerpilot/setup')}>Choose a target role</button>}
        </div>
      </section>
    );
  }

  const claims = [...(data.claims || [])].sort((a, b) => CLAIM_ORDER.indexOf(a.status) - CLAIM_ORDER.indexOf(b.status));
  return (
    <section className="plr-card plr-detail-card">
      <div className="plr-card-title"><span className="plr-icon blue"><i className="bi bi-file-earmark-text" /></span><div><b>Resume readiness</b><small>Against {data.role?.name}</small></div></div>
      <Bars rows={data.dimensions || []} />

      {!!(data.recommendations || []).length && (
        <div className="plr-section-block">
          <div className="plr-label">What to change first</div>
          <div className="plr-action-list">
            {data.recommendations!.slice(0, 4).map((r, i) => (
              <div className="plr-action-row" key={i}>
                <span className={`plr-priority ${r.priority.toLowerCase()}`}>{PRIORITY_LABEL[r.priority]}</span>
                <span>{r.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!claims.length && (
        <div className="plr-section-block">
          <div className="plr-label">Resume claims vs measured evidence</div>
          <div className="plr-claim-list">
            {claims.slice(0, 6).map(c => {
              const meta = CLAIM_META[c.status];
              return (
                <div className={`plr-claim ${meta.tone}`} key={c.skillKey}>
                  <i className={`bi ${meta.icon}`} />
                  <div><b>{c.skillName}</b><small>{meta.label} · {c.measuredScore === null ? 'not measured' : `${c.measuredScore}%`}</small></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button className="plr-btn" onClick={() => nav('/careerpilot/resume')}>Open resume center <i className="bi bi-arrow-right" /></button>
    </section>
  );
};

const InterviewPanel: React.FC<{ data: InterviewReadinessView; coverage: InterviewCoverageView | null }> = ({ data, coverage }) => {
  const nav = useNavigate();
  return (
    <section className="plr-card plr-detail-card">
      <div className="plr-card-title"><span className="plr-icon purple"><i className="bi bi-mic" /></span><div><b>Interview readiness</b><small>Can you show it under interview conditions?</small></div></div>
      {data.available ? (
        <>
          <p className="plr-sub">From your {data.role} interview{data.completedAt ? ` on ${new Date(data.completedAt).toLocaleDateString()}` : ''}.</p>
          <Bars rows={(data.dimensions || []).map(d => ({ dimension: d.dimension, score: d.score }))} />
          {!!(data.perSkill || []).length && (
            <div className="plr-section-block">
              <div className="plr-label">How each area went</div>
              <div className="plr-area-grid">
                {data.perSkill!.slice(0, 6).map(s => <div key={s.skillKey}><span>{s.area}</span><b className={band(s.score)}>{s.score}%</b></div>)}
              </div>
            </div>
          )}
        </>
      ) : <div className="plr-empty"><p>{data.message}</p></div>}

      {coverage?.ok && !!coverage.targets?.length && (
        <div className="plr-section-block">
          <div className="plr-label">Your next role interview would cover</div>
          <div className="plr-tags">{coverage.targets.slice(0, 10).map(t => <span key={t.skillKey} className={t.bands.includes('gaps') ? 'gap' : ''}>{t.skillName}{t.bands.includes('gaps') && <b>gap</b>}</span>)}</div>
        </div>
      )}

      <button className="plr-btn primary" onClick={() => nav('/careerpilot/interview?mode=role')}>Take a role interview <i className="bi bi-arrow-right" /></button>
    </section>
  );
};

const PlacementReadiness: React.FC = () => {
  const nav = useNavigate();
  const [data, setData] = useState<PlacementReadinessView | null>(null);
  const [coverage, setCoverage] = useState<InterviewCoverageView | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [d, c] = await Promise.all([
          passportApi.getPlacementReadiness(),
          passportApi.getInterviewCoverage().catch(() => null),
        ]);
        setData(d); setCoverage(c);
      } catch (e: any) {
        setErr(e?.response?.data?.message || 'Could not load your placement readiness.');
      }
      setLoading(false);
    })();
  }, []);

  const strengths = useMemo(() => {
    if (!data) return [] as { label: string; score: number }[];
    const rows = [
      ...(data.resume.available ? (data.resume.dimensions || []).map(d => ({ label: DIMENSION_LABEL[d.dimension] || d.dimension, score: d.score })) : []),
      ...(data.interview.available ? (data.interview.dimensions || []).map(d => ({ label: DIMENSION_LABEL[d.dimension] || d.dimension, score: d.score })) : []),
    ];
    if (data.skill.available && typeof data.skill.readiness === 'number') rows.push({ label: 'Role skills', score: data.skill.readiness });
    return rows.filter(r => r.score >= 70).sort((a, b) => b.score - a.score).slice(0, 4);
  }, [data]);

  const blockers = useMemo(() => {
    if (!data) return [] as string[];
    const items: string[] = [];
    (data.resume.recommendations || []).filter(r => r.priority === 'CRITICAL').slice(0, 2).forEach(r => items.push(r.action));
    if (!data.interview.available) items.push('Complete a role-based mock interview');
    else (data.interview.dimensions || []).filter(d => d.score < 60).slice(0, 2).forEach(d => items.push(`Improve ${DIMENSION_LABEL[d.dimension] || d.dimension}`));
    if (data.skill.available && typeof data.skill.readiness === 'number' && data.skill.readiness < 70) items.push('Close priority skill gaps for your target role');
    return Array.from(new Set(items)).slice(0, 4);
  }, [data]);

  if (loading) return <div className="plr-load"><i className="bi bi-arrow-repeat spin" /> Loading placement readiness…</div>;
  if (err || !data) return <div className="plr-err page">{err || 'Nothing to show yet.'}</div>;

  const roleName = data.resume.available ? data.resume.role?.name : undefined;
  const measuredCount = [data.skill.available, data.resume.available, data.interview.available].filter(Boolean).length;

  return (
    <div className="plr">
      <header className="plr-page-head">
        <div><span className="plr-kicker"><i className="bi bi-bullseye" /> Career checkpoint</span><h1>Placement Readiness</h1><p>See the three things employers test separately: can you do the job, does your resume prove it, and can you show it in an interview.</p></div>
        <button className="plr-btn primary" onClick={() => nav('/careerpilot/companies')}>Explore Opportunities <i className="bi bi-arrow-right" /></button>
      </header>

      <section className="plr-hero">
        <div className="plr-hero-copy">
          <span className="plr-eyebrow">Your job-ready snapshot</span>
          <h2>{measuredCount === 3 ? 'Your placement picture is coming together.' : 'Complete the missing evidence to see the full picture.'}</h2>
          <p>We deliberately keep these scores separate so you always know what to fix next. A strong resume cannot replace skill evidence, and strong skills cannot replace interview practice.</p>
          {roleName && <div className="plr-role"><i className="bi bi-briefcase" /> Target role <b>{roleName}</b></div>}
        </div>
        <div className="plr-hero-visual">
          <div className="plr-target"><i className="bi bi-bullseye" /></div>
          <div><b>{measuredCount}/3</b><span>readiness signals measured</span></div>
        </div>
      </section>

      <div className="plr-score-grid">
        <ScoreRing value={data.skill.available ? data.skill.readiness : null} label="Skills readiness" icon="bi-cpu" detail={data.skill.available && typeof data.skill.coverage === 'number' ? `${data.skill.coverage}% of target role measured · ${String(data.skill.confidence || '').toLowerCase()} confidence` : 'Choose a target role and complete assessment evidence.'} />
        <ScoreRing value={data.resume.available ? data.resume.readiness : null} label="Resume readiness" icon="bi-file-earmark-text" detail={data.resume.available ? 'How clearly your resume shows role-relevant evidence.' : (data.resume.reason === 'NO_RESUME' ? 'Build your resume to measure this.' : 'Not reviewable yet.')} />
        <ScoreRing value={data.interview.available ? data.interview.readiness : null} label="Interview readiness" icon="bi-mic" detail={data.interview.available ? 'What you demonstrated under interview conditions.' : 'Take a role interview to measure this.'} />
      </div>

      <div className="plr-insight-grid">
        <section className="plr-card">
          <div className="plr-card-title"><span className="plr-icon teal"><i className="bi bi-trophy" /></span><div><b>Top strengths</b><small>Signals already working in your favor</small></div></div>
          {strengths.length ? <div className="plr-bullet-list good">{strengths.map(s => <div key={s.label}><i className="bi bi-check-circle-fill" /><span>{s.label}</span><b>{s.score}%</b></div>)}</div> : <div className="plr-empty compact"><p>Complete more readiness checks to surface verified strengths.</p></div>}
        </section>

        <section className="plr-card">
          <div className="plr-card-title"><span className="plr-icon red"><i className="bi bi-exclamation-triangle" /></span><div><b>Critical areas to improve</b><small>What is stopping you from being fully ready</small></div></div>
          {blockers.length ? <div className="plr-bullet-list warn">{blockers.map((b, i) => <div key={i}><i className="bi bi-exclamation-circle" /><span>{b}</span><em>{i < 2 ? 'High' : 'Focus'}</em></div>)}</div> : <div className="plr-empty compact"><p>No critical blockers are currently surfaced.</p></div>}
        </section>

        <section className="plr-card plr-next-card">
          <div className="plr-card-title"><span className="plr-icon purple"><i className="bi bi-compass" /></span><div><b>Next 3 actions</b><small>Do these before applying seriously</small></div></div>
          <ol>
            <li><span>1</span><button onClick={() => nav('/careerpilot/readiness')}>Close your highest-priority skill gaps</button></li>
            <li><span>2</span><button onClick={() => nav('/careerpilot/resume')}>Strengthen resume evidence and ATS quality</button></li>
            <li><span>3</span><button onClick={() => nav('/careerpilot/interview?mode=role')}>Validate yourself in a role interview</button></li>
          </ol>
          <button className="plr-btn primary full" onClick={() => nav('/careerpilot/roadmap')}>Complete my job-ready plan <i className="bi bi-arrow-right" /></button>
        </section>
      </div>

      <div className="plr-cols">
        <ResumePanel data={data.resume} />
        <InterviewPanel data={data.interview} coverage={coverage} />
      </div>

      <section className="plr-cta">
        <div><span className="plr-icon teal"><i className="bi bi-stars" /></span><div><b>Ready to move closer to your first offer?</b><p>Use your real readiness signals to decide what to improve before you apply.</p></div></div>
        <button className="plr-btn primary" onClick={() => nav('/careerpilot/companies')}>Explore opportunities <i className="bi bi-arrow-right" /></button>
      </section>
    </div>
  );
};

export default PlacementReadiness;
