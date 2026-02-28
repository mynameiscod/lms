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
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCancel = useCallback(() => {
    setEditingContent(null);
  }, []);

  return (
    <div className="admin-content-panel">
      <div className="panel-header">
        <h1>📚 Content Management</h1>
        <p className="header-subtitle">
          Create and manage announcements, notes, assignments, cheatsheets, and code snippets
        </p>
        {socket.isConnected && (
          <div className="connection-status online">
            <span className="status-dot"></span>
            Real-time updates enabled
          </div>
        )}
        {!socket.isConnected && (
          <div className="connection-status offline">
            <span className="status-dot"></span>
            Connecting...
          </div>
        )}
      </div>

      {/* Alert Section */}
      {alert && <Alert message={alert.message} type={alert.type} />}

      {/* Main Content Area */}
      <div className="panel-content">
        {/* Form Section */}
        <section className="form-section">
          <ContentForm
            onSuccess={handleFormSuccess}
            onError={handleFormError}
            onShowAlert={showAlert}
            editingContent={editingContent}
            onCancel={handleCancel}
          />
        </section>

        {/* Table Section */}
        <section className="table-section">
          <ContentTable
            onEdit={handleEdit}
            onDeleteSuccess={(message) => {
              showAlert(message, 'success');
              triggerTableRefresh();
            }}
            onError={handleFormError}
            refreshTrigger={refreshTrigger}
          />
        </section>
      </div>

      {/* Statistics */}
      <div className="panel-footer">
        <div className="stats">
          <div className="stat-item">
            <span className="stat-icon">📢</span>
            <div className="stat-info">
              <p className="stat-label">Announcements</p>
              <p className="stat-value">—</p>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">📝</span>
            <div className="stat-info">
              <p className="stat-label">Notes</p>
              <p className="stat-value">—</p>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">✓</span>
            <div className="stat-info">
              <p className="stat-label">Assignments</p>
              <p className="stat-value">—</p>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">⚡</span>
            <div className="stat-info">
              <p className="stat-label">Cheatsheets</p>
              <p className="stat-value">—</p>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">💻</span>
            <div className="stat-info">
              <p className="stat-label">Snippets</p>
              <p className="stat-value">—</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminContentPanel;
