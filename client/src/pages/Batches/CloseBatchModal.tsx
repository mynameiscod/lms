import React, { useEffect, useMemo, useState } from 'react';
import { batchApi } from '../../api';

/**
 * Batches → Close batch. Shows how the batch ended (counts the LMS already knows), lets the admin
 * decide what happens to each student still in it — Course completed / move to another batch /
 * leave as they are — and write a few notes. Once closed the batch disappears from every batch list
 * and dropdown; "Show closed batches" brings back its report (server: studentLifecycleService).
 */

type Action = 'complete' | 'move' | 'keep';
interface PreviewStudent { id: string; name: string; email: string; status: 'active' | 'inactive' | 'discontinued' | 'completed'; placed: boolean }
interface Preview {
  batch: { id: string; name: string; startDate: string; endDate: string };
  counts: { total: number; completed: number; placed: number; discontinued: number; inactive: number; active: number };
  students: PreviewStudent[];
  moveTargets: { id: string; name: string }[];
}

const STATUS_LABEL: Record<PreviewStudent['status'], string> = { active: 'Active', inactive: 'Inactive', discontinued: 'Discontinued', completed: 'Course completed' };
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

const CloseBatchModal: React.FC<{ batchId: string; onClose: () => void; onClosed: (msg: string) => void }> = ({ batchId, onClose, onClosed }) => {
  const [p, setP] = useState<Preview | null>(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [actions, setActions] = useState<Record<string, Action>>({});
  const [moveTo, setMoveTo] = useState('');
  const [closedOn, setClosedOn] = useState(todayISO());
  const [discounted, setDiscounted] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    batchApi.closePreview(batchId).then((d: Preview) => {
      setP(d);
      // Default: students still active finish the course; everyone else stays as they are.
      const a: Record<string, Action> = {};
      d.students.forEach((s) => { a[s.id] = s.status === 'active' ? 'complete' : 'keep'; });
      setActions(a);
    }).catch((e) => setErr(e.message));
  }, [batchId]);

  const stillActive = useMemo(() => (p?.students || []).filter((s) => s.status === 'active'), [p]);
  const n = (a: Action) => Object.entries(actions).filter(([id, v]) => v === a && stillActive.some((s) => s.id === id)).length;
  const setAll = (a: Action) => setActions((prev) => { const x = { ...prev }; stillActive.forEach((s) => { x[s.id] = a; }); return x; });

  const submit = async () => {
    if (!p) return;
    if (n('move') && !moveTo) { setErr('Pick the batch to move students to.'); return; }
    setSaving(true); setErr('');
    try {
      const only: Record<string, Action> = {};
      stillActive.forEach((s) => { only[s.id] = actions[s.id] || 'keep'; });
      const r = await batchApi.closeBatch(batchId, {
        closedOn, notes: notes.trim() || undefined, discountedCount: discounted === '' ? null : Number(discounted),
        actions: only, moveTo: moveTo || undefined,
      });
      onClosed(`${p.batch.name} closed${r.completed ? ` · ${r.completed} marked course completed` : ''}${r.moved ? ` · ${r.moved} moved` : ''}`);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const box: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4vh 12px', overflowY: 'auto' };
  const card: React.CSSProperties = { background: '#fff', borderRadius: 14, width: 'min(760px, 100%)', padding: 22, boxShadow: '0 20px 60px rgba(15,23,42,.25)' };
  const stat = (label: string, v: number, color: string) => (
    <div style={{ flex: '1 1 90px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 10px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{v}</div><div style={{ fontSize: 11.5, color: '#64748b' }}>{label}</div>
    </div>
  );

  return (
    <div style={box} onClick={onClose} role="dialog" aria-modal="true">
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 19 }}>🏁 Close batch{p ? ` — ${p.batch.name}` : ''}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer' }} aria-label="Close">×</button>
        </div>
        {!p && !err && <p>Loading…</p>}
        {err && <div style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: '8px 12px', margin: '12px 0' }}>{err}</div>}
        {p && <>
          <p style={{ color: '#64748b', fontSize: 13, margin: '6px 0 12px' }}>Once closed, this batch no longer shows in batch lists and dropdowns. Its report stays under “Show closed batches”, and you can reopen it.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stat('Students', p.counts.total, '#0f172a')}
            {stat('Placed', p.counts.placed, '#15803d')}
            {stat('Course completed', p.counts.completed, '#4338ca')}
            {stat('Discontinued', p.counts.discontinued, '#b45309')}
            {stat('Inactive', p.counts.inactive, '#dc2626')}
            {stat('Still active', p.counts.active, '#0369a1')}
          </div>

          <h3 style={{ fontSize: 15, margin: '18px 0 6px' }}>Students still active ({stillActive.length})</h3>
          {stillActive.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>Nobody is still active in this batch.</p> : <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', fontSize: 12.5, marginBottom: 8 }}>
              <span style={{ color: '#475569' }}>Set all to:</span>
              <button type="button" className="bm-btn" onClick={() => setAll('complete')}>Course completed</button>
              <button type="button" className="bm-btn" onClick={() => setAll('move')} disabled={!p.moveTargets.length}>Move to another batch</button>
              <button type="button" className="bm-btn" onClick={() => setAll('keep')}>Leave as they are</button>
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
              {stillActive.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{s.name || s.email}</b>{s.placed && <span style={{ marginLeft: 6, fontSize: 11, color: '#15803d' }}>● placed</span>}
                    <div style={{ fontSize: 11.5, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</div>
                  </div>
                  <select value={actions[s.id] || 'keep'} onChange={(e) => setActions((x) => ({ ...x, [s.id]: e.target.value as Action }))} style={{ padding: '5px 6px', borderRadius: 7, border: '1px solid #cbd5e1' }}>
                    <option value="complete">Course completed</option>
                    <option value="move" disabled={!p.moveTargets.length}>Move to another batch</option>
                    <option value="keep">Leave as they are</option>
                  </select>
                </div>
              ))}
            </div>
            {n('move') > 0 && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10, fontSize: 13 }}>
                <span><b>Move {n('move')} student(s) to</b> (their 365-day access keeps counting from when they first joined)</span>
                <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                  <option value="">Pick a batch</option>
                  {p.moveTargets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
            )}
          </>}
          {p.students.length > stillActive.length && (
            <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 0' }}>Students already Course completed, Discontinued or Inactive keep their status.</p>
          )}

          <h3 style={{ fontSize: 15, margin: '18px 0 6px' }}>Closing notes</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Closed on
              <input type="date" max={todayISO()} value={closedOn} onChange={(e) => setClosedOn(e.target.value)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Students given a discount (optional)
              <input type="number" min={0} value={discounted} onChange={(e) => setDiscounted(e.target.value)} placeholder="e.g. 4" style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5e1', width: 160 }} />
            </label>
          </div>
          <textarea rows={4} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did this batch go? Highlights, what to improve, anything the team should remember."
            style={{ width: '100%', marginTop: 10, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button className="bm-btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="bm-btn primary" onClick={submit} disabled={saving}>{saving ? 'Closing…' : '🏁 Close batch'}</button>
          </div>
        </>}
      </div>
    </div>
  );
};

