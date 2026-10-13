import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../Employees/employees.css';
import './expensesSetup.css';
import { companyApi, empErr, SalaryPreview } from '../../api/employeesApi';

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const thisMonth = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 7);
const monthLabel = (m: string) => (/^\d{4}-\d{2}$/.test(m) ? new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : m);
const STATUS_TEXT: Record<string, string> = { approved: 'approved', paid: 'paid', pending: 'pending', rejected: 'rejected', cancelled: 'cancelled' };
const STATUS_COLOR: Record<string, string> = { approved: 'blue', paid: 'green', pending: 'amber' };

const SalariesTab: React.FC<{ canManage: boolean; canSalary: boolean }> = ({ canManage, canSalary }) => {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState<SalaryPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const allowed = canManage && canSalary;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await companyApi.salaryPreview(month);
      setData(d); setErr('');
      setSelected(new Set(d.rows.filter((r) => !r.alreadyAdded).map((r) => r.employeeId)));
      setEdited({});
    } catch (e) { setErr(empErr(e, 'Could not load salaries')); setData(null); }
    finally { setLoading(false); }
  }, [month]);
  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const amountOf = useCallback((id: string, original: number) => {
    const v = edited[id];
    if (v === undefined) return original;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [edited]);

  const totals = useMemo(() => {
    if (!data) return { count: 0, total: 0 };
    const sel = data.rows.filter((r) => !r.alreadyAdded && selected.has(r.employeeId));
    return { count: sel.length, total: sel.reduce((s, r) => s + amountOf(r.employeeId, r.amount), 0) };
  }, [data, selected, amountOf]);

  if (!allowed) return <div className="emp-card"><div className="emp-msg info">Adding salaries needs the manage-expenses and see-pay permissions.</div></div>;

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const open = data ? data.rows.filter((r) => !r.alreadyAdded) : [];
  const allOn = open.length > 0 && open.every((r) => selected.has(r.employeeId));

  const submit = async () => {
    if (!data || totals.count === 0) return;
    const ids = open.filter((r) => selected.has(r.employeeId)).map((r) => r.employeeId);
    const amounts: Record<string, number> = {};
    open.forEach((r) => {
      if (!selected.has(r.employeeId) || edited[r.employeeId] === undefined) return;
      const n = Number(edited[r.employeeId]);
      if (Number.isFinite(n) && n !== r.amount) amounts[r.employeeId] = n;
    });
    if (ids.some((id) => amountOf(id, 0) < 0)) { setErr('Amounts cannot be negative.'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await companyApi.generateSalaries({ month, employeeIds: ids, amounts: Object.keys(amounts).length ? amounts : undefined });
      setMsg(`Added ${r.added} salary line${r.added === 1 ? '' : 's'}. Find them in the Ledger tab.`);
      await load();
    } catch (e) { setErr(empErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="emp-card">
      <div className="exp-toolbar">
        <div className="emp-field exp-picker">
          <label htmlFor="sal-month">Month</label>
          <input id="sal-month" type="month" className="emp-input" value={month} onChange={(e) => { if (e.target.value) { setMonth(e.target.value); setMsg(''); } }} />
        </div>
      </div>
      <h2>Salaries for {monthLabel(month)}</h2>
      <p className="emp-hint">Each person's monthly pay is taken from the pay on their employee profile (annual pay ÷ 12). Change an amount here for deductions or part-month pay before adding.</p>
      {msg && <div className="emp-msg ok" role="status">{msg}</div>}
      {err && <div className="emp-msg err" role="alert">{err}</div>}
      {loading ? <div className="emp-empty">Loading…</div> : data && data.rows.length === 0 ? (
        <div className="emp-empty">No employee with a pay on their profile. Add pay in an employee's Pay &amp; hikes tab.</div>
      ) : data && (
        <>
          <div className="emp-table-wrap">
            <table className="emp-table">
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Select all" disabled={open.length === 0} checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(open.map((r) => r.employeeId)))} /></th>
                  <th>Employee</th><th>Department</th><th>Designation</th><th className="num">Monthly amount ₹</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.employeeId} className={r.alreadyAdded ? 'exp-row-off' : ''}>
                    <td><input type="checkbox" aria-label={`Select ${r.name}`} disabled={r.alreadyAdded} checked={!r.alreadyAdded && selected.has(r.employeeId)} onChange={() => toggle(r.employeeId)} /></td>
                    <td><b>{r.name}</b><div className="emp-muted" style={{ fontSize: 12 }}>{r.code}</div></td>
                    <td>{r.department || '—'}</td>
                    <td>{r.designation || '—'}</td>
                    <td className="num">
                      {r.alreadyAdded ? inr(r.amount) : (
                        <input aria-label={`Amount for ${r.name}`} className="emp-input exp-amt" type="number" min={0}
                          value={edited[r.employeeId] ?? String(r.amount)} onChange={(e) => setEdited((prev) => ({ ...prev, [r.employeeId]: e.target.value }))} />
                      )}
                    </td>
                    <td>
                      {r.alreadyAdded
                        ? <span className={`emp-badge ${STATUS_COLOR[r.existingStatus || ''] || 'grey'}`}>Added — {STATUS_TEXT[r.existingStatus || ''] || 'in ledger'}</span>
                        : <span className="emp-muted">Not added yet</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="exp-foot">
            <div><b>{totals.count}</b> selected · total <b>{inr(totals.total)}</b></div>
            <button type="button" className="emp-btn" disabled={busy || totals.count === 0} onClick={submit}>{busy ? 'Adding…' : 'Add selected to the ledger'}</button>
          </div>
        </>
      )}
    </div>
  );
};

export default SalariesTab;
