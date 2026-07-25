import React, { useCallback, useEffect, useState } from 'react';
import { paymentApi, payFeeCheckout, FeeInfo } from '../../api/paymentApi';

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

/**
 * Self-contained "Pay Fees Online" card. Reads the student's Fee via /payments/fee-info
 * and renders a mode-driven pay action (full / installments / partial). Renders nothing
 * when online payment isn't configured or there's no outstanding due.
 */
const PayFeesCard: React.FC = () => {
  const [info, setInfo] = useState<FeeInfo | null>(null);
  const [busy, setBusy] = useState('');       // which action is in flight
  const [msg, setMsg] = useState('');
  const [amount, setAmount] = useState('');    // partial mode

  const load = useCallback(async () => {
    try { setInfo(await paymentApi.getFeeInfo()); } catch { setInfo(null); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!info || !info.available || !info.fee || (info.fee.dueAmount || 0) <= 0) return null;
  const fee = info.fee;

  const pay = async (opts: { installmentId?: string; amount?: number }, key: string) => {
    setBusy(key); setMsg('');
    try {
      const paid = await payFeeCheckout({ feeId: fee.feeId, ...opts });
      if (paid) { setMsg('✅ Payment successful — thank you!'); setAmount(''); await load(); }
    } catch (e: any) {
      setMsg(e?.response?.data?.message || e?.message || 'Payment could not be completed.');
    }
    setBusy('');
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 14, padding: '18px 20px', margin: '0 0 18px', boxShadow: '0 1px 3px rgba(16,24,40,.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>💳 Pay Fees Online</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            Outstanding due: <b style={{ color: '#dc2626' }}>{inr(fee.dueAmount)}</b>
            <span style={{ color: '#94a3b8' }}> · paid {inr(fee.paidAmount)} of {inr(fee.totalAmount)}</span>
          </div>
        </div>
        {info.mode === 'full' && (
          <button disabled={busy !== ''} onClick={() => pay({}, 'full')}
            style={{ background: 'linear-gradient(90deg,#6650d8,#14a89c)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy === 'full' ? 'Opening…' : `Pay ${inr(fee.dueAmount)}`}
          </button>
        )}
      </div>

      {info.mode === 'partial' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: 13, color: '#475569' }}>Amount ₹</span>
          <input type="number" min={1} max={fee.dueAmount} value={amount} onChange={e => setAmount(e.target.value)}
            placeholder={String(fee.dueAmount)} style={{ width: 140, padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 14 }} />
          <button disabled={busy !== '' || !amount || Number(amount) <= 0 || Number(amount) > fee.dueAmount} onClick={() => pay({ amount: Number(amount) }, 'partial')}
            style={{ background: '#6650d8', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy === 'partial' ? 'Opening…' : 'Pay'}
          </button>
        </div>
      )}

      {info.mode === 'installments' && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fee.installments.filter(i => i.status !== 'paid').length === 0 && (
            <div style={{ fontSize: 13, color: '#16a34a' }}>All installments paid.</div>
          )}
          {fee.installments.map((inst, i) => (
            <div key={inst.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: '1px solid #eef1f6', borderRadius: 9, padding: '8px 12px' }}>
              <span style={{ fontSize: 13.5, color: '#334155' }}>
                {inst.label || `Installment ${i + 1}`} — <b>{inr(inst.amount)}</b>
                {inst.dueDate && <span style={{ color: '#94a3b8' }}> · due {new Date(inst.dueDate).toLocaleDateString('en-IN')}</span>}
              </span>
              {inst.status === 'paid'
                ? <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Paid ✓</span>
                : <button disabled={busy !== ''} onClick={() => pay({ installmentId: inst.id }, inst.id)}
                    style={{ background: '#6650d8', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                    {busy === inst.id ? 'Opening…' : 'Pay'}
                  </button>}
            </div>
          ))}
        </div>
      )}

      {msg && <div style={{ marginTop: 12, fontSize: 13, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{msg}</div>}
    </div>
  );
};

export default PayFeesCard;
