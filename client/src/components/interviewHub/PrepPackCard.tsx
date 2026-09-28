import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewHubApi } from '../../api/interviewHubApi';
import '../../pages/ProblemBank/ProblemBank.css';
import '../../pages/InterviewHub/hub.css';

/**
 * Dashboard nudge: the student's next drive with a prep pack waiting. Renders nothing when
 * there is none, so it costs nothing to leave on the dashboard.
 */
const PrepPackCard: React.FC = () => {
  const nav = useNavigate();
  const [next, setNext] = useState<{ driveId: string; companyName: string; role: string; driveDate: string | null; opened: boolean } | null>(null);
  useEffect(() => { interviewHubApi.prepList().then((r) => setNext(r[0] || null)).catch(() => undefined); }, []);
  if (!next) return null;
  const days = next.driveDate ? Math.ceil((new Date(next.driveDate).getTime() - Date.now()) / 86400000) : null;
  return (
    <div className="pb-root" style={{ background: 'transparent', minHeight: 0 }}>
      <div className="ih-prepcard">
        <i className="fa-solid fa-book-open" style={{ fontSize: 22, color: '#4f46e5' }} />
        <div style={{ flex: 1 }}>
          <b>{next.companyName} prep pack{next.opened ? '' : ' — new'}</b>
          <div style={{ fontSize: 13, color: '#475569' }}>
            {days !== null ? (days <= 0 ? 'Your drive is today.' : days === 1 ? 'Your drive is tomorrow.' : `Your drive is in ${days} days.`) : 'Drive date to be announced.'} See what they asked the candidates before you.
          </div>
        </div>
        <button className="pb-btn pb-btn-primary" onClick={() => nav(`/drives/${next.driveId}/prep`)}>Open</button>
      </div>
    </div>
  );
};

export default PrepPackCard;
