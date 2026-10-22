import React from 'react';
import { useNavigate } from 'react-router-dom';
import MyTickets from './MyTickets';
import './support.css';

/** Help & Support home. */
const HelpCenter: React.FC<{ basePath: string }> = ({ basePath }) => {
  const nav = useNavigate();
  return (
    <div className="sp">
      <h1>Help &amp; Support</h1>
      <p className="sp-sub">Report a problem or follow up on one you have raised.</p>
      <div className="sp-tiles">
        <button type="button" className="sp-tile" onClick={() => nav(`${basePath}/new`)}>
          <i className="bi bi-bug" aria-hidden /><b>Report a problem</b><span>Tell us what went wrong and we will look into it.</span>
        </button>
        <button type="button" className="sp-tile" onClick={() => nav(`${basePath}/tickets`)}>
          <i className="bi bi-ticket-detailed" aria-hidden /><b>My tickets</b><span>See replies and the status of what you reported.</span>
        </button>
      </div>
      <div className="sp-card" style={{ marginTop: 18 }}>
        <h2>Recent tickets</h2>
        <MyTickets basePath={basePath} compact limit={5} />
      </div>
    </div>
  );
};

export default HelpCenter;
