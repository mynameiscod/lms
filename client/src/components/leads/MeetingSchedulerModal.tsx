import React, { useState } from 'react';
import { meetingApi } from '../../api';

export type MeetingType = 'online_demo' | 'trainer_call' | 'campus_visit' | 'payment_discussion';

interface Props {
  leadId: string;
  leadName?: string;
  onClose: () => void;
  onCreated?: (meeting: any) => void;
}

const MEETING_TYPES: { value: MeetingType; label: string; icon: string }[] = [
  { value: 'online_demo', label: 'Online Demo', icon: '🖥️' },
  { value: 'trainer_call', label: 'Trainer Call', icon: '📞' },
  { value: 'campus_visit', label: 'Campus Visit', icon: '🏫' },
  { value: 'payment_discussion', label: 'Payment Discussion', icon: '💰' },
];

const MeetingSchedulerModal: React.FC<Props> = ({ leadId, leadName, onClose, onCreated }) => {
  const [type, setType] = useState<MeetingType>('online_demo');
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTypeChange = (t: MeetingType) => {
    setType(t);
    // Pre-fill title suggestion
    const label = MEETING_TYPES.find(m => m.value === t)?.label || '';
    if (!title || MEETING_TYPES.some(m => m.label === title)) {
      setTitle(label + (leadName ? ` with ${leadName}` : ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!scheduledAt) { setError('Please pick a date and time'); return; }
    setLoading(true);
    try {
      const res: any = await meetingApi.create({
        leadId, type, title, scheduledAt,
        durationMinutes, meetingLink, location, notes,
        sendEmail, sendWhatsApp,
      });
      onCreated?.(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box meeting-scheduler-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Schedule Meeting{leadName ? ` — ${leadName}` : ''}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Meeting type selector */}
          <div className="meeting-type-grid">
            {MEETING_TYPES.map(m => (
              <button
                key={m.value}
                type="button"
                className={`meeting-type-btn${type === m.value ? ' active' : ''}`}
                onClick={() => handleTypeChange(m.value)}
              >
                <span className="mtb-icon">{m.icon}</span>
                <span className="mtb-label">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. Online Demo with Rahul"
            />
          </div>

          {/* Date + Duration */}
          <div className="form-row">
            <div className="form-group flex-1">
              <label>Date & Time *</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ width: 120 }}>
              <label>Duration (min)</label>
              <input
                type="number"
                value={durationMinutes}
                min={15}
                step={15}
                onChange={e => setDurationMinutes(+e.target.value)}
              />
            </div>
          </div>

          {/* Link / Location depending on type */}
          {(type === 'online_demo' || type === 'trainer_call') && (
            <div className="form-group">
              <label>Meeting Link</label>
              <input
                type="url"
                value={meetingLink}
                onChange={e => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </div>
          )}
          {(type === 'campus_visit' || type === 'payment_discussion') && (
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Branch address or room"
              />
            </div>
          )}

          {/* Notes */}
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional preparation notes..."
            />
          </div>

          {/* Notifications */}
          <div className="form-row" style={{ gap: 16 }}>
            <label className="checkbox-label">
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
              Send email reminder
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} />
              Send WhatsApp
            </label>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Scheduling…' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MeetingSchedulerModal;
