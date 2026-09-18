import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { SkillDnaRow } from '../../api/passportApi';
import { useAuth } from '../../contexts/AuthContext';
import './skillDna.css';

/* Confidence is how much evidence stands behind a score, never how good the student is — so it gets its own words. */
const CONFIDENCE_COPY: Record<string, string> = {
  HIGH: 'Well evidenced',
  MEDIUM: 'Some evidence',
  LOW: 'Limited evidence',
};

const SKILL_ICON = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('java') || n.includes('program') || n.includes('code') || n.includes('pseudo')) return 'bi-code-slash';
  if (n.includes('data') || n.includes('sql') || n.includes('database')) return 'bi-database';
  if (n.includes('communication')) return 'bi-chat-dots';
  if (n.includes('logic') || n.includes('reason')) return 'bi-lightbulb';
  if (n.includes('problem') || n.includes('algorithm')) return 'bi-puzzle';
  if (n.includes('cloud') || n.includes('devops')) return 'bi-cloud';
  if (n.includes('file') || n.includes('shell') || n.includes('command')) return 'bi-terminal';
  if (n.includes('computer') || n.includes('hardware')) return 'bi-cpu';
  if (n.includes('system') || n.includes('design')) return 'bi-diagram-3';
  return 'bi-stars';
};

/* A score band for colour only; the number is always printed beside it. */
const band = (score: number) => (score >= 70 ? 'strong' : score >= 40 ? 'mid' : 'low');

/**
 * The radar, drawn as SVG so the shape, the rings and the labels share one coordinate system. (The old one laid
 * labels out with CSS positions around a clip-path, and they drifted away from the points they named.)
 */
