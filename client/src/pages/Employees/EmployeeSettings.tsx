import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks';
import { userCan } from '../../utils/permissions';
import { employeesApi, empErr, EmployeeConfig, ExpenseCategory, CompanyCategory } from '../../api/employeesApi';
import './employees.css';
import './employeesAdmin.css';

type ListKey = 'departments' | 'designations' | 'employmentTypes' | 'workLocations' | 'documentTypes' | 'activityCategories';
const LISTS: { k: ListKey; label: string }[] = [
  { k: 'departments', label: 'Departments' }, { k: 'designations', label: 'Designations' }, { k: 'employmentTypes', label: 'Employment types' },
  { k: 'workLocations', label: 'Work locations' }, { k: 'documentTypes', label: 'Document types' }, { k: 'activityCategories', label: 'Daily-activity categories' },
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KEY_RE = /^[A-Za-z][A-Za-z0-9_]*$/;
const PREFIX_RE = /^[A-Za-z0-9]{1,8}$/;

const ChipList: React.FC<{ id: string; label: string; items: string[]; onChange: (v: string[]) => void; disabled: boolean }> = ({ id, label, items, onChange, disabled }) => {
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim();
    if (!v || items.some((i) => i.toLowerCase() === v.toLowerCase())) { setText(''); return; }
    onChange([...items, v]); setText('');
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="emp-label" style={{ marginBottom: 6 }}>{label}</div>
      <div className="emp-chips">
        {items.map((i) => (
          <span key={i} className="emp-chip on" style={{ cursor: 'default' }}>
            {i}
            {!disabled && items.length > 1 && <button type="button" className="x" aria-label={`Remove ${i}`} onClick={() => onChange(items.filter((x) => x !== i))}>×</button>}
          </span>
        ))}
      </div>
      {!disabled && (
        <div className="emp-row">
          <label htmlFor={id} className="emp-label" style={{ position: 'absolute', left: -9999 }}>Add to {label}</label>
          <input id={id} className="emp-input" style={{ maxWidth: 260 }} placeholder="Add new…" value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
          <button type="button" className="emp-btn ghost sm" onClick={add}>Add</button>
        </div>
      )}
    </div>
  );
};

const Num: React.FC<{ id: string; label: string; value: number; onChange: (n: number) => void; hint?: string; disabled: boolean; step?: string }> = ({ id, label, value, onChange, hint, disabled, step }) => (
  <div className="emp-field">
    <label htmlFor={id}>{label}</label>
    <input id={id} className="emp-input" type="number" min={0} step={step} value={Number.isFinite(value) ? value : 0} disabled={disabled} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
    {hint && <p className="emp-hint">{hint}</p>}
  </div>
);

const Radio: React.FC<{ name: string; value: string; current: string; label: string; onPick: (v: string) => void; disabled: boolean }> = ({ name, value, current, label, onPick, disabled }) => (
  <label className="emp-radio">
    <input type="radio" name={name} value={value} checked={current === value} disabled={disabled} onChange={() => onPick(value)} /> {label}
  </label>
);

