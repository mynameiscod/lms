import React, { useEffect, useRef, useState } from 'react';
import { talentPoolApi, Candidate } from '../../api/talentPoolApi';

type Form = Record<string, any>;
const GROUPS: { title: string; fields: [string, string, string?][] }[] = [
  { title: 'Basic', fields: [['fullName', 'Full name *'], ['phone', 'Contact number'], ['email', 'Email', 'email'], ['gender', 'Gender'], ['dateOfBirth', 'Date of birth', 'date'], ['city', 'City'], ['state', 'State'], ['address', 'Address']] },
  { title: 'Links', fields: [['resumeUrl', 'Resume link'], ['linkedInUrl', 'LinkedIn'], ['githubUrl', 'GitHub'], ['portfolioUrl', 'Portfolio']] },
  { title: '10th', fields: [['tenthSchool', 'School'], ['tenthYear', 'Passed out (year)', 'number'], ['tenthPercent', 'Percentage', 'number']] },
  { title: '12th / Intermediate', fields: [['twelfthCollege', 'College'], ['twelfthGroup', 'Group'], ['twelfthYear', 'Passed out (year)', 'number'], ['twelfthPercent', 'Percentage', 'number']] },
  { title: 'Graduation', fields: [['degree', 'Degree'], ['branch', 'Branch'], ['college', 'College'], ['university', 'University'], ['graduationYear', 'Passed out (year)', 'number'], ['graduationPercent', 'Percentage', 'number']] },
  { title: 'Career', fields: [['expectedRole', 'Expected role'], ['preferredLocation', 'Preferred location'], ['skills', 'Skills (comma separated)']] },
];
const ALL_KEYS = GROUPS.flatMap(g => g.fields.map(f => f[0]));

/** The flat Candidate record → form values. */
const toForm = (c: Candidate): Form => {
  const f: Form = {};
  for (const k of ALL_KEYS) f[k] = (c as any)[k] ?? '';
  // The list shows the full address of an uploaded resume; keep it as stored.
  return f;
};

const CandidateForm: React.FC<{ initial: Candidate | null; onClose: () => void; onSaved: () => void }> = ({ initial, onClose, onSaved }) => {
  const [f, setF] = useState<Form>(initial ? toForm(initial) : {});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr(''); setBusy(true);
    try {
      const body: Form = {};
      for (const k of ALL_KEYS) body[k] = f[k] ?? '';
      await talentPoolApi.saveExternal(initial?.candidateId || null, body);
      onSaved(); onClose();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setErr('');
    try { const r = await talentPoolApi.uploadResume(file); setF({ ...f, resumeUrl: r.url }); } catch (e: any) { setErr(e.message); }
  };
  return (
    <div className="tp-overlay" onClick={onClose}>
      <div className="tp-panel" onClick={e => e.stopPropagation()}>
        <div className="tp-panel-head"><div><h3>{initial ? 'Edit outside candidate' : 'Add outside candidate'}</h3><p>Someone who is not an LMS student.</p></div><button className="tp-x" onClick={onClose}>×</button></div>
        {err && <div className="tp-err">{err}</div>}
        <div className="tp-form">
          {GROUPS.map(g => (
            <React.Fragment key={g.title}>
              <h5>{g.title}</h5>
              {g.fields.map(([k, label, type]) => (
                <label key={k} className={k === 'address' || k === 'skills' ? 'full' : ''}>{label}
                  <input type={type || 'text'} value={f[k] ?? ''} onChange={e => setF({ ...f, [k]: e.target.value })} />
                </label>
              ))}
              {g.title === 'Links' && <label>Or upload resume (PDF / Word)<input type="file" accept=".pdf,.doc,.docx" onChange={e => upload(e.target.files?.[0])} /></label>}
            </React.Fragment>
          ))}
        </div>
        <div className="tp-actions"><button className="tp-btn" onClick={onClose}>Cancel</button><button className="tp-btn primary" disabled={busy} onClick={save}>Save</button></div>
      </div>
    </div>
  );
};

