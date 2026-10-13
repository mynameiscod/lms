import React, { useEffect, useRef, useState } from 'react';
import '../Employees/employees.css';
import './expenses.css';
import { companyApi, empErr, BillInput, EmployeeConfig, LedgerRow } from '../../api/employeesApi';

interface Props {
  config: EmployeeConfig;
  canApprove: boolean;
  row?: LedgerRow;
  onClose: () => void;
  onSaved: () => void;
}

export const PAY_MODES = ['Bank transfer', 'UPI', 'Cash', 'Card', 'Cheque'];
const MAX_FILES = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const todayIn = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

interface Att { fileId: string; name: string }

const BillModal: React.FC<Props> = ({ config, canApprove, row, onClose, onSaved }) => {
  const editing = !!row;
  const categories = config.companyCategories.filter(c => c.active || c.name === row?.category);
  const [date, setDate] = useState(row?.date?.slice(0, 10) || todayIn());
  const [category, setCategory] = useState(row?.category || categories[0]?.name || '');
  const [title, setTitle] = useState(row?.title || '');
  const [vendor, setVendor] = useState(row?.vendor || '');
  const [amount, setAmount] = useState(row ? String(row.amount) : '');
  const [gst, setGst] = useState(row?.gst ? String(row.gst) : '');
  const [invoiceNumber, setInvoiceNumber] = useState(row?.invoiceNumber || '');
  const [dueDate, setDueDate] = useState(row?.dueDate?.slice(0, 10) || '');
  const [paymentMode, setPaymentMode] = useState(row?.paymentMode || '');
  const [notes, setNotes] = useState(row?.description || '');
  const [files, setFiles] = useState<Att[]>(row?.invoices?.map(i => ({ fileId: i.fileId, name: i.name })) || []);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [paidOn, setPaidOn] = useState(todayIn());
  const [paymentRef, setPaymentRef] = useState('');
  const [vendors, setVendors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    companyApi.vendors().then(v => { if (alive) setVendors(v); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const cat = config.companyCategories.find(c => c.name === category);
  const amt = Number(amount) || 0;
  const threshold = config.companyPolicy?.invoiceRequiredAbove || 0;
  const needsInvoice = threshold > 0 && amt > threshold && files.length === 0;

  const onFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setErr('');
    const picked = Array.from(list);
    if (files.length + picked.length > MAX_FILES) { setErr(`You can attach up to ${MAX_FILES} files.`); return; }
    const big = picked.find(f => f.size > MAX_BYTES);
    if (big) { setErr(`${big.name} is larger than 5 MB.`); return; }
    setUploading(true);
    try {
      const added: Att[] = [];
      for (const f of picked) {
        const u = await companyApi.uploadInvoice(f);
        added.push({ fileId: u.fileId, name: u.name || f.name });
      }
      setFiles(prev => [...prev, ...added]);
    } catch (e) { setErr(empErr(e, 'Could not upload the file')); } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErr('');
    if (!category) { setErr('Pick a category.'); return; }
    if (!title.trim()) { setErr('Say what it was for.'); return; }
    if (!(amt > 0)) { setErr('Enter the amount.'); return; }
    if (Number(gst) > amt) { setErr('GST cannot be more than the total amount.'); return; }
    if (needsInvoice) { setErr(`Attach the bill for anything above ${inr(threshold)}.`); return; }
    const body: BillInput = {
      date, category, title: title.trim(), vendor: vendor.trim() || undefined, description: notes.trim() || undefined,
      amount: amt, gst: Number(gst) > 0 ? Number(gst) : undefined, invoiceNumber: invoiceNumber.trim() || undefined,
      dueDate: dueDate || undefined, paymentMode: paymentMode || undefined,
      invoices: files.map(f => ({ fileId: f.fileId, name: f.name })),
    };
    if (!editing && canApprove && alreadyPaid) {
      body.recordAsPaid = true; body.paidOn = paidOn; body.paymentRef = paymentRef.trim() || undefined;
    }
    setBusy(true);
    try {
      if (row) await companyApi.update(row._id, body); else await companyApi.create(body);
      onSaved();
    } catch (e2) { setErr(empErr(e2)); } finally { setBusy(false); }
  };

  return (
    <div className="emp-modal-back" onClick={onClose}>
      <form className="emp-modal" role="dialog" aria-modal="true" aria-label={editing ? 'Edit expense' : 'Add expense'} onClick={e => e.stopPropagation()} onSubmit={submit} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>{editing ? 'Edit expense' : 'Add expense'}</h2>
        {err && <div className="emp-msg err">{err}</div>}
        <div className="emp-grid c2">
          <div className="emp-field">
            <label htmlFor="bm-date">Date</label>
            <input id="bm-date" type="date" className="emp-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="emp-field">
            <label htmlFor="bm-cat">Category</label>
            <select id="bm-cat" className="emp-select" value={category} onChange={e => setCategory(e.target.value)} required>
              {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            {cat?.skipApproval && <div className="emp-hint">No approval needed</div>}
          </div>
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="bm-title">What it was for</label>
          <input id="bm-title" className="emp-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} required />
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="bm-vendor">Paid to / vendor</label>
          <input id="bm-vendor" className="emp-input" list="bm-vendors" value={vendor} onChange={e => setVendor(e.target.value)} maxLength={150} />
          <datalist id="bm-vendors">{vendors.map(v => <option key={v} value={v} />)}</datalist>
        </div>
        <div className="emp-grid c2" style={{ marginTop: 10 }}>
          <div className="emp-field">
            <label htmlFor="bm-amt">Amount ₹ (total incl. tax)</label>
            <input id="bm-amt" type="number" min="0" step="0.01" className="emp-input" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="emp-field">
            <label htmlFor="bm-gst">Of which GST ₹ (optional)</label>
            <input id="bm-gst" type="number" min="0" step="0.01" className="emp-input" value={gst} onChange={e => setGst(e.target.value)} />
          </div>
          <div className="emp-field">
            <label htmlFor="bm-inv">Invoice number</label>
            <input id="bm-inv" className="emp-input" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} maxLength={80} />
          </div>
          <div className="emp-field">
            <label htmlFor="bm-due">Due date (optional)</label>
            <input id="bm-due" type="date" className="emp-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="emp-field">
            <label htmlFor="bm-mode">Payment mode</label>
            <select id="bm-mode" className="emp-select" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
              <option value="">Not decided</option>
              {PAY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="bm-notes">Notes</label>
          <textarea id="bm-notes" className="emp-textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} />
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="bm-files">Invoice / bill (image or PDF, up to {MAX_FILES}, 5 MB each)</label>
          <input id="bm-files" ref={fileRef} type="file" multiple accept="image/*,application/pdf" disabled={uploading || files.length >= MAX_FILES} onChange={e => onFiles(e.target.files)} />
          {uploading && <div className="emp-hint">Uploading…</div>}
          {threshold > 0 && <div className="emp-hint">Attach the bill for anything above {inr(threshold)}.</div>}
          {files.length > 0 && (
            <div className="exp-chips">
              {files.map(f => (
                <span key={f.fileId} className="emp-chip">
                  {f.name}{' '}
                  <button type="button" className="exp-linkbtn" aria-label={`Remove ${f.name}`} onClick={() => setFiles(prev => prev.filter(x => x.fileId !== f.fileId))}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
        {!editing && canApprove && (
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={alreadyPaid} onChange={e => setAlreadyPaid(e.target.checked)} /> Already paid
            </label>
            {alreadyPaid && (
              <div className="emp-grid c2" style={{ marginTop: 8 }}>
                <div className="emp-field">
                  <label htmlFor="bm-paidon">Paid on</label>
                  <input id="bm-paidon" type="date" className="emp-input" value={paidOn} onChange={e => setPaidOn(e.target.value)} />
                </div>
                <div className="emp-field">
                  <label htmlFor="bm-ref">Payment reference</label>
                  <input id="bm-ref" className="emp-input" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}
        <div className="emp-actions" style={{ marginTop: 16 }}>
          <button type="submit" className="emp-btn good" disabled={busy || uploading}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add expense'}</button>
          <button type="button" className="emp-btn ghost" disabled={busy} onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default BillModal;
