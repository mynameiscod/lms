import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { SkillDnaRow } from '../../api/passportApi';
import { useAuth } from '../../contexts/AuthContext';
import './skillDna.css';

const CONFIDENCE_COPY: Record<string, string> = {
  HIGH: 'Well evidenced',
  MEDIUM: 'Some evidence',
  LOW: 'Limited evidence',
};

const SKILL_ICON = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('java') || n.includes('program') || n.includes('code')) return 'bi-code-slash';
  if (n.includes('data') || n.includes('sql') || n.includes('database')) return 'bi-database';
  if (n.includes('communication')) return 'bi-chat-dots';
  if (n.includes('logic') || n.includes('reason')) return 'bi-lightbulb';
  if (n.includes('problem') || n.includes('algorithm')) return 'bi-puzzle';
  if (n.includes('cloud') || n.includes('devops')) return 'bi-cloud';
  if (n.includes('system') || n.includes('design')) return 'bi-diagram-3';
  return 'bi-stars';
};

const radarPoint = (score: number, index: number, total: number) => {
  const angle = (-90 + (360 / total) * index) * (Math.PI / 180);
  const r = 39 * Math.max(0, Math.min(100, score)) / 100;
  return `${50 + Math.cos(angle) * r}% ${50 + Math.sin(angle) * r}%`;
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
  const avgScore = activeSkills.length
    ? Math.round(activeSkills.reduce((sum, s) => sum + Number(s.score || 0), 0) / activeSkills.length)
    : 0;
  const ranked = useMemo(() => [...activeSkills].sort((a, b) => b.score - a.score), [activeSkills]);
  const topObserved = ranked.slice(0, 5);
  const evidenceNeeds = [...activeSkills]
    .sort((a, b) => {
      const rank: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
      return (rank[a.confidence] ?? 3) - (rank[b.confidence] ?? 3) || a.evidenceCount - b.evidenceCount;
    })
    .slice(0, 5);
  const lowEvidence = activeSkills.filter(s => s.confidence === 'LOW').length;
  const highEvidence = activeSkills.filter(s => s.confidence === 'HIGH').length;
  const evidenceTotal = activeSkills.reduce((sum, s) => sum + (s.evidenceCount || 0), 0);
  const radarSkills = ranked.slice(0, 6);
  const radarPolygon = radarSkills.length >= 3
    ? radarSkills.map((s, i) => radarPoint(s.score, i, radarSkills.length)).join(',')
    : '50% 18%, 82% 72%, 18% 72%';
  const firstName = user?.firstName || 'there';

  if (loading) return <div className="dna dna-state"><div className="dna-load">Loading your skills…</div></div>;
  if (err) return <div className="dna dna-state"><div className="dna-err">{err}</div></div>;

  if (!assessed) {
    return (
      <div className="dna dna-empty-wrap">
        <div className="dna-empty">
          <div className="dna-empty-art"><i className="bi bi-fingerprint" /></div>
          <span className="dna-eyebrow">YOUR SKILL DNA</span>
          <h1>Your skills profile appears after your assessment</h1>
          <p>Complete your CareerPilot assessment and we’ll show each measured skill together with the evidence behind it.</p>
          <button className="dna-btn primary" onClick={() => nav('/careerpilot/skill-assessment')}>
            Go to my assessment <i className="bi bi-arrow-right" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dna">
      <section className="dna-hero">
        <div className="dna-hero-copy">
          <span className="dna-eyebrow"><i className="bi bi-fingerprint" /> YOUR SKILL DNA</span>
          <h1>Your Skill DNA</h1>
          <p>AI-powered view of what your assessment measured, with confidence and evidence kept separate from the score.</p>
          <div className="dna-hero-meta">
            <span><i className="bi bi-check2-circle" /> Assessment completed</span>
            <span><i className="bi bi-bar-chart-line" /> {activeSkills.length} skills measured</span>
            <span><i className="bi bi-shield-check" /> Evidence-backed insights</span>
          </div>
        </div>
        <div className="dna-hero-art">
          <img src="/assets/careerpilot/careerpilot-hero-student.png" alt="CareerPilot student reviewing skill insights" />
        </div>
        <div className="dna-overall">
          <div>
            <span>Average observed score</span>
            <strong>{avgScore}<small>/100</small></strong>
            <em>Across {activeSkills.length} measured skills</em>
          </div>
          <div className="dna-ring" style={{ ['--dna-score' as any]: `${avgScore * 3.6}deg` }}>
            <span><i className="bi bi-stars" /></span>
          </div>
        </div>
      </section>

      {lowEvidence > 0 && (
        <div className="dna-note">
          <i className="bi bi-info-circle" />
          <span><b>{lowEvidence} skill{lowEvidence === 1 ? '' : 's'} still need more evidence.</b> A single answer tells us less than repeated evidence, so CareerPilot keeps confidence visible beside every score.</span>
        </div>
      )}

      <section className="dna-grid dna-grid-main">
        <article className="dna-card dna-radar-card">
          <div className="dna-card-head"><div><span>Skill DNA overview</span><small>Your highest observed scores</small></div><i className="bi bi-info-circle" /></div>
          <div className="dna-radar-wrap">
            <div className="dna-radar">
              <div className="dna-radar-grid g1" />
              <div className="dna-radar-grid g2" />
              <div className="dna-radar-grid g3" />
              <div className="dna-radar-shape" style={{ clipPath: `polygon(${radarPolygon})` }} />
              <div className="dna-radar-center"><b>{avgScore}</b><span>Average</span></div>
            </div>
            <div className="dna-radar-labels">
              {radarSkills.map((s, i) => (
                <div key={s.skillKey} className={`p p${i + 1}`}><i className={`bi ${SKILL_ICON(s.skillName)}`} /><span>{s.skillName}</span><b>{s.score}/100</b></div>
              ))}
            </div>
          </div>
          <div className="dna-insight"><i className="bi bi-stars" /> Scores describe assessment performance; confidence describes how settled that observation is.</div>
        </article>

        <article className="dna-card">
          <div className="dna-card-head"><div><span>Top observed skills</span><small>Highest scores from your assessment</small></div><i className="bi bi-graph-up-arrow good" /></div>
          <div className="dna-ranked-list">
            {topObserved.map(s => (
              <div className="dna-ranked" key={s.skillKey}>
                <span className="dna-skill-icon"><i className={`bi ${SKILL_ICON(s.skillName)}`} /></span>
                <div className="dna-ranked-body"><div><b>{s.skillName}</b><strong>{s.score}/100</strong></div><div className="dna-mini"><i style={{ width: `${s.score}%` }} /></div></div>
              </div>
            ))}
          </div>
        </article>

        <article className="dna-card">
          <div className="dna-card-head"><div><span>Needs more evidence</span><small>Where CareerPilot should learn more</small></div><i className="bi bi-lightbulb warn" /></div>
          <div className="dna-ranked-list evidence">
            {evidenceNeeds.map(s => (
              <div className="dna-ranked" key={s.skillKey}>
                <span className="dna-skill-icon soft"><i className={`bi ${SKILL_ICON(s.skillName)}`} /></span>
                <div className="dna-ranked-body">
                  <div><b>{s.skillName}</b><strong>{s.evidenceCount} evidence</strong></div>
                  <div className="dna-confidence-line"><span className={`dna-conf ${s.confidence.toLowerCase()}`}>{CONFIDENCE_COPY[s.confidence] || s.confidence}</span><em>{s.distinctItems} question{s.distinctItems === 1 ? '' : 's'}</em></div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dna-grid dna-grid-lower">
        <article className="dna-card dna-breakdown">
          <div className="dna-card-head"><div><span>Skill breakdown</span><small>Every measured skill, score and confidence</small></div><i className="bi bi-grid" /></div>
          <div className="dna-skill-grid">
            {activeSkills.map(s => (
              <div className={`dna-skill-tile c-${s.confidence.toLowerCase()}`} key={s.skillKey}>
                <div className="dna-tile-icon"><i className={`bi ${SKILL_ICON(s.skillName)}`} /></div>
                <div className="dna-tile-ring" style={{ ['--tile-score' as any]: `${s.score * 3.6}deg` }}><b>{s.score}%</b></div>
                <strong>{s.skillName}</strong>
                <span>{CONFIDENCE_COPY[s.confidence] || s.confidence}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="dna-card dna-evidence-card">
          <div className="dna-card-head"><div><span>Skill evidence</span><small>How much CareerPilot has to go on</small></div><i className="bi bi-shield-check" /></div>
          <div className="dna-evidence-stats">
            <div><span>Total evidence</span><b>{evidenceTotal}</b></div>
            <div><span>Well evidenced</span><b>{highEvidence}</b></div>
            <div><span>Limited evidence</span><b>{lowEvidence}</b></div>
          </div>
          <div className="dna-explain">
            <i className="bi bi-question-circle" />
            <p><b>Confidence is not your ability score.</b> It tells you how much assessment evidence sits behind the score. One answer is less settled than several independent questions.</p>
          </div>
        </article>
      </section>

      <section className="dna-next">
        <div className="dna-next-icon"><i className="bi bi-rocket-takeoff" /></div>
        <div><span>Great progress, {firstName}!</span><p>Your Skill DNA is ready. Next, see how these measured skills compare with the role you’re working toward.</p></div>
        <button className="dna-btn primary" onClick={() => nav('/careerpilot/readiness')}>Check Role Readiness <i className="bi bi-arrow-right" /></button>
      </section>
    </div>
  );
};

export default SkillDna;
