import React from 'react';
import { Link } from 'react-router-dom';
import { LEGAL_ENTITY } from '../../config/brand';
import './careerPilotFooter.css';

/**
 * The one CareerPilot footer, in two versions that share one design:
 *
 *  - `member` (default), for pages only a signed-in member reaches (career setup, the skill
 *    assessment): links into CareerPilot itself — Career Readiness, Skill Gap, Practice…
 *  - `visitor`, for pages people see BEFORE signing in (landing / login / signup, the public
 *    assessment pages): Product, Company and Account. A member link there would only bounce the
 *    visitor back to the login page with no explanation, so they never see one.
 *
 * On the landing page itself the visitor links act in place (`actions`): the Product links scroll
 * to their section and Login / Create an Account switch the form. Anywhere else they open the
 * landing page at that spot (/careerpilot/join#how-it-works, which the page scrolls to on load).
 */

const SITE = 'https://www.codebegun.com';
const JOIN = '/careerpilot/join';

type Item =
  | { label: string; to: string }                      // a route, or an external URL
  | { label: string; section: string }                 // a section of the landing page
  | { label: string; account: 'login' | 'create' };    // the landing page's two forms

const MEMBER_COLUMNS: { title: string; links: Item[] }[] = [
  {
    title: 'CareerPilot',
    links: [
      { label: 'Career Readiness', to: '/careerpilot/readiness' },
      { label: 'Start Early', to: '/careerpilot/plan' },
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

const VISITOR_COLUMNS: { title: string; links: Item[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'How It Works', section: 'how-it-works' },
      { label: 'Career Tools', section: 'career-tools' },
      { label: 'Job Board', section: 'opportunities' },
      { label: 'FAQs', section: 'faqs' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About CodeBegun', to: SITE },
      { label: 'Programs', to: SITE },
      { label: 'For Colleges', to: SITE },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'CareerPilot Login', account: 'login' },
      { label: 'Create an Account', account: 'create' },
    ],
  },
];

const SOCIAL = [
  { label: 'Instagram', icon: 'bi-instagram', href: 'https://www.instagram.com/codebegun' },
  // The company slug is `codbegun` (no 'e'); codebegun does not exist on LinkedIn.
  { label: 'LinkedIn', icon: 'bi-linkedin', href: 'https://www.linkedin.com/company/codbegun' },
  { label: 'YouTube', icon: 'bi-youtube', href: 'https://www.youtube.com/@CodeBegun' },
];

export interface FooterActions {
  /** Scroll to a section of this page (the landing page). */
  onSection?: (id: string) => void;
  onLogin?: () => void;
  onCreateAccount?: () => void;
}

const external = (to: string) => /^https?:/.test(to);

const FooterLink: React.FC<{ item: Item; actions?: FooterActions }> = ({ item, actions }) => {
  if ('to' in item) {
    return external(item.to)
      ? <a href={item.to} target="_blank" rel="noreferrer">{item.label}</a>
      : <Link to={item.to}>{item.label}</Link>;
  }
  if ('section' in item) {
    const { onSection } = actions || {};
    return onSection
      ? <a href={`#${item.section}`} onClick={(e) => { e.preventDefault(); onSection(item.section); }}>{item.label}</a>
      : <Link to={`${JOIN}#${item.section}`}>{item.label}</Link>;
  }
  const act = item.account === 'login' ? actions?.onLogin : actions?.onCreateAccount;
  const href = item.account === 'login' ? '/careerpilot/login' : `${JOIN}#careerpilot-signup`;
  return act
    ? <a href={href} onClick={(e) => { e.preventDefault(); act(); }}>{item.label}</a>
    : <Link to={href}>{item.label}</Link>;
};

/**
 * `wrapClassName` / `wrapStyle`: the page's own content container. The footer's columns then start and
 * end exactly where the page's header and sections do, at every screen width, instead of in a fixed
 * 1440px box of their own that sat narrower than wide pages.
 */
const CareerPilotFooter: React.FC<{ variant?: 'member' | 'visitor'; actions?: FooterActions; className?: string; wrapClassName?: string; wrapStyle?: React.CSSProperties }> = ({ variant = 'member', actions, className, wrapClassName, wrapStyle }) => {
  const visitor = variant === 'visitor';
  const columns = visitor ? VISITOR_COLUMNS : MEMBER_COLUMNS;
  return (
    <footer className={`cpf${visitor ? ' cpf-visitor' : ''}${className ? ` ${className}` : ''}`}>
      <div className={`cpf-in${wrapClassName || wrapStyle ? ` cpf-page ${wrapClassName || ''}` : ''}`} style={wrapStyle}>
        <div className="cpf-top">
          <div className="cpf-brand">
            <Link to={visitor ? JOIN : '/careerpilot'} className="cpf-logo" aria-label="CareerPilot home">
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

          {columns.map((c) => (
            <nav key={c.title} className="cpf-col" aria-label={c.title}>
              <h4>{c.title}</h4>
              {c.links.map((l) => <FooterLink key={l.label} item={l} actions={actions} />)}
            </nav>
          ))}

          {!visitor && (
            <div className="cpf-col">
              <h4>Contact</h4>
              <span>Madhapur, Hyderabad</span>
              <a href="mailto:contact@codebegun.com">contact@codebegun.com</a>
              <a href="tel:+916301099587">+91 63010 99587</a>
              <a href={`${SITE}/privacy-policy`} target="_blank" rel="noreferrer">Privacy Policy</a>
            </div>
          )}
        </div>

        <div className="cpf-bottom">
          {/* The year is computed, never written (see config/brand.ts). */}
          <span>© {new Date().getFullYear()} CodeBegun by {LEGAL_ENTITY}. All rights reserved.</span>
          {visitor
            ? <span className="cpf-bottom-links">
                <a href="mailto:contact@codebegun.com">contact@codebegun.com</a>
                <a href={`${SITE}/privacy-policy`} target="_blank" rel="noreferrer">Privacy Policy</a>
              </span>
            : <span className="cpf-motto">Making Every Student Career-Ready.</span>}
        </div>
      </div>
    </footer>
  );
};

export default CareerPilotFooter;
