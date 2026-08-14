import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
  target:    <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  news:      <><path d="M4 5h12v14H5.5A1.5 1.5 0 0 1 4 17.5z" /><path d="M16 8h3.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-3 0V19" /><path d="M7 9h6M7 12.5h6M7 16h4" /></>,
  building:  <><path d="M4 21V6l7-3v18" /><path d="M11 9h7a1 1 0 0 1 1 1v11" /><path d="M2.5 21h19" /><path d="M7 8v.01M7 12v.01M7 16v.01M14.5 13v.01M14.5 17v.01" /></>,
  user:      <><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  chevron:   <><path d="m6 9 6 6 6-6" /></>,
  menu:      <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  close:     <><path d="M6 6l12 12M18 6 6 18" /></>,
  share:     <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
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
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  /**
   * M2 — lock the page behind the drawer.
   *
   * Without this the finger scrolls the page underneath while the menu is open, so
   * closing it leaves the member somewhere they never meant to go. `position: fixed`
   * rather than `overflow: hidden`, because iOS Safari ignores the latter on body — and
   * the scroll position has to be captured and restored by hand, since going fixed
   * throws it away.
   */
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

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  // Hides the nudge immediately on success. The shell's `data` comes from MemberLayout
  // and only refreshes on reload, so without this the banner would sit there telling a
  // member to do something they just did.
  const [pwdDone, setPwdDone] = useState(false);

  const savePassword = async () => {
    if (pwd.length < 6) { setPwdMsg('Use at least 6 characters.'); return; }
    setPwdBusy(true); setPwdMsg('');
    try {
      await passportApi.setPassword(pwd);
      setPwdDone(true); setPwdOpen(false); setPwd('');
    } catch (e: any) {
      setPwdMsg(e?.response?.data?.message || 'Could not save password.');
    }
    setPwdBusy(false);
  };

  const d = data ?? null;

  useEffect(() => { setMobileOpen(false); setUserOpen(false); }, [loc.pathname, loc.search]);

  const share = async () => {
    if (!d?.shareSlug) return;
    const url = `${window.location.origin}/careerpilot/card/${d.shareSlug}`;
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
      {/* Mobile: a button to reveal the rail, which is off-canvas on small screens.
          It is fixed at the top-left, i.e. exactly where the open drawer puts its logo —
          so it hides itself once the drawer is out, and the drawer carries its own close
          button instead of two controls fighting over the same 42px. */}
      <button className={`gd-burger${mobileOpen ? ' hide' : ''}`} onClick={() => setMobileOpen(true)} aria-label="Menu">
        <Icon name="menu" />
      </button>
      {mobileOpen && <div className="gd-scrim" onClick={() => setMobileOpen(false)} />}

      <aside className={`gd-side${mobileOpen ? ' open' : ''}`}>
        <button className="gd-side-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <Icon name="close" />
        </button>
        <button className="gd-logo" onClick={() => nav('/careerpilot')}>
          {/* M3 — the chip's gradient was designed to sit behind a "CB" monogram, not a
              logo image, so the artwork rendered on a purple/teal block. On error the
              image hides and the monogram shows through, which is why the wrapper keeps
              the gradient and the image sits on white above it. */}
          <span className="mk"><b className="mono">CB</b>
            <img src="/assets/logo.png" alt="CodeBegun"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </span>
          <div><b>Codebegun</b><small>Begin Your Code. Build Your Future.</small></div>
        </button>

        {/* Six destinations, one per thing a student actually does.
            What used to be here and why it went:
              Daily Missions      — the same page as Home, with a query flag
              Coding / SQL / MCQ  — the same page as Practice; they are tabs now
              Performance         — renamed "My Result" and moved to the account menu,
                                    because nobody guesses it means their assessment
              Coins / Leaderboard / Achievements — reachable from the topbar chips
              Contests            — /battles is a DIFFERENT PRODUCT; a member should not
                                    be dropped into Tech Battles from their own menu
              Tech News           — one article published; it has not earned a permanent
                                    slot, and it already shows on Home
            Nothing was deleted: every route still exists and every old link still works. */}
        <nav className="gd-nav">
          {navBtn('Home', 'home', '/careerpilot')}
          {navBtn('My Roadmap', 'roadmap', '/careerpilot/roadmap')}
          {navBtn('Practice', 'code', '/careerpilot/practice')}
          {navBtn('Mock Interview', 'interview', '/careerpilot/interview')}
          {navBtn('Prepare Interviews', 'building', '/careerpilot/companies')}
          {navBtn('Resume', 'resume', '/careerpilot/resume')}
        </nav>

        {/* M4 — the account block. On a phone the topbar menu is hidden outright (it used
            to open a floating card ON TOP of this drawer, covering the nav labels and
            repeating these same links), so the drawer is the one and only account surface
            there and has to carry everything the topbar menu offers — share included.
            CSS hides this block on desktop, where the topbar menu exists. */}
        <div className="gd-side-account">
          {/* Who you are. The hidden topbar menu was the only thing naming the member on a
              phone; the pills still carry streak/level/XP, so this stays to just identity. */}
          <div className="gd-side-me">
            <span className="av">{initial}</span>
            <div className="t">
              <b>{d?.name || firstName}</b>
              {lv && <span>Level {lv.level} · {lv.title}</span>}
            </div>
          </div>
          <button className="gd-nav-btn" onClick={() => nav('/careerpilot/profile')}>
            <span className="ic"><Icon name="user" /></span><span className="lbl">My profile</span>
          </button>
          <button className="gd-nav-btn" onClick={() => nav('/careerpilot/assessment')}>
            <span className="ic"><Icon name="chart" /></span><span className="lbl">My result</span>
          </button>
          <button className="gd-nav-btn" onClick={() => nav('/careerpilot/news')}>
            <span className="ic"><Icon name="news" /></span><span className="lbl">Tech news</span>
          </button>
          <button className="gd-nav-btn" onClick={share} disabled={!d?.shareSlug}>
            <span className="ic"><Icon name="share" /></span>
            <span className="lbl">{copied ? 'Link copied!' : 'Share my card'}</span>
          </button>
          <button className="gd-nav-btn out" onClick={() => logout()}>
            <span className="ic"><Icon name="logout" /></span><span className="lbl">Log out</span>
          </button>
        </div>

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
                <Link to="/careerpilot/leaderboard" className="gd-pill" style={{ textDecoration: 'none' }}
                  title="See where you rank">
                  <span className="em">🔥</span>
                  <div><b>{st.streak}</b><span>Day Streak</span></div>
                </Link>
                {/* Only once there is a balance — an empty wallet in the header teaches a
                    member that coins are not worth paying attention to. */}
                {!!d?.coins?.balance && (
                  <Link to="/careerpilot/coins" className="gd-pill" style={{ textDecoration: 'none' }}>
                    <span className="em">🪙</span>
                    <div><b>{d.coins.balance.toLocaleString('en-IN')}</b><span>Coins</span></div>
                  </Link>
                )}
                <Link to="/careerpilot/achievements" className="gd-pill level" style={{ textDecoration: 'none' }}
                  title="See your badges and achievements">
                  <span className="hex">🎖️</span>
                  <div>
                    <b>Level {lv.level}</b><span>{lv.title}</span>
                    <div className="lbar"><i style={{ width: `${lv.progressPct}%` }} /></div>
                  </div>
                </Link>
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
                  {/* Account, not activity. The rail carries the six things a student
                      DOES; this carries who they are. */}
                  <button onClick={() => { setUserOpen(false); nav('/careerpilot/profile'); }}>My profile</button>
                  <button onClick={() => { setUserOpen(false); nav('/careerpilot/assessment'); }}>My result</button>
                  <button onClick={() => { setUserOpen(false); nav('/careerpilot/news'); }}>Tech news</button>
                  <button onClick={share} disabled={!d?.shareSlug}>{copied ? 'Link copied!' : 'Share my CareerPilot card'}</button>
                  <button className="out" onClick={() => logout()}>Log out</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/*
          Set-password nudge.

          It used to live only in MissionControl — but PassportHome renders MissionControl
          ONLY for members without a paid assessment; everyone past that point gets the
          Dashboard and never saw it. So the members most likely to come back later, and
          most likely to need a way in that isn't a WhatsApp code, were the ones who were
          never offered one. Here in the shell it shows on every member page until they
          set one.
        */}
        {d && d.passwordSet === false && !pwdDone && (
          <div className="gd-pwd-nudge">
            <span className="ic">🔒</span>
            <div className="txt">
              <b>Secure your account — set a password</b>
              <span>So you can log in next time without waiting for a WhatsApp code.</span>
            </div>
            {!pwdOpen ? (
              <button className="go" onClick={() => setPwdOpen(true)}>Set password</button>
            ) : (
              <div className="row">
                <input
                  type="password" value={pwd} autoFocus
                  placeholder="New password (min 6)"
                  onChange={e => setPwd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && savePassword()}
                />
                <button className="save" onClick={savePassword} disabled={pwdBusy}>{pwdBusy ? 'Saving…' : 'Save'}</button>
                <button className="cancel" onClick={() => { setPwdOpen(false); setPwdMsg(''); }}>Cancel</button>
              </div>
            )}
            {pwdMsg && <div className="msg">{pwdMsg}</div>}
          </div>
        )}

        {children}
      </main>
    </div>
  );
};

export default MemberShell;
