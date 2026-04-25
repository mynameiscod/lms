import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './ProfileCompletion.css';

const MAX_BIO = 200;
const PHONE_PATTERN = /^[+]?[\d\s\-().]{7,20}$/;

export const ProfileCompletion: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    phone: '',
    bio: '',
    avatar: '',
    linkedin: '',
    github: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load existing user data into form
  useEffect(() => {
    if (user) {
      setFormData({
        phone: user.phone || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
        linkedin: user.linkedin || '',
        github: user.github || ''
      });
      if (user.avatar) setAvatarPreview(user.avatar);
    }
  }, [user]);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'bio' && value.length > MAX_BIO) return;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar image must be smaller than 5 MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.phone && !PHONE_PATTERN.test(formData.phone)) {
      setError('Enter a valid phone number (e.g. +91 9876543210)');
      return;
    }

    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || '/api/v1';
      const token = localStorage.getItem('token');

      // Upload avatar file first if one was chosen
      let avatarUrl = formData.avatar;
      if (avatarFile) {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        const uploadRes = await fetch(`${API_URL}/users/${user._id}/avatar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.message || 'Avatar upload failed');
        }
        const uploadData = await uploadRes.json();
        avatarUrl = uploadData.data.avatarUrl;
      }

      const response = await fetch(`${API_URL}/users/${user._id}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          avatar: avatarUrl,
          profileComplete: true
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to update profile');
      }

      const data = await response.json();
      updateProfile({ ...data.data, avatar: avatarUrl });

      setSuccess('✓ Profile updated successfully!');
      setTimeout(() => navigate('/dashboard'), 1500);
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
              <label htmlFor="phone">
                Phone Number
                <span className="field-hint">e.g. +91 9876543210</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 9876543210"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Profile Picture</label>
              <div className="avatar-upload-area" onClick={() => fileInputRef.current?.click()}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" className="avatar-preview-img" />
                ) : (
                  <div className="avatar-placeholder">
                    <span className="avatar-upload-icon">📷</span>
                    <span>Click to upload photo</span>
                    <span className="avatar-hint">JPEG, PNG, GIF or WebP · max 5 MB</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarFile}
                disabled={loading}
              />
              {avatarPreview && (
                <button type="button" className="avatar-remove-btn" onClick={() => { setAvatarFile(null); setAvatarPreview(''); setFormData(p => ({ ...p, avatar: '' })); }}>
                  Remove photo
                </button>
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
                maxLength={MAX_BIO}
                disabled={loading}
              />
              <p className={`char-count${formData.bio.length >= MAX_BIO ? ' char-count--limit' : ''}`}>
                {formData.bio.length}/{MAX_BIO} characters
              </p>
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
