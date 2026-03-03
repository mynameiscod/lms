import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './SetupPassword.css';

export const SetupPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const email = searchParams.get('email');
  const token = searchParams.get('token');

  useEffect(() => {
    // Validate token and email are present
    // If missing, show error and offer to go back to login
    if (!email || !token) {
      setError('Invalid setup link. This link may have expired or is malformed.');
    }
  }, [email, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.password.trim()) {
      setError('Password is required');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!email || !token) {
      setError('Invalid setup link. Please check your email for the setup link.');
      return;
    }

    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || '/api/v1';
      
      // Setup password
      const setupResponse = await fetch(`${API_URL}/users/setup-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          password: formData.password
        })
      });

      if (!setupResponse.ok) {
        const error = await setupResponse.json();
        throw new Error(error.message || 'Failed to setup password');
      }

      setSuccess('✓ Password setup successful! Redirecting to login...');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to setup password. Please try again or request a new setup link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-password-container">
      <div className="setup-card">
        <div className="setup-header">
          <div className="setup-icon">🔐</div>
          <h1>Complete Your Registration</h1>
          <p>Set up your password to get started</p>
        </div>

        {!email || !token ? (
          <div className="invalid-link-notice">
            <div className="error-message" style={{ marginBottom: '20px' }}>
              {error}
            </div>
            <p style={{ marginBottom: '20px', textAlign: 'center', color: '#666' }}>
              Your setup link is invalid or has expired. Please contact your administrator for a new invite link.
            </p>
            <button 
              type="button"
              className="submit-btn" 
              onClick={handleBackToLogin}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="setup-form">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                disabled={loading}
                autoComplete="new-password"
              />
              <p className="help-text">Minimum 6 characters</p>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <button 
              type="submit" 
              className="submit-btn" 
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Complete Registration'}
            </button>
          </form>
        )}

        <div className="setup-footer">
          <p>Already have access? <a href="/login">Login here</a></p>
        </div>
      </div>
    </div>
  );
};
