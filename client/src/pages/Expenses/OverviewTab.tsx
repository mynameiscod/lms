import React, { useEffect, useState } from 'react';
import '../Employees/employees.css';
import './expenses.css';
import { companyApi, empErr, CompanySummary, LedgerKind } from '../../api/employeesApi';

interface Props { month: string; refreshKey: number; onGoto: (tab: string) => void }

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const KIND_LABEL: Record<LedgerKind, string> = { bill: 'Bills', recurring: 'Recurring', salary: 'Salaries', reimbursement: 'Reimbursements' };

const Bars: React.FC<{ rows: { label: string; total: number; sub?: string }[]; max: number }> = ({ rows, max }) => (
  <div>
    {rows.map(r => (
      <div className="exp-bar-row" key={r.label}>
        <span title={r.label} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
        <div className="exp-bar-track"><div className="exp-bar-fill" style={{ width: `${max > 0 ? Math.max(1, (r.total / max) * 100) : 0}%` }} /></div>
        <span className="num">{inr(r.total)}{r.sub ? <span className="exp-sub"> {r.sub}</span> : null}</span>
      </div>
    ))}
  </div>
);

const OverviewTab: React.FC<Props> = ({ month, refreshKey, onGoto }) => {
  const [data, setData] = useState<CompanySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr('');
    companyApi.summary(month)
      .then(s => { if (alive) setData(s); })
      .catch(e => { if (alive) setErr(empErr(e, 'Could not load the summary')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [month, refreshKey]);

  if (loading && !data) return <div className="emp-empty">Loading…</div>;
  if (err) return <div className="emp-msg err">{err}</div>;
  if (!data) return null;

  const spent = data.spent || 0;
  const pending = data.byStatus.pending;
  const approved = data.byStatus.approved;
  const paid = data.byStatus.paid;
  const maxTrend = Math.max(1, ...data.trend.map(t => t.total));
  const pct = (n: number) => (spent > 0 ? `${Math.round((n / spent) * 100)}%` : '');
  const cats = data.byCategory.map(c => ({ label: c.category, total: c.total, sub: pct(c.total) }));
  const kinds = data.byKind.map(k => ({ label: KIND_LABEL[k.kind] || k.kind, total: k.total, sub: `(${k.count})` }));
  const vendors = data.topVendors.slice(0, 10).map(v => ({ label: v.vendor, total: v.total, sub: `(${v.count})` }));

  return (
    <div>
      <div className="emp-grid c4" style={{ marginBottom: 16 }}>
        <div className="emp-stat">
          <div className="emp-muted">Spent in {data.label}</div>
          <div className="exp-big">{inr(spent)}</div>
          <div className="emp-hint">Approved and paid</div>
        </div>
        <div className="emp-stat exp-stat-click" role="button" tabIndex={0} onClick={() => onGoto('approvals')} onKeyDown={e => { if (e.key === 'Enter') onGoto('approvals'); }}>
          <div className="emp-muted">Waiting for approval</div>
          <div className="exp-big">{data.pendingApprovals}</div>
          <div className="emp-hint">{pending ? inr(pending.total) : '₹0'}</div>
        </div>
        <div className="emp-stat">
          <div className="emp-muted">Approved, unpaid</div>
          <div className="exp-big">{inr(approved?.total || 0)}</div>
          <div className="emp-hint">{approved?.count || 0} to pay</div>
        </div>
        <div className="emp-stat">
          <div className="emp-muted">Paid</div>
          <div className="exp-big">{inr(paid?.total || 0)}</div>
          <div className="emp-hint">{paid?.count || 0} lines</div>
        </div>
        {data.recurringNotYetAdded > 0 && (
          <div className="emp-stat exp-stat-click" role="button" tabIndex={0} onClick={() => onGoto('recurring')} onKeyDown={e => { if (e.key === 'Enter') onGoto('recurring'); }}>
            <div className="emp-muted">Recurring not yet added</div>
            <div className="exp-big">{data.recurringNotYetAdded}</div>
            <div className="emp-hint">Open Recurring to add them</div>
          </div>
        )}
      </div>

      {data.salaryLinesHidden && (
        <div className="emp-msg info">Salaries are counted in the totals; individual salary lines are visible only to people who can see pay.</div>
      )}

      <h3 style={{ margin: '16px 0 8px' }}>Where the money went</h3>
      <div className="emp-grid c2">
        <div className="emp-card">
          <h4>By category</h4>
          {cats.length === 0 ? <div className="emp-empty">Nothing spent yet this month.</div> : <Bars rows={cats} max={Math.max(...cats.map(c => c.total))} />}
        </div>
        <div className="emp-card">
          <h4>By type</h4>
          {kinds.length === 0 ? <div className="emp-empty">Nothing spent yet this month.</div> : <Bars rows={kinds} max={Math.max(...kinds.map(c => c.total))} />}
        </div>
        <div className="emp-card">
          <h4>Top vendors</h4>
          {vendors.length === 0 ? <div className="emp-empty">No vendors recorded.</div> : <Bars rows={vendors} max={Math.max(...vendors.map(c => c.total))} />}
        </div>
        <div className="emp-card">
          <h4>Last 6 months</h4>
          <div className="exp-trend" role="img" aria-label="Monthly spend for the last six months">
            {data.trend.map(t => (
              <div className="exp-trend-col" key={t.month}>
                <div className="exp-trend-val">{inr(t.total)}</div>
                <div className={`exp-trend-bar${t.month === data.month ? ' cur' : ''}`} style={{ height: `${Math.max(1, (t.total / maxTrend) * 100)}%` }} />
                <div className="exp-trend-lab emp-muted">{t.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
