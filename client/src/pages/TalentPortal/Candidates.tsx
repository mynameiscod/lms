import React, { useEffect, useMemo, useState } from 'react';
import { talentPortalApi, ShareRow, TalentStatus, STATUS_LABEL, PARTNER_SETTABLE, CandidateSubmission } from '../../api/talentPoolApi';
import CandidateProfile from '../TalentPool/CandidateProfile';
import { StatusPill, fmtDate } from '../TalentPool/shared';
import { Avatar, Drawer, PageHead, Pager, RowMenu, Stat, SubPill, usePaged, Empty, fmtDateTime } from './ui';
import { SubStatusEditor } from './Submissions';

const TILES: { key: TalentStatus | ''; label: string; icon: string; tone: string }[] = [
  { key: '', label: 'All', icon: 'fa-layer-group', tone: 'violet' },
  { key: 'shared', label: 'New', icon: 'fa-wand-magic-sparkles', tone: 'violet' },
  { key: 'viewed', label: 'Viewed', icon: 'fa-eye', tone: 'blue' },
  { key: 'shortlisted', label: 'Shortlisted', icon: 'fa-award', tone: 'amber' },
  { key: 'interview', label: 'Interview', icon: 'fa-calendar-days', tone: 'violet' },
  { key: 'selected', label: 'Selected', icon: 'fa-circle-check', tone: 'green' },
  { key: 'rejected', label: 'Rejected', icon: 'fa-circle-xmark', tone: 'red' },
  { key: 'on_hold', label: 'On Hold', icon: 'fa-circle-pause', tone: 'violet' },
];

export type CandidatePreset = 'all' | 'shortlist' | 'interview';
const PRESET: Record<CandidatePreset, { title: string; sub: string; status: TalentStatus | '' }> = {
  all: { title: 'Candidates Shared with You', sub: 'Open a candidate for the full profile and resume, and update their status as they move through your process.', status: '' },
  shortlist: { title: 'Shortlist', sub: 'Candidates you have shortlisted. Send them to a company when you are ready.', status: 'shortlisted' },
  interview: { title: 'Interviews', sub: 'Candidates in interviews. Record the result once it is in.', status: 'interview' },
};

