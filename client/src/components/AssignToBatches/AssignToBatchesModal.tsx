import React, { useEffect, useMemo, useState } from 'react';
import { batchApi } from '../../api';
import assessmentScheduleApi, { AssessmentSchedule, LatePolicy, AssessmentContentType } from '../../api/assessmentScheduleApi';
import './AssignToBatches.css';

interface Props {
  contentType: AssessmentContentType;
  contentId: string;
  contentTitle: string;
  onClose: () => void;
  onDone?: () => void;
}

const combineDateTime = (date: string, time: string): string | undefined => {
  if (!date) return undefined;
  const t = /^\d{1,2}:\d{2}$/.test(time) ? time : '23:59';
  const d = new Date(`${date}T${t}`);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
};

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const POLICY_LABEL: Record<LatePolicy, string> = {
  open: 'Open — late allowed, never locks',
  grace: 'Grace — late allowed for N days (with penalty)',
  hard_lock: 'Hard lock — closes at the deadline',
};

const AssignToBatchesModal: React.FC<Props> = ({ contentType, contentId, contentTitle, onClose, onDone }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [existing, setExisting] = useState<AssessmentSchedule[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Shared window + policy applied to the batches you assign now.
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [latePolicy, setLatePolicy] = useState<LatePolicy>('grace');
  const [graceDays, setGraceDays] = useState(2);
  const [penaltyPct, setPenaltyPct] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [bs, ex] = await Promise.all([
        batchApi.getBatches(),
        assessmentScheduleApi.list({ contentType, contentId }),
      ]);
      setBatches((bs as any).data || bs || []);
      setExisting(ex || []);
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [contentId]);

  const assignedIds = useMemo(() => new Set(existing.map(e => String(e.batchId))), [existing]);
  const visibleBatches = useMemo(
    () => batches.filter(b => !search || (b.name || '').toLowerCase().includes(search.toLowerCase())),
    [batches, search]
  );

  const toggle = (id: string) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const selectAllVisible = () => setSelected(new Set(visibleBatches.filter(b => !assignedIds.has(String(b._id))).map(b => String(b._id))));

  const assign = async () => {
    if (selected.size === 0) { setMsg('Select at least one batch.'); return; }
    setSaving(true); setMsg('');
    try {
      const dueAt = combineDateTime(dueDate, dueTime);
      const startAt = combineDateTime(startDate, '00:00');
      await assessmentScheduleApi.assign({
        contentType, contentId, contentTitle,
        policy: { latePolicy, graceDays, penaltyPct, dueTime },
        batches: [...selected].map(batchId => ({ batchId, startAt, dueAt })),
      });
      setSelected(new Set());
      await load();
      setMsg('Assigned. You can fine-tune any batch below.');
      onDone?.();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to assign');
    }
    setSaving(false);
  };

  const extend = async (id: string, days: number) => {
    await assessmentScheduleApi.extend({ ids: [id], days });
    load();
  };
  const remove = async (id: string) => {
    if (!window.confirm('Unassign this batch? Students in it lose access to this assessment.')) return;
    await assessmentScheduleApi.remove(id);
    load();
  };

  return (
    <div className="a2b-overlay" onClick={onClose}>
      <div className="a2b-modal" onClick={e => e.stopPropagation()}>
        <div className="a2b-head">
          <div>
            <h3>Assign to Batches</h3>
            <p className="a2b-sub">{contentTitle} — reuse across batches, each with its own deadline. No cloning.</p>
          </div>
          <button className="a2b-x" onClick={onClose}>×</button>
        </div>

        {/* Shared policy */}
        <div className="a2b-policy">
          <div className="a2b-field"><label>Start date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div className="a2b-field"><label>Due date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
          <div className="a2b-field"><label>Due time</label><input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} /></div>
          <div className="a2b-field a2b-grow"><label>Late policy</label>
            <select value={latePolicy} onChange={e => setLatePolicy(e.target.value as LatePolicy)}>
              {(['grace', 'hard_lock', 'open'] as LatePolicy[]).map(p => <option key={p} value={p}>{POLICY_LABEL[p]}</option>)}
            </select>
          </div>
          {latePolicy === 'grace' && (
            <>
              <div className="a2b-field a2b-sm"><label>Grace days</label><input type="number" min={0} value={graceDays} onChange={e => setGraceDays(Number(e.target.value))} /></div>
              <div className="a2b-field a2b-sm"><label>Penalty %</label><input type="number" min={0} max={100} value={penaltyPct} onChange={e => setPenaltyPct(Number(e.target.value))} /></div>
            </>
          )}
        </div>

        {/* Batch picker */}
        <div className="a2b-pickhead">
          <div className="a2b-search"><span>🔍</span><input placeholder="Search batches…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <button className="a2b-link" onClick={selectAllVisible}>Select all shown</button>
          <span className="a2b-count">{selected.size} selected</span>
        </div>

        <div className="a2b-list">
          {loading ? <div className="a2b-empty">Loading…</div> : visibleBatches.length === 0 ? (
            <div className="a2b-empty">No batches.</div>
          ) : visibleBatches.map(b => {
            const id = String(b._id);
            const already = assignedIds.has(id);
            return (
              <label key={id} className={`a2b-row ${already ? 'assigned' : ''}`}>
                <input type="checkbox" disabled={already} checked={already || selected.has(id)} onChange={() => toggle(id)} />
                <span className="a2b-bname">{b.name}</span>
                {already && <span className="a2b-tag">Assigned</span>}
              </label>
            );
          })}
        </div>

        {msg && <div className="a2b-msg">{msg}</div>}

        <div className="a2b-actions">
          <button className="a2b-btn ghost" onClick={onClose}>Close</button>
          <button className="a2b-btn primary" onClick={assign} disabled={saving || selected.size === 0}>
            {saving ? 'Assigning…' : `Assign to ${selected.size} batch(es)`}
          </button>
        </div>

        {/* Already-assigned batches: tweak / extend / remove */}
        {existing.length > 0 && (
          <div className="a2b-existing">
            <div className="a2b-existing-title">Currently delivered to {existing.length} batch(es)</div>
            {existing.map(e => (
              <div key={e._id} className="a2b-exrow">
                <span className="a2b-bname">{e.batchName || e.batchId}</span>
                <span className="a2b-due">due {fmt(e.dueAt)} · {e.latePolicy}</span>
                <div className="a2b-exactions">
                  <button onClick={() => extend(e._id, 1)}>+1d</button>
                  <button onClick={() => extend(e._id, 3)}>+3d</button>
                  <button className="danger" onClick={() => remove(e._id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignToBatchesModal;
