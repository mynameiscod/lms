import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { tenantApi } from '../../api';
import './StudentFeaturesPage.css';

interface FeatureConfig {
  dashboard: boolean;
  myCourse: boolean;
  attendance: boolean;
  quizzes: boolean;
  assignments: boolean;
  mockInterviews: boolean;
  classHub: boolean;
}

const FEATURE_META: { key: keyof FeatureConfig; label: string; description: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Student dashboard with stats, progress, deadlines, and quick actions', icon: '⌂' },
  { key: 'myCourse', label: 'My Course', description: 'Course content, chapters, and learning materials', icon: '📚' },
  { key: 'classHub', label: '🎓 My Classes (Class Hub)', description: 'View recorded classes with AI summary, quiz, notes, practice & assignment tabs', icon: '🎬' },
  { key: 'attendance', label: 'Attendance', description: 'View attendance records and attendance percentage', icon: '☑' },
  { key: 'quizzes', label: 'Quizzes', description: 'Take quizzes and view quiz results', icon: '✎' },
  { key: 'assignments', label: 'Assignments', description: 'Submit coding assignments and view results', icon: '📝' },
  { key: 'mockInterviews', label: 'Mock Interviews', description: 'Practice mock interviews with AI feedback', icon: '🎯' },
];

const StudentFeaturesPage: React.FC = () => {
  const { user } = useAuth();
  const [features, setFeatures] = useState<FeatureConfig>({
    dashboard: true,
    myCourse: true,
    attendance: true,
    quizzes: true,
    assignments: true,
    mockInterviews: true,
    classHub: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchFeatures = async () => {
      if (!user?.tenantId) return;
      try {
        const response = await tenantApi.getStudentFeatures(user.tenantId);
        if (response.success && response.data) {
          setFeatures(prev => ({ ...prev, ...response.data }));
        }
      } catch (err) {
        console.error('Failed to fetch student features:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatures();
  }, [user?.tenantId]);

  const handleToggle = (key: keyof FeatureConfig) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user?.tenantId) return;
    setSaving(true);
    try {
      await tenantApi.updateStudentFeatures(user.tenantId, { ...features });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save student features:', err);
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = Object.values(features).filter(Boolean).length;

  if (loading) {
    return (
      <div className="sf-page">
        <div className="sf-loading">Loading feature settings...</div>
      </div>
    );
  }

  return (
    <div className="sf-page">
      <div className="sf-header">
        <div className="sf-header-text">
          <h1>Student Feature Control</h1>
          <p>Control which features and modules are visible to students. Toggle features on or off to customize the student experience.</p>
        </div>
        <div className="sf-header-badge">
          {enabledCount} of {FEATURE_META.length} enabled
        </div>
      </div>

      <div className="sf-features-grid">
        {FEATURE_META.map(({ key, label, description, icon }) => (
          <div key={key} className={`sf-feature-card ${features[key] ? 'enabled' : 'disabled'}`}>
            <div className="sf-feature-info">
              <span className="sf-feature-icon">{icon}</span>
              <div className="sf-feature-text">
                <h3>{label}</h3>
                <p>{description}</p>
              </div>
            </div>
            <label className="sf-toggle">
              <input
                type="checkbox"
                checked={features[key]}
                onChange={() => handleToggle(key)}
              />
              <span className="sf-toggle-slider"></span>
              <span className="sf-toggle-label">{features[key] ? 'Visible' : 'Hidden'}</span>
            </label>
          </div>
        ))}
      </div>

      <div className="sf-actions">
        <button className="sf-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>
        {saved && <span className="sf-saved-msg">Student feature settings updated successfully.</span>}
      </div>
    </div>
  );
};

export default StudentFeaturesPage;
