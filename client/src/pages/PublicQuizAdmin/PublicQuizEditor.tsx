import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { publicQuizAdminApi } from '../../api';
import LandingPageBuilder from './LandingPageBuilder';
import RegistrationFormBuilder from './RegistrationFormBuilder';
import ResultSettingsForm from './ResultSettingsForm';
import CertificateEditor from './CertificateEditor';
import './PublicQuizAdmin.css';

const TABS = ['landing', 'registration', 'results', 'certificate'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  landing: '🏠 Landing Page',
  registration: '📋 Registration Form',
  results: '🏆 Result Settings',
  certificate: '📜 Certificate'
};

const defaultConfig = {
  title: '',
  quizId: '',
  slug: '',
  isActive: true,
  landingPage: {
    blocks: [],
    backToHomeUrl: '',
    primaryColor: '#005897',
    fontFamily: ''
  },
  registrationForm: {
    fields: [],
    submitButtonText: 'Start Quiz'
  },
  resultSettings: {
    showScore: true,
    showAnswers: false,
    showCertificate: false,
    showThankYouMessage: true,
    thankYouMessage: 'Thank you for taking the quiz! We will contact you soon.',
    passingPercentage: undefined,
    social: {
      hashtags: [],
      instagramHandle: '',
      twitterHandle: '',
      linkedinCompanyUrl: '',
      shareMessage: 'I scored {{score}}% on {{quizTitle}}! 🎉 {{hashtags}}'
    }
  },
  certificateTemplate: ''
};

const PublicQuizEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = id && id !== 'new';
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('landing');
  const [config, setConfig] = useState<any>(defaultConfig);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(isEdit ? true : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    publicQuizAdminApi.getAvailableQuizzes().then(setQuizzes).catch(() => {});
    if (isEdit) {
      publicQuizAdminApi.getConfig(id!).then(data => {
        setConfig(data);
        setLoading(false);
      }).catch(e => { setError(e.message); setLoading(false); });
    }
  }, [id, isEdit]);

  const handleSave = async () => {
    if (!config.title.trim()) { setError('Title is required'); return; }
    if (!config.quizId) { setError('Please select a quiz'); return; }

    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await publicQuizAdminApi.updateConfig(id!, config);
      } else {
        const created = await publicQuizAdminApi.createConfig(config);
        navigate(`/public-quiz-admin/${created._id}/edit`, { replace: true });
      }
      setSuccess('Saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  const updateSection = (section: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [section]: value }));
  };

  if (loading) return <div className="pq-loading">Loading...</div>;

  return (
    <div className="pq-editor-page">
      {/* Page header */}
      <div className="pq-editor-header">
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/public-quiz-admin')}>
          ← Back
        </button>
        <h2>{isEdit ? 'Edit Public Quiz' : 'Create Public Quiz'}</h2>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : isEdit ? '💾 Save Changes' : '🚀 Create'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Basic info */}
      <div className="pq-basic-info card mb-4 p-3">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Display Title *</label>
            <input
              className="form-control"
              placeholder="e.g. Java Fundamentals Test 2026"
              value={config.title}
              onChange={e => setConfig((p: any) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Quiz *</label>
            <select
              className="form-select"
              value={config.quizId}
              onChange={e => setConfig((p: any) => ({ ...p, quizId: e.target.value }))}
            >
              <option value="">Select a quiz...</option>
              {quizzes.map(q => (
                <option key={q._id} value={q._id}>
                  {q.title} ({q.totalQuestions}Q, {q.totalMarks} marks)
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold">URL Slug</label>
            <input
              className="form-control"
              placeholder="auto-generated from title"
              value={config.slug}
              onChange={e => setConfig((p: any) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            />
            <div className="form-text">/public-quiz/<strong>{config.slug || 'auto'}</strong></div>
          </div>
          <div className="col-md-1 d-flex align-items-end">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                checked={config.isActive}
                onChange={e => setConfig((p: any) => ({ ...p, isActive: e.target.checked }))}
              />
              <label className="form-check-label">{config.isActive ? 'Active' : 'Inactive'}</label>
            </div>
          </div>

          {/* Scheduling row */}
          <div className="col-12">
            <hr className="my-1" />
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label fw-semibold">📅 Quiz Opens (optional)</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={config.scheduledAt ? new Date(config.scheduledAt).toISOString().slice(0, 16) : ''}
                  onChange={e => setConfig((p: any) => ({ ...p, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                />
                <div className="form-text">Students can pre-register before this date</div>
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">🔒 Quiz Closes (optional)</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={config.closesAt ? new Date(config.closesAt).toISOString().slice(0, 16) : ''}
                  onChange={e => setConfig((p: any) => ({ ...p, closesAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                />
                <div className="form-text">Link stops accepting after this date</div>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">📣 Meta Pixel ID (optional)</label>
                <input
                  className="form-control"
                  placeholder="e.g. 1234567890123456"
                  value={config.metaPixelId || ''}
                  onChange={e => setConfig((p: any) => ({ ...p, metaPixelId: e.target.value }))}
                />
                <div className="form-text">Tracks form fills from Meta / Instagram / Facebook ads</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs pq-tabs mb-4">
        {TABS.map(tab => (
          <li key={tab} className="nav-item">
            <button
              className={`nav-link${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          </li>
        ))}
      </ul>

      <div className="pq-tab-content">
        {activeTab === 'landing' && (
          <LandingPageBuilder
            landingPage={config.landingPage}
            onChange={val => updateSection('landingPage', val)}
          />
        )}
        {activeTab === 'registration' && (
          <RegistrationFormBuilder
            form={config.registrationForm}
            onChange={val => updateSection('registrationForm', val)}
          />
        )}
        {activeTab === 'results' && (
          <ResultSettingsForm
            settings={config.resultSettings}
            onChange={val => updateSection('resultSettings', val)}
          />
        )}
        {activeTab === 'certificate' && (
          <CertificateEditor
            template={config.certificateTemplate}
            onChange={val => setConfig((p: any) => ({ ...p, certificateTemplate: val }))}
          />
        )}
      </div>

      <div className="pq-editor-footer">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : isEdit ? '💾 Save Changes' : '🚀 Create Public Quiz'}
        </button>
      </div>
    </div>
  );
};

export default PublicQuizEditor;
