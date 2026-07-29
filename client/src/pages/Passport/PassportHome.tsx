import React from 'react';
import { useMember } from './MemberLayout';
import Dashboard from './Dashboard';
import MissionControl from './MissionControl';

/**
 * `/passport` — picks the home screen. MemberLayout has already fetched the payload
 * and decided whether to wrap us in the rail, so this just picks the body: the
 * gamified Dashboard for a paying member with an assessment, MissionControl (which
 * owns the marketing landing and the ₹499 unlock) for everyone else.
 */
const PassportHome: React.FC = () => {
  const { data, reload } = useMember();

  if (data?.active && data?.hasAssessment) {
    return <Dashboard data={data} reload={reload} />;
  }
  return <MissionControl />;
};

export default PassportHome;
