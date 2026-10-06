import React from 'react';
import PlacementInterviews from './Interviews';
import './placementProgramAdmin.css';

/** An interviewer's own Placement Program interviews — no placement-admin rights needed. */
const MyPlacementInterviews: React.FC = () => (
  <div className="ppa">
    <div className="ppa-head">
      <div>
        <h1><i className="bi bi-camera-video" /> My Placement Interviews</h1>
        <p>Interviews assigned to you. After each one, mark whether the candidate attended.</p>
      </div>
    </div>
    <div style={{ height: 14 }} />
    <PlacementInterviews mineOnly />
  </div>
);

export default MyPlacementInterviews;
