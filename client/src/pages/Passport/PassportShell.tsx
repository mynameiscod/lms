import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './member.css';

/**
 * The chrome every paid Passport surface sits inside — CareerPilot brand bar plus the
 * member nav (Mission Control / Roadmap / Practice / Mock Interview / Resume).
 *
 * This is what keeps the product separate from the LMS: a Passport member never sees
 * the LMS Layout or its sidebar, and every mission link lands on a /passport route.
 */

export const MEMBER_NAV: { path: string; label: string; icon: string }[] = [
  { path: '/passport',           label: 'Mission Control', icon: '🚀' },
  { path: '/passport/roadmap',   label: '90-Day Roadmap',  icon: '🗺️' },
  { path: '/passport/practice',  label: 'Practice Lab',    icon: '💻' },
  { path: '/passport/interview', label: 'Mock Interview',  icon: '🎙️' },
  { path: '/passport/resume',    label: 'Resume Center',   icon: '📄' },
];

interface Props {
  children: React.ReactNode;
  /** Right-hand extras in the top bar (e.g. streak/XP pills). */
  meta?: React.ReactNode;
  /** Hide the nav row (used on focused screens like a live interview). */
  hideNav?: boolean;
}

const PassportShell: React.FC<Props> = ({ children, meta, hideNav }) => {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const firstName = user?.firstName || 'there';
  const initial = (firstName[0] || 'C').toUpperCase();

  return (
    <div className="pm-shell">
      <div className="pm-topbar">
        <button className="pm-brand" onClick={() => nav('/passport')}>
          <span className="mark">🧭</span>
          <div className="bt"><b>Career<span className="p">Pilot</span></b><small>Powered by CodeBegun</small></div>
        </button>
        <div className="pm-top-right">
          {meta}
          <div className="pm-user">
            <button className="pm-user-btn" onClick={() => setMenuOpen(o => !o)}>
              <span className="av">{initial}</span>
              <span className="who"><small>Welcome back,</small><b>{firstName}</b></span>
              <span className="cr">▼</span>
            </button>
            {menuOpen && (
              <div className="pm-menu" onMouseLeave={() => setMenuOpen(false)}>
                <button onClick={() => nav('/passport/assessment')}>My assessment result</button>
                <button onClick={() => nav('/passport/roadmap')}>My 90-day roadmap</button>
                <button onClick={() => logout()}>Log out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!hideNav && (
        <nav className="pm-nav">
          {MEMBER_NAV.map(n => {
            const active = n.path === '/passport'
              ? loc.pathname === '/passport'
              : loc.pathname.startsWith(n.path);
            return (
              <button key={n.path} className={`pm-nav-item${active ? ' on' : ''}`} onClick={() => nav(n.path)}>
                <span>{n.icon}</span>{n.label}
              </button>
            );
          })}
        </nav>
      )}

      <div className="pm-body">{children}</div>
    </div>
  );
};

/** Shown wherever a paid surface is reached without an active membership. */
export const LockedPanel: React.FC<{ title: string; blurb: string; priceInr?: number; busy?: boolean; onUnlock?: () => void }> =
  ({ title, blurb, priceInr, busy, onUnlock }) => (
    <div className="pm-locked">
      <div className="ic">🔒</div>
      <h2>{title}</h2>
      <p>{blurb}</p>
      <button className="pm-btn primary" onClick={onUnlock} disabled={busy}>
        {busy ? 'Opening payment…' : priceInr ? `Unlock My 90-Day Career Passport — ₹${priceInr}` : 'Unlock my Career Passport'}
      </button>
    </div>
  );

export default PassportShell;
