import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../Employees/employees.css';
import './expenses.css';
import { useAuth } from '../../hooks';
import { userCan } from '../../utils/permissions';
import { companyApi, employeesApi, empErr, EmployeeConfig, LedgerRow } from '../../api/employeesApi';
import ExpenseAdmin from '../Employees/ExpenseAdmin';
import OverviewTab from './OverviewTab';
import LedgerTab from './LedgerTab';
import RecurringTab from './RecurringTab';
import SalariesTab from './SalariesTab';
import BillModal from './BillModal';

type TabId = 'overview' | 'ledger' | 'approvals' | 'recurring' | 'salaries' | 'claims';
const TAB_IDS: TabId[] = ['overview', 'ledger', 'approvals', 'recurring', 'salaries', 'claims'];
const thisMonth = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 7);
const isTab = (s: string | null): s is TabId => !!s && (TAB_IDS as string[]).includes(s);
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

const ClaimsView = ExpenseAdmin as React.ComponentType<{ embedded?: boolean }>;

const CompanyExpenses: React.FC = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [month, setMonth] = useState(thisMonth());
  const [config, setConfig] = useState<EmployeeConfig | null>(null);
  const [pending, setPending] = useState(0);
  const [claimsOnly, setClaimsOnly] = useState(false);
  const [checked, setChecked] = useState(false);
  const [err, setErr] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [modal, setModal] = useState<{ row?: LedgerRow } | null>(null);

  const canManage = userCan(user, ['manage_expenses']);
  const canApprove = userCan(user, ['approve_expenses']);
  const canSalary = userCan(user, ['view_employee_sensitive']);
  const showSalaries = canManage && canSalary;

  const urlTab = params.get('tab');
  const [tab, setTabState] = useState<TabId>(isTab(urlTab) ? urlTab : 'overview');
  const setTab = (t: string) => {
    if (!isTab(t)) return;
    setTabState(t);
    setParams({ tab: t }, { replace: true });
  };
  useEffect(() => { if (isTab(urlTab)) setTabState(urlTab); }, [urlTab]);

  useEffect(() => {
    let alive = true;
    employeesApi.config().then(c => { if (alive) setConfig(c); }).catch(e => { if (alive) setErr(empErr(e, 'Could not load settings')); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    companyApi.summary(month)
      .then(s => { if (alive) { setPending(s.pendingApprovals); setClaimsOnly(false); setChecked(true); } })
      .catch(e => {
        if (!alive) return;
        if (e?.response?.status === 403) { setClaimsOnly(true); } else { setErr(empErr(e, 'Could not load expenses')); }
        setChecked(true);
      });
    return () => { alive = false; };
  }, [month, refreshKey]);

  const tabs = useMemo(() => {
    if (claimsOnly) return [{ id: 'claims' as TabId, label: 'Employee claims' }];
    const t: { id: TabId; label: string }[] = [
      { id: 'overview', label: 'Overview' }, { id: 'ledger', label: 'Ledger' },
      { id: 'approvals', label: pending > 0 ? `Approvals (${pending})` : 'Approvals' },
      { id: 'recurring', label: 'Recurring' },
    ];
    if (showSalaries) t.push({ id: 'salaries', label: 'Salaries' });
    t.push({ id: 'claims', label: 'Employee claims' });
    return t;
  }, [claimsOnly, pending, showSalaries]);

  const active: TabId = claimsOnly ? 'claims' : tabs.some(t => t.id === tab) ? tab : 'overview';
  const refresh = () => setRefreshKey(k => k + 1);
  const needsMonth = active === 'overview' || active === 'ledger' || active === 'recurring' || active === 'salaries';

  if (!checked) return <div className="emp-page"><div className="emp-empty">Loading…</div></div>;

  return (
    <div className="emp-page">
      <div className="emp-head">
        <div>
          <h1>Expenses</h1>
          <p className="emp-muted">Everything the company spends</p>
        </div>
        <div className="emp-row" style={{ gap: 8, alignItems: 'flex-end' }}>
          {!claimsOnly && needsMonth && (
            <div className="emp-field">
              <label htmlFor="ce-month">Month</label>
              <input id="ce-month" type="month" className="emp-input" value={month} max={thisMonth()} onChange={e => e.target.value && setMonth(e.target.value)} aria-label={`Month, ${monthLabel(month)}`} />
            </div>
          )}
          {canManage && !claimsOnly && config && <button className="emp-btn good" onClick={() => setModal({})}>＋ Add expense</button>}
        </div>
      </div>

      {err && <div className="emp-msg err">{err}</div>}

      <div className="emp-tabs" role="tablist">
        {tabs.map(t => (
          <button key={t.id} role="tab" aria-selected={active === t.id} className={`emp-tab${active === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {active === 'claims' && <ClaimsView embedded />}
      {!claimsOnly && !config && active !== 'overview' && active !== 'claims' && !err && <div className="emp-empty">Loading…</div>}
      {!claimsOnly && active === 'overview' && <OverviewTab month={month} refreshKey={refreshKey} onGoto={setTab} />}
      {!claimsOnly && config && active === 'ledger' && (
        <LedgerTab month={month} refreshKey={refreshKey} config={config} canManage={canManage} canApprove={canApprove} onChanged={refresh} onEdit={row => setModal({ row })} />
      )}
      {!claimsOnly && config && active === 'approvals' && (
        <LedgerTab key="approvals" month={month} refreshKey={refreshKey} config={config} preset="approvals" canManage={canManage} canApprove={canApprove} onChanged={refresh} onEdit={row => setModal({ row })} />
      )}
      {!claimsOnly && config && active === 'recurring' && <RecurringTab config={config} canManage={canManage} />}
      {!claimsOnly && showSalaries && active === 'salaries' && <SalariesTab canManage={canManage} canSalary={canSalary} />}

      {modal && config && (
        <BillModal config={config} canApprove={canApprove} row={modal.row} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
    </div>
  );
};

export default CompanyExpenses;
