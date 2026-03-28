import React, { useEffect, useState, useCallback } from 'react';
import { Spinner } from '../common';
import contentAPI, { ContentResponse } from '../../api/contentAPI';
import { ContentFilter } from './ContentManagementLayout';
import './EnhancedContentTable.css';

export interface ContentTableProps {
  onEdit?: (content: ContentResponse) => void;
  onDelete?: (contentId: string) => void;
  onDeleteSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  refreshTrigger?: number;
  filters?: ContentFilter;
}

const CONTENT_TYPE_ICONS = {
  announcement: '📢',
  note: '📝',
  video: '🎥',
  audio: '🎵',
  pdf: '📄',
  image: '🖼️',
  document: '📋',
  assignment: '📋',
  snippet: '💻',
  cheatsheet: '📊',
};

const CONTENT_TYPE_LABELS = {
  announcement: 'Announcement',
  note: 'Note',
  video: 'Video',
  audio: 'Audio',
  pdf: 'PDF',
  image: 'Image',
  document: 'Document',
  assignment: 'Assignment',
  snippet: 'Code Snippet',
  cheatsheet: 'Cheatsheet',
};

const ContentTable: React.FC<ContentTableProps> = ({
  onEdit,
  onDelete,
  onDeleteSuccess,
  onError,
  refreshTrigger = 0,
  filters = {},
}) => {
  const [contents, setContents] = useState<ContentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'title' | 'viewCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    setLoading(true);
    
    const filterParams: any = {
      page,
      limit: 12,
      sortBy,
      sortOrder
    };
    
    // Apply filters from props
    if (filters.type && filters.type !== 'all') filterParams.type = filters.type;
    if (filters.subjectId) filterParams.subjectId = filters.subjectId;
    if (filters.chapterId) filterParams.chapterId = filters.chapterId;
    if (filters.topicId) filterParams.topicId = filters.topicId;
    if (filters.visibility && filters.visibility !== 'all') {
      if (filters.visibility === 'public') filterParams.visibility = 'all_students';
      else if (filters.visibility === 'subject-based') filterParams.visibility = 'enrolled_only';
    }
    if (filters.isPublished !== undefined) filterParams.isPublished = filters.isPublished;
    if (searchTerm.trim()) filterParams.search = searchTerm.trim();

    try {
      const response = await contentAPI.getAllContent(filterParams.page, filterParams.limit, filterParams);
      setContents(response.content || []);
      setTotalPages(response.totalPages || 1);
      setTotal(response.total || 0);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load content';
      if (onError) onError(errorMessage);
      console.error('Error loading content:', error);
      console.error('Filter params:', filterParams);
      setContents([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, filters, searchTerm, sortBy, sortOrder, onError]);

  useEffect(() => {
    loadContent();
  }, [loadContent, refreshTrigger]);

  const handleDelete = async (contentId: string, contentTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${contentTitle}"?`)) {
      return;
    }

    setDeleting(contentId);
    try {
      await contentAPI.deleteContent(contentId);
      if (onDeleteSuccess) {
        onDeleteSuccess(`Content "${contentTitle}" deleted successfully`);
      }
      await loadContent(); // Refresh the list
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete content';
      if (onError) onError(errorMessage);
    } finally {
      setDeleting(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadContent();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilePreview = (content: ContentResponse) => {
    if (!content.attachments || content.attachments.length === 0) return null;
    
    const attachment = content.attachments[0];
    const isImage = attachment.type.startsWith('image/');
    const isVideo = attachment.type.startsWith('video/');
    
    if (isImage) {
      return (
        <div className="content-preview">
          <img src={attachment.url} alt={content.title} loading="lazy" />
        </div>
      );
    }
    
    if (isVideo) {
      return (
        <div className="content-preview">
          <video src={attachment.url} controls={false} muted preload="metadata">
            <track kind="captions" />
          </video>
        </div>
      );
    }
    
    return (
      <div className="content-file-info">
        <span className="file-icon">{CONTENT_TYPE_ICONS[content.type as keyof typeof CONTENT_TYPE_ICONS] || '📄'}</span>
        <div>
          <div>{attachment.name}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {(attachment.size / 1024 / 1024).toFixed(1)} MB
          </div>
        </div>
      </div>
    );
  };

  if (loading && contents.length === 0) {
    return (
      <div className="content-loading">
        <div className="loading-spinner"></div>
        <p>Loading content...</p>
      </div>
    );
  }

  return (
    <div className="content-table-container">
      <div className="content-table-header">
        <div className="content-search-bar">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="content-search-input"
            />
          </form>
        </div>
        
        <div className="content-sort-controls">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="sort-select"
          >
            <option value="createdAt">Date Created</option>
            <option value="title">Title</option>
            <option value="viewCount">View Count</option>
          </select>
          
          <button
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="content-loading">
          <div className="loading-spinner"></div>
          <p>Loading content...</p>
        </div>
      ) : contents.length === 0 ? (
        <div className="content-empty">
          <div className="empty-icon">📄</div>
          <h3>No content found</h3>
          <p>
            {Object.keys(filters).some(key => filters[key as keyof typeof filters] && filters[key as keyof typeof filters] !== 'all')
              ? 'No content matches your current filters. Try adjusting your search criteria.' 
              : 'No content has been created yet. Click "Create New Content" to get started!'
            }
          </p>
          <div className="empty-actions">
            <button className="btn-refresh" onClick={loadContent}>
              🔄 Refresh
            </button>
            {Object.keys(filters).some(key => filters[key as keyof typeof filters] && filters[key as keyof typeof filters] !== 'all') && (
              <button className="btn-clear-filters" onClick={() => {
                setSearchTerm('');
              }}>
                🗑️ Clear Search
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="content-grid">
            {contents.map((content) => (
              <div key={content._id} className="content-card">
                <div className="content-card-header">
                  <div className={`content-type-badge ${content.type}`}>
                    <span>{CONTENT_TYPE_ICONS[content.type as keyof typeof CONTENT_TYPE_ICONS] || '📄'}</span>
                    <span>{CONTENT_TYPE_LABELS[content.type as keyof typeof CONTENT_TYPE_LABELS] || content.type}</span>
                  </div>
                  
                  <h3 className="content-card-title">{content.title}</h3>
                  
                  <div className="content-card-meta">
                    <div className="meta-item">
                      <span>👤</span>
                      <span>{content.author.name}</span>
                    </div>
                    <div className="meta-item">
                      <span>📅</span>
                      <span>{formatDate(content.createdAt)}</span>
                    </div>
                  </div>
                  
                  {/* Show organization info if available */}
                  {(content.subjectId || content.chapterId) && (
                    <div className="content-organization">
                      Subject-based Content
                    </div>
                  )}
                </div>

                <div className="content-card-body">
                  {content.description && (
                    <p className="content-description">{content.description}</p>
                  )}
                  
                  {getFilePreview(content)}
                  
                  {content.tags && content.tags.length > 0 && (
                    <div className="content-tags">
                      {content.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="content-tag">{tag}</span>
                      ))}
                      {content.tags.length > 3 && (
                        <span className="content-tag">+{content.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="content-stats">
                    <div className="stat-item">
                      <span>👁️</span>
                      <span>{content.viewCount || 0} views</span>
                    </div>
                    {content.attachments && content.attachments.length > 0 && (
                      <div className="stat-item">
                        <span>📎</span>
                        <span>{content.attachments.length} files</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="content-card-actions">
                  <div className="content-status">
                    <div className={`status-indicator ${content.isPublished ? 'status-published' : 'status-draft'}`}></div>
                    <span className={content.isPublished ? 'status-published' : 'status-draft'}>
                      {content.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  
                  <div className="card-action-buttons">
                    <button
                      className="action-btn view-btn"
                      onClick={() => {/* Handle view */}}
                      title="View Content"
                    >
                      View
                    </button>
                    <button
                      className="action-btn edit-btn"
                      onClick={() => onEdit && onEdit(content)}
                      title="Edit Content"
                    >
                      Edit
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => handleDelete(content._id, content.title)}
                      disabled={deleting === content._id}
                      title="Delete Content"
                    >
                      {deleting === content._id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="content-pagination">
              <button
                className="pagination-btn"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </button>
              
              <div className="pagination-info">
                Page {page} of {totalPages} ({total} items)
              </div>
              
              <button
                className="pagination-btn"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {loading && (
        <div style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}>
          <Spinner />
        </div>
      )}
    </div>
  );
};

export default ContentTable;