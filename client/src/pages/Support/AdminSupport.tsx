import React from 'react';
import TicketDetails from './TicketDetails';
import SupportQueue from './SupportQueue';
import { useSupportMe } from './useSupportMe';
import './support.css';

/** The admin app's Help & Support pages (/admin/support/*). */
export const ADMIN_SUPPORT_BASE = '/admin/support';

export const AdminSupportTicketPage: React.FC = () => {
  const me = useSupportMe();
  return <TicketDetails basePath={ADMIN_SUPPORT_BASE} me={me} staffView />;
};

export const AdminSupportDesk: React.FC = () => {
  const me = useSupportMe();
  return (
    <div className="sp" style={{ maxWidth: 1280 }}>
      <h1>Help &amp; Support</h1>
      <p className="sp-sub">
        {me?.allTenants ? 'Tickets from every college.' : me?.kind === 'coordinator' ? "Your college's tickets (read only)." : 'Tickets from your institute.'}
      </p>
      <SupportQueue me={me} basePath={ADMIN_SUPPORT_BASE} />
    </div>
  );
};
