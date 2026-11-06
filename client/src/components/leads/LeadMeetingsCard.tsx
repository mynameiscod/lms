import React, { useCallback, useEffect, useState } from 'react';
import { meetingApi } from '../../api';
import { Modal } from '../common';

/**
 * Demos / visits / calls booked for a lead, with their attendance. Marking one attended,
 * no-show, rescheduled, cancelled or declined writes it onto the lead's timeline (server:
 * services/leadDemoService.ts). Stage changes stay with the counsellor.
 */
interface Meeting {
  _id: string; type: string; title: string; scheduledAt: string; status: string;
  feedback?: string; nextAction?: string; cancellationReason?: string;
}

const TYPE_LABEL: Record<string, string> = { online_demo: 'Demo', campus_visit: 'Campus visit', trainer_call: 'Trainer call', payment_discussion: 'Payment discussion' };
const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Scheduled', cls: 'bg-primary-subtle text-primary-emphasis' },
  rescheduled: { label: 'Rescheduled', cls: 'bg-primary-subtle text-primary-emphasis' },
  completed: { label: 'Attended', cls: 'bg-success-subtle text-success-emphasis' },
  no_show: { label: 'No-show', cls: 'bg-warning-subtle text-warning-emphasis' },
  cancelled: { label: 'Cancelled', cls: 'bg-secondary-subtle text-secondary-emphasis' },
  declined: { label: 'Declined', cls: 'bg-danger-subtle text-danger-emphasis' },
};
const when = (d: string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

type Action = 'completed' | 'no_show' | 'rescheduled' | 'cancelled' | 'declined';

const LeadMeetingsCard: React.FC<{ leadId: string; version?: number; onChanged: (msg: string) => void; onError: (msg: string) => void }> = ({ leadId, version, onChanged, onError }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [editing, setEditing] = useState<{ meeting: Meeting; action: Action } | null>(null);
  const [feedback, setFeedback] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [newTime, setNewTime] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res: any = await meetingApi.list({ leadId });
      const list: Meeting[] = res.data || res.meetings || [];
      setMeetings([...list].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()));
    } catch { setMeetings([]); }
  }, [leadId]);
  useEffect(() => { load(); }, [load, version]);

  const open = (meeting: Meeting, action: Action) => {
    setEditing({ meeting, action }); setFeedback(''); setNextAction('');
    setNewTime(action === 'rescheduled' ? toLocalInput(new Date(Date.now() + 86_400_000)) : '');
  };

  const save = async () => {
    if (!editing) return;
    const { meeting, action } = editing;
    if (action === 'rescheduled' && !newTime) { onError('Pick the new time'); return; }
    setSaving(true);
    try {
      await meetingApi.update(meeting._id, {
        status: action,
        ...(action === 'rescheduled' ? { scheduledAt: new Date(newTime).toISOString() } : {}),
        ...(feedback.trim() ? (['cancelled', 'declined'].includes(action) ? { cancellationReason: feedback.trim() } : { feedback: feedback.trim() }) : {}),
        ...(nextAction.trim() ? { nextAction: nextAction.trim() } : {}),
      });
      setEditing(null);
      await load();
      onChanged(`${TYPE_LABEL[meeting.type] || 'Meeting'} marked ${STATUS[action].label.toLowerCase()}`);
    } catch (e: any) {
      onError(e.message || 'Could not update');
    } finally { setSaving(false); }
  };

  if (!meetings.length) return null;
  const open_ = (m: Meeting) => m.status === 'scheduled' || m.status === 'rescheduled';

  return (
    <div className="ld2-card">
      <h4>Demos &amp; meetings</h4>
      <div>
        {meetings.map(m => (
          <div key={m._id} className="border-bottom pb-2 mb-2">
            <div className="d-flex justify-content-between align-items-center gap-2">
              <strong className="small">{TYPE_LABEL[m.type] || m.type}</strong>
              <span className={`badge ${STATUS[m.status]?.cls || 'bg-light text-dark'}`}>{STATUS[m.status]?.label || m.status}</span>
            </div>
            <div className="small text-muted">{when(m.scheduledAt)}</div>
            {(m.feedback || m.cancellationReason) && <div className="small mt-1">{m.feedback || m.cancellationReason}</div>}
            {m.nextAction && <div className="small text-muted">Next: {m.nextAction}</div>}
            {open_(m) && (
              <div className="d-flex flex-wrap gap-1 mt-2">
                <button className="btn btn-success btn-sm py-0" onClick={() => open(m, 'completed')}>Attended</button>
                <button className="btn btn-outline-warning btn-sm py-0" onClick={() => open(m, 'no_show')}>No-show</button>
                <button className="btn btn-outline-secondary btn-sm py-0" onClick={() => open(m, 'rescheduled')}>Reschedule</button>
                <button className="btn btn-outline-secondary btn-sm py-0" onClick={() => open(m, 'cancelled')}>Cancel</button>
                <button className="btn btn-outline-danger btn-sm py-0" onClick={() => open(m, 'declined')}>Declined</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} size="small"
        title={editing ? `${TYPE_LABEL[editing.meeting.type] || 'Meeting'}: ${STATUS[editing.action].label}` : ''}>
        {editing && (
          <div>
            {editing.action === 'rescheduled' && (
              <div className="mb-3">
                <label className="form-label fw-semibold">New time</label>
                <input type="datetime-local" className="form-control" value={newTime} onChange={e => setNewTime(e.target.value)} />
              </div>
            )}
            <div className="mb-3">
              <label className="form-label fw-semibold">{['cancelled', 'declined'].includes(editing.action) ? 'Reason' : 'Feedback'} <span className="text-muted fw-normal">(optional)</span></label>
              <textarea className="form-control" rows={2} maxLength={2000} value={feedback} onChange={e => setFeedback(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Next action <span className="text-muted fw-normal">(optional)</span></label>
              <input className="form-control" maxLength={500} value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="e.g. Send fee details, call back Monday" />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditing(null)} disabled={saving}>Back</button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LeadMeetingsCard;
