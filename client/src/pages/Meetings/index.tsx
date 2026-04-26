import React, { useState, useEffect, useCallback } from 'react';
import { meetingApi } from '../../api';
import MeetingSchedulerModal from '../../components/leads/MeetingSchedulerModal';
import './Meetings.css';

type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';

interface Meeting {
  _id: string;
  type: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  status: MeetingStatus;
  meetingLink?: string;
  location?: string;
  notes?: string;
  leadId?: { _id: string; name: string; phone?: string; email?: string };
  createdBy?: string;
}

const STATUS_COLORS: Record<MeetingStatus, string> = {
  scheduled: '#6366f1',
  completed: '#10b981',
  cancelled: '#ef4444',
  no_show: '#f59e0b',
  rescheduled: '#8b5cf6',
};

const TYPE_LABELS: Record<string, string> = {
  online_demo: '🖥️ Online Demo',
  trainer_call: '📞 Trainer Call',
  campus_visit: '🏫 Campus Visit',
  payment_discussion: '💰 Payment',
};

const Meetings: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res: any = await meetingApi.list({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setMeetings(Array.isArray(res?.data) ? res.data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, from, to]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: MeetingStatus) => {
    setUpdatingId(id);
    try {
      await meetingApi.update(id, { status });
      setMeetings(prev => prev.map(m => m._id === id ? { ...m, status } : m));
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteMeeting = async (id: string) => {
    if (!window.confirm('Delete this meeting?')) return;
    await meetingApi.delete(id);
    setMeetings(prev => prev.filter(m => m._id !== id));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="meetings-page">
      <div className="meetings-header">
        <h1>Meetings</h1>
        <button className="btn-primary" onClick={() => setShowScheduler(true)}>
          + Schedule Meeting
        </button>
      </div>

      {/* Filters */}
      <div className="meetings-filters">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
          <option value="rescheduled">Rescheduled</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="online_demo">Online Demo</option>
          <option value="trainer_call">Trainer Call</option>
          <option value="campus_visit">Campus Visit</option>
          <option value="payment_discussion">Payment Discussion</option>
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} placeholder="From" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} placeholder="To" />
        <button className="btn-outline" onClick={load}>Refresh</button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="meetings-loading">Loading…</div>
      ) : error ? (
        <div className="meetings-error">{error}</div>
      ) : meetings.length === 0 ? (
        <div className="meetings-empty">
          <p>No meetings found.</p>
          <button className="btn-primary" onClick={() => setShowScheduler(true)}>Schedule your first meeting</button>
        </div>
      ) : (
        <div className="meetings-list">
          {meetings.map(meeting => (
            <div key={meeting._id} className="meeting-card">
              <div className="meeting-card-header">
                <div className="meeting-type-label">{TYPE_LABELS[meeting.type] || meeting.type}</div>
                <span
                  className="meeting-status-badge"
                  style={{ background: STATUS_COLORS[meeting.status] + '22', color: STATUS_COLORS[meeting.status], border: `1px solid ${STATUS_COLORS[meeting.status]}` }}
                >
                  {meeting.status}
                </span>
              </div>

              <h3 className="meeting-title">{meeting.title}</h3>

              {meeting.leadId && (
                <div className="meeting-lead">
                  👤 {meeting.leadId.name}
                  {meeting.leadId.phone && <span className="meeting-phone"> · {meeting.leadId.phone}</span>}
                </div>
              )}

              <div className="meeting-time">
                🕐 {formatDate(meeting.scheduledAt)} · {meeting.durationMinutes}min
              </div>

              {meeting.meetingLink && (
                <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="meeting-link">
                  🔗 Join Meeting
                </a>
              )}
              {meeting.location && <div className="meeting-location">📍 {meeting.location}</div>}
              {meeting.notes && <div className="meeting-notes">{meeting.notes}</div>}

              {/* Quick status actions */}
              {meeting.status === 'scheduled' && (
                <div className="meeting-actions">
                  <button
                    className="btn-sm btn-success"
                    disabled={updatingId === meeting._id}
                    onClick={() => updateStatus(meeting._id, 'completed')}
                  >✓ Mark Complete</button>
                  <button
                    className="btn-sm btn-warning"
                    disabled={updatingId === meeting._id}
                    onClick={() => updateStatus(meeting._id, 'no_show')}
                  >No Show</button>
                  <button
                    className="btn-sm btn-danger"
                    disabled={updatingId === meeting._id}
                    onClick={() => updateStatus(meeting._id, 'cancelled')}
                  >Cancel</button>
                  <button
                    className="btn-sm btn-ghost"
                    onClick={() => deleteMeeting(meeting._id)}
                  >Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showScheduler && (
        <MeetingSchedulerModal
          leadId=""
          onClose={() => setShowScheduler(false)}
          onCreated={() => { setShowScheduler(false); load(); }}
        />
      )}
    </div>
  );
};

export default Meetings;
