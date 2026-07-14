import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { candidateProofApi, ProofProfile, ProofContact } from '../../api/candidateProofApi';

const NAVY = '#051D64', TEAL = '#359AAD';
const scoreColor = (n?: number) => (n == null ? '#94a3b8' : n >= 80 ? '#16a34a' : n >= 60 ? '#d97706' : '#dc2626');
const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const ScoreCard: React.FC<{ label: string; value?: number; suffix?: string; sub?: string }> = ({ label, value, suffix = '', sub }) => (
  <div style={{ flex: 1, minWidth: 150, background: '#fff', border: '1px solid #e5e9f2', borderRadius: 14, padding: '18px 20px', textAlign: 'center' }}>
    <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, color: scoreColor(value), fontVariantNumeric: 'tabular-nums' }}>{value != null ? `${value}${suffix}` : '—'}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginTop: 8 }}>{label}</div>
    {sub && <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>{sub}</div>}
  </div>
);

const Bar: React.FC<{ label: string; pct: number }> = ({ label, pct }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
      <span style={{ color: '#334155', textTransform: 'capitalize' }}>{label}</span>
      <span style={{ fontWeight: 700, color: scoreColor(pct) }}>{pct}%</span>
    </div>
    <div style={{ height: 7, borderRadius: 99, background: '#eef2f7', overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: scoreColor(pct), borderRadius: 99 }} />
    </div>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 16, padding: '20px 24px', marginBottom: 16 }}>
    <h2 style={{ fontSize: 15, color: NAVY, margin: '0 0 14px', letterSpacing: '.02em', textTransform: 'uppercase' }}>{title}</h2>
    {children}
  </div>
);

const chip = (t: string, i: number) => (
  <span key={i} style={{ display: 'inline-block', background: '#eef6f8', color: '#2b8294', border: '1px solid #cfe6ec', borderRadius: 8, padding: '4px 11px', fontSize: 13, margin: 3, fontWeight: 600 }}>{t}</span>
);

