import React, { useState, useCallback, useEffect } from 'react';
import { Alert, Spinner } from '../common';
import { type AlertType } from '../common';
import ContentForm from './ContentForm';
import EnhancedContentTable from './EnhancedContentTable';
import ContentSidebar from './ContentSidebar';
import { useSocket } from '../../contexts/SocketContext';
import './ContentManagementLayout.css';

export type ContentType = 'announcement' | 'note' | 'assignment' | 'cheatsheet' | 'snippet' | 'video' | 'audio' | 'pdf' | 'image' | 'document';

export interface ContentFilter {
  type?: ContentType | 'all';
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  visibility?: 'public' | 'subject-based' | 'all';
  isPublished?: boolean;
}

const ContentManagementLayout: React.FC = () => {
  const [alert, setAlert] = useState<{ message: string; type: AlertType } | null>(null);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedContentType, setSelectedContentType] = useState<ContentType | 'all'>('all');
  const [filters, setFilters] = useState<ContentFilter>({
    type: 'all',
    visibility: 'all'
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const socket = useSocket();

  const showAlert = useCallback((message: string, type: AlertType) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  }, []);

  const triggerTableRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    if (!socket.isConnected) return;

    socket.onContentCreated((data) => {
      console.log('📢 New content created:', data);
      showAlert('✅ New content posted: ' + data.title, 'success');
      triggerTableRefresh();
    });

    socket.onContentUpdated((data) => {
      console.log('✏️ Content updated:', data);
      showAlert('✏️ Content updated: ' + data.title, 'info');
      triggerTableRefresh();
    });

    socket.onContentDeleted((data) => {
      console.log('🗑️ Content deleted:', data);
      showAlert('🗑️ Content deleted: ' + data.title, 'warning');
      triggerTableRefresh();
    });

    return () => {
      socket.offContentCreated();
      socket.offContentUpdated();
      socket.offContentDeleted();
    };
  }, [socket.isConnected, socket, showAlert, triggerTableRefresh]);

  const handleFormSuccess = useCallback(
    (message: string) => {
      showAlert(message, 'success');
      triggerTableRefresh();
      setEditingContent(null);
      setShowFormModal(false);
    },
    [showAlert, triggerTableRefresh]
  );

  const handleFormError = useCallback(
    (message: string) => {
      showAlert(message, 'error');
    },
    [showAlert]
  );

  const handleEdit = useCallback((content: any) => {
    setEditingContent(content);
    setShowFormModal(true);
  }, []);

  const handleCancel = useCallback(() => {
    setEditingContent(null);
    setShowFormModal(false);
  }, []);

  const handleDeleteSuccess = useCallback(
    (message: string) => {
      showAlert(message, 'success');
      triggerTableRefresh();
    },
    [showAlert, triggerTableRefresh]
  );

  const handleContentTypeSelect = useCallback((type: ContentType | 'all') => {
    setSelectedContentType(type);
    setFilters(prev => ({
      ...prev,
      type: type
    }));
    setEditingContent(null);
    if (type !== 'all') {
      setShowFormModal(true);
    }
  }, []);

  const handleFilterChange = useCallback((newFilters: ContentFilter) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const handleCreateNew = useCallback((contentType?: ContentType) => {
    setEditingContent(null);
    if (contentType) {
      setSelectedContentType(contentType);
      setFilters(prev => ({ ...prev, type: contentType }));
    }
    setShowFormModal(true);
  }, []);

  return (
    <div className="content-management-layout">
      {alert && (
        <div className="alert-container">
          <Alert message={alert.message} type={alert.type} />
        </div>
      )}
      
      <div className="content-layout-main">
        <ContentSidebar
          selectedType={selectedContentType}
          onTypeSelect={handleContentTypeSelect}
          filters={filters}
          onFilterChange={handleFilterChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onCreateNew={handleCreateNew}
        />
        
        <div className={`content-main-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="content-header">
            <div className="content-header-top">
              <div>
                <h1>Content Management</h1>
                <p className="header-subtitle">
                  Create and manage your learning content across subjects, chapters, and topics
                </p>
              </div>
              <div className="content-header-actions">
                {socket.isConnected ? (
                  <div className="connection-status online">
                    <span className="status-dot"></span>
                    Live
                  </div>
                ) : (
                  <div className="connection-status offline">
                    <span className="status-dot"></span>
                    Offline
                  </div>
                )}
                <button 
                  className="create-content-btn primary"
                  onClick={() => handleCreateNew()}
                >
                  + Create New Content
                </button>
              </div>
            </div>
            
            {/* Content Type Filter Bar */}
            <div className="content-filter-bar">
              <div className="filter-summary">
                <span>Showing: </span>
                <span className="filter-tag">
                  {selectedContentType === 'all' ? 'All Content' : `${selectedContentType.charAt(0).toUpperCase() + selectedContentType.slice(1)} Content`}
                </span>
                {filters.subjectId && <span className="filter-tag">Subject Selected</span>}
                {filters.chapterId && <span className="filter-tag">Chapter Selected</span>}
                {filters.visibility !== 'all' && (
                  <span className="filter-tag">
                    {filters.visibility === 'public' ? 'Public Only' : 'Subject-based Only'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <EnhancedContentTable
            onEdit={handleEdit}
            onDeleteSuccess={handleDeleteSuccess}
            refreshTrigger={refreshTrigger}
            filters={filters}
          />
        </div>
      </div>

      {showFormModal && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <ContentForm
              onSuccess={handleFormSuccess}
              onError={handleFormError}
              editingContent={editingContent}
              onCancel={handleCancel}
              defaultType={selectedContentType !== 'all' ? selectedContentType : 'announcement'}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentManagementLayout;