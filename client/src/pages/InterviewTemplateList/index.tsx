import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewTemplateApi } from '../../api/interviewModuleApi';
import './InterviewTemplateList.css';

type InterviewTemplateStatus = 'draft' | 'published' | 'archived' | 'expired';
type IInterviewTemplateShared = { _id?: string; title: string; description?: string; interviewCategories: string[]; totalDuration?: number; difficultyLevel?: string; status: InterviewTemplateStatus; sections?: any[]; maxAttempts?: number; interviewMode?: string; createdAt?: string; [key: string]: any; };

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280', published: '#10b981', scheduled: '#3b82f6',
  active: '#22c55e', expired: '#ef4444', cancelled: '#f97316', archived: '#9ca3af',
};

const CATEGORY_LABELS: Record<string, string> = {
  communication: '🗣️ Communication',
  hr: '👔 HR',
  technical: '💻 Technical',
};

const InterviewTemplateList: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<IInterviewTemplateShared[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', category: '', search: '' });
  const [searchInput, setSearchInput] = useState('');

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await interviewTemplateApi.getAll({
        ...filters,
        page,
        limit: 12,
      });
      setTemplates(res.templates || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSearch = () => {
    setPage(1);
    setFilters(prev => ({ ...prev, search: searchInput }));
  };

  const handlePublish = async (templateId: string) => {
    try {
      await interviewTemplateApi.publish(templateId);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to publish');
    }
  };

  const handleArchive = async (templateId: string) => {
    if (!window.confirm('Archive this template?')) return;
    try {
      await interviewTemplateApi.archive(templateId);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to archive');
    }
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      await interviewTemplateApi.duplicate(templateId);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate');
    }
  };

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="itl-container">
      <div className="itl-header">
        <div>
          <h1 className="itl-title">Interview Templates</h1>
          <p className="itl-subtitle">Create, manage, and assign mock interview templates</p>
        </div>
        <button className="itl-btn-primary" onClick={() => navigate('/admin/interviews/templates/create')}>
          + Create Template
        </button>
      </div>

      {/* Filters */}
      <div className="itl-filters">
        <div className="itl-search">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
        <select value={filters.status} onChange={e => { setPage(1); setFilters(prev => ({ ...prev, status: e.target.value })); }}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="expired">Expired</option>
          <option value="archived">Archived</option>
        </select>
        <select value={filters.category} onChange={e => { setPage(1); setFilters(prev => ({ ...prev, category: e.target.value })); }}>
          <option value="">All Categories</option>
          <option value="communication">Communication</option>
          <option value="hr">HR</option>
          <option value="technical">Technical</option>
        </select>
      </div>

      {/* Stats Bar */}
      <div className="itl-stats-bar">
        <span>Total: <strong>{total}</strong></span>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="itl-loading">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="itl-empty">
          <p>No interview templates found.</p>
          <button className="itl-btn-primary" onClick={() => navigate('/admin/interviews/templates/create')}>
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="itl-grid">
          {templates.map(template => (
            <div key={template._id} className="itl-card">
              <div className="itl-card-header">
                <span
                  className="itl-status-badge"
                  style={{ backgroundColor: STATUS_COLORS[template.status] || '#6b7280' }}
                >
                  {template.status}
                </span>
                <span className="itl-difficulty">{template.difficultyLevel}</span>
              </div>

              <h3 className="itl-card-title" onClick={() => navigate(`/admin/interviews/templates/${template._id}`)}>
                {template.title}
              </h3>

              <div className="itl-card-categories">
                {template.interviewCategories.map(cat => (
                  <span key={cat} className="itl-category-tag">{CATEGORY_LABELS[cat] || cat}</span>
                ))}
              </div>

              {template.description && (
                <p className="itl-card-desc">{template.description.substring(0, 100)}...</p>
              )}

              <div className="itl-card-meta">
                <span>⏱ {template.totalDuration} min</span>
                <span>📋 {template.sections?.length || 0} sections</span>
                <span>🎯 {template.experienceLevel}</span>
                <span>🔄 {template.maxAttempts} attempt(s)</span>
              </div>

              <div className="itl-card-mode">
                Mode: <strong>{template.interviewMode}</strong>
              </div>

              <div className="itl-card-actions">
                <button className="itl-btn-sm" onClick={() => navigate(`/admin/interviews/templates/${template._id}`)}>
                  Edit
                </button>
                {template.status === 'draft' && (
                  <button className="itl-btn-sm itl-btn-green" onClick={() => handlePublish(template._id!)}>
                    Publish
                  </button>
                )}
                {['active', 'published'].includes(template.status) && (
                  <button className="itl-btn-sm itl-btn-blue" onClick={() => navigate(`/admin/interviews/assign?templateId=${template._id}`)}>
                    Assign
                  </button>
                )}
                <button className="itl-btn-sm" onClick={() => handleDuplicate(template._id!)}>
                  Duplicate
                </button>
                {template.status !== 'archived' && (
                  <button className="itl-btn-sm itl-btn-red" onClick={() => handleArchive(template._id!)}>
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="itl-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
};

export default InterviewTemplateList;
