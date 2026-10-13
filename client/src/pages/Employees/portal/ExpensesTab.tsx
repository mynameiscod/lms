import React, { useCallback, useEffect, useState } from 'react';
import { portalApi, fileObjectUrl, empErr, Expense, ExpenseInput, PortalMe } from '../../../api/employeesApi';
import { addDays, fmtDateTime, fmtDay, inr, modeLabel, monthIST, todayIST } from './portalUtils';
import '../employees.css';
import './portal.css';

interface Props { me: PortalMe; reload: () => void }

const MAX_FILES = 6;
const MAX_BYTES = 5 * 1024 * 1024;

const STATUS: Record<string, { cls: string; label: string }> = {
  submitted: { cls: 'amber', label: 'Waiting' },
  approved: { cls: 'green', label: 'Approved' },
  paid: { cls: 'violet', label: 'Paid' },
  rejected: { cls: 'red', label: 'Rejected' },
  cancelled: { cls: 'grey', label: 'Cancelled' },
};
const stageText = (e: Expense): string => {
  if (e.status !== 'submitted') return '';
  return e.stage === 'manager' ? 'with your manager' : e.stage === 'approver' ? 'with the approver' : '';
};
const canEdit = (e: Expense): boolean =>
  e.status === 'rejected' || (e.status === 'submitted' && e.trail.every((t) => t.action === 'submitted' || t.action === 'edited'));

interface FormState {
  date: string; category: string; amount: string; merchant: string; description: string; workMode: string;
  receipts: { fileId: string; name: string }[];
}

