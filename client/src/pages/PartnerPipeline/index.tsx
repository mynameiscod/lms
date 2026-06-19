import React, { useCallback, useEffect, useRef, useState } from 'react';
import { placementPartnerApi as api, PlacementPartner, PartnerStage, PartnerStageMeta, ImportResult } from '../../api/placementPartnerApi';
import './PartnerPipeline.css';

const TIER_LABEL: Record<string, string> = { tier1: 'Tier 1', tier2: 'Tier 2', tier3: 'Tier 3' };

export default function PartnerPipeline() {
  const [stages, setStages] = useState<PartnerStageMeta[]>([]);
  const [byStage, setByStage] = useState<Record<string, PlacementPartner[]>>({});
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [filters, setFilters] = useState({ tier: '', priority: '', search: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const dragRef = useRef<{ id: string; from: PartnerStage } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, ls] = await Promise.all([api.getStages(), api.list({
        tier: filters.tier || undefined, priority: filters.priority || undefined, search: filters.search || undefined,
      })]);
      const stageArr = st.data.data;
      setStages(stageArr);
      const grouped: Record<string, PlacementPartner[]> = {};
      stageArr.forEach(s => { grouped[s.id] = []; });
      ls.data.data.forEach(p => { (grouped[p.stage] ||= []).push(p); });
      setByStage(grouped);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleDrop = async (to: PartnerStage) => {
    setDragOver(null);
    const drag = dragRef.current; dragRef.current = null;
    if (!drag || drag.from === to) return;
    const { id, from } = drag;
    setByStage(prev => {
      const moved = (prev[from] || []).find(p => p._id === id);
      if (!moved) return prev;
      return { ...prev, [from]: prev[from].filter(p => p._id !== id), [to]: [...(prev[to] || []), { ...moved, stage: to }] };
    });
    setMoving(true);
    try { await api.moveStage(id, to); } catch (e) { console.error(e); load(); } finally { setMoving(false); }
  };

  const total = Object.values(byStage).reduce((s, a) => s + a.length, 0);

  return (
    <div className="pp-wrap">
      <div className="pp-head">
        <div>
          <h1>Placement Partner Pipeline</h1>
          <p className="sub">{total} companies · drag a card to change stage{moving ? ' · saving…' : ''}</p>
        </div>
        <div className="pp-actions">
          <button className="pp-btn pp-btn-ghost pp-btn-sm" onClick={load} disabled={loading}>↻ Refresh</button>
          <button className="pp-btn pp-btn-teal" onClick={() => setShowImport(true)}>⬆ Import CSV</button>
          <button className="pp-btn pp-btn-primary" onClick={() => setShowAdd(true)}>+ Add partner</button>
        </div>
      </div>

      <div className="pp-filters">
        <select value={filters.tier} onChange={e => setFilters(f => ({ ...f, tier: e.target.value }))}>
          <option value="">All tiers</option>
          <option value="tier1">Tier 1</option><option value="tier2">Tier 2</option><option value="tier3">Tier 3</option>
        </select>
        <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All priorities</option>
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <input placeholder="Search company…" value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
      </div>

      {loading ? (
        <div className="pp-empty" style={{ padding: 60 }}>Loading board…</div>
      ) : (
        <div className="pp-board">
          {stages.map(stage => {
            const cards = byStage[stage.id] || [];
            return (
              <div key={stage.id} className="pp-col"
                onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(stage.id)}>
                <div className="pp-col-head" style={{ background: stage.color }}>
                  {stage.name}<span className="count">{cards.length}</span>
                </div>
                <div className={`pp-drop ${dragOver === stage.id ? 'over' : ''}`}>
                  {cards.map(p => (
                    <div key={p._id} className={`pp-card prio-${p.priority}`} draggable
                      onDragStart={() => { dragRef.current = { id: p._id, from: stage.id }; }}>
                      <div className="name">{p.companyName}</div>
                      {(p.contactName || p.contactEmail) && (
                        <div className="meta">{p.contactName}{p.contactName && p.contactEmail ? ' · ' : ''}{p.contactEmail}</div>
                      )}
                      {p.location && <div className="meta">📍 {p.location}</div>}
                      <div className="row2">
                        <span className={`pp-badge pp-${p.tier}`}>{TIER_LABEL[p.tier]}</span>
                        <span className={`pp-badge pp-fit ${p.fresherFit}`}>Fit: {p.fresherFit}</span>
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && <div className="pp-empty">Drop here</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={() => load()} />}
    </div>
  );
}

// ── Add partner modal ─────────────────────────────────────────────────────────
function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({ companyName: '', tier: 'tier3', priority: 'medium', fresherFit: 'medium' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!f.companyName.trim()) { setErr('Company name is required'); return; }
    setBusy(true); setErr('');
    try { await api.create(f); onSaved(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Failed to save'); }
    finally { setBusy(false); }
  };

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>
        <h2>Add placement partner</h2>
        {err && <div className="pp-banner err">{err}</div>}
        <div className="pp-field"><label>Company name *</label><input value={f.companyName} onChange={set('companyName')} /></div>
        <div className="pp-grid2">
          <div className="pp-field"><label>Tier</label><select value={f.tier} onChange={set('tier')}><option value="tier1">Tier 1</option><option value="tier2">Tier 2</option><option value="tier3">Tier 3</option></select></div>
          <div className="pp-field"><label>Priority</label><select value={f.priority} onChange={set('priority')}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div className="pp-field"><label>Fresher fit</label><select value={f.fresherFit} onChange={set('fresherFit')}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div className="pp-field"><label>Location</label><input value={f.location || ''} onChange={set('location')} /></div>
          <div className="pp-field"><label>Website</label><input value={f.website || ''} onChange={set('website')} placeholder="https://" /></div>
          <div className="pp-field"><label>Contact name</label><input value={f.contactName || ''} onChange={set('contactName')} /></div>
          <div className="pp-field"><label>Contact email</label><input value={f.contactEmail || ''} onChange={set('contactEmail')} /></div>
          <div className="pp-field"><label>Contact title</label><input value={f.contactTitle || ''} onChange={set('contactTitle')} /></div>
        </div>
        <div className="pp-field"><label>Outreach angle</label><input value={f.outreachAngle || ''} onChange={set('outreachAngle')} placeholder="Why we're a fit for them" /></div>
        <div className="pp-modal-actions">
          <button className="pp-btn pp-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pp-btn pp-btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Add partner'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Import CSV modal ──────────────────────────────────────────────────────────
function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [err, setErr] = useState('');

  const upload = async () => {
    if (!file) return;
    setBusy(true); setErr(''); setResult(null);
    try { const r = await api.import(file); setResult(r.data.data); onDone(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Import failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>
        <h2>Import companies (CSV)</h2>
        {err && <div className="pp-banner err">{err}</div>}
        {result ? (
          <>
            <div className="pp-banner ok">Created {result.created} · Updated {result.updated} · Skipped {result.skipped} (of {result.total} rows)</div>
            {result.errors?.length > 0 && (
              <div className="pp-hint">Skipped rows: {result.errors.map(e => `#${e.row} (${e.reason})`).join(', ')}</div>
            )}
            <div className="pp-modal-actions"><button className="pp-btn pp-btn-primary" onClick={onClose}>Done</button></div>
          </>
        ) : (
          <>
            <div className="pp-field">
              <label>CSV file</label>
              <input type="file" accept=".csv,text/csv" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="pp-hint">
              Columns (header row, any order — extras ignored):<br />
              <b>company</b> (required), website, location, tier (1/2/3), priority (high/medium/low),
              fresher_fit (high/medium/low), outreach_angle, contact_name, contact_email, contact_title, contact_phone, notes.<br />
              Re-importing the same company updates it (no duplicates).
            </div>
            <div className="pp-modal-actions">
              <button className="pp-btn pp-btn-ghost" onClick={onClose}>Cancel</button>
              <button className="pp-btn pp-btn-teal" onClick={upload} disabled={!file || busy}>{busy ? 'Importing…' : 'Import'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
