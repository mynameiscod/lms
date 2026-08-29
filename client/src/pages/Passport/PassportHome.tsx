import React from 'react';
import { useMember } from './MemberLayout';
import Dashboard from './Dashboard';
import MissionControl from './MissionControl';

/** `/careerpilot` — member dashboard for assessed members, Mission Control otherwise. */
const PassportHome: React.FC = () => {
  const { data, reload } = useMember();

  if (data?.active && data?.hasAssessment) {
    return <div className="cb-dashboard-surface"><Dashboard data={data} reload={reload} /></div>;
  }
  return <MissionControl />;
};

export default PassportHome;
