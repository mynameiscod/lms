import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '../../components/common';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [tenantId, setTenantId] = useState(''); // Only used when pre-filled from URL
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Auto-populate tenant ID from URL (for invite links)
  useEffect(() => {
    const urlTenantId = searchParams.get('tenantId');
    if (urlTenantId) {
      setTenantId(urlTenantId);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Please enter email and password');
      }

      // Pass tenantId only if it was pre-filled from URL
      await login(email, password, tenantId || undefined);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Section - Logo & Branding with White Background */}
      <div className="login-left">
        <div className="logo-section">
          <div className="logo">
            <img src="/assets/logo.png" alt="CODEBEGUN Logo" className="logo-image" />
          </div>
          <div className="logo-tagline">SOFTWARE TRAINING & CAREER SOLUTIONS</div>
        </div>

        <div className="branding-content">
          <h1 className="main-tagline">
            Gamify Learning, <span className="emoji">✨</span>
            <br />
            Simplify Employment
          </h1>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎮</div>
              <h3>Learn Through Play</h3>
              <p>Master coding with interactive challenges and rewards</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📌</div>
              <h3>Direct Placement</h3>
              <p>Get placed in top tech companies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form with Primary Color */}
      <div className="login-right">
        <div className="login-form-wrapper">
          <div className="form-header">
            <h2>Login</h2>
            <p>Enter your email and password to continue your journey with Codebegun</p>
          </div>

          {error && (
            <Alert 
              type="error" 
              message={error} 
              onClose={() => setError('')}
            />
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <div className="password-footer">
                <Link to="/forgot-password" className="forgot-password-link">
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button 
              type="submit" 
              className="continue-button"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;