import React, { useState } from 'react';
import { leadApi } from '../../api';

interface PaymentLinkModalProps {
  lead: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    courseInterest?: string[];
  };
  onClose: () => void;
  onSent: () => void;
}

const PaymentLinkModal: React.FC<PaymentLinkModalProps> = ({
  lead,
  onClose,
  onSent
}) => {
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlertMsg({ type, message });
    setTimeout(() => setAlertMsg(null), 3000);
  };
  const [sending, setSending] = useState(false);
  const [course, setCourse] = useState('');
  const [paymentFor, setPaymentFor] = useState<'registration' | 'full' | 'custom'>('registration');
  const [customAmount, setCustomAmount] = useState('');
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(true);
  const [sendViaEmail, setSendViaEmail] = useState(!!lead.email);
  const [message, setMessage] = useState(`Dear ${lead.name},\n\nThank you for choosing CodeBegun!\nPlease complete your payment using the link below.\n\nBest regards,\nCodeBegun Team`);

  const courses = [
    { value: 'java_full_stack', label: 'Java Full Stack', registration: 15000, full: 65000 },
    { value: 'react', label: 'React Developer', registration: 12000, full: 45000 },
    { value: 'python', label: 'Python Full Stack', registration: 15000, full: 60000 },
    { value: 'mern', label: 'MERN Stack', registration: 12000, full: 55000 },
    { value: 'data_science', label: 'Data Science', registration: 18000, full: 75000 }
  ];

  const selectedCourse = courses.find(c => c.value === course);
  
  const getAmount = (): number => {
    if (!selectedCourse) return 0;
    if (paymentFor === 'registration') return selectedCourse.registration;
    if (paymentFor === 'full') return selectedCourse.full;
    return parseInt(customAmount) || 0;
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSend = async () => {
    if (!course) {
      showAlertMsg('error', 'Please select a course');
      return;
    }
    
    const amount = getAmount();
    if (amount <= 0) {
      showAlertMsg('error', 'Please enter a valid amount');
      return;
    }

    if (!sendViaWhatsApp && !sendViaEmail) {
      showAlertMsg('error', 'Please select at least one delivery method');
      return;
    }

    try {
      setSending(true);
      
      await leadApi.addActivity(lead._id, {
        type: 'note',
        description: `Payment link sent for ${course} - ${formatAmount(amount)}`
      });

      showAlertMsg('success', 'Payment link sent successfully');
      onSent();
      onClose();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to send payment link');
    } finally {
      setSending(false);
    }
  };

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
          <h2 style={{ margin: 0, fontSize: '18px' }}>Send Payment Link</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <p style={{ color: '#666', marginBottom: '20px' }}>Lead: <strong>{lead.name}</strong></p>

        {/* Course Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Course</label>
          <select
            value={course}
            onChange={e => setCourse(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px' }}
          >
            <option value="">Select course...</option>
            {courses.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Payment Type */}
        {selectedCourse && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Payment For</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '12px',
                border: paymentFor === 'registration' ? '2px solid #3b82f6' : '1px solid #e0e0e0',
                borderRadius: '8px',
                cursor: 'pointer',
                background: paymentFor === 'registration' ? '#eff6ff' : 'white'
              }}>
                <input
                  type="radio"
                  name="paymentFor"
                  value="registration"
                  checked={paymentFor === 'registration'}
                  onChange={() => setPaymentFor('registration')}
                  style={{ marginRight: '12px' }}
                />
                <div>
                  <strong>Registration Fee</strong>
                  <span style={{ color: '#666', marginLeft: '8px' }}>{formatAmount(selectedCourse.registration)}</span>
                </div>
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '12px',
                border: paymentFor === 'full' ? '2px solid #3b82f6' : '1px solid #e0e0e0',
                borderRadius: '8px',
                cursor: 'pointer',
                background: paymentFor === 'full' ? '#eff6ff' : 'white'
              }}>
                <input
                  type="radio"
                  name="paymentFor"
                  value="full"
                  checked={paymentFor === 'full'}
                  onChange={() => setPaymentFor('full')}
                  style={{ marginRight: '12px' }}
                />
                <div>
                  <strong>Full Fee</strong>
                  <span style={{ color: '#666', marginLeft: '8px' }}>{formatAmount(selectedCourse.full)}</span>
                </div>
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '12px',
                border: paymentFor === 'custom' ? '2px solid #3b82f6' : '1px solid #e0e0e0',
                borderRadius: '8px',
                cursor: 'pointer',
                background: paymentFor === 'custom' ? '#eff6ff' : 'white'
              }}>
                <input
                  type="radio"
                  name="paymentFor"
                  value="custom"
                  checked={paymentFor === 'custom'}
                  onChange={() => setPaymentFor('custom')}
                  style={{ marginRight: '12px' }}
                />
                <div style={{ flex: 1 }}>
                  <strong>Custom Amount</strong>
                  {paymentFor === 'custom' && (
                    <input
                      type="number"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder="Enter amount"
                      style={{ marginLeft: '12px', padding: '6px', border: '1px solid #e0e0e0', borderRadius: '4px', width: '120px' }}
                    />
                  )}
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Amount Summary */}
        {getAmount() > 0 && (
          <div style={{ 
            padding: '16px', 
            background: '#f0fdf4', 
            borderRadius: '8px', 
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Amount to be paid</p>
            <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: '700', color: '#059669' }}>
              {formatAmount(getAmount())}
            </p>
          </div>
        )}

        {/* Message Template */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px', resize: 'vertical' }}
          />
        </div>

        {/* Delivery Method */}
        <div style={{ marginBottom: '20px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
          <p style={{ fontWeight: '500', marginBottom: '8px' }}>Send via</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendViaWhatsApp} onChange={e => setSendViaWhatsApp(e.target.checked)} />
            💬 WhatsApp ({lead.phone})
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendViaEmail} onChange={e => setSendViaEmail(e.target.checked)} disabled={!lead.email} />
            📧 Email {lead.email ? `(${lead.email})` : '(No email provided)'}
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
            onClick={handleSend}
            disabled={sending || !course || getAmount() <= 0}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              background: '#059669',
              color: 'white',
              cursor: sending || !course || getAmount() <= 0 ? 'not-allowed' : 'pointer',
              opacity: sending || !course || getAmount() <= 0 ? 0.6 : 1
            }}
          >
            {sending ? 'Sending...' : '💳 Generate & Send Link'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentLinkModal;
