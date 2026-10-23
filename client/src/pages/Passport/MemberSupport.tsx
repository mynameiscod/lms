import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import SupportChat from '../Support/SupportChat';
import PassportShell from './PassportShell';
import TicketForm from '../Support/TicketForm';
import MyTickets from '../Support/MyTickets';
import TicketDetails from '../Support/TicketDetails';
import HelpCenter, { FaqBrowse } from '../Support/HelpCenter';
import FaqDetails from '../Support/FaqDetails';
import { useSupportMe } from '../Support/useSupportMe';
import '../Support/support.css';

/**
 * Help & Support inside the CareerPilot member app (/careerpilot/support/*). The pages themselves
 * live in pages/Support and are shared with the admin desk; these wrappers give them the
 * member chrome and the member base path.
 */
export const SUPPORT_BASE = '/careerpilot/support';

export const SupportHome: React.FC = () => <PassportShell><HelpCenter basePath={SUPPORT_BASE} /></PassportShell>;

export const SupportArticle: React.FC = () => <PassportShell><FaqDetails basePath={SUPPORT_BASE} /></PassportShell>;

export const SupportBrowse: React.FC = () => {
  const [p] = useSearchParams();
  return <PassportShell><FaqBrowse basePath={SUPPORT_BASE} category={p.get('category') || ''} /></PassportShell>;
};

export const SupportAssistant: React.FC = () => <PassportShell><SupportChat basePath={SUPPORT_BASE} /></PassportShell>;

export const SupportNew: React.FC = () => {
  // A draft handed over from the assistant ("Edit") arrives in router state.
  const draft = (useLocation().state as any)?.draft;
  return (
    <PassportShell>
      <div className="sp">
        <BackTo to={SUPPORT_BASE} label="Help & Support" />
        <h1>Report a problem</h1>
        <p className="sp-sub">Tell us what went wrong. You will review it before it is sent.</p>
        <TicketForm basePath={SUPPORT_BASE} draft={draft} />
      </div>
    </PassportShell>
  );
};

export const SupportTickets: React.FC = () => {
  const nav = useNavigate();
  return (
    <PassportShell>
      <div className="sp">
        <BackTo to={SUPPORT_BASE} label="Help & Support" />
        <div className="sp-head">
          <div><h1>My tickets</h1><p className="sp-sub">Everything you have reported, and where it stands.</p></div>
          <button type="button" className="sp-btn sp-btn-primary" onClick={() => nav(`${SUPPORT_BASE}/new`)}><i className="bi bi-plus-lg" aria-hidden /> Report a problem</button>
        </div>
        <div className="sp-card"><MyTickets basePath={SUPPORT_BASE} /></div>
      </div>
    </PassportShell>
  );
};

export const SupportTicket: React.FC = () => {
  const me = useSupportMe();
  return <PassportShell><TicketDetails basePath={SUPPORT_BASE} me={me} /></PassportShell>;
};

const BackTo: React.FC<{ to: string; label: string }> = ({ to, label }) => {
  const nav = useNavigate();
  return <button type="button" className="sp-back" onClick={() => nav(to)}><i className="bi bi-arrow-left" aria-hidden /> {label}</button>;
};
