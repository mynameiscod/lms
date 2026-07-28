import React, { useCallback, useEffect, useState } from 'react';
import passportApi, { DashboardData } from '../../api/passportApi';
import Dashboard from './Dashboard';
import MissionControl from './MissionControl';

/**
 * `/passport` — decides which home the visitor gets.
 *
 * A paying member who has taken the assessment gets the gamified Dashboard.
 * Everyone else (no assessment yet, or scored but not yet a member) gets
 * MissionControl, which owns the marketing landing and the ₹499 unlock.
 * One fetch decides it, so there's no flash of the wrong screen.
 */
const PassportHome: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData(await passportApi.getDashboard()); }
    catch { setData(null); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#7b8496' }}>Loading your Career Passport…</div>;
  }

  if (data?.active && data?.hasAssessment) {
    return <Dashboard data={data} reload={load} />;
  }

  return <MissionControl />;
};

export default PassportHome;
