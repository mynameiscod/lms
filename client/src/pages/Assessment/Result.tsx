import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { assessmentApi, DIMENSION_LABELS } from '../../api/assessmentApi';
import './assessment.css';

interface SubScore { dimension: string; percentage: number; }
interface ResultData {
  status: string;
  candidateName?: string;
  segment?: string;
  subScores: SubScore[];
  readinessScore?: number;
  careerReadinessScore?: number;
  profileScores?: { resume?: number; github?: number; linkedin?: number; communication?: number; interviewReadiness?: number };
  targetRole?: string;
  percentile?: number;
  roadmap?: { planTitle?: string; gaps?: string[]; narrative?: string; targetRole?: string; salaryBand?: string; timelineWeeks?: number };
  skillGap?: {
    known?: string[];
    weak?: { skill: string; why?: string; marketRelevance?: number; priority?: 'High' | 'Medium' | 'Low' }[];
    missing?: { skill: string; why?: string; marketRelevance?: number; priority?: 'High' | 'Medium' | 'Low' }[];
  };
  newAccount?: boolean;   // false = they already had an account (log in with existing)
}

const PRIO_COLORS: Record<string, { bg: string; fg: string }> = {
  High: { bg: '#fee2e2', fg: '#b91c1c' }, Medium: { bg: '#fef3c7', fg: '#b45309' }, Low: { bg: '#e0e7ff', fg: '#4338ca' },
};

const PURPLE = '#6650d8', TEAL = '#14a89c', NAVY = '#0a2a5e', INK = '#1f2937', MUTED = '#64748b';

// Warm, honest label for the readiness band.
const readinessBand = (v: number): { label: string; color: string } => {
  if (v >= 80) return { label: 'Job-ready', color: '#0a8d7a' };
  if (v >= 60) return { label: 'Almost there', color: '#14a89c' };
  if (v >= 40) return { label: 'Getting there', color: '#6650d8' };
  if (v >= 20) return { label: 'Strong start', color: '#e8830c' };
  return { label: 'Early days', color: '#e8830c' };
};