/* ── One candidate ─────────────────────────────────────────────────────── */
export const CandidateDrawer: React.FC<{ shareId: string; onClose: () => void; onChanged: (r: Partial<ShareRow>) => void; onSend: (shareId: string) => void }> = ({ shareId, onClose, onChanged, onSend }) => {
  const [c, setC] = useState<ShareRow | null>(null);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState<TalentStatus | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [editSub, setEditSub] = useState<CandidateSubmission | null>(null);
  const load = () => talentPortalApi.candidate(shareId).then(d => { setC(d); setNote(d.partnerNote || ''); onChanged({ status: d.status, partnerNote: d.partnerNote || '' }); }).catch(e => setErr(e.message));
  useEffect(() => { load(); }, [shareId]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    if (!status) return;
    setErr(''); setBusy(true);
    try { onChanged(await talentPortalApi.setStatus(shareId, status, note)); setStatus(''); await load(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Drawer
      title={c ? <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Avatar name={c.fullName} />{c.fullName}</span> : 'Loading…'}
      sub={c ? <>Shared {fmtDate(c.sharedAt)} · <StatusPill s={c.status} /></> : undefined}
      onClose={onClose}
    >
      {err && <div className="tp-err">{err}</div>}
      {c && <>
        <div className="tp-status-box">
          <b>Update status</b>
          <div className="tpo-statusbtns">{PARTNER_SETTABLE.map(s => <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{STATUS_LABEL[s]}</button>)}</div>
          <textarea placeholder="Note (optional) — e.g. interview date, feedback" value={note} onChange={e => setNote(e.target.value)} />
          <div className="tp-actions"><button className="tpo-btn primary sm" disabled={!status || busy} onClick={save}>Save status</button></div>
        </div>

        <div className="tpo-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h5 style={{ margin: 0 }}>Companies</h5><span className="tp-spacer" />
            <button className="tpo-btn sm" onClick={() => onSend(shareId)}><i className="fa-solid fa-paper-plane" /> Send to company</button>
          </div>
          {!c.submissions?.length ? <p className="tp-hint">Not sent to any company yet.</p> : (
            <ul className="tpo-list">{c.submissions.map(s => (
              <li key={s._id}>
                <span className="tpo-logo" style={{ width: 34, height: 34, fontSize: 12 }}>{s.companyName.slice(0, 2).toUpperCase()}</span>
                <div className="grow"><b>{s.companyName}{s.openingTitle ? ` — ${s.openingTitle}` : ''}</b><small>Sent {fmtDate(s.sentAt)}{s.interviewAt ? ` · Interview ${fmtDateTime(s.interviewAt)}` : ''}{s.note ? ` · ${s.note}` : ''}</small></div>
                <SubPill s={s.status} />
                <button className="tpo-btn sm" onClick={() => setEditSub(s)}>Update</button>
              </li>
            ))}</ul>
          )}
        </div>

        <CandidateProfile c={c} />
        {!!c.statusHistory?.length && (
          <div className="tp-sec"><h5>History</h5>
            <ul className="tp-history">{[...c.statusHistory].reverse().map((h, i) => (
              <li key={i}><StatusPill s={h.status} /> {fmtDate(h.at)} · {h.byRole}{h.note ? ` — ${h.note}` : ''}</li>
            ))}</ul>
          </div>
        )}
      </>}
      {editSub && <SubStatusEditor sub={{ ...editSub, fullName: c?.fullName || '' }} onClose={() => setEditSub(null)} onSaved={() => { setEditSub(null); load(); }} />}
    </Drawer>
  );
};

/* ── The list ──────────────────────────────────────────────────────────── */
const Candidates: React.FC<{
  rows: ShareRow[] | null; preset: CandidatePreset;
  onOpen: (shareId: string) => void; onSend: (shareIds: string[]) => void;
}> = ({ rows, preset, onOpen, onSend }) => {
  const P = PRESET[preset];
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<TalentStatus | ''>(P.status);
  const [year, setYear] = useState('');
  const [role, setRole] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [err, setErr] = useState('');
  useEffect(() => { setStatus(P.status); setSel(new Set()); }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = useMemo(() => rows || [], [rows]);
  const counts = useMemo(() => { const c: Partial<Record<TalentStatus, number>> = {}; for (const r of all) c[r.status] = (c[r.status] || 0) + 1; return c; }, [all]);
  const years = useMemo(() => Array.from(new Set(all.map(r => r.graduationYear).filter(Boolean))).sort((a, b) => Number(b) - Number(a)), [all]);
  const roles = useMemo(() => Array.from(new Set(all.map(r => r.expectedRole?.trim()).filter(Boolean))).sort() as string[], [all]);
  const shown = all.filter(r => (!status || r.status === status) && (!year || String(r.graduationYear) === year) && (!role || r.expectedRole?.trim() === role)
    && (!q || `${r.fullName} ${r.email || ''} ${r.phone || ''} ${r.skills || ''} ${r.degree || ''} ${r.branch || ''} ${r.expectedRole || ''} ${r.preferredLocation || ''} ${r.city || ''}`.toLowerCase().includes(q.toLowerCase())));
  const pg = usePaged(shown, [q, status, year, role]);
  const reset = () => { setQ(''); setStatus(P.status); setYear(''); setRole(''); };
  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOnPage = pg.slice.length > 0 && pg.slice.every(r => sel.has(r.shareId));

  return (
    <>
      <PageHead icon="fa-users" title={P.title} sub={P.sub}>
        <button className="tpo-btn primary" disabled={!all.length} onClick={() => talentPortalApi.export().catch(e => setErr(e.message))}><i className="fa-solid fa-file-excel" /> Download Excel</button>
      </PageHead>
      {err && <div className="tp-err">{err}</div>}
      {preset === 'all' && (
        <div className="tpo-stats">
          {TILES.map(t => <Stat key={t.key || 'all'} icon={t.icon} tone={t.tone} label={t.label} value={t.key ? counts[t.key] || 0 : all.length} on={status === t.key} onClick={() => setStatus(status === t.key && t.key ? '' : t.key)} />)}
        </div>
      )}
      <div className="tpo-card tpo-filters">
        <div className="tpo-search"><i className="fa-solid fa-magnifying-glass" /><input placeholder="Search by name, skills, degree, role, location…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <span className="tpo-spacer" />
        <select value={year} onChange={e => setYear(e.target.value)}><option value="">Graduation Year</option>{years.map(y => <option key={String(y)} value={String(y)}>{y}</option>)}</select>
        <select value={role} onChange={e => setRole(e.target.value)}><option value="">Expected Role</option>{roles.map(r => <option key={r} value={r}>{r}</option>)}</select>
        {preset === 'all' && <select value={status} onChange={e => setStatus(e.target.value as TalentStatus | '')}><option value="">Status</option>{TILES.filter(t => t.key).map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select>}
        <button className="tpo-reset" onClick={reset}><i className="fa-solid fa-rotate-right" /> Reset</button>
      </div>
      {sel.size > 0 && (
        <div className="tpo-bulk">
          {sel.size} selected <span className="tp-spacer" />
          <button className="tpo-btn primary sm" onClick={() => onSend([...sel])}><i className="fa-solid fa-paper-plane" /> Send to company</button>
          <button className="tpo-btn sm" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}
      <div className="tpo-card">
        {!rows ? <div className="tp-empty">Loading…</div> : !shown.length ? (
          all.length ? <Empty icon="fa-filter" title="No candidates match" text="Try a different search or clear the filters." action={<button className="tpo-btn sm" onClick={reset}>Reset filters</button>} />
            : <Empty icon="fa-users" title="No candidates yet" text="The institute has not shared any candidates with you yet. They will appear here as soon as they do." />
        ) : <>
          <div className="tpo-table-wrap">
            <table className="tpo-table">
              <thead><tr>
                <th><input type="checkbox" checked={allOnPage} onChange={() => setSel(s => { const n = new Set(s); pg.slice.forEach(r => (allOnPage ? n.delete(r.shareId) : n.add(r.shareId))); return n; })} aria-label="Select page" /></th>
                <th>#</th><th>Candidate</th><th>Contact</th><th>10th</th><th>12th</th><th>Graduation</th><th>Expected Role</th><th>Resume</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>{pg.slice.map((r, i) => (
                <tr key={r.shareId} className={`click ${sel.has(r.shareId) ? 'sel' : ''}`} onClick={() => onOpen(r.shareId)}>
                  <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={sel.has(r.shareId)} onChange={() => toggle(r.shareId)} aria-label={`Select ${r.fullName}`} /></td>
                  <td>{pg.offset + i + 1}</td>
                  <td><div className="tpo-cand"><Avatar name={r.fullName} /><div><b>{r.fullName}</b><small>{[r.gender, r.city].filter(Boolean).join(' • ') || '—'}</small></div></div></td>
                  <td><div className="tpo-contact">{r.phone && <span><i className="fa-solid fa-phone" /> {r.phone}</span>}{r.email && <span><i className="fa-regular fa-envelope" /> {r.email}</span>}{!r.phone && !r.email && <span className="tpo-muted">—</span>}</div></td>
                  <td>{r.tenthPercent != null ? `${r.tenthPercent}%` : '—'}<small>{r.tenthYear || ''}</small></td>
                  <td>{r.twelfthPercent != null ? `${r.twelfthPercent}%` : '—'}<small>{r.twelfthYear || ''}</small></td>
                  <td style={{ minWidth: 200 }}>{[r.degree, r.branch].filter(Boolean).join(' – ') || '—'}<small>{[r.graduationYear, r.graduationPercent != null ? `${r.graduationPercent}%` : ''].filter(Boolean).join(' • ')}</small></td>
                  <td>{r.expectedRole || '—'}<small>{r.preferredLocation}</small></td>
                  <td onClick={e => e.stopPropagation()}>{r.resumeUrl ? <a className="tpo-link" href={r.resumeUrl} target="_blank" rel="noreferrer"><i className="fa-solid fa-link" /> Open</a> : <span className="tpo-muted">—</span>}</td>
                  <td><StatusPill s={r.status} /></td>
                  <td><RowMenu items={[
                    { label: 'View profile', icon: 'fa-id-card', onClick: () => onOpen(r.shareId) },
                    { label: 'Update status', icon: 'fa-pen-to-square', onClick: () => onOpen(r.shareId) },
                    { label: 'Send to company', icon: 'fa-paper-plane', onClick: () => onSend([r.shareId]) },
                    ...(r.resumeUrl ? [{ label: 'Open resume', icon: 'fa-file-arrow-down', onClick: () => window.open(r.resumeUrl, '_blank', 'noopener') }] : []),
                  ]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pager pg={pg} noun="candidate" />
        </>}
      </div>
    </>
  );
};

export default Candidates;
