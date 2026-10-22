import React from 'react';
import { NavLink } from 'react-router-dom';
import TicketDetails from './TicketDetails';
import SupportQueue from './SupportQueue';
import AdminFaqs from './AdminFaqs';
import { useSupportMe } from './useSupportMe';
import { Loading } from './supportUi';
import './support.css';

/** The admin app's Help & Support pages (/admin/support/*). */
export const ADMIN_SUPPORT_BASE = '/admin/support';

const DeskTabs: React.FC<{ manage: boolean }> = ({ manage }) => (
  <nav className="sp-tabs" aria-label="Help & Support sections">
    <NavLink end to={ADMIN_SUPPORT_BASE} className={({ isActive }) => `sp-tab${isActive ? ' on' : ''}`}>Tickets</NavLink>
    {manage && <NavLink to={`${ADMIN_SUPPORT_BASE}/faqs`} className={({ isActive }) => `sp-tab${isActive ? ' on' : ''}`}>Help articles</NavLink>}
  </nav>
);

const DeskFrame: React.FC<{ title: string; sub?: string; manage: boolean; children: React.ReactNode }> = ({ title, sub, manage, children }) => (
  <div className="sp" style={{ maxWidth: 1280 }}>
    <h1>{title}</h1>
    {sub && <p className="sp-sub">{sub}</p>}
    <DeskTabs manage={manage} />
    {children}
  </div>
);

export const AdminSupportTicketPage: React.FC = () => {
  const me = useSupportMe();
  return <TicketDetails basePath={ADMIN_SUPPORT_BASE} me={me} staffView />;
};

export const AdminSupportDesk: React.FC = () => {
  const me = useSupportMe();
  return (
    <DeskFrame title="Help & Support" manage={!!me?.can.manage}
      sub={me?.allTenants ? 'Tickets from every college.' : me?.kind === 'coordinator' ? "Your college's tickets (read only)." : 'Tickets from your institute.'}>
      <SupportQueue me={me} basePath={ADMIN_SUPPORT_BASE} />
    </DeskFrame>
  );
};

export const AdminSupportFaqs: React.FC = () => {
  const me = useSupportMe();
  if (!me) return <div className="sp"><Loading /></div>;
  if (!me.can.manage) return <div className="sp"><p className="sp-err" role="alert">Managing help articles needs the Support manager permission.</p></div>;
  return (
    <DeskFrame title="Help articles" sub="What members see in the Help Center, and what the assistant answers from." manage>
      <AdminFaqs me={me} />
    </DeskFrame>
  );
};