const Radar: React.FC<{ skills: SkillDnaRow[] }> = ({ skills }) => {
  const W = 540, H = 340, cx = W / 2, cy = H / 2 + 4, R = 112;
  const n = skills.length;
  const at = (i: number, r: number) => {
    const a = (-90 + (360 / n) * i) * (Math.PI / 180);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const ring = (f: number) => skills.map((_, i) => at(i, R * f).join(',')).join(' ');
  const shape = skills.map((s, i) => at(i, R * Math.max(0.04, Math.min(100, s.score) / 100)).join(',')).join(' ');
  const short = (t: string) => (t.length > 19 ? `${t.slice(0, 18)}…` : t);
  return (
    <svg className="sdn-radar" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Skill scores radar">
      {[1, 0.75, 0.5, 0.25].map(f => <polygon key={f} points={ring(f)} className="ring" />)}
      {skills.map((_, i) => { const [x, y] = at(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="axis" />; })}
      <polygon points={shape} className="shape" />
      {skills.map((s, i) => { const [x, y] = at(i, R * Math.max(0.04, Math.min(100, s.score) / 100)); return <circle key={s.skillKey} cx={x} cy={y} r={4.5} className="dot" />; })}
      {skills.map((s, i) => {
        const [x, y] = at(i, R + 22);
        const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
        const dy = y < cy - R ? -8 : y > cy + R ? 12 : 0;
        return (
          <text key={s.skillKey} x={x} y={y + dy} textAnchor={anchor} className="label">
            <tspan x={x} className="name">{short(s.skillName)}</tspan>
            <tspan x={x} dy="15" className={`val ${band(s.score)}`}>{s.score}/100</tspan>
          </text>
        );
      })}
    </svg>
  );
};

const SkillDna: React.FC = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const [skills, setSkills] = useState<SkillDnaRow[]>([]);
  const [assessed, setAssessed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.getMySkillDna()
      .then(r => { setSkills(r.skills); setAssessed(r.assessed); })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load your skills.'))
      .finally(() => setLoading(false));
  }, []);

  const activeSkills = useMemo(() => skills.filter(s => s.skillActive !== false), [skills]);
  const ranked = useMemo(() => [...activeSkills].sort((a, b) => b.score - a.score), [activeSkills]);
  const avgScore = activeSkills.length ? Math.round(activeSkills.reduce((sum, s) => sum + Number(s.score || 0), 0) / activeSkills.length) : 0;
  /* Where to focus: the lowest scores first, and among equal scores the thinnest evidence. */
  const focus = useMemo(() => [...activeSkills]
    .sort((a, b) => a.score - b.score || a.evidenceCount - b.evidenceCount)
    .slice(0, 3), [activeSkills]);
  const lowEvidence = activeSkills.filter(s => s.confidence === 'LOW').length;
  const highEvidence = activeSkills.filter(s => s.confidence === 'HIGH').length;
  const evidenceTotal = activeSkills.reduce((sum, s) => sum + (s.evidenceCount || 0), 0);
  const radarSkills = ranked.slice(0, 8);
  const firstName = user?.firstName || 'there';
  const strongest = ranked[0];

  if (loading) return <div className="sdn sdn-state"><div className="sdn-load">Loading your Skill DNA…</div></div>;
  if (err) return <div className="sdn sdn-state"><div className="sdn-err">{err}</div></div>;

  if (!assessed) {
    return (
      <div className="sdn sdn-state">
        <div className="sdn-empty">
          <div className="sdn-empty-ic"><i className="bi bi-fingerprint" /></div>
          <span className="sdn-eyebrow">Your Skill DNA</span>
          <h1>Your skills profile appears after your assessment</h1>
          <p>Complete your CareerPilot assessment and we’ll show every measured skill together with the evidence behind it.</p>
          <button className="sdn-btn primary" onClick={() => nav('/careerpilot/skill-assessment')}>Go to my assessment <i className="bi bi-arrow-right" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="sdn">
      {/* Hero: who this is about and the one number, in the logo navy. */}
      <section className="sdn-hero">
        <div className="sdn-hero-copy">
          <span className="sdn-eyebrow light">Your Skill DNA</span>
          <h1>Your Skill <span>DNA</span></h1>
          <p>What your assessment measured, skill by skill. Scores show how you performed; confidence shows how much evidence stands behind each score.</p>
          <div className="sdn-hero-chips">
            <span><i className="bi bi-patch-check" /> Assessment completed</span>
            <span><i className="bi bi-clipboard-data" /> {activeSkills.length} skills measured</span>
            {strongest && <span><i className="bi bi-trophy" /> Strongest: {strongest.skillName}</span>}
          </div>
        </div>
        <div className="sdn-hero-score">
          <div className="sdn-ring" style={{ ['--sdn-deg' as any]: `${avgScore * 3.6}deg` }}>
            <div><strong>{avgScore}</strong><span>/100</span></div>
          </div>
          <div className="sdn-hero-score-copy">
            <b>Average observed score</b>
            <span>Across {activeSkills.length} measured skill{activeSkills.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </section>

      {/* The figures, once each. */}
      <section className="sdn-kpis">
        <div><span className="ic blue"><i className="bi bi-clipboard-data" /></span><div><small>Skills measured</small><b>{activeSkills.length}</b></div></div>
        <div><span className="ic teal"><i className="bi bi-speedometer2" /></span><div><small>Average score</small><b>{avgScore}<em>/100</em></b></div></div>
        <div><span className="ic green"><i className="bi bi-shield-check" /></span><div><small>Evidence collected</small><b>{evidenceTotal}</b></div></div>
        <div><span className="ic amber"><i className="bi bi-hourglass-split" /></span><div><small>Need more evidence</small><b>{lowEvidence}</b></div></div>
      </section>

      <section className="sdn-grid">
        <article className="sdn-card">
          <header className="sdn-card-head">
            <div><h2>Skill shape</h2><p>Each point is one measured skill, 0 at the centre to 100 at the edge.</p></div>
          </header>
          {radarSkills.length >= 3
            ? <Radar skills={radarSkills} />
            : <div className="sdn-placeholder">The shape appears once three or more skills are measured.</div>}
        </article>

        <article className="sdn-card">
          <header className="sdn-card-head">
            <div><h2>All measured skills</h2><p>Highest score first, with the evidence behind each.</p></div>
          </header>
          <ul className="sdn-list">
            {ranked.map(s => (
              <li key={s.skillKey}>
                <span className={`sdn-skill-ic ${band(s.score)}`}><i className={`bi ${SKILL_ICON(s.skillName)}`} /></span>
                <div className="sdn-list-main">
                  <div className="sdn-list-top"><b>{s.skillName}</b><strong className={band(s.score)}>{s.score}<em>/100</em></strong></div>
                  <div className={`sdn-bar ${band(s.score)}`}><i style={{ width: `${Math.max(2, s.score)}%` }} /></div>
                  <div className="sdn-list-meta">
                    <span className={`sdn-conf ${String(s.confidence).toLowerCase()}`}>{CONFIDENCE_COPY[s.confidence] || s.confidence}</span>
                    <em>{s.evidenceCount} evidence · {s.distinctItems} question{s.distinctItems === 1 ? '' : 's'}</em>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="sdn-grid lower">
        <article className="sdn-card">
          <header className="sdn-card-head">
            <div><h2>Where to focus first</h2><p>Your lowest-scoring skills. These are where practice moves your profile most.</p></div>
          </header>
          <div className="sdn-focus">
            {focus.map((s, i) => (
              <div className="sdn-focus-item" key={s.skillKey}>
                <span className="sdn-focus-n">{i + 1}</span>
                <div>
                  <b>{s.skillName}</b>
                  <span>{s.score}/100 · {CONFIDENCE_COPY[s.confidence] || s.confidence}</span>
                </div>
                <i className={`bi ${SKILL_ICON(s.skillName)}`} />
              </div>
            ))}
          </div>
        </article>

        <article className="sdn-card">
          <header className="sdn-card-head">
            <div><h2>How sure is this picture?</h2><p>Confidence is set per skill by the evidence behind it.</p></div>
          </header>
          <div className="sdn-evidence">
            <div><b>{evidenceTotal}</b><span>Total evidence</span></div>
            <div><b>{highEvidence}</b><span>Well evidenced</span></div>
            <div><b>{lowEvidence}</b><span>Limited evidence</span></div>
          </div>
          <p className="sdn-explain"><i className="bi bi-info-circle" /><span>A low confidence does not mean a low skill — it means we have seen only a few answers. More practice and check-ins make each score more reliable.</span></p>
        </article>
      </section>

      <section className="sdn-next">
        <span className="sdn-next-ic"><i className="bi bi-bullseye" /></span>
        <div><b>Great progress, {firstName}!</b><span>Next, see how these skills match your target role — Role Readiness shows the gaps to close first.</span></div>
        <button className="sdn-btn primary" onClick={() => nav('/careerpilot/readiness')}>Check Role Readiness <i className="bi bi-arrow-right" /></button>
      </section>
    </div>
  );
};

export default SkillDna;
