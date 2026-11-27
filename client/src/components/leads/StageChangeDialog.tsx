import React, { useEffect, useMemo, useState } from 'react';
import { leadApi, leadPipelineApi } from '../../api';
import { Modal } from '../common';
import './StageChangeDialog.css';

/**
 * Move one lead (or many, in bulk) to a stage → sub-stage → reason, asking only for what the
 * institute's pipeline requires. The server (leadLifecycleService) enforces the same rules;
 * this dialog just asks up front so counsellors are not bounced by errors.
 */

interface Reason { _id: string; name: string; isActive: boolean; requiresDetail: boolean }
interface SubStage { _id: string; name: string; color?: string; isActive: boolean; requiresReason: boolean; requiresNote: boolean; requiresFollowUp: boolean; reasons: Reason[] }
interface Stage { _id: string; name: string; color: string; isActive: boolean; requiresReason?: boolean; requiresNote?: boolean; isLostStage?: boolean; subStages: SubStage[] }

export type StageDialogOutcome = 'moved' | 'pending_approval' | 'bulk';

interface Props {
  open: boolean;
  onClose: () => void;
  /** One id = single lead; several = bulk move. */
  leadIds: string[];
  /** Pre-select a target stage (e.g. the stage dropped on, or clicked in the pipeline bar). */
  initialStageId?: string | null;
  currentStageId?: string | null;
  currentSubStageId?: string | null;
  onDone: (outcome: StageDialogOutcome, message: string) => void;
}

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const QUICK_FOLLOW_UPS: { label: string; at: () => Date }[] = [
  { label: 'In 2 hours', at: () => new Date(Date.now() + 2 * 3600_000) },
  { label: 'Tomorrow 10 AM', at: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; } },
  { label: 'In 3 days', at: () => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(10, 0, 0, 0); return d; } },
  { label: 'Next week', at: () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(10, 0, 0, 0); return d; } },
];