// Circular readiness gauge (conic-gradient ring).
const Gauge: React.FC<{ value: number }> = ({ value }) => {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ width: 176, height: 176, borderRadius: '50%', background: `conic-gradient(${TEAL} 0% ${v}%, #e9ecf4 ${v}% 100%)`, display: 'grid', placeItems: 'center', margin: '0 auto', boxShadow: '0 8px 24px rgba(20,168,156,.15)' }}>
      <div style={{ width: 138, height: 138, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', boxShadow: 'inset 0 2px 8px rgba(0,0,0,.05)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1, background: `linear-gradient(90deg,${PURPLE},${TEAL})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{v}%</div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4, fontWeight: 600, letterSpacing: .3 }}>JOB-READY</div>
        </div>
      </div>
    </div>
  );
};

const Result: React.FC = () => {
  const { token = '' } = useParams();
  const [data, setData] = useState<ResultData | null>(null);
  const [err, setErr] = useState('');
  const [mentorAsked, setMentorAsked] = useState(false);

  useEffect(() => {
    (async () => {
      try { setData(await assessmentApi.getResult(token)); }
      catch (e: any) { setErr(e.message || 'Failed to load your result.'); }
    })();
  }, [token]);

  if (err) return <div className="as-root"><div className="as-wrap"><div className="as-card as-center"><div className="as-err">{err}</div></div></div></div>;
  if (!data) return <div className="as-root"><div className="as-loading"><div className="as-spinner" /></div></div>;

  const readiness = data.readinessScore ?? 0;
  const rm = data.roadmap;
  const name = data.candidateName?.split(' ')[0] || 'there';
  const initials = (data.candidateName || 'CB').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const band = readinessBand(readiness);
  const role = data.targetRole || rm?.targetRole || 'your target role';
  const existing = data.newAccount === false;

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8ecf3', borderRadius: 16, padding: 22, boxShadow: '0 2px 12px rgba(16,24,40,.04)' };
  const eyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: PURPLE, letterSpacing: .6, textTransform: 'uppercase' };

  // The 8 named readiness sub-scores (exam dimensions + profile scores).
  const dim = (k: string) => data.subScores.find(s => s.dimension === k)?.percentage;
  const ps = data.profileScores || {};
  const named: { label: string; v?: number; hint?: string }[] = [
    { label: 'Coding', v: dim('core_stack') },
    { label: 'DSA', v: dim('dsa') },
    { label: 'Reasoning', v: dim('problem_solving') ?? dim('aptitude') },
    { label: 'Resume', v: ps.resume, hint: 'Upload a resume to score this' },
    { label: 'GitHub', v: ps.github, hint: 'Add your GitHub to score this' },
    { label: 'Communication', v: ps.communication, hint: 'Describe a project to score this' },
    { label: 'LinkedIn', v: ps.linkedin, hint: 'Add LinkedIn details to score this' },
    { label: 'Interview Readiness', v: ps.interviewReadiness, hint: 'Take a mock interview to unlock' },
  ];

  const NAV: { label: string; ic: string; to?: string; lock?: boolean }[] = [
    { label: 'Overview', ic: '🏠', to: 'rz-top' },
    { label: 'Skill Analysis', ic: '📊', to: 'rz-skill' },
    { label: 'Roadmap', ic: '🗺️', to: 'rz-path' },
    { label: 'Practice', ic: '⌨️', lock: true },
    { label: 'Mock Interviews', ic: '🎤', lock: true },
    { label: 'DSA Practice', ic: '🧩', lock: true },
    { label: 'Projects', ic: '🚀', lock: true },
    { label: 'Mentorship', ic: '🧭', lock: true },
    { label: 'Settings', ic: '⚙️', lock: true },
  ];
  const goLogin = () => { window.location.href = '/login'; };
  const onNav = (n: typeof NAV[number]) => {
    if (n.lock) return goLogin();
    if (n.to) document.getElementById(n.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const Bar: React.FC<{ label: string; v?: number; hint?: string }> = ({ label, v, hint }) => {
    const has = v != null;
    const weak = has && (v as number) < 50;
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
          <span style={{ color: INK, fontWeight: 600 }}>{label}{weak && <span style={{ color: '#e8830c', fontWeight: 700 }}> · focus area</span>}</span>
          {has ? <b style={{ color: weak ? '#e8830c' : INK }}>{v}%</b>
            : <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, background: '#f1f5f9', borderRadius: 12, padding: '1px 9px' }}>Pending</span>}
        </div>
        {has ? (
          <div style={{ height: 8, background: '#eef1f6', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${v}%`, height: '100%', borderRadius: 6, background: weak ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : `linear-gradient(90deg,${PURPLE},${TEAL})`, transition: 'width .6s ease' }} />
          </div>
        ) : <div style={{ fontSize: 11, color: '#94a3b8' }}>{hint}</div>}
      </div>
    );
  };

  return (
    <div className="rz-shell" id="rz-top">
      <style>{`
        .rz-shell{min-height:100vh;background:#f4f6fb;color:#1f2937;font-family:inherit;}
        .rz-top{position:sticky;top:0;z-index:20;background:#fff;border-bottom:1px solid #e8ecf3;display:flex;align-items:center;justify-content:space-between;padding:12px 22px;}
        .rz-logo{display:flex;align-items:center;gap:9px;font-weight:800;font-size:18px;color:#0f2350;}
        .rz-logo .mk{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#6650d8,#14a89c);}
        .rz-logo .cmp{color:#94a3b8;font-weight:700;font-size:12.5px;}
        .rz-user{display:flex;align-items:center;gap:14px;}
        .rz-ava{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6650d8,#14a89c);color:#fff;display:grid;place-items:center;font-weight:800;font-size:13px;}
        .rz-body{display:grid;grid-template-columns:224px 1fr;max-width:1300px;margin:0 auto;}
        .rz-side{padding:18px 14px;border-right:1px solid #e8ecf3;background:#fff;}
        .rz-nav a{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;font-size:13.5px;font-weight:600;color:#475569;cursor:pointer;margin-bottom:2px;}
        .rz-nav a.on{background:#eef0ff;color:#6650d8;}
        .rz-nav a:hover{background:#f5f6fb;}
        .rz-nav .lk{margin-left:auto;font-size:11px;opacity:.55;}
        .rz-pro{margin-top:18px;background:linear-gradient(135deg,#f3f0ff,#eafaf7);border:1px solid #e6e2fb;border-radius:14px;padding:15px;text-align:center;}
        .rz-main{padding:22px 26px 44px;min-width:0;}
        .rz-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        .rz-hero{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
        .rz-eye{font-size:11px;font-weight:800;color:#6650d8;letter-spacing:.6px;text-transform:uppercase;}
        @media(max-width:920px){.rz-body{grid-template-columns:1fr;}.rz-side{display:none;}.rz-grid2,.rz-hero{grid-template-columns:1fr;}}
      `}</style>

      {/* Top bar */}
      <div className="rz-top">
        <div className="rz-logo"><span className="mk" /> CareerPilot <span className="cmp">by CodeBegun</span></div>
        <div className="rz-user">
          <span style={{ fontSize: 18 }}>🔔</span>
          <div style={{ textAlign: 'right', lineHeight: 1.15 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{data.candidateName || 'Candidate'}</div>
            <div style={{ fontSize: 11.5, color: MUTED }}>{role}</div>
          </div>
          <div className="rz-ava">{initials}</div>
        </div>
      </div>

      <div className="rz-body">
        {/* Sidebar */}
        <aside className="rz-side">
          <nav className="rz-nav">
            {NAV.map((n, i) => (
              <a key={n.label} className={i === 0 ? 'on' : ''} onClick={() => onNav(n)}>
                <span>{n.ic}</span>{n.label}{n.lock && <span className="lk">🔒</span>}
              </a>
            ))}
          </nav>
          <div className="rz-pro">
            <div style={{ fontSize: 22 }}>🚀</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: INK, margin: '4px 0 2px' }}>Upgrade to Pro</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 10 }}>Unlock full plan, mocks &amp; 1:1 mentorship</div>
            <button onClick={goLogin} style={{ width: '100%', background: `linear-gradient(90deg,${PURPLE},${TEAL})`, color: '#fff', border: 'none', borderRadius: 9, padding: '9px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Upgrade Now</button>
          </div>
        </aside>

        {/* Main */}
        <main className="rz-main">
          <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: INK, margin: 0 }}>Welcome back, {name}! 👋</h1>
              <p style={{ fontSize: 13.5, color: MUTED, margin: '4px 0 0' }}>Here's your personalized roadmap to your dream role.</p>
            </div>
            <button onClick={() => window.print()} style={{ background: '#fff', border: `1.5px solid ${PURPLE}`, color: PURPLE, borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>⬇ Download Report</button>
          </div>

          {/* Hero pair */}
          <div className="rz-hero">
            <div style={{ ...card, background: 'linear-gradient(135deg,#faf9ff,#eef6ff)', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={eyebrow}>Your job readiness</div>
              <div style={{ margin: '16px 0 12px' }}><Gauge value={readiness} /></div>
              <div style={{ display: 'inline-block', margin: '0 auto', background: '#fff', color: band.color, border: `1.5px solid ${band.color}33`, borderRadius: 20, padding: '5px 16px', fontSize: 13, fontWeight: 800 }}>{band.label}</div>
              {data.percentile != null && <div style={{ marginTop: 12, fontSize: 12.5, color: '#0a8d7a', fontWeight: 700 }}>🔼 Ahead of {data.percentile}% of peers in your segment</div>}
            </div>

            <div style={{ ...card, background: `linear-gradient(135deg,${NAVY},${PURPLE})`, color: '#fff', border: 'none', boxShadow: '0 10px 30px rgba(102,80,216,.28)' }}>
              <div style={{ fontSize: 11, opacity: .82, fontWeight: 800, letterSpacing: .6 }}>YOUR TARGET POTENTIAL</div>
              <div style={{ fontSize: 32, fontWeight: 800, margin: '10px 0 4px' }}>{rm?.salaryBand || '₹4–8 LPA'}</div>
              <div style={{ fontSize: 13.5, opacity: .92, marginBottom: 16 }}>as a {role}{rm?.timelineWeeks ? ` · in ~${rm.timelineWeeks} weeks` : ''}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[{ ic: '🏢', t: 'High Demand', s: '80% market demand' }, { ic: '🎯', t: 'Best Match', s: role }, { ic: '📈', t: 'Growth Path', s: 'Strong trajectory' }].map(m => (
                  <div key={m.t} style={{ background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: '11px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16 }}>{m.ic}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, marginTop: 4 }}>{m.t}</div>
                    <div style={{ fontSize: 10.5, opacity: .85, marginTop: 1 }}>{m.s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Personalized path */}
          {rm && (
            <div style={{ ...card, marginBottom: 16, position: 'relative', overflow: 'hidden' }} id="rz-path">
              <div style={eyebrow}>Your personalized path</div>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: INK, margin: '6px 0 8px', lineHeight: 1.25, maxWidth: '80%' }}>{rm.planTitle || `Your ${role} roadmap`}</h2>
              {rm.narrative && <p style={{ fontSize: 13.5, lineHeight: 1.65, color: '#374151', margin: 0, maxWidth: '82%' }}>{rm.narrative}</p>}
              <div style={{ position: 'absolute', right: 18, top: 18, fontSize: 46, opacity: .5 }}>🏔️🚩</div>
              {!!rm.gaps?.length && (
                <div style={{ marginTop: 16, background: '#f8fafc', border: '1px solid #eef1f6', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginBottom: 10 }}>What your plan fixes first</div>
                  {rm.gaps.map((g, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#374151', marginBottom: i === rm.gaps!.length - 1 ? 0 : 9, lineHeight: 1.5 }}>
                      <span style={{ color: TEAL, fontWeight: 800, flexShrink: 0 }}>→</span><span>{g}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Breakdowns — side by side */}
          <div className="rz-grid2" id="rz-skill" style={{ marginBottom: 16 }}>
            <div style={card}>
              <div style={{ ...eyebrow, marginBottom: 14 }}>Your skill breakdown</div>
              {data.subScores.map(s => <Bar key={s.dimension} label={DIMENSION_LABELS[s.dimension] || s.dimension} v={s.percentage} />)}
            </div>
            <div style={card}>
              <div style={{ ...eyebrow, marginBottom: 4 }}>Career readiness · {role}</div>
              {data.careerReadinessScore != null && (
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>Combined across coding, projects, resume &amp; communication: <b style={{ color: INK }}>{data.careerReadinessScore}%</b></div>
              )}
              {named.map(n => <Bar key={n.label} label={n.label} v={n.v} hint={n.hint} />)}
            </div>
          </div>

          {/* Skill gap */}
          {data.skillGap && ((data.skillGap.weak?.length || 0) + (data.skillGap.missing?.length || 0) + (data.skillGap.known?.length || 0) > 0) && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ ...eyebrow, marginBottom: 12 }}>Skill gap for your target role</div>
              {!!data.skillGap.known?.length && (
                <>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#15803d', marginBottom: 7 }}>✅ Strengths you already have</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                    {data.skillGap.known.slice(0, 16).map((s, i) => <span key={i} style={{ fontSize: 12, background: '#dcfce7', color: '#15803d', borderRadius: 12, padding: '3px 10px', fontWeight: 600 }}>{s}</span>)}
                  </div>
                </>
              )}
              <div className="rz-grid2">
                {([['⚠️ Needs strengthening', data.skillGap.weak], ['➕ Missing for this role', data.skillGap.missing]] as const).map(([title, list], gi) => (
                  (list && list.length) ? (
                    <div key={gi}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 8 }}>{title}</div>
                      {list.map((it, i) => {
                        const pc = PRIO_COLORS[it.priority || 'Medium'];
                        return (
                          <div key={i} style={{ padding: '9px 0', borderBottom: i === list.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <b style={{ fontSize: 13, color: INK }}>{it.skill}</b>
                              {it.priority && <span style={{ fontSize: 10.5, fontWeight: 700, background: pc.bg, color: pc.fg, borderRadius: 10, padding: '1px 8px' }}>{it.priority} priority</span>}
                              {it.marketRelevance != null && <span style={{ fontSize: 11, color: MUTED }}>· {it.marketRelevance}% market demand</span>}
                            </div>
                            {it.why && <div style={{ fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 1.5 }}>{it.why}</div>}
                          </div>
                        );
                      })}
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          )}

          {/* CTA band */}
          <div style={{ background: `linear-gradient(120deg,${PURPLE},${TEAL})`, borderRadius: 16, padding: 24, color: '#fff', display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800 }}>🎉 {existing ? 'Your new plan is ready' : 'Your free preview is ready'}</div>
              <p style={{ fontSize: 13.5, opacity: .94, margin: '8px 0 12px', lineHeight: 1.6, maxWidth: 520 }}>
                {existing
                  ? 'You already have a CodeBegun account — your fresh plan has been added to it. Log in to play your first lesson, try a DSA problem and sample a mock interview.'
                  : "We've created your CodeBegun account and built your plan. Log in to play your first lesson, try a DSA problem and sample a mock interview — free."}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 12.5, fontWeight: 600 }}>
                <span>✓ First lesson — free</span><span>✓ A DSA problem — free</span><span>✓ Sample mock question</span><span style={{ opacity: .9 }}>🔒 Full plan, mocks &amp; mentor</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
              <button onClick={goLogin} style={{ background: '#fff', color: PURPLE, border: 'none', borderRadius: 11, padding: '13px 20px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>{existing ? 'Log in to your account →' : 'Log in & start free →'}</button>
              <button onClick={() => setMentorAsked(true)} disabled={mentorAsked} style={{ background: 'rgba(255,255,255,.16)', color: '#fff', border: '1.5px solid rgba(255,255,255,.5)', borderRadius: 11, padding: '11px 20px', fontWeight: 700, fontSize: 13.5, cursor: mentorAsked ? 'default' : 'pointer' }}>{mentorAsked ? '✓ A mentor will reach out' : '💬 Talk to a mentor'}</button>
              <div style={{ fontSize: 11, opacity: .9, textAlign: 'center', lineHeight: 1.5 }}>
                {existing ? <>Forgot your password? <a href="/forgot-password" style={{ color: '#fff', fontWeight: 700 }}>Reset it</a></> : 'Login details were sent to your email & WhatsApp'}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer style={{ background: '#0b1730', color: '#aab6cf', padding: '26px 26px', marginTop: 8 }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between' }}>
          <div style={{ maxWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#fff', fontSize: 16 }}><span style={{ width: 22, height: 22, borderRadius: 7, background: `linear-gradient(135deg,${PURPLE},${TEAL})` }} /> CareerPilot <span style={{ color: '#7385a8', fontSize: 12 }}>by CodeBegun</span></div>
            <p style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 8 }}>Your AI co-pilot to a successful tech career.</p>
          </div>
          <div style={{ fontSize: 12.5 }}><div style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Quick Links</div>Roadmap · Practice · Blog · Community</div>
          <div style={{ fontSize: 12.5 }}><div style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Support</div>Help Center · Contact Us · Privacy Policy · Terms</div>
          <div style={{ fontSize: 12.5 }}><div style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Stay Connected</div>in · ig · yt · fb</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#6b7a97', marginTop: 22 }}>© {new Date().getFullYear()} CodeBegun. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default Result;
