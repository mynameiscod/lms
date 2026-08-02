import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { AssessResult, TodayMissions } from '../../api/passportApi';
import { useAuth } from '../../contexts/AuthContext';
import { MEMBER_NAV } from './PassportShell';
import './missionControl.css';
import './member.css';

/**
 * Mission Control — the Passport student's home. Pre-assessment it shows the CareerPilot
 * "Your Career Journey Starts with Clarity" landing (free Career Readiness Assessment CTA
 * + Career Score panel). Once a member it shows today's personalized missions & streak.
 */
const CAT_ICON: Record<string, string> = {
  career_clarity: '🎯', aptitude: '🔢', logical_reasoning: '🧩',
  technical: '💻', communication: '🗣️', employability: '💼',
};

const CHECKS: [string, string][] = [
  ['Know Your Current Level', 'Get your Career Score and see how career-ready you are.'],
  ['Identify Your Strengths & Gaps', "Discover what you're good at and what needs improvement."],
  ['Get Your Personalized Roadmap', 'Receive a 90-day plan tailored to your goals and academic year.'],
  ['Start Taking Daily Action', 'Unlock daily missions, practice, and expert guidance.'],
];

const CATS: { ic: string; bg: string; title: string; desc: string }[] = [
  { ic: '📊', bg: '#e7f8f0', title: 'Skills', desc: 'Evaluate your technical skills' },
  { ic: '✖️', bg: '#fff2e3', title: 'Aptitude', desc: 'Test your logical & numerical ability' },
  { ic: '💬', bg: '#eef0ff', title: 'Communication', desc: 'Assess your communication readiness' },
  { ic: '💼', bg: '#e6f2ff', title: 'Employability', desc: 'Check your job readiness factors' },
];

const WHY: { ic: string; bg: string; title: string; desc: string }[] = [
  { ic: '🎯', bg: '#e7f8f0', title: 'Right Career Direction', desc: 'Understand which career path suits you best based on your strengths and interests.' },
  { ic: '📈', bg: '#fff2e3', title: 'Personalized Roadmap', desc: 'Get a customized 90-day roadmap based on your academic year and goals.' },
  { ic: '⭐', bg: '#efeaff', title: 'Improve Faster', desc: 'Focus on the right skills and activities that will make the biggest impact.' },
  { ic: '🏆', bg: '#e6f2ff', title: 'Stand Out', desc: 'Build a strong profile and become the kind of candidate employers value.' },
  { ic: '📈', bg: '#fdeaea', title: 'Track Your Growth', desc: 'See your progress over time and celebrate every improvement.' },
];

const COLLEGES: [string, string, string][] = [
  ['🎓', 'VIT', 'Vellore Institute of Technology'],
  ['🎓', 'SRM', 'Institute of Science & Technology'],
  ['🎓', 'GITAM', '(Deemed to be University)'],
  ['🎓', 'Andhra University', 'Andhra University'],
  ['🏛️', '200+ More Colleges', 'Across AP & Telangana'],
];

