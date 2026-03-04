import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './ForgotPassword.css';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || '/api/v1';
      
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <div className="forgot-icon">🔑</div>
          <h1>Forgot Password?</h1>
          <p>No worries, we'll send you reset instructions</p>
        </div>

        {success ? (
          <div className="success-state">
            <div className="success-icon">✉️</div>
            <h2>Check your email</h2>
            <p>
              If an account exists for <strong>{email}</strong>, we've sent a password reset link.
            </p>
            <p className="hint">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button 
              className="reset-btn secondary"
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
            >
              Try again
            </button>
            <Link to="/login" className="back-to-login">
              ← Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="forgot-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                disabled={loading}
                autoComplete="email"
                autoFocus
              />
            </div>

            <button 
              type="submit" 
              className="reset-btn primary"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <Link to="/login" className="back-to-login">
              ← Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
