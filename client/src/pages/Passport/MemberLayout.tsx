import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import CareerProfilePrompt from './CareerProfilePrompt';
import CareerSetupPrompt from './CareerSetupPrompt';
import { Outlet } from 'react-router-dom';
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

const MemberLayout: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData(await passportApi.getDashboard()); }
    catch { setData(null); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#64748B' }}>Loading your CareerPilot…</div>;
  }

  const isMember = !!data?.active;
  const ctx = { data, reload: load };

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
        <Outlet />
      </MemberShell>
    </Ctx.Provider>
  );
};

export default MemberLayout;
