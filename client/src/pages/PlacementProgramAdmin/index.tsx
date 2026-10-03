import React, { useCallback, useEffect, useState } from 'react';
import {
  placementProgramApi, PlacementCandidate, PlacementEvent, PLACEMENT_STAGES, stageLabel, errMsg,
} from '../../api/placementProgramApi';
import './placementProgramAdmin.css';

/**
 * Placement Program — the admin pipeline (Phase 1): every candidate from the ad form, which ad
 * brought them, their stage, notes, and the full timeline. Payment, booking, agreement and cheque
 * arrive in later phases on the same record.
 */

const EXP: Record<string, string> = { fresher: 'Fresher', '0-1': '< 1 yr', '1-3': '1–3 yrs', '3+': '3+ yrs' };
const when = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const adOf = (c: PlacementCandidate) => {
  const t = c.attribution?.last_touch || c.attribution?.first_touch;
  if (!t) return c.source === 'lms_push' ? 'LMS student' : 'Direct';
  return [t.utm_source || (t.fbclid ? 'facebook' : t.gclid ? 'google' : ''), t.utm_campaign].filter(Boolean).join(' · ') || 'Direct';
};

const Detail: React.FC<{ id: string; onClose: () => void; onChanged: () => void }> = ({ id, onClose, onChanged }) => {
  const [data, setData] = useState<{ candidate: PlacementCandidate; events: PlacementEvent[] } | null>(null);
  const [stage, setStage] = useState('');
  const [stageNote, setStageNote] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => placementProgramApi.get(id).then(r => { setData(r); setStage(r.candidate.stage); }).catch(e => setErr(errMsg(e))), [id]);
  useEffect(() => { load(); }, [load]);

  const saveStage = async () => {
    if (!data || stage === data.candidate.stage) return;
    setBusy(true); setErr('');
    try { await placementProgramApi.setStage(id, stage, stageNote || undefined); setStageNote(''); await load(); onChanged(); }
    catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };
  const saveNote = async () => {
    if (!note.trim()) return;
    setBusy(true); setErr('');
    try { await placementProgramApi.addNote(id, note); setNote(''); await load(); }
    catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  const c = data?.candidate;
  const touch = c?.attribution?.first_touch;
  const last = c?.attribution?.last_touch;
  return (
    <div className="ppa-drawer-wrap" onClick={onClose}>
      <aside className="ppa-drawer" onClick={e => e.stopPropagation()} aria-label="Candidate">
        <button className="ppa-x" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
        {!c ? <div className="ppa-muted">{err || 'Loading…'}</div> : (
          <>
            <h2>{c.name}</h2>
            <div className="ppa-sub">
              <a href={`https://wa.me/91${c.mobile}`} target="_blank" rel="noreferrer"><i className="bi bi-whatsapp" /> +91 {c.mobile}</a>
              {c.email && <a href={`mailto:${c.email}`}><i className="bi bi-envelope" /> {c.email}</a>}
            </div>
            {err && <div className="ppa-err">{err}</div>}

            <div className="ppa-box">
              <div className="ppa-kv"><span>College</span><b>{c.college || '—'}</b></div>
              <div className="ppa-kv"><span>Degree / branch</span><b>{[c.degree, c.branch].filter(Boolean).join(' · ') || '—'}</b></div>
              <div className="ppa-kv"><span>Graduation</span><b>{c.graduationYear || '—'}</b></div>
              <div className="ppa-kv"><span>Experience</span><b>{c.experience ? EXP[c.experience] || c.experience : '—'}</b></div>
              <div className="ppa-kv"><span>Role wanted</span><b>{c.targetRole || '—'}</b></div>
              <div className="ppa-kv"><span>City</span><b>{c.city || '—'}</b></div>
              {c.skills && <div className="ppa-kv full"><span>Skills</span><b>{c.skills}</b></div>}
            </div>

            <h3>Where they came from</h3>
            <div className="ppa-box">
              <div className="ppa-kv"><span>First ad</span><b>{touch ? [touch.utm_source, touch.utm_medium, touch.utm_campaign, touch.utm_content].filter(Boolean).join(' · ') || 'Direct' : (c.source === 'lms_push' ? 'LMS student' : 'Direct')}</b></div>
              {last && last !== touch && <div className="ppa-kv"><span>Latest ad</span><b>{[last.utm_source, last.utm_campaign, last.utm_content].filter(Boolean).join(' · ') || 'Direct'}</b></div>}
              <div className="ppa-kv"><span>Submissions</span><b>{c.submissions}</b></div>
              <div className="ppa-kv"><span>Registered</span><b>{when(c.createdAt)}</b></div>
            </div>

            <h3>Stage</h3>
            <div className="ppa-row">
              <select value={stage} onChange={e => setStage(e.target.value)}>
                {PLACEMENT_STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <input placeholder="Reason (optional)" value={stageNote} onChange={e => setStageNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveStage(); }} />
              <button className="ppa-btn" disabled={busy || stage === c.stage} onClick={saveStage}>Update</button>
            </div>

            <h3>Add a note</h3>
            <div className="ppa-row">
              <input placeholder="e.g. Called — will pay tomorrow" value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveNote(); }} />
              <button className="ppa-btn" disabled={busy || !note.trim()} onClick={saveNote}>Add</button>
            </div>

            <h3>Timeline</h3>
            <ul className="ppa-timeline">
              {data!.events.map(ev => (
                <li key={ev._id} className={`k-${ev.kind}`}>
                  <span className="dot" />
                  <div>
                    <div className="msg">{ev.message}</div>
                    <div className="meta">{when(ev.createdAt)}{ev.actorId ? ` · ${[ev.actorId.firstName, ev.actorId.lastName].filter(Boolean).join(' ')}` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
};

const PlacementProgramAdmin: React.FC = () => {
  const [stage, setStage] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: PlacementCandidate[]; total: number; limit: number; byStage: Record<string, number> } | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    placementProgramApi.list({ stage: stage || undefined, source: source || undefined, search: search.trim() || undefined, page, limit: 25 })
      .then(r => { setData(r); setErr(''); }).catch(e => setErr(errMsg(e)));
  }, [stage, source, search, page]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);

  const all = data ? Object.values(data.byStage).reduce((a, b) => a + b, 0) : 0;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const copyLink = async () => {
    const tenant = localStorage.getItem('tenantId') || '';
    const url = `${window.location.origin}/placement-program?tenant=${tenant}&utm_source=instagram&utm_medium=paid&utm_campaign=placement`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { window.prompt('Copy this link:', url); }
  };

  return (
    <div className="ppa">
      <div className="ppa-head">
        <div>
          <h1><i className="bi bi-briefcase-fill" /> Placement Program</h1>
          <p>Everyone who registered from your ads, which ad brought them, and where they are now.</p>
        </div>
        <div className="ppa-head-actions">
          <a className="ppa-btn ghost" href="/placement-program" target="_blank" rel="noreferrer"><i className="bi bi-box-arrow-up-right" /> View form</a>
          <button className="ppa-btn" onClick={copyLink}><i className="bi bi-link-45deg" /> {copied ? 'Copied' : 'Copy form link'}</button>
        </div>
      </div>
      <p className="ppa-hint">
        The copied link is an example for Instagram — change <code>utm_source</code> (instagram / youtube / google) and <code>utm_campaign</code> for each ad so you can see which one works.
      </p>

      <div className="ppa-stages" role="tablist">
        <button className={!stage ? 'on' : ''} onClick={() => { setStage(''); setPage(1); }}>All <span>{all}</span></button>
        {PLACEMENT_STAGES.filter(([k]) => data?.byStage?.[k]).map(([k, l]) => (
          <button key={k} className={stage === k ? 'on' : ''} onClick={() => { setStage(k); setPage(1); }}>{l} <span>{data!.byStage[k]}</span></button>
        ))}
      </div>

      <div className="ppa-filters">
        <input placeholder="Search name, mobile, email, college, campaign" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }}>
          <option value="">All sources</option><option value="ad">From ads</option><option value="lms_push">LMS students</option><option value="manual">Added manually</option>
        </select>
      </div>

      {err && <div className="ppa-err">{err}</div>}
      <div className="ppa-table-wrap">
        <table className="ppa-table">
          <thead><tr><th>Name</th><th>Mobile</th><th>College / year</th><th>Role wanted</th><th>Came from</th><th>Stage</th><th>Registered</th></tr></thead>
          <tbody>
            {!data ? <tr><td colSpan={7} className="ppa-muted">Loading…</td></tr> : !data.rows.length ? (
              <tr><td colSpan={7} className="ppa-muted">No candidates yet. Share the form link in your ads.</td></tr>
            ) : data.rows.map(c => (
              <tr key={c._id} onClick={() => setOpen(c._id)}>
                <td><b>{c.name}</b>{c.submissions > 1 && <span className="ppa-tag">×{c.submissions}</span>}</td>
                <td>+91 {c.mobile}</td>
                <td>{c.college || '—'}{c.graduationYear ? ` · ${c.graduationYear}` : ''}</td>
                <td>{c.targetRole || '—'}</td>
                <td>{adOf(c)}</td>
                <td><span className={`ppa-stage s-${c.stage}`}>{stageLabel(c.stage)}</span></td>
                <td>{when(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.total > data.limit && (
        <div className="ppa-pager">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
          <span>Page {page} of {pages} · {data.total} candidates</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next ›</button>
        </div>
      )}

      {open && <Detail id={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
};

export default PlacementProgramAdmin;
