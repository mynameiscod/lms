import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import CareerSetupPrompt from './CareerSetupPrompt';
import { Outlet, useLocation } from 'react-router-dom';
import passportApi, { DashboardData } from '../../api/passportApi';
import MemberShell from './MemberShell';
import './memberLayoutFix.css';
import './memberCodebegun.css';

interface MemberCtx {
  data: DashboardData | null;
  reload: () => void;
}

const Ctx = createContext<MemberCtx>({ data: null, reload: () => {} });
export const useMember = () => useContext(Ctx);

/**
 * The 11 authenticated member surfaces currently migrated to the CodeBegun system.
 * Keeping this mapping here gives every page an explicit frame instead of relying on a
 * broad global CSS overlay. Company detail routes intentionally share the companies frame.
 */
/**
 * Screens that own the whole window.
 *
 * Onboarding and a paper in progress. Both are one task with one next action, and a navigation
 * rail beside them is an invitation to abandon it.
 */
const FOCUSED_ROUTES = [
  '/careerpilot/setup',
  '/careerpilot/skill-assessment',
  '/careerpilot/assessment',
];

const pageKeyFor = (pathname: string) => {
  if (pathname === '/careerpilot') return 'dashboard';
  if (pathname.startsWith('/careerpilot/roadmap')) return 'roadmap';
  if (pathname.startsWith('/careerpilot/thinking-lab')) return 'thinking';
  if (pathname.startsWith('/careerpilot/practice')) return 'practice';
  if (pathname.startsWith('/careerpilot/communication')) return 'communication';
  if (pathname.startsWith('/careerpilot/interview')) return 'interview';
  if (pathname.startsWith('/careerpilot/companies')) return 'companies';
  if (pathname.startsWith('/careerpilot/resume')) return 'resume';
  if (pathname.startsWith('/careerpilot/profile')) return 'profile';
  if (pathname.startsWith('/careerpilot/readiness')) return 'readiness';
  if (pathname.startsWith('/careerpilot/news')) return 'news';
  return 'other';
};

const MemberLayout: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { pathname } = useLocation();
  const pageKey = useMemo(() => pageKeyFor(pathname), [pathname]);

  const load = useCallback(async () => {
    try { setData(await passportApi.getDashboard()); }
    catch { setData(null); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reflect work finished in another tab (a payment, a solved problem) on return.
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#7b8496' }}>Loading your CareerPilot…</div>;
  }

  /**
   * The dashboard call failed. Say so.
   *
   * Now that the home screen renders for every state, a null payload would otherwise draw a
   * perfectly convincing "start here" dashboard for somebody whose session has expired or
   * whose server is down — telling them to take an assessment they cannot reach. A screen
   * that is wrong confidently is worse than one that admits it does not know.
   */
  if (!data) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#5b6478' }}>
        <p style={{ margin: '0 0 14px', fontWeight: 700, color: '#0f172a' }}>
          We could not load your CareerPilot.
        </p>
        <p style={{ margin: '0 0 18px', fontSize: 14 }}>
          Your session may have ended, or we could not reach the server.
        </p>
        <button
          onClick={() => { setLoading(true); load(); }}
          style={{ border: '1px solid #cfd7e8', background: '#fff', borderRadius: 10,
                   padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    );
  }

  const ctx = { data, reload: load };

  /**
   * THE RAIL IS EVERYONE'S.
   *
   * It used to be withheld from anyone without an active membership, and the reason given was
   * sound at the time: "the rail's destinations are all locked to them, so wrapping them in it
   * would be a menu of dead ends." That was true while every locked destination WAS a dead end.
   * They are not any more — each one now names what is behind it and shows this student's own
   * figures for it — so the rail has stopped being a menu of dead ends and become the only
   * place a free student can see what the product actually is.
   *
   * The alternative was what we had: a paywall as the first screen, asking somebody to buy
   * before they had seen anything.
   *
   * THE RAIL IS HIDDEN BY ROUTE, NOT BY STATE.
   *
   * I have had this wrong twice, in both directions. First the rail was withheld from anyone
   * without a membership, so a paying-to-be student saw a paywall with no product behind it.
   * Then I gated it on having an assessment, which took the navigation away from the dashboard
   * itself — a student who had not yet sat the paper got a bare page where the whole product
   * should have been.
   *
   * The thing that actually needs no rail is not a KIND OF STUDENT, it is a KIND OF SCREEN.
   * Onboarding and the assessment are single-purpose flows with their own chrome and exactly one
   * next action; wrapping those in nine destinations turns a clear step into a menu. Everywhere
   * else — the dashboard included, measured or not — the rail is how somebody sees what this is.
   */
  if (FOCUSED_ROUTES.some(r => pathname.startsWith(r))) {
    return (
      <Ctx.Provider value={ctx}>
        <Outlet />
      </Ctx.Provider>
    );
  }

  return (
    <Ctx.Provider value={ctx}>
      <MemberShell data={data}>
        <CareerSetupPrompt />
        <div className={`cb-member-page cb-member-${pageKey}`} data-member-page={pageKey}>
          <Outlet />
        </div>
      </MemberShell>
    </Ctx.Provider>
  );
};

export default MemberLayout;
