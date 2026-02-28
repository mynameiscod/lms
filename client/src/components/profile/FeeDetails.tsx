import React from 'react';
import './FeeDetails.css';

interface FeeDetailsProps {
  data: {
    totalFee: number;
    paidAmount: number;
    pendingAmount: number;
  };
}

export const FeeDetails: React.FC<FeeDetailsProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const paymentPercentage =
    data.totalFee > 0 ? (data.paidAmount / data.totalFee) * 100 : 0;

  return (
    <div className="fee-details">
      <div className="section-header">
        <div>
          <h3>Fee Details</h3>
          <p className="section-subtitle">Payment status</p>
        </div>
        <span className="section-icon">💰</span>
      </div>

      <div className="fee-grid">
        <div className="fee-card total">
          <div className="fee-header">
            <label>Total Fee</label>
            <span className="fee-icon">💳</span>
          </div>
          <p className="fee-amount">{formatCurrency(data.totalFee)}</p>
        </div>

        <div className="fee-card paid">
          <div className="fee-header">
            <label>Paid Amount</label>
            <span className="fee-icon">✓</span>
          </div>
          <p className="fee-amount">{formatCurrency(data.paidAmount)}</p>
        </div>

        <div className="fee-card pending">
          <div className="fee-header">
            <label>Pending Amount</label>
            <span className="fee-icon">⏳</span>
          </div>
          <p className="fee-amount">{formatCurrency(data.pendingAmount)}</p>
        </div>
      </div>

      <div className="payment-progress">
        <div className="progress-header">
          <label>Payment Progress</label>
          <span className="progress-percentage">
            {Math.round(paymentPercentage)}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${paymentPercentage}%` }}
          ></div>
        </div>
        <div className="progress-details">
          <span>
            {formatCurrency(data.paidAmount)} of{' '}
            {formatCurrency(data.totalFee)} paid
          </span>
        </div>
      </div>

      <div className="read-only-badge">
        🔒 This information is managed by administrators and cannot be edited
      </div>
    </div>
  );
};

export default FeeDetails;
