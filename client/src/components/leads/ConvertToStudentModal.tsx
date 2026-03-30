import React, { useState, useEffect } from 'react';
import { leadApi, batchApi } from '../../api';

interface ConvertToStudentModalProps {
  lead: {
    _id: string;
    name: string;
    email?: string;
    phone: string;
    courseInterest: string[];
  };
  onClose: () => void;
  onConverted: () => void;
}

interface Batch {
  _id: string;
  name: string;
  course?: { name: string };
  startDate: string;
  status: string;
}

const ConvertToStudentModal: React.FC<ConvertToStudentModalProps> = ({
  lead,
  onClose,
  onConverted
}) => {
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlertMsg({ type, message });
    setTimeout(() => setAlertMsg(null), 3000);
  };
  const [converting, setConverting] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  
  const [password, setPassword] = useState('Welcome@123');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [studentType, setStudentType] = useState<'regular' | 'demo'>('regular');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendOnboarding, setSendOnboarding] = useState(true);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const response = await batchApi.getBatches();
      setBatches(response.batches || response || []);
    } catch (error) {
      console.error('Failed to load batches');
    } finally {
      setLoadingBatches(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };

  const handleConvert = async () => {
    if (!lead.email) {
      showAlertMsg('error', 'Lead email is required for conversion');
      return;
    }

    if (!selectedBatch) {
      showAlertMsg('error', 'Please select a batch');
      return;
    }

    try {
      setConverting(true);
      
      await leadApi.convertToStudent(lead._id, password);

      showAlertMsg('success', 'Lead converted to student successfully!');
      onConverted();
      onClose();
    } catch (error: any) {
      showAlertMsg('error', error.response?.data?.message || 'Failed to convert lead');
    } finally {
      setConverting(false);
    }
  };

  const selectedBatchData = batches.find(b => b._id === selectedBatch);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '550px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>🎓 Convert to Student</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Lead Info */}
        <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 8px', fontWeight: '600' }}>{lead.name}</p>
          <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#666' }}>📧 {lead.email || 'No email'}</p>
          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>📞 {lead.phone}</p>
          {lead.courseInterest?.length > 0 && (
            <p style={{ margin: '8px 0 0', fontSize: '14px' }}>
              Interested in: <strong>{lead.courseInterest.join(', ')}</strong>
            </p>
          )}
        </div>

        {/* Password */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Default Password</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ flex: 1, padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px' }}
            />
            <button
              onClick={generatePassword}
              style={{ padding: '10px 16px', border: '1px solid #e0e0e0', borderRadius: '6px', background: '#f5f5f5', cursor: 'pointer' }}
            >
              🔄 Generate
            </button>
          </div>
        </div>

        {/* Batch Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Assign to Batch</label>
          {loadingBatches ? (
            <p style={{ color: '#666' }}>Loading batches...</p>
          ) : (
            <select
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px' }}
            >
              <option value="">Select batch...</option>
              {batches.map(batch => (
                <option key={batch._id} value={batch._id}>
                  {batch.name} {batch.course?.name ? `(${batch.course.name})` : ''} - Starts {new Date(batch.startDate).toLocaleDateString()}
                </option>
              ))}
            </select>
          )}
          {selectedBatchData && (
            <p style={{ fontSize: '13px', color: '#666', marginTop: '6px' }}>
              📅 Batch starts: {new Date(selectedBatchData.startDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}
        </div>

        {/* Student Type */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Student Type</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              border: studentType === 'regular' ? '2px solid #3b82f6' : '1px solid #e0e0e0',
              borderRadius: '8px',
              cursor: 'pointer',
              background: studentType === 'regular' ? '#eff6ff' : 'white'
            }}>
              <input
                type="radio"
                name="studentType"
                value="regular"
                checked={studentType === 'regular'}
                onChange={() => setStudentType('regular')}
                style={{ marginRight: '10px' }}
              />
              <div>
                <strong>Regular Student</strong>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>Full access to all features</p>
              </div>
            </label>
            <label style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              border: studentType === 'demo' ? '2px solid #3b82f6' : '1px solid #e0e0e0',
              borderRadius: '8px',
              cursor: 'pointer',
              background: studentType === 'demo' ? '#eff6ff' : 'white'
            }}>
              <input
                type="radio"
                name="studentType"
                value="demo"
                checked={studentType === 'demo'}
                onChange={() => setStudentType('demo')}
                style={{ marginRight: '10px' }}
              />
              <div>
                <strong>Demo Student</strong>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>Limited access for trial</p>
              </div>
            </label>
          </div>
        </div>

        {/* Notifications */}
        <div style={{ marginBottom: '20px', padding: '16px', background: '#f0fdf4', borderRadius: '8px' }}>
          <p style={{ fontWeight: '500', marginBottom: '12px' }}>📨 Send Notifications</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendWelcomeEmail} onChange={e => setSendWelcomeEmail(e.target.checked)} />
            Welcome Email with login credentials
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} />
            WhatsApp Welcome Message
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendOnboarding} onChange={e => setSendOnboarding(e.target.checked)} />
            Onboarding Instructions
          </label>
        </div>

        {/* Email Preview */}
        {sendWelcomeEmail && lead.email && (
          <div style={{ marginBottom: '20px', padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
            <p style={{ fontWeight: '500', marginBottom: '8px', fontSize: '14px' }}>📧 Email Preview</p>
            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
              <p style={{ margin: '0 0 8px' }}><strong>Subject:</strong> Welcome to CodeBegun, {lead.name.split(' ')[0]}! 🎉</p>
              <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '12px 0' }} />
              <p style={{ margin: '0 0 8px' }}>Dear {lead.name},</p>
              <p style={{ margin: '0 0 8px' }}>Congratulations on joining CodeBegun!</p>
              <p style={{ margin: '0 0 8px' }}>
                <strong>Your Login Credentials:</strong><br />
                Email: {lead.email}<br />
                Password: {password}
              </p>
              <p style={{ margin: '0' }}>
                Login at: <span style={{ color: '#3b82f6' }}>https://learn.codebegun.com</span>
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', border: '1px solid #e0e0e0', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={converting || !lead.email || !selectedBatch}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              background: '#059669',
              color: 'white',
              cursor: converting || !lead.email || !selectedBatch ? 'not-allowed' : 'pointer',
              opacity: converting || !lead.email || !selectedBatch ? 0.6 : 1
            }}
          >
            {converting ? 'Converting...' : '🎓 Convert to Student'}
          </button>
        </div>

        {!lead.email && (
          <p style={{ marginTop: '12px', color: '#dc2626', fontSize: '13px', textAlign: 'center' }}>
            ⚠️ Lead email is required for conversion
          </p>
        )}
      </div>
    </div>
  );
};

export default ConvertToStudentModal;
