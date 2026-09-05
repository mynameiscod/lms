import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import passportApi, { DashboardData } from '../../api/passportApi';
import { useAuth } from '../../contexts/AuthContext';
import './dashboard.css';
import './member.css';

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

const MemberShell: React.FC<Props> = ({ children, data }) => {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

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

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
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
      <button className={`gd-burger${mobileOpen ? ' hide' : ''}`} onClick={openDrawer} aria-label="Menu">
        <Icon name="menu" />
      </button>
      {mobileOpen && <div className="gd-scrim" onClick={() => setMobileOpen(false)} />}

      <aside className={`gd-side${mobileOpen ? ' open' : ''}`}>
        <button className="gd-side-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <Icon name="close" />
        </button>
        <button className="gd-logo" onClick={() => nav('/careerpilot')}>
          <span className="mk"><b className="mono">CB</b>
            <img src="/assets/logo.png" alt="CodeBegun" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </span>
          <div><b>Codebegun</b><small>Begin Your Code. Build Your Future.</small></div>
        </button>

        <nav className="gd-nav">
          {navBtn('Home', 'home', '/careerpilot')}
          {navBtn('My Roadmap', 'roadmap', '/careerpilot/roadmap')}
          {navBtn('Practice', 'code', '/careerpilot/practice')}
          {navBtn('Thinking Lab', 'brain', '/careerpilot/thinking-lab')}
          {navBtn('Communication Lab', 'speech', '/careerpilot/communication')}
          {navBtn('Mock Interview', 'interview', '/careerpilot/interview')}
          {navBtn('Opportunities', 'building', '/careerpilot/companies')}
          {navBtn('Resume', 'resume', '/careerpilot/resume')}
          {navBtn('My Progress', 'trophy', '/careerpilot/progress')}
        </nav>

        <div className="gd-side-account">
          <div className="gd-side-me">
            <span className="av">{initial}</span>
            <div className="t"><b>{d?.name || firstName}</b>{lv && <span>Level {lv.level} · {lv.title}</span>}</div>
          </div>
          <button className="gd-nav-btn" onClick={() => nav('/careerpilot/profile')}><span className="ic"><Icon name="user" /></span><span className="lbl">My profile</span></button>
          <button className="gd-nav-btn" onClick={() => nav('/careerpilot/readiness')}><span className="ic"><Icon name="chart" /></span><span className="lbl">My result</span></button>
          <button className="gd-nav-btn" onClick={() => nav('/careerpilot/news')}><span className="ic"><Icon name="news" /></span><span className="lbl">Tech news</span></button>
          <button className="gd-nav-btn" onClick={share} disabled={!d?.shareSlug}><span className="ic"><Icon name="share" /></span><span className="lbl">{copied ? 'Link copied!' : 'Share my card'}</span></button>
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
            {path === '/careerpilot' && <div className="gd-hello"><h1>Hey {firstName}!</h1><p>Let’s code, solve problems and level up your skills.</p></div>}
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
                <button onClick={() => { setUserOpen(false); nav('/careerpilot/news'); }}>Tech news</button>
                <button onClick={share} disabled={!d?.shareSlug}>{copied ? 'Link copied!' : 'Share my CareerPilot card'}</button>
                <button className="out" onClick={() => logout()}>Log out</button>
              </div>}
            </div>
          </div>
        </div>

        {d && d.passwordSet === false && !pwdDone && <div className="gd-pwd-nudge">
          <span className="ic"><Icon name="lock-fill" /></span>
          <div className="txt"><b>Secure your account — set a password</b><span>So you can log in next time without waiting for a WhatsApp code.</span></div>
          {!pwdOpen ? <button className="go" onClick={() => setPwdOpen(true)}>Set password</button> : <div className="row">
            <input type="password" value={pwd} autoFocus placeholder="New password (min 6)" onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && savePassword()} />
            <button className="save" onClick={savePassword} disabled={pwdBusy}>{pwdBusy ? 'Saving…' : 'Save'}</button>
            <button className="cancel" onClick={() => { setPwdOpen(false); setPwdMsg(''); }}>Cancel</button>
          </div>}
          {pwdMsg && <div className="msg">{pwdMsg}</div>}
        </div>}

        {children}
      </main>
    </div>
  );
};

export default MemberShell;
