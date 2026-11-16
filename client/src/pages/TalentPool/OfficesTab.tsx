import React, { useEffect, useState } from 'react';
import { talentPoolApi, Partner, Column, Meta, ShareRow, STATUS_LABEL, STATUS_ORDER, TalentStatus, InviteResult } from '../../api/talentPoolApi';
import { StatusPill, fmtDate } from './shared';
import CandidateProfile from './CandidateProfile';
import OfficeWorkspace from './OfficeWorkspace';

/* ── Office form, with the office's own Excel columns ──────────────────── */
const ColumnEditor: React.FC<{ meta: Meta; value: Column[]; onChange: (c: Column[]) => void }> = ({ meta, value, onChange }) => {
  // Every field is listed: ticked ones in the office's order, then the rest.
  const chosen = value.length ? value : meta.defaultColumns;
  const rest = meta.fields.filter(f => !chosen.some(c => c.field === f.key)).map(f => ({ field: f.key, label: f.label }));
  const rows = [...chosen.map(c => ({ ...c, on: true })), ...rest.map(c => ({ ...c, on: false }))];
  const emit = (r: typeof rows) => onChange(r.filter(x => x.on).map(({ field, label }) => ({ field, label })));
  const move = (i: number, d: number) => { const r = [...rows]; const j = i + d; if (j < 0 || j >= r.length || !r[j].on) return; [r[i], r[j]] = [r[j], r[i]]; emit(r); };
  const fieldLabel = (k: string) => meta.fields.find(f => f.key === k)?.label || k;
  return (
    <div className="tp-cols">
      <p className="tp-hint">Tick the columns this office wants, rename them to match their sheet ("SSC %" instead of "10th %"), and set the order. Their Excel download always uses this.</p>
      {rows.map((r, i) => (
        <div key={r.field} className={`tp-col ${r.on ? '' : 'off'}`}>
          <input type="checkbox" checked={r.on} onChange={e => { const n = [...rows]; n[i] = { ...r, on: e.target.checked }; emit(n); }} />
          <span>{fieldLabel(r.field)}</span>
          <input type="text" value={r.label} disabled={!r.on} onChange={e => { const n = [...rows]; n[i] = { ...r, label: e.target.value }; emit(n); }} />
          <span className="tp-arrows">{r.on && <><button type="button" onClick={() => move(i, -1)}>▲</button><button type="button" onClick={() => move(i, 1)}>▼</button></>}</span>
        </div>
      ))}
      <div><button type="button" className="tp-link" onClick={() => onChange([])}>Reset to default columns</button></div>
    </div>
  );
};

