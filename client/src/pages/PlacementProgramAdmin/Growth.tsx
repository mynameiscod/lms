import React, { useEffect, useMemo, useState } from 'react';
import { placementAdminApi, PLACEMENT_STAGES, stageLabel, errMsg } from '../../api/placementProgramApi';
import { waTemplateApi, WaTemplate } from '../../api/whatsAppTemplateApi';
import { userApi, batchApi } from '../../api';

/** Phase 5 tools: add LMS students, message a whole stage, and the ad-conversion settings. */

interface Student { _id: string; name: string; phone?: string; batchId?: string }

export const AddStudentsModal: React.FC<{ onClose: () => void; onDone: () => void }> = ({ onClose, onDone }) => {
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [batch, setBatch] = useState('');
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [waive, setWaive] = useState<Record<string, boolean>>({});
  const [notify, setNotify] = useState(true);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<{ added: number; linked: number; skipped: { name: string; reason: string }[] } | null>(null);

  useEffect(() => {
    batchApi.getBatches().then((r: any) => setBatches((r?.data || r || []).map((b: any) => ({ _id: b._id, name: b.name })))).catch(() => undefined);
    userApi.getUsers('lms').then((r: any) => setStudents((r?.data || []).filter((u: any) => u.role === 'STUDENT' && u.isActive !== false)
      .map((u: any) => ({ _id: u._id, name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email, phone: u.phone, batchId: u.batchId ? String(u.batchId) : '' })))).catch(e => setErr(errMsg(e)));
  }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter(s => (!batch || s.batchId === batch) && (!q || s.name.toLowerCase().includes(q) || String(s.phone || '').includes(q)));
  }, [students, batch, search]);
  const chosen = Object.keys(picked).filter(k => picked[k]);
  const allShown = shown.length > 0 && shown.every(s => picked[s._id]);

  const submit = async () => {
    setBusy(true); setErr('');
    try { setResult(await placementAdminApi.push(chosen.map(id => ({ userId: id, waiveFee: !!waive[id] })), notify)); onDone(); }
    catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  return (
    <div className="ppa-drawer-wrap ppa-modal-wrap" onClick={onClose}>
      <div className="ppa-modal wide" onClick={e => e.stopPropagation()} role="dialog" aria-label="Add LMS students">
        <button className="ppa-x" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
        <h2>Add LMS students</h2>
        {result ? (
          <>
            <div className="ppa-ok-box">Added <b>{result.added}</b>{result.linked ? <>, linked <b>{result.linked}</b> who were already in the program</> : null}.</div>
            {result.skipped.length > 0 && (
              <ul className="ppa-skipped">{result.skipped.map((s, i) => <li key={i}><b>{s.name}</b> — {s.reason}</li>)}</ul>
            )}
            <div className="ppa-save-row"><button className="ppa-btn" onClick={onClose}>Done</button></div>
          </>
        ) : (
          <>
            <p className="ppa-note">Choose students, and for each one whether they pay the interview fee or it is waived. They get their own candidate page.</p>
            {err && <div className="ppa-err">{err}</div>}
            <div className="ppa-row" style={{ marginTop: 10 }}>
              <select value={batch} onChange={e => setBatch(e.target.value)}><option value="">All batches</option>{batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select>
              <input placeholder="Search name or mobile" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="ppa-pick-head">
              <label><input type="checkbox" checked={allShown} onChange={e => setPicked(p => ({ ...p, ...Object.fromEntries(shown.map(s => [s._id, e.target.checked])) }))} /> Select all shown ({shown.length})</label>
              <span>
                <button className="ppa-link" type="button" onClick={() => setWaive(w => ({ ...w, ...Object.fromEntries(chosen.map(id => [id, false])) }))}>Charge all selected</button>
                {' · '}
                <button className="ppa-link" type="button" onClick={() => setWaive(w => ({ ...w, ...Object.fromEntries(chosen.map(id => [id, true])) }))}>Waive all selected</button>
              </span>
            </div>
            <div className="ppa-pick-list">
              {shown.map(s => (
                <div key={s._id} className={`ppa-pick-row${picked[s._id] ? ' on' : ''}`}>
                  <label><input type="checkbox" checked={!!picked[s._id]} onChange={e => setPicked(p => ({ ...p, [s._id]: e.target.checked }))} /> <b>{s.name}</b>
                    <span className="ppa-sub2">{s.phone || 'no mobile — will be skipped'}</span></label>
                  {picked[s._id] && (
                    <div className="ppa-seg">
                      <button type="button" className={!waive[s._id] ? 'on' : ''} onClick={() => setWaive(w => ({ ...w, [s._id]: false }))}>Charge fee</button>
                      <button type="button" className={waive[s._id] ? 'on' : ''} onClick={() => setWaive(w => ({ ...w, [s._id]: true }))}>Waive</button>
                    </div>
                  )}
                </div>
              ))}
              {!shown.length && <p className="ppa-muted">No students match.</p>}
            </div>
            <label className="ppa-check"><input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} /> Send the WhatsApp welcome (the "registration received" template)</label>
            <div className="ppa-save-row">
              <button className="ppa-btn" disabled={!chosen.length || busy} onClick={submit}>{busy ? 'Adding…' : `Add ${chosen.length} student${chosen.length === 1 ? '' : 's'}`}</button>
              <span className="ppa-note" style={{ margin: 0 }}>{chosen.filter(id => waive[id]).length} waived · {chosen.filter(id => !waive[id]).length} charged</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const StageMessageModal: React.FC<{ initialStage?: string; counts: Record<string, number>; onClose: () => void }> = ({ initialStage, counts, onClose }) => {
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [stages, setStages] = useState<string[]>(initialStage ? [initialStage] : []);
  const [tplId, setTplId] = useState('');
  const [values, setValues] = useState<string[]>([]);
  const [buttonParam, setButtonParam] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => { waTemplateApi.list().then(t => setTemplates(t.filter(x => x.status === 'APPROVED'))).catch(e => setErr(errMsg(e))); }, []);
  const tpl = templates.find(t => t._id === tplId);
  const varCount = tpl?.shape?.bodyVarCount || 0;
  useEffect(() => { setValues(Array.from({ length: varCount }, (_, i) => (i === 0 ? '{name}' : ''))); setButtonParam(''); }, [tplId, varCount]);
  const total = stages.reduce((n, s) => n + (counts[s] || 0), 0);

  const send = async () => {
    if (!tpl) return;
    if (!window.confirm(`Send "${tpl.name}" to ${total} candidate${total === 1 ? '' : 's'}?`)) return;
    setBusy(true); setErr('');
    try { const r = await placementAdminApi.broadcast({ stages, templateId: tpl._id, values, buttonParam: buttonParam || undefined }); setDone(r.total); }
    catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  return (
    <div className="ppa-drawer-wrap ppa-modal-wrap" onClick={onClose}>
      <div className="ppa-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Message a stage">
        <button className="ppa-x" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
        <h2>Message a stage</h2>
        {done !== null ? (
          <>
            <div className="ppa-ok-box">Sending to <b>{done}</b> candidates. Follow it under WhatsApp Templates → Sent history, and each message in the Delivery log.</div>
            <div className="ppa-save-row"><button className="ppa-btn" onClick={onClose}>Done</button></div>
          </>
        ) : (
          <>
            {err && <div className="ppa-err">{err}</div>}
            <h3>Who</h3>
            <div className="ppa-chips">
              {PLACEMENT_STAGES.filter(([k]) => counts[k]).map(([k]) => (
                <button key={k} type="button" className={`ppa-chip-btn${stages.includes(k) ? ' on' : ''}`} onClick={() => setStages(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k])}>
                  {stageLabel(k)} ({counts[k]})
                </button>
              ))}
            </div>
            <h3>Template</h3>
            <select value={tplId} onChange={e => setTplId(e.target.value)} style={{ width: '100%' }}>
              <option value="">Choose an approved template…</option>
              {templates.map(t => <option key={t._id} value={t._id}>{t.name} · {t.category.toLowerCase()}</option>)}
            </select>
            {tpl && (
              <>
                <div className="ppa-tpl-body">{tpl.body}</div>
                {tpl.category === 'MARKETING' && <p className="ppa-bad" style={{ fontSize: 12.5 }}>Marketing templates are often not delivered to people who have not messaged you recently. Prefer UTILITY.</p>}
                {values.map((v, i) => (
                  <label key={i} className="ppa-var">{`{{${i + 1}}}`}<input value={v} onChange={e => setValues(vs => vs.map((x, j) => j === i ? e.target.value : x))} /></label>
                ))}
                {tpl.shape?.urlButtonIndex >= 0 && <label className="ppa-var">Button link end<input value={buttonParam} onChange={e => setButtonParam(e.target.value)} /></label>}
                <p className="ppa-note">Type <code>{'{name}'}</code> for each person's first name and <code>{'{link}'}</code> for their own candidate page.</p>
              </>
            )}
            <div className="ppa-save-row">
              <button className="ppa-btn" disabled={!tpl || !stages.length || !total || busy || values.some(v => !v.trim())} onClick={send}>{busy ? 'Starting…' : `Send to ${total}`}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const ConversionsSettings: React.FC = () => {
  const [st, setSt] = useState<{ meta: { configured: boolean; pixelId: string }; googleNames: Record<string, string> } | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  const [msg, setMsg] = useState('');

  useEffect(() => { placementAdminApi.conversionsStatus().then(setSt).catch(() => undefined); }, []);
  const download = async () => {
    setMsg('');
    try { const n = await placementAdminApi.downloadGoogleCsv(from, to); setMsg(n ? `${n} conversion${n === 1 ? '' : 's'} in the file.` : 'No Google-ad conversions in that period (only candidates who came from a Google ad are included).'); }
    catch (e) { setMsg(errMsg(e)); }
  };

  return (
    <div className="ppa-card">
      <h3 className="ppa-card-title">Ad conversions</h3>
      <p className="ppa-note" style={{ marginTop: 0 }}>Telling the ad platforms who actually paid, attended and was selected lets them find more people like that — not just more form fills.</p>
      <div className="ppa-conv">
        <div>
          <b><i className="bi bi-meta" /> Meta (Instagram / Facebook)</b>
          {st?.meta.configured
            ? <p className="ppa-ok">Connected (pixel {st.meta.pixelId}). Paid, Interview attended and Selected are sent automatically.</p>
            : <p className="ppa-note">Not connected. Add the Pixel ID and Conversions API token in Platform Settings → Meta / WhatsApp, and events start flowing.</p>}
        </div>
        <div>
          <b><i className="bi bi-google" /> Google Ads</b>
          <p className="ppa-note">Download conversions for candidates who came from a Google ad, then upload in Google Ads → Goals → Conversions → Uploads. Create these conversion actions once (type: Import → other data sources): {st ? Object.values(st.googleNames).map(n => <code key={n} style={{ marginRight: 6 }}>{n}</code>) : null}</p>
          <div className="ppa-row">
            <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} />
            <input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} />
            <button className="ppa-btn ghost" type="button" onClick={download}><i className="bi bi-download" /> Download CSV</button>
          </div>
          {msg && <p className="ppa-note">{msg}</p>}
        </div>
      </div>
    </div>
  );
};
