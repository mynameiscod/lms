import React, { useEffect, useState } from 'react';
import { talentPortalApi, Company, Opening, ShareRow, STAGE_LABEL, STAGE_ORDER, CompanyStage, OPENING_LABEL, OpeningStatus } from '../../api/talentPoolApi';
import { Drawer, toDateInput } from './ui';

/* ── Company ───────────────────────────────────────────────────────────── */
export const CompanyForm: React.FC<{ initial?: Partial<Company>; onClose: () => void; onSaved: (c: Company) => void }> = ({ initial, onClose, onSaved }) => {
  const [f, setF] = useState<Partial<Company>>({ stage: 'prospect', ...initial });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Company) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setErr(''); setBusy(true);
    try {
      const { _id, name, website, industry, location, contactName, contactDesignation, contactEmail, contactPhone, stage, notes } = f;
      onSaved(await talentPortalApi.saveCompany({ _id, name, website, industry, location, contactName, contactDesignation, contactEmail, contactPhone, stage, notes }));
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Drawer title={f._id ? 'Edit company' : 'Add company'} sub="Only your office can see the companies you add." onClose={onClose}>
      {err && <div className="tp-err">{err}</div>}
      <div className="tp-form">
        <label className="full">Company name *<input autoFocus value={f.name || ''} onChange={set('name')} /></label>
        <label>Website<input value={f.website || ''} onChange={set('website')} placeholder="acme.com" /></label>
        <label>Industry<input value={f.industry || ''} onChange={set('industry')} placeholder="IT services, product…" /></label>
        <label>Location<input value={f.location || ''} onChange={set('location')} /></label>
        <label>Stage<select value={f.stage} onChange={set('stage')}>{STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select></label>
        <h5>Contact person</h5>
        <label>Name<input value={f.contactName || ''} onChange={set('contactName')} /></label>
        <label>Designation<input value={f.contactDesignation || ''} onChange={set('contactDesignation')} placeholder="HR Manager" /></label>
        <label>Email<input type="email" value={f.contactEmail || ''} onChange={set('contactEmail')} /></label>
        <label>Phone<input value={f.contactPhone || ''} onChange={set('contactPhone')} /></label>
        <label className="full">Notes<textarea rows={4} value={f.notes || ''} onChange={set('notes')} placeholder="Anything worth remembering about this company" /></label>
      </div>
      <div className="tp-actions"><button className="tpo-btn" onClick={onClose}>Cancel</button><button className="tpo-btn primary" disabled={busy || !f.name?.trim()} onClick={save}>Save company</button></div>
    </Drawer>
  );
};

