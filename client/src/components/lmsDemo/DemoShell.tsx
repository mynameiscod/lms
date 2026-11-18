import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { lmsDemoApi, DemoMe } from '../../api/lmsDemoApi';
import DemoEnded from './DemoEnded';
import TalkDialog from './TalkDialog';
import { DEMO_FEATURE_META, DEMO_ALWAYS_PATHS } from './demoFeatures';
import './demoShell.css';

/**
 * THE LMS DEMO STUDENT, inside the normal LMS student layout (sidebar + navbar, like every student).
 *
 *   DemoProvider  loads the demo (clock, courses, features, allowances), keeps the student on the
 *                 pages the demo allows (the server refuses the rest: middleware/lmsDemoScope), and
 *                 owns the Talk to a counsellor dialog. Layout wraps a demo student's page in it.
 *   DemoStrip     the slim bar on top of the page: "Free demo · N days left · Talk to a counsellor".
 *   DemoContent   the page itself, or the end-of-demo screen once the demo is over.
 * The Sidebar reads the same context to list only My Learning Plan and the switched-on features.
 */

interface DemoCtx { me: DemoMe | null; failed: boolean; refresh: () => void; openTalk: () => void }
const Ctx = createContext<DemoCtx>({ me: null, failed: false, refresh: () => {}, openTalk: () => {} });
export const useLmsDemo = () => useContext(Ctx);

/** Is the signed-in account an LMS demo student? */
export const isDemoUser = (user: any): boolean => !!(user && user.role === 'STUDENT' && (user.lmsDemo?.at || user.lmsDemo === true));

/** The features switched on for this demo, in menu order. */
export const demoFeaturesOn = (me: DemoMe | null) => DEMO_FEATURE_META.filter(f => !!me?.features?.[f.key]);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [me, setMe] = useState<DemoMe | null>(null);
  const [failed, setFailed] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);

  const refresh = useCallback(() => {
    lmsDemoApi.me().then(m => { setMe(m); setFailed(false); }).catch(() => setFailed(true));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  // The clock can run out while the page is open; check again every few minutes.
  useEffect(() => { const t = setInterval(refresh, 5 * 60_000); return () => clearInterval(t); }, [refresh]);

  // Pages: the learning plan always; a feature's pages only while it is switched on. Wait for the
  // settings before deciding, so a feature page opened by link is not bounced on first paint.
  const on = demoFeaturesOn(me);
  const allowed = DEMO_ALWAYS_PATHS.some(re => re.test(pathname)) || on.some(f => f.paths.some(re => re.test(pathname)));
  if (me && !me.ended && !allowed) return <Navigate to="/my-learning" replace />;

  return (
    <Ctx.Provider value={{ me, failed, refresh, openTalk: () => setTalkOpen(true) }}>
      {children}
      {talkOpen && <TalkDialog me={me} onClose={() => { setTalkOpen(false); refresh(); }} />}
    </Ctx.Provider>
  );
}

/** The slim demo bar at the top of every demo page. */
export function DemoStrip() {
  const { me, openTalk } = useLmsDemo();
  if (!me?.isDemo || me.ended) return null;
  const daysLeft = me.daysLeft ?? 0;
  const last = daysLeft <= 1;
  const ends = me.expiresAt ? new Date(me.expiresAt).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
  return (
    <div className={`dsh-strip${last ? ' last' : ''}`} role="status">
      <span className="dsh-strip-tag"><i className="bi bi-stars" /> Free demo</span>
      <span className="dsh-strip-clock" title={ends ? `Ends ${ends}` : ''}>
        <i className="bi bi-hourglass-split" /> {last ? `Last day — ends ${ends}` : `${daysLeft} days left`}
      </span>
      <span className="dsh-strip-sp" />
      <span className="dsh-strip-hint">Like what you see?</span>
      <button type="button" className="dsh-strip-talk" onClick={openTalk}><i className="bi bi-headset" /> Talk to a counsellor</button>
    </div>
  );
}

/** The page, or the end screen once the demo is over. */
export function DemoContent({ children }: { children: React.ReactNode }) {
  const { me, failed, refresh, openTalk } = useLmsDemo();
  if (failed && !me) return <div className="dsh-note">We could not load your demo. Check your connection and refresh.</div>;
  if (me?.ended) return <DemoEnded me={me} onTalk={openTalk} onMoreTime={refresh} />;
  return <>{children}</>;
}