const MissionControl: React.FC = () => {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [result, setResult] = useState<AssessResult | null>(null);
  const [today, setToday] = useState<TodayMissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  const whyRef = useRef<HTMLDivElement>(null);

  const savePassword = async () => {
    if (pwd.length < 6) { setPwdMsg('Use at least 6 characters.'); return; }
    setPwdBusy(true); setPwdMsg('');
    try {
      await passportApi.setPassword(pwd);
      setStatus((s: any) => ({ ...s, passwordSet: true }));
      setPwdOpen(false); setPwd('');
    } catch (e: any) { setPwdMsg(e?.response?.data?.message || 'Could not save password.'); }
    setPwdBusy(false);
  };

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        passportApi.me().catch(() => null),
        passportApi.getResult().catch(() => ({ result: null })),
      ]);
      setStatus(s); setResult(r?.result || null);
      if (s?.active) { try { setToday(await passportApi.getToday()); } catch { /* */ } }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // If a payment completed in a redirected tab (checkout callback never fired here),
  // re-check membership when the user returns to this tab so the unlocked state shows.
  useEffect(() => {
    const onFocus = () => { if (!status?.active) load(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [status?.active, load]);

  const unlock = async () => {
    setPaying(true); setPayMsg('');
    const res = await passportApi.membershipCheckout();
    setPaying(false);
    if (res.ok) { setPayMsg(''); setLoading(true); await load(); }
    else setPayMsg(res.message || 'Payment did not complete.');
  };

  const toggleMission = async (key: string) => {
    setToday(t => t && ({ ...t, missions: t.missions?.map(m => m.key === key ? { ...m, done: true } : m) }));
    try {
      const r = await passportApi.completeMission(key);
      setToday(t => t && ({ ...t, xp: r.xp, streak: r.streak, longestStreak: r.longestStreak, allDone: r.allDone }));
    } catch { load(); }
  };

  const share = async () => {
    const slug = status?.shareSlug;
    if (!slug) return;
    const url = `${window.location.origin}/passport/card/${slug}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy your CareerPilot link:', url); }
  };

  const firstName = user?.firstName || (status?.name || '').split(' ')[0] || 'there';
  const initial = (firstName[0] || 'C').toUpperCase();

  const Topbar = (
    <div className="mc-topbar">
      <div className="mc-brand">
        <span className="mark">🧭</span>
        <div className="bt"><b>Career<span className="p">Pilot</span></b><small>Powered by CodeBegun</small></div>
      </div>
      <div className="mc-top-right">
        <button className="mc-how" onClick={() => whyRef.current?.scrollIntoView({ behavior: 'smooth' })}>
          <span className="pl">▶</span><span className="t">How it works</span>
        </button>
        <div className="mc-user">
          <button className="mc-user-btn" onClick={() => setMenuOpen(o => !o)}>
            <span className="av">{initial}</span>
            <span className="who"><small>Welcome back,</small><b>{firstName}</b></span>
            <span className="cr">▼</span>
          </button>
          {menuOpen && (
            <div className="mc-menu">
              <button onClick={() => nav('/passport/assessment')}>My assessment result</button>
              {status?.active && status?.shareSlug && <button onClick={share}>{copied ? 'Link copied!' : 'Share my Passport'}</button>}
              <button onClick={() => logout()}>Log out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Loading your CareerPilot…</div>;

  const active = !!status?.active;
  const hasScore = !!result;
  const price = status?.priceInr ?? 499;
  const scoreNum = hasScore ? result!.careerScore : 0;

  // ── Member: today's missions ──
  if (active) {
    return (
      <div className="mc-shell">
        {Topbar}
        {/* Member nav — every paid surface lives under /passport, never in the LMS. */}
        <nav className="pm-nav" style={{ maxWidth: 1040 }}>
          {MEMBER_NAV.map(n => (
            <button key={n.path} className={`pm-nav-item${n.path === '/passport' ? ' on' : ''}`} onClick={() => nav(n.path)}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '16px 26px 0' }}>
          {status && status.passwordSet === false && (
            <div style={{ background: 'linear-gradient(90deg,#eef0ff,#e7f8f5)', border: '1px solid #dcd7fb', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22 }}>🔒</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Secure your account — set a password</div>
                <div style={{ fontSize: 12.5, color: '#64748b' }}>So you can log in next time without a WhatsApp code.</div>
              </div>
              {!pwdOpen ? (
                <button onClick={() => setPwdOpen(true)} style={{ background: '#6650d8', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}>Set password</button>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="New password (min 6)" onKeyDown={e => e.key === 'Enter' && savePassword()}
                    style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, width: 190 }} />
                  <button onClick={savePassword} disabled={pwdBusy} style={{ background: '#14a89c', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}>{pwdBusy ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => { setPwdOpen(false); setPwdMsg(''); }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                </div>
              )}
              {pwdMsg && <div style={{ flexBasis: '100%', fontSize: 12.5, color: '#b91c1c' }}>{pwdMsg}</div>}
            </div>
          )}
          {hasScore && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, marginBottom: 18 }}>
              <Stat label="Career Score" big={String(result!.careerScore)} hint={result!.level} />
              <Stat label="Pathway" big={result!.pathwayLabel} />
              <Stat label="Streak" big={`${today?.streak ?? 0}d`} hint="Keep it alive" />
              <Stat label="XP" big={String(today?.xp ?? 0)} hint="Earned" />
            </div>
          )}

          <div style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 16, padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Today’s Missions{today?.day ? ` · Day ${today.day}` : ''}</div>
              {today?.allDone && <span style={{ fontSize: 12.5, fontWeight: 800, color: '#14a89c', background: '#e7f8f5', padding: '4px 10px', borderRadius: 99 }}>✓ All done — see you tomorrow!</span>}
            </div>

            {today?.needsAssessment ? (
              <div style={{ color: '#64748b', fontSize: 14 }}>Take the <button onClick={() => nav('/passport/assessment')} style={linkBtn}>Career Readiness Assessment</button> first to personalize your missions.</div>
            ) : !today?.missions?.length ? (
              <div style={{ color: '#94a3b8', fontSize: 14 }}>No missions for today. Check back tomorrow.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {today.missions.map(m => (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', border: '1px solid #eef1f6', borderRadius: 12, background: m.done ? '#f6fbf9' : '#fff' }}>
                    <button onClick={() => !m.done && toggleMission(m.key)} disabled={m.done}
                      style={{ width: 24, height: 24, borderRadius: 7, border: m.done ? 'none' : '2px solid #cbd5e1', background: m.done ? '#14a89c' : '#fff', color: '#fff', cursor: m.done ? 'default' : 'pointer', flexShrink: 0, fontWeight: 800 }}>
                      {m.done ? '✓' : ''}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a', textDecoration: m.done ? 'line-through' : 'none', opacity: m.done ? 0.6 : 1 }}>{CAT_ICON[m.category] || '•'} {m.title}</div>
                      <div style={{ fontSize: 12.5, color: '#64748b' }}>{m.detail}</div>
                    </div>
                    {m.link && !m.done && <button onClick={() => nav(m.link!)} style={{ ...linkBtn, whiteSpace: 'nowrap' }}>Open →</button>}
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#6650d8', background: '#f4f2ff', padding: '3px 8px', borderRadius: 99 }}>+{m.xp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 14 }}>
            <QuickCard title="🗺️ My 90-day roadmap" onClick={() => nav('/passport/roadmap')} sub="Every week, every day, planned" />
            <QuickCard title="💻 Practice Lab" onClick={() => nav('/passport/practice')} sub="Code that actually runs" />
            <QuickCard title="🎙️ Mock interview" onClick={() => nav('/passport/interview')} sub="AI interviewer + scored feedback" />
            <QuickCard title="📄 Resume Center" onClick={() => nav('/passport/resume')} sub="Build it, score it, fix it" />
            <QuickCard title="📊 My assessment result" onClick={() => nav('/passport/assessment')} sub="Score, breakdown & pathway" />
            <QuickCard title="🎫 My CareerPilot" onClick={share} sub={copied ? 'Link copied!' : 'Share your verified card'} />
          </div>
        </div>
      </div>
    );
  }

  // ── Scored, not yet a member: stats + unlock hero ──
  if (hasScore) {
    return (
      <div className="mc-shell">
        {Topbar}
        <div className="mc-scored">
          <div className="mc-hd">
            <h1>🚀 Mission <span className="b">Control</span></h1>
            <p>Your CodeBegun CareerPilot — one place that tells you what to do next.</p>
          </div>

          <div className="mc-stats">
            <div className="mc-stat"><span className="ic" style={{ background: '#e7f8f0' }}>📈</span><div><div className="lbl">Career Score</div><div className="val">{result!.careerScore}</div><div className="hint">{result!.level}</div></div></div>
            <div className="mc-stat"><span className="ic" style={{ background: '#efeaff' }}>🚩</span><div><div className="lbl">Pathway</div><div className="val" style={{ fontSize: 16 }}>{result!.pathwayLabel}</div></div></div>
            <div className="mc-stat"><span className="ic" style={{ background: '#fff2e3' }}>🔥</span><div><div className="lbl">Streak</div><div className="val">0d</div><div className="hint">Unlock to start</div></div></div>
            <div className="mc-stat"><span className="ic" style={{ background: '#e6f2ff' }}>⭐</span><div><div className="lbl">XP</div><div className="val">—</div><div className="hint">Unlock to earn</div></div></div>
          </div>

          <div className="mc-unlock-hero">
            <h2>Unlock your full <span className="y">90-day</span> journey</h2>
            <div className="mc-uh-feats">
              <div><span className="ck">✓</span> Daily missions</div>
              <div><span className="ck">✓</span> Verified practice</div>
              <div><span className="ck">✓</span> Mock interviews</div>
              <div><span className="ck">✓</span> Shareable CareerPilot</div>
              <div><span className="ck">✓</span> Personalized for your score</div>
            </div>
            {status?.paymentAvailable === false ? (
              <p className="mc-uh-note">Online payment isn’t enabled yet — please <a href="#contact" onClick={e => e.preventDefault()}>contact your mentor</a> to activate.</p>
            ) : null}
            {status?.paymentAvailable === false ? (
              <button className="mc-uh-btn" onClick={() => nav('/passport/assessment')}>🔓 Unlock My 90-Day CareerPilot</button>
            ) : (
              <button className="mc-uh-btn" onClick={unlock} disabled={paying}>{paying ? 'Opening payment…' : `🔓 Unlock My 90-Day CareerPilot — ₹${price}`}</button>
            )}
            {payMsg && <div className="mc-uh-paymsg">{payMsg}</div>}
            <button className="mc-uh-link" onClick={() => nav('/passport/roadmap')}>See what's in the 90 days →</button>
            <button className="mc-uh-link" onClick={() => nav('/passport/assessment')}>View my full result →</button>
          </div>

          <div className="mc-features">
            {[['🎯', '#efeaff', 'Personalized Roadmap', 'Based on your goals'], ['🤝', '#e7f8f0', 'Industry Mentorship', 'Learn from experts'], ['🧠', '#fff2e3', 'AI-Powered Insights', 'Smart recommendations'], ['💻', '#e6f2ff', 'Real-world Projects', 'Build & showcase'], ['💼', '#fdeaea', 'Placement Support', 'Interview to offer']].map(([ic, bg, t, d]) => (
              <div className="mc-feat2" key={t}><div className="ic" style={{ background: bg }}>{ic}</div><b>{t}</b><span>{d}</span></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Free / pre-assessment: CareerPilot "Clarity" landing ──
  return (
    <div className="mc-shell">
      {Topbar}

      <div className="mc-hero">
        {/* Left */}
        <div className="mc-left">
          <span className="mc-chip">🚀 Mission Control</span>
          <h1 className="mc-h1">Your Career Journey <span className="b">Starts with Clarity</span></h1>
          <p className="mc-lead">Take the free Career Readiness Assessment to know where you stand today and get a personalized roadmap to achieve your dream career.</p>

          <div className="mc-checks">
            {CHECKS.map(([t, d]) => (
              <div className="mc-check" key={t}><span className="ck">✓</span><div><b>{t}</b><span>{d}</span></div></div>
            ))}
          </div>

          {!hasScore ? (
            <>
              <button className="mc-cta" onClick={() => nav('/passport/assessment')}>Start Free Assessment →</button>
              <div className="mc-cta-note">Takes about 5 minutes • No payment needed</div>
            </>
          ) : (
            <>
              <button className="mc-cta" onClick={() => nav('/passport/assessment')}>View My Result & Roadmap →</button>
              {status?.paymentAvailable === false ? (
                <div className="mc-cta-note">You scored {scoreNum}/100 — contact your mentor to unlock your 90-day journey.</div>
              ) : (
                <>
                  <div><button className="mc-unlock" onClick={unlock} disabled={paying}>{paying ? 'Opening payment…' : `🔓 Unlock Full Journey — ₹${price}`}</button></div>
                  <div className="mc-cta-note">You scored {scoreNum}/100 — unlock daily missions, mock interviews & your CareerPilot.</div>
                </>
              )}
              {payMsg && <div className="mc-paymsg">{payMsg}</div>}
            </>
          )}
        </div>

        {/* Right — score panel */}
        <div className="mc-right">
          <div className="mc-scorewrap">
            <div className="mc-score-head">
              <h3>🔑 Your Career Score can open new doors</h3>
              <p>Thousands of students have discovered their path.<br />Now it’s your turn!</p>
            </div>
            <div className="mc-score-card">
              <div className="mc-score-top">
                <div>
                  <div className="lbl">Career Readiness Score</div>
                  <div className="num">{scoreNum}<small> / 100</small></div>
                </div>
                <div className="mc-rocket">🚀</div>
              </div>
              <div className="mc-bar"><i style={{ width: `${Math.max(scoreNum, 4)}%` }} /></div>
              <div className="mc-cats">
                {CATS.map(c => (
                  <div className="mc-cat" key={c.title}>
                    <span className="ic" style={{ background: c.bg }}>{c.ic}</span>
                    <div><b>{c.title}</b><span>{c.desc}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why take */}
      <div className="mc-why" ref={whyRef}>
        <h2>Why take the Career Readiness Assessment?</h2>
        <div className="mc-why-grid">
          {WHY.map(w => (
            <div className="mc-why-card" key={w.title}>
              <div className="ic" style={{ background: w.bg }}>{w.ic}</div>
              <b>{w.title}</b><span>{w.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Colleges */}
      <div className="mc-colleges">
        <span className="cl-label">Trusted by Students from</span>
        {COLLEGES.map(([ic, nm, sub]) => (
          <div className="mc-college" key={nm}>
            <span className="badge">{ic}</span>
            <div className="nm"><b>{nm}</b><span>{sub}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; big: string; hint?: string }> = ({ label, big, hint }) => (
  <div style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, padding: '16px 18px' }}>
    <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: 2 }}>{big}</div>
    {hint && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{hint}</div>}
  </div>
);

const QuickCard: React.FC<{ title: string; sub: string; onClick: () => void }> = ({ title, sub, onClick }) => (
  <button onClick={onClick} style={{ textAlign: 'left', background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, padding: '16px 18px', cursor: 'pointer' }}>
    <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>{title}</div>
    <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>{sub}</div>
  </button>
);

const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#6650d8', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 };

export default MissionControl;
