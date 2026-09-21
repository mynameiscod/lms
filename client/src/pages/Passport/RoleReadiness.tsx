import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, {
  RoleReadinessResponse, RoleReadinessAvailable, RoleReadinessUnavailable,
} from '../../api/passportApi';
import './roleReadiness.css';

const CONFIDENCE_LABEL: Record<string, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  STRONG: { label: 'Strong', tone: 'good' }, ON_TRACK: { label: 'On track', tone: 'good' },
  NEEDS_WORK: { label: 'Needs work', tone: 'warn' }, PRIORITY_GAP: { label: 'Priority gap', tone: 'danger' },
  LIMITED_EVIDENCE: { label: 'Limited evidence', tone: 'muted' }, NOT_ASSESSED: { label: 'Not measured', tone: 'muted' },
};
/* Order for the skill list: what needs attention first, unmeasured last (they are not failures). */
const STATUS_ORDER: Record<string, number> = { PRIORITY_GAP: 0, NEEDS_WORK: 1, LIMITED_EVIDENCE: 2, ON_TRACK: 3, STRONG: 4, NOT_ASSESSED: 5 };

const RoleReadiness: React.FC = () => {
  const nav = useNavigate();
  const [data, setData] = useState<RoleReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.getMyReadiness().then(setData)
      .catch(e => setErr(e?.response?.data?.message || 'Could not work out your readiness.'))
      .finally(() => setLoading(false));
  }, []);

  /**
   * MEASURED SKILLS FIRST. The old list took the six highest targets, which for a new student were six skills never
   * measured — a card of "Not measured" rows. The skills we have evidence for lead now, most urgent first; the rest
   * are named underneath as not measured yet.
   */
  const { measuredRows, unmeasured } = useMemo(() => {
    const list = data?.available ? ((data as RoleReadinessAvailable).skills || []) : [];
    const measuredRows = list.filter(s => s.status !== 'NOT_ASSESSED')
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || (b.gapPoints || 0) - (a.gapPoints || 0));
    const unmeasured = list.filter(s => s.status === 'NOT_ASSESSED');
    return { measuredRows, unmeasured };
  }, [data]);

  if (loading) return <div className="rr"><div className="rr-state">Working out your readiness…</div></div>;
  if (err) return <div className="rr"><div className="rr-state error">{err}</div></div>;
  if (!data) return null;

  if (!data.available) {
    const un = data as RoleReadinessUnavailable;
    const roleMissing = un.reason === 'ROLE_NOT_SELECTED';
    /* Class names avoid the word "empty": a member-shell rule dashes every [class*="empty"] inside .gd-main,
       which turned this full-height welcome card into a dashed grey box. */
    return (
      <div className="rr rr-blank-wrap">
        <div className="rr-blank">
          <div className="rr-blank-ic"><i className={`bi bi-${roleMissing ? 'compass' : 'hourglass-split'}`} /></div>
          <h1>{roleMissing ? 'Choose your target role first' : 'Role readiness is not available yet'}</h1>
          <p>{un.message}</p>
          {roleMissing && <button className="rr-btn primary" onClick={() => nav('/careerpilot/setup?step=direction')}>Set my target role <i className="bi bi-arrow-right" /></button>}
        </div>
      </div>
    );
  }

  const ready = data as RoleReadinessAvailable;
  const { readiness, coverage, confidence, summary } = ready;
  const skills = ready.skills || [];
  const strengths = skills.filter(s => s.status === 'STRONG' || s.status === 'ON_TRACK').slice(0, 5);
  const gaps = skills.filter(s => s.status === 'PRIORITY_GAP' || s.status === 'NEEDS_WORK').sort((a, b) => (b.gapPoints || 0) - (a.gapPoints || 0)).slice(0, 5);
  const measured = skills.filter(s => s.status !== 'NOT_ASSESSED');
  const overallEvidence = measured.reduce((sum, s) => sum + (s.evidenceCount || 0), 0);
  const readinessLabel = readiness === null ? 'Still measuring' : readiness >= 80 ? 'Strong alignment' : readiness >= 60 ? 'Getting close' : readiness >= 40 ? 'Building momentum' : 'Early stage';
  const roleName = ready.role?.name;
  const confLabel = CONFIDENCE_LABEL[confidence] || confidence;

  /* Banner headline figures. Every one is read off the summary this page already fetched — strong is the count
     at or near target, weak the count the role still expects more from, and the share is strong out of the two.
     Skills we never measured are excluded on purpose: they are not failures, so they cannot dilute the split. */
  const strongCount = summary.strong + summary.onTrack;
  const weakCount = summary.priorityGaps + summary.needsWork;
  const gradedCount = strongCount + weakCount;
  const strongShare = gradedCount ? Math.round((strongCount / gradedCount) * 100) : 0;
  /* What to improve next is the widest gap — the same row the gaps card leads with, so the two never disagree. */
  const focus = gaps[0] || null;

  return (
    <div className="rr">
      <section className="rr-hero">
        <div className="rr-hero-copy">
          <span className="rr-eyebrow light">Role readiness</span>
          <h1>How ready are you for {roleName ? <span>{roleName}</span> : 'your target role'}?</h1>
          <p>CareerPilot compares the skills you have demonstrated with what this role needs. Coverage and confidence show how complete that picture is.</p>
          <div className="rr-hero-chips">
            <span><i className="bi bi-grid-3x3-gap" /> {coverage}% of the role measured</span>
            <span><i className="bi bi-shield-check" /> {confLabel} confidence</span>
            {roleName && <button onClick={() => nav('/careerpilot/setup?step=direction')}><i className="bi bi-pencil" /> Change role</button>}
          </div>
        </div>

        {/**
          * WHAT TO IMPROVE NEXT — the middle column, built like the dashboard's daily momentum panel.
          *
          * A readiness figure on its own leaves a member with nowhere to go. This says how the measured skills
          * split between strong and still-weak, then names the single widest gap and opens that skill's learning
          * page. Every figure is the member's own; nothing here is a second readiness calculation.
          */}
        <div className="rr-momentum">
          <span className="rr-eyebrow light">What to improve next</span>
          {gradedCount > 0 ? (
            <div className="rr-split">
              <div className="rr-split-top">
                <b><i className="bi bi-check-circle-fill" /> {strongCount} strong</b>
                <span className={weakCount ? 'warn' : 'ok'}>{weakCount ? `${weakCount} need${weakCount === 1 ? 's' : ''} work` : 'none below target'}</span>
              </div>
              <div className="rr-split-bar" role="progressbar" aria-valuenow={strongShare} aria-valuemin={0} aria-valuemax={100} aria-label="Measured skills at or near target">
                <i style={{ width: `${Math.max(strongCount > 0 ? 4 : 0, strongShare)}%` }} />
              </div>
              <span className="rr-split-foot">
                {strongShare}% of your {gradedCount} measured skill{gradedCount === 1 ? '' : 's'} are at or near target
                {summary.essentialTotal > 0 && <> · {summary.essentialAssessed} of {summary.essentialTotal} essential measured</>}
              </span>
            </div>
          ) : (
            <div className="rr-split">
              <div className="rr-split-top"><b>Nothing measured yet</b></div>
              <span className="rr-split-foot">Your first skill check fills this panel in.</span>
            </div>
          )}

          {focus ? (
            <button className="rr-focus" onClick={() => nav(`/careerpilot/learn/${focus.skillKey}`)}>
              <span className="ic"><i className="bi bi-bullseye" /></span>
              <div>
                <b>{focus.skillName}</b>
                <span>{focus.studentScore ?? 0}% now · target {focus.targetScore}%</span>
                {focus.gapPoints ? <em>{focus.gapPoints} points to close</em> : null}
              </div>
              <i className="bi bi-chevron-right" />
            </button>
          ) : unmeasured.length ? (
            <button className="rr-focus" onClick={() => nav('/careerpilot/skills')}>
              <span className="ic"><i className="bi bi-clipboard-data" /></span>
              <div>
                <b>{unmeasured.length} skill{unmeasured.length === 1 ? '' : 's'} still to measure</b>
                <span>Nothing is short of target yet</span>
              </div>
              <i className="bi bi-chevron-right" />
            </button>
          ) : (
            <div className="rr-allclear"><i className="bi bi-stars" /> Every measured skill is at or above its target.</div>
          )}
        </div>

        <div className="rr-hero-score">
          <div className="rr-gauge" style={{ ['--rr-deg' as any]: `${(readiness ?? 0) * 3.6}deg` }}>
            <div><strong>{readiness === null ? '—' : readiness}{readiness !== null && <em>%</em>}</strong><span>Ready</span></div>
          </div>
          <div className="rr-hero-score-copy">
            <small>Overall role readiness</small>
            <b>{readinessLabel}</b>
            <span>Based only on the skills we have measured.</span>
          </div>
        </div>
      </section>

      <section className="rr-kpis">
        <div><span className="ic blue"><i className="bi bi-grid-3x3-gap" /></span><div><small>Coverage</small><b>{coverage}%</b></div></div>
        <div><span className="ic teal"><i className="bi bi-shield-check" /></span><div><small>Confidence</small><b>{confLabel}</b></div></div>
        <div><span className="ic green"><i className="bi bi-clipboard-data" /></span><div><small>Measured skills</small><b>{summary.assessedSkills}<em>/{summary.requiredSkills}</em></b></div></div>
        <div><span className="ic amber"><i className="bi bi-database" /></span><div><small>Evidence</small><b>{overallEvidence}</b></div></div>
      </section>

      {readiness === null
        ? <div className="rr-note warn"><i className="bi bi-info-circle" /><span>We have not measured enough of this role to give a readiness score yet. Complete more assessment activity to strengthen the picture.</span></div>
        : coverage < 50
          ? <div className="rr-note"><i className="bi bi-info-circle" /><span>Your readiness is based on <b>{summary.assessedSkills} of {summary.requiredSkills}</b> required skills. More evidence will make it more representative.</span></div>
          : null}

      <section className="rr-grid">
        <article className="rr-card">
          <header className="rr-card-head">
            <div><h2>Readiness by skill</h2><p>{measuredRows.length} of {summary.requiredSkills} required skills measured, what needs attention first. The marker is the target.</p></div>
            <div className="rr-legend"><span><i className="you" /> You</span><span><i className="tgt" /> Target</span></div>
          </header>
          {measuredRows.length ? (
            <ul className="rr-skills">
              {measuredRows.map(s => {
                const current = s.studentScore ?? 0;
                const target = Math.min(100, s.targetScore || 100);
                const tone = STATUS_COPY[s.status]?.tone || 'muted';
                return (
                  <li key={s.skillKey}>
                    <div className="rr-skill-top">
                      <b>{s.skillName}</b>
                      <span className="rr-skill-nums">{current}<em> / {target}</em></span>
                      <em className={`rr-pill ${tone}`}>{STATUS_COPY[s.status]?.label || s.status}</em>
                    </div>
                    <div className={`rr-track ${tone}`}>
                      <i style={{ width: `${Math.max(2, Math.min(100, current))}%` }} />
                      <b style={{ left: `${target}%` }} aria-hidden="true" />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <div className="rr-placeholder">No skills for this role are measured yet.</div>}
          {unmeasured.length > 0 && (
            <div className="rr-unmeasured">
              <b>{unmeasured.length} skill{unmeasured.length === 1 ? '' : 's'} not measured yet</b>
              <span>Not counted as failures. They are measured as you learn and practise.</span>
              <div className="rr-chips">
                {unmeasured.slice(0, 10).map(s => <span key={s.skillKey}>{s.skillName}</span>)}
                {unmeasured.length > 10 && <span className="more">+{unmeasured.length - 10} more</span>}
              </div>
            </div>
          )}
          <button className="rr-link" onClick={() => nav('/careerpilot/skills')}>See your full Skill DNA <i className="bi bi-arrow-right" /></button>
        </article>

        <div className="rr-side">
          <article className="rr-card">
            <header className="rr-card-head"><div><h2><i className="bi bi-check2-circle good" /> Strengths</h2><p>{strengths.length ? `Your best-aligned skills of the ${strongCount} at or near target.` : 'Your best-aligned skills.'}</p></div></header>
            {strengths.length ? (
              <ul className="rr-mini">
                {strengths.map(s => (
                  <li key={s.skillKey}>
                    <div><b>{s.skillName}</b><span>{s.studentScore ?? '—'}% demonstrated · target {s.targetScore}%</span></div>
                    <em className="rr-pill good">{CONFIDENCE_LABEL[s.skillConfidence || 'LOW']} confidence</em>
                  </li>
                ))}
              </ul>
            ) : <div className="rr-placeholder">Your strongest aligned skills will appear here as more evidence is measured.</div>}
          </article>

          <article className="rr-card">
            <header className="rr-card-head"><div><h2><i className="bi bi-exclamation-diamond danger" /> Gaps to close first</h2><p>{weakCount ? `${weakCount} skill${weakCount === 1 ? '' : 's'} below target, widest distance first.` : 'Biggest distance to the target first.'}</p></div></header>
            {gaps.length ? (
              <ul className="rr-mini">
                {gaps.map(s => (
                  <li key={s.skillKey}>
                    <div><b>{s.skillName}</b><span>{s.studentScore ?? 0}% now · target {s.targetScore}%</span></div>
                    <em className="rr-pill danger">{s.gapPoints ? `${s.gapPoints} pts short` : STATUS_COPY[s.status]?.label}</em>
                  </li>
                ))}
              </ul>
            ) : <div className="rr-placeholder">No priority gaps are currently identified.</div>}
          </article>
        </div>
      </section>

      <section className="rr-grid lower">
        <article className="rr-card">
          <header className="rr-card-head"><div><h2>Readiness summary</h2><p>What the evidence says, across all {summary.requiredSkills} required skills.</p></div></header>
          <div className="rr-summary">
            <div className="good"><b>{summary.onTrack + summary.strong}</b><span>On track</span></div>
            <div className="warn"><b>{summary.needsWork}</b><span>Need work</span></div>
            <div className="danger"><b>{summary.priorityGaps}</b><span>Priority gaps</span></div>
            <div className="muted"><b>{summary.notAssessed + summary.limitedEvidence}</b><span>Need measuring</span></div>
          </div>
          <p className="rr-explain"><i className="bi bi-lightbulb" /><span><b>What this means:</b> focus first on essential gaps with strong evidence. Unmeasured skills are not counted as failures.</span></p>
        </article>

        {/**
          * ONE WAY ON, AND IT IS THE DASHBOARD.
          *
          * A readiness page's job is to say where you stand. Where to go next belongs to the dashboard, which is the one
          * place that knows whether a plan exists yet. (An earlier "Build My Roadmap" here opened the wrong journey, and a
          * second "Go to Dashboard" banner repeated this card; both are gone.)
          */}
        <article className="rr-card rr-next">
          <span className="rr-next-ic"><i className="bi bi-compass" /></span>
          <h2>What’s next?</h2>
          <p>Your dashboard builds your 90-day plan from the curriculum you are being taught, adjusted to what this assessment measured.</p>
          <button className="rr-btn primary" onClick={() => nav('/careerpilot')}>Go to my dashboard <i className="bi bi-arrow-right" /></button>
        </article>
      </section>

      <p className="rr-disclaimer"><b>Readiness</b> compares your demonstrated skills with configured role requirements. <b>Coverage</b> shows how much of that role has enough evidence to judge. This is capability alignment, not a prediction of hiring outcome.</p>
    </div>
  );
};

export default RoleReadiness;
