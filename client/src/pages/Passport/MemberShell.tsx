import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { DashboardData, MemberSection } from '../../api/passportApi';
import { useAuth } from '../../contexts/AuthContext';
import './dashboard.css';
import './member.css';
import SetPasswordDialog from './SetPasswordDialog';
import ShareCardDialog from './ShareCardDialog';
import { startActivityBeacon, trackPage } from './activityBeacon';

const ICONS: Record<string, string> = {
  home: 'house-door-fill',
  practice: 'code-slash',
  roadmap: 'map',
  interview: 'mic-fill',
  resume: 'file-earmark-text',
  chart: 'bar-chart-fill',
  card: 'credit-card',
  trophy: 'trophy-fill',
  logout: 'box-arrow-right',
  target: 'bullseye',
  news: 'newspaper',
  building: 'buildings',
  user: 'person',
  chevron: 'chevron-down',
  menu: 'list',
  close: 'x-lg',
  share: 'share',
  board: 'bar-chart-steps',
  medal: 'award-fill',
  grid: 'grid',
  speech: 'chat-dots',
  code: 'code-slash',
  db: 'database',
  brain: 'lightbulb',
};

export const Icon: React.FC<{ name: string }> = ({ name }) => (
  <i className={`bi bi-${ICONS[name] || name}`} aria-hidden="true" />
);

interface Props {
  children: React.ReactNode;
  data?: DashboardData | null;
}

/**
 * Route to the name an admin should read on the activity screen.
 *
 * An unmapped route still records, as "Opened /careerpilot/whatever" — a missing entry costs a
 * readable label, never the event itself, which is the right way round for a log.
 */
const SCREEN_NAMES: Record<string, string> = {
  '/careerpilot': 'Mission Control',
  '/careerpilot/setup': 'Setup — academic details',
  '/careerpilot/skill-assessment': 'Skill assessment',
  '/careerpilot/roadmap': 'My roadmap',
  '/careerpilot/skills': 'Skill DNA',
  '/careerpilot/readiness': 'Role readiness',
  '/careerpilot/placement': 'Placement readiness',
  '/careerpilot/progress': 'My progress',
  '/careerpilot/rewards': 'Rewards',
  '/careerpilot/interview': 'Mock interview',
  '/careerpilot/communication': 'Communication Lab',
  '/careerpilot/resume': 'Resume',
  '/careerpilot/practice': 'Practice',
  '/careerpilot/news': 'Tech News',
};

/**
 * Routes that belong to a rail section but do not sit under its path.
 *
 * A checkpoint's results belong to My 90 Days, which is where the checkpoint was opened and where
 * it returns to. Topics, courses and materials are roadmap work. A mock test is only opened from a company
 * profile. Coins, rewards, badges and the leaderboard are the My Progress story under four
 * other names. Without this table each of those screens leaves the rail blank, which is the
 * one moment navigation exists to answer: where am I?
 */
const NAV_ALIASES: Array<[string, string]> = [
  ['/careerpilot/journey', '/careerpilot/plan'],
  ['/careerpilot/topic', '/careerpilot/roadmap'],
  ['/careerpilot/learn', '/careerpilot/roadmap'],
  ['/careerpilot/material', '/careerpilot/roadmap'],
  ['/careerpilot/quiz', '/careerpilot/plan'],
  ['/careerpilot/mock-test', '/careerpilot/companies'],
  ['/careerpilot/rewards', '/careerpilot/progress'],
  ['/careerpilot/coins', '/careerpilot/progress'],
  ['/careerpilot/achievements', '/careerpilot/progress'],
  ['/careerpilot/leaderboard', '/careerpilot/progress'],
];

