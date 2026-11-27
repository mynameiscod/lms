import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { userCan } from '../../utils/permissions';
import { placementDeskApi, Officer } from '../../api/placementDeskApi';
import Dashboard from './Dashboard';
import DrivesTab from './DrivesTab';
import CompaniesTab from './CompaniesTab';
import OfficersTab from './OfficersTab';
import PublishTab from './PublishTab';
import './PlacementDesk.css';

/**
 * Placement Desk — the placement team's daily register: which company came, for what role and
 * package, who brought it, who attended and what happened. Outcomes stay admin-only.
 */
type Tab = 'dashboard' | 'drives' | 'companies' | 'officers' | 'publish';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'fa-chart-column' },
  { key: 'drives', label: 'Drives', icon: 'fa-calendar-check' },
  { key: 'companies', label: 'Companies', icon: 'fa-building' },
  { key: 'officers', label: 'Placement Officers', icon: 'fa-user-tie' },
  { key: 'publish', label: 'Publish', icon: 'fa-share-nodes' },
];

const PlacementDesk: React.FC = () => {
  const { user } = useAuth();
  const canManage = userCan(user as any, ['manage_placement_desk'], ['TENANT_ADMIN']);
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find(t => t.key === params.get('tab'))?.key || 'dashboard') as Tab;
  const [officers, setOfficers] = useState<Officer[]>([]);
  const loadOfficers = () => placementDeskApi.officers().then(setOfficers).catch(() => setOfficers([]));
  useEffect(() => { loadOfficers(); }, []);

  return (
    <div className="pd-page">
      <div className="pd-head">
        <div>
          <h1><i className="fa-solid fa-briefcase" /> Placement Desk</h1>
          <p>Every company we bring, who attended and what happened. Outcomes and feedback are visible to the placement team only.</p>
        </div>
      </div>
      <div className="pd-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`pd-tab ${tab === t.key ? 'on' : ''}`} onClick={() => setParams({ tab: t.key })}>
            <i className={`fa-solid ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'drives' && <DrivesTab officers={officers} canManage={canManage} />}
      {tab === 'companies' && <CompaniesTab canManage={canManage} />}
      {tab === 'officers' && <OfficersTab officers={officers} canManage={canManage} onChanged={loadOfficers} />}
      {tab === 'publish' && <PublishTab canManage={canManage} />}
    </div>
  );
};

export default PlacementDesk;
