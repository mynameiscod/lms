import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './employees.css';
import './expenseAdmin.css';
import { expensesApi, employeesApi, fileObjectUrl, empErr, QueueExpense, Expense, ExpenseSummary, ExpenseCategory, ExpenseQuery, ExpenseStatus } from '../../api/employeesApi';

type Tab = 'mine' | 'all' | 'summary';
type Pick = { _id: string; name: string; code: string };

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (s?: string) => (s ? new Date(s.length === 10 ? `${s}T00:00:00` : s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (s?: string) => (s ? `${fmtDate(s)}, ${new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}` : '—');
const thisMonth = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 7);

const FLAG_LABEL: Record<string, { label: string; color: string }> = {
  over_daily_limit: { label: 'Over daily limit', color: 'amber' },
  over_monthly_limit: { label: 'Over monthly limit', color: 'amber' },
  backdated: { label: 'Backdated', color: 'amber' },
  no_receipt: { label: 'No receipt', color: 'red' },
};
const STATUS_COLOR: Record<ExpenseStatus, string> = { submitted: 'amber', approved: 'blue', rejected: 'red', paid: 'green', cancelled: 'grey' };
const STATUS_LABEL: Record<ExpenseStatus, string> = { submitted: 'Submitted', approved: 'Approved', rejected: 'Rejected', paid: 'Paid', cancelled: 'Cancelled' };
const STAGE_LABEL: Record<string, string> = { manager: 'Waiting for manager', approver: 'Waiting for approver', done: 'Done' };
const ACTION_LABEL: Record<string, string> = {
  submitted: 'Submitted', approve: 'Approved', approved: 'Approved', reject: 'Rejected', rejected: 'Rejected', paid: 'Marked paid', unpaid: 'Payment undone',
  cancelled: 'Cancelled', edited: 'Edited', manager_approved: 'Approved by manager', approver_approved: 'Approved by approver', auto_approved: 'Auto-approved',
};
const actionLabel = (a: string) => ACTION_LABEL[a] || a.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const PAY_MODES = ['Bank transfer', 'UPI', 'Cash', 'Payroll'];

const Badge: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => <span className={`emp-badge ${color}`}>{children}</span>;
const Flags: React.FC<{ flags: string[] }> = ({ flags }) => (
  <div className="emp-ex-flags">
    {flags.map(f => <Badge key={f} color={(FLAG_LABEL[f] || { color: 'grey' }).color}>{(FLAG_LABEL[f] || { label: f }).label}</Badge>)}
  </div>
);

// ── Receipts ─────────────────────────────────────────────────────────────────

const isImage = (name: string) => /\.(jpe?g|png|webp|gif)$/i.test(name);

const Receipts: React.FC<{ receipts: Expense['receipts'] }> = ({ receipts }) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    const made: string[] = [];
    receipts.forEach(r => {
      fileObjectUrl(r.fileId)
        .then(u => {
          if (!alive) { URL.revokeObjectURL(u); return; }
          made.push(u);
          setUrls(prev => ({ ...prev, [r.fileId]: u }));
        })
        .catch(() => { if (alive) setFailed(prev => ({ ...prev, [r.fileId]: true })); });
    });
    return () => { alive = false; made.forEach(u => URL.revokeObjectURL(u)); };
  }, [receipts]);

  if (receipts.length === 0) return <div className="emp-muted">No receipts attached.</div>;
  return (
    <div className="emp-ex-thumbs">
      {receipts.map(r => {
        const u = urls[r.fileId];
        if (failed[r.fileId]) return <span key={r.fileId} className="emp-badge red">{r.name} could not load</span>;
        if (!u) return <span key={r.fileId} className="emp-muted">Loading {r.name}…</span>;
        return isImage(r.name)
          ? <a key={r.fileId} href={u} target="_blank" rel="noreferrer" title={r.name}><img className="emp-ex-thumb" src={u} alt={r.name} /></a>
          : <a key={r.fileId} href={u} target="_blank" rel="noreferrer">Open receipt (PDF) — {r.name}</a>;
      })}
    </div>
  );
};

// ── Mark paid modal ──────────────────────────────────────────────────────────

const PayModal: React.FC<{ ids: string[]; onClose: () => void; onDone: (msg: string) => void }> = ({ ids, onClose, onDone }) => {
  const [mode, setMode] = useState(PAY_MODES[0]);
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const r = await expensesApi.pay(ids, mode, ref.trim() || undefined);
      onDone(`${r.paid} expense${r.paid === 1 ? '' : 's'} marked as paid.`);
    } catch (e) { setErr(empErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="emp-modal-back" onClick={onClose}>
      <div className="emp-modal" role="dialog" aria-modal="true" aria-label="Mark as paid" onClick={e => e.stopPropagation()}>
        <h2>Mark {ids.length} expense{ids.length === 1 ? '' : 's'} as paid</h2>
        {err && <div className="emp-msg err">{err}</div>}
        <div className="emp-field">
          <label htmlFor="pay-mode">Payment mode</label>
          <select id="pay-mode" className="emp-select" value={mode} onChange={e => setMode(e.target.value)}>
            {PAY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="pay-ref">Reference (transaction id, cheque no.)</label>
          <input id="pay-ref" className="emp-input" value={ref} onChange={e => setRef(e.target.value)} />
        </div>
        <div className="emp-actions" style={{ marginTop: 14 }}>
          <button className="emp-btn good" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Mark paid'}</button>
          <button className="emp-btn ghost" disabled={busy} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── Expense modal ────────────────────────────────────────────────────────────

const ExpenseModal: React.FC<{ row: QueueExpense; onClose: () => void; onChanged: (msg: string) => void; onPay: (id: string) => void }> = ({ row, onClose, onChanged, onPay }) => {
  const [data, setData] = useState<Awaited<ReturnType<typeof expensesApi.detail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    expensesApi.detail(row._id)
      .then(d => { if (alive) setData(d); })
      .catch(e => { if (alive) setErr(empErr(e, 'Could not load this expense')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [row._id]);

  const act = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !note.trim()) { setErr('Please give a reason for rejecting.'); return; }
    setBusy(true); setErr('');
    try {
      await expensesApi.act(row._id, action, note.trim() || undefined);
      onChanged(action === 'approve' ? 'Expense approved.' : 'Expense rejected.');
    } catch (e) { setErr(empErr(e)); } finally { setBusy(false); }
  };
  const undo = async () => {
    setBusy(true); setErr('');
    try { await expensesApi.unpay(row._id); onChanged('Payment undone.'); }
    catch (e) { setErr(empErr(e)); } finally { setBusy(false); }
  };

  const ex = data?.expense;
  return (
    <div className="emp-modal-back" onClick={onClose}>
      <div className="emp-modal emp-ex-wide" role="dialog" aria-modal="true" aria-label="Expense details" onClick={e => e.stopPropagation()}>
        <div className="emp-ex-head">
          <h2>{row.employeeName}{row.employeeCode ? ` (${row.employeeCode})` : ''}</h2>
          <button className="emp-btn ghost sm" onClick={onClose}>Close</button>
        </div>
        {loading && <div className="emp-empty">Loading…</div>}
        {err && <div className="emp-msg err">{err}</div>}
        {ex && (
          <>
            <div className="emp-ex-meta">
              <div><span>Date</span><b>{fmtDate(ex.date)}</b></div>
              <div><span>Category</span><b>{ex.category}</b></div>
              <div><span>Amount</span><b>{inr(ex.amount)}</b></div>
              <div><span>Status</span><b><Badge color={STATUS_COLOR[ex.status]}>{STATUS_LABEL[ex.status]}</Badge></b></div>
              <div><span>Merchant</span><b>{ex.merchant || '—'}</b></div>
              <div><span>Work mode</span><b style={{ textTransform: 'capitalize' }}>{ex.workMode || '—'}</b></div>
              <div><span>Department</span><b>{data?.employee?.department || row.department || '—'}</b></div>
            </div>
            {ex.description && <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 8px' }}>{ex.description}</p>}
            {ex.flags.length > 0 && <Flags flags={ex.flags} />}
            {ex.rejectionReason && <div className="emp-ex-reject"><b>Rejected:</b> {ex.rejectionReason}</div>}
            {ex.status === 'paid' && (
              <div className="emp-msg info" style={{ marginTop: 8 }}>
                Paid {fmtDate(ex.paidAt)}{ex.paymentMode ? ` via ${ex.paymentMode}` : ''}{ex.paymentRef ? ` · Ref ${ex.paymentRef}` : ''}
              </div>
            )}
            <h3>Receipts</h3>
            <Receipts receipts={ex.receipts} />
            <h3>Approval trail</h3>
            {ex.trail.length === 0 ? <div className="emp-muted">No activity yet.</div> : (
              <ul className="emp-ex-timeline">
                {ex.trail.map((t, i) => (
                  <li key={i}>
                    <b>{actionLabel(t.action)}</b>{t.byName ? ` by ${t.byName}` : ''}
                    <div className="emp-ex-sub">{fmtDateTime(t.at)}</div>
                    {t.note && <div>{t.note}</div>}
                  </li>
                ))}
              </ul>
            )}
            {(row.canAct || row.canPay) && (
              <div style={{ marginTop: 14 }}>
                {row.canAct && (
                  <div className="emp-field">
                    <label htmlFor="ex-note">Note (required to reject)</label>
                    <textarea id="ex-note" className="emp-textarea" value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                )}
                <div className="emp-actions" style={{ marginTop: 10 }}>
                  {row.canAct && <button className="emp-btn good" disabled={busy} onClick={() => act('approve')}>Approve</button>}
                  {row.canAct && <button className="emp-btn danger" disabled={busy} onClick={() => act('reject')}>Reject</button>}
                  {row.canPay && ex.status === 'approved' && <button className="emp-btn" disabled={busy} onClick={() => onPay(row._id)}>Mark paid</button>}
                  {row.canPay && ex.status === 'paid' && <button className="emp-btn ghost" disabled={busy} onClick={undo}>Undo paid</button>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Lists ────────────────────────────────────────────────────────────────────

const ExpenseTable: React.FC<{
  rows: QueueExpense[]; onOpen: (r: QueueExpense) => void; showStatus?: boolean;
  selected?: Set<string>; onToggle?: (id: string) => void; onQuickApprove?: (r: QueueExpense) => void; busyId?: string;
}> = ({ rows, onOpen, showStatus, selected, onToggle, onQuickApprove, busyId }) => (
  <div className="emp-table-wrap">
    <table className="emp-table">
      <thead>
        <tr>
          {onToggle && <th aria-label="Select" />}
          <th>Date</th><th>Employee</th><th>Category</th><th className="num">Amount</th><th>Flags</th><th>{showStatus ? 'Status' : 'Stage'}</th><th className="num">Receipts</th>{onQuickApprove && <th aria-label="Actions" />}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r._id} className="click" onClick={() => onOpen(r)}>
            {onToggle && (
              <td onClick={e => e.stopPropagation()}>
                {r.canPay && <input type="checkbox" aria-label={`Select expense of ${r.employeeName}`} checked={!!selected?.has(r._id)} onChange={() => onToggle(r._id)} />}
              </td>
            )}
            <td>{fmtDate(r.date)}</td>
            <td><b>{r.employeeName}</b><div className="emp-ex-sub">{r.employeeCode}</div></td>
            <td>{r.category}</td>
            <td className="num">{inr(r.amount)}</td>
            <td><Flags flags={r.flags} /></td>
            <td>{showStatus ? <Badge color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge> : <Badge color="amber">{STAGE_LABEL[r.stage] || r.stage}</Badge>}</td>
            <td className="num">{r.receipts.length}</td>
            {onQuickApprove && (
              <td onClick={e => e.stopPropagation()}>
                {r.canAct && r.flags.length === 0 && <button className="emp-btn good sm" disabled={busyId === r._id} onClick={() => onQuickApprove(r)}>Approve</button>}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MineTab: React.FC<{ refreshKey: number; onOpen: (r: QueueExpense) => void; onMsg: (m: string, bad?: boolean) => void }> = ({ refreshKey, onOpen, onMsg }) => {
  const [rows, setRows] = useState<QueueExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await expensesApi.queue({ tab: 'mine' })).rows.filter(r => r.canAct)); setErr(''); }
    catch (e) { setErr(empErr(e, 'Could not load your queue')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const quick = async (r: QueueExpense) => {
    setBusyId(r._id);
    try { await expensesApi.act(r._id, 'approve'); onMsg('Expense approved.'); await load(); }
    catch (e) { onMsg(empErr(e), true); } finally { setBusyId(''); }
  };

  return (
    <div className="emp-card">
      {err && <div className="emp-msg err">{err}</div>}
      {loading ? <div className="emp-empty">Loading…</div> : rows.length === 0 && !err ? <div className="emp-empty">Nothing is waiting for you.</div> : (
        <ExpenseTable rows={rows} onOpen={onOpen} onQuickApprove={quick} busyId={busyId} />
      )}
    </div>
  );
};

const AllTab: React.FC<{
  refreshKey: number; month: string; categories: ExpenseCategory[]; departments: string[]; people: Pick[] | null;
  onOpen: (r: QueueExpense) => void; onPay: (ids: string[]) => void; onMsg: (m: string, bad?: boolean) => void;
}> = ({ refreshKey, month, categories, departments, people, onOpen, onPay, onMsg }) => {
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [rows, setRows] = useState<QueueExpense[]>([]);
  const [totals, setTotals] = useState({ submitted: 0, approved: 0, paid: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const query: ExpenseQuery = useMemo(() => ({ month, status, category, department, employeeId }), [month, status, category, department, employeeId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await expensesApi.queue({ tab: 'all', ...query });
      setRows(r.rows); setTotals(r.totals); setErr(''); setSelected(new Set());
    } catch (e) { setErr(empErr(e, 'Could not load expenses')); setRows([]); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const payable = rows.filter(r => r.canPay && r.status === 'approved');
  const allSelected = payable.length > 0 && payable.every(r => selected.has(r._id));

  const doExport = async () => {
    setExporting(true);
    try { await expensesApi.exportCsv(query); } catch (e) { onMsg(empErr(e, 'Export failed'), true); } finally { setExporting(false); }
  };

  return (
    <div>
      <div className="emp-grid c4" style={{ marginBottom: 12 }}>
        <div className="emp-stat"><b>{inr(totals.submitted)}</b><span>Submitted</span></div>
        <div className="emp-stat"><b>{inr(totals.approved)}</b><span>Approved</span></div>
        <div className="emp-stat"><b>{inr(totals.paid)}</b><span>Paid</span></div>
        <div className="emp-stat"><b>{inr(totals.rejected)}</b><span>Rejected</span></div>
      </div>
      <div className="emp-card">
        <div className="emp-ex-filters">
          <div className="emp-field">
            <label htmlFor="ex-status">Status</label>
            <select id="ex-status" className="emp-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {(Object.keys(STATUS_LABEL) as ExpenseStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="emp-field">
            <label htmlFor="ex-cat">Category</label>
            <select id="ex-cat" className="emp-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="emp-field">
            <label htmlFor="ex-dept">Department</label>
            <select id="ex-dept" className="emp-select" value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="">All departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {people && (
            <div className="emp-field">
              <label htmlFor="ex-emp">Employee</label>
              <select id="ex-emp" className="emp-select" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                <option value="">Everyone</option>
                {people.map(p => <option key={p._id} value={p._id}>{p.name} ({p.code})</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="emp-ex-toolbar">
          {payable.length > 0 && (
            <>
              <label className="emp-chip"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(payable.map(r => r._id)))} /> Select all payable</label>
              <button className="emp-btn" disabled={selected.size === 0} onClick={() => onPay(Array.from(selected))}>Mark selected as paid ({selected.size})</button>
            </>
          )}
          <button className="emp-btn ghost" disabled={exporting} onClick={doExport}>{exporting ? 'Exporting…' : 'Export CSV'}</button>
        </div>
        {err && <div className="emp-msg err">{err}</div>}
        {loading ? <div className="emp-empty">Loading…</div> : rows.length === 0 && !err ? <div className="emp-empty">No expenses for these filters.</div> : (
          <ExpenseTable rows={rows} onOpen={onOpen} showStatus selected={selected} onToggle={toggle} />
        )}
      </div>
    </div>
  );
};

const SummaryTab: React.FC<{ month: string; refreshKey: number }> = ({ month, refreshKey }) => {
  const [data, setData] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    expensesApi.summary(month)
      .then(s => { if (alive) { setData(s); setErr(''); } })
      .catch(e => { if (alive) setErr(empErr(e, 'Could not load the summary')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [month, refreshKey]);

  if (loading) return <div className="emp-empty">Loading…</div>;
  if (err) return <div className="emp-msg err">{err}</div>;
  if (!data) return null;
  const st = (k: string) => data.byStatus[k]?.total || 0;
  const maxCat = Math.max(1, ...data.byCategory.map(c => c.total));

  return (
    <div>
      <div className="emp-grid c4" style={{ marginBottom: 12 }}>
        <div className="emp-stat"><b>{data.pendingApprovals}</b><span>Pending approvals</span></div>
        <div className="emp-stat"><b>{inr(st('submitted'))}</b><span>Submitted</span></div>
        <div className="emp-stat"><b>{inr(st('approved'))}</b><span>Approved</span></div>
        <div className="emp-stat"><b>{inr(st('paid'))}</b><span>Paid</span></div>
      </div>
      <div className="emp-stat" style={{ marginBottom: 12 }}><b>{inr(st('rejected'))}</b><span>Rejected</span></div>
      <div className="emp-card">
        <h2>By category</h2>
        {data.byCategory.length === 0 ? <div className="emp-empty">No expenses this month.</div> : (
          <div className="emp-table-wrap">
            <table className="emp-table">
              <thead><tr><th>Category</th><th className="num">Claims</th><th className="num">Total</th><th>Share</th></tr></thead>
              <tbody>
                {data.byCategory.map(c => (
                  <tr key={c.category}>
                    <td>{c.category}</td><td className="num">{c.count}</td><td className="num">{inr(c.total)}</td>
                    <td><div className="emp-ex-bar"><i style={{ width: `${Math.round((c.total / maxCat) * 100)}%` }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="emp-card">
        <h2>By employee</h2>
        {data.byEmployee.length === 0 ? <div className="emp-empty">No expenses this month.</div> : (
          <div className="emp-table-wrap">
            <table className="emp-table">
              <thead><tr><th>Employee</th><th>Department</th><th className="num">Claims</th><th className="num">Total</th></tr></thead>
              <tbody>
                {data.byEmployee.slice(0, 25).map(e => (
                  <tr key={e.employeeId}>
                    <td><b>{e.name}</b><div className="emp-ex-sub">{e.code}</div></td>
                    <td>{e.department || '—'}</td><td className="num">{e.count}</td><td className="num">{inr(e.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

const ExpenseAdmin: React.FC = () => {
  const [tab, setTab] = useState<Tab>('mine');
  const [month, setMonth] = useState(thisMonth());
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openRow, setOpenRow] = useState<QueueExpense | null>(null);
  const [payIds, setPayIds] = useState<string[] | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [people, setPeople] = useState<Pick[] | null>(null);

  useEffect(() => {
    employeesApi.config().then(c => { setCategories(c.expenseCategories || []); setDepartments(c.departments || []); }).catch(() => undefined);
    employeesApi.pick().then(p => setPeople(p)).catch(() => setPeople(null));
  }, []);

  const flash = (text: string, bad = false) => setMsg({ text, bad });
  const changed = (text: string) => { setOpenRow(null); setPayIds(null); flash(text); setRefreshKey(k => k + 1); };

  return (
    <div className="emp-page">
      <div className="emp-head">
        <div><h1>Employee expenses</h1><p className="emp-sub">Review, approve and pay employee expense claims.</p></div>
        <div className="emp-field">
          <label htmlFor="ex-month">Month</label>
          <input id="ex-month" type="month" className="emp-input" value={month} onChange={e => e.target.value && setMonth(e.target.value)} />
        </div>
      </div>
      {msg && <div className={`emp-msg ${msg.bad ? 'err' : 'ok'}`} role="status">{msg.text}</div>}
      <div className="emp-tabs" role="tablist">
        {([['mine', 'Needs my action'], ['all', 'All expenses'], ['summary', 'Summary']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`emp-tab ${tab === k ? 'on' : ''}`} onClick={() => { setTab(k); setMsg(null); }}>{l}</button>
        ))}
      </div>
      {tab === 'mine' && <MineTab refreshKey={refreshKey} onOpen={setOpenRow} onMsg={flash} />}
      {tab === 'all' && <AllTab refreshKey={refreshKey} month={month} categories={categories} departments={departments} people={people} onOpen={setOpenRow} onPay={setPayIds} onMsg={flash} />}
      {tab === 'summary' && <SummaryTab month={month} refreshKey={refreshKey} />}
      {openRow && <ExpenseModal row={openRow} onClose={() => setOpenRow(null)} onChanged={changed} onPay={id => setPayIds([id])} />}
      {payIds && <PayModal ids={payIds} onClose={() => setPayIds(null)} onDone={changed} />}
    </div>
  );
};

export default ExpenseAdmin;
