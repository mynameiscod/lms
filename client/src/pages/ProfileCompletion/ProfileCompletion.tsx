import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './ProfileCompletion.css';

export const ProfileCompletion: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    phone: '',
    bio: '',
    avatar: '',
    linkedin: '',
    github: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSkip = () => {
    // Mark as complete even if skipped
    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/users/${user._id}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          profileComplete: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      const data = await response.json();
      
      // Update local context
      updateProfile(data.data);
      
      setSuccess('✓ Profile updated successfully!');

      // Redirect after success
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-completion-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-icon">👤</div>
          <h1>Complete Your Profile</h1>
          <p>Help us get to know you better</p>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-section">
            <h3>Basic Information</h3>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 555-5555"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="avatar">Avatar URL</label>
              <input
                type="url"
                id="avatar"
                name="avatar"
                value={formData.avatar}
                onChange={handleChange}
                placeholder="https://example.com/avatar.jpg"
                disabled={loading}
              />
              {formData.avatar && (
                <div className="avatar-preview">
                  <img src={formData.avatar} alt="Avatar preview" />
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself..."
                rows={4}
                disabled={loading}
              />
              <p className="char-count">{formData.bio.length}/200 characters</p>
            </div>
          </div>

          <div className="form-section">
            <h3>Professional Links</h3>

            <div className="form-group">
              <label htmlFor="linkedin">LinkedIn URL</label>
              <input
                type="url"
                id="linkedin"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/yourprofile"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="github">GitHub URL</label>
              <input
                type="url"
                id="github"
                name="github"
                value={formData.github}
                onChange={handleChange}
                placeholder="https://github.com/yourprofile"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
            <button 
              type="button" 
              className="skip-btn"
              onClick={handleSkip}
              disabled={loading}
            >
              Do This Later
            </button>
          </div>
        </form>

        <div className="profile-footer">
          <p>You can update your profile anytime in your settings</p>
        </div>
      </div>
    </div>
  );
};
