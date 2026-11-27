import React, { useEffect, useState } from 'react';
import { leadFeeApi } from '../../api';

/**
 * Fee quote, discount and payment status on the lead page (server: PATCH /leads/:id/fee).
 * Was only on the old, un-routed lead page; brought back for the live one. Amounts in ₹.
 */
const PAYMENT_STATUS: Record<string, string> = {
  not_started: 'Not started',
  deposit_pending: 'Deposit pending',
  deposit_paid: 'Deposit paid',
  full_pending: 'Full payment pending',
  full_paid: 'Fully paid',
  refunded: 'Refunded',
};
const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const LeadFeeCard: React.FC<{ lead: any; onSaved: (msg: string) => void; onError: (msg: string) => void }> = ({ lead, onSaved, onError }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ feeQuote: '', feeDiscount: '0', paymentStatus: 'not_started', depositAmount: '', paymentNotes: '' });

  useEffect(() => {
    setForm({
      feeQuote: lead.feeQuote?.toString() || '',
      feeDiscount: lead.feeDiscount?.toString() || '0',
      paymentStatus: lead.paymentStatus || 'not_started',
      depositAmount: lead.depositAmount?.toString() || '',
      paymentNotes: lead.paymentNotes || '',
    });
  }, [lead.feeQuote, lead.feeDiscount, lead.paymentStatus, lead.depositAmount, lead.paymentNotes]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const net = (Number(form.feeQuote) || 0) - (Number(form.feeDiscount) || 0);

  const save = async () => {
    if (Number(form.feeDiscount) > Number(form.feeQuote || 0)) { onError('The discount is larger than the fee'); return; }
    setSaving(true);
    try {
      await leadFeeApi.update(lead._id, {
        feeQuote: form.feeQuote ? Number(form.feeQuote) : undefined,
        feeDiscount: form.feeDiscount ? Number(form.feeDiscount) : 0,
        paymentStatus: form.paymentStatus,
        depositAmount: form.depositAmount ? Number(form.depositAmount) : undefined,
        paymentNotes: form.paymentNotes,
      });
      setEditing(false);
      onSaved('Fee details saved');
    } catch (e: any) {
      onError(e.message || 'Could not save the fee');
    } finally { setSaving(false); }
  };

  return (
    <div className="ld2-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h4 className="mb-0">Fee &amp; payment</h4>
        <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setEditing(e => !e)}>{editing ? 'Cancel' : lead.feeQuote ? 'Edit' : 'Add'}</button>
      </div>
      {editing ? (
        <div className="d-flex flex-column gap-2">
          <div className="d-flex gap-2">
            <label className="small flex-fill">Fee (₹)<input type="number" min={0} className="form-control form-control-sm" value={form.feeQuote} onChange={set('feeQuote')} /></label>
            <label className="small flex-fill">Discount (₹)<input type="number" min={0} className="form-control form-control-sm" value={form.feeDiscount} onChange={set('feeDiscount')} /></label>
          </div>
          {form.feeQuote && <div className="small fw-semibold text-success">Net: {inr(net)}</div>}
          <label className="small">Payment status
            <select className="form-select form-select-sm" value={form.paymentStatus} onChange={set('paymentStatus')}>
              {Object.entries(PAYMENT_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {(form.paymentStatus === 'deposit_pending' || form.paymentStatus === 'deposit_paid') && (
            <label className="small">Deposit (₹)<input type="number" min={0} className="form-control form-control-sm" value={form.depositAmount} onChange={set('depositAmount')} /></label>
          )}
          <label className="small">Notes<textarea className="form-control form-control-sm" rows={2} value={form.paymentNotes} onChange={set('paymentNotes')} /></label>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      ) : lead.feeQuote ? (
        <div className="small">
          <div className="d-flex gap-3">
            <div><div className="text-muted">Fee</div><strong>{inr(lead.feeQuote)}</strong></div>
            {lead.feeDiscount > 0 && <div><div className="text-muted">Discount</div><strong className="text-danger">-{inr(lead.feeDiscount)}</strong></div>}
            <div><div className="text-muted">Net</div><strong className="text-success">{inr(lead.feeQuote - (lead.feeDiscount || 0))}</strong></div>
          </div>
          <span className="badge bg-light text-dark border mt-2">{PAYMENT_STATUS[lead.paymentStatus || 'not_started']}</span>
          {lead.depositAmount ? <div className="mt-1 text-muted">Deposit {inr(lead.depositAmount)}</div> : null}
          {lead.paymentNotes && <div className="mt-1 text-muted">{lead.paymentNotes}</div>}
        </div>
      ) : (
        <div className="small text-muted">No fee quoted yet.</div>
      )}
    </div>
  );
};

export default LeadFeeCard;
