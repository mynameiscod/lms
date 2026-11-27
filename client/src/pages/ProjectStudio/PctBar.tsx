import React from 'react';
import './ProjectStudio.css';

/** Completion bar with the percentage beside it; turns green at 100%. */
export const PctBar: React.FC<{ pct: number }> = ({ pct }) => (
  <div className="ps-pct"><div className={`ps-bar pb-grow ${pct >= 100 ? 'done' : ''}`}><span style={{ width: `${Math.min(100, pct)}%` }} /></div><b>{pct}%</b></div>
);
