import React from 'react';
import { Navigate } from 'react-router-dom';
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

  /**
   * NOTHING HERE IS REACHABLE BEFORE THE ASSESSMENT.
   *
   * The logo, every redirect and every stray link land on this route, and it used to answer with
   * the locked dashboard — a page about results, for somebody with no results. The student's own
   * home, until they are measured, IS the assessment: it is free, it is the next thing to do, and
   * everything else on the account is built out of it.
   *
   * Setup comes first where it is outstanding, because the assessment is chosen for a stage and
   * a target role and cannot be built without them.
   *
   * `replace` so the back button does not bounce them between here and there.
   */
  if (data && !data.hasAssessment) {
    return <Navigate to={data.setupCompleted === false ? '/careerpilot/setup' : '/careerpilot/skill-assessment'} replace />;
  }

  return (
    <div className="cb-dashboard-surface">
      {/* MemberLayout has already refused to render without a payload, so `data` is real here. */}
      {/* Measured by now; what is left to decide is whether they have paid. */}
      {data!.active
        ? <Dashboard data={data!} reload={reload} />
        : <DashboardLocked data={data!} />}
    </div>
  );
};

export default PassportHome;
