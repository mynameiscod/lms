import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import passportApi, { DashboardData } from '../../api/passportApi';
import { useAuth } from '../../contexts/AuthContext';
import './dashboard.css';
import './member.css';

/**
 * The ONE chrome every paid Passport surface renders inside.
 *
 * Previously the dashboard had a sidebar while Roadmap / Practice / Interview / Resume
 * used a different topbar shell, so clicking any nav item made the sidebar vanish.
 * Every member page now mounts this, so the rail is always present and always
 * highlights where you are.
 *
 * `data` is optional: the dashboard already fetches it and passes it down (avoiding a
 * second request); other pages let the shell fetch it so the goal/profile cards are
 * identical everywhere rather than appearing only on the home screen.
 */

const PRACTICE_SUB: { label: string; to: string; icon: string }[] = [
  { label: 'All Problems', to: '/careerpilot/practice', icon: 'grid' },
  { label: 'Coding', to: '/careerpilot/practice?kind=coding', icon: 'code' },
  { label: 'SQL', to: '/careerpilot/practice?kind=sql', icon: 'db' },
  { label: 'Aptitude & MCQ', to: '/careerpilot/practice?kind=mcq', icon: 'brain' },
];

const ICONS: Record<string, React.ReactNode> = {
  home:      <><path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  practice:  <><path d="M8 3v5.5L4 18a2 2 0 0 0 1.8 3h12.4A2 2 0 0 0 20 18l-4-9.5V3" /><path d="M7 3h10" /><path d="M6.5 14h11" /></>,
  roadmap:   <><path d="M9 4 3.5 6.2v14L9 18l6 2.5 5.5-2.2v-14L15 6.5 9 4z" /><path d="M9 4v14M15 6.5v14" /></>,
  interview: <><rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0" /><path d="M12 17.5V21M8.5 21h7" /></>,
  resume:    <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>,
  chart:     <><path d="M3 3v18h18" /><path d="M7 15v-4M12 15V7M17 15v-6" /></>,
  card:      <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19" /><path d="M6.5 14.5h4" /></>,
  trophy:    <><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11" /><path d="M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" /><path d="M12 14v4M8.5 20h7" /></>,
  logout:    <><path d="M14.5 16.5 19 12l-4.5-4.5" /><path d="M19 12H9" /><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" /></>,
  chevron:   <><path d="m6 9 6 6 6-6" /></>,
  menu:      <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  board:     <><path d="M4 20h4V10H4zM10 20h4V4h-4zM16 20h4v-7h-4z" /></>,
  medal:     <><circle cx="12" cy="15" r="6" /><path d="M8.5 9.5 6 2.5h12L15.5 9.5" /><path d="m12 12.8 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L8.8 15l2.2-.3z" /></>,
  grid:      <><rect x="3" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" /></>,
  code:      <><path d="m8 8-4.5 4L8 16" /><path d="m16 8 4.5 4L16 16" /><path d="m13.5 5-3 14" /></>,
  db:        <><ellipse cx="12" cy="5.5" rx="7.5" ry="3" /><path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" /><path d="M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" /></>,
  brain:     <><path d="M9.5 3.5A3 3 0 0 0 6.6 7 3 3 0 0 0 5 12.6 3 3 0 0 0 7.5 18a3 3 0 0 0 4.5 2.2V4.6a3 3 0 0 0-2.5-1.1z" /><path d="M14.5 3.5A3 3 0 0 1 17.4 7 3 3 0 0 1 19 12.6 3 3 0 0 1 16.5 18" /></>,
};

export const Icon: React.FC<{ name: string }> = ({ name }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>
);

interface Props {
  children: React.ReactNode;
  /** Supplied by MemberLayout, which fetches once for the whole member area. */
  data?: DashboardData | null;
}

