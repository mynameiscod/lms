import React from 'react';
import PassportShell from './PassportShell';
import './industryConnect.css';

/**
 * Industry Connect — not built yet. The page says what is coming and nothing more: no dates,
 * no names of companies or mentors, no sign-up that stores anything, because none of that
 * exists and a preview must not promise what the product cannot yet keep.
 *
 * The institute can hide the menu item (Student Features, CareerPilot tab: 'industryConnect').
 */
const PLANNED: { icon: string; title: string; text: string }[] = [
  { icon: 'people', title: 'Meet people in industry', text: 'Talk to engineers, analysts and hiring managers who do the work you are preparing for.' },
  { icon: 'chat-square-text', title: 'Ask real questions', text: 'What the job is like day to day, what they look for, and how they got there.' },
  { icon: 'signpost-split', title: 'Guidance for your path', text: 'Advice that matches your track and where you are in your roadmap.' },
];

const IndustryConnect: React.FC = () => (
  <PassportShell>
    <div className="icn">
      <section className="icn-hero">
        <span className="icn-badge"><i className="bi bi-hourglass-split" aria-hidden /> Coming soon</span>
        <h1>Industry Connect</h1>
        <p>A place to connect with people working in the industry. We are building it now, and it will appear here when it is ready.</p>
      </section>

      <h2 className="icn-sub">What it will offer</h2>
      <div className="icn-grid">
        {PLANNED.map(p => (
          <div className="icn-card" key={p.title}>
            <span className="icn-ic"><i className={`bi bi-${p.icon}`} aria-hidden /></span>
            <h3>{p.title}</h3>
            <p>{p.text}</p>
          </div>
        ))}
      </div>

      <p className="icn-note"><i className="bi bi-info-circle" aria-hidden /> Until then, keep going with your roadmap: the work you do there is what you will talk about with them.</p>
    </div>
  </PassportShell>
);

export default IndustryConnect;