const EmployeeSettings: React.FC = () => {
  const { user } = useAuth();
  const canManage = userCan(user, ['manage_employees']);
  const [cfg, setCfg] = useState<EmployeeConfig | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => { employeesApi.config().then(setCfg).catch((e) => setLoadErr(empErr(e, 'Could not load settings'))); }, []);

  if (loadErr) return <div className="emp-page"><div className="emp-msg err" role="alert">{loadErr}</div></div>;
  if (!cfg) return <div className="emp-page"><div className="emp-empty">Loading settings…</div></div>;

  const ro = !canManage;
  const patch = (p: Partial<EmployeeConfig>) => setCfg({ ...cfg, ...p });
  const ep = cfg.expensePolicy;
  const ap = cfg.activityPolicy;
  const setEp = (p: Partial<EmployeeConfig['expensePolicy']>) => patch({ expensePolicy: { ...ep, ...p } });
  const setAp = (p: Partial<EmployeeConfig['activityPolicy']>) => patch({ activityPolicy: { ...ap, ...p } });
  const setCat = (i: number, p: Partial<ExpenseCategory>) => patch({ expenseCategories: cfg.expenseCategories.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const cp = cfg.companyPolicy || { allowSelfApproval: true, invoiceRequiredAbove: 0 };
  const setCp = (p: Partial<EmployeeConfig['companyPolicy']>) => patch({ companyPolicy: { ...cp, ...p } });
  const setCo = (i: number, p: Partial<CompanyCategory>) => patch({ companyCategories: cfg.companyCategories.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const setField = (i: number, p: Partial<EmployeeConfig['customFields'][number]>) => patch({ customFields: cfg.customFields.map((c, j) => (j === i ? { ...c, ...p } : c)) });

  const save = async () => {
    const fail = (t: string) => { setMsg({ kind: 'err', text: t }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    if (!PREFIX_RE.test(cfg.codePrefix)) return fail('The employee id prefix must be 1 to 8 letters or numbers.');
    const keys = cfg.customFields.map((f) => f.key);
    if (cfg.customFields.some((f) => !KEY_RE.test(f.key) || !f.label.trim())) return fail('Each extra field needs a label and a key that starts with a letter (letters, numbers, underscore).');
    if (new Set(keys).size !== keys.length) return fail('Extra field keys must be unique.');
    if (cfg.expenseCategories.some((c) => !c.name.trim())) return fail('Every expense category needs a name.');
    if (cfg.companyCategories.length === 0) return fail('Add at least one company expense category.');
    if (cfg.companyCategories.some((c) => !c.name.trim())) return fail('Every company expense category needs a name.');
    if (ap.workingDays.length === 0) return fail('Pick at least one working day.');
    setBusy(true); setMsg(null);
    try {
      const saved = await employeesApi.saveConfig(cfg);
      setCfg(saved);
      setMsg({ kind: 'ok', text: 'Settings saved.' });
    } catch (e) { fail(empErr(e)); } finally { setBusy(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  const SaveBtn = canManage ? <button type="button" className="emp-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button> : null;

  return (
    <div className="emp-page">
      <div className="emp-head emp-savebar">
        <div><h1>Employee settings</h1><p className="emp-sub">Lists, ids, extra fields, expense rules and daily-activity rules.</p></div>
        {SaveBtn}
      </div>
      {ro && <div className="emp-msg info">You can view these settings but not change them.</div>}
      {msg && <div className={`emp-msg ${msg.kind}`} role={msg.kind === 'err' ? 'alert' : 'status'}>{msg.text}</div>}

      <div className="emp-card">
        <h2>Lists</h2>
        {LISTS.map((l) => <ChipList key={l.k} id={`list-${l.k}`} label={l.label} items={cfg[l.k]} onChange={(v) => patch({ [l.k]: v } as Partial<EmployeeConfig>)} disabled={ro} />)}
      </div>

      <div className="emp-card">
        <h2>Employee id</h2>
        <div className="emp-field" style={{ maxWidth: 260 }}>
          <label htmlFor="code-prefix">Prefix (1 to 8 letters or numbers)</label>
          <input id="code-prefix" className="emp-input" maxLength={8} value={cfg.codePrefix} disabled={ro} onChange={(e) => patch({ codePrefix: e.target.value.replace(/[^A-Za-z0-9]/g, '') })} />
          <p className="emp-hint">Preview: <b>{cfg.codePrefix || 'EMP'}-0001</b></p>
        </div>
      </div>

      <div className="emp-card">
        <h2>Extra employee fields</h2>
        <p className="emp-hint" style={{ marginTop: 0 }}>These appear on every employee's profile.</p>
        <div className="emp-rowlist">
          {cfg.customFields.map((f, i) => (
            <div className="emp-rowlist-item" key={i}>
              <div className="emp-field"><label htmlFor={`cf-key-${i}`}>Key</label>
                <input id={`cf-key-${i}`} className="emp-input" value={f.key} disabled={ro} onChange={(e) => setField(i, { key: e.target.value })} /></div>
              <div className="emp-field"><label htmlFor={`cf-label-${i}`}>Label</label>
                <input id={`cf-label-${i}`} className="emp-input" value={f.label} disabled={ro} onChange={(e) => setField(i, { label: e.target.value })} /></div>
              <label className="emp-row" style={{ fontSize: 13 }}>
                <input type="checkbox" checked={!!f.required} disabled={ro} onChange={(e) => setField(i, { required: e.target.checked })} /> Required
              </label>
              {!ro && <button type="button" className="emp-btn ghost sm" aria-label={`Remove field ${i + 1}`} onClick={() => patch({ customFields: cfg.customFields.filter((_, j) => j !== i) })}>Remove</button>}
            </div>
          ))}
          {cfg.customFields.length === 0 && <div className="emp-muted" style={{ fontSize: 13 }}>No extra fields.</div>}
          {!ro && <div><button type="button" className="emp-btn ghost sm" onClick={() => patch({ customFields: [...cfg.customFields, { key: '', label: '', required: false }] })}>Add field</button></div>}
        </div>
      </div>

      <div className="emp-card">
        <h2>Employee claim categories</h2>
        <p className="emp-hint" style={{ marginTop: 0 }}>For expenses employees claim back from the company (travel, meals ...).</p>
        {cfg.expenseCategories.length > 0 && (
          <div className="emp-table-wrap">
            <table className="emp-table">
              <thead><tr><th>Name</th><th>Daily limit ₹ (0 = none)</th><th>Receipt required above ₹ (0 = use general rule)</th><th>Active</th><th /></tr></thead>
              <tbody>
                {cfg.expenseCategories.map((c, i) => (
                  <tr key={i}>
                    <td><input aria-label={`Category ${i + 1} name`} className="emp-input" value={c.name} disabled={ro} onChange={(e) => setCat(i, { name: e.target.value })} /></td>
                    <td><input aria-label={`Category ${i + 1} daily limit`} className="emp-input" type="number" min={0} value={c.dailyLimit} disabled={ro} onChange={(e) => setCat(i, { dailyLimit: Number(e.target.value) || 0 })} /></td>
                    <td><input aria-label={`Category ${i + 1} receipt threshold`} className="emp-input" type="number" min={0} value={c.receiptRequiredAbove} disabled={ro} onChange={(e) => setCat(i, { receiptRequiredAbove: Number(e.target.value) || 0 })} /></td>
                    <td><input aria-label={`Category ${i + 1} active`} type="checkbox" checked={c.active} disabled={ro} onChange={(e) => setCat(i, { active: e.target.checked })} /></td>
                    <td>{!ro && <button type="button" className="emp-btn ghost sm" onClick={() => patch({ expenseCategories: cfg.expenseCategories.filter((_, j) => j !== i) })}>Remove</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!ro && <div style={{ marginTop: 8 }}><button type="button" className="emp-btn ghost sm" onClick={() => patch({ expenseCategories: [...cfg.expenseCategories, { name: '', dailyLimit: 0, receiptRequiredAbove: 0, active: true }] })}>Add category</button></div>}
      </div>

      <div className="emp-card">
        <h2>Employee claim rules</h2>
        <p className="emp-hint" style={{ marginTop: 0 }}>For expenses employees claim back from the company (travel, meals ...).</p>
        <div className="emp-label" style={{ marginBottom: 6 }}>Who approves expenses</div>
        <Radio name="appr" value="reporting_manager" current={ep.approvalMode} disabled={ro} onPick={(v) => setEp({ approvalMode: v as typeof ep.approvalMode })} label="The employee's reporting manager approves" />
        <Radio name="appr" value="approvers" current={ep.approvalMode} disabled={ro} onPick={(v) => setEp({ approvalMode: v as typeof ep.approvalMode })} label="Only people with the approve-expenses permission" />
        <Radio name="appr" value="manager_then_approver" current={ep.approvalMode} disabled={ro} onPick={(v) => setEp({ approvalMode: v as typeof ep.approvalMode })} label="Manager first, then someone with the approve-expenses permission" />
        <div className="emp-grid c3" style={{ marginTop: 12 }}>
          <Num id="ep-rec" label="Receipt required above ₹" value={ep.receiptRequiredAbove} onChange={(n) => setEp({ receiptRequiredAbove: n })} disabled={ro} hint="0 = receipts never required." />
          <Num id="ep-day" label="Daily limit ₹" value={ep.dailyLimit} onChange={(n) => setEp({ dailyLimit: n })} disabled={ro} hint="0 = no limit." />
          <Num id="ep-mon" label="Monthly limit ₹" value={ep.monthlyLimit} onChange={(n) => setEp({ monthlyLimit: n })} disabled={ro} hint="0 = no limit." />
          <Num id="ep-auto" label="Auto-approve claims up to ₹" value={ep.autoApproveBelow} onChange={(n) => setEp({ autoApproveBelow: n })} disabled={ro} hint="0 = off, every claim is reviewed." />
          <Num id="ep-back" label="Days back an expense can be claimed" value={ep.maxBackdateDays} onChange={(n) => setEp({ maxBackdateDays: n })} disabled={ro} hint="0 = only today." />
        </div>
      </div>

      <div className="emp-card">
        <h2>Company expense categories</h2>
        <p className="emp-hint" style={{ marginTop: 0 }}>What the company spends money on: rent, software, ads, salaries ... A category marked 'no approval needed' goes straight to 'approved to pay'.</p>
        <div className="emp-table-wrap">
          <table className="emp-table">
            <thead><tr><th>Name</th><th>No approval needed</th><th>Active</th><th /></tr></thead>
            <tbody>
              {cfg.companyCategories.map((c, i) => (
                <tr key={i}>
                  <td><input aria-label={`Company category ${i + 1} name`} className="emp-input" value={c.name} disabled={ro} onChange={(e) => setCo(i, { name: e.target.value })} /></td>
                  <td><input aria-label={`Company category ${i + 1} no approval needed`} type="checkbox" checked={c.skipApproval} disabled={ro} onChange={(e) => setCo(i, { skipApproval: e.target.checked })} /></td>
                  <td><input aria-label={`Company category ${i + 1} active`} type="checkbox" checked={c.active} disabled={ro} onChange={(e) => setCo(i, { active: e.target.checked })} /></td>
                  <td>{!ro && cfg.companyCategories.length > 1 && <button type="button" className="emp-btn ghost sm" onClick={() => patch({ companyCategories: cfg.companyCategories.filter((_, j) => j !== i) })}>Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!ro && <div style={{ marginTop: 8 }}><button type="button" className="emp-btn ghost sm" onClick={() => patch({ companyCategories: [...cfg.companyCategories, { name: '', skipApproval: false, active: true }] })}>Add category</button></div>}
      </div>

      <div className="emp-card">
        <h2>Company expense rules</h2>
        <label className="emp-radio"><input type="checkbox" checked={cp.allowSelfApproval} disabled={ro} onChange={(e) => setCp({ allowSelfApproval: e.target.checked })} /> The person who recorded an expense may approve it themselves</label>
        <p className="emp-hint">Turn off to make a second person approve every bill.</p>
        <div className="emp-grid c3" style={{ marginTop: 12 }}>
          <Num id="cp-inv" label="Bill or invoice must be attached above ₹" value={cp.invoiceRequiredAbove} onChange={(n) => setCp({ invoiceRequiredAbove: n })} disabled={ro} hint="0 = never required." />
        </div>
      </div>

      <div className="emp-card">
        <h2>Daily activity rules</h2>
        <div className="emp-grid c3">
          <Num id="ap-hours" label="Expected hours per day" step="0.5" value={ap.expectedHours} onChange={(n) => setAp({ expectedHours: n })} disabled={ro} />
          <div className="emp-field">
            <label htmlFor="ap-late">Late check-in after</label>
            <input id="ap-late" className="emp-input" type="time" value={ap.lateCheckInAfter || ''} disabled={ro} onChange={(e) => setAp({ lateCheckInAfter: e.target.value })} />
          </div>
          <Num id="ap-edit" label="Editable days (how many days back a log can be filled or submitted)" value={ap.editableDays} onChange={(n) => setAp({ editableDays: n })} disabled={ro} />
        </div>
        <div className="emp-label" style={{ margin: '12px 0 6px' }}>Working days</div>
        <div className="emp-chips" role="group" aria-label="Working days">
          {DAYS.map((name, i) => {
            const on = ap.workingDays.includes(i);
            return (
              <button key={name} type="button" aria-pressed={on} disabled={ro} className={`emp-chip${on ? ' on' : ''}`}
                onClick={() => setAp({ workingDays: on ? ap.workingDays.filter((x) => x !== i) : [...ap.workingDays, i].sort() })}>{name}</button>
            );
          })}
        </div>
        <label className="emp-radio"><input type="checkbox" checked={ap.requireCheckIn} disabled={ro} onChange={(e) => setAp({ requireCheckIn: e.target.checked })} /> Require check-in</label>
        <label className="emp-radio"><input type="checkbox" checked={ap.requireEodSubmit} disabled={ro} onChange={(e) => setAp({ requireEodSubmit: e.target.checked })} /> Require end-of-day submit</label>
        <div className="emp-label" style={{ margin: '12px 0 6px' }}>Review</div>
        <Radio name="rev" value="manager" current={ap.reviewMode} disabled={ro} onPick={(v) => setAp({ reviewMode: v as typeof ap.reviewMode })} label="The reporting manager signs off" />
        <Radio name="rev" value="reviewers" current={ap.reviewMode} disabled={ro} onPick={(v) => setAp({ reviewMode: v as typeof ap.reviewMode })} label="Only people with the review permission" />
        <Radio name="rev" value="none" current={ap.reviewMode} disabled={ro} onPick={(v) => setAp({ reviewMode: v as typeof ap.reviewMode })} label="No review: submitting is final" />
      </div>

      {SaveBtn}
    </div>
  );
};

export default EmployeeSettings;
