import React, { useState, useEffect } from 'react';
import { salesContentApi } from '../../api';
import './SalesContentLibrary.css';

interface SalesContent {
  _id: string;
  title: string;
  description?: string;
  category: string;
  contentType: string;
  fileUrl?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  tags: string[];
  visibleToRoles: string[];
  allowSharing: boolean;
  allowDownload: boolean;
  shareCount: number;
  viewCount: number;
  downloadCount: number;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
}

interface ContentCategory {
  key: string;
  label: string;
  icon: string;
  color: string;
}

const CONTENT_CATEGORIES: ContentCategory[] = [
  { key: 'curriculum', label: 'Curriculum', icon: '📚', color: '#3b82f6' },
  { key: 'fee', label: 'Fee Structure', icon: '💰', color: '#10b981' },
  { key: 'placement', label: 'Placements', icon: '💼', color: '#8b5cf6' },
  { key: 'campus', label: 'Campus Info', icon: '🏫', color: '#f59e0b' },
  { key: 'testimonial', label: 'Testimonials', icon: '⭐', color: '#ec4899' },
  { key: 'brochure', label: 'Brochures', icon: '📄', color: '#6366f1' },
  { key: 'video', label: 'Videos', icon: '🎥', color: '#ef4444' },
  { key: 'demo', label: 'Demos', icon: '🖥️', color: '#14b8a6' },
  { key: 'faq', label: 'FAQs', icon: '❓', color: '#f97316' },
  { key: 'offer', label: 'Offers', icon: '🎁', color: '#06b6d4' },
  { key: 'other', label: 'Other', icon: '📁', color: '#6b7280' }
];

const CONTENT_TYPES = [
  { value: 'pdf', label: 'PDF Document' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'document', label: 'Document' },
  { value: 'link', label: 'External Link' }
];

