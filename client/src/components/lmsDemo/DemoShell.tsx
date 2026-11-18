import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { lmsDemoApi, DemoMe } from '../../api/lmsDemoApi';
import DemoEnded from './DemoEnded';
import TalkDialog from './TalkDialog';
import './demoShell.css';

/**
 * THE DEMO STUDENT'S APP SHELL. Replaces the normal sidebar + navbar for an LMS demo account
 * (user.lmsDemo): a CareerPilot-style top bar with the demo clock and "Talk to a counsellor", and
 * only the learning plan behind it. The server refuses everything else (middleware/lmsDemoScope),
 * so this is the page-level half of the same rule. Once the demo ends, only the end screen shows.
 */

interface DemoCtx { me: DemoMe | null; refresh: () => void; openTalk: () => void }
const Ctx = createContext<DemoCtx>({ me: null, refresh: () => {}, openTalk: () => {} });
export const useLmsDemo = () => useContext(Ctx);

/** Is the signed-in account an LMS demo student? */
export const isDemoUser = (user: any): boolean => !!(user && user.role === 'STUDENT' && (user.lmsDemo?.at || user.lmsDemo === true));

/** Pages a demo student may open. Everything else goes to My Learning Plan. */
const DEMO_PATHS = [/^\/my-learning(\/|$)/];

export default function DemoShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth() as any;
  const { pathname } = useLocation();
  const [me, setMe] = useState<DemoMe | null>(null);
  const [failed, setFailed] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const refresh = useCallback(() => {
    lmsDemoApi.me().then(m => { setMe(m); setFailed(false); }).catch(() => setFailed(true));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  // The clock can run out while the page is open; check again every few minutes.
  useEffect(() => { const t = setInterval(refresh, 5 * 60_000); return () => clearInterval(t); }, [refresh]);
  useEffect(() => { document.documentElement.classList.add('lms-demo-route'); return () => document.documentElement.classList.remove('lms-demo-route'); }, []);

  if (!DEMO_PATHS.some(re => re.test(pathname))) return <Navigate to="/my-learning" replace />;

  const ended = !!me?.ended;
  const firstName = me?.firstName || user?.firstName || '';
  const daysLeft = me?.daysLeft ?? 0;

  return (
    <Ctx.Provider value={{ me, refresh, openTalk: () => setTalkOpen(true) }}>
      <div className="dsh">
        <header className="dsh-top">
          <div className="dsh-top-in">
            <NavLink to="/my-learning" className="dsh-brand" aria-label="My courses"><img src="/assets/logo.png" alt="CodeBegun" /></NavLink>
            {!ended && (
              <nav className="dsh-nav" aria-label="Demo">
                <NavLink to="/my-learning" end className={({ isActive }) => (isActive ? 'on' : '')}><i className="bi bi-grid-1x2" /> My courses</NavLink>
              </nav>
            )}
            <div className="dsh-right">
              {me?.isDemo && !ended && (
                <span className={`dsh-clock${daysLeft <= 1 ? ' last' : ''}`} title={me.expiresAt ? `Ends ${new Date(me.expiresAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}>
                  <i className="bi bi-hourglass-split" /> Demo · {daysLeft <= 1 ? 'last day' : `${daysLeft} days left`}
                </span>
              )}
              <button type="button" className="dsh-talk" onClick={() => setTalkOpen(true)}><i className="bi bi-headset" /><span>Talk to a counsellor</span></button>
              <div className="dsh-me">
                <button type="button" className="dsh-avatar" onClick={() => setMenuOpen(o => !o)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account">
                  {(firstName || '?').charAt(0).toUpperCase()}
                </button>
                {menuOpen && (
                  <div className="dsh-menu" role="menu" onMouseLeave={() => setMenuOpen(false)}>
                    <div className="dsh-menu-who"><b>{firstName}</b><span>Demo account</span></div>
                    <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); logout?.(); window.location.replace('/demo'); }}><i className="bi bi-box-arrow-right" /> Log out</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {me?.isDemo && !ended && daysLeft <= 1 && (
            <div className="dsh-lastday"><i className="bi bi-bell" /> Your demo ends {me.expiresAt ? `on ${new Date(me.expiresAt).toLocaleString('en-IN', { weekday: 'long', hour: 'numeric', minute: '2-digit' })}` : 'soon'}. Like what you see? <button type="button" onClick={() => setTalkOpen(true)}>Talk to a counsellor</button></div>
          )}
        </header>
        <main className="dsh-main">
          {failed && !me ? <div className="dsh-note">We could not load your demo. Check your connection and refresh.</div>
            : ended ? <DemoEnded me={me!} onTalk={() => setTalkOpen(true)} onMoreTime={refresh} />
            : children}
        </main>
        {talkOpen && <TalkDialog me={me} onClose={() => { setTalkOpen(false); refresh(); }} />}
      </div>
    </Ctx.Provider>
  );
}