/**
 * The rail section a route belongs to.
 *
 * The rail used to light an item on `path === to` alone, so every nested route — a practice
 * problem, a company profile, a playground sub-route, day 34 of the journey — left nothing
 * highlighted. Resolving the route to its section first, then matching that section by prefix,
 * keeps the owning item lit however deep the route goes.
 *
 * No nav destination is a prefix of another (plan, roadmap, practice, playground,
 * thinking-lab, communication, interview, mentor, companies, news, resume, progress), so a
 * prefix match is unambiguous. `/careerpilot` is the single exception, since it prefixes all
 * of them, and is matched exactly by the caller instead.
 *
 * A route in neither the table nor a section — My profile, for one — resolves to itself and so
 * lights nothing, which is correct: better an honest blank than the wrong item claiming you.
 */
const sectionFor = (pathname: string): string => {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const alias = NAV_ALIASES.find(([from]) => p === from || p.startsWith(`${from}/`));
  return alias ? alias[1] : p;
};

const MemberShell: React.FC<Props> = ({ children, data }) => {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  /**
   * Page views, recorded here because this shell is the one component every CareerPilot screen
   * renders through — so a screen added later is in the trail without anybody remembering.
   *
   * A single-page app never asks the server for a screen change, so without this the activity
   * log would show API calls and no navigation at all: an admin could see that somebody
   * fetched their daily plan, but not that they then sat on the roadmap for ten minutes and
   * left without starting anything. Where people stop is the question this screen exists for.
   *
   * The label is what a person would say, not the URL — the route is stored alongside it.
   */
  useEffect(() => {
    startActivityBeacon();
    trackPage(SCREEN_NAMES[loc.pathname] || `Opened ${loc.pathname}`, loc.pathname);
  }, [loc.pathname]);

  const openDrawer = () => { setUserOpen(false); setMobileOpen(true); };
  const toggleUserMenu = () => { setMobileOpen(false); setUserOpen(o => !o); };

  useEffect(() => {
    if (!userOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!userRef.current?.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [userOpen]);

  useEffect(() => {
    if (!userOpen && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setUserOpen(false); setMobileOpen(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [userOpen, mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const y = window.scrollY;
    const body = document.body;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width };
    body.style.position = 'fixed';
    body.style.top = `-${y}px`;
    body.style.width = '100%';
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, y);
    };
  }, [mobileOpen]);

  const [shareOpen, setShareOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdDone, setPwdDone] = useState(false);

  const d = data ?? null;

  useEffect(() => { setMobileOpen(false); setUserOpen(false); }, [loc.pathname, loc.search]);

  /* Sharing shows the card before it shares it — see ShareCardDialog for why. */
  const share = () => { if (d?.shareSlug) { setUserOpen(false); setShareOpen(true); } };

  const path = loc.pathname;
  const navSection = sectionFor(path);
  const firstName = d?.firstName || user?.firstName || 'there';
  const initial = (firstName[0] || 'C').toUpperCase();
  const st = d?.stats;
  const lv = d?.level;
  const goal = d?.dailyGoal;
  const myRank = d?.leaderboard?.find(r => r.me)?.rank;

  /**
   * Which parts of the product this member cannot open yet.
   *
   * Read from the dashboard payload — the server decides free versus paid from the tenant's
   * own settings, and a rail that worked it out for itself would disagree with the API the
   * moment an admin changed anything.
   */
  const lockedSet = new Set((d?.locked || []).map(l => l.section));

  /**
   * A locked item is SHOWN AND MARKED, never hidden.
   *
   * Hiding it removes the only reason to buy — a student cannot want what they cannot see —
   * and it also makes the product look smaller than it is. It still navigates, because the
   * destination now explains itself rather than dead-ending.
   */
  const navBtn = (label: string, icon: string, to: string, section?: MemberSection) => {
    const locked = !!section && lockedSet.has(section);
    /**
     * Home prefixes every other destination, so it alone must match exactly; everything else
     * owns the routes nested beneath it (see `sectionFor`).
     */
    const on = to === '/careerpilot'
      ? navSection === to
      : navSection === to || navSection.startsWith(`${to}/`);
    return (
      <button
        className={`gd-nav-btn${on ? ' on' : ''}${locked ? ' locked' : ''}`}
        onClick={() => nav(to)}
        key={to}
        title={locked ? 'Part of membership' : undefined}
      >
        <span className="ic"><Icon name={icon} /></span>
        <span className="lbl">{label}</span>
        {locked && <span className="lk" aria-label="Membership"><i className="bi bi-lock-fill" /></span>}
      </button>
    );
  };

  return (
    <div className="gd">
      <button className={`gd-burger${mobileOpen ? ' hide' : ''}`} onClick={openDrawer} aria-label="Menu">
        <Icon name="menu" />
      </button>
      {mobileOpen && <div className="gd-scrim" onClick={() => setMobileOpen(false)} />}

      <aside className={`gd-side${mobileOpen ? ' open' : ''}`}>
        <button className="gd-side-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <Icon name="close" />
        </button>
        {/* The product's own mark, filling the white card at the top of the rail (the CodeBegun image sat small and
            off-centre inside a second bordered box). Styles: styles/careerpilot-member-shell.css, .gd-logo-cp. */}
        <button className="gd-logo gd-logo-cp" onClick={() => nav('/careerpilot')} aria-label="CareerPilot home">
          <img src="/assets/careerpilot/careerpilot-logo.png" alt="CareerPilot by CodeBegun" />
        </button>

        <nav className="gd-nav">
          {navBtn('Home', 'home', '/careerpilot')}
          {navBtn('My 90 Days', 'grid', '/careerpilot/plan', 'roadmap')}
          {navBtn('My Roadmap', 'roadmap', '/careerpilot/roadmap', 'roadmap')}
          {navBtn('Practice', 'code', '/careerpilot/practice', 'practice')}
          {/* From master. No section, so they stay open to everyone, as master had them. */}
          {navBtn('Playground', 'terminal', '/careerpilot/playground')}
          {navBtn('Thinking Lab', 'brain', '/careerpilot/thinking-lab', 'practice')}
          {navBtn('Communication Lab', 'speech', '/careerpilot/communication')}
          {navBtn('Mock Interview', 'interview', '/careerpilot/interview', 'interview')}
          {navBtn('AI Mentor', 'robot', '/careerpilot/mentor')}
          {navBtn('Opportunities', 'building', '/careerpilot/companies', 'companies')}
          {/* Sits with Opportunities because it answers the same question — what is happening in
              the industry I am applying to. It was reachable only from the user menu, which is
              where people look for their account, not for a daily read. */}
          {navBtn('Tech News', 'news', '/careerpilot/news', 'news')}
          {navBtn('Resume', 'resume', '/careerpilot/resume', 'resume')}
          {navBtn('My Progress', 'trophy', '/careerpilot/progress', 'progress')}
        </nav>

        <div className="gd-side-account">
          <div className="gd-side-me">
            <span className="av">{initial}</span>
            <div className="t"><b>{d?.name || firstName}</b>{lv && <span>Level {lv.level} · {lv.title}</span>}</div>
          </div>
          <button className="gd-nav-btn" onClick={() => nav('/careerpilot/profile')}><span className="ic"><Icon name="user" /></span><span className="lbl">My profile</span></button>
          <button className="gd-nav-btn" onClick={() => nav('/careerpilot/readiness')}><span className="ic"><Icon name="chart" /></span><span className="lbl">My result</span></button>
          {/* Tech News used to be repeated here. This block is the mobile drawer's account
              footer and sits directly under the nav list it now appears in, so the second copy
              was the same destination twice on one screen. */}
          <button className="gd-nav-btn" onClick={share} disabled={!d?.shareSlug}><span className="ic"><Icon name="share" /></span><span className="lbl">Share my card</span></button>
          <button className="gd-nav-btn out" onClick={() => logout()}><span className="ic"><Icon name="logout" /></span><span className="lbl">Log out</span></button>
        </div>

        {goal && <div className="gd-goal">
          <div className="hd"><Icon name="target" /> Daily Goal</div>
          <div className="big">{goal.earned} <small>/ {goal.target} XP</small></div>
          <div className="bar"><i style={{ width: `${goal.pct}%` }} /></div>
          <div className="note">{goal.met ? 'Goal smashed for today — anything else is bonus.' : 'Finish today’s missions to hit your goal.'}</div>
          {!goal.met && <button className="cta" onClick={() => nav('/careerpilot/practice')}>Earn XP now</button>}
        </div>}
      </aside>

      <main className="gd-main">
        <div className="gd-topbar">
          <div className="gd-topbar-l">
            {/* Only over the working dashboard: the locked one (PassportHome's other branch) greets in its own hero. */}
            {path === '/careerpilot' && d?.active && d?.hasAssessment && <div className="gd-hello"><h1>Hey {firstName}!</h1><p>Let’s code, solve problems and level up your skills.</p></div>}
          </div>
          <div className="gd-topbar-r">
            {st && lv && <>
              <Link to="/careerpilot/leaderboard" className="gd-pill" style={{ textDecoration: 'none' }} title="See where you rank">
                <span className="em"><Icon name="fire" /></span><div><b>{st.streak}</b><span>Day Streak</span></div>
              </Link>
              {!!d?.coins?.balance && <Link to="/careerpilot/coins" className="gd-pill" style={{ textDecoration: 'none' }}><span className="em"><Icon name="coin" /></span><div><b>{d.coins.balance.toLocaleString('en-IN')}</b><span>Coins</span></div></Link>}
              <Link to="/careerpilot/achievements" className="gd-pill level" style={{ textDecoration: 'none' }} title="See your badges and achievements">
                <span className="hex"><Icon name="medal" /></span><div><b>Level {lv.level}</b><span>{lv.title}</span><div className="lbar"><i style={{ width: `${lv.progressPct}%` }} /></div></div>
              </Link>
              <Link to="/careerpilot/progress" className="gd-pill" style={{ textDecoration: 'none' }} title="See your XP, badges and streak">
                <span className="em"><Icon name="lightning-charge-fill" /></span><div><b>{lv.xp.toLocaleString()} XP</b><span>{lv.xpToNextLevel.toLocaleString()} to level {lv.nextLevel}</span></div>
              </Link>
            </>}
            <div className="gd-user" ref={userRef}>
              <button className="gd-user-btn" onClick={toggleUserMenu} aria-expanded={userOpen} aria-haspopup="true">
                <span className="av">{initial}</span><span className="nm">{d?.name || firstName}</span><span className={`cr${userOpen ? ' open' : ''}`}><Icon name="chevron" /></span>
              </button>
              {userOpen && <div className="gd-user-menu">
                <div className="hd"><b>{d?.name || firstName}</b>{lv && <span>Level {lv.level} · {lv.title}</span>}</div>
                {st && <div className="stats"><div><b>{st.xp.toLocaleString()}</b><span>XP</span></div><div><b>{st.streak}</b><span>Streak</span></div><div><b>{myRank ? `#${myRank}` : '—'}</b><span>Rank</span></div></div>}
                <button onClick={() => { setUserOpen(false); nav('/careerpilot/profile'); }}>My profile</button>
                <button onClick={() => { setUserOpen(false); nav('/careerpilot/readiness'); }}>My result</button>
                <button onClick={share} disabled={!d?.shareSlug}>Share my CareerPilot card</button>
                <button className="out" onClick={() => logout()}>Log out</button>
              </div>}
            </div>
          </div>
        </div>

        {d && d.passwordSet === false && !pwdDone && <div className="gd-pwd-nudge pwd2">
          <span className="ic"><Icon name="shield-lock-fill" /></span>
          <div className="txt"><b>Secure your account — set a password</b><span>So you can log in next time without waiting for a WhatsApp code.</span></div>
          <button className="go" onClick={() => setPwdOpen(true)}><Icon name="key-fill" /> Set password</button>
        </div>}
        {shareOpen && d && <ShareCardDialog data={d} onClose={() => setShareOpen(false)} />}
        {pwdOpen && <SetPasswordDialog onClose={() => setPwdOpen(false)} onDone={() => { setPwdOpen(false); setPwdDone(true); }} />}

        {children}
      </main>
    </div>
  );
};

export default MemberShell;
