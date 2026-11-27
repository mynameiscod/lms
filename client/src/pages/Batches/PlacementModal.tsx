import React, { useEffect, useMemo, useState } from 'react';
import { batchApi } from '../../api';
import { Batch, User } from '../../types';

/**
 * Placement batch settings for one batch.
 *
 * A placement batch draws students from other batches without moving them: their home batch
 * (curriculum, attendance, fees, quizzes, reports) stays as it is. Labs ticked under "Takes over"
 * come from this batch for its members instead of from their home batch.
 */

type Lab = 'thinking' | 'communication';
const LABS: { key: Lab; label: string; icon: string }[] = [
  { key: 'thinking', label: 'Thinking Lab', icon: '🧠' },
  { key: 'communication', label: 'Communication Lab', icon: '🎙️' },
];

interface Member { _id: string; name: string; email: string; homeBatchName: string; isActive: boolean }
interface View { kind: 'regular' | 'placement'; takesOverLabs: Lab[]; labsWithTrack: Lab[]; members: Member[] }

const homeId = (u: any): string => (u?.batchId && typeof u.batchId === 'object' ? u.batchId._id : u?.batchId) || '';

const PlacementModal: React.FC<{
  batch: Batch;
  batches: Batch[];
  students: User[];
  onClose: () => void;
  onChanged: (msg: string) => void;
}> = ({ batch, batches, students, onClose, onChanged }) => {
  const [view, setView] = useState<View | null>(null);
  const [kind, setKind] = useState<'regular' | 'placement'>('regular');
  const [labs, setLabs] = useState<Set<Lab>>(new Set());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [fromBatch, setFromBatch] = useState('');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const apply = (v: View) => { setView(v); setKind(v.kind); setLabs(new Set(v.takesOverLabs)); };

  useEffect(() => {
    batchApi.getPlacement(batch._id).then((r) => apply(r.data)).catch((e) => setErr(e.message));
  }, [batch._id]);

  const batchName = useMemo(() => new Map(batches.map((b) => [b._id, b.name])), [batches]);
  const memberIds = useMemo(() => new Set((view?.members || []).map((m) => m._id)), [view]);
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => (s.role || '').toUpperCase() === 'STUDENT' && s.isActive !== false)
      .filter((s) => !memberIds.has(s._id) && homeId(s) && homeId(s) !== batch._id)
      .filter((s) => !fromBatch || homeId(s) === fromBatch)
      .filter((s) => !q || `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(q))
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }, [students, memberIds, fromBatch, search, batch._id]);

  const homeCount = useMemo(() => students.filter((s) => (s.role || '').toUpperCase() === 'STUDENT' && homeId(s) === batch._id).length, [students, batch._id]);
  const dirty = !!view && (kind !== view.kind || [...labs].sort().join() !== [...view.takesOverLabs].sort().join());

  const run = async (fn: () => Promise<any>, msg?: (r: any) => string) => {
    setBusy(true); setErr('');
    try { const r = await fn(); if (r?.data) apply(r.data); if (msg) onChanged(msg(r)); return true; }
    catch (e: any) { setErr(e.message); return false; }
    finally { setBusy(false); }
  };

  const saveSettings = () => run(() => batchApi.updatePlacement(batch._id, { kind, takesOverLabs: [...labs] }), () => 'Placement settings saved');
  const addPicked = async () => {
    const ok = await run(() => batchApi.changePlacementMembers(batch._id, [...picked], true), (r) => r.message || 'Added');
    if (ok) setPicked(new Set());
  };
  const remove = (id: string) => run(() => batchApi.changePlacementMembers(batch._id, [id], false), (r) => r.message || 'Removed');

  const togglePick = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allPicked = candidates.length > 0 && candidates.every((c) => picked.has(c._id));
  const pickAll = () => setPicked((p) => { const n = new Set(p); candidates.forEach((c) => (allPicked ? n.delete(c._id) : n.add(c._id))); return n; });

  const isPlacement = view?.kind === 'placement';
  const missingTrack = [...labs].filter((l) => !(view?.labsWithTrack || []).includes(l));

  return (
    <div className="bmod-overlay" onClick={onClose}>
      <div className="bmod pl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bmod-head">
          <div>
            <h2 className="bmod-title">🎯 Placement — {batch.name}</h2>
            <p className="bmod-sub">Pick students from any batch without moving them. Their home batch keeps their classes, attendance, fees, quizzes and reports. The labs you tick below come from this batch for them instead of from their home batch, so there is never a clash.</p>
          </div>
          {isPlacement && <span className="bmod-count">{view!.members.length} member{view!.members.length === 1 ? '' : 's'}</span>}
        </div>

        {err && <div className="bmod-err">{err}</div>}

        <div className="bmod-body">
          {!view ? <div className="pl-empty">Loading…</div> : (
            <>
              <div className="bmod-group">
                <div className="bmod-group-title">Batch type</div>
                <div className="pl-kinds">
                  {(['regular', 'placement'] as const).map((k) => (
                    <label key={k} className={`pl-kind ${kind === k ? 'on' : ''}`}>
                      <input type="radio" name="pl-kind" checked={kind === k} onChange={() => setKind(k)} />
                      <span><b>{k === 'regular' ? 'Regular batch' : 'Placement batch'}</b>
                        <small>{k === 'regular' ? 'Students belong to it as their home batch.' : 'Members come from other batches and keep their home batch.'}</small></span>
                    </label>
                  ))}
                </div>
                {kind === 'placement' && view.kind !== 'placement' && homeCount > 0 && (
                  <p className="pl-warn">{homeCount} student(s) have this as their home batch. Move them to another batch first, or create a new batch for placements.</p>
                )}
              </div>

              {kind === 'placement' && (
                <div className="bmod-group">
                  <div className="bmod-group-title">Takes over these labs for its members</div>
                  <div className="pl-labs">
                    {LABS.map((l) => (
                      <label key={l.key} className={`pl-lab ${labs.has(l.key) ? 'on' : ''}`}>
                        <input type="checkbox" checked={labs.has(l.key)} onChange={() => setLabs((s) => { const n = new Set(s); n.has(l.key) ? n.delete(l.key) : n.add(l.key); return n; })} />
                        <span>{l.icon} {l.label}</span>
                        {(view.labsWithTrack || []).includes(l.key) ? <em className="pl-ok">track attached</em> : <em className="pl-no">no track yet</em>}
                      </label>
                    ))}
                  </div>
                  <p className="pl-hint">Ticked: members get this batch's daily challenge, window and lab gate; their home batch's track for that lab pauses for them only. Not ticked: they keep the lab from their home batch.</p>
                  {missingTrack.length > 0 && <p className="pl-warn">Attach a {missingTrack.map((l) => (l === 'thinking' ? 'Thinking' : 'Communication')).join(' and ')} Lab track to this batch (Lab Tracks page), otherwise members see no challenge for that lab.</p>}
                </div>
              )}

              {dirty && (
                <div className="pl-save">
                  <button className="bm-btn primary" onClick={saveSettings} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
                </div>
              )}

              {isPlacement && !dirty && (
                <>
                  <div className="bmod-group">
                    <div className="bmod-group-title">Members ({view.members.length})</div>
                    {view.members.length === 0 ? <div className="pl-empty">No members yet. Add students below.</div> : (
                      <div className="pl-list">
                        {view.members.map((m) => (
                          <div key={m._id} className="pl-row">
                            <div><b>{m.name}</b>{!m.isActive && <span className="pl-off">login off</span>}<small>{m.email}</small></div>
                            <span className="pl-home">{m.homeBatchName || '—'}</span>
                            <button className="pl-x" onClick={() => remove(m._id)} disabled={busy} title="Remove from this placement batch">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bmod-group">
                    <div className="bmod-group-title">Add students</div>
                    <div className="pl-filters">
                      <select value={fromBatch} onChange={(e) => setFromBatch(e.target.value)}>
                        <option value="">All batches</option>
                        {batches.filter((b) => b._id !== batch._id && (b as any).kind !== 'placement').map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                      </select>
                      <input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    {candidates.length === 0 ? <div className="pl-empty">No students match.</div> : (
                      <div className="pl-list pl-pick">
                        <label className="pl-row pl-all"><input type="checkbox" checked={allPicked} onChange={pickAll} /><span>Select all {candidates.length}</span></label>
                        {candidates.map((s) => (
                          <label key={s._id} className={`pl-row ${picked.has(s._id) ? 'on' : ''}`}>
                            <input type="checkbox" checked={picked.has(s._id)} onChange={() => togglePick(s._id)} />
                            <div><b>{s.firstName} {s.lastName}</b><small>{s.email}</small></div>
                            <span className="pl-home">{batchName.get(homeId(s)) || '—'}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="bmod-foot">
          <button className="bm-btn" onClick={onClose} disabled={busy}>Close</button>
          {isPlacement && !dirty && <button className="bm-btn primary" onClick={addPicked} disabled={busy || picked.size === 0}>{busy ? 'Saving…' : `Add ${picked.size || ''} selected`.replace('  ', ' ')}</button>}
        </div>
      </div>
    </div>
  );
};

export default PlacementModal;
