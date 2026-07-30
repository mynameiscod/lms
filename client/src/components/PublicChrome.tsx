import React, { useState } from 'react';
import './publicChrome.css';

/** Shared header + footer for ALL public/outside pages (Passport, Tech Battles, …).
 *  Mirrors codebegun.com so every public surface is consistently branded. */
const SITE = 'https://www.codebegun.com';

const NAV: [string, string, boolean][] = [
  ['Programs', `${SITE}/programs`, true], ['Learn', `${SITE}/learn`, false],
  ['Interview Prep', `${SITE}/interview-prep`, true], ['For Students', `${SITE}/for-students`, true],
  ['For Recruiters', `${SITE}/for-recruiters`, false], ['Placements', `${SITE}/placements`, false],
  ['Blog', `${SITE}/blog`, false], ['About', `${SITE}/about`, false],
];
const PROGRAMS = ['Java Full Stack with AI', 'Data Analytics with AI', 'Data Science with AI', 'Artificial Intelligence', 'All Programs', 'Online Training', 'DevOps with AWS', 'Software Testing'];
const RESOURCES = ['Free Tutorials', 'Practice Problems', 'Free Tools', 'Interview Preparation', 'Career Guides', 'Technology Comparisons', 'JavaScript Interview Q&A', 'Java Interview Q&A', 'React Interview Q&A', 'Success Stories'];
const LOCATIONS = ['Hyderabad', 'Kukatpally / KPHB', 'Ameerpet', 'Gachibowli', 'Vijayawada', 'Visakhapatnam', 'Guntur', 'Warangal', 'Tirupati', 'Nellore', 'Rajahmundry', 'Kakinada'];
const BOTTOM = ['Privacy Policy', 'Terms', 'Cookie Policy', 'Grievance Redressal', 'Corporate Information', 'Vision & Values'];

const hideOnErr = (e: React.SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).style.display = 'none'; };

const PublicChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showAnnc, setShowAnnc] = useState(true);
  return (
    <div className="pc-shell">
      {showAnnc && (
        <div className="pc-annc">
          <b>Next Batch</b> · Starts in 7 days · Only 18 seats left
          <a className="apply" href={SITE}>Apply Now →</a>
          <button className="x" onClick={() => setShowAnnc(false)} aria-label="Dismiss">×</button>
        </div>
      )}

      <header className="pc-header">
        <div className="pc-header-in">
          <a className="pc-logo" href={SITE}><img src="/assets/logo.png" alt="CodeBegun" onError={hideOnErr} /></a>
          <nav className="pc-nav">{NAV.map(([label, href, caret]) => <a key={label} href={href}>{label}{caret && <span className="caret">▼</span>}</a>)}</nav>
          <div className="pc-right">
            <button className="pc-theme" aria-label="Theme">🌙</button>
            <a className="pc-apply" href={SITE}>Apply Now →</a>
          </div>
        </div>
      </header>

      <main className="pc-main">{children}</main>

      <footer className="pc-footer">
        <div className="pc-footer-in">
          <div className="pc-fbrand">
            <span className="logobox"><img src="/assets/logo.png" alt="CodeBegun" onError={hideOnErr} /></span>
            <div className="tag">Hyderabad’s Edutech Startup · Building engineers top companies want to hire</div>
            <div className="own">CodeBegun is a training and education brand owned and operated by Savas Tech Solution Pvt Ltd.</div>
            <div className="pc-social">
              {/* Confirmed accounts. Facebook and LinkedIn were both broken here:
                  facebook.com/codebegun does not exist, and the LinkedIn slug is
                  `codbegun` (no 'e'), which the emails already had right. */}
              <a href="https://www.facebook.com/profile.php?id=100092735476326" target="_blank" rel="noreferrer" aria-label="Facebook">f</a>
              <a href="https://www.linkedin.com/company/codbegun" target="_blank" rel="noreferrer" aria-label="LinkedIn">in</a>
              <a href="https://www.youtube.com/@CodeBegun" target="_blank" rel="noreferrer" aria-label="YouTube">▶</a>
              <a href="https://www.instagram.com/codebegun" target="_blank" rel="noreferrer" aria-label="Instagram">◎</a>
            </div>
          </div>
          <div className="pc-fcol"><h4>PROGRAMS</h4>{PROGRAMS.map(p => <a key={p} href={SITE}>{p}</a>)}</div>
          <div className="pc-fcol"><h4>RESOURCES</h4>{RESOURCES.map(p => <a key={p} href={SITE}>{p}</a>)}</div>
          <div className="pc-fcol"><h4>LOCATIONS</h4>{LOCATIONS.map(p => <a key={p} href={SITE}>{p}</a>)}</div>
          <div className="pc-fcol">
            <h4>CONTACT</h4>
            <a href="mailto:hr@codebegun.com">hr@codebegun.com</a>
            <a href="mailto:contact@codebegun.com">contact@codebegun.com</a>
            <a href="tel:+916301099587">+91 63010 99587</a>
            <div className="line">Plot No.4, Flat No.102, SM Reddy Complex,<br />House No.1-98/8/9/A, Madhapur,<br />Hyderabad, Telangana 500081</div>
          </div>
        </div>
        <div className="pc-fbottom">
          <div className="pc-fbottom-in">
            <div>© 2026 CodeBegun by Savas Tech Solution Pvt Ltd · All rights reserved</div>
            <div className="links">{BOTTOM.map(b => <a key={b} href={SITE}>{b}</a>)}</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicChrome;