const SalesContentLibrary: React.FC = () => {
  const [content, setContent] = useState<SalesContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContent, setEditingContent] = useState<Partial<SalesContent> | null>(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3500);
  };

  useEffect(() => {
    loadContent();
    loadAnalytics();
  }, [categoryFilter]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (categoryFilter !== 'all') {
        filters.category = categoryFilter;
      }
      if (searchTerm) {
        filters.search = searchTerm;
      }
      const res = await salesContentApi.getAll(filters);
      setContent(res || []);
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await salesContentApi.getAnalytics();
      setAnalytics(res);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleSearch = () => {
    loadContent();
  };

  const handleAddContent = () => {
    setEditingContent({
      title: '',
      description: '',
      category: 'other',
      contentType: 'pdf',
      tags: [],
      visibleToRoles: ['TENANT_ADMIN', 'STAFF'],
      allowSharing: true,
      allowDownload: true,
      isFeatured: false,
      isActive: true
    });
    setShowModal(true);
  };

  const handleEditContent = (item: SalesContent) => {
    setEditingContent({ ...item });
    setShowModal(true);
  };

  const handleSaveContent = async () => {
    if (!editingContent || !editingContent.title) return;

    try {
      setSaving(true);
      
      if (editingContent._id) {
        await salesContentApi.update(editingContent._id, editingContent);
        showAlertMsg('success', 'Content updated successfully');
      } else {
        await salesContentApi.create(editingContent);
        showAlertMsg('success', 'Content added successfully');
      }
      
      setShowModal(false);
      setEditingContent(null);
      loadContent();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;

    try {
      await salesContentApi.delete(id);
      showAlertMsg('success', 'Content deleted successfully');
      loadContent();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to delete content');
    }
  };

  const handleToggleFeatured = async (item: SalesContent) => {
    try {
      await salesContentApi.update(item._id, { isFeatured: !item.isFeatured });
      loadContent();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to update content');
    }
  };

  const handleToggleActive = async (item: SalesContent) => {
    try {
      await salesContentApi.update(item._id, { isActive: !item.isActive });
      loadContent();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to update content');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryInfo = (key: string) => {
    return CONTENT_CATEGORIES.find(c => c.key === key) || CONTENT_CATEGORIES[CONTENT_CATEGORIES.length - 1];
  };

  const filteredContent = content.filter(item => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return item.title.toLowerCase().includes(search) ||
             item.description?.toLowerCase().includes(search) ||
             item.tags.some(t => t.toLowerCase().includes(search));
    }
    return true;
  });

  return (
    <div className="sales-content-library">
      {/* Alert */}
      {alert && (
        <div className={`scl-alert scl-alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      {/* Header */}
      <div className="scl-header">
        <div>
          <h1>Sales Content Library</h1>
          <p className="scl-subtitle">Manage content that telecallers can share with leads</p>
        </div>
        <button className="scl-btn scl-btn-primary" onClick={handleAddContent}>
          + Add Content
        </button>
      </div>

      {/* Stats */}
      {analytics && (
        <div className="scl-stats">
          <div className="scl-stat">
            <span className="scl-stat-value">{analytics.summary?.totalContent || 0}</span>
            <span className="scl-stat-label">Total Content</span>
          </div>
          <div className="scl-stat">
            <span className="scl-stat-value">{analytics.summary?.totalShares || 0}</span>
            <span className="scl-stat-label">Total Shares</span>
          </div>
          <div className="scl-stat">
            <span className="scl-stat-value">{analytics.summary?.totalViews || 0}</span>
            <span className="scl-stat-label">Total Views</span>
          </div>
          <div className="scl-stat">
            <span className="scl-stat-value">{analytics.summary?.totalDownloads || 0}</span>
            <span className="scl-stat-label">Total Downloads</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="scl-filters">
        <div className="scl-category-tabs">
          <button 
            className={`scl-category-tab ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            All
          </button>
          {CONTENT_CATEGORIES.map(cat => (
            <button 
              key={cat.key}
              className={`scl-category-tab ${categoryFilter === cat.key ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat.key)}
              style={{ '--cat-color': cat.color } as React.CSSProperties}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
        <div className="scl-search">
          <input 
            type="text"
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>🔍</button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="scl-content-grid">
        {loading ? (
          <div className="scl-loading">Loading content...</div>
        ) : filteredContent.length === 0 ? (
          <div className="scl-empty">No content found</div>
        ) : (
          filteredContent.map(item => {
            const catInfo = getCategoryInfo(item.category);
            return (
              <div 
                key={item._id} 
                className={`scl-content-card ${!item.isActive ? 'inactive' : ''}`}
              >
                <div className="scl-card-header" style={{ borderLeftColor: catInfo.color }}>
                  <span className="scl-card-category">
                    {catInfo.icon} {catInfo.label}
                  </span>
                  <div className="scl-card-badges">
                    {item.isFeatured && <span className="scl-badge featured">⭐ Featured</span>}
                    {!item.isActive && <span className="scl-badge inactive">Inactive</span>}
                  </div>
                </div>
                
                <div className="scl-card-body">
                  <h3>{item.title}</h3>
                  {item.description && <p>{item.description}</p>}
                  
                  <div className="scl-card-meta">
                    <span className="scl-type">{item.contentType.toUpperCase()}</span>
                    {item.fileSize && <span>{formatFileSize(item.fileSize)}</span>}
                  </div>
                  
                  {item.tags.length > 0 && (
                    <div className="scl-tags">
                      {item.tags.map(tag => (
                        <span key={tag} className="scl-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="scl-card-stats">
                  <span title="Shares">📤 {item.shareCount}</span>
                  <span title="Views">👁️ {item.viewCount}</span>
                  <span title="Downloads">⬇️ {item.downloadCount}</span>
                </div>
                
                <div className="scl-card-actions">
                  <button 
                    className="scl-icon-btn"
                    onClick={() => handleToggleFeatured(item)}
                    title={item.isFeatured ? 'Remove from featured' : 'Make featured'}
                  >
                    {item.isFeatured ? '⭐' : '☆'}
                  </button>
                  <button 
                    className="scl-icon-btn"
                    onClick={() => handleToggleActive(item)}
                    title={item.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {item.isActive ? '✓' : '○'}
                  </button>
                  <button 
                    className="scl-icon-btn"
                    onClick={() => handleEditContent(item)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button 
                    className="scl-icon-btn danger"
                    onClick={() => handleDeleteContent(item._id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && editingContent && (
        <div className="scl-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="scl-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingContent._id ? 'Edit Content' : 'Add New Content'}</h3>
            
            <div className="scl-form-row">
              <label>Title *</label>
              <input
                type="text"
                value={editingContent.title || ''}
                onChange={(e) => setEditingContent({ ...editingContent, title: e.target.value })}
                placeholder="Enter content title"
              />
            </div>

            <div className="scl-form-row">
              <label>Description</label>
              <textarea
                value={editingContent.description || ''}
                onChange={(e) => setEditingContent({ ...editingContent, description: e.target.value })}
                placeholder="Brief description of the content"
                rows={3}
              />
            </div>

            <div className="scl-form-row-inline">
              <div className="scl-form-field">
                <label>Category</label>
                <select
                  value={editingContent.category || 'other'}
                  onChange={(e) => setEditingContent({ ...editingContent, category: e.target.value })}
                >
                  {CONTENT_CATEGORIES.map(cat => (
                    <option key={cat.key} value={cat.key}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="scl-form-field">
                <label>Content Type</label>
                <select
                  value={editingContent.contentType || 'pdf'}
                  onChange={(e) => setEditingContent({ ...editingContent, contentType: e.target.value })}
                >
                  {CONTENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="scl-form-row">
              <label>File URL</label>
              <input
                type="url"
                value={editingContent.fileUrl || ''}
                onChange={(e) => setEditingContent({ ...editingContent, fileUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="scl-form-row">
              <label>External URL (optional)</label>
              <input
                type="url"
                value={editingContent.externalUrl || ''}
                onChange={(e) => setEditingContent({ ...editingContent, externalUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="scl-form-row">
              <label>Tags (comma separated)</label>
              <input
                type="text"
                value={editingContent.tags?.join(', ') || ''}
                onChange={(e) => setEditingContent({ 
                  ...editingContent, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                })}
                placeholder="java, web development, full stack"
              />
            </div>

            <div className="scl-form-row scl-checkboxes">
              <label>
                <input
                  type="checkbox"
                  checked={editingContent.allowSharing !== false}
                  onChange={(e) => setEditingContent({ ...editingContent, allowSharing: e.target.checked })}
                />
                Allow Sharing
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={editingContent.allowDownload !== false}
                  onChange={(e) => setEditingContent({ ...editingContent, allowDownload: e.target.checked })}
                />
                Allow Download
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={editingContent.isFeatured || false}
                  onChange={(e) => setEditingContent({ ...editingContent, isFeatured: e.target.checked })}
                />
                Featured
              </label>
            </div>

            <div className="scl-modal-actions">
              <button 
                className="scl-btn scl-btn-secondary"
                onClick={() => {
                  setShowModal(false);
                  setEditingContent(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="scl-btn scl-btn-primary"
                onClick={handleSaveContent}
                disabled={saving || !editingContent.title}
              >
                {saving ? 'Saving...' : 'Save Content'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesContentLibrary;
