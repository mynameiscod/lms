import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card, Alert } from '../../components/common';
import './CreateOrganizationPage.css';

const CreateOrganizationPage: React.FC = () => {
  const [organizationName, setOrganizationName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentFeatures, setStudentFeatures] = useState({
    dashboard: true,
    myCourse: true,
    classHub: true,
    attendance: true,
    quizzes: true,
    assignments: true,
    mockInterviews: true
  });
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const featureList = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-gauge-high', desc: 'Student home with progress, upcoming deadlines and widgets' },
    { key: 'myCourse', label: 'My Courses', icon: 'fa-solid fa-book-open', desc: 'Access enrolled courses and topics' },
    { key: 'classHub', label: 'Class Hub', icon: 'fa-solid fa-video', desc: 'Live & recorded classes with AI notes and quizzes' },
    { key: 'attendance', label: 'Attendance', icon: 'fa-solid fa-calendar-check', desc: 'View personal attendance records and summaries' },
    { key: 'quizzes', label: 'Quizzes', icon: 'fa-solid fa-circle-question', desc: 'Take assigned quizzes and view results' },
    { key: 'assignments', label: 'Assignments', icon: 'fa-solid fa-file-pen', desc: 'Submit coding and written assignments' },
    { key: 'mockInterviews', label: 'Mock Interviews', icon: 'fa-solid fa-comments', desc: 'Practice AI-powered mock interview sessions' }
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || '/api/v1';
      const response = await fetch(`${API_URL}/auth/register-organization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName,
          firstName,
          lastName,
          email,
          password,
          studentFeatures
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create organization');
      }

      // Auto-login: save token and user
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      localStorage.setItem('tenantId', data.data.user.tenantId);
      
      setUser(data.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card create-org-card">
        <Card 
          title="Create Your Organization" 
          subtitle="Set up your learning management system"
        >
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <form onSubmit={handleSubmit}>
            <div className="org-section">
              <h3 className="section-title">Organization Details</h3>
              <Input
                type="text"
                name="organizationName"
                label="Organization Name"
                placeholder="e.g., Acme Academy, Tech Institute"
                value={organizationName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrganizationName(e.target.value)}
                required
              />
            </div>

            <div className="org-section">
              <h3 className="section-title">Admin Account</h3>
              <div className="form-row">
                <Input
                  type="text"
                  name="firstName"
                  label="First Name"
                  placeholder="John"
                  value={firstName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  type="text"
                  name="lastName"
                  label="Last Name"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                  required
                />
              </div>

              <Input
                type="email"
                name="email"
                label="Email Address"
                placeholder="admin@yourorg.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
              />

              <Input
                type="password"
                name="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
              />

              <Input
                type="password"
                name="confirmPassword"
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="org-section">
              <h3 className="section-title">
                <i className="fa-solid fa-sliders" style={{ marginRight: '0.5rem' }} />
                Student Features
              </h3>
              <p className="section-desc">Choose which features will be available to your students. You can change these later from College → Student Features.</p>
              <div className="feature-grid">
                {featureList.map(f => (
                  <label
                    key={f.key}
                    className={`feature-toggle-card${(studentFeatures as any)[f.key] ? ' active' : ''}`}
                    onClick={() => setStudentFeatures(prev => ({ ...prev, [f.key]: !(prev as any)[f.key] }))}
                  >
                    <div className="feature-toggle-top">
                      <i className={f.icon} />
                      <div className={`feature-switch${(studentFeatures as any)[f.key] ? ' on' : ''}`} />
                    </div>
                    <div className="feature-toggle-label">{f.label}</div>
                    <div className="feature-toggle-desc">{f.desc}</div>
                  </label>
                ))}
              </div>
              <p className="feature-count">
                <i className="fa-solid fa-circle-check" style={{ color: 'var(--bs-success)', marginRight: '0.4rem' }} />
                {Object.values(studentFeatures).filter(Boolean).length} of {featureList.length} features enabled
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="auth-button"
              disabled={loading}
            >
              {loading ? 'Creating Organization...' : 'Create Organization'}
            </Button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign In
              </Link>
            </p>
            <p style={{ marginTop: '8px' }}>
              Joining an existing organization?{' '}
              <Link to="/register" className="auth-link">
                Join Here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CreateOrganizationPage;
