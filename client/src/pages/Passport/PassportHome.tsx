import React from 'react';
import { useMember } from './MemberLayout';
import Dashboard from './Dashboard';
import DashboardLocked from './DashboardLocked';

/**
 * `/careerpilot` — the member's home. ONE SCREEN, whatever state they are in.
 *
 * It used to fork to Mission Control — a full-page sales pitch with its own chrome and no
 * navigation — for anyone without a membership or without an assessment. So the same click
 * produced two completely different products depending on state the student could not see:
 * finish the paper and you got a dashboard, arrive a minute earlier and you got a pitch. And
 * the pitch asked people to buy before they had seen the thing they would be buying.
 *
 * Now there is one home, and what changes inside it is honest: a student who has not been
 * measured leads with the free assessment, a student who has sees their results with the paid
 * panels locked, and a paying member sees the working dashboard.
 */
const PassportHome: React.FC = () => {
  const { data, reload } = useMember();

  return (
    <div className="cb-dashboard-surface">
      {/* MemberLayout has already refused to render without a payload, so `data` is real here. */}
      {data!.active && data!.hasAssessment
        ? <Dashboard data={data!} reload={reload} />
        : <DashboardLocked data={data!} />}
    </div>
  );
};

export default PassportHome;
