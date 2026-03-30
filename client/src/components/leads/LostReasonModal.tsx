import React, { useState, useEffect } from 'react';
import { leadApi } from '../../api';

interface LostReasonModalProps {
  lead: {
    _id: string;
    name: string;
  };
  onClose: () => void;
  onMarkedLost: () => void;
}

interface LostReason {
  id: string;
  label: string;
  category: string;
  requiresDetail: boolean;
}

const defaultReasons: LostReason[] = [
  // Financial
  { id: 'fee_high', label: 'Fee too high', category: 'financial', requiresDetail: false },
  { id: 'no_emi', label: 'Needs EMI but not eligible', category: 'financial', requiresDetail: false },
  { id: 'cannot_afford', label: 'Cannot afford at this time', category: 'financial', requiresDetail: false },
  
  // Competitor
  { id: 'joined_competitor', label: 'Joined competitor', category: 'competitor', requiresDetail: true },
  { id: 'free_alternative', label: 'Found free alternative', category: 'competitor', requiresDetail: false },
  
  // Timing
  { id: 'not_ready', label: 'Not ready now - will consider later', category: 'timing', requiresDetail: false },
  { id: 'job_conflict', label: 'Job conflict - no time', category: 'timing', requiresDetail: false },
  { id: 'personal_issues', label: 'Personal issues', category: 'timing', requiresDetail: false },
  
  // Quality
  { id: 'no_course', label: 'Not interested in offered courses', category: 'quality', requiresDetail: false },
  { id: 'location', label: 'Location not suitable', category: 'quality', requiresDetail: false },
  { id: 'batch_timing', label: 'Batch timing not suitable', category: 'quality', requiresDetail: false },
  
  // Other
  { id: 'wrong_number', label: 'Wrong number / not reachable', category: 'other', requiresDetail: false },
  { id: 'duplicate', label: 'Duplicate lead', category: 'other', requiresDetail: false },
  { id: 'other', label: 'Other', category: 'other', requiresDetail: true }
];

const LostReasonModal: React.FC<LostReasonModalProps> = ({
  lead,
  onClose,
  onMarkedLost
}) => {
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlertMsg({ type, message });
    setTimeout(() => setAlertMsg(null), 3000);
  };
  const [saving, setSaving] = useState(false);
  const [reasons, setReasons] = useState<LostReason[]>(defaultReasons);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [detail, setDetail] = useState('');
  const [scheduleReengagement, setScheduleReengagement] = useState(false);
  const [reengagementPeriod, setReengagementPeriod] = useState('3_months');

  useEffect(() => {
    // Load custom reasons from config if available
    loadReasons();
  }, []);

  const loadReasons = async () => {
    try {
      // Use default reasons - no API call needed
    } catch (error) {
      // Use default reasons
    }
  };

  const handleMarkLost = async () => {
    if (!selectedReason) {
      showAlertMsg('error', 'Please select a reason');
      return;
    }

    const reason = reasons.find(r => r.id === selectedReason);
    if (reason?.requiresDetail && !detail.trim()) {
      showAlertMsg('error', 'Please provide additional details');
      return;
    }

    try {
      setSaving(true);
      
      const reengagementDate = scheduleReengagement ? calculateReengagementDate(reengagementPeriod) : null;
      
      await leadApi.updateLead(lead._id, {
        lostReason: selectedReason,
        lostReasonLabel: reason?.label,
        lostReasonCategory: reason?.category,
        lostReasonDetail: detail.trim(),
      });

      showAlertMsg('success', 'Lead marked as lost');
      onMarkedLost();
      onClose();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const calculateReengagementDate = (period: string): Date => {
    const date = new Date();
    switch (period) {
      case '1_month': date.setMonth(date.getMonth() + 1); break;
      case '2_months': date.setMonth(date.getMonth() + 2); break;
      case '3_months': date.setMonth(date.getMonth() + 3); break;
      case '6_months': date.setMonth(date.getMonth() + 6); break;
      default: date.setMonth(date.getMonth() + 3);
    }
    return date;
  };

  const groupedReasons = reasons.reduce((acc, reason) => {
    if (!acc[reason.category]) acc[reason.category] = [];
    acc[reason.category].push(reason);
    return acc;
  }, {} as Record<string, LostReason[]>);

  const categoryLabels: Record<string, string> = {
    financial: '💰 Financial',
    competitor: '🏢 Competitor',
    timing: '⏰ Timing',
    quality: '📋 Quality/Fit',
    other: '📝 Other'
  };

  const selectedReasonObj = reasons.find(r => r.id === selectedReason);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#dc2626' }}>Mark Lead as Lost</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <p style={{ color: '#666', marginBottom: '20px' }}>Lead: <strong>{lead.name}</strong></p>

        {/* Reasons by Category */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>Select Reason</label>
          
          {Object.entries(groupedReasons).map(([category, categoryReasons]) => (
            <div key={category} style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                {categoryLabels[category] || category}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {categoryReasons.map(reason => (
                  <label
                    key={reason.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      border: selectedReason === reason.id ? '2px solid #3b82f6' : '1px solid #e0e0e0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: selectedReason === reason.id ? '#eff6ff' : 'white',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="radio"
                      name="lostReason"
                      value={reason.id}
                      checked={selectedReason === reason.id}
                      onChange={() => setSelectedReason(reason.id)}
                      style={{ marginRight: '12px' }}
                    />
                    <span style={{ fontSize: '14px' }}>{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Details */}
        {selectedReasonObj?.requiresDetail && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Additional Details <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder={selectedReason === 'joined_competitor' ? 'Which competitor?' : 'Please provide more details...'}
              rows={3}
              style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px', resize: 'vertical' }}
            />
          </div>
        )}

        {/* Optional Details for non-required */}
        {selectedReasonObj && !selectedReasonObj.requiresDetail && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Additional Details (Optional)
            </label>
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px', resize: 'vertical' }}
            />
          </div>
        )}

        {/* Re-engagement */}
        <div style={{ marginBottom: '20px', padding: '16px', background: '#fef3c7', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={scheduleReengagement}
              onChange={e => setScheduleReengagement(e.target.checked)}
            />
            <span style={{ fontWeight: '500' }}>📅 Schedule re-engagement follow-up</span>
          </label>
          
          {scheduleReengagement && (
            <select
              value={reengagementPeriod}
              onChange={e => setReengagementPeriod(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px' }}
            >
              <option value="1_month">After 1 month</option>
              <option value="2_months">After 2 months</option>
              <option value="3_months">After 3 months</option>
              <option value="6_months">After 6 months</option>
            </select>
          )}
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
            onClick={handleMarkLost}
            disabled={saving || !selectedReason}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              background: '#dc2626',
              color: 'white',
              cursor: saving || !selectedReason ? 'not-allowed' : 'pointer',
              opacity: saving || !selectedReason ? 0.6 : 1
            }}
          >
            {saving ? 'Saving...' : 'Mark as Lost'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LostReasonModal;