const MemberShell: React.FC<Props> = ({ children, data }) => {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();
  const [practiceOpen, setPracticeOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const d = data ?? null;

  useEffect(() => { setMobileOpen(false); setUserOpen(false); }, [loc.pathname, loc.search]);

  const share = async () => {
    if (!d?.shareSlug) return;
    const url = `${window.location.origin}/passport/card/${d.shareSlug}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy your CareerPilot link:', url); }
  };

  const path = loc.pathname;
  const firstName = d?.firstName || user?.firstName || 'there';
  const initial = (firstName[0] || 'C').toUpperCase();
  const st = d?.stats;
  const lv = d?.level;
  const goal = d?.dailyGoal;
  const myRank = d?.leaderboard?.find(r => r.me)?.rank;

  const navBtn = (label: string, icon: string, to: string) => (
    <button className={`gd-nav-btn${path === to ? ' on' : ''}`} onClick={() => nav(to)} key={to}>
      <span className="ic"><Icon name={icon} /></span><span className="lbl">{label}</span>
    </button>
  );

  return (
    <div className="gd">
      {/* Mobile: a button to reveal the rail, which is off-canvas on small screens */}
      <button className="gd-burger" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
        <Icon name="menu" />
      </button>
      {mobileOpen && <div className="gd-scrim" onClick={() => setMobileOpen(false)} />}

      <aside className={`gd-side${mobileOpen ? ' open' : ''}`}>
        <button className="gd-logo" onClick={() => nav('/careerpilot')}>
          <img className="mk" src="/assets/logo.png" alt="CodeBegun"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div><b>Codebegun</b><small>Begin Your Code. Build Your Future.</small></div>
        </button>

        <nav className="gd-nav">
          {navBtn('Coding Home', 'home', '/careerpilot')}

          {/* Practice Lab is a section, not a collapsible — its four surfaces are the
              most-used part of the product and shouldn't need a click to reach. */}
          <div className="gd-nav-label">Practice Lab</div>
          {PRACTICE_SUB.map(s => {
            const on = `${loc.pathname}${loc.search}` === s.to;
            return (
              <button key={s.to} className={`gd-nav-btn${on ? ' on' : ''}`} onClick={() => nav(s.to)}>
                <span className="ic"><Icon name={s.icon} /></span><span className="lbl">{s.label}</span>
              </button>
            );
          })}

          <div className="gd-nav-gap" />
          {navBtn('Learning Path', 'roadmap', '/careerpilot/roadmap')}
          {navBtn('Mock Interview', 'interview', '/careerpilot/interview')}
          {navBtn('Resume Builder', 'resume', '/careerpilot/resume')}
          {navBtn('Performance', 'chart', '/careerpilot/assessment')}
          {!!d?.contests?.length && navBtn('Contests', 'trophy', '/battles')}

          <div className="gd-nav-label">Leaderboard</div>
          <button className="gd-nav-btn" onClick={() => nav('/careerpilot#leaderboard')}>
            <span className="ic"><Icon name="board" /></span><span className="lbl">Leaderboards</span>
          </button>
          <button className="gd-nav-btn" onClick={() => nav('/careerpilot#badges')}>
            <span className="ic"><Icon name="medal" /></span><span className="lbl">Achievements</span>
          </button>
        </nav>

        {goal && (
          <div className="gd-goal">
            <div className="hd">🎯 Daily Goal</div>
            <div className="big">{goal.earned} <small>/ {goal.target} XP</small></div>
            <div className="bar"><i style={{ width: `${goal.pct}%` }} /></div>
            <div className="note">
              {goal.met ? 'Goal smashed for today — anything else is bonus.' : 'Finish today’s missions to hit your goal.'}
            </div>
            {!goal.met && <button className="cta" onClick={() => nav('/careerpilot/practice')}>Earn XP now</button>}
          </div>
        )}

      </aside>

      <main className="gd-main">
        {/* Shared top row: page header, page pills, then the user menu on the right.
            The profile lives here now rather than in a card at the foot of the rail. */}
        <div className="gd-topbar">
          <div className="gd-topbar-l">
            {/* Greeting belongs to the home screen; the pills are useful everywhere. */}
            {path === '/careerpilot' && (
              <div className="gd-hello">
                <h1>Hey {firstName}! 👋</h1>
                <p>Let’s code, solve problems and level up your skills.</p>
              </div>
            )}
          </div>
          <div className="gd-topbar-r">
            {st && lv && (
              <>
                <div className="gd-pill">
                  <span className="em">🔥</span>
                  <div><b>{st.streak}</b><span>Day Streak</span></div>
                </div>
                <div className="gd-pill level">
                  <span className="hex">🎖️</span>
                  <div>
                    <b>Level {lv.level}</b><span>{lv.title}</span>
                    <div className="lbar"><i style={{ width: `${lv.progressPct}%` }} /></div>
                  </div>
                </div>
                <div className="gd-pill">
                  <span className="em">⚡</span>
                  <div><b>{lv.xpToNextLevel.toLocaleString()} XP</b><span>to next level</span></div>
                </div>
              </>
            )}
            <div className="gd-user">
              <button className="gd-user-btn" onClick={() => setUserOpen(o => !o)}>
                <span className="av">{initial}</span>
                <span className="nm">{d?.name || firstName}</span>
                <span className="cr"><Icon name="chevron" /></span>
              </button>
              {userOpen && (
                <div className="gd-user-menu" onMouseLeave={() => setUserOpen(false)}>
                  <div className="hd">
                    <b>{d?.name || firstName}</b>
                    {lv && <span>Level {lv.level} · {lv.title}</span>}
                  </div>
                  {st && (
                    <div className="stats">
                      <div><b>{st.xp.toLocaleString()}</b><span>XP</span></div>
                      <div><b>{st.streak}</b><span>Streak</span></div>
                      <div><b>{myRank ? `#${myRank}` : '—'}</b><span>Rank</span></div>
                    </div>
                  )}
                  <button onClick={() => { setUserOpen(false); nav('/careerpilot/assessment'); }}>My assessment result</button>
                  <button onClick={() => { setUserOpen(false); nav('/careerpilot/roadmap'); }}>My journey</button>
                  <button onClick={share} disabled={!d?.shareSlug}>{copied ? 'Link copied!' : 'Share my Passport card'}</button>
                  <button className="out" onClick={() => logout()}>Log out</button>
                </div>
              )}
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
};

export default MemberShell;
