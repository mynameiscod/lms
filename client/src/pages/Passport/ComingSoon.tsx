import React from 'react';
import { useNavigate } from 'react-router-dom';
import './comingSoon.css';

/**
 * A sidebar section that is announced but not built yet (Aptitude, Reasoning). It says what is
 * coming and points at what a member can already do today, so the click is never a dead end.
 */
export interface ComingSoonProps {
  title: string;
  icon: string;
  intro: string;
  topics: string[];
  meanwhile: { label: string; to: string; icon: string };
}

const ComingSoon: React.FC<ComingSoonProps> = ({ title, icon, intro, topics, meanwhile }) => {
  const nav = useNavigate();
  return (
    <div className="cps">
      <section className="cps-card">
        <span className="cps-badge"><i className="bi bi-hourglass-split" aria-hidden /> Coming soon</span>
        <span className="cps-icon" aria-hidden><i className={`bi bi-${icon}`} /></span>
        <h1>{title}</h1>
        <p className="cps-intro">{intro}</p>
        <div className="cps-topics" aria-label="What it will cover">
          {topics.map(t => <span key={t}>{t}</span>)}
        </div>
        <p className="cps-note">We are building this section now. It opens right here the day it is ready.</p>
        <button className="cps-cta" onClick={() => nav(meanwhile.to)}>
          <i className={`bi bi-${meanwhile.icon}`} aria-hidden /> {meanwhile.label}
        </button>
      </section>
    </div>
  );
};

export const AptitudeSoon: React.FC = () => (
  <ComingSoon
    title="Aptitude"
    icon="calculator"
    intro="Timed quantitative aptitude practice, the way placement tests ask it, with worked solutions and your speed and accuracy tracked by topic."
    topics={['Percentages', 'Profit & loss', 'Ratios', 'Time & work', 'Time, speed & distance', 'Probability', 'Number system', 'Data interpretation']}
    meanwhile={{ label: 'Try the Thinking Lab meanwhile', to: '/careerpilot/thinking-lab', icon: 'lightbulb' }}
  />
);

export const ReasoningSoon: React.FC = () => (
  <ComingSoon
    title="Reasoning"
    icon="puzzle"
    intro="Logical and verbal reasoning drills from real placement papers, from quick warm-ups to full timed sections, with an explanation for every answer."
    topics={['Series', 'Coding–decoding', 'Blood relations', 'Directions', 'Seating arrangement', 'Syllogisms', 'Puzzles', 'Verbal reasoning']}
    meanwhile={{ label: 'Try the Thinking Lab meanwhile', to: '/careerpilot/thinking-lab', icon: 'lightbulb' }}
  />
);

export default ComingSoon;
