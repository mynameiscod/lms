import React from 'react';
import { Link } from 'react-router-dom';
import { LEGAL_ENTITY } from '../../config/brand';
import './careerPilotFooter.css';

/**
 * The one CareerPilot footer: landing, login and signup, career setup, the skill assessment, the
 * member home and the public assessment pages all render this, so they cannot drift apart again
 * (there were five different footers before).
 *
 * Links stay inside CareerPilot where a page exists for them. A member page asks a visitor who is
 * not signed in to sign in, which is the right answer for "Practice" on the landing page too.
 * Only Blog and Privacy Policy leave for codebegun.com.
 */

const SITE = 'https://www.codebegun.com';

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'CareerPilot',
    links: [
      { label: 'Career Readiness', to: '/careerpilot/readiness' },
      { label: 'Start Early', to: '/careerpilot/join' },
      { label: 'Skill Gap', to: '/careerpilot/skills' },
      { label: 'Placement Ready', to: '/careerpilot/placement' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Learn', to: '/careerpilot/roadmap' },
      { label: 'Practice', to: '/careerpilot/practice' },
      { label: 'Interview Prep', to: '/careerpilot/interview' },
      { label: 'Blog', to: SITE },
    ],
  },
];

const SOCIAL = [
  { label: 'Instagram', icon: 'bi-instagram', href: 'https://www.instagram.com/codebegun' },
  // The company slug is `codbegun` (no 'e'); codebegun does not exist on LinkedIn.
  { label: 'LinkedIn', icon: 'bi-linkedin', href: 'https://www.linkedin.com/company/codbegun' },
  { label: 'YouTube', icon: 'bi-youtube', href: 'https://www.youtube.com/@CodeBegun' },
];

const FooterLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  /^https?:/.test(to)
    ? <a href={to} target="_blank" rel="noreferrer">{children}</a>
    : <Link to={to}>{children}</Link>
);

const CareerPilotFooter: React.FC<{ className?: string }> = ({ className }) => (
  <footer className={`cpf${className ? ` ${className}` : ''}`}>
    <div className="cpf-in">
      <div className="cpf-top">
        <div className="cpf-brand">
          <Link to="/careerpilot" className="cpf-logo" aria-label="CareerPilot home">
            <img src="/assets/careerpilot/careerpilot-logo-white.png" alt="CareerPilot by CodeBegun" />
          </Link>
          <p>CareerPilot by CodeBegun — helping students assess, plan, practice and become career-ready.</p>
          <div className="cpf-social">
            {SOCIAL.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} title={s.label}>
                <i className={`bi ${s.icon}`} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((c) => (
          <nav key={c.title} className="cpf-col" aria-label={c.title}>
            <h4>{c.title}</h4>
            {c.links.map((l) => <FooterLink key={l.label} to={l.to}>{l.label}</FooterLink>)}
          </nav>
        ))}

        <div className="cpf-col">
          <h4>Contact</h4>
          <span>Madhapur, Hyderabad</span>
          <a href="mailto:contact@codebegun.com">contact@codebegun.com</a>
          <a href="tel:+916301099587">+91 63010 99587</a>
          <a href={`${SITE}/privacy-policy`} target="_blank" rel="noreferrer">Privacy Policy</a>
        </div>
      </div>

      <div className="cpf-bottom">
        {/* The year is computed, never written (see config/brand.ts). */}
        <span>© {new Date().getFullYear()} CodeBegun by {LEGAL_ENTITY}. All rights reserved.</span>
        <span className="cpf-motto">Making Every Student Career-Ready.</span>
      </div>
    </div>
  </footer>
);

export default CareerPilotFooter;