const ExternalTab: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const [rows, setRows] = useState<Candidate[] | null>(null);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<Candidate | null | 'new'>(null);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const file = useRef<HTMLInputElement>(null);
  const load = () => talentPoolApi.candidates({ kind: 'external', q: q || undefined }).then(setRows).catch(e => { setRows([]); setMsg({ err: e.message }); });
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (fn: () => Promise<string>) => { setMsg({}); try { setMsg({ ok: await fn() }); await load(); } catch (e: any) { setMsg({ err: e.message }); } };

  const importFile = (f?: File) => f && run(async () => {
    const r = await talentPoolApi.importExternal(f);
    if (file.current) file.current.value = '';
    return `Imported: ${r.created} new, ${r.updated} updated, ${r.skipped} skipped.${r.errors.length ? ` ${r.errors.slice(0, 5).join('; ')}` : ''}`;
  });

  return (
    <div className="tp-section">
      <div className="tp-toolbar">
        <input className="tp-search" placeholder="Search name, email, phone, college" value={q} onChange={e => setQ(e.target.value)} />
        <div className="tp-spacer" />
        {canManage && <>
          <button className="tp-btn" onClick={() => talentPoolApi.template().catch(e => setMsg({ err: e.message }))}><i className="fa-solid fa-download" /> Excel template</button>
          <button className="tp-btn" onClick={() => file.current?.click()}><i className="fa-solid fa-file-import" /> Import Excel / CSV</button>
          <input ref={file} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => importFile(e.target.files?.[0])} />
          <button className="tp-btn" onClick={() => run(async () => { const r = await talentPoolApi.importPlacementDesk(); return `From Placement Desk: ${r.created} added, ${r.skipped} already here or without contact.`; })}><i className="fa-solid fa-briefcase" /> Import from Placement Desk</button>
          <button className="tp-btn primary" onClick={() => setForm('new')}><i className="fa-solid fa-plus" /> Add candidate</button>
        </>}
      </div>
      <p className="tp-hint">Import accepts most column names (e.g. "SSC %", "Inter %", "CGPA", "YOP", "Mobile No"). The same phone number or email updates the existing candidate instead of adding a duplicate.</p>
      {msg.ok && <div className="tp-ok">{msg.ok}</div>}
      {msg.err && <div className="tp-err">{msg.err}</div>}
      <div className="tp-card tp-table-wrap">
        {!rows ? <div className="tp-empty">Loading…</div> : rows.length === 0 ? <div className="tp-empty">No outside candidates yet.</div> : (
          <table className="tp-table">
            <thead><tr><th>Candidate</th><th>Contact</th><th>Graduation</th><th>Profile</th><th>Offices</th>{canManage && <th />}</tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.candidateId}>
                <td><b>{r.fullName}</b><small>{r.expectedRole || ''}</small></td>
                <td>{r.phone || '—'}<small>{r.email}</small></td>
                <td>{[r.degree, r.branch].filter(Boolean).join(' · ') || '—'}<small>{r.graduationYear || ''}{r.college ? ` · ${r.college}` : ''}</small></td>
                <td>{r.missing?.length ? <span className="tp-pill amber" title={r.missing.join(', ')}>Missing {r.missing.length}</span> : <span className="tp-pill green">Complete</span>}</td>
                <td>{r.sharedCount || '—'}</td>
                {canManage && <td><div className="tp-row-actions">
                  <button className="tp-link" onClick={() => setForm(r)}>Edit</button>
                  <button className="tp-link danger" onClick={() => window.confirm(`Delete ${r.fullName}? They are also removed from every office's list.`) && run(async () => { await talentPoolApi.deleteExternal(r.candidateId); return `${r.fullName} deleted.`; })}>Delete</button>
                </div></td>}
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {form && <CandidateForm initial={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={load} />}
    </div>
  );
};

export default ExternalTab;