const OfficeForm: React.FC<{ meta: Meta; initial: Partial<Partner>; onClose: () => void; onSaved: () => void }> = ({ meta, initial, onClose, onSaved }) => {
  const [f, setF] = useState<Partial<Partner>>({ exportColumns: [], ...initial });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr(''); setBusy(true);
    try { await talentPoolApi.savePartner(f); onSaved(); onClose(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const set = (k: keyof Partner) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="tp-overlay" onClick={onClose}>
      <div className="tp-panel" onClick={e => e.stopPropagation()}>
        <div className="tp-panel-head"><div><h3>{f._id ? 'Edit office' : 'Add placement office'}</h3><p>The email becomes the office's login.</p></div><button className="tp-x" onClick={onClose}>×</button></div>
        {err && <div className="tp-err">{err}</div>}
        <div className="tp-form">
          <label>Office name *<input autoFocus value={f.name || ''} onChange={set('name')} /></label>
          <label>Contact person<input value={f.contactName || ''} onChange={set('contactName')} /></label>
          <label>Email (login) *<input type="email" value={f.email || ''} onChange={set('email')} /></label>
          <label>Phone<input value={f.phone || ''} onChange={set('phone')} /></label>
          <label>City<input value={f.city || ''} onChange={set('city')} /></label>
          <label className="full">Notes<textarea rows={2} value={f.notes || ''} onChange={set('notes')} /></label>
          <h5>Excel columns for this office</h5>
          <div className="full"><ColumnEditor meta={meta} value={f.exportColumns || []} onChange={c => setF({ ...f, exportColumns: c })} /></div>
        </div>
        <div className="tp-actions"><button className="tp-btn" onClick={onClose}>Cancel</button><button className="tp-btn primary" disabled={busy} onClick={save}>Save</button></div>
      </div>
    </div>
  );
};

/* ── One office's list, as the office sees it ─────────────────────────── */
const OfficeList: React.FC<{ partner: Partner; canManage: boolean; onClose: () => void; onChanged: () => void }> = ({ partner, canManage, onClose, onChanged }) => {
  const [rows, setRows] = useState<ShareRow[] | null>(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<TalentStatus | ''>('');
  const [open, setOpen] = useState<ShareRow | null>(null);
  const load = () => talentPoolApi.partnerShares(partner._id).then(d => setRows(d.rows)).catch(e => setErr(e.message));
  useEffect(() => { load(); }, [partner._id]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (fn: () => Promise<any>) => { setErr(''); try { await fn(); await load(); onChanged(); } catch (e: any) { setErr(e.message); } };
  const shown = (rows || []).filter(r => !filter || r.status === filter);
  return (
    <div className="tp-overlay" onClick={onClose}>
      <div className="tp-panel wide" onClick={e => e.stopPropagation()}>
        <div className="tp-panel-head">
          <div><h3>{partner.name}</h3><p>{rows ? `${rows.length} candidates shared` : 'Loading…'} · exactly what this office sees</p></div>
          <div className="tp-actions"><button className="tp-btn" onClick={() => talentPoolApi.exportPartner(partner._id).catch(e => setErr(e.message))}><i className="fa-solid fa-file-excel" /> Their Excel</button><button className="tp-x" onClick={onClose}>×</button></div>
        </div>
        {err && <div className="tp-err">{err}</div>}
        <div className="tp-toolbar">
          <select value={filter} onChange={e => setFilter(e.target.value as any)}><option value="">All statuses</option>{STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
        </div>
        {open ? (
          <div className="tp-card">
            <button className="tp-link" onClick={() => setOpen(null)}>← Back to list</button>
            <h4 style={{ margin: '8px 0' }}>{open.fullName} <StatusPill s={open.status} /></h4>
            {open.partnerNote && <p className="tp-hint">Office note: {open.partnerNote}</p>}
            <CandidateProfile c={open} />
          </div>
        ) : (
          <div className="tp-card tp-table-wrap">
            {!rows ? <div className="tp-empty">Loading…</div> : shown.length === 0 ? <div className="tp-empty">Nothing here yet. Use "Share candidates" to add some.</div> : (
              <table className="tp-table">
                <thead><tr><th>Candidate</th><th>Graduation</th><th>Status</th><th>Office note</th><th>Shared</th><th>Last viewed</th>{canManage && <th />}</tr></thead>
                <tbody>{shown.map(r => (
                  <tr key={r.shareId}>
                    <td><button className="tp-link" onClick={() => setOpen(r)}>{r.fullName}</button><small>{r.kind === 'external' ? 'Outside candidate' : r.batchName || 'Student'}{r.missing?.length ? ` · missing ${r.missing.join(', ')}` : ''}</small></td>
                    <td>{[r.degree, r.branch].filter(Boolean).join(' · ') || '—'}<small>{r.graduationYear || ''}{r.graduationPercent != null ? ` · ${r.graduationPercent}%` : ''}</small></td>
                    <td>{canManage ? (
                      <select value={r.status} onChange={e => act(() => talentPoolApi.setStatus(r.shareId, e.target.value as TalentStatus))}>{STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
                    ) : <StatusPill s={r.status} />}</td>
                    <td>{r.partnerNote || '—'}</td>
                    <td>{fmtDate(r.sharedAt)}</td>
                    <td>{r.lastViewedAt ? fmtDate(r.lastViewedAt) : <span className="tp-pill grey">Not yet</span>}</td>
                    {canManage && <td><button className="tp-link danger" onClick={() => window.confirm(`Remove ${r.fullName} from ${partner.name}'s list?`) && act(() => talentPoolApi.unshare(r.shareId))}>Remove</button></td>}
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── The tab ───────────────────────────────────────────────────────────── */
const OfficesTab: React.FC<{ meta: Meta; partners: Partner[]; canManage: boolean; onChanged: () => void }> = ({ meta, partners, canManage, onChanged }) => {
  const [form, setForm] = useState<Partial<Partner> | null>(null);
  const [list, setList] = useState<Partner | null>(null);
  const [ws, setWs] = useState<Partner | null>(null);
  const [err, setErr] = useState('');
  const [invite, setInvite] = useState<{ name: string; r: InviteResult } | null>(null);
  const run = async (fn: () => Promise<any>) => { setErr(''); try { await fn(); onChanged(); } catch (e: any) { setErr(e.message); } };
  const doInvite = (p: Partner, fn: () => Promise<InviteResult>) => run(async () => setInvite({ name: p.name, r: await fn() }));

  return (
    <div className="tp-section">
      <div className="tp-toolbar">
        <p className="tp-hint">Each office logs in at the normal login page and sees only the candidates you share with it. Offices never see each other.</p>
        <div className="tp-spacer" />
        {canManage && <button className="tp-btn primary" onClick={() => setForm({})}><i className="fa-solid fa-plus" /> Add office</button>}
      </div>
      {err && <div className="tp-err">{err}</div>}
      {invite && (invite.r.emailSent
        ? <div className="tp-ok">Login invite emailed to {invite.name}. <button className="tp-link" onClick={() => setInvite(null)}>OK</button></div>
        : <div className="tp-err">The email could not be sent. Send {invite.name} this set-password link yourself (valid 7 days):<br /><b>{invite.r.setupLink}</b> <button className="tp-link" onClick={() => navigator.clipboard?.writeText(invite.r.setupLink || '')}>Copy</button> · <button className="tp-link" onClick={() => setInvite(null)}>Close</button></div>)}
      <div className="tp-card tp-table-wrap">
        {partners.length === 0 ? <div className="tp-empty">No offices yet. Add the first placement office.</div> : (
          <table className="tp-table">
            <thead><tr><th>Office</th><th>Login</th><th>Shared</th><th>Shortlisted</th><th>Interview</th><th>Selected</th><th>Their companies</th>{canManage && <th />}</tr></thead>
            <tbody>{partners.map(p => (
              <tr key={p._id} className={p.active ? '' : 'tp-muted'}>
                <td><button className="tp-link" onClick={() => setList(p)}>{p.name}</button><small>{[p.contactName, p.email, p.phone, p.city].filter(Boolean).join(' · ')}</small></td>
                <td>{!p.active ? <span className="tp-pill grey">Switched off</span>
                  : !p.login ? <span className="tp-pill amber">No login yet</span>
                  : !p.login.passwordSet ? <span className="tp-pill amber">Invited</span>
                  : <span className="tp-pill green">Active</span>}
                  {p.lastSeenAt && <small>Last opened a profile {fmtDate(p.lastSeenAt)}</small>}</td>
                <td><b>{p.total || 0}</b></td>
                <td>{p.byStatus?.shortlisted || 0}</td>
                <td>{p.byStatus?.interview || 0}</td>
                <td>{p.byStatus?.selected || 0}</td>
                <td><button className="tp-link" onClick={() => setWs(p)}>{p.desk?.companies || 0} companies</button>
                  <small>{p.desk?.openOpenings || 0} open jobs · {p.desk?.submissions || 0} sent · {p.desk?.placed || 0} selected</small></td>
                {canManage && <td><div className="tp-row-actions">
                  <button className="tp-link" onClick={() => setForm(p)}>Edit</button>
                  {p.active && (!p.userId
                    ? <button className="tp-link" onClick={() => doInvite(p, () => talentPoolApi.createLogin(p._id))}>Create login</button>
                    : <button className="tp-link" onClick={() => doInvite(p, () => talentPoolApi.resendInvite(p._id))}>Resend invite</button>)}
                  <button className={`tp-link ${p.active ? 'danger' : ''}`} onClick={() => (!p.active || window.confirm(`Switch off ${p.name}? Their login stops working immediately.`)) && run(() => talentPoolApi.setActive(p._id, !p.active))}>{p.active ? 'Switch off' : 'Switch on'}</button>
                </div></td>}
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {form && <OfficeForm meta={meta} initial={form} onClose={() => setForm(null)} onSaved={onChanged} />}
      {ws && <OfficeWorkspace partner={ws} onClose={() => setWs(null)} />}
      {list && <OfficeList partner={list} canManage={canManage} onClose={() => setList(null)} onChanged={onChanged} />}
    </div>
  );
};

export default OfficesTab;
