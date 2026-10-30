import React, { Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import CareerSetupPrompt from './CareerSetupPrompt';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { CareerPilotFeatureKey } from '../../config/studentFeatureCatalog';
import passportApi, { DashboardData, MemberSection } from '../../api/passportApi';
import MemberShell from './MemberShell';
import './memberLayoutFix.css';
import './memberCodebegun.css';
// The member profile page re-dresses the shared LMS profile wizard. It is loaded here, after
// the shell's own sheet, because it has to win against the "9 Profile" block inside it — and
// every rule in it is scoped to .cb-member-profile, so the LMS copy of the wizard is untouched.
import './memberProfile.css';

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

/**
 * Membership-only pages that are shared LMS screens rather than CareerPilot ones.
 *
 * Practice, Interview and the rest explain their own lock, because their CareerPilot API refuses
 * a non-member and the page reads that refusal. These six are the LMS's own pages mounted under
 * /careerpilot, with no CareerPilot API behind them to refuse anything — so the lock is applied
 * here, by route, and the page itself is never rendered for a member who has not paid. Whether
 * each one is paid is still the tenant's setting: the server lists it in `data.locked` or not.
 *
 * Matched on a path SEGMENT, so '/careerpilot/interview-experiences' does not also catch
 * '/careerpilot/interview'.
 */
const ROUTE_SECTIONS: { prefix: string; section: MemberSection }[] = [
  { prefix: '/careerpilot/coding',                section: 'coding' },
  { prefix: '/careerpilot/playground',            section: 'playground' },
  { prefix: '/careerpilot/communication',         section: 'communication' },
  { prefix: '/careerpilot/interview-experiences', section: 'experiences' },
  { prefix: '/careerpilot/question-books',        section: 'questionBooks' },
  { prefix: '/careerpilot/mentor',                section: 'mentor' },
  // Before membership these show the unlock page, never their content (the APIs refuse too).
  { prefix: '/careerpilot/practice',              section: 'practice' },
  { prefix: '/careerpilot/thinking-lab',          section: 'thinkingLab' },
  { prefix: '/careerpilot/industry-connect',      section: 'industryConnect' },
  { prefix: '/careerpilot/progress',              section: 'progress' },
];
/**
 * Which menu switch (Student Features, CareerPilot tab) each page belongs to. Longest prefix first,
 * so '/careerpilot/interview-experiences' is not mistaken for '/careerpilot/interview'.
 */
const ROUTE_FEATURES: [string, CareerPilotFeatureKey][] = [
  ['/careerpilot/interview-experiences', 'experiences'], ['/careerpilot/question-books', 'questionBooks'],
  ['/careerpilot/interview', 'interview'], ['/careerpilot/thinking-lab', 'thinkingLab'], ['/careerpilot/communication', 'communication'],
  ['/careerpilot/playground', 'playground'], ['/careerpilot/visualizer', 'visualizer'], ['/careerpilot/practice', 'practice'], ['/careerpilot/coding', 'coding'],
  ['/careerpilot/roadmap', 'roadmap'], ['/careerpilot/plan', 'plan'], ['/careerpilot/mentor', 'mentor'],
  ['/careerpilot/companies', 'companies'], ['/careerpilot/news', 'news'], ['/careerpilot/resume', 'resume'], ['/careerpilot/progress', 'progress'],
  ['/careerpilot/industry-connect', 'industryConnect'], ['/careerpilot/support', 'support'],
  ['/careerpilot/aptitude', 'aptitude'], ['/careerpilot/reasoning', 'reasoning'], ['/careerpilot/rewards', 'progress'],
];
const featureForRoute = (pathname: string) =>
  ROUTE_FEATURES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1];

const sectionForRoute = (pathname: string): MemberSection | undefined =>
  ROUTE_SECTIONS.find(r => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))?.section;

/*
 * Lazy, so sectionLock.css stays out of the shell's chunk: pulling it in there is what broke the
 * CI build on a CSS ordering conflict once already (see useUnlock.ts).
 */
