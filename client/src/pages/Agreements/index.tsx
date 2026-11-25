import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { agreementsApi, AdminAgreement, AudienceMode, ResponseRow, SignedRecord, StudentAgreement } from '../../api/agreementsApi';
import { Modal, useToast } from '../ProblemBank/shared';
import { AgreementModal, SignedRecordModal } from '../../components/agreements/AgreementConsent';
import { confirmDialog } from '../../components/feedback/appFeedback';
import '../ProblemBank/ProblemBank.css';

/**
 * Terms & Agreements — admin. Write the points (or attach a document), choose who must accept —
 * every student, some batches, or named students — ask for a signature if needed, and go live.
 * Students accept from their profile ("I agree to the …" checkbox → points in a modal).
 */

const errMsg = (e: any, fallback: string) => e?.response?.data?.message || fallback;
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

type Draft = {
  id?: string; title: string; kind: 'terms' | 'agreement'; intro: string; points: string[];
  document: AdminAgreement['document']; requireSignature: boolean; blockLms: boolean;
  mode: AudienceMode; batches: { id: string; name: string }[]; students: { id: string; name: string; email?: string }[];
  status: AdminAgreement['status']; hasAcceptances: boolean;
};

const blank = (): Draft => ({
  title: 'Terms & Conditions', kind: 'terms', intro: '', points: [''], document: null, requireSignature: false, blockLms: false,
  mode: 'all', batches: [], students: [], status: 'draft', hasAcceptances: false,
});

const audienceText = (a: AdminAgreement) => {
  if (a.audience.mode === 'batches') return `${a.audience.batchIds.length} batch${a.audience.batchIds.length === 1 ? '' : 'es'}`;
  if (a.audience.mode === 'students') return `${a.audience.studentIds.length} student${a.audience.studentIds.length === 1 ? '' : 's'}`;
  return 'All students';
};

const statusPill = (s: string) => (
  <span className={`pb-pill ${s === 'live' ? 'pb-badge-ok' : s === 'closed' ? 'pb-badge-neutral' : 'pb-badge-warn'}`}>{s === 'live' ? 'Live' : s === 'closed' ? 'Closed' : 'Draft'}</span>
);

