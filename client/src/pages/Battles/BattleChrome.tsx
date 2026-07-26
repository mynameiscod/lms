import React from 'react';
import './chrome.css';

/** Branded header + footer wrapper for public Tech Battle pages (mirrors codebegun.com). */
const SITE = 'https://www.codebegun.com';

const NAV = [
  ['Programs', `${SITE}/programs`], ['Interview Prep', `${SITE}/interview-prep`],
  ['For Students', `${SITE}/for-students`], ['Placements', `${SITE}/placements`],
  ['Blog', `${SITE}/blog`], ['About', `${SITE}/about`],
];
const PROGRAMS = ['Java Full Stack with AI', 'Data Analytics with AI', 'Data Science with AI', 'Artificial Intelligence', 'DevOps with AWS', 'Software Testing', 'All Programs'];
const RESOURCES = ['Free Tutorials', 'Practice Problems', 'Free Tools', 'Interview Preparation', 'Career Guides', 'Success Stories'];
const LOCATIONS = ['Hyderabad', 'Kukatpally / KPHB', 'Ameerpet', 'Gachibowli', 'Vijayawada', 'Visakhapatnam', 'Guntur', 'Warangal'];

const BattleChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bc-shell">
    <header className="bc-header">
      <div className="bc-header-in">
        <a className="bc-logo" href={SITE}><img src="/assets/logo.png" alt="CodeBegun" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /></a>
        <nav className="bc-nav">{NAV.map(([label, href]) => <a key={label} href={href}>{label}</a>)}</nav>
        <a className="bc-apply" href={`${SITE}`}>Apply Now →</a>
      </div>
    </header>

    <main className="bc-main">{children}</main>

    <footer className="bc-footer">
      <div className="bc-footer-in">
        <div className="bc-fbrand">
          <img src="/assets/logo.png" alt="CodeBegun" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <p>CodeBegun is a training and education brand owned and operated by Savas Tech Solution Pvt Ltd.</p>
          <div className="bc-social">
            <a href="https://facebook.com/codebegun" aria-label="Facebook">f</a>
            <a href="https://linkedin.com/company/codebegun" aria-label="LinkedIn">in</a>
            <a href="https://youtube.com/@codebegun" aria-label="YouTube">▶</a>
            <a href="https://instagram.com/codebegun" aria-label="Instagram">◎</a>
          </div>
        </div>
        <div className="bc-fcol"><h4>PROGRAMS</h4>{PROGRAMS.map(p => <a key={p} href={SITE}>{p}</a>)}</div>
        <div className="bc-fcol"><h4>RESOURCES</h4>{RESOURCES.map(p => <a key={p} href={SITE}>{p}</a>)}</div>
        <div className="bc-fcol"><h4>LOCATIONS</h4>{LOCATIONS.map(p => <a key={p} href={SITE}>{p}</a>)}</div>
        <div className="bc-fcol">
          <h4>CONTACT</h4>
          <a href="mailto:hr@codebegun.com">hr@codebegun.com</a>
          <a href="mailto:contact@codebegun.com">contact@codebegun.com</a>
          <a href="tel:+916301099587">+91 63010 99587</a>
          <div>Plot No.4, Flat No.102, SM Reddy Complex,<br />House No.1-98/8/9/A, Madhapur,<br />Hyderabad, Telangana 500081</div>
        </div>
      </div>
      <div className="bc-fbottom">
        <div className="bc-fbottom-in">
          <div>© 2026 CodeBegun by Savas Tech Solution Pvt Ltd · All rights reserved</div>
          <div className="links">
            <a href={`${SITE}/privacy`}>Privacy Policy</a>
            <a href={`${SITE}/terms`}>Terms</a>
            <a href={`${SITE}/grievance`}>Grievance Redressal</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
);

export default BattleChrome;