const CandidateProfile: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [profile, setProfile] = useState<ProofProfile | null>(null);
  const [contact, setContact] = useState<ProofContact | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    if (!token) return;
    candidateProofApi.getPublic(token)
      .then((r) => { setProfile(r.data.data.profile); setContact(r.data.data.contact); setState('ok'); })
      .catch(() => setState('error'));
  }, [token]);

  if (state === 'loading') return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#64748b', fontFamily: 'Arial, sans-serif' }}>Loading candidate profile…</div>;
  if (state === 'error' || !profile) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', fontFamily: 'Arial, sans-serif', padding: 24 }}>
      <div><div style={{ fontSize: 44 }}>🔗</div><h1 style={{ color: NAVY, fontSize: 22 }}>This profile link isn't available</h1><p style={{ color: '#64748b' }}>It may have been unpublished. Please contact CodeBegun Placements for an updated link.</p></div>
    </div>
  );

  const s = profile.student;
  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Arial, Helvetica, sans-serif', color: '#41506a', paddingBottom: 40 }}>
      {/* Brand bar */}
      <div style={{ background: NAVY, padding: '14px 0' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '.3px' }}>Code<span style={{ color: '#5eb3c7' }}>Begun</span></div>
          <div style={{ color: '#93c5fd', fontSize: 12, fontWeight: 700 }}>✓ Verified Candidate Profile</div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '22px 22px 0' }}>
        {/* Hero */}
        <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 16, padding: '24px 26px', marginBottom: 16, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          {s.avatar
            ? <img src={s.avatar} alt="" style={{ width: 74, height: 74, borderRadius: 16, objectFit: 'cover' }} />
            : <div style={{ width: 74, height: 74, borderRadius: 16, background: NAVY, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 800 }}>{initials(s.name)}</div>}
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ color: NAVY, fontSize: 26, margin: 0 }}>{s.name}</h1>
            <div style={{ color: TEAL, fontWeight: 700, fontSize: 15, marginTop: 3 }}>{s.targetRole || 'Java Full Stack Developer'}</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 5 }}>
              {[s.city, s.batch, 'Trained &amp; screened by CodeBegun'].filter(Boolean).join(' · ')}
            </div>
            {s.tagline && <div style={{ color: '#475569', fontSize: 13.5, marginTop: 8, fontStyle: 'italic' }}>“{s.tagline}”</div>}
          </div>
        </div>

        {/* Headline scores */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <ScoreCard label="Job Readiness" value={profile.assessment?.readiness} suffix="%" sub={profile.assessment?.percentile != null ? `${profile.assessment.percentile}th percentile` : 'Skill assessment'} />
          <ScoreCard label="Mock Interview" value={profile.interview?.score} sub={profile.interview?.readinessLevel || 'AI interview grade'} />
          <ScoreCard label="Communication" value={profile.communication?.score} sub={profile.communication?.currentStreak ? `${profile.communication.currentStreak}-day streak` : 'AI comm. lab'} />
          <ScoreCard label="Career Profile" value={profile.assessment?.careerReadiness ?? profile.career?.resumeScore} sub="Resume · GitHub" />
        </div>

        {/* Assessment breakdown */}
        {profile.assessment?.subScores?.length ? (
          <Section title="Skill assessment breakdown">
            {profile.assessment.subScores.map((ss, i) => <Bar key={i} label={ss.dimension} pct={ss.percentage} />)}
          </Section>
        ) : null}

        {/* Interview */}
        {profile.interview && (profile.interview.strengths.length || profile.interview.weaknesses.length) ? (
          <Section title="Mock interview signals">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
              {profile.interview.strengths.length ? <div><div style={{ fontSize: 12.5, fontWeight: 700, color: '#15803d', marginBottom: 6 }}>💪 Strengths</div><ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>{profile.interview.strengths.map((x, i) => <li key={i} style={{ margin: '3px 0' }}>{x}</li>)}</ul></div> : null}
              {profile.interview.weaknesses.length ? <div><div style={{ fontSize: 12.5, fontWeight: 700, color: '#a16207', marginBottom: 6 }}>🎯 Working on</div><ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>{profile.interview.weaknesses.map((x, i) => <li key={i} style={{ margin: '3px 0' }}>{x}</li>)}</ul></div> : null}
            </div>
          </Section>
        ) : null}

        {/* Skills */}
        {profile.skills.length ? (
          <Section title="Skills"><div>{profile.skills.map(chip)}</div></Section>
        ) : null}

        {/* Projects */}
        {profile.projects.length ? (
          <Section title="Projects">
            {profile.projects.map((pr, i) => (
              <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px solid #eef2f7' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <b style={{ color: NAVY, fontSize: 14.5 }}>{pr.title}</b>
                  {pr.githubUrl && <a href={pr.githubUrl} target="_blank" rel="noreferrer" style={{ color: TEAL, fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>🐙 Code →</a>}
                </div>
                {pr.techStack?.length ? <div style={{ marginTop: 5 }}>{pr.techStack.map(chip)}</div> : null}
              </div>
            ))}
          </Section>
        ) : null}

        {/* Career links + certificates */}
        {(profile.career?.githubUrl || profile.career?.linkedinUrl || profile.resume?.url || profile.certificates.length) ? (
          <Section title="Verified links &amp; certificates">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {profile.resume?.url && <a href={profile.resume.url} target="_blank" rel="noreferrer" style={btn}>📄 Resume{profile.resume.score ? ` · ${profile.resume.score}/100` : ''}</a>}
              {profile.career?.githubUrl && <a href={profile.career.githubUrl} target="_blank" rel="noreferrer" style={btn}>🐙 GitHub{profile.career.githubScore ? ` · ${profile.career.githubScore}/100` : ''}</a>}
              {profile.career?.linkedinUrl && <a href={profile.career.linkedinUrl} target="_blank" rel="noreferrer" style={btn}>🔗 LinkedIn</a>}
              {profile.certificates.map((ct, i) => <span key={i} style={{ ...btn, cursor: 'default' }}>🎓 {ct.title}</span>)}
            </div>
          </Section>
        ) : null}

        {/* Contact CTA */}
        <div style={{ background: NAVY, borderRadius: 16, padding: '22px 26px', color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Interested in interviewing {s.firstName}?</div>
          <div style={{ color: '#c3cfe6', fontSize: 14, margin: '6px 0 14px' }}>We'll set it up — no cost to evaluate. Reach {contact?.via || 'CodeBegun Placements'}:</div>
          <a href={`mailto:${contact?.email || 'contact@codebegun.com'}?subject=Interview request — ${encodeURIComponent(s.name)}`}
            style={{ display: 'inline-block', background: TEAL, color: '#fff', textDecoration: 'none', fontWeight: 800, padding: '11px 22px', borderRadius: 10 }}>
            ✉️ Request an interview
          </a>
        </div>

        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11.5, margin: '20px 0' }}>
          Verified by CodeBegun — Java Full Stack Training &amp; Placements, Hyderabad. Scores reflect the candidate's assessments and are current as of {new Date(profile.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.
        </div>
      </div>
    </div>
  );
};

const btn: React.CSSProperties = { display: 'inline-block', background: '#fff', border: '1px solid #cdd6e6', color: NAVY, borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700, textDecoration: 'none' };

export default CandidateProfile;