/* ── Opening (job) ─────────────────────────────────────────────────────── */
export const OpeningForm: React.FC<{ initial: Partial<Opening>; companies: Company[]; onClose: () => void; onSaved: (o: Opening) => void }> = ({ initial, companies, onClose, onSaved }) => {
  const [f, setF] = useState<Partial<Opening>>({ status: 'open', ...initial });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Opening) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setErr(''); setBusy(true);
    try {
      const { companyName, sent, byStatus, updatedAt, ...body } = f as any;
      onSaved(await talentPortalApi.saveOpening(body));
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const n = (k: keyof Opening) => (f[k] == null ? '' : String(f[k]));
  return (
    <Drawer title={f._id ? 'Edit opening' : 'Add job opening'} sub="The job details you share with candidates and track against." onClose={onClose}>
      {err && <div className="tp-err">{err}</div>}
      <div className="tp-form">
        <label className="full">Company *
          <select value={f.companyId || ''} disabled={!!f._id} onChange={set('companyId')}>
            <option value="">Pick the company…</option>
            {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </label>
        <label className="full">Job title *<input autoFocus value={f.title || ''} onChange={set('title')} placeholder="Java Developer" /></label>
        <label>Openings (positions)<input type="number" min={0} value={n('positions')} onChange={set('positions')} /></label>
        <label>Status<select value={f.status} onChange={set('status')}>{(['open', 'on_hold', 'closed'] as OpeningStatus[]).map(s => <option key={s} value={s}>{OPENING_LABEL[s]}</option>)}</select></label>
        <label>Experience from (yrs)<input type="number" min={0} step="0.5" value={n('expMin')} onChange={set('expMin')} /></label>
        <label>Experience to (yrs)<input type="number" min={0} step="0.5" value={n('expMax')} onChange={set('expMax')} /></label>
        <label>Salary from (₹ LPA)<input type="number" min={0} step="0.1" value={n('salaryMin')} onChange={set('salaryMin')} /></label>
        <label>Salary to (₹ LPA)<input type="number" min={0} step="0.1" value={n('salaryMax')} onChange={set('salaryMax')} /></label>
        <label>Location<input value={f.location || ''} onChange={set('location')} placeholder="Hyderabad" /></label>
        <label>Work mode<select value={f.workMode || ''} onChange={set('workMode')}><option value="">—</option><option value="office">Office</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></select></label>
        <label>Bond<input value={f.bond || ''} onChange={set('bond')} placeholder="e.g. 2 years / ₹1,00,000 — or None" /></label>
        <label>Apply by<input type="date" value={toDateInput(f.deadline)} onChange={set('deadline')} /></label>
        <label>Qualification<input value={f.qualification || ''} onChange={set('qualification')} placeholder="B.Tech / MCA, 2024–25 pass-outs" /></label>
        <label>Skills<input value={f.skills || ''} onChange={set('skills')} placeholder="Java, Spring Boot, SQL" /></label>
        <label className="full">Interview process<textarea rows={3} value={f.interviewProcess || ''} onChange={set('interviewProcess')} placeholder={'1. Online test\n2. Technical round\n3. HR round'} /></label>
        <label className="full">Job description (JD)<textarea rows={8} value={f.jd || ''} onChange={set('jd')} placeholder="Paste the JD here" /></label>
        <label className="full">JD link (optional)<input value={f.jdUrl || ''} onChange={set('jdUrl')} placeholder="Link to the JD document" /></label>
      </div>
      <div className="tp-actions"><button className="tpo-btn" onClick={onClose}>Cancel</button><button className="tpo-btn primary" disabled={busy || !f.title?.trim() || !f.companyId} onClick={save}>Save opening</button></div>
    </Drawer>
  );
};

/* ── Send candidates to a company ──────────────────────────────────────── */
export const SendDialog: React.FC<{
  candidates: ShareRow[]; preselect?: string[]; companyId?: string; openingId?: string;
  onClose: () => void; onSent: (msg: string) => void; onAddCompany?: () => void;
}> = ({ candidates, preselect = [], companyId: c0 = '', openingId: o0 = '', onClose, onSent, onAddCompany }) => {
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [companyId, setCompanyId] = useState(c0);
  const [openingId, setOpeningId] = useState(o0);
  const [picked, setPicked] = useState<Set<string>>(new Set(preselect));
  const [already, setAlready] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { talentPortalApi.companies().then(setCompanies).catch(e => setErr(e.message)); }, []);
  useEffect(() => {
    if (!companyId) { setOpenings([]); return; }
    talentPortalApi.openings({ companyId }).then(o => setOpenings(o.filter(x => x.status !== 'closed' || x._id === openingId))).catch(e => setErr(e.message));
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!companyId) { setAlready(new Set()); return; }
    talentPortalApi.submissions({ companyId }).then(s => setAlready(new Set(s.filter(x => (x.openingId || '') === openingId).map(x => x.shareId)))).catch(() => {});
  }, [companyId, openingId]);
  const toggle = (id: string) => setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const list = candidates.filter(c => !q || `${c.fullName} ${c.skills || ''} ${c.degree || ''} ${c.expectedRole || ''}`.toLowerCase().includes(q.toLowerCase()));
  const sendable = [...picked].filter(id => !already.has(id));
  const send = async () => {
    setErr(''); setBusy(true);
    try {
      const r = await talentPortalApi.send(companyId, openingId || null, sendable, note);
      const co = companies?.find(c => c._id === companyId)?.name || 'the company';
      onSent(`${r.added} candidate${r.added === 1 ? '' : 's'} sent to ${co}${r.alreadySent ? ` (${r.alreadySent} already there)` : ''}.`);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Drawer title="Send candidates to a company" sub="Track each candidate's status at that company. Download the company's Excel to email it." onClose={onClose}>
      {err && <div className="tp-err">{err}</div>}
      {companies && !companies.length ? (
        <div className="tpo-emptybox"><b>Add a company first</b><p>Save the company and its contact, then send candidates to it.</p>{onAddCompany && <button className="tpo-btn primary" onClick={onAddCompany}><i className="fa-solid fa-plus" /> Add company</button>}</div>
      ) : <>
        <div className="tp-form">
          <label>Company *<select value={companyId} onChange={e => { setCompanyId(e.target.value); setOpeningId(''); }}><option value="">Pick the company…</option>{(companies || []).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
          <label>Opening<select value={openingId} disabled={!companyId} onChange={e => setOpeningId(e.target.value)}><option value="">General (no specific opening)</option>{openings.map(o => <option key={o._id} value={o._id}>{o.title}</option>)}</select></label>
          <label className="full">Note (optional)<input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Emailed to Priya on 12 Nov" /></label>
        </div>
        <div className="tpo-filters">
          <div className="tpo-search"><i className="fa-solid fa-magnifying-glass" /><input placeholder="Filter candidates" value={q} onChange={e => setQ(e.target.value)} /></div>
          <button className="tpo-reset" onClick={() => setPicked(new Set(list.filter(c => !already.has(c.shareId)).map(c => c.shareId)))}>Select all shown</button>
          <button className="tpo-reset" onClick={() => setPicked(new Set())}>Clear</button>
        </div>
        <div className="tpo-pick">
          {list.map(c => {
            const done = already.has(c.shareId);
            return (
              <label key={c.shareId} className={done ? 'off' : ''}>
                <input type="checkbox" disabled={done} checked={done || picked.has(c.shareId)} onChange={() => toggle(c.shareId)} />
                <span><b>{c.fullName}</b> · {[c.degree, c.graduationYear].filter(Boolean).join(' ')}</span>
                <small>{done ? 'Already sent' : c.expectedRole || ''}</small>
              </label>
            );
          })}
          {!list.length && <div className="tp-empty">No candidates.</div>}
        </div>
        <div className="tp-actions">
          <button className="tpo-btn" onClick={onClose}>Cancel</button>
          <button className="tpo-btn primary" disabled={busy || !companyId || !sendable.length} onClick={send}><i className="fa-solid fa-paper-plane" /> Send {sendable.length || ''}</button>
        </div>
      </>}
    </Drawer>
  );
};

export const STAGES: CompanyStage[] = STAGE_ORDER;
