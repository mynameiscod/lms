import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, {
  RoleReadinessResponse, RoleReadinessAvailable, RoleReadinessUnavailable, ReadinessSkill,
} from '../../api/passportApi';
import './roleReadiness.css';

const CONFIDENCE_LABEL: Record<string, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  STRONG: { label: 'Strong', tone: 'good' },
  ON_TRACK: { label: 'On track', tone: 'good' },
  NEEDS_WORK: { label: 'Needs work', tone: 'warn' },
  PRIORITY_GAP: { label: 'Priority gap', tone: 'danger' },
  LIMITED_EVIDENCE: { label: 'Limited evidence', tone: 'muted' },
  NOT_ASSESSED: { label: 'Not measured', tone: 'muted' },
};

const RoleReadiness: React.FC = () => {
  const nav = useNavigate();
  const [data, setData] = useState<RoleReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.getMyReadiness()
      .then(setData)
      .catch(e => setErr(e?.response?.data?.message || 'Could not work out your readiness.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="rdy-shell"><div className="rdy-state">Working out your readiness…</div></div>;
  if (err) return <div className="rdy-shell"><div className="rdy-state error">{err}</div></div>;
  if (!data) return null;

  if (!data.available) {
    const un = data as RoleReadinessUnavailable;
    const roleMissing = un.reason === 'ROLE_NOT_SELECTED';
    return (
      <div className="rdy-shell">
        <div className="rdy-empty-card">
          <div className="rdy-empty-icon"><i className={`bi bi-${roleMissing ? 'compass' : 'hourglass-split'}`} /></div>
          <h1>{roleMissing ? 'Choose your target role first' : 'Role readiness is not available yet'}</h1>
          <p>{un.message}</p>
          {roleMissing && (
            <button className="rdy-btn primary" onClick={() => nav('/careerpilot/setup')}>
              Set my target role <i className="bi bi-arrow-right" />
            </button>
          )}
        </div>
      </div>
    );
  }

  const ready = data as RoleReadinessAvailable;
  const { readiness, coverage, confidence, summary, role } = ready;
  const skills = ready.skills || [];
  const strengths = skills.filter(s => s.status === 'STRONG' || s.status === 'ON_TRACK').slice(0, 5);
  const gaps = skills.filter(s => s.status === 'PRIORITY_GAP' || s.status === 'NEEDS_WORK').sort((a, b) => (b.gapPoints || 0) - (a.gapPoints || 0)).slice(0, 5);
  const measured = skills.filter(s => s.status !== 'NOT_ASSESSED');
  const overallEvidence = measured.reduce((sum, s) => sum + (s.evidenceCount || 0), 0);

  const readinessLabel = readiness === null ? 'Still measuring' : readiness >= 80 ? 'Strong alignment' : readiness >= 60 ? 'Getting close' : readiness >= 40 ? 'Building momentum' : 'Early stage';

  const categoryRows = useMemo(() => {
    return [...skills]
      .sort((a, b) => (b.targetScore || 0) - (a.targetScore || 0))
      .slice(0, 6);
  }, [skills]);

  return (
    <div className="rdy-shell">
      <section className="rdy-hero">
        <div>
          <div className="rdy-kicker">ROLE READINESS</div>
          <h1>How ready are you for your target role?</h1>
          <p>CareerPilot compares your demonstrated skills with the requirements configured for your target role.</p>
          <div className="rdy-role-card">
            <div className="rdy-role-icon"><i className="bi bi-bullseye" /></div>
            <div><span>Your Target Role</span><strong>{role.name}</strong></div>
            <button onClick={() => nav('/careerpilot/setup')}>Change role <i className="bi bi-pencil" /></button>
          </div>
        </div>

        <div className="rdy-score-card">
          <div className="rdy-score-copy">
            <span>Overall Role Readiness</span>
            <h2>{readinessLabel}</h2>
            <p>Readiness is based only on skills we have measured. Coverage and confidence show how complete that picture is.</p>
          </div>
          <div className="rdy-gauge" style={{ '--rdy': `${readiness ?? 0}%` } as React.CSSProperties}>
            <div><strong>{readiness === null ? '—' : `${readiness}%`}</strong><span>Ready</span></div>
          </div>
          <div className="rdy-score-meta">
            <div><i className="bi bi-grid-3x3-gap" /><span>Coverage</span><strong>{coverage}%</strong></div>
            <div><i className="bi bi-shield-check" /><span>Confidence</span><strong>{CONFIDENCE_LABEL[confidence] || confidence}</strong></div>
            <div><i className="bi bi-clipboard-data" /><span>Measured skills</span><strong>{summary.assessedSkills}/{summary.requiredSkills}</strong></div>
          </div>
        </div>
      </section>

      {readiness === null ? (
        <div className="rdy-info warn"><i className="bi bi-info-circle" /> We have not measured enough of this role to give a readiness score yet. Complete more assessment activity to strengthen the picture.</div>
      ) : coverage < 50 ? (
        <div className="rdy-info"><i className="bi bi-info-circle" /> Your current readiness is based on {summary.assessedSkills} of {summary.requiredSkills} required skills. More evidence will make this more representative.</div>
      ) : null}

      <section className="rdy-dashboard-grid">
        <div className="rdy-card rdy-category-card">
          <div className="rdy-card-head"><div><span className="accent teal" />Readiness by Skill</div><small>Your score vs target</small></div>
          <div className="rdy-category-list">
            {categoryRows.map((s, idx) => {
              const current = s.studentScore ?? 0;
              const target = s.targetScore || 100;
              const pct = s.status === 'NOT_ASSESSED' ? 0 : Math.min(100, (current / target) * 100);
              return (
                <div className="rdy-category-row" key={s.skillKey}>
                  <div className={`rdy-skill-icon tone-${idx % 5}`}><i className={`bi ${idx % 3 === 0 ? 'bi-code-slash' : idx % 3 === 1 ? 'bi-diagram-3' : 'bi-database'}`} /></div>
                  <div className="rdy-category-main">
                    <div className="rdy-category-top"><strong>{s.skillName}</strong><span>{s.status === 'NOT_ASSESSED' ? 'Not measured' : `${current}% / ${target}%`}</span></div>
                    <div className="rdy-track"><i style={{ width: `${pct}%` }} /></div>
                  </div>
                  <em className={`rdy-pill ${STATUS_COPY[s.status]?.tone || 'muted'}`}>{STATUS_COPY[s.status]?.label || s.status}</em>
                </div>
              );
            })}
          </div>
          <button className="rdy-link" onClick={() => nav('/careerpilot/skills')}>View full skill breakdown <i className="bi bi-arrow-right" /></button>
        </div>

        <div className="rdy-card">
          <div className="rdy-card-head"><div><span className="accent green" />Strengths</div><small>Your best aligned skills</small></div>
          <div className="rdy-mini-list">
            {strengths.length ? strengths.map(s => (
              <div className="rdy-mini-row" key={s.skillKey}>
                <div className="rdy-mini-icon good"><i className="bi bi-check2-circle" /></div>
                <div><strong>{s.skillName}</strong><span>{s.studentScore ?? '—'}% demonstrated</span></div>
                <em>{CONFIDENCE_LABEL[s.skillConfidence || 'LOW']}</em>
              </div>
            )) : <div className="rdy-placeholder">Your strongest aligned skills will appear here as more evidence is measured.</div>}
          </div>
        </div>

        <div className="rdy-card">
          <div className="rdy-card-head"><div><span className="accent red" />Critical Skill Gaps</div><small>Highest-priority gaps first</small></div>
          <div className="rdy-mini-list">
            {gaps.length ? gaps.map(s => (
              <div className="rdy-gap-row" key={s.skillKey}>
                <div className="rdy-mini-icon danger"><i className="bi bi-exclamation-diamond" /></div>
                <div className="rdy-gap-main"><div><strong>{s.skillName}</strong><span>{s.gapPoints ? `${s.gapPoints} pts short` : STATUS_COPY[s.status]?.label}</span></div><div className="rdy-gap-track"><i style={{ width: `${Math.min(100, ((s.studentScore || 0) / (s.targetScore || 100)) * 100)}%` }} /></div></div>
              </div>
            )) : <div className="rdy-placeholder">No priority gaps are currently identified.</div>}
          </div>
        </div>

        <div className="rdy-card rdy-summary-card">
          <div className="rdy-card-head"><div><span className="accent purple" />Readiness Summary</div><small>What the evidence says</small></div>
          <div className="rdy-summary-grid">
            <div><strong>{summary.onTrack + summary.strong}</strong><span>On track</span></div>
            <div><strong>{summary.needsWork}</strong><span>Need work</span></div>
            <div><strong>{summary.priorityGaps}</strong><span>Priority gaps</span></div>
            <div><strong>{summary.notAssessed + summary.limitedEvidence}</strong><span>Need measuring</span></div>
          </div>
          <div className="rdy-explainer">
            <i className="bi bi-lightbulb" />
            <div><strong>What this means</strong><p>Focus first on essential gaps with strong evidence. Unmeasured skills are not counted as failures.</p></div>
          </div>
        </div>

        <div className="rdy-card rdy-evidence-card">
          <div className="rdy-card-head"><div><span className="accent blue" />Evidence & Confidence</div><small>How reliable this view is</small></div>
          <div className="rdy-evidence-top"><div><i className="bi bi-shield-check" /><span>Overall Confidence</span><strong>{CONFIDENCE_LABEL[confidence] || confidence}</strong></div><div><i className="bi bi-database" /><span>Total Evidence</span><strong>{overallEvidence}</strong></div></div>
          <div className="rdy-evidence-lines"><span><b>{coverage}%</b> role coverage</span><span><b>{summary.assessedSkills}</b> assessed skills</span><span><b>{summary.requiredSkills}</b> required skills</span></div>
        </div>

        <div className="rdy-card rdy-next-card">
          <div className="rdy-card-head"><div><span className="accent orange" />What’s Next?</div><small>Turn gaps into action</small></div>
          <div className="rdy-next-visual"><i className="bi bi-map" /><div><strong>Build a personalized roadmap</strong><p>Use your current strengths and gaps to prioritize what to work on next.</p></div></div>
          <button className="rdy-btn primary full" onClick={() => nav('/careerpilot/roadmap')}>Build My Roadmap <i className="bi bi-arrow-right" /></button>
          <button className="rdy-btn outline full" onClick={() => nav('/careerpilot/placement')}>Resume & interview readiness</button>
        </div>
      </section>

      <section className="rdy-banner">
        <div className="rdy-banner-icon"><i className="bi bi-bullseye" /></div>
        <div><strong>Great progress — now close the right gaps.</strong><span>Consistent learning and stronger evidence will make your readiness picture more complete.</span></div>
        <button onClick={() => nav('/careerpilot')}>Go to Dashboard <i className="bi bi-arrow-right" /></button>
      </section>

      <p className="rdy-disclaimer"><b>Readiness</b> compares your demonstrated skills with configured role requirements. <b>Coverage</b> shows how much of that role has enough evidence to judge. This is capability alignment, not a prediction of hiring outcome.</p>
    </div>
  );
};

export default RoleReadiness;
