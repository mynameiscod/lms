import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { AssessResult, TodayMissions } from '../../api/passportApi';
import { useAuth } from '../../contexts/AuthContext';
import { MEMBER_NAV } from './PassportShell';
import './missionControl.css';
import './member.css';
import MemberFooter from './MemberFooter';

/**
 * Mission Control — the Passport student's home. Pre-assessment it shows the CareerPilot
 * "Your Career Journey Starts with Clarity" landing (free Career Readiness Assessment CTA
 * + Career Score panel). Once a member it shows today's personalized missions & streak.
 */
/** Bootstrap Icons per scoring category. Unknown keys fall back where used. */
const CAT_ICON: Record<string, string> = {
  career_clarity: 'bi-bullseye', aptitude: 'bi-calculator-fill', logical_reasoning: 'bi-puzzle-fill',
  technical: 'bi-code-slash', communication: 'bi-chat-dots-fill', employability: 'bi-briefcase-fill',
};

/** `tone` picks the tile tint — each promise reads as its own thing, not one grey list. */
const CHECKS: { ic: string; tone: string; title: string; desc: string }[] = [
  { ic: 'bi-graph-up-arrow', tone: 'blue', title: 'Know Your Current Level', desc: 'Get your Career Score and see how career-ready you are.' },
  { ic: 'bi-bullseye', tone: 'teal', title: 'Identify Your Strengths & Gaps', desc: "Discover what you're good at and what needs improvement." },
  { ic: 'bi-map-fill', tone: 'amber', title: 'Get Your Personalized Roadmap', desc: 'Receive a 90-day plan tailored to your goals and academic year.' },
  { ic: 'bi-lightning-charge-fill', tone: 'violet', title: 'Start Taking Daily Action', desc: 'Unlock daily missions, practice, and expert guidance.' },
];

const CATS: { ic: string; tone: string; title: string; desc: string }[] = [
  { ic: 'bi-bar-chart-fill', tone: 'teal', title: 'Skills', desc: 'Evaluate your technical skills' },
  { ic: 'bi-calculator-fill', tone: 'amber', title: 'Aptitude', desc: 'Test your logical & numerical ability' },
  { ic: 'bi-chat-dots-fill', tone: 'violet', title: 'Communication', desc: 'Assess your communication readiness' },
  { ic: 'bi-briefcase-fill', tone: 'blue', title: 'Employability', desc: 'Check your job readiness factors' },
];