export default CloseBatchModal;

/** One closed batch's report (Batches → Show closed batches). */
export const ClosedBatchCard: React.FC<{ b: any; onReopen: (id: string) => void; fmt: (d: string) => string }> = ({ b, onReopen, fmt }) => {
  const r = b.closeReport || {};
  const c = r.counts || {};
  const chip = (label: string, v: any, color: string) => (v ? <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 999, background: '#f1f5f9', color }}>{label} <b>{v}</b></span> : null);
  return (
    <div className="bm-card bm-batch" style={{ opacity: 0.95 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div>
          <div className="bm-batch-name">{b.name} <span className="bm-badge inactive">Closed</span></div>
          {b.course && <div className="bm-batch-course">{b.course}</div>}
          <div className="bm-batch-dates">{fmt(b.startDate)} - {fmt(b.endDate)} · closed {fmt(r.closedOn || b.closedAt)}{b.closedBy ? ` by ${b.closedBy}` : ''}</div>
        </div>
        <button className="bm-btn" onClick={() => onReopen(b._id)} title="Reopen this batch">↩ Reopen</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {chip('Students', c.total, '#0f172a')}
        {chip('Placed', c.placed, '#15803d')}
        {chip('Completed', c.completed, '#4338ca')}
        {chip('Moved', c.moved, '#0369a1')}
        {chip('Discontinued', c.discontinued, '#b45309')}
        {chip('Inactive', c.inactive, '#dc2626')}
        {chip('Still active', c.active, '#475569')}
        {chip('Discounted', r.discountedCount, '#7c3aed')}
      </div>
      {(r.movedTo || []).map((m: any) => <div key={String(m.batchId)} style={{ fontSize: 12.5, color: '#475569', marginTop: 6 }}>→ {m.count} moved to <b>{m.name}</b></div>)}
      {r.notes && <p style={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{r.notes}</p>}
    </div>
  );
};
