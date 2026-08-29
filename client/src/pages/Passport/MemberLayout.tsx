import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import CareerProfilePrompt from './CareerProfilePrompt';
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

  // Membership activation owns the paid shell. Assessment/setup state controls the
  // content shown inside it, not whether a paid member gets navigation at all.
  const isMember = !!data?.active;
  const ctx = { data, reload: load };

  // Free candidates keep each page's own chrome — the rail's destinations are all
  // locked to them, so wrapping them in it would be a menu of dead ends.
  if (!isMember) {
    return (
      <Ctx.Provider value={ctx}>
        <CareerProfilePrompt />
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