const WHY: { ic: string; tone: string; title: string; desc: string }[] = [
  { ic: 'bi-bullseye', tone: 'rose', title: 'Right Career Direction', desc: 'Understand which career path suits you best based on your strengths and interests.' },
  { ic: 'bi-map-fill', tone: 'blue', title: 'Personalized Roadmap', desc: 'Get a customized 90-day roadmap based on your academic year and goals.' },
  { ic: 'bi-star-fill', tone: 'amber', title: 'Improve Faster', desc: 'Focus on the right skills and activities that will make the biggest impact.' },
  { ic: 'bi-trophy-fill', tone: 'violet', title: 'Stand Out', desc: 'Build a strong profile and become the kind of candidate employers value.' },
  { ic: 'bi-graph-up-arrow', tone: 'teal', title: 'Track Your Growth', desc: 'See your progress over time and celebrate every improvement.' },
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
  const whyRef = useRef<HTMLDivElement>(null);

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
    const url = `${window.location.origin}/careerpilot/card/${slug}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy your CareerPilot link:', url); }
  };

  const firstName = user?.firstName || (status?.name || '').split(' ')[0] || 'there';
  const initial = (firstName[0] || 'C').toUpperCase();

  const Topbar = (
    <div className="mc-topbar">
      <div className="mc-brand">
        <span className="mark"><i className="bi bi-compass" /></span>
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
              <button onClick={() => nav('/careerpilot/assessment')}>My assessment result</button>
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
            <button key={n.path} className={`pm-nav-item${n.path === '/careerpilot' ? ' on' : ''}`} onClick={() => nav(n.path)}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '16px 26px 0' }}>
          {/* The set-password nudge now lives in MemberShell, which wraps every
              member page — including the Dashboard, where it was never shown. */}
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
              {today?.allDone && <span style={{ fontSize: 12.5, fontWeight: 800, color: '#14a89c', background: '#e7f8f5', padding: '4px 10px', borderRadius: 99 }}>All done — see you tomorrow!</span>}
            </div>

            {today?.needsAssessment ? (
              <div style={{ color: '#64748b', fontSize: 14 }}>Take the <button onClick={() => nav('/careerpilot/assessment')} style={linkBtn}>Career Readiness Assessment</button> first to personalize your missions.</div>
            ) : !today?.missions?.length ? (
              <div style={{ color: '#94a3b8', fontSize: 14 }}>No missions for today. Check back tomorrow.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {today.missions.map(m => (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', border: '1px solid #eef1f6', borderRadius: 12, background: m.done ? '#f6fbf9' : '#fff' }}>
                    <button onClick={() => !m.done && toggleMission(m.key)} disabled={m.done}
                      style={{ width: 24, height: 24, borderRadius: 7, border: m.done ? 'none' : '2px solid #cbd5e1', background: m.done ? '#14a89c' : '#fff', color: '#fff', cursor: m.done ? 'default' : 'pointer', flexShrink: 0, fontWeight: 800 }}>
                      {m.done ? <i className="bi bi-check-lg" /> : ''}
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
            <QuickCard ic="bi-map-fill" title="My 90-day roadmap" onClick={() => nav('/careerpilot/roadmap')} sub="Every week, every day, planned" />
            <QuickCard ic="bi-code-slash" title="Practice Lab" onClick={() => nav('/careerpilot/practice')} sub="Code that actually runs" />
            <QuickCard ic="bi-mic-fill" title="Mock interview" onClick={() => nav('/careerpilot/interview')} sub="AI interviewer + scored feedback" />
            <QuickCard ic="bi-file-earmark-text-fill" title="Resume Center" onClick={() => nav('/careerpilot/resume')} sub="Build it, score it, fix it" />
            <QuickCard ic="bi-bar-chart-fill" title="My assessment result" onClick={() => nav('/careerpilot/assessment')} sub="Score, breakdown & pathway" />
            <QuickCard ic="bi-ticket-perforated-fill" title="My CareerPilot" onClick={share} sub={copied ? 'Link copied!' : 'Share your verified card'} />
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
            <h1><i className="bi bi-rocket-takeoff-fill" /> Mission <span className="b">Control</span></h1>
            <p>Your CodeBegun CareerPilot — one place that tells you what to do next.</p>
          </div>

          <div className="mc-stats">
            <div className="mc-stat"><span className="ic t-teal"><i className="bi bi-graph-up-arrow" /></span><div><div className="lbl">Career Score</div><div className="val">{result!.careerScore}</div><div className="hint">{result!.level}</div></div></div>
            <div className="mc-stat"><span className="ic t-violet"><i className="bi bi-signpost-split-fill" /></span><div><div className="lbl">Pathway</div><div className="val" style={{ fontSize: 16 }}>{result!.pathwayLabel}</div></div></div>
            <div className="mc-stat"><span className="ic t-amber"><i className="bi bi-fire" /></span><div><div className="lbl">Streak</div><div className="val">0d</div><div className="hint">Unlock to start</div></div></div>
            <div className="mc-stat"><span className="ic t-blue"><i className="bi bi-star-fill" /></span><div><div className="lbl">XP</div><div className="val">—</div><div className="hint">Unlock to earn</div></div></div>
          </div>

          <div className="mc-unlock-hero">
            <h2>Unlock your full <span className="y">90-day</span> journey</h2>
            <div className="mc-uh-feats">
              <div><span className="ck"><i className="bi bi-check-lg" /></span> Daily missions</div>
              <div><span className="ck"><i className="bi bi-check-lg" /></span> Verified practice</div>
              <div><span className="ck"><i className="bi bi-check-lg" /></span> Mock interviews</div>
              <div><span className="ck"><i className="bi bi-check-lg" /></span> Shareable CareerPilot</div>
              <div><span className="ck"><i className="bi bi-check-lg" /></span> Personalized for your score</div>
            </div>
            {status?.paymentAvailable === false ? (
              <p className="mc-uh-note">Online payment isn’t enabled yet — please <a href="#contact" onClick={e => e.preventDefault()}>contact your mentor</a> to activate.</p>
            ) : null}
            {status?.paymentAvailable === false ? (
              <button className="mc-uh-btn" onClick={() => nav('/careerpilot/assessment')}><i className="bi bi-unlock-fill" /> Unlock My 90-Day CareerPilot</button>
            ) : (
              <button className="mc-uh-btn" onClick={unlock} disabled={paying}>{paying ? 'Opening payment…' : <><i className="bi bi-unlock-fill" /> Unlock My 90-Day CareerPilot — ₹{price}</>}</button>
            )}
            {payMsg && <div className="mc-uh-paymsg">{payMsg}</div>}
            <button className="mc-uh-link" onClick={() => nav('/careerpilot/roadmap')}>See what's in the 90 days →</button>
            <button className="mc-uh-link" onClick={() => nav('/careerpilot/assessment')}>View my full result →</button>
          </div>

          <div className="mc-features">
            {[['bi-bullseye', 'violet', 'Personalized Roadmap', 'Based on your goals'], ['bi-people-fill', 'teal', 'Industry Mentorship', 'Learn from experts'], ['bi-cpu-fill', 'amber', 'AI-Powered Insights', 'Smart recommendations'], ['bi-code-slash', 'blue', 'Real-world Projects', 'Build & showcase'], ['bi-briefcase-fill', 'rose', 'Placement Support', 'Interview to offer']].map(([ic, tone, t, d]) => (
              <div className="mc-feat2" key={t}><div className={`ic t-${tone}`}><i className={`bi ${ic}`} /></div><b>{t}</b><span>{d}</span></div>
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
          <span className="mc-chip"><i className="bi bi-rocket-takeoff-fill" /> Mission Control</span>
          <h1 className="mc-h1">Your Career Journey <span className="b">Starts with Clarity</span></h1>
          <p className="mc-lead">Take the free Career Readiness Assessment to know where you stand today and get a personalized roadmap to achieve your dream career.</p>

          <div className="mc-checks">
            {CHECKS.map(c => (
              <div className="mc-check" key={c.title}>
                <span className={`ic t-${c.tone}`} aria-hidden="true"><i className={`bi ${c.ic}`} /></span>
                <span className="ck" aria-hidden="true"><i className="bi bi-check-lg" /></span>
                <div><b>{c.title}</b><span>{c.desc}</span></div>
              </div>
            ))}
          </div>

          {!hasScore ? (
            <>
              <button className="mc-cta" onClick={() => nav('/careerpilot/assessment')}><i className="bi bi-rocket-takeoff-fill" /> Start Free Assessment <i className="bi bi-arrow-right" /></button>
              <div className="mc-cta-note"><i className="bi bi-clock" /> Takes about 5 minutes <span className="dot">·</span> <i className="bi bi-graph-up-arrow" /> No payment needed</div>
            </>
          ) : (
            <>
              <button className="mc-cta" onClick={() => nav('/careerpilot/assessment')}>View My Result &amp; Roadmap <i className="bi bi-arrow-right" /></button>
              {status?.paymentAvailable === false ? (
                <div className="mc-cta-note">You scored {scoreNum}/100 — contact your mentor to unlock your 90-day journey.</div>
              ) : (
                <>
                  <div><button className="mc-unlock" onClick={unlock} disabled={paying}>{paying ? 'Opening payment…' : <><i className="bi bi-unlock-fill" /> Unlock Full Journey — ₹{price}</>}</button></div>
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
              <h3><i className="bi bi-key-fill" /> Your Career Score can open new doors</h3>
              <p>Thousands of students have discovered their path.<br />Now it’s your turn!</p>
            </div>
            <div className="mc-score-card">
              <div className="mc-score-top">
                <div>
                  <div className="lbl">Career Readiness Score</div>
                  <div className="num">{scoreNum}<small> / 100</small></div>
                </div>
                <div className="mc-rocket" aria-hidden="true"><i className="bi bi-rocket-takeoff-fill" /></div>
              </div>
              <div className="mc-bar"><i style={{ width: `${Math.max(scoreNum, 4)}%` }} /></div>
              <div className="mc-cats">
                {CATS.map(c => (
                  <div className="mc-cat" key={c.title}>
                    <span className={`ic t-${c.tone}`} aria-hidden="true"><i className={`bi ${c.ic}`} /></span>
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
              <div className={`ic t-${w.tone}`} aria-hidden="true"><i className={`bi ${w.ic}`} /></div>
              <b>{w.title}</b><span>{w.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <MemberFooter />
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

const QuickCard: React.FC<{ ic?: string; title: string; sub: string; onClick: () => void }> = ({ ic, title, sub, onClick }) => (
  <button onClick={onClick} className="mc-quick">
    <div className="t">{ic && <i className={`bi ${ic}`} aria-hidden="true" />}{title}</div>
    <div className="s">{sub}</div>
  </button>
);

const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#6650d8', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 };

export default MissionControl;
