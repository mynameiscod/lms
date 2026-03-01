import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card, Alert } from '../../components/common';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTenantField, setShowTenantField] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Auto-populate tenant ID from URL and hide field if pre-filled
  useEffect(() => {
    const urlTenantId = searchParams.get('tenantId');
    if (urlTenantId) {
      setTenantId(urlTenantId);
      setShowTenantField(false); // Hide field - it's pre-filled from URL
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

      if (!tenantId && showTenantField) {
        throw new Error('Please enter your Tenant ID or use an invite link from your administrator.');
      }

      await login(email, password, tenantId);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Card title="Welcome Back" subtitle="Sign in to your account">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <form onSubmit={handleSubmit}>
            <Input
              type="email"
              name="email"
              label="Email Address"
              placeholder="Enter your email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />

            <Input
              type="password"
              name="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
            />

            {showTenantField && (
              <Input
                type="text"
                name="tenantId"
                label="Tenant ID"
                placeholder="Enter your tenant ID"
                value={tenantId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTenantId(e.target.value)}
                required={showTenantField}
              />
            )}

            <Button type="submit" loading={loading} className="auth-button">
              Sign In
            </Button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">
                Create one
              </Link>
            </p>
            {!showTenantField && !searchParams.get('tenantId') && (
              <p className="tenant-hint">
                <button
                  type="button"
                  className="tenant-toggle-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTenantField(true);
                  }}
                >
                  Enter Tenant ID manually?
                </button>
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;