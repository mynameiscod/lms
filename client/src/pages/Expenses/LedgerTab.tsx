import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../Employees/employees.css';
import './expenses.css';
import { companyApi, empErr, fileObjectUrl, EmployeeConfig, LedgerKind, LedgerQuery, LedgerResult, LedgerRow, LedgerStatus } from '../../api/employeesApi';
import { PAY_MODES } from './BillModal';

interface Props {
  month: string;
  refreshKey: number;
  config: EmployeeConfig;
  preset?: 'approvals';
  canManage: boolean;
  canApprove: boolean;
  onChanged: () => void;
  onEdit: (row: LedgerRow) => void;
}

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (s?: string) => (s ? new Date(s.length === 10 ? `${s}T00:00:00` : s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (s?: string) => (s ? `${fmtDate(s)}, ${new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}` : '—');
const todayIn = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

const KIND_LABEL: Record<LedgerKind, string> = { bill: 'Bill', recurring: 'Recurring', salary: 'Salary', reimbursement: 'Reimbursement' };
const KIND_COLOR: Record<LedgerKind, string> = { bill: 'grey', recurring: 'blue', salary: 'violet', reimbursement: 'amber' };
const STATUS_LABEL: Record<LedgerStatus, string> = { pending: 'Waiting for approval', approved: 'Approved – to pay', paid: 'Paid', rejected: 'Rejected', cancelled: 'Cancelled' };
const STATUS_COLOR: Record<LedgerStatus, string> = { pending: 'amber', approved: 'blue', paid: 'green', rejected: 'red', cancelled: 'grey' };

const Badge: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => <span className={`emp-badge ${color}`}>{children}</span>;

// ── Small modals ─────────────────────────────────────────────────────────────

const PayModal: React.FC<{ ids: string[]; onClose: () => void; onDone: (msg: string) => void }> = ({ ids, onClose, onDone }) => {
  const [mode, setMode] = useState(PAY_MODES[0]);
  const [ref, setRef] = useState('');
  const [paidOn, setPaidOn] = useState(todayIn());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const r = await companyApi.pay(ids, { paymentMode: mode, paymentRef: ref.trim() || undefined, paidOn });
      onDone(`${r.paid} line${r.paid === 1 ? '' : 's'} marked as paid.`);
    } catch (e) { setErr(empErr(e)); } finally { setBusy(false); }
  };
  return (
    <div className="emp-modal-back" onClick={onClose}>
      <div className="emp-modal" role="dialog" aria-modal="true" aria-label="Mark as paid" onClick={e => e.stopPropagation()}>
        <h2>Mark {ids.length} line{ids.length === 1 ? '' : 's'} as paid</h2>
        {err && <div className="emp-msg err">{err}</div>}
        <div className="emp-field">
          <label htmlFor="lp-mode">Payment mode</label>
          <select id="lp-mode" className="emp-select" value={mode} onChange={e => setMode(e.target.value)}>
            {PAY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="lp-ref">Reference (transaction id, cheque no.)</label>
          <input id="lp-ref" className="emp-input" value={ref} onChange={e => setRef(e.target.value)} />
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="lp-on">Paid on</label>
          <input id="lp-on" type="date" className="emp-input" value={paidOn} onChange={e => setPaidOn(e.target.value)} />
        </div>
        <div className="emp-actions" style={{ marginTop: 14 }}>
          <button className="emp-btn good" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Mark paid'}</button>
          <button className="emp-btn ghost" disabled={busy} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const NoteModal: React.FC<{ title: string; label: string; required: boolean; confirmLabel: string; danger?: boolean; onClose: () => void; onSubmit: (note: string) => Promise<void> }> = ({ title, label, required, confirmLabel, danger, onClose, onSubmit }) => {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    if (required && !note.trim()) { setErr('Please write a note.'); return; }
    setBusy(true); setErr('');
    try { await onSubmit(note.trim()); } catch (e) { setErr(empErr(e)); setBusy(false); }
  };
  return (
    <div className="emp-modal-back" onClick={onClose}>
      <div className="emp-modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        {err && <div className="emp-msg err">{err}</div>}
        <div className="emp-field">
          <label htmlFor="nm-note">{label}</label>
          <textarea id="nm-note" className="emp-textarea" rows={3} value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="emp-actions" style={{ marginTop: 14 }}>
          <button className={`emp-btn ${danger ? 'danger' : 'good'}`} disabled={busy} onClick={go}>{busy ? 'Saving…' : confirmLabel}</button>
          <button className="emp-btn ghost" disabled={busy} onClick={onClose}>Back</button>
        </div>
      </div>
    </div>
  );
};

// ── Detail ───────────────────────────────────────────────────────────────────

const Detail: React.FC<{ id: string; canManage: boolean; onClose: () => void; onChanged: (msg: string) => void }> = ({ id, canManage, onClose, onChanged }) => {
  const [row, setRow] = useState<LedgerRow | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let alive = true;
    companyApi.detail(id).then(r => { if (alive) setRow(r); }).catch(e => { if (alive) setErr(empErr(e, 'Could not load this line')); });
    return () => { alive = false; };
  }, [id]);

  const openFile = async (fileId: string) => {
    try { window.open(await fileObjectUrl(fileId), '_blank', 'noopener'); } catch (e) { setErr(empErr(e, 'Could not open the file')); }
  };
  const unpay = async () => {
    if (!window.confirm('Undo this payment? The line goes back to "Approved – to pay".')) return;
    setBusy(true); setErr('');
    try { await companyApi.unpay(id); onChanged('Payment undone.'); } catch (e) { setErr(empErr(e)); setBusy(false); }
  };

  const cancelable = !!row && (row.status === 'pending' || row.status === 'approved') && (row.canEdit || canManage);
  const canUnpay = !!row && canManage && row.status === 'paid' && row.kind !== 'reimbursement';

  return (
    <div className="emp-modal-back" onClick={onClose}>
      <div className="emp-modal exp-detail" role="dialog" aria-modal="true" aria-label="Expense details" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>{row?.title || row?.category || 'Expense'}</h2>
        {err && <div className="emp-msg err">{err}</div>}
        {!row && !err && <div className="emp-empty">Loading…</div>}
        {row && (
          <>
            <div style={{ marginBottom: 10 }}><Badge color={KIND_COLOR[row.kind]}>{KIND_LABEL[row.kind]}</Badge> <Badge color={STATUS_COLOR[row.status]}>{STATUS_LABEL[row.status]}</Badge></div>
            <dl>
              <dt>Date</dt><dd>{fmtDate(row.date)}</dd>
              <dt>Category</dt><dd>{row.category}</dd>
              <dt>Amount</dt><dd>{inr(row.amount)}{row.gst ? ` (incl. GST ${inr(row.gst)})` : ''}</dd>
              {row.vendor && <><dt>Paid to</dt><dd>{row.vendor}</dd></>}
              {row.employeeName && <><dt>Employee</dt><dd>{row.employeeName}{row.employeeCode ? ` (${row.employeeCode})` : ''}</dd></>}
              {row.invoiceNumber && <><dt>Invoice no.</dt><dd>{row.invoiceNumber}</dd></>}
              {row.dueDate && <><dt>Due date</dt><dd>{fmtDate(row.dueDate)}</dd></>}
              {row.paymentMode && <><dt>Payment mode</dt><dd>{row.paymentMode}</dd></>}
              {row.status === 'paid' && <><dt>Paid on</dt><dd>{fmtDate(row.paidOn)}</dd></>}
              {row.paymentRef && <><dt>Reference</dt><dd>{row.paymentRef}</dd></>}
              {row.description && <><dt>Notes</dt><dd>{row.description}</dd></>}
            </dl>
            <h4>Invoices</h4>
            {row.invoices.length === 0 ? <div className="emp-muted">None attached.</div> : (
              <div className="exp-chips">
                {row.invoices.map(f => <button key={f.fileId} type="button" className="emp-chip" onClick={() => openFile(f.fileId)}>📎 {f.name}</button>)}
              </div>
            )}
            <h4 style={{ marginTop: 14 }}>History</h4>
            {(row.trail || []).length === 0 ? <div className="emp-muted">No history yet.</div> : (
              <ul className="exp-trail">
                {(row.trail || []).map((t, i) => (
                  <li key={i}>
                    <b>{t.action.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())}</b>{t.byName ? ` by ${t.byName}` : ''}
                    <div className="exp-sub">{fmtDateTime(t.at)}</div>
                    {t.note && <div>{t.note}</div>}
                  </li>
                ))}
              </ul>
            )}
            <div className="emp-actions" style={{ marginTop: 14 }}>
              {canUnpay && <button className="emp-btn ghost" disabled={busy} onClick={unpay}>Undo payment</button>}
              {cancelable && <button className="emp-btn danger" disabled={busy} onClick={() => setCancelling(true)}>Cancel entry</button>}
              <button className="emp-btn ghost" onClick={onClose}>Close</button>
            </div>
          </>
        )}
        {cancelling && (
          <NoteModal title="Cancel this entry?" label="Reason (optional)" required={false} confirmLabel="Cancel entry" danger onClose={() => setCancelling(false)}
            onSubmit={async note => { await companyApi.cancel(id, note || undefined); onChanged('Entry cancelled.'); }} />
        )}
      </div>
    </div>
  );
};

// ── Tab ──────────────────────────────────────────────────────────────────────

const LedgerTab: React.FC<Props> = ({ month, refreshKey, config, preset, canManage, canApprove, onChanged, onEdit }) => {
  const approvals = preset === 'approvals';
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [kind, setKind] = useState<LedgerKind | ''>('');
  const [status, setStatus] = useState<LedgerStatus | ''>(approvals ? 'pending' : '');
  const [byMonth, setByMonth] = useState(!approvals);
  const [data, setData] = useState<LedgerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [payIds, setPayIds] = useState<string[] | null>(null);
  const [rejectRow, setRejectRow] = useState<LedgerRow | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [localKey, setLocalKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = useMemo<LedgerQuery>(() => ({
    ...(byMonth ? { month } : {}),
    ...(category ? { category } : {}),
    ...(kind ? { kind } : {}),
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
  }), [byMonth, month, category, kind, status, search]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr('');
    companyApi.ledger(query)
      .then(r => { if (alive) { setData(r); setSelected([]); } })
      .catch(e => { if (alive) setErr(empErr(e, 'Could not load the ledger')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [query, refreshKey, localKey]);

  const changed = useCallback((msg: string) => {
    setOk(msg); setDetailId(null); setPayIds(null); setRejectRow(null);
    setLocalKey(k => k + 1);
    onChanged();
  }, [onChanged]);

  const approve = async (r: LedgerRow) => {
    setErr('');
    try { await companyApi.act(r._id, 'approve'); changed('Approved.'); } catch (e) { setErr(empErr(e)); }
  };
  const exportCsv = async () => {
    setErr('');
    try { await companyApi.exportCsv(query); } catch (e) { setErr(empErr(e, 'Could not export')); }
  };

  const rows = data?.rows || [];
  const payable = rows.filter(r => r.canPay);
  const allSel = payable.length > 0 && payable.every(r => selected.includes(r._id));
  const toggle = (id: string) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  const hidden = !!data?.hiddenSalaryLines;
  const showCheck = payable.length > 0;

  return (
    <div>
      {ok && <div className="emp-msg ok" role="status">{ok}</div>}
      {err && <div className="emp-msg err">{err}</div>}

      <div className="exp-toolbar">
        <div className="emp-field">
          <label htmlFor="lt-search">Search</label>
          <input id="lt-search" className="emp-input" placeholder="Title, vendor, invoice no." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
        <div className="emp-field">
          <label htmlFor="lt-cat">Category</label>
          <select id="lt-cat" className="emp-select" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {config.companyCategories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="emp-field">
          <label htmlFor="lt-kind">Type</label>
          <select id="lt-kind" className="emp-select" value={kind} onChange={e => setKind(e.target.value as LedgerKind | '')}>
            <option value="">All types</option>
            <option value="bill">Bill</option>
            <option value="recurring">Recurring</option>
            {!hidden && <option value="salary">Salary</option>}
            <option value="reimbursement">Reimbursement</option>
          </select>
        </div>
        {!approvals && (
          <div className="emp-field">
            <label htmlFor="lt-status">Status</label>
            <select id="lt-status" className="emp-select" value={status} onChange={e => setStatus(e.target.value as LedgerStatus | '')}>
              <option value="">All statuses</option>
              {(Object.keys(STATUS_LABEL) as LedgerStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
        )}
        <div className="emp-field">
          <label htmlFor="lt-range">Period</label>
          <select id="lt-range" className="emp-select" value={byMonth ? 'month' : 'all'} onChange={e => setByMonth(e.target.value === 'month')}>
            <option value="month">Whole month</option>
            <option value="all">All time</option>
          </select>
        </div>
        <button className="emp-btn ghost" onClick={exportCsv}>Export CSV</button>
        {selected.length > 0 && <button className="emp-btn good" onClick={() => setPayIds(selected)}>Mark selected as paid ({selected.length})</button>}
      </div>

      {data && (
        <div className="exp-totals">
          <span>Pending <b>{inr(data.totals.pending || 0)}</b></span>
          <span>Approved <b>{inr(data.totals.approved || 0)}</b></span>
          <span>Paid <b>{inr(data.totals.paid || 0)}</b></span>
        </div>
      )}
      {hidden && <div className="emp-hint" style={{ marginBottom: 8 }}>Salary lines are hidden from you; they are included in the summary totals.</div>}

      {loading && !data ? <div className="emp-empty">Loading…</div> : rows.length === 0 ? (
        <div className="emp-empty">{approvals ? 'Nothing is waiting for approval.' : 'No expenses match these filters.'}</div>
      ) : (
        <div className="emp-table-wrap" style={loading ? { opacity: 0.6 } : undefined}>
          <table className="emp-table">
            <thead>
              <tr>
                {showCheck && <th><input type="checkbox" aria-label="Select all payable" checked={allSel} onChange={() => setSelected(allSel ? [] : payable.map(r => r._id))} /></th>}
                <th>Date</th><th>What for</th><th>Category</th><th className="num">Amount</th><th>Status</th><th>Files</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id} className="click" onClick={() => setDetailId(r._id)}>
                  {showCheck && (
                    <td onClick={e => e.stopPropagation()}>
                      {r.canPay && <input type="checkbox" aria-label={`Select ${r.title || r.category}`} checked={selected.includes(r._id)} onChange={() => toggle(r._id)} />}
                    </td>
                  )}
                  <td className="exp-clip">{fmtDate(r.date)}</td>
                  <td>
                    <div>{r.title || r.employeeName || r.category} <Badge color={KIND_COLOR[r.kind]}>{KIND_LABEL[r.kind]}</Badge></div>
                    {(r.vendor || r.employeeName) && <div className="exp-sub">{r.vendor || r.employeeName}</div>}
                  </td>
                  <td>{r.category}</td>
                  <td className="num">
                    <div>{inr(r.amount)}</div>
                    {!!r.gst && r.gst > 0 && <div className="exp-sub">incl. GST {inr(r.gst)}</div>}
                  </td>
                  <td><Badge color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge></td>
                  <td>{r.invoices.length > 0 ? <span title={`${r.invoices.length} attached`}>📎 {r.invoices.length}</span> : <span className="emp-muted">—</span>}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="exp-actions">
                      {canApprove && r.canApprove && <button className="emp-btn good sm" onClick={() => approve(r)}>Approve</button>}
                      {canApprove && r.canApprove && <button className="emp-btn danger sm" onClick={() => setRejectRow(r)}>Reject</button>}
                      {r.canPay && <button className="emp-btn sm" onClick={() => setPayIds([r._id])}>Pay</button>}
                      {r.canEdit && <button className="emp-btn ghost sm" onClick={() => onEdit(r)}>Edit</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payIds && <PayModal ids={payIds} onClose={() => setPayIds(null)} onDone={changed} />}
      {rejectRow && (
        <NoteModal title={`Reject "${rejectRow.title || rejectRow.category}"`} label="Why is it being rejected?" required confirmLabel="Reject" danger onClose={() => setRejectRow(null)}
          onSubmit={async note => { await companyApi.act(rejectRow._id, 'reject', note); changed('Rejected.'); }} />
      )}
      {detailId && <Detail id={detailId} canManage={canManage} onClose={() => setDetailId(null)} onChanged={changed} />}
    </div>
  );
};

export default LedgerTab;
