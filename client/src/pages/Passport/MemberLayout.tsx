import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import passportApi, { DashboardData } from '../../api/passportApi';
import MemberShell from './MemberShell';

/**
 * Layout route for every paid Passport page.
 *
 * Previously each page rendered its own <MemberShell>, so React Router unmounted the
 * whole tree on navigation: the rail remounted, re-fetched /passport/dashboard, lost
 * its expand state and visibly flashed on every click. Mounting the shell ONCE here
 * and swapping only <Outlet/> fixes that — the rail is now persistent chrome.
 *
 * The dashboard payload is fetched once and shared through context, so pages don't
 * each issue their own request for it either.
 */

interface MemberCtx {
  data: DashboardData | null;
  reload: () => void;
}

const Ctx = createContext<MemberCtx>({ data: null, reload: () => {} });
export const useMember = () => useContext(Ctx);

const MemberLayout: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const isMember = !!data?.active && !!data?.hasAssessment;
  const ctx = { data, reload: load };

  // Free candidates keep each page's own chrome — the rail's destinations are all
  // locked to them, so wrapping them in it would be a menu of dead ends.
  if (!isMember) {
    return <Ctx.Provider value={ctx}><Outlet /></Ctx.Provider>;
  }

  return (
    <Ctx.Provider value={ctx}>
      <MemberShell data={data}><Outlet /></MemberShell>
    </Ctx.Provider>
  );
};

export default MemberLayout;
