import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { userCan } from '../../utils/permissions';
import { talentPoolApi, Partner, Meta } from '../../api/talentPoolApi';
import OfficesTab from './OfficesTab';
import ShareTab from './ShareTab';
import TrackerTab from './TrackerTab';
import ExternalTab from './ExternalTab';
import './TalentPool.css';

/**
 * Talent Pool — share candidates with placement offices instead of emailing Excel sheets.
 * Each office logs in and sees only its own list; this screen shows every office.
 */
type Tab = 'offices' | 'share' | 'tracker' | 'external';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'offices', label: 'Offices', icon: 'fa-building-user' },
  { key: 'share', label: 'Share candidates', icon: 'fa-share-nodes' },
  { key: 'tracker', label: 'Status tracker', icon: 'fa-list-check' },
  { key: 'external', label: 'Outside candidates', icon: 'fa-user-plus' },
];

const TalentPool: React.FC = () => {
  const { user } = useAuth();
  const canManage = userCan(user as any, ['manage_talent_pool'], ['TENANT_ADMIN']);
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find(t => t.key === params.get('tab'))?.key || 'offices') as Tab;
  const [meta, setMeta] = useState<Meta | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [err, setErr] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const loadPartners = () => talentPoolApi.partners().then(setPartners).catch(e => setErr(e.message));
  const changed = () => { loadPartners(); setRefreshKey(k => k + 1); };
  useEffect(() => {
    talentPoolApi.meta().then(setMeta).catch(e => setErr(e.message));
    loadPartners();
  }, []);

  return (
    <div className="tp-page">
      <div className="tp-head">
        <div>
          <h1><i className="fa-solid fa-people-group" /> Talent Pool</h1>
          <p>Share candidates with placement offices. Each office logs in and sees only its own list, with full profiles, resumes and its own Excel format.</p>
        </div>
      </div>
      <div className="tp-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tp-tab ${tab === t.key ? 'on' : ''}`} onClick={() => setParams({ tab: t.key })}>
            <i className={`fa-solid ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>
      {err && <div className="tp-err">{err}</div>}
      {!meta ? <div className="tp-empty">Loading…</div> : <>
        {tab === 'offices' && <OfficesTab meta={meta} partners={partners} canManage={canManage} onChanged={changed} />}
        {tab === 'share' && <ShareTab meta={meta} partners={partners} canManage={canManage} onShared={changed} />}
        {tab === 'tracker' && <TrackerTab partners={partners} canManage={canManage} refreshKey={refreshKey} onChanged={loadPartners} />}
        {tab === 'external' && <ExternalTab canManage={canManage} />}
      </>}
    </div>
  );
};

export default TalentPool;
