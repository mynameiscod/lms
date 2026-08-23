import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { AssessResult, TodayMissions } from '../../api/passportApi';
import { useAuth } from '../../contexts/AuthContext';
import { MEMBER_NAV } from './PassportShell';
import './missionControl.css';
import './member.css';
import './missionsRedesign.css';
import MemberFooter from './MemberFooter';

const CAT_ICON: Record<string, string> = {
  career_clarity: 'bi-bullseye', aptitude: 'bi-calculator-fill', logical_reasoning: 'bi-puzzle-fill',
  technical: 'bi-code-slash', communication: 'bi-chat-dots-fill', employability: 'bi-briefcase-fill',
};

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
      if (s?.active) { try { setToday(await passportApi.getToday()); } catch { /* ignore */ } }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
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
    if (res.ok) { setLoading(true); await load(); }
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

  /**
   * A member who has not finished setup cannot sit the assessment.
   *
   * The generator refuses them — resolvePersonalizedAssessmentContext returns
   * CONTEXT_INCOMPLETE — so every "start your assessment" button on this screen was an
   * invitation to a refusal, with nothing anywhere linking to the setup it demanded.
   *
   * `setupCompleted` comes from the server (contextCompletedAt), NOT from `onboarded`,
   * which signup sets to true for everyone and therefore cannot answer this question.
   *
   * Undefined is treated as complete: a member on an older client, or a status call that
   * failed, should get the normal route rather than be pushed back through setup they may
   * already have done. Being wrong in that direction costs a click; being wrong in the
   * other direction strands somebody who is ready.
   */
  const needsSetup = status != null && status.setupCompleted === false;
  const assessmentHref = needsSetup ? '/careerpilot/setup' : '/careerpilot/skill-assessment';
  const price = status?.priceInr ?? 499;
  const scoreNum = hasScore ? result!.careerScore : 0;

  if (active) {
    const missions = today?.missions || [];
    const completed = missions.filter(m => m.done).length;
    const total = missions.length;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    const focus = missions.find(m => !m.done) || missions[0];
    const streak = today?.streak ?? 0;
    const longest = today?.longestStreak ?? 0;

    return (
      <div className="mc-shell">
        {Topbar}
        <nav className="pm-nav" style={{ maxWidth: 1460 }}>
          {MEMBER_NAV.map(n => (
            <button key={n.path} className={`pm-nav-item${n.path === '/careerpilot' ? ' on' : ''}`} onClick={() => nav(n.path)}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>

        <main className="mc-missions-page">
          <div className="mc-missions-head">
            <div>
              <h1>Missions</h1>
              <p>Practice daily. Earn XP. Build skills. Get job-ready.</p>
            </div>
            <div className="mc-missions-head-actions">
              <span className="mc-metric-pill"><i className="bi bi-lightning-charge-fill" /> {today?.xp ?? 0} XP</span>
              <span className="mc-metric-pill"><i className="bi bi-fire" /> {streak} day streak</span>
            </div>
          </div>

          <div className="mc-missions-grid">
            <section className="mc-missions-main">
              <div className="mc-today-hero">
                <div className="mc-today-copy">
                  <span className="mc-today-label"><i className="bi bi-star-fill" /> Today’s mission{today?.day ? ` · Day ${today.day}` : ''}</span>
                  <h2>{focus?.title || (today?.needsAssessment ? 'Unlock your personalized missions' : 'Your mission plan is clear for today')}</h2>
                  <p>{focus?.detail || (today?.needsAssessment ? 'Complete your skill assessment so CareerPilot can build missions around your target role.' : 'Come back tomorrow for your next personalized action.')}</p>
                  {focus && (
                    <div className="mc-today-meta">
                      <span><i className={`bi ${CAT_ICON[focus.category] || 'bi-bullseye'}`} /> Personalized</span>
                      <span><i className="bi bi-lightning-charge-fill" /> +{focus.xp} XP</span>
                      <span><i className="bi bi-map" /> Connected to roadmap</span>
                    </div>
                  )}
                  <div className="mc-today-actions">
                    {today?.needsAssessment ? (
                      <button className="mc-mission-primary" onClick={() => nav(assessmentHref)}><i className="bi bi-play-fill" /> Start Skill Assessment</button>
                    ) : focus?.link && !focus.done ? (
                      <button className="mc-mission-primary" onClick={() => nav(focus.link!)}><i className="bi bi-play-fill" /> Start Mission</button>
                    ) : focus && !focus.done ? (
                      <button className="mc-mission-primary" onClick={() => toggleMission(focus.key)}><i className="bi bi-check2-circle" /> Mark Complete</button>
                    ) : (
                      <button className="mc-mission-primary" onClick={() => nav('/careerpilot/roadmap')}><i className="bi bi-map" /> Explore Roadmap</button>
                    )}
                    <button className="mc-mission-secondary" onClick={() => nav('/careerpilot/roadmap')}>View Roadmap</button>
                  </div>
                </div>
                <div className="mc-today-visual" aria-hidden="true"><img src="/assets/careerpilot/careerpilot-hero-student.png" alt="" /></div>
                <span className="mc-roadmap-chip">Foundation → Build → Launch</span>
              </div>

              <div className="mc-panel">
                <div className="mc-panel-head">
                  <h3><i className="bi bi-calendar-check" /> Daily Missions</h3>
                  {today?.allDone ? <span className="mc-all-done"><i className="bi bi-check-circle-fill" /> All done — see you tomorrow!</span> : <span>{completed}/{total || 0} complete</span>}
                </div>
                {today?.needsAssessment ? (
                  <div className="mc-empty-state"><i className="bi bi-diagram-3" />Complete your skill assessment first to personalize today’s missions.</div>
                ) : !missions.length ? (
                  <div className="mc-empty-state"><i className="bi bi-stars" />No missions for today. Check back tomorrow.</div>
                ) : (
                  <div className="mc-daily-list">
                    {missions.map(m => (
                      <div className={`mc-daily-row${m.done ? ' done' : ''}`} key={m.key}>
                        <div className="mc-daily-icon"><i className={`bi ${CAT_ICON[m.category] || 'bi-bullseye'}`} /></div>
                        <div className="mc-daily-copy"><b>{m.title}</b><p>{m.detail}</p></div>
                        <div className="mc-daily-meta">
                          <span className="mc-xp">+{m.xp} XP</span>
                          {m.link && !m.done && <button className="mc-open-btn" onClick={() => nav(m.link!)}>Open →</button>}
                          <button className={`mc-check-btn${m.done ? ' done' : ''}`} disabled={m.done} onClick={() => !m.done && toggleMission(m.key)} aria-label={m.done ? 'Mission complete' : 'Mark mission complete'}>
                            {m.done && <i className="bi bi-check-lg" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mc-panel">
                <div className="mc-panel-head"><h3><i className="bi bi-signpost-split" /> Mission Path</h3><span>Your 90-day journey</span></div>
                <div className="mc-journey">
                  <div className="mc-journey-phase current"><small>Phase 1</small><b>Foundation</b><span>Build the basics consistently</span></div>
                  <div className="mc-journey-phase"><small>Phase 2</small><b>Build</b><span>Projects, practice and depth</span></div>
                  <div className="mc-journey-phase"><small>Phase 3</small><b>Launch</b><span>Interview and placement readiness</span></div>
                </div>
              </div>

              <div className="mc-panel">
                <div className="mc-panel-head"><h3>Quick Actions</h3><span>Keep building evidence</span></div>
                <div className="mc-quick-grid">
                  <QuickCard ic="bi-map-fill" title="My 90-day roadmap" onClick={() => nav('/careerpilot/roadmap')} sub="Every week, every day, planned" />
                  <QuickCard ic="bi-code-slash" title="Practice Lab" onClick={() => nav('/careerpilot/practice')} sub="Code that actually runs" />
                  <QuickCard ic="bi-mic-fill" title="Mock interview" onClick={() => nav('/careerpilot/interview')} sub="AI interviewer + scored feedback" />
                  <QuickCard ic="bi-file-earmark-text-fill" title="Resume Center" onClick={() => nav('/careerpilot/resume')} sub="Build it, score it, fix it" />
                </div>
              </div>
            </section>

            <aside className="mc-missions-side">
              <div className="mc-side-card">
                <div className="mc-side-title"><i className="bi bi-fire" /> Current Streak</div>
                <div className="mc-streak-wrap"><div><strong>{streak} Days</strong><span>Best: {longest} Days</span></div><div className="mc-fire"><i className="bi bi-fire" /></div></div>
              </div>

              <div className="mc-side-card">
                <div className="mc-side-title"><i className="bi bi-bullseye" /> Today’s Progress</div>
                <div className="mc-progress-big">{progress}%</div>
                <div className="mc-progress-track"><i style={{ width: `${progress}%` }} /></div>
                <div style={{ fontSize: 11, color: '#7b899c' }}>{completed} of {total} missions complete</div>
              </div>

              <div className="mc-side-card">
                <div className="mc-side-title"><i className="bi bi-trophy" /> Achievements</div>
                <div className="mc-ach-list">
                  <div className="mc-ach"><div className="mc-ach-ic"><i className="bi bi-fire" /></div><div><b>Consistency</b><span>{streak ? `${streak}-day active streak` : 'Start your first streak today'}</span></div></div>
                  <div className="mc-ach"><div className="mc-ach-ic"><i className="bi bi-check2-circle" /></div><div><b>Mission Momentum</b><span>{completed} missions completed today</span></div></div>
                  <div className="mc-ach"><div className="mc-ach-ic"><i className="bi bi-lightning-charge" /></div><div><b>XP Builder</b><span>{today?.xp ?? 0} XP earned overall</span></div></div>
                </div>
              </div>

              <div className="mc-side-card">
                <div className="mc-side-title"><i className="bi bi-share" /> My CareerPilot</div>
                <div style={{ color: '#718096', fontSize: 12, lineHeight: 1.55, marginBottom: 12 }}>Share your verified CareerPilot profile when you’re ready.</div>
                <button className="mc-mission-secondary" onClick={share}>{copied ? 'Link copied!' : 'Share CareerPilot'}</button>
              </div>
            </aside>

            <div className="mc-motivation">
              <div className="mc-motivation-copy"><div className="mc-motivation-ic"><i className="bi bi-award-fill" /></div><div><b>Great work, {firstName}! 🚀</b><span>Small daily wins build the skills and evidence employers can trust.</span></div></div>
              <button className="mc-mission-secondary" onClick={() => nav('/careerpilot/roadmap')}>Explore Roadmap →</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (hasScore) {
    return (
      <div className="mc-shell">
        {Topbar}
        <div className="mc-scored">
          <div className="mc-hd"><h1><i className="bi bi-rocket-takeoff-fill" /> Mission <span className="b">Control</span></h1><p>Your CodeBegun CareerPilot — one place that tells you what to do next.</p></div>
          <div className="mc-stats">
            <div className="mc-stat"><span className="ic t-teal"><i className="bi bi-graph-up-arrow" /></span><div><div className="lbl">Career Score</div><div className="val">{result!.careerScore}</div><div className="hint">{result!.level}</div></div></div>
            <div className="mc-stat"><span className="ic t-violet"><i className="bi bi-signpost-split-fill" /></span><div><div className="lbl">Pathway</div><div className="val" style={{ fontSize: 16 }}>{result!.pathwayLabel}</div></div></div>
            <div className="mc-stat"><span className="ic t-amber"><i className="bi bi-fire" /></span><div><div className="lbl">Streak</div><div className="val">0d</div><div className="hint">Unlock to start</div></div></div>
            <div className="mc-stat"><span className="ic t-blue"><i className="bi bi-star-fill" /></span><div><div className="lbl">XP</div><div className="val">—</div><div className="hint">Unlock to earn</div></div></div>
          </div>
          <div className="mc-unlock-hero">
            <h2>Unlock your full <span className="y">90-day</span> journey</h2>
            <div className="mc-uh-feats">
              <div><span className="ck"><i className="bi bi-check-lg" /></span> Daily missions</div><div><span className="ck"><i className="bi bi-check-lg" /></span> Verified practice</div><div><span className="ck"><i className="bi bi-check-lg" /></span> Mock interviews</div><div><span className="ck"><i className="bi bi-check-lg" /></span> Shareable CareerPilot</div><div><span className="ck"><i className="bi bi-check-lg" /></span> Personalized for your score</div>
            </div>
            {status?.paymentAvailable === false ? <p className="mc-uh-note">Online payment isn’t enabled yet — please contact your mentor to activate.</p> : null}
            {status?.paymentAvailable === false ? <button className="mc-uh-btn" onClick={() => nav(assessmentHref)}><i className="bi bi-unlock-fill" /> Unlock My 90-Day CareerPilot</button> : <button className="mc-uh-btn" onClick={unlock} disabled={paying}>{paying ? 'Opening payment…' : <><i className="bi bi-unlock-fill" /> Unlock My 90-Day CareerPilot — ₹{price}</>}</button>}
            {payMsg && <div className="mc-uh-paymsg">{payMsg}</div>}
            <button className="mc-uh-link" onClick={() => nav('/careerpilot/roadmap')}>See what's in the 90 days →</button>
            <button className="mc-uh-link" onClick={() => nav('/careerpilot/assessment')}>View my full result →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mc-shell">
      {Topbar}
      <div className="mc-hero">
        <div className="mc-left">
          <span className="mc-chip"><i className="bi bi-rocket-takeoff-fill" /> Mission Control</span>
          <h1 className="mc-h1">Your Career Journey <span className="b">Starts with Clarity</span></h1>
          <p className="mc-lead">Take the free skill assessment to see how you measure up against the role you are aiming at, and get a personalized roadmap to close the gaps.</p>
          <div className="mc-checks">{CHECKS.map(c => <div className="mc-check" key={c.title}><span className={`ic t-${c.tone}`}><i className={`bi ${c.ic}`} /></span><span className="ck"><i className="bi bi-check-lg" /></span><div><b>{c.title}</b><span>{c.desc}</span></div></div>)}</div>
          <button className="mc-cta" onClick={() => nav(assessmentHref)}>
            <i className="bi bi-rocket-takeoff-fill" />
            {needsSetup ? 'Finish Setup to Start' : 'Start Free Assessment'}
            <i className="bi bi-arrow-right" />
          </button>
          <div className="mc-cta-note"><i className="bi bi-clock" /> Takes about 5 minutes · <i className="bi bi-graph-up-arrow" /> No payment needed</div>
        </div>
        <div className="mc-right"><div className="mc-scorewrap"><div className="mc-score-head"><h3><i className="bi bi-key-fill" /> Your Career Score can open new doors</h3><p>Measure where you stand and what to improve next.</p></div><div className="mc-score-card"><div className="mc-score-top"><div><div className="lbl">Career Readiness Score</div><div className="num">{scoreNum}<small> / 100</small></div></div><div className="mc-rocket"><i className="bi bi-rocket-takeoff-fill" /></div></div><div className="mc-bar"><i style={{ width: `${Math.max(scoreNum, 4)}%` }} /></div><div className="mc-cats">{CATS.map(c => <div className="mc-cat" key={c.title}><span className={`ic t-${c.tone}`}><i className={`bi ${c.ic}`} /></span><div><b>{c.title}</b><span>{c.desc}</span></div></div>)}</div></div></div></div>
      </div>
      <div className="mc-why" ref={whyRef}><h2>Why take the Career Readiness Assessment?</h2><div className="mc-why-grid">{WHY.map(w => <div className="mc-why-card" key={w.title}><div className={`ic t-${w.tone}`}><i className={`bi ${w.ic}`} /></div><b>{w.title}</b><span>{w.desc}</span></div>)}</div></div>
      <MemberFooter />
    </div>
  );
};

const QuickCard: React.FC<{ ic?: string; title: string; sub: string; onClick: () => void }> = ({ ic, title, sub, onClick }) => (
  <button onClick={onClick} className="mc-quick"><div className="t">{ic && <i className={`bi ${ic}`} aria-hidden="true" />}{title}</div><div className="s">{sub}</div></button>
);

export default MissionControl;