const SectionLock = lazy(() => import('./SectionLock'));

const pageKeyFor = (pathname: string) => {
  if (pathname === '/careerpilot') return 'dashboard';
  // A journey day belongs to the roadmap: same product surface, same frame, and the member
  // should not feel they left the roadmap to do the day it sent them to.
  if (pathname.startsWith('/careerpilot/journey/day')) return 'roadmap';
  if (pathname.startsWith('/careerpilot/roadmap')) return 'roadmap';
  if (pathname.startsWith('/careerpilot/thinking-lab')) return 'thinking';
  if (pathname.startsWith('/careerpilot/practice')) return 'practice';
  if (pathname.startsWith('/careerpilot/communication')) return 'communication';
  if (pathname.startsWith('/careerpilot/interview')) return 'interview';
  if (pathname.startsWith('/careerpilot/companies')) return 'companies';
  if (pathname.startsWith('/careerpilot/resume')) return 'resume';
  if (pathname.startsWith('/careerpilot/profile')) return 'profile';
  if (pathname.startsWith('/careerpilot/mentor')) return 'mentor';
  if (pathname.startsWith('/careerpilot/playground')) return 'playground';
  if (pathname.startsWith('/careerpilot/visualizer')) return 'visualizer';
  if (pathname.startsWith('/careerpilot/readiness')) return 'readiness';
  if (pathname.startsWith('/careerpilot/news')) return 'news';
  if (pathname.startsWith('/careerpilot/industry-connect')) return 'industry';
  if (pathname.startsWith('/careerpilot/support')) return 'support';
  return 'other';
};

const MemberLayout: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { pathname } = useLocation();
  const pageKey = useMemo(() => pageKeyFor(pathname), [pathname]);

  /* One request at a time; a reload asked for while one is out runs once when it returns. */
  const inFlight = useRef(false);
  const again = useRef(false);
  const loadedOnce = useRef(false);
  const load = useCallback(async () => {
    if (inFlight.current) { again.current = true; return; }
    inFlight.current = true;
    try {
      do {
        again.current = false;
        try { setData(await passportApi.getDashboard()); loadedOnce.current = true; }
        // A failed QUIET reload keeps what is on screen; only the first load may show the error page.
        catch { if (!loadedOnce.current) setData(null); }
      } while (again.current);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * The top bar (streak, coins, level, XP), the home cards, missions and locks all read this one
   * payload. It was loaded once, so work done on one page (a lesson, a solved problem, a mission)
   * showed on the others only after a browser refresh. It is now read again, quietly, on every
   * page change and shortly after any save or submit a member page sends.
   */
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) { firstPath.current = false; return; }
    load();
  }, [pathname, load]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const id = axios.interceptors.response.use(res => {
      const method = String(res.config?.method || 'get').toLowerCase();
      const url = String(res.config?.url || '');
      // Not for background writes that repeat while a page is open (page-view activity, video watch
      // time, autosave, logs) — a page change already reloads.
      if (method !== 'get' && !/\/auth\/|\/logout|\/activity|progress|heartbeat|telemetry|watch|autosave|draft|\/log|analytics|events?\b/i.test(url)) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => load(), 700);
      }
      return res;
    });
    return () => { axios.interceptors.response.eject(id); if (timer) clearTimeout(timer); };
  }, [load]);

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
  const routeFeature = featureForRoute(pathname);
  if (routeFeature && (data.hidden || []).includes(routeFeature)) return <Navigate to="/careerpilot" replace />;
  const routeSection = sectionForRoute(pathname);
  const routeLocked = !!routeSection && (data.locked || []).some(l => l.section === routeSection);

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
          {routeLocked
            ? <Suspense fallback={null}><SectionLock section={routeSection!} /></Suspense>
            : <Outlet />}
        </div>
      </MemberShell>
    </Ctx.Provider>
  );
};

export default MemberLayout;