const StageChangeDialog: React.FC<Props> = ({ open, onClose, leadIds, initialStageId, currentStageId, currentSubStageId, onDone }) => {
  const bulk = leadIds.length > 1;
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stageId, setStageId] = useState('');
  const [subStageId, setSubStageId] = useState('');
  const [reasonId, setReasonId] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [note, setNote] = useState('');
  const [followUp, setFollowUp] = useState('');

  useEffect(() => {
    if (!open) return;
    setError(''); setReasonId(''); setReasonText(''); setReasonDetail(''); setNote(''); setFollowUp('');
    setStageId(initialStageId || currentStageId || '');
    setSubStageId(initialStageId && initialStageId !== currentStageId ? '' : currentSubStageId || '');
    setLoading(true);
    leadPipelineApi.get()
      .then((res: any) => setStages((res.data?.stages || []).filter((s: Stage) => s.isActive)))
      .catch((e: any) => setError(e.message || 'Could not load stages'))
      .finally(() => setLoading(false));
  }, [open, initialStageId, currentStageId, currentSubStageId]);

  const stage = useMemo(() => stages.find(s => s._id === stageId) || null, [stages, stageId]);
  const subs = useMemo(() => (stage?.subStages || []).filter(s => s.isActive), [stage]);
  const sub = useMemo(() => subs.find(s => s._id === subStageId) || null, [subs, subStageId]);
  const reasons = useMemo(() => (sub?.reasons || []).filter(r => r.isActive), [sub]);
  const reason = useMemo(() => reasons.find(r => r._id === reasonId) || null, [reasons, reasonId]);

  // What this target asks for (mirrors server rules).
  const needSub = !bulk && subs.length > 0;
  // A sub-stage that requires a reason but has no reasons listed yet asks for a typed one
  // (the server accepts that too), instead of blocking with nothing to pick.
  const needReasonFromList = !!sub?.requiresReason && reasons.length > 0;
  const subNeedsTypedReason = !!sub?.requiresReason && reasons.length === 0;
  const stageNeedsReason = !!stage && (!!stage.requiresReason || stage.name === 'Not Interested');
  const needTypedReason = (stageNeedsReason && !reason && !needReasonFromList) || subNeedsTypedReason;
  const needDetail = !!reason?.requiresDetail;
  const needNote = !!(stage?.requiresNote || sub?.requiresNote);
  const needFollowUp = !bulk && !!sub?.requiresFollowUp;

  const pickStage = (id: string) => { setStageId(id); setSubStageId(''); setReasonId(''); setError(''); };
  const pickSub = (id: string) => { setSubStageId(id === subStageId ? '' : id); setReasonId(''); setError(''); };

  const problems = (): string | null => {
    if (!stage) return 'Pick a stage';
    if (needSub && !sub) return `Pick a sub-stage of “${stage.name}”`;
    if (needReasonFromList && !reason) return `Pick a reason for “${sub!.name}”`;
    if (needDetail && !reasonDetail.trim()) return `Add details for “${reason!.name}”`;
    if (needTypedReason && !reasonText.trim()) return 'Type a reason';
    if (needNote && !note.trim()) return 'A note is required here';
    if (needFollowUp && !followUp) return 'Set the next follow-up';
    if (followUp && new Date(followUp).getTime() < Date.now() - 60_000) return 'The follow-up is in the past';
    return null;
  };

  const submit = async () => {
    const p = problems();
    if (p) { setError(p); return; }
    setSaving(true); setError('');
    const payload: any = {
      stageId,
      ...(sub ? { subStageId: sub._id } : {}),
      ...(reason ? { reasonId: reason._id } : {}),
      ...(reasonDetail.trim() ? { reasonDetail: reasonDetail.trim() } : {}),
      ...(reasonText.trim() ? { reason: reasonText.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(followUp ? { nextFollowUp: new Date(followUp).toISOString() } : {}),
    };
    try {
      if (bulk) {
        const res: any = await leadApi.bulkChangeStage({ leadIds, ...payload });
        const d = res.data || {};
        const parts = [`${d.moved || 0} moved`];
        if (d.pendingApproval) parts.push(`${d.pendingApproval} waiting for manager approval`);
        if (d.unchanged) parts.push(`${d.unchanged} already there`);
        if (d.failed) {
          // Say why, so a stuck group of leads can be fixed instead of guessed at.
          const why = (d.errors || []).map((x: any) => String(x.message || '')).find(Boolean);
          parts.push(`${d.failed} could not be moved${why ? ` (${why.slice(0, 160)})` : ''}`);
        }
        onDone('bulk', `${stage!.name}: ${parts.join(', ')}`);
      } else {
        const res: any = await leadApi.changeStageFull(leadIds[0], payload);
        if (res?.data?.pendingApproval) onDone('pending_approval', `Sent to a manager for approval: ${stage!.name}`);
        else onDone('moved', `Moved to ${stage!.name}${sub ? ` › ${sub.name}` : ''}`);
      }
      onClose();
    } catch (e: any) {
      setError(e.message || 'Could not move the lead');
    } finally {
      setSaving(false);
    }
  };

  const req = <span className="scd-req" aria-label="required">*</span>;

  return (
    <Modal isOpen={open} onClose={onClose} title={bulk ? `Move ${leadIds.length} leads` : 'Move lead'} size="medium">
      {loading ? <div className="scd-loading">Loading stages…</div> : (
        <div className="scd">
          <div className="mb-3">
            <label className="form-label">Stage {req}</label>
            <select className="form-select" value={stageId} onChange={e => pickStage(e.target.value)}>
              <option value="">Pick a stage…</option>
              {stages.map(s => <option key={s._id} value={s._id}>{s.name}{s._id === currentStageId ? ' (current)' : ''}</option>)}
            </select>
            {stage?.isLostStage && <div className="form-text">Counsellors moving a lead here need a manager to approve.</div>}
          </div>

          {subs.length > 0 && (
            <div className="mb-3">
              <label className="form-label">Sub-stage {needSub && req}{bulk && <span className="text-muted fw-normal"> (optional)</span>}</label>
              <div className="scd-chips">
                {subs.map(s => (
                  <button type="button" key={s._id} className={`scd-chip${s._id === subStageId ? ' active' : ''}`}
                    style={{ ['--chip' as any]: s.color || stage?.color }} onClick={() => pickSub(s._id)}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sub && reasons.length > 0 && (
            <div className="mb-3">
              <label className="form-label">Reason {needReasonFromList && req}</label>
              <select className="form-select" value={reasonId} onChange={e => { setReasonId(e.target.value); setError(''); }}>
                <option value="">{needReasonFromList ? 'Pick a reason…' : 'No reason'}</option>
                {reasons.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
          )}

          {needDetail && (
            <div className="mb-3">
              <label className="form-label">Details {req}</label>
              <input className="form-control" value={reasonDetail} maxLength={1000} onChange={e => setReasonDetail(e.target.value)} placeholder="What exactly happened?" />
            </div>
          )}

          {needTypedReason && (
            <div className="mb-3">
              <label className="form-label">Reason {req}</label>
              <input className="form-control" value={reasonText} maxLength={500} onChange={e => setReasonText(e.target.value)} placeholder="Why is the lead moving here?" />
            </div>
          )}

          <div className="mb-3">
            <label className="form-label">Note {needNote ? req : <span className="text-muted fw-normal">(optional)</span>}</label>
            <textarea className="form-control" rows={2} value={note} maxLength={2000} onChange={e => setNote(e.target.value)} placeholder="What was discussed?" />
          </div>

          {!bulk && (
            <div className="mb-3">
              <label className="form-label">Next follow-up {needFollowUp ? req : <span className="text-muted fw-normal">(optional)</span>}</label>
              <div className="scd-chips mb-2">
                {QUICK_FOLLOW_UPS.map(q => (
                  <button type="button" key={q.label} className="scd-chip scd-chip-plain" onClick={() => setFollowUp(toLocalInput(q.at()))}>{q.label}</button>
                ))}
              </div>
              <input type="datetime-local" className="form-control" value={followUp} onChange={e => setFollowUp(e.target.value)} />
            </div>
          )}

          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          <div className="scd-actions">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={saving || !stageId}>
              {saving ? 'Saving…' : bulk ? `Move ${leadIds.length} leads` : 'Move lead'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default StageChangeDialog;
