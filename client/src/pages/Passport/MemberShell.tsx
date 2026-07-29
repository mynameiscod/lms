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

const PRACTICE_SUB: { label: string; to: string }[] = [
  { label: 'All Problems', to: '/passport/practice' },
  { label: 'Coding', to: '/passport/practice?kind=coding' },
  { label: 'SQL', to: '/passport/practice?kind=sql' },
  { label: 'Aptitude & MCQ', to: '/passport/practice?kind=mcq' },
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
};

export const Icon: React.FC<{ name: string }> = ({ name }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>
);

interface Props {
  children: React.ReactNode;
  /** Pass when the page already has dashboard data, to avoid a duplicate fetch. */
  data?: DashboardData | null;
}

const MemberShell: React.FC<Props> = ({ children, data }) => {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();
  const [own, setOwn] = useState<DashboardData | null>(null);
  const [practiceOpen, setPracticeOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const d = data ?? own;

  const loadOwn = useCallback(async () => {
    if (data) return;                       // parent supplied it
    try { setOwn(await passportApi.getDashboard()); } catch { /* sidebar degrades gracefully */ }
  }, [data]);

  useEffect(() => { loadOwn(); }, [loadOwn]);
  useEffect(() => { setMobileOpen(false); }, [loc.pathname, loc.search]);

  const share = async () => {
    if (!d?.shareSlug) return;
    const url = `${window.location.origin}/passport/card/${d.shareSlug}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy your Career Passport link:', url); }
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
        <button className="gd-logo" onClick={() => nav('/passport')}>
          <span className="mk">{'</>'}</span>
          <div><b>Career<span className="p">Pilot</span></b><small>Powered by CodeBegun</small></div>
        </button>

        <nav className="gd-nav">
          {navBtn('Coding Home', 'home', '/passport')}

          <button
            className={`gd-nav-btn${path.startsWith('/passport/practice') ? ' on' : ''}`}
            onClick={() => setPracticeOpen(o => !o)}
          >
            <span className="ic"><Icon name="practice" /></span>
            <span className="lbl">Practice Lab</span>
            <span className={`cr${practiceOpen ? ' open' : ''}`}><Icon name="chevron" /></span>
          </button>
          {practiceOpen && (
            <div className="gd-sub">
              {PRACTICE_SUB.map(s => (
                <button
                  key={s.to}
                  className={`${loc.pathname}${loc.search}` === s.to ? 'on' : ''}
                  onClick={() => nav(s.to)}
                >{s.label}</button>
              ))}
            </div>
          )}

          <div className="gd-nav-label">My Journey</div>
          {navBtn('90-Day Roadmap', 'roadmap', '/passport/roadmap')}
          {navBtn('Mock Interview', 'interview', '/passport/interview')}
          {navBtn('Resume Center', 'resume', '/passport/resume')}
          {navBtn('My Assessment', 'chart', '/passport/assessment')}

          <div className="gd-nav-label">Account</div>
          {!!d?.contests?.length && navBtn('Contests', 'trophy', '/battles')}
          <button className="gd-nav-btn" onClick={share} disabled={!d?.shareSlug}>
            <span className="ic"><Icon name="card" /></span>
            <span className="lbl">{copied ? 'Link copied!' : 'My Passport Card'}</span>
          </button>
          <button className="gd-nav-btn" onClick={() => logout()}>
            <span className="ic"><Icon name="logout" /></span>
            <span className="lbl">Log out</span>
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
            {!goal.met && <button className="cta" onClick={() => nav('/passport/practice')}>Earn XP now</button>}
          </div>
        )}

        {st && lv && (
          <div className="gd-me">
            <div className="gd-me-card">
              <div className="gd-me-top">
                <span className="av">{initial}</span>
                <div>
                  <b>{d?.name || firstName}</b>
                  <span>Level {lv.level}</span>
                  <div className="gd-me-tag">{lv.title}</div>
                </div>
              </div>
              <div className="gd-me-stats">
                <div><b>{st.xp.toLocaleString()}</b><span>XP</span></div>
                <div><b>{st.streak}</b><span>Day Streak</span></div>
                <div><b>{myRank ? `#${myRank}` : '—'}</b><span>Rank</span></div>
              </div>
              <button className="gd-me-btn" onClick={() => nav('/passport/roadmap')}>View My Journey</button>
            </div>
          </div>
        )}
      </aside>

      <main className="gd-main">{children}</main>
    </div>
  );
};

export default MemberShell;
