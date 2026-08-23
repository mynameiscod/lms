import React from 'react';
import { useMember } from './MemberLayout';
import DashboardRedesign from './DashboardRedesign';
import MissionControl from './MissionControl';

/**
 * `/careerpilot` — picks the home screen. MemberLayout has already fetched the payload
 * and decided whether to wrap us in the rail, so this just picks the body: the
 * gamified dashboard for a paying member with an assessment, MissionControl (which
 * owns the marketing landing and unlock flow) for everyone else.
 */
const PassportHome: React.FC = () => {
  const { data, reload } = useMember();

  if (data?.active && data?.hasAssessment) {
    return <DashboardRedesign data={data} reload={reload} />;
  }
  return <MissionControl />;
};

export default PassportHome;
