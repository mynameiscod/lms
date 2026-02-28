import React, { useEffect, useState, useCallback } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import contentAPI, { ContentResponse } from '../../api/contentAPI';
import './ContentTable.css';

export interface ContentTableProps {
  onEdit?: (content: ContentResponse) => void;
  onDelete?: (contentId: string) => void;
  onDeleteSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  refreshTrigger?: number;
}

const ContentTable: React.FC<ContentTableProps> = ({
  onEdit,
  onDelete,
  onDeleteSuccess,
  onError,
  refreshTrigger = 0,
}) => {
  const [contents, setContents] = useState<ContentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('');

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const filterParams: any = {};
      if (typeFilter) filterParams.type = typeFilter;
      if (publishedFilter) filterParams.isPublished = publishedFilter === 'true';

      const response = await contentAPI.getAllContent(page, 10, filterParams);
      setContents(response.content || []);
      setTotalPages(response.totalPages || 1);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load content';
      if (onError) onError(errorMessage);
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, publishedFilter, onError]);

  useEffect(() => {
    loadContent();
  }, [loadContent, refreshTrigger]);

  const handleDelete = async (contentId: string) => {
    if (!window.confirm('Are you sure you want to delete this content?')) {
      return;
    }

    try {
      await contentAPI.deleteContent(contentId);
      if (onDeleteSuccess) {
        onDeleteSuccess('✅ Content deleted successfully!');
      }
      loadContent();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete content';
      if (onError) onError(errorMessage);
    }
  };

  const getContentTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      announcement: '📢',
      note: '📝',
      assignment: '✓',
      cheatsheet: '⚡',
      snippet: '💻',
    };
    return icons[type] || '📄';
  };

  const getVisibilityBadge = (visibility: string) => {
    const badges: Record<string, string> = {
      public: '🌍 Public',
      private: '🔒 Private',
      restricted: '🔐 Restricted',
    };
    return badges[visibility] || visibility;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="content-table-card">
      <h2>Manage Content</h2>

      {/* Filters */}
      <div className="content-filters">
        <div className="filter-group">
          <label htmlFor="typeFilter">Type</label>
          <select
            id="typeFilter"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Types</option>
            <option value="announcement">📢 Announcement</option>
            <option value="note">📝 Note</option>
            <option value="assignment">✓ Assignment</option>
            <option value="cheatsheet">⚡ Cheatsheet</option>
            <option value="snippet">💻 Snippet</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="publishedFilter">Status</label>
          <select
            id="publishedFilter"
            value={publishedFilter}
            onChange={(e) => {
              setPublishedFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="true">✓ Published</option>
            <option value="false">📋 Draft</option>
          </select>
        </div>

        <Button onClick={() => loadContent()} disabled={loading}>
          🔄 Refresh
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-container">
          <Spinner />
          <p>Loading content...</p>
        </div>
      )}

      {/* Content Table */}
      {!loading && contents.length > 0 && (
        <>
          <div className="table-wrapper">
            <table className="content-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Visibility</th>
                  <th>Views</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contents.map((content) => (
                  <tr key={content._id} className="content-row">
                    <td className="type-cell">
                      <span className="type-badge">
                        {getContentTypeIcon(content.type)}
                        <span className="type-label">{content.type}</span>
                      </span>
                    </td>
                    <td className="title-cell">
                      <div>
                        <strong>{content.title}</strong>
                        <p className="description">{content.description}</p>
                      </div>
                    </td>
                    <td className="course-cell">
                      {content.courseId || '—'}
                    </td>
                    <td className="status-cell">
                      <span
                        className={`status-badge ${
                          content.isPublished ? 'published' : 'draft'
                        }`}
                      >
                        {content.isPublished ? '✓ Published' : '📋 Draft'}
                      </span>
                    </td>
                    <td className="visibility-cell">
                      {getVisibilityBadge(content.visibility)}
                    </td>
                    <td className="views-cell">
                      <strong>{content.viewCount || 0}</strong>
                    </td>
                    <td className="date-cell">
                      {formatDate(content.createdAt)}
                    </td>
                    <td className="actions-cell">
                      <Button
                        onClick={() => onEdit?.(content)}
                        className="btn-sm btn-edit"
                        disabled={loading}
                        title="Edit this content"
                      >
                        ✏️ Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(content._id)}
                        className="btn-sm btn-delete"
                        disabled={loading}
                        title="Delete this content"
                      >
                        🗑️ Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <Button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={loading || page === 1}
              className="btn-sm"
            >
              ← Previous
            </Button>
            <span className="page-info">
              Page {page} of {totalPages}
            </span>
            <Button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={loading || page === totalPages}
              className="btn-sm"
            >
              Next →
            </Button>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && contents.length === 0 && (
        <div className="empty-state">
          <p>📭 No content found</p>
          <p className="muted">Create your first content to get started!</p>
        </div>
      )}
    </Card>
  );
};

export default ContentTable;
