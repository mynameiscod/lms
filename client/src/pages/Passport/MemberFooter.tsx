import React from 'react';
import './memberFooter.css';

/**
 * The footer for CareerPilot member screens.
 *
 * It replaces the "Trusted by students from VIT / SRM / GITAM / Andhra University"
 * strip, which named four institutions the product has no stated relationship with —
 * the same claim that was removed from the signup page on 2026-07-30.
 *
 * What is here instead is only what can be stood behind: who runs the product, how to
 * reach a human, and the legal links. Nothing that needs a relationship to be true.
 */

const SITE = 'https://www.codebegun.com';

const LINKS: { label: string; href: string }[] = [
  { label: 'Privacy Policy', href: `${SITE}/privacy-policy` },
  { label: 'Terms', href: `${SITE}/terms` },
  { label: 'Refund Policy', href: `${SITE}/refund-policy` },
  { label: 'Contact', href: `${SITE}/contact` },
];

const MemberFooter: React.FC = () => (
  <footer className="mf">
    <div className="mf-in">
      <div className="mf-brand">
        <span className="mk" aria-hidden="true"><i className="bi bi-compass" /></span>
        <div>
          <b>CareerPilot</b>
          <small>by CodeBegun · Software Training &amp; Career Solutions</small>
        </div>
      </div>

      <nav className="mf-links" aria-label="Legal and support">
        {LINKS.map(l => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
        ))}
      </nav>

      <div className="mf-meta">
        <span><i className="bi bi-shield-lock-fill" /> Your data is private and never sold</span>
        <span className="mf-copy">© {new Date().getFullYear()} CodeBegun. All rights reserved.</span>
      </div>
    </div>
  </footer>
);

export default MemberFooter;
