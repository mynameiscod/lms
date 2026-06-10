import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '../../components/common';
import './LoginPage.css';

// Hero illustration — laptop with code, trophy and books (inline SVG, crisp at any size)
const HeroArt: React.FC = () => (
  <svg className="login-hero-art" viewBox="0 0 360 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="180" cy="184" rx="150" ry="12" fill="#0a2a5e" opacity="0.06" />
    {/* Books */}
    <rect x="36" y="150" width="120" height="14" rx="3" fill="#0f766e" />
    <rect x="44" y="136" width="104" height="14" rx="3" fill="#14a89c" />
    <rect x="52" y="122" width="88" height="14" rx="3" fill="#f59e0b" />
    {/* Laptop */}
    <rect x="120" y="70" width="150" height="92" rx="8" fill="#0a2a5e" />
    <rect x="130" y="80" width="130" height="72" rx="4" fill="#0f1f44" />
    <rect x="140" y="92" width="48" height="6" rx="3" fill="#14a89c" />
    <rect x="140" y="104" width="80" height="6" rx="3" fill="#60a5fa" />
    <rect x="140" y="116" width="64" height="6" rx="3" fill="#f59e0b" />
    <rect x="140" y="128" width="92" height="6" rx="3" fill="#475569" />
    <rect x="104" y="162" width="182" height="10" rx="5" fill="#0a2a5e" />
    {/* Trophy */}
    <g transform="translate(232,86)">
      <path d="M14 0h36v10c0 14-8 24-18 24S14 24 14 10V0Z" fill="#f59e0b" />
      <path d="M6 4h10v8a10 10 0 0 1-10-8Zm42 0h10a10 10 0 0 1-10 8V4Z" fill="#fbbf24" />
      <rect x="28" y="32" width="8" height="12" fill="#d97706" />
      <rect x="20" y="44" width="24" height="7" rx="2" fill="#d97706" />
      <path d="M27 8l3 6 6 .6-4.5 4 1.4 6L28 21.6 22.7 24.6l1.4-6L19.6 14.6 25.6 14 27 8Z" fill="#fff" opacity="0.85" />
    </g>
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const EyeIcon = ({ off }: { off?: boolean }) => off ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.2 3.2M6.6 6.6A18 18 0 0 0 2 12s3 8 10 8a9 9 0 0 0 5.4-1.6" /><path d="m2 2 20 20" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
  </svg>
);

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [tenantId, setTenantId] = useState(''); // Only used when pre-filled from URL
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for loginMessage from logout redirect (e.g., account deactivated)
  useEffect(() => {
    const message = localStorage.getItem('loginMessage');
    if (message) {
      setInfoMessage(message);
      localStorage.removeItem('loginMessage');
    }
  }, []);

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
    <div className="login-page">
      {/* Left — brand / marketing */}
      <section className="login-brand">
        <div className="login-brand-inner">
          <img src="/assets/logo.png" alt="CodeBegun" className="login-logo" />

          <h1 className="login-tagline">
            <span className="tw-teal">Gamify</span> <span className="tw-navy">Learning,</span> <span className="login-spark">✨</span>
            <br />
            <span className="tw-teal">Simplify</span> <span className="tw-navy">Employment</span>
          </h1>
          <p className="login-subtitle">Master skills through interactive learning and get placed in top tech companies.</p>

          <div className="login-features">
            <div className="login-feature">
              <span className="login-feature-ic ic-purple">🎮</span>
              <h3>Learn Through Play</h3>
              <p>Master coding with interactive challenges and rewards</p>
            </div>
            <div className="login-feature">
              <span className="login-feature-ic ic-rose">📌</span>
              <h3>Direct Placement</h3>
              <p>Get placed in top tech companies</p>
            </div>
          </div>

          <HeroArt />
        </div>
      </section>

      {/* Right — login form */}
      <section className="login-panel">
        <div className="login-card">
          <div className="login-card-head">
            <h2>Welcome Back!</h2>
            <p>Login to continue your journey with Codebegun</p>
          </div>

          {infoMessage && <Alert type="warning" message={infoMessage} onClose={() => setInfoMessage('')} />}
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Email Address</label>
              <div className="login-input-wrap">
                <span className="login-input-ic"><MailIcon /></span>
                <input
                  type="email"
                  id="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="login-input-wrap">
                <span className="login-input-ic"><LockIcon /></span>
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setPasswordVisible((v) => !v)}
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon off={passwordVisible} />
                </button>
              </div>
              <div className="login-forgot-row">
                <Link to="/forgot-password" className="login-forgot">Forgot Password?</Link>
              </div>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              <span>{loading ? 'Logging in…' : 'Continue'}</span>
              {!loading && <ArrowIcon />}
            </button>
          </form>

          <div className="login-divider"><span>OR</span></div>

          <div className="login-alt">
            <p>New here? <Link to="/create-organization" className="login-alt-link">Create your organization</Link></p>
            <p>Have an invite link? <Link to="/register" className="login-alt-link">Join organization</Link></p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