const ExpenseModal: React.FC<{ me: PortalMe; editing: Expense | null; onClose: () => void; onSaved: (text: string) => void }> = ({ me, editing, onClose, onSaved }) => {
  const policy = me.config.expensePolicy;
  const cats = me.config.expenseCategories.filter((c) => c.active);
  const today = todayIST();
  const [f, setF] = useState<FormState>(() => ({
    date: editing?.date?.slice(0, 10) || today,
    category: editing?.category || cats[0]?.name || '',
    amount: editing ? String(editing.amount) : '',
    merchant: editing?.merchant || '',
    description: editing?.description || '',
    workMode: editing?.workMode || '',
    receipts: editing ? editing.receipts.map((r) => ({ fileId: r.fileId, name: r.name })) : [],
  }));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const cat = cats.find((c) => c.name === f.category);
  const threshold = cat && cat.receiptRequiredAbove > 0 ? cat.receiptRequiredAbove : policy.receiptRequiredAbove;
  const amount = Number(f.amount) || 0;
  const needsReceipt = threshold > 0 && amount > threshold && f.receipts.length === 0;

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErr('');
    const list = Array.from(files);
    if (f.receipts.length + list.length > MAX_FILES) { setErr(`You can attach up to ${MAX_FILES} receipts.`); return; }
    if (list.some((x) => x.size > MAX_BYTES)) { setErr('Each file must be 5 MB or smaller.'); return; }
    setUploading(true);
    try {
      const done: { fileId: string; name: string }[] = [];
      for (const file of list) {
        const up = await portalApi.uploadReceipt(file);
        done.push({ fileId: up.fileId, name: up.name || file.name });
      }
      setF((s) => ({ ...s, receipts: [...s.receipts, ...done] }));
    } catch (e) { setErr(empErr(e, 'Upload failed')); } finally { setUploading(false); }
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErr('');
    if (!f.category) { setErr('Choose a category.'); return; }
    if (amount <= 0) { setErr('Enter the amount.'); return; }
    if (needsReceipt) { setErr(`A receipt is needed for claims above ${inr(threshold)}.`); return; }
    const body: ExpenseInput = {
      date: f.date, category: f.category, amount, merchant: f.merchant.trim(), description: f.description.trim(),
      workMode: f.workMode || undefined, receipts: f.receipts,
    };
    setSaving(true);
    try {
      if (editing) {
        await portalApi.updateExpense(editing._id, body);
        onSaved(editing.status === 'rejected' ? 'Claim updated and sent again for approval.' : 'Claim updated.');
      } else {
        await portalApi.createExpense(body);
        onSaved('Expense submitted for approval.');
      }
    } catch (e) { setErr(empErr(e)); setSaving(false); }
  };

  return (
    <div className="emp-modal-back" onClick={onClose}>
      <form className="emp-modal" role="dialog" aria-modal="true" aria-label="Expense" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{editing ? (editing.status === 'rejected' ? 'Fix and send again' : 'Edit expense') : 'Add expense'}</h2>
        {err && <div className="emp-msg err" role="alert">{err}</div>}
        <div className="emp-grid c2">
          <div className="emp-field">
            <label htmlFor="ex-date">Date</label>
            <input id="ex-date" className="emp-input" type="date" required value={f.date} max={today} min={addDays(today, -(policy.maxBackdateDays || 30))}
              onChange={(e) => set('date', e.target.value)} />
          </div>
          <div className="emp-field">
            <label htmlFor="ex-amt">Amount (₹)</label>
            <input id="ex-amt" className="emp-input" type="number" inputMode="decimal" min={0} step="0.01" required value={f.amount} onChange={(e) => set('amount', e.target.value)} />
          </div>
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="ex-cat">Category</label>
          <select id="ex-cat" className="emp-select" value={f.category} onChange={(e) => set('category', e.target.value)}>
            {cats.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          {cat && cat.dailyLimit > 0 && <p className="emp-hint">Daily limit for {cat.name}: {inr(cat.dailyLimit)}</p>}
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="ex-mer">Shop / merchant (optional)</label>
          <input id="ex-mer" className="emp-input" value={f.merchant} maxLength={120} onChange={(e) => set('merchant', e.target.value)} />
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="ex-note">What was it for? (optional)</label>
          <textarea id="ex-note" className="emp-textarea" value={f.description} maxLength={500} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <span className="emp-label">Where were you working? (optional)</span>
          <div className="emp-modes">
            {(['office', 'remote', 'field'] as const).map((m) => (
              <button key={m} type="button" className={`emp-chip${f.workMode === m ? ' on' : ''}`} onClick={() => set('workMode', f.workMode === m ? '' : m)}>{modeLabel(m)}</button>
            ))}
          </div>
        </div>

        <div className="emp-field" style={{ marginTop: 6 }}>
          <span className="emp-label">Receipts</span>
          {threshold > 0 && <p className="emp-hint" style={{ color: needsReceipt ? '#b91c1c' : undefined }}>Receipt needed for claims above {inr(threshold)}.</p>}
          <div className="emp-receipts">
            {f.receipts.map((r) => (
              <span className="emp-receipt" key={r.fileId}>
                📎 {r.name}
                <button type="button" aria-label={`Remove ${r.name}`} onClick={() => set('receipts', f.receipts.filter((x) => x.fileId !== r.fileId))}>×</button>
              </span>
            ))}
          </div>
          <div className="emp-row">
            <label className="emp-btn ghost" style={{ display: 'inline-flex', alignItems: 'center' }}>
              📷 Take photo
              <input type="file" accept="image/*" capture="environment" hidden disabled={uploading || f.receipts.length >= MAX_FILES}
                onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
            </label>
            <label className="emp-btn ghost" style={{ display: 'inline-flex', alignItems: 'center' }}>
              📁 Choose file
              <input type="file" accept="image/*,application/pdf" multiple hidden disabled={uploading || f.receipts.length >= MAX_FILES}
                onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
            </label>
          </div>
          <p className="emp-hint">{uploading ? 'Uploading…' : `Up to ${MAX_FILES} files, 5 MB each. Photos or PDF.`}</p>
        </div>

        <div className="emp-sticky-actions">
          <button type="button" className="emp-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="emp-btn good" disabled={saving || uploading}>{saving ? 'Saving…' : editing ? 'Save claim' : 'Submit claim'}</button>
        </div>
      </form>
    </div>
  );
};

