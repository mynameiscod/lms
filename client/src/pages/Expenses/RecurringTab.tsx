import React, { useCallback, useEffect, useState } from 'react';
import '../Employees/employees.css';
import './expensesSetup.css';
import { companyApi, empErr, EmployeeConfig, RecurringItem } from '../../api/employeesApi';
import { PAY_MODES } from './BillModal';

const todayIn = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const EVERY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Every month' }, { value: 2, label: 'Every 2 months' }, { value: 3, label: 'Every 3 months (quarterly)' },
  { value: 4, label: 'Every 4 months' }, { value: 6, label: 'Every 6 months' }, { value: 12, label: 'Every year' },
];
const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const thisMonth = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 7);
const monthLabel = (m?: string) => (m && /^\d{4}-\d{2}$/.test(m) ? new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '');
const monthIndex = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
const indexMonth = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
/** First due month >= the current India month, bounded by endMonth. */
const nextDueMonth = (r: RecurringItem): string => {
  if (!/^\d{4}-\d{2}$/.test(r.startMonth)) return '';
  const step = Math.max(1, r.everyMonths || 1);
  const start = monthIndex(r.startMonth);
  const now = monthIndex(thisMonth());
  const idx = now <= start ? start : start + Math.ceil((now - start) / step) * step;
  const m = indexMonth(idx);
  return r.endMonth && m > r.endMonth ? '' : m;
};
const ordinal = (n: number) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th'}`;
};

interface Form {
  title: string; category: string; vendor: string; amount: string; gst: string; dayOfMonth: string;
  startMonth: string; endMonth: string; paymentMode: string; notes: string; active: boolean; everyMonths: string;
}

const emptyForm = (category: string): Form => ({
  title: '', category, vendor: '', amount: '', gst: '', dayOfMonth: '1', startMonth: thisMonth(), endMonth: '', paymentMode: PAY_MODES[0], notes: '', active: true, everyMonths: '1',
});

const toForm = (r: RecurringItem): Form => ({
  title: r.title, category: r.category, vendor: r.vendor || '', amount: String(r.amount), gst: r.gst ? String(r.gst) : '', dayOfMonth: String(r.dayOfMonth),
  startMonth: r.startMonth, endMonth: r.endMonth || '', paymentMode: r.paymentMode || PAY_MODES[0], notes: r.notes || '', active: r.active, everyMonths: String(r.everyMonths || 1),
});

const RecurringModal: React.FC<{
  config: EmployeeConfig; editing: RecurringItem | null; onClose: () => void; onSaved: (msg: string) => void;
}> = ({ config, editing, onClose, onSaved }) => {
  const cats = config.companyCategories.filter((c) => c.active || (editing && c.name === editing.category));
  const [f, setF] = useState<Form>(editing ? toForm(editing) : emptyForm(cats[0]?.name || ''));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (p: Partial<Form>) => setF((prev) => ({ ...prev, ...p }));
  const cat = config.companyCategories.find((c) => c.name === f.category);

  const submit = async () => {
    const amount = Number(f.amount);
    const day = Number(f.dayOfMonth);
    const gst = f.gst === '' ? 0 : Number(f.gst);
    if (!f.title.trim()) return setErr('Give this cost a title, like "Office rent".');
    if (!f.category) return setErr('Pick a category.');
    if (!Number.isFinite(amount) || amount <= 0) return setErr('Enter the amount in rupees for one payment.');
    if (!Number.isFinite(gst) || gst < 0) return setErr('GST cannot be negative.');
    if (!Number.isInteger(day) || day < 1 || day > 28) return setErr('Day of month must be between 1 and 28.');
    if (!f.startMonth) return setErr('Pick the month it starts.');
    if (f.endMonth && f.endMonth < f.startMonth) return setErr('The end month cannot be before the start month.');
    setBusy(true); setErr('');
    const body = {
      title: f.title.trim(), category: f.category, vendor: f.vendor.trim(), amount, gst, dayOfMonth: day,
      startMonth: f.startMonth, endMonth: f.endMonth || undefined, paymentMode: f.paymentMode, notes: f.notes.trim(), active: f.active, everyMonths: Number(f.everyMonths) || 1,
    };
    try {
      if (editing) await companyApi.updateRecurring(editing._id, body); else await companyApi.createRecurring(body);
      onSaved(editing ? 'Recurring expense updated.' : 'Recurring expense added.');
    } catch (e) { setErr(empErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="emp-modal-back" onClick={onClose}>
      <div className="emp-modal" role="dialog" aria-modal="true" aria-label={editing ? 'Edit recurring expense' : 'Add recurring expense'} onClick={(e) => e.stopPropagation()}>
        <h2>{editing ? 'Edit recurring expense' : 'Add recurring expense'}</h2>
        {err && <div className="emp-msg err" role="alert">{err}</div>}
        <div className="emp-grid c2">
          <div className="emp-field">
            <label htmlFor="rc-title">Title</label>
            <input id="rc-title" className="emp-input" placeholder="Office rent" value={f.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="emp-field">
            <label htmlFor="rc-cat">Category</label>
            <select id="rc-cat" className="emp-select" value={f.category} onChange={(e) => set({ category: e.target.value })}>
              {cats.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            {cat?.skipApproval && <p className="emp-hint">This category needs no approval: lines go straight to "approved to pay".</p>}
          </div>
          <div className="emp-field">
            <label htmlFor="rc-vendor">Vendor</label>
            <input id="rc-vendor" className="emp-input" value={f.vendor} onChange={(e) => set({ vendor: e.target.value })} />
          </div>
          <div className="emp-field">
            <label htmlFor="rc-mode">Payment mode</label>
            <select id="rc-mode" className="emp-select" value={f.paymentMode} onChange={(e) => set({ paymentMode: e.target.value })}>
              {PAY_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="emp-field">
            <label htmlFor="rc-every">Paid every</label>
            <select id="rc-every" className="emp-select" value={f.everyMonths} onChange={(e) => set({ everyMonths: e.target.value })}>
              {EVERY_OPTIONS.map((o) => <option key={o.value} value={String(o.value)}>{o.label}</option>)}
            </select>
            <p className="emp-hint">How often one payment is due. If you pay rent once for four months, choose every 4 months and enter the amount for the whole period.</p>
          </div>
          <div className="emp-field">
            <label htmlFor="rc-amt">{f.everyMonths === '1' ? 'Monthly amount ₹' : 'Amount per payment ₹'}</label>
            <input id="rc-amt" className="emp-input" type="number" min={0} value={f.amount} onChange={(e) => set({ amount: e.target.value })} />
          </div>
          <div className="emp-field">
            <label htmlFor="rc-gst">GST ₹ (optional)</label>
            <input id="rc-gst" className="emp-input" type="number" min={0} value={f.gst} onChange={(e) => set({ gst: e.target.value })} />
          </div>
          <div className="emp-field">
            <label htmlFor="rc-day">Day of month (1 to 28)</label>
            <input id="rc-day" className="emp-input" type="number" min={1} max={28} value={f.dayOfMonth} onChange={(e) => set({ dayOfMonth: e.target.value })} />
          </div>
          <div className="emp-field">
            <label htmlFor="rc-start">Starts in</label>
            <input id="rc-start" className="emp-input" type="month" value={f.startMonth} onChange={(e) => set({ startMonth: e.target.value })} />
          </div>
          <div className="emp-field">
            <label htmlFor="rc-end">Ends in (optional)</label>
            <input id="rc-end" className="emp-input" type="month" value={f.endMonth} onChange={(e) => set({ endMonth: e.target.value })} />
            <p className="emp-hint">Leave empty to continue until you switch it off.</p>
          </div>
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="rc-notes">Notes</label>
          <textarea id="rc-notes" className="emp-textarea" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
        </div>
        <label className="exp-check" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} /> Active
        </label>
        <div className="emp-actions" style={{ marginTop: 14 }}>
          <button type="button" className="emp-btn" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" className="emp-btn ghost" disabled={busy} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const PayAheadModal: React.FC<{ item: RecurringItem; onClose: () => void; onDone: (labels: string[]) => void }> = ({ item, onClose, onDone }) => {
  const every = item.everyMonths || 1;
  const [periods, setPeriods] = useState('1');
  const [mode, setMode] = useState(item.paymentMode && PAY_MODES.includes(item.paymentMode) ? item.paymentMode : PAY_MODES[0]);
  const [ref, setRef] = useState('');
  const [paidOn, setPaidOn] = useState(todayIn());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const n = Number(periods);
  const submit = async () => {
    if (!Number.isInteger(n) || n < 1 || n > 12) return setErr('Enter a number from 1 to 12.');
    if (!paidOn) return setErr('Pick the date it was paid.');
    setBusy(true); setErr('');
    try {
      const r = await companyApi.payAhead(item._id, { periods: n, paymentMode: mode, paymentRef: ref.trim() || undefined, paidOn });
      onDone(r.labels);
    } catch (e) { setErr(empErr(e)); } finally { setBusy(false); }
  };
  return (
    <div className="emp-modal-back" onClick={onClose}>
      <div className="emp-modal" role="dialog" aria-modal="true" aria-label={`Pay ahead: ${item.title}`} onClick={(e) => e.stopPropagation()}>
        <h2>Pay ahead: {item.title}</h2>
        {err && <div className="emp-msg err" role="alert">{err}</div>}
        <div className="emp-field">
          <label htmlFor="pa-n">How many payments to cover ({every === 1 ? 'months' : 'payments'}, 1 to 12)</label>
          <input id="pa-n" className="emp-input" type="number" min={1} max={12} value={periods} onChange={(e) => setPeriods(e.target.value)} />
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="pa-mode">Payment mode</label>
          <select id="pa-mode" className="emp-select" value={mode} onChange={(e) => setMode(e.target.value)}>
            {PAY_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="pa-ref">Reference (transaction id, cheque no.)</label>
          <input id="pa-ref" className="emp-input" value={ref} onChange={(e) => setRef(e.target.value)} />
        </div>
        <div className="emp-field" style={{ marginTop: 10 }}>
          <label htmlFor="pa-on">Paid on</label>
          <input id="pa-on" type="date" className="emp-input" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </div>
        <p className="emp-hint">Adds the next {Number.isInteger(n) && n > 0 ? n : 'N'} payments to the ledger and marks them all paid together with this reference. Anything already paid is skipped.</p>
        <div className="emp-actions" style={{ marginTop: 14 }}>
          <button type="button" className="emp-btn good" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Pay now'}</button>
          <button type="button" className="emp-btn ghost" disabled={busy} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const RecurringTab: React.FC<{ config: EmployeeConfig; canManage: boolean; onChanged?: () => void }> = ({ config, canManage, onChanged }) => {
  const [rows, setRows] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [modal, setModal] = useState<{ item: RecurringItem | null } | null>(null);
  const [aheadItem, setAheadItem] = useState<RecurringItem | null>(null);
  const [busyId, setBusyId] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await companyApi.recurring()); setErr(''); }
    catch (e) { setErr(empErr(e, 'Could not load recurring expenses')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (r: RecurringItem) => {
    setBusyId(r._id); setMsg(null);
    try { await companyApi.updateRecurring(r._id, { active: !r.active }); await load(); }
    catch (e) { setMsg({ text: empErr(e), bad: true }); } finally { setBusyId(''); }
  };

  const remove = async (r: RecurringItem) => {
    if (!window.confirm(`Delete "${r.title}"? Lines already added to the ledger stay.`)) return;
    setBusyId(r._id); setMsg(null);
    try { await companyApi.deleteRecurring(r._id); setMsg({ text: 'Recurring expense deleted.', bad: false }); await load(); }
    catch (e) { setMsg({ text: empErr(e), bad: true }); } finally { setBusyId(''); }
  };

  const generate = async () => {
    setGenerating(true); setMsg(null);
    try {
      const r = await companyApi.generateRecurring();
      setMsg({
        text: r.added === 0 ? 'Nothing to add: everything for this month is already in the ledger.' : `Added ${r.added} line${r.added === 1 ? '' : 's'}.`,
        bad: false,
      });
    } catch (e) { setMsg({ text: empErr(e), bad: true }); } finally { setGenerating(false); }
  };

  const paidAhead = (labels: string[]) => {
    setAheadItem(null);
    setMsg({ text: `Paid: ${labels.join(', ')}`, bad: false });
    load();
    if (onChanged) onChanged();
  };

  const saved = (text: string) => { setModal(null); setMsg({ text, bad: false }); load(); };

  return (
    <div className="emp-card">
      <p className="emp-hint" style={{ marginTop: 0 }}>Set a cost once (like rent) and its line is added to the ledger every month automatically, on its day.</p>
      <p className="emp-hint">Paid late, or paid for several months at once? Open the Ledger and select the lines, or use Pay ahead for months that have not come yet.</p>
      {msg && <div className={`emp-msg ${msg.bad ? 'err' : 'ok'}`} role={msg.bad ? 'alert' : 'status'}>{msg.text}</div>}
      {canManage && (
        <div className="exp-toolbar">
          <button type="button" className="emp-btn" onClick={() => setModal({ item: null })}>＋ Add recurring expense</button>
          <button type="button" className="emp-btn ghost" disabled={generating} onClick={generate}>{generating ? 'Adding…' : "Add this month's lines now"}</button>
        </div>
      )}
      {err && <div className="emp-msg err" role="alert">{err}</div>}
      {loading ? <div className="emp-empty">Loading…</div> : rows.length === 0 && !err ? (
        <div className="emp-empty">No recurring expenses yet.{canManage ? ' Add rent, subscriptions and other monthly costs here.' : ''}</div>
      ) : rows.length > 0 && (
        <div className="emp-table-wrap">
          <table className="emp-table">
            <thead>
              <tr><th>Title</th><th>Category</th><th>Vendor</th><th className="num">Amount</th><th>Schedule</th><th>Period</th><th>Status</th>{canManage && <th aria-label="Actions" />}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className={r.active ? '' : 'exp-row-off'}>
                  <td><b>{r.title}</b></td>
                  <td>{r.category}</td>
                  <td>{r.vendor || '—'}</td>
                  <td className="num">{inr(r.amount)}</td>
                  <td>
                    <div>{r.everyMonths > 1 ? `every ${r.everyMonths} months` : 'every month'} on the {ordinal(r.dayOfMonth)}</div>
                    {r.active && nextDueMonth(r) && <div className="exp-sub">Next: {monthLabel(nextDueMonth(r))}</div>}
                  </td>
                  <td>{monthLabel(r.startMonth)} → {r.endMonth ? monthLabel(r.endMonth) : 'ongoing'}</td>
                  <td><span className={`emp-badge ${r.active ? 'green' : 'grey'}`}>{r.active ? 'Active' : 'Off'}</span></td>
                  {canManage && (
                    <td>
                      <div className="exp-actions">
                        {r.active && <button type="button" className="emp-btn sm" disabled={busyId === r._id} onClick={() => setAheadItem(r)}>Pay ahead</button>}
                        <button type="button" className="emp-btn ghost sm" disabled={busyId === r._id} onClick={() => setModal({ item: r })}>Edit</button>
                        <button type="button" className="emp-btn ghost sm" disabled={busyId === r._id} onClick={() => toggle(r)}>{r.active ? 'Switch off' : 'Switch on'}</button>
                        <button type="button" className="emp-btn danger sm" disabled={busyId === r._id} onClick={() => remove(r)}>Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {aheadItem && <PayAheadModal item={aheadItem} onClose={() => setAheadItem(null)} onDone={paidAhead} />}
      {modal && <RecurringModal config={config} editing={modal.item} onClose={() => setModal(null)} onSaved={saved} />}
    </div>
  );
};

export default RecurringTab;
