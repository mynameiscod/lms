import React from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

// CodeBegun brand palette
const PURPLE = '#6650d8', TEAL = '#14a89c', NAVY = '#0a1740', INK = '#0f172a', MUTED = '#64748b';
const HERO_BG = 'linear-gradient(135deg,#0a1740 0%,#141c5a 55%,#20205f 100%)';
const CTA_GRAD = `linear-gradient(90deg,${PURPLE},${TEAL})`;

const Landing: React.FC = () => {
  const { tenantId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const search = params.toString() ? `?${params.toString()}` : '';
  const start = () => navigate(`/assessment/${tenantId}/register${search}`);

  const skills = [
    { name: 'Java', pct: 92, c: '#f59e0b' }, { name: 'Data Structures', pct: 76, c: TEAL },
    { name: 'React', pct: 70, c: '#3b82f6' }, { name: 'SQL', pct: 82, c: PURPLE },
    { name: 'Communication', pct: 48, c: '#f97316' }, { name: 'Problem Solving', pct: 68, c: '#06b6d4' },
  ];
  const reportIncludes = [
    ['🧠', 'Skill Analysis'], ['📄', 'Resume Review'], ['🐙', 'GitHub Analysis'],
    ['🔗', 'LinkedIn Review'], ['🎤', 'Mock Interview'], ['📈', 'Salary Prediction'],
  ];
  const credibility = [
    ['🧩', '20+ Skills', 'analysed per report'], ['🗺️', '90-Day', 'personalised roadmap'],
    ['🤖', 'AI-Powered', 'resume & code review'], ['⭐', '4.8/5', 'average learner rating'],
  ];
  const roadmap = [
    ['Day 1–7', '🧭', 'Fundamentals', 'Strengthen basics of programming'],
    ['Day 8–20', '⚙️', 'Core Concepts', 'DSA, OOPs, problem solving'],
    ['Day 21–40', '💻', 'Frontend', 'HTML, CSS, JS, React'],
    ['Day 41–60', '🛠️', 'Backend', 'Node.js, Express, databases'],
    ['Day 61–75', '🏗️', 'Projects', 'Build 2+ industry-level projects'],
    ['Day 76–90', '🎯', 'Interview-Ready', 'Mock interviews, aptitude, system design'],
  ];
  const testimonials = [
    ['“The report pinpointed exactly what my resume was missing. The roadmap gave me a clear path.”', 'Aspiring Full-Stack Developer'],
    ['“The resume review and salary insight were eye-opening — I finally knew where I stood.”', 'Recent Graduate'],
    ['“Mock interviews and personalised feedback helped me prepare with confidence.”', 'Career Switcher'],
  ];
  const plans = [
    { name: 'STARTER', price: '₹2,999', icon: '🚀', pop: false, feats: ['AI Skill Assessment', 'Personalised Roadmap', 'AI Resume Review', 'Basic Report'] },
    { name: 'PRO', price: '₹3,999', icon: '⭐', pop: true, feats: ['Everything in Starter', 'GitHub & LinkedIn Review', 'Mock Interview (1-on-1)', 'Advanced AI Report', 'Priority Support'] },
    { name: 'ELITE', price: '₹4,999', icon: '👑', pop: false, feats: ['Everything in Pro', 'Mentor Guidance (3 Sessions)', 'Mock Interviews (3 Sessions)', 'Placement Preparation', 'Job Assistance'] },
  ];

  const wrap: React.CSSProperties = { maxWidth: 1160, margin: '0 auto', padding: '0 20px' };
  const section: React.CSSProperties = { padding: '54px 0' };
  const kicker: React.CSSProperties = { display: 'inline-block', fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: PURPLE, background: '#efeaff', borderRadius: 20, padding: '5px 12px', textTransform: 'uppercase' };
  const h2: React.CSSProperties = { fontSize: 30, fontWeight: 800, color: INK, margin: '12px 0 6px', lineHeight: 1.2 };

  return (
    <div style={{ background: '#f6f7fb', color: INK, fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif' }}>
      {/* ── Nav ── */}
      <nav style={{ background: HERO_BG }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: CTA_GRAD, display: 'grid', placeItems: 'center', fontWeight: 800 }}>C</span>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>Career<span style={{ color: TEAL }}>Pilot</span></div>
              <div style={{ fontSize: 10.5, color: '#a9b4e0' }}>by CodeBegun</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            {['Features', 'Sample Report', 'Roadmap', 'Pricing', 'Success Stories'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/\s/g, '-')}`} style={{ color: '#c7cff2', textDecoration: 'none', fontSize: 13.5, fontWeight: 600 }} className="cdna-navlink">{l}</a>
            ))}
            <button onClick={start} style={{ background: CTA_GRAD, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Start Free Assessment</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header style={{ background: HERO_BG, color: '#fff', paddingBottom: 56 }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 40, alignItems: 'center', paddingTop: 30 }} className="cdna-hero">
          <div>
            <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.12, margin: '0 0 16px' }}>
              Find Out Why Companies Are <span style={{ background: 'linear-gradient(90deg,#f472b6,#a78bfa)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Rejecting</span> Your Resume
            </h1>
            <p style={{ fontSize: 16.5, color: '#c7cff2', lineHeight: 1.6, margin: '0 0 22px', maxWidth: 520 }}>
              Get your AI skill score, salary prediction, resume review and a personalised learning roadmap — in about 20 minutes.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              {[['✨', 'AI-Powered Analysis'], ['🗺️', 'Personalised Roadmap'], ['🎓', 'Expert Guidance'], ['⚡', 'Job-Ready in 90 Days']].map(([i, t], k) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, padding: '7px 12px', fontSize: 12.5, fontWeight: 600 }}>{i} {t}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={start} style={{ background: CTA_GRAD, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 26px', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 12px 28px rgba(102,80,216,.4)' }}>Start Free Assessment Now →</button>
              <span style={{ fontSize: 12.5, color: '#a9b4e0' }}>⏱ Takes ~20 minutes · No credit card required</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22, color: '#c7cff2', fontSize: 13 }}>
              <span style={{ display: 'flex' }}>{['#6650d8', '#14a89c', '#3b82f6', '#f59e0b'].map((c, i) => <span key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: '2px solid #131c5a', marginLeft: i ? -8 : 0 }} />)}</span>
              Join a growing community of students &amp; professionals
            </div>
          </div>

          {/* Hero report card */}
          <div style={{ background: 'rgba(11,20,60,.55)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 20, padding: 22 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 18, alignItems: 'center' }} className="cdna-herocard">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#a9b4e0', marginBottom: 8 }}>Placement Readiness</div>
                <div style={{ width: 128, height: 128, borderRadius: '50%', margin: '0 auto', background: `conic-gradient(${TEAL} 0% 83%, rgba(255,255,255,.12) 83% 100%)`, display: 'grid', placeItems: 'center' }}>
                  <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#0b1440', display: 'grid', placeItems: 'center' }}>
                    <div><div style={{ fontSize: 28, fontWeight: 800 }}>83%</div><div style={{ fontSize: 10, color: TEAL }}>Job Ready</div></div>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: '#a9b4e0', marginBottom: 8, fontWeight: 700 }}>Skill Breakdown</div>
                {skills.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#c7cff2', width: 96 }}>{s.name}</span>
                    <span style={{ flex: 1, height: 6, background: 'rgba(255,255,255,.1)', borderRadius: 4, overflow: 'hidden' }}><span style={{ display: 'block', width: `${s.pct}%`, height: '100%', background: s.c }} /></span>
                    <span style={{ fontSize: 11, color: '#e2e8f0', width: 30, textAlign: 'right' }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, margin: '16px 0' }}>
              {[['15', 'Strengths', TEAL], ['8', 'To improve', '#f59e0b'], ['₹6.5 LPA', 'Current (est.)', '#3b82f6'], ['₹8.5 LPA', 'After roadmap', PURPLE]].map(([v, l, c], i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: c as string }}>{v}</div><div style={{ fontSize: 10, color: '#a9b4e0' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: '#a9b4e0', fontWeight: 700, marginBottom: 8 }}>ALL-IN-ONE AI REPORT INCLUDES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6 }}>
              {reportIncludes.map(([i, t], k) => (
                <div key={k} style={{ textAlign: 'center', background: 'rgba(255,255,255,.05)', borderRadius: 8, padding: '8px 2px' }}>
                  <div style={{ fontSize: 15 }}>{i}</div><div style={{ fontSize: 8.5, color: '#c7cff2', marginTop: 2 }}>{t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── Credibility strip (softened) ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eef1f6' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, padding: '22px 20px' }} className="cdna-strip">
          {credibility.map(([i, a, b], k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
              <span style={{ fontSize: 24 }}>{i}</span>
              <div><div style={{ fontWeight: 800, color: INK }}>{a}</div><div style={{ fontSize: 12, color: MUTED }}>{b}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Career Report ── */}
      <section id="features" style={section}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 22, alignItems: 'start' }} className="cdna-3col">
          <div>
            <span style={kicker}>AI-Powered Report</span>
            <h2 style={h2}>Your Personalised AI Career Report</h2>
            {['In-depth skill assessment across 20+ technologies', 'AI resume review with actionable suggestions', 'GitHub analysis & project evaluation', 'LinkedIn profile optimisation tips', 'Salary prediction based on your skills', 'Personalised 90-day learning roadmap', 'Interview guidance & mock-interview score'].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, fontSize: 14, color: '#334155', margin: '10px 0', lineHeight: 1.5 }}><span style={{ color: TEAL, fontWeight: 800 }}>✓</span>{t}</div>
            ))}
            <button onClick={start} style={{ marginTop: 8, background: '#fff', border: `1.5px solid ${PURPLE}`, color: PURPLE, borderRadius: 10, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>View Sample Report →</button>
          </div>

          <div id="sample-report" style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 16, padding: 18, boxShadow: '0 6px 24px rgba(15,23,42,.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: PURPLE, letterSpacing: 0.5 }}>CAREERPILOT REPORT</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
              <span style={{ width: 40, height: 40, borderRadius: '50%', background: CTA_GRAD, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>R</span>
              <div><div style={{ fontWeight: 700, fontSize: 14 }}>Sample Candidate</div><div style={{ fontSize: 11, color: MUTED }}>B.Tech CSE · Final year</div></div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: INK, margin: '8px 0 6px' }}>Overall Placement Readiness</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: `conic-gradient(${TEAL} 0% 83%, #eef1f6 83% 100%)`, display: 'grid', placeItems: 'center' }}><div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800 }}>83%</div></div>
              <div style={{ flex: 1 }}>
                {[['Your Score', 83, TEAL], ['Peer Average', 54, '#cbd5e1']].map(([l, v, c], i) => (
                  <div key={i} style={{ marginBottom: 6 }}><div style={{ fontSize: 11, color: MUTED, display: 'flex', justifyContent: 'space-between' }}><span>{l}</span><b style={{ color: INK }}>{v}%</b></div><div style={{ height: 6, background: '#eef1f6', borderRadius: 4 }}><div style={{ width: `${v}%`, height: '100%', background: c as string, borderRadius: 4 }} /></div></div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 12, marginBottom: 6 }}>Top Strengths</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{['Java', 'SQL', 'Problem Solving', 'OOPs'].map(t => <span key={t} style={{ fontSize: 11, background: '#eef2ff', color: PURPLE, borderRadius: 12, padding: '3px 10px' }}>{t}</span>)}</div>
          </div>

          <div>
            <span style={{ ...kicker, color: TEAL, background: '#e6f7f4' }}>Salary Prediction</span>
            <h2 style={h2}>From Where You Are To Where You Can Be</h2>
            <div style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 16, padding: 18, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: MUTED }}>Current (est.)</div><div style={{ fontSize: 24, fontWeight: 800, color: INK }}>₹3.5 LPA</div></div>
                <div style={{ background: '#dcfce7', color: '#15803d', borderRadius: '50%', width: 66, height: 66, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13 }}>+142%</div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: MUTED }}>After roadmap</div><div style={{ fontSize: 24, fontWeight: 800, color: TEAL }}>₹8.5 LPA</div></div>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>Estimates based on your skills &amp; target role — not a guarantee.</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14, marginBottom: 6 }}>Top roles you can target</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{['Software Engineer', 'Frontend Developer', 'Full-Stack Developer', 'Backend Developer'].map(r => <span key={r} style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', borderRadius: 12, padding: '3px 10px' }}>{r}</span>)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Roadmap preview ── */}
      <section id="roadmap" style={{ ...section, background: '#fff' }}>
        <div style={{ ...wrap, textAlign: 'center' }}>
          <span style={kicker}>Your 90-Day Roadmap Preview</span>
          <h2 style={{ ...h2, textAlign: 'center' }}>Personalised. Structured. Job-Focused.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr) 1.2fr', gap: 12, marginTop: 24, textAlign: 'left' }} className="cdna-roadmap">
            {roadmap.map(([d, i, t, s], k) => (
              <div key={k} style={{ background: '#f8fafc', border: '1px solid #eef1f6', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: PURPLE }}>{d}</div>
                <div style={{ fontSize: 22, margin: '6px 0' }}>{i}</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{t}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{s}</div>
              </div>
            ))}
            <div style={{ background: NAVY, borderRadius: 12, padding: 16, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: 22 }}>🔒</div>
              <div style={{ fontSize: 13, fontWeight: 700, margin: '6px 0 10px' }}>Unlock Full 90-Day Roadmap</div>
              <button onClick={start} style={{ background: CTA_GRAD, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>Start Assessment</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Transformation ── */}
      <section style={section}>
        <div style={{ ...wrap }}>
          <span style={kicker}>The Journey</span>
          <h2 style={h2}>Real Assessment. Real Progress.</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            {[['Before', '42%', '#ef4444'], ['After roadmap', '68%', '#f59e0b'], ['With practice + mentorship', '91%', TEAL]].map(([l, v, c], i) => (
              <React.Fragment key={i}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 78, height: 78, borderRadius: '50%', background: `conic-gradient(${c} 0% ${v}, #eef1f6 ${v} 100%)`, display: 'grid', placeItems: 'center', margin: '0 auto' }}><div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, color: c as string }}>{v}</div></div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 6, maxWidth: 120 }}>{l}</div>
                </div>
                {i < 2 && <div style={{ fontSize: 22, color: '#cbd5e1' }}>→</div>}
              </React.Fragment>
            ))}
            <div style={{ fontSize: 22, color: '#cbd5e1' }}>→</div>
            <div style={{ textAlign: 'center' }}><div style={{ width: 78, height: 78, borderRadius: '50%', background: '#dcfce7', display: 'grid', placeItems: 'center', margin: '0 auto', fontSize: 30 }}>🏆</div><div style={{ fontSize: 12, color: '#15803d', marginTop: 6, fontWeight: 700 }}>Job-Ready</div></div>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>Illustrative journey — individual results vary.</div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="success-stories" style={{ ...section, background: '#fff' }}>
        <div style={{ ...wrap }}>
          <span style={kicker}>What Learners Say</span>
          <h2 style={h2}>Loved by learners</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 16 }} className="cdna-3col">
            {testimonials.map(([q, who], i) => (
              <div key={i} style={{ background: '#f8fafc', border: '1px solid #eef1f6', borderRadius: 14, padding: 18 }}>
                <div style={{ color: '#f59e0b', marginBottom: 8 }}>★★★★★</div>
                <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6 }}>{q}</div>
                <div style={{ fontSize: 12.5, color: MUTED, marginTop: 12, fontWeight: 600 }}>— {who}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>Representative feedback from learners.</div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={section}>
        <div style={{ ...wrap }}>
          <div style={{ textAlign: 'center' }}><span style={kicker}>Choose Your Plan</span><h2 style={{ ...h2, textAlign: 'center' }}>Simple, transparent pricing</h2></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginTop: 22, alignItems: 'start' }} className="cdna-3col">
            {plans.map(p => (
              <div key={p.name} style={{ background: p.pop ? NAVY : '#fff', color: p.pop ? '#fff' : INK, border: p.pop ? 'none' : '1px solid #eef1f6', borderRadius: 16, padding: 22, position: 'relative', boxShadow: p.pop ? '0 16px 40px rgba(10,23,64,.28)' : '0 4px 16px rgba(15,23,42,.05)' }}>
                {p.pop && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: CTA_GRAD, color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 20 }}>MOST POPULAR</div>}
                <div style={{ fontSize: 22 }}>{p.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.5, marginTop: 6, color: p.pop ? '#c7cff2' : MUTED }}>{p.name}</div>
                <div style={{ fontSize: 32, fontWeight: 800, margin: '6px 0 14px' }}>{p.price}</div>
                {p.feats.map((f, i) => <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, margin: '8px 0', color: p.pop ? '#dbe1fb' : '#334155' }}><span style={{ color: TEAL }}>✓</span>{f}</div>)}
                <button onClick={start} style={{ width: '100%', marginTop: 16, background: p.pop ? CTA_GRAD : '#fff', color: p.pop ? '#fff' : PURPLE, border: p.pop ? 'none' : `1.5px solid ${PURPLE}`, borderRadius: 10, padding: '11px', fontWeight: 800, cursor: 'pointer' }}>Get Started</button>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>Start with the free AI assessment — upgrade anytime.</div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ background: HERO_BG, color: '#fff', padding: '48px 0' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 30, alignItems: 'center' }} className="cdna-hero">
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>Your data is safe. Your growth is the goal. 🚀</div>
            {[['🔁', 'Not satisfied? Talk to our team', 'We’ll help you find the right path forward.'], ['🔒', 'Secure & private', 'Your data is used only to build your report.'], ['👥', 'Guided by mentors', 'Real people, real feedback on your journey.']].map(([i, a, b], k) => (
              <div key={k} style={{ display: 'flex', gap: 12, marginBottom: 12 }}><span style={{ fontSize: 20 }}>{i}</span><div><div style={{ fontWeight: 700, fontSize: 14 }}>{a}</div><div style={{ fontSize: 12.5, color: '#a9b4e0' }}>{b}</div></div></div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={start} style={{ background: CTA_GRAD, color: '#fff', border: 'none', borderRadius: 12, padding: '16px 30px', fontWeight: 800, fontSize: 17, cursor: 'pointer', boxShadow: '0 14px 34px rgba(102,80,216,.4)' }}>Start Your Free Assessment Now →</button>
            <div style={{ fontSize: 12.5, color: '#a9b4e0', marginTop: 12 }}>⏱ Takes ~20 minutes · No credit card required</div>
          </div>
        </div>
      </section>

      <footer style={{ background: '#070f2e', color: '#8b95c9', textAlign: 'center', padding: '20px', fontSize: 12.5 }}>
        © {new Date().getFullYear()} CodeBegun · CareerPilot — From Learning to Earning
      </footer>

      <style>{`
        .cdna-navlink:hover { color: #fff; }
        @media (max-width: 860px) {
          .cdna-hero, .cdna-3col, .cdna-strip, .cdna-roadmap, .cdna-herocard { grid-template-columns: 1fr !important; }
          nav .cdna-navlink { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Landing;