const ExpensesTab: React.FC<Props> = ({ me, reload }) => {
  const [month, setMonth] = useState(monthIST());
  const [status, setStatus] = useState('');
  const [data, setData] = useState<{ rows: Expense[]; totals: { pending: number; approved: number; paid: number; rejected: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [modal, setModal] = useState<{ editing: Expense | null } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    portalApi.expenses({ month, status })
      .then(setData)
      .catch((e) => setMsg({ kind: 'err', text: empErr(e, 'Could not load your expenses') }))
      .finally(() => setLoading(false));
  }, [month, status]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (e: Expense) => {
    if (!window.confirm(`Cancel this ${inr(e.amount)} claim?`)) return;
    try {
      await portalApi.cancelExpense(e._id);
      setMsg({ kind: 'ok', text: 'Claim cancelled.' });
      load();
    } catch (er) { setMsg({ kind: 'err', text: empErr(er) }); }
  };

  const openReceipt = async (fileId: string) => {
    const w = window.open('', '_blank');
    try {
      const url = await fileObjectUrl(fileId);
      if (w) w.location.href = url; else window.open(url, '_blank');
    } catch (er) { if (w) w.close(); setMsg({ kind: 'err', text: empErr(er, 'Could not open the receipt') }); }
  };

  const t = data?.totals;
  return (
    <div>
      <button type="button" className="emp-btn emp-fab" onClick={() => setModal({ editing: null })}>＋ Add expense</button>
      {msg && <div className={`emp-msg ${msg.kind}`} role="status">{msg.text}</div>}

      <div className="emp-stats">
        <div className="emp-stat"><b>{inr(t?.pending || 0)}</b><span>Pending</span></div>
        <div className="emp-stat"><b>{inr(t?.approved || 0)}</b><span>Approved</span></div>
        <div className="emp-stat"><b>{inr(t?.paid || 0)}</b><span>Paid</span></div>
        <div className="emp-stat"><b>{inr(t?.rejected || 0)}</b><span>Rejected</span></div>
      </div>

      <div className="emp-grid c2" style={{ marginBottom: 12 }}>
        <div className="emp-field">
          <label htmlFor="ex-month">Month</label>
          <input id="ex-month" className="emp-input" type="month" value={month} max={monthIST()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </div>
        <div className="emp-field">
          <label htmlFor="ex-status">Status</label>
          <select id="ex-status" className="emp-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="submitted">Waiting</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? <p className="emp-empty">Loading…</p> : !data || data.rows.length === 0 ? (
        <p className="emp-empty">No expenses for this month. Tap "Add expense" when you spend on work.</p>
      ) : data.rows.map((e) => {
        const st = STATUS[e.status] || STATUS.cancelled;
        return (
          <div className="emp-exp-card" key={e._id}>
            <div className="emp-exp-top">
              <div>
                <b>{e.category}</b>
                <div className="emp-muted" style={{ fontSize: 13 }}>{fmtDay(e.date)}{e.merchant ? ` · ${e.merchant}` : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="emp-exp-amount">{inr(e.amount)}</div>
                <span className={`emp-badge ${st.cls}`}>{st.label}</span>
                {stageText(e) && <div className="emp-muted" style={{ fontSize: 12 }}>{stageText(e)}</div>}
              </div>
            </div>
            {e.status === 'rejected' && <div className="emp-reject">Rejected: {e.rejectionReason || 'No reason given'}</div>}
            <div className="emp-row" style={{ marginTop: 8, gap: 6 }}>
              <span className="emp-muted" style={{ fontSize: 12.5 }}>{e.receipts.length} receipt{e.receipts.length === 1 ? '' : 's'}</span>
              {e.receipts.map((r, i) => (
                <button key={r.fileId} type="button" className="emp-btn ghost sm" onClick={() => openReceipt(r.fileId)}>Receipt {i + 1}</button>
              ))}
              <span style={{ flex: 1 }} />
              {canEdit(e) && <button type="button" className="emp-btn ghost sm" onClick={() => setModal({ editing: e })}>{e.status === 'rejected' ? 'Fix & resend' : 'Edit'}</button>}
              {(e.status === 'submitted' || e.status === 'rejected') && <button type="button" className="emp-btn ghost sm" onClick={() => cancel(e)}>Cancel claim</button>}
              <button type="button" className="emp-btn ghost sm" onClick={() => setOpen(open === e._id ? null : e._id)}>{open === e._id ? 'Hide details' : 'Details'}</button>
            </div>
            {open === e._id && (
              <ul className="emp-trail">
                {e.trail.map((tr, i) => (
                  <li key={i}><b style={{ textTransform: 'capitalize' }}>{tr.action.replace(/_/g, ' ')}</b>{tr.byName ? ` by ${tr.byName}` : ''} · {fmtDateTime(tr.at)}{tr.note ? ` · "${tr.note}"` : ''}</li>
                ))}
                {e.paidAt && <li><b>Paid</b> · {fmtDateTime(e.paidAt)}{e.paymentMode ? ` via ${e.paymentMode}` : ''}{e.paymentRef ? ` (${e.paymentRef})` : ''}</li>}
              </ul>
            )}
          </div>
        );
      })}

      {modal && (
        <ExpenseModal me={me} editing={modal.editing} onClose={() => setModal(null)}
          onSaved={(text) => { setModal(null); setMsg({ kind: 'ok', text }); load(); reload(); }} />
      )}
    </div>
  );
};

export default ExpensesTab;
