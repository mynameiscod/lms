import React from 'react';
import './member.css';

/**
 * Adapter kept so the member pages (Roadmap / Practice / Interview / Resume) didn't
 * each need rewriting: it now renders MemberShell, which owns the sidebar rail.
 *
 * Before this, the dashboard had a sidebar while these pages had their own topbar —
 * so clicking any nav item made the rail disappear. Everything renders one chrome now.
 *
 * `meta` (streak/XP/score pills) becomes a right-aligned strip above the page content.
 * `hideNav` is accepted but ignored: navigation lives in the rail, and hiding it on a
 * focused screen like a live interview would strand the member with no way out.
 */

/** Kept for MissionControl, which shows this nav to members who haven't scored yet. */
export const MEMBER_NAV: { path: string; label: string; icon: string }[] = [
  { path: '/careerpilot',           label: 'Mission Control', icon: '🚀' },
  { path: '/careerpilot/roadmap',   label: '90-Day Roadmap',  icon: '🗺️' },
  { path: '/careerpilot/practice',  label: 'Practice Lab',    icon: '💻' },
  { path: '/careerpilot/interview', label: 'Mock Interview',  icon: '🎙️' },
  { path: '/careerpilot/resume',    label: 'Resume Center',   icon: '📄' },
  { path: '/careerpilot/companies', label: 'Opportunities',   icon: '💼' },
  { path: '/careerpilot/news',      label: 'Tech News',       icon: '📰' },
  { path: '/careerpilot/coins',     label: 'My Coins',        icon: '🪙' },
  { path: '/careerpilot/profile',   label: 'My Profile',      icon: '👤' },
];

interface Props {
  children: React.ReactNode;
  meta?: React.ReactNode;
  hideNav?: boolean;
}

const PassportShell: React.FC<Props> = ({ children, meta }) => (
  <>
    {meta && <div className="pm-metabar">{meta}</div>}
    {children}
  </>
);

/** Shown wherever a paid surface is reached without an active membership. */
export const LockedPanel: React.FC<{ title: string; blurb: string; priceInr?: number; busy?: boolean; onUnlock?: () => void }> =
  ({ title, blurb, priceInr, busy, onUnlock }) => (
    <div className="pm-locked">
      <div className="ic">🔒</div>
      <h2>{title}</h2>
      <p>{blurb}</p>
      <button className="pm-btn primary" onClick={onUnlock} disabled={busy}>
        {busy ? 'Opening payment…' : priceInr ? `Unlock My 90-Day CareerPilot — ₹${priceInr}` : 'Unlock my CareerPilot'}
      </button>
    </div>
  );

export default PassportShell;
