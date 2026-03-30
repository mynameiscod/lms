import React, { useState } from 'react';
import { leadApi } from '../../api';

interface MeetingSchedulerProps {
  lead: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
  };
  onClose: () => void;
  onScheduled: () => void;
}

const MeetingScheduler: React.FC<MeetingSchedulerProps> = ({
  lead,
  onClose,
  onScheduled
}) => {
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlertMsg({ type, message });
    setTimeout(() => setAlertMsg(null), 3000);
  };
  const [saving, setSaving] = useState(false);
  const [meetingType, setMeetingType] = useState<'online_demo' | 'trainer_call' | 'campus_visit' | 'payment_discussion'>('online_demo');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [trainer, setTrainer] = useState('');
  const [location, setLocation] = useState('hyderabad');
  const [notes, setNotes] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(!!lead.email);
  
  // Campus visit options
  const [visitOptions, setVisitOptions] = useState({
    classroomTour: true,
    meetTrainers: true,
    paymentDiscussion: false,
    studentInteraction: false
  });

  const handleSchedule = async () => {
    if (!date || !time) {
      showAlertMsg('error', 'Please select date and time');
      return;
    }

    try {
      setSaving(true);
      
      const scheduledFor = new Date(`${date}T${time}`);
      
      // Create follow-up reminder
      const meetingTypeLabel = meetingType === 'campus_visit' ? 'Campus Visit' 
        : meetingType === 'online_demo' ? 'Online Demo'
        : meetingType === 'trainer_call' ? 'Trainer Call'
        : 'Payment Discussion';
      
      // Update the lead's next follow-up date to the meeting date
      await leadApi.updateLead(lead._id, {
        nextFollowUp: scheduledFor.toISOString()
      });

      // Log the activity
      await leadApi.addActivity(lead._id, {
        type: 'note',
        description: `📅 ${meetingTypeLabel} scheduled for ${scheduledFor.toLocaleDateString()} at ${scheduledFor.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}${notes ? ` - ${notes}` : ''}`
      });

      showAlertMsg('success', 'Meeting scheduled successfully');
      onScheduled();
      onClose();
    } catch (error: any) {
      console.error('Meeting schedule error:', error);
      showAlertMsg('error', error.message || 'Failed to schedule meeting');
    } finally {
      setSaving(false);
    }
  };

  const meetingTypes = [
    { value: 'online_demo', label: 'Online Demo', icon: '🎥' },
    { value: 'trainer_call', label: '1-on-1 Trainer Call', icon: '👨‍🏫' },
    { value: 'campus_visit', label: 'Campus Visit', icon: '🏢' },
    { value: 'payment_discussion', label: 'Payment Discussion', icon: '💳' }
  ];

  const locations = [
    { value: 'hyderabad', label: 'CodeBegun Hyderabad', address: 'Madhapur, Hyderabad - 500081' },
    { value: 'bangalore', label: 'CodeBegun Bangalore', address: 'Koramangala, Bangalore - 560034' }
  ];

  // Get tomorrow as min date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content meeting-scheduler" onClick={e => e.stopPropagation()} style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Schedule Meeting</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {alertMsg && (
          <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '6px', background: alertMsg.type === 'success' ? '#d4edda' : '#f8d7da', color: alertMsg.type === 'success' ? '#155724' : '#721c24' }}>
            {alertMsg.message}
          </div>
        )}
        <p style={{ color: '#666', marginBottom: '20px' }}>Lead: <strong>{lead.name}</strong></p>

        {/* Meeting Type */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Meeting Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {meetingTypes.map(type => (
              <button
                key={type.value}
                onClick={() => setMeetingType(type.value as any)}
                style={{
                  padding: '12px',
                  border: meetingType === type.value ? '2px solid #3b82f6' : '1px solid #e0e0e0',
                  borderRadius: '8px',
                  background: meetingType === type.value ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>{type.icon}</span>
                <span style={{ fontSize: '14px' }}>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date & Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Date</label>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Time</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px' }}
            />
          </div>
        </div>

        {/* Duration */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Duration</label>
          <select 
            value={duration} 
            onChange={e => setDuration(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px' }}
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
          </select>
        </div>

        {/* Campus Visit Options */}
        {meetingType === 'campus_visit' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Campus Location</label>
              <select 
                value={location} 
                onChange={e => setLocation(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px' }}
              >
                {locations.map(loc => (
                  <option key={loc.value} value={loc.value}>{loc.label}</option>
                ))}
              </select>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                📍 {locations.find(l => l.value === location)?.address}
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>What they want to see</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { key: 'classroomTour', label: 'Classroom Tour' },
                  { key: 'meetTrainers', label: 'Meet Trainers' },
                  { key: 'paymentDiscussion', label: 'Payment Discussion' },
                  { key: 'studentInteraction', label: 'Student Interaction' }
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={visitOptions[opt.key as keyof typeof visitOptions]}
                      onChange={e => setVisitOptions({ ...visitOptions, [opt.key]: e.target.checked })}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any special notes..."
            rows={3}
            style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px', resize: 'vertical' }}
          />
        </div>

        {/* Notifications */}
        <div style={{ marginBottom: '20px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
          <p style={{ fontWeight: '500', marginBottom: '8px' }}>Send Confirmation</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} />
            WhatsApp ({lead.phone})
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} disabled={!lead.email} />
            Email {lead.email ? `(${lead.email})` : '(No email provided)'}
          </label>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', border: '1px solid #e0e0e0', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            disabled={saving || !date || !time}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              background: '#3b82f6',
              color: 'white',
              cursor: saving || !date || !time ? 'not-allowed' : 'pointer',
              opacity: saving || !date || !time ? 0.6 : 1
            }}
          >
            {saving ? 'Scheduling...' : 'Schedule Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingScheduler;
