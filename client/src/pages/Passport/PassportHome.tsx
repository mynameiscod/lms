import React from 'react';
import { useMember } from './MemberLayout';
import Dashboard from './Dashboard';
import DashboardLocked from './DashboardLocked';
import MissionControl from './MissionControl';

/**
 * `/careerpilot` — the member's home.
 *
 * ONCE THEY HAVE BEEN MEASURED, THIS IS THE DASHBOARD. Whether they have paid or not.
 *
 * It used to require `active && hasAssessment`, so a student who had sat the paper but not
 * bought anything was sent to Mission Control, which is a paywall wearing a dashboard's
 * clothes. That asked them to buy before they had seen the thing they would be buying, and it
 * hid the one thing that was already theirs: the result of the assessment they had just taken.
 *
 * They now get the real dashboard with the paid panels locked in place — each one saying what
 * is behind it and showing their own figures for it. The argument for membership is the
 * product, not a screen in front of it.
 *
 * BEFORE THE ASSESSMENT, STILL MISSION CONTROL. There is nothing to put in a dashboard yet,
 * and exactly one thing worth doing.
 */
const PassportHome: React.FC = () => {
  const { data, reload } = useMember();

  if (data?.hasAssessment) {
    return (
      <div className="cb-dashboard-surface">
        {data.active
          ? <Dashboard data={data} reload={reload} />
          : <DashboardLocked data={data} />}
      </div>
    );
  }
  return <MissionControl />;
};

export default PassportHome;