const AgreementsPage: React.FC = () => {
  const [rows, setRows] = useState<AdminAgreement[] | null>(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [responsesFor, setResponsesFor] = useState<AdminAgreement | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try { setRows(await agreementsApi.list()); } catch (e: any) { setErr(errMsg(e, 'Could not load agreements.')); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openEdit = async (a: AdminAgreement) => {
    try {
      const full = await agreementsApi.get(a.id);
      setEditing({
        id: full.id, title: full.title, kind: full.kind, intro: full.intro || '', points: full.points.length ? full.points : [''],
        document: full.document?.url ? full.document : null, requireSignature: full.requireSignature, blockLms: full.blockLms,
        mode: full.audience.mode, batches: full.batchLabels || [], students: full.studentLabels || [],
        status: full.status, hasAcceptances: (a.counts?.accepted || 0) > 0,
      });
    } catch (e: any) { toast.show(errMsg(e, 'Could not open it.'), true); }
  };

  const setStatus = async (a: AdminAgreement, status: 'draft' | 'live' | 'closed') => {
    if (status === 'live' && a.blockLms) {
      const ok = await confirmDialog({ title: 'Go live?', message: `Students covered by this (${audienceText(a)}) will be held on their profile page until they accept it.`, confirmLabel: 'Go live' });
      if (!ok) return;
    }
    try { await agreementsApi.setStatus(a.id, status); toast.show(status === 'live' ? 'It is live — students will see it on their profile.' : status === 'closed' ? 'Closed. Signed records are kept.' : 'Moved back to draft.'); load(); }
    catch (e: any) { toast.show(errMsg(e, 'Could not change it.'), true); }
  };

  const remove = async (a: AdminAgreement) => {
    const ok = await confirmDialog({ title: 'Delete this?', message: `"${a.title}" will be deleted. This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try { await agreementsApi.remove(a.id); toast.show('Deleted.'); load(); } catch (e: any) { toast.show(errMsg(e, 'Could not delete.'), true); }
  };

  return (
    <div className="pb-root">
      <div className="pb-page">
        <div className="pb-head">
          <div className="pb-grow">
            <h1>Terms &amp; Agreements</h1>
            <p>Points students must accept when they submit their profile. Roll them out to everyone, some batches or named students, attach an agreement document and ask for a signature.</p>
          </div>
          <button className="pb-btn pb-btn-primary" onClick={() => setEditing(blank())}><i className="fa-solid fa-plus" /> New</button>
        </div>

        {err && <div className="pb-alert pb-alert-bad">{err}</div>}
        {!rows && !err && <div className="pb-muted"><span className="pb-spinner" /> Loading…</div>}
        {rows && rows.length === 0 && (
          <div className="pb-empty pb-card" style={{ padding: 28, textAlign: 'center' }}>
            <p style={{ marginTop: 0 }}>No terms yet. Create your first one — for example your institute's rules, fee terms or a placement agreement.</p>
            <button className="pb-btn pb-btn-primary" onClick={() => setEditing(blank())}><i className="fa-solid fa-plus" /> Create Terms &amp; Conditions</button>
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="pb-table-wrap pb-card">
            <table className="pb-table">
              <thead><tr><th>Title</th><th>Status</th><th>For</th><th>Accepted</th><th>Options</th><th /></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 650 }}>{a.title}</div>
                      <div className="pb-muted" style={{ fontSize: 12.5 }}>
                        {a.kind === 'agreement' ? 'Agreement' : 'Terms'} · {a.points.length} point{a.points.length === 1 ? '' : 's'}{a.document?.url ? ' · document attached' : ''} · v{a.version}
                      </div>
                    </td>
                    <td>{statusPill(a.status)}</td>
                    <td>{audienceText(a)}</td>
                    <td>
                      <button className="pb-linkbtn" onClick={() => setResponsesFor(a)} title="See who accepted">
                        <b>{a.counts?.accepted ?? 0}</b> / {a.counts?.targeted ?? 0}
                        {(a.counts?.pending || 0) > 0 && <span className="pb-muted"> · {a.counts?.pending} pending</span>}
                      </button>
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {a.requireSignature && <span className="pb-tag" style={{ marginRight: 4 }}><i className="fa-solid fa-signature" /> Signature</span>}
                      {a.blockLms && <span className="pb-tag"><i className="fa-solid fa-lock" /> Holds LMS</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={() => openEdit(a)}>Edit</button>
                      <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={() => setResponsesFor(a)}>Responses</button>
                      {a.status !== 'live' && <button className="pb-btn pb-btn-sm pb-btn-success" onClick={() => setStatus(a, 'live')}>Go live</button>}
                      {a.status === 'live' && <button className="pb-btn pb-btn-sm" onClick={() => setStatus(a, 'closed')}>Close</button>}
                      {(a.counts?.accepted || 0) === 0 && <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={() => remove(a)} aria-label="Delete"><i className="fa-solid fa-trash" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <Editor draft={editing} onClose={() => setEditing(null)} onSaved={(msg) => { setEditing(null); toast.show(msg); load(); }} toastBad={(m) => toast.show(m, true)} />}
      {responsesFor && <Responses agreement={responsesFor} onClose={() => setResponsesFor(null)} />}
      {toast.node}
    </div>
  );
};

/* ── Editor ─────────────────────────────────────────────────────────────────────────────── */

const Editor: React.FC<{ draft: Draft; onClose: () => void; onSaved: (msg: string) => void; toastBad: (m: string) => void }> = ({ draft, onClose, onSaved, toastBad }) => {
  const [d, setD] = useState<Draft>(draft);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paste, setPaste] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [reask, setReask] = useState(false);
  const [opts, setOpts] = useState<{ batches: { id: string; name: string }[]; students: { id: string; name: string; email?: string }[] }>({ batches: [], students: [] });
  const [q, setQ] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  useEffect(() => { agreementsApi.options().then(setOpts).catch(() => undefined); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setOpts((o) => ({ ...o, students: [] })); return; }
    const id = setTimeout(() => { agreementsApi.options(q).then((r) => setOpts((o) => ({ ...o, students: r.students }))).catch(() => undefined); }, 300);
    return () => clearTimeout(id);
  }, [q]);

  const setPoint = (i: number, v: string) => set({ points: d.points.map((p, j) => (j === i ? v : p)) });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= d.points.length) return;
    const next = [...d.points];
    [next[i], next[j]] = [next[j], next[i]];
    set({ points: next });
  };

  const upload = async (f?: File | null) => {
    if (!f) return;
    setUploading(true);
    try { set({ document: await agreementsApi.uploadDocument(f) }); } catch (e: any) { toastBad(errMsg(e, 'Could not upload the document.')); } finally { setUploading(false); }
  };

  const body = (status?: string) => ({
    title: d.title, kind: d.kind, intro: d.intro, points: d.points.map((p) => p.trim()).filter(Boolean), document: d.document || null,
    requireSignature: d.requireSignature, blockLms: d.blockLms,
    audience: { mode: d.mode, batchIds: d.batches.map((b) => b.id), studentIds: d.students.map((s) => s.id) },
    ...(status ? { status: status as any } : {}),
  });

  const save = async (goLive: boolean) => {
    setBusy(true);
    try {
      if (d.id) {
        await agreementsApi.update(d.id, { ...body(), reask });
        if (goLive && d.status !== 'live') await agreementsApi.setStatus(d.id, 'live');
      } else {
        await agreementsApi.create(body(goLive ? 'live' : 'draft'));
      }
      onSaved(goLive || d.status === 'live' ? (reask ? 'Saved — everyone will be asked to agree again.' : 'Saved and live.') : 'Saved as draft.');
    } catch (e: any) { toastBad(errMsg(e, 'Could not save.')); } finally { setBusy(false); }
  };

  const previewAgreement: StudentAgreement = {
    id: 'preview', title: d.title || 'Terms & Conditions', kind: d.kind, intro: d.intro, points: d.points.map((p) => p.trim()).filter(Boolean),
    document: d.document || null, requireSignature: d.requireSignature, blockLms: d.blockLms, version: 1,
  };
  const batchList = opts.batches.filter((b) => !batchFilter || b.name.toLowerCase().includes(batchFilter.toLowerCase()));
  const chosen = new Set(d.batches.map((b) => b.id));

  return (
    <Modal
      title={d.id ? 'Edit terms' : 'New terms'}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="pb-btn pb-btn-ghost" onClick={() => setPreview(true)}><i className="fa-solid fa-eye" /> Preview as student</button>
          <span className="pb-grow" />
          <button className="pb-btn pb-btn-ghost" onClick={onClose}>Cancel</button>
          {d.status !== 'live' && <button className="pb-btn" disabled={busy} onClick={() => save(false)}>Save draft</button>}
          <button className="pb-btn pb-btn-primary" disabled={busy || uploading} onClick={() => save(true)}>{busy && <span className="pb-spinner" />} {d.status === 'live' ? 'Save' : 'Save & go live'}</button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12 }}>
        <label className="pb-label">Title (students see this as the link)
          <input className="pb-input" value={d.title} onChange={(e) => set({ title: e.target.value })} style={{ width: '100%', marginTop: 4 }} placeholder="Terms & Conditions" />
        </label>
        <label className="pb-label">Type
          <select className="pb-select" value={d.kind} onChange={(e) => set({ kind: e.target.value as any })} style={{ width: '100%', marginTop: 4 }}>
            <option value="terms">Terms &amp; conditions</option>
            <option value="agreement">Agreement</option>
          </select>
        </label>
      </div>

      <label className="pb-label" style={{ display: 'block', marginTop: 12 }}>Introduction (optional)
        <textarea className="pb-textarea" rows={2} value={d.intro} onChange={(e) => set({ intro: e.target.value })} style={{ width: '100%', marginTop: 4 }} placeholder="A line shown above the points, e.g. Please read these rules carefully." />
      </label>

      <div style={{ marginTop: 14 }}>
        <div className="pb-row" style={{ marginBottom: 6 }}>
          <span className="pb-label pb-grow">Points ({d.points.filter((p) => p.trim()).length})</span>
          <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={() => setPaste('')}><i className="fa-solid fa-paste" /> Paste many</button>
        </div>
        {paste !== null && (
          <div className="pb-card" style={{ padding: 10, marginBottom: 8 }}>
            <textarea className="pb-textarea" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} style={{ width: '100%' }} placeholder="One point per line. Numbers and bullets at the start are removed." autoFocus />
            <div className="pb-row" style={{ marginTop: 6, justifyContent: 'flex-end' }}>
              <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={() => setPaste(null)}>Cancel</button>
              <button className="pb-btn pb-btn-sm pb-btn-primary" onClick={() => {
                const lines = paste.split(/\r?\n/).map((l) => l.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, '').trim()).filter(Boolean);
                set({ points: [...d.points.filter((p) => p.trim()), ...lines] });
                setPaste(null);
              }}>Add {paste.split(/\r?\n/).filter((l) => l.trim()).length} points</button>
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gap: 6 }}>
          {d.points.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span className="pb-muted" style={{ width: 22, textAlign: 'right', paddingTop: 8 }}>{i + 1}.</span>
              <textarea className="pb-textarea" rows={Math.min(5, Math.max(1, Math.ceil(p.length / 90)))} value={p} onChange={(e) => setPoint(i, e.target.value)} style={{ flex: 1 }} placeholder="Write a point…" />
              <button className="pb-btn pb-btn-sm pb-btn-ghost pb-btn-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><i className="fa-solid fa-arrow-up" /></button>
              <button className="pb-btn pb-btn-sm pb-btn-ghost pb-btn-icon" onClick={() => move(i, 1)} disabled={i === d.points.length - 1} aria-label="Move down"><i className="fa-solid fa-arrow-down" /></button>
              <button className="pb-btn pb-btn-sm pb-btn-ghost pb-btn-icon" onClick={() => set({ points: d.points.length > 1 ? d.points.filter((_, j) => j !== i) : [''] })} aria-label="Remove"><i className="fa-solid fa-xmark" /></button>
            </div>
          ))}
        </div>
        <button className="pb-btn pb-btn-sm" style={{ marginTop: 8 }} onClick={() => set({ points: [...d.points, ''] })}><i className="fa-solid fa-plus" /> Add point</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="pb-label" style={{ marginBottom: 6 }}>Agreement document (optional)</div>
        {d.document?.url ? (
          <div className="pb-row">
            <i className="fa-solid fa-file-contract" />
            <a href={d.document.url} target="_blank" rel="noreferrer">{d.document.name}</a>
            <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={() => set({ document: null })}>Remove</button>
          </div>
        ) : (
          <label className="pb-btn pb-btn-sm" style={{ cursor: 'pointer' }}>
            {uploading ? <><span className="pb-spinner" /> Uploading…</> : <><i className="fa-solid fa-upload" /> Attach PDF / Word / image (max 10 MB)</>}
            <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" hidden onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        )}
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 4 }}>
        <label className="pb-switch" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={d.requireSignature} onChange={(e) => set({ requireSignature: e.target.checked })} style={{ marginTop: 3 }} />
          <span><b>Ask for a signature</b><br /><span className="pb-muted" style={{ fontSize: 13 }}>Students draw their signature and type their full name. Kept with a copy of exactly what they agreed to.</span></span>
        </label>
        <label className="pb-switch" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={d.blockLms} onChange={(e) => set({ blockLms: e.target.checked })} style={{ marginTop: 3 }} />
          <span><b>Hold the LMS until accepted</b><br /><span className="pb-muted" style={{ fontSize: 13 }}>Students covered by this can only open their profile page until they accept — even if their profile is already complete. Off: they accept it the next time they submit their profile.</span></span>
        </label>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="pb-label" style={{ marginBottom: 6 }}>Who must accept</div>
        <div className="pb-seg" style={{ display: 'inline-flex', gap: 4, marginBottom: 8 }}>
          {([['all', 'All students'], ['batches', 'Batches'], ['students', 'Specific students']] as [AudienceMode, string][]).map(([m, label]) => (
            <button key={m} className={`pb-btn pb-btn-sm ${d.mode === m ? 'pb-btn-primary' : ''}`} onClick={() => set({ mode: m })}>{label}</button>
          ))}
        </div>
        {d.mode === 'all' && <p className="pb-muted" style={{ margin: 0, fontSize: 13 }}>Every student in a batch, including students who join later.</p>}
        {d.mode === 'batches' && (
          <div className="pb-card" style={{ padding: 10 }}>
            <input className="pb-input" placeholder="Filter batches…" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
            <div style={{ maxHeight: 200, overflow: 'auto', display: 'grid', gap: 2 }}>
              {batchList.map((b) => (
                <label key={b.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                  <input type="checkbox" checked={chosen.has(b.id)} onChange={(e) => set({ batches: e.target.checked ? [...d.batches, b] : d.batches.filter((x) => x.id !== b.id) })} />
                  {b.name}
                </label>
              ))}
              {!batchList.length && <span className="pb-muted">No batches found.</span>}
            </div>
            <div className="pb-muted" style={{ fontSize: 12.5, marginTop: 6 }}>{d.batches.length} selected · students in these batches (or placement batches), including new joiners.</div>
          </div>
        )}
        {d.mode === 'students' && (
          <div className="pb-card" style={{ padding: 10 }}>
            <div className="pb-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {d.students.map((s) => (
                <span key={s.id} className="pb-chip">{s.name} <button className="pb-linkbtn" onClick={() => set({ students: d.students.filter((x) => x.id !== s.id) })} aria-label={`Remove ${s.name}`}>×</button></span>
              ))}
              {!d.students.length && <span className="pb-muted" style={{ fontSize: 13 }}>No students picked yet.</span>}
            </div>
            <input className="pb-input" placeholder="Search by name, email or phone…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%' }} />
            {opts.students.length > 0 && (
              <div style={{ maxHeight: 180, overflow: 'auto', marginTop: 4, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                {opts.students.filter((s) => !d.students.some((x) => x.id === s.id)).map((s) => (
                  <button key={s.id} className="pb-linkbtn" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px' }} onClick={() => set({ students: [...d.students, s] })}>
                    <b>{s.name}</b> <span className="pb-muted">{s.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {d.id && d.status !== 'draft' && d.hasAcceptances && (
        <label className="pb-alert pb-alert-warn" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 16 }}>
          <input type="checkbox" checked={reask} onChange={(e) => setReask(e.target.checked)} style={{ marginTop: 3 }} />
          <span><b>Ask everyone to agree again</b> — tick this if you changed what the points mean. Leave it off for small fixes such as typos; earlier acceptances then keep counting.</span>
        </label>
      )}

      {preview && <AgreementModal agreement={previewAgreement} onClose={() => setPreview(false)} onAgree={() => setPreview(false)} />}
    </Modal>
  );
};

/* ── Responses ──────────────────────────────────────────────────────────────────────────── */

const Responses: React.FC<{ agreement: AdminAgreement; onClose: () => void }> = ({ agreement, onClose }) => {
  const [data, setData] = useState<{ rows: ResponseRow[]; agreement: { version: number; requireSignature: boolean } } | null>(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'all' | 'accepted' | 'pending'>('all');
  const [q, setQ] = useState('');
  const [record, setRecord] = useState<SignedRecord | null>(null);

  useEffect(() => { agreementsApi.responses(agreement.id).then(setData).catch((e) => setErr(errMsg(e, 'Could not load responses.'))); }, [agreement.id]);

  const shown = useMemo(() => (data?.rows || []).filter((r) => {
    if (filter === 'accepted' && r.status !== 'accepted') return false;
    if (filter === 'pending' && r.status === 'accepted') return false;
    const s = q.trim().toLowerCase();
    return !s || [r.name, r.email, r.phone, r.batch].some((v) => (v || '').toLowerCase().includes(s));
  }), [data, filter, q]);

  const csv = () => {
    const head = ['Name', 'Email', 'Phone', 'Batch', 'Status', 'Accepted at', 'Version', 'Signed name', 'IP'];
    const lines = [head, ...shown.map((r) => [r.name, r.email, r.phone, r.batch, r.status === 'accepted' ? 'Accepted' : r.status === 'old_version' ? 'Accepted an older version' : 'Pending', r.acceptedAt ? new Date(r.acceptedAt).toISOString() : '', r.version ?? '', r.signedName, r.ip])];
    const text = lines.map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' }));
    a.download = `${agreement.title.replace(/[^\w]+/g, '-')}-responses.csv`;
    a.click();
  };

  const counts = { accepted: data?.rows.filter((r) => r.status === 'accepted').length || 0, total: data?.rows.length || 0 };

  return (
    <Modal title={`Responses — ${agreement.title}`} onClose={onClose} wide footer={<><button className="pb-btn" onClick={csv} disabled={!shown.length}><i className="fa-solid fa-download" /> Download CSV</button><button className="pb-btn pb-btn-primary" onClick={onClose}>Close</button></>}>
      {err && <div className="pb-alert pb-alert-bad">{err}</div>}
      {!data && !err && <div className="pb-muted"><span className="pb-spinner" /> Loading…</div>}
      {data && (
        <>
          <div className="pb-row" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
            <b>{counts.accepted}</b> of {counts.total} accepted version {data.agreement.version}
            <span className="pb-grow" />
            {(['all', 'accepted', 'pending'] as const).map((f) => (
              <button key={f} className={`pb-btn pb-btn-sm ${filter === f ? 'pb-btn-primary' : 'pb-btn-ghost'}`} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'accepted' ? 'Accepted' : 'Pending'}</button>
            ))}
            <input className="pb-input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 180 }} />
          </div>
          <div className="pb-table-wrap" style={{ maxHeight: 420, overflow: 'auto' }}>
            <table className="pb-table">
              <thead><tr><th>Student</th><th>Batch</th><th>Status</th><th>When</th><th /></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.studentId}>
                    <td><div style={{ fontWeight: 600 }}>{r.name}</div><div className="pb-muted" style={{ fontSize: 12 }}>{r.email}{r.phone ? ` · ${r.phone}` : ''}</div></td>
                    <td>{r.batch}</td>
                    <td>
                      {r.status === 'accepted' && <span className="pb-pill pb-badge-ok">Accepted</span>}
                      {r.status === 'old_version' && <span className="pb-pill pb-badge-warn">Older version (v{r.version})</span>}
                      {r.status === 'pending' && <span className="pb-pill pb-badge-neutral">Pending</span>}
                    </td>
                    <td style={{ fontSize: 13 }}>{fmt(r.acceptedAt)}{r.signedName ? <div className="pb-muted" style={{ fontSize: 12 }}>Signed: {r.signedName}</div> : null}</td>
                    <td>{r.acceptanceId && <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={async () => { try { setRecord(await agreementsApi.record(r.acceptanceId!)); } catch { /* ignore */ } }}>View signed copy</button>}</td>
                  </tr>
                ))}
                {!shown.length && <tr><td colSpan={5} className="pb-muted" style={{ textAlign: 'center', padding: 18 }}>Nobody here.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      {record && <SignedRecordModal record={record} onClose={() => setRecord(null)} />}
    </Modal>
  );
};

export default AgreementsPage;
