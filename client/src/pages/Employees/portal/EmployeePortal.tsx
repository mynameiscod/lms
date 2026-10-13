import React, { useCallback, useEffect, useState } from 'react';
import { portalApi, fileObjectUrl, empErr, PortalMe } from '../../../api/employeesApi';
import TodayTab from './TodayTab';
import HistoryTab from './HistoryTab';
import ExpensesTab from './ExpensesTab';
import ProfileTab from './ProfileTab';
import { fmtLongDay, initials } from './portalUtils';
import '../employees.css';
import './portal.css';

type TabKey = 'today' | 'history' | 'expenses' | 'profile';
const TABS: { k: TabKey; label: string }[] = [
  { k: 'today', label: 'Today' },
  { k: 'history', label: 'History' },
  { k: 'expenses', label: 'My claims' },
  { k: 'profile', label: 'My profile' },
];
const fromHash = (): TabKey => {
  const h = window.location.hash.replace('#', '');
  return TABS.some((t) => t.k === h) ? (h as TabKey) : 'today';
};

const EmployeePortal: React.FC = () => {
  const [me, setMe] = useState<PortalMe | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>(fromHash);
  const [photoUrl, setPhotoUrl] = useState('');

  const load = useCallback(() => {
    portalApi.me()
      .then((m) => { setMe(m); setError(''); })
      .catch((e) => setError(empErr(e, 'Could not load your portal')));
  }, []);

  useEffect(() => { load(); }, [load]);

  const photoId = me?.employee.photoFileId;
  useEffect(() => {
    if (!photoId) { setPhotoUrl(''); return undefined; }
    let url = '';
    let live = true;
    fileObjectUrl(photoId).then((u) => { if (live) { url = u; setPhotoUrl(u); } else URL.revokeObjectURL(u); }).catch(() => setPhotoUrl(''));
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [photoId]);

  const choose = (k: TabKey) => { setTab(k); window.history.replaceState(null, '', `#${k}`); };

  if (error && !me) {
    return (
      <div className="emp-page emp-portal">
        <div className="emp-msg err" role="alert">{error}</div>
        <button type="button" className="emp-btn" onClick={load}>Try again</button>
      </div>
    );
  }
  if (!me) return <div className="emp-page emp-portal"><p className="emp-empty">Loading…</p></div>;

  const e = me.employee;
  return (
    <div className="emp-page emp-portal" style={{ maxWidth: 820 }}>
      <div className="emp-portal-head">
        <span className="emp-avatar lg">{photoUrl ? <img src={photoUrl} alt={e.name} /> : initials(e.name)}</span>
        <div>
          <h1>{e.name}</h1>
          <p className="emp-sub">{[e.designation, e.department].filter(Boolean).join(' · ')}{me.managerName ? ` · Reports to ${me.managerName}` : ''}</p>
          <p className="emp-sub">{fmtLongDay(me.todayDate)}</p>
        </div>
      </div>

      {error && <div className="emp-msg err" role="alert">{error}</div>}

      <div className="emp-portal-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.k} type="button" role="tab" aria-selected={tab === t.k} className={`emp-tab${tab === t.k ? ' on' : ''}`} onClick={() => choose(t.k)}>{t.label}</button>
        ))}
      </div>

      {tab === 'today' && <TodayTab me={me} reload={load} />}
      {tab === 'history' && <HistoryTab me={me} reload={load} />}
      {tab === 'expenses' && <ExpensesTab me={me} reload={load} />}
      {tab === 'profile' && <ProfileTab me={me} reload={load} />}
    </div>
  );
};

export default EmployeePortal;
