import React, { useState, useCallback, useEffect } from 'react';
import Alert from '../common/Alert';
import { type AlertType } from '../common';
import ContentForm from './ContentForm';
import ContentTable from './ContentTable';
import { useSocket } from '../../contexts/SocketContext';
import './AdminContentPanel.css';

const AdminContentPanel: React.FC = () => {
  const [alert, setAlert] = useState<{ message: string; type: AlertType } | null>(null);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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

    // Listen for new content created
    socket.onContentCreated((data) => {
      console.log('📢 New content created:', data);
      showAlert('✅ New content posted: ' + data.title, 'success');
      triggerTableRefresh();
    });

    // Listen for content updates
    socket.onContentUpdated((data) => {
      console.log('✏️ Content updated:', data);
      showAlert('✏️ Content updated: ' + data.title, 'info');
      triggerTableRefresh();
    });

    // Listen for content deletions
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

  return (
    <div className="admin-content-panel">
      <div className="panel-header">
        <div className="panel-header-top">
          <div>
            <h1>📚 Content Management</h1>
            <p className="header-subtitle">
              Create and manage announcements, notes, assignments, cheatsheets, and code snippets
            </p>
          </div>
          <div className="panel-header-right">
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
            <button className="acp-create-btn" onClick={() => { setEditingContent(null); setShowFormModal(true); }}>
              + New Content
            </button>
          </div>
        </div>
      </div>

      {/* Alert Section */}
      {alert && <Alert message={alert.message} type={alert.type} />}

      {/* Form Modal */}
      {showFormModal && (
        <div className="acp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}>
          <div className="acp-modal">
            <div className="acp-modal-header">
              <h2>{editingContent ? '✏️ Edit Content' : '➕ New Content'}</h2>
              <button className="acp-modal-close" onClick={handleCancel}>✕</button>
            </div>
            <div className="acp-modal-body">
              <ContentForm
                onSuccess={handleFormSuccess}
                onError={handleFormError}
                onShowAlert={showAlert}
                editingContent={editingContent}
                onCancel={handleCancel}
              />
            </div>
          </div>
        </div>
      )}

      {/* Full-width Table */}
      <div className="panel-content">
        <ContentTable
          onEdit={handleEdit}
          onDeleteSuccess={handleDeleteSuccess}
          onError={handleFormError}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
};

export default AdminContentPanel;
