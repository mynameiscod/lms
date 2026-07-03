import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  assignmentApi, 
  Assignment, 
  AssignmentStatus, 
  AssignmentType, 
  DifficultyLevel 
} from '../../api/assignmentApi';
import { batchApi } from '../../api';
import AssignmentPreviewModal from '../AssignmentReports/AssignmentPreviewModal';
import './assignments.css';

const ActionsDropdown: React.FC<{
  assignment: Assignment;
  onEdit: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onViewSubmissions: () => void;
  onArchive: () => void;
  onClone: () => void;
  onDelete: () => void;
}> = ({ assignment, onEdit, onPreview, onPublish, onViewSubmissions, onArchive, onClone, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="actions-dropdown" ref={ref}>
      <button
        className="btn btn-icon btn-secondary"
        onClick={() => setOpen(!open)}
        title="Actions"
      >
        ⋮
      </button>
      {open && (
        <div className="actions-dropdown-menu">
          <button onClick={() => { onPreview(); setOpen(false); }}>👁️ Preview</button>
          <button onClick={() => { onEdit(); setOpen(false); }}>✏️ Edit</button>
          {assignment.status === AssignmentStatus.DRAFT && (
            <button onClick={() => { onPublish(); setOpen(false); }}>🚀 Publish</button>
          )}
          {assignment.status === AssignmentStatus.PUBLISHED && (
            <>
              <button onClick={() => { onViewSubmissions(); setOpen(false); }}>👥 View Submissions</button>
              <button onClick={() => { onArchive(); setOpen(false); }}>📦 Archive</button>
            </>
          )}
          <button onClick={() => { onClone(); setOpen(false); }}>📋 Clone</button>
          <button className="danger" onClick={() => { onDelete(); setOpen(false); }}>🗑️ Delete</button>
        </div>
      )}
    </div>
  );
};

const AdminAssignmentList: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{ success: any[]; failed: any[] } | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);

  // Preview modal
  const [previewId, setPreviewId] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await assignmentApi.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter as AssignmentStatus || undefined,
        type: typeFilter as AssignmentType || undefined,
        difficulty: difficultyFilter as DifficultyLevel || undefined,
        batch: batchFilter || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      setAssignments(response.data.data);
      setTotalPages(response.data.pagination.pages);
      setTotal(response.data.pagination.total);
    } catch (err) {
      setError('Failed to load assignments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter, difficultyFilter, batchFilter]);

  // Load batches for the batch filter
  useEffect(() => {
    (async () => {
      try {
        const res: any = await batchApi.getBatches();
        setBatches(res.batches || res.data || res || []);
      } catch { /* non-fatal */ }
    })();
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handlePublish = async (id: string) => {
    try {
      await assignmentApi.publish(id);
      loadAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to publish');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await assignmentApi.archive(id);
      loadAssignments();
    } catch (err) {
      setError('Failed to archive assignment');
    }
  };

  const handleClone = async (id: string) => {
    try {
      await assignmentApi.clone(id);
      loadAssignments();
    } catch (err) {
      setError('Failed to clone assignment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await assignmentApi.delete(id);
      loadAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  // Template download handler
  const handleDownloadTemplate = async (type: 'coding' | 'mcq' | 'general') => {
    try {
      await assignmentApi.downloadTemplate(type);
      setSuccessMessage(`Template downloaded successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to download template');
    }
  };

  // CSV parsing helper
  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim() || '';
      });
      data.push(obj);
    }
    return data;
  };

  // Parse CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setImportData(parsed);
      setShowImportModal(true);
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle import
  const handleImport = async () => {
    if (importData.length === 0) return;
    
    setImporting(true);
    try {
      const response = await assignmentApi.importFromCSV(importData);
      setImportResult(response.data.data);
      setSuccessMessage(`Successfully imported ${response.data.data.success.length} assignments`);
      loadAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import assignments');
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: AssignmentStatus) => {
    return <span className={`badge badge-${status}`}>{status}</span>;
  };

  const getTypeBadge = (type: AssignmentType) => {
    return <span className={`badge badge-${type}`}>{type.replace('_', ' ')}</span>;
  };

  const getDifficultyBadge = (difficulty: DifficultyLevel) => {
    return <span className={`badge badge-${difficulty}`}>{difficulty}</span>;
  };

  return (
    <div className="assignment-page">
      {/* Hidden file input for CSV upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success" style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          zIndex: 1000,
          padding: '12px 20px',
          borderRadius: '8px',
          backgroundColor: '#dcfce7',
          color: '#166534',
          border: '1px solid #22c55e',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>📋 Assignments</h1>
          <p>Create and manage assignments for your students</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Template Download Dropdown */}
          <div className="dropdown" style={{ position: 'relative' }}>
            <button 
              className="btn btn-outline"
              onClick={() => {
                const dropdown = document.getElementById('template-dropdown');
                if (dropdown) dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
              }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                padding: '10px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <span>📥</span> Download Template
            </button>
            <div 
              id="template-dropdown"
              style={{ 
                display: 'none',
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100,
                minWidth: '180px'
              }}
            >
              <button 
                onClick={() => { handleDownloadTemplate('coding'); document.getElementById('template-dropdown')!.style.display = 'none'; }}
                style={{ 
                  display: 'block', 
                  width: '100%', 
                  padding: '12px 16px', 
                  border: 'none', 
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                💻 Coding Template
              </button>
              <button 
                onClick={() => { handleDownloadTemplate('mcq'); document.getElementById('template-dropdown')!.style.display = 'none'; }}
                style={{ 
                  display: 'block', 
                  width: '100%', 
                  padding: '12px 16px', 
                  border: 'none', 
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                📝 MCQ Template
              </button>
              <button 
                onClick={() => { handleDownloadTemplate('general'); document.getElementById('template-dropdown')!.style.display = 'none'; }}
                style={{ 
                  display: 'block', 
                  width: '100%', 
                  padding: '12px 16px', 
                  border: 'none', 
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                📄 General Template
              </button>
            </div>
          </div>
          
          {/* Import Button */}
          <button 
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '10px 16px',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#3b82f6',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <span>📤</span> Import CSV
          </button>

          {/* Reports Button */}
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/admin/assignments/reports')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '10px 16px',
              border: '1px solid #10b981',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              color: '#10b981',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <span>📊</span> Reports
          </button>
          
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/admin/assignments/create')}
          >
            <i className="bi bi-plus-lg"></i>
            Create Assignment
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>📤 Import Assignments</h3>
              <button 
                onClick={() => { setShowImportModal(false); setImportData([]); setImportResult(null); }}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            
            {!importResult ? (
              <>
                <p style={{ color: '#64748b', marginBottom: '16px' }}>
                  Found <strong>{importData.length}</strong> assignments in the CSV file.
                </p>
                
                {/* Preview table */}
                <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Title</th>
                        <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Difficulty</th>
                        <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 10).map((item, index) => (
                        <tr key={index}>
                          <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{item.title}</td>
                          <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{item.type}</td>
                          <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{item.difficulty}</td>
                          <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{item.totalPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importData.length > 10 && (
                    <p style={{ color: '#64748b', fontSize: '13px', marginTop: '8px' }}>
                      ... and {importData.length - 10} more
                    </p>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setShowImportModal(false); setImportData([]); }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      cursor: importing ? 'not-allowed' : 'pointer',
                      opacity: importing ? 0.7 : 1
                    }}
                  >
                    {importing ? 'Importing...' : `Import ${importData.length} Assignments`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#dcfce7', 
                    borderRadius: '8px',
                    marginBottom: '12px'
                  }}>
                    ✅ Successfully imported: <strong>{importResult.success.length}</strong>
                  </div>
                  {importResult.failed.length > 0 && (
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#fef2f2', 
                      borderRadius: '8px'
                    }}>
                      ❌ Failed: <strong>{importResult.failed.length}</strong>
                      <ul style={{ margin: '8px 0 0 20px', fontSize: '13px' }}>
                        {importResult.failed.map((item, i) => (
                          <li key={i}>{item.title}: {item.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => { setShowImportModal(false); setImportData([]); setImportResult(null); }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Assignments</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Published</div>
          <div className="stat-value">
            {assignments.filter(a => a.status === AssignmentStatus.PUBLISHED).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Draft</div>
          <div className="stat-value">
            {assignments.filter(a => a.status === AssignmentStatus.DRAFT).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Coding Challenges</div>
          <div className="stat-value">
            {assignments.filter(a => a.type === AssignmentType.CODING).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search assignments..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Type:</label>
          <select 
            value={typeFilter} 
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          >
            <option value="">All</option>
            <option value="coding">Coding</option>
            <option value="mcq">MCQ</option>
            <option value="theory">Theory</option>
            <option value="project">Project</option>
            <option value="file_upload">File Upload</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Difficulty:</label>
          <select
            value={difficultyFilter}
            onChange={(e) => { setDifficultyFilter(e.target.value); setPage(1); }}
          >
            <option value="">All</option>
            <option value="beginner">Beginner</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Batch:</label>
          <select
            value={batchFilter}
            onChange={(e) => { setBatchFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Batches</option>
            {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <i className="bi bi-exclamation-triangle"></i>
          {error}
          <button 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3>No Assignments Found</h3>
          <p>Create your first assignment to get started!</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/admin/assignments/create')}
          >
            <i className="bi bi-plus-lg"></i>
            Create Assignment
          </button>
        </div>
      ) : (
        <div className="form-section">
          <table className="assignments-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th>Points</th>
                <th>Due Date</th>
                <th>Submissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment._id}>
                  <td className="title-cell">
                    <div style={{ fontWeight: 500 }}>{assignment.title}</div>
                    {assignment.topics.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {assignment.topics.slice(0, 3).join(', ')}
                        {assignment.topics.length > 3 && ` +${assignment.topics.length - 3} more`}
                      </div>
                    )}
                  </td>
                  <td>{getTypeBadge(assignment.type)}</td>
                  <td>{getDifficultyBadge(assignment.difficulty)}</td>
                  <td>{getStatusBadge(assignment.status)}</td>
                  <td>{assignment.totalPoints}</td>
                  <td>{formatDate(assignment.dueDate)}</td>
                  <td>
                    <span 
                      className="tooltip" 
                      data-tooltip={`${assignment.stats.completedSubmissions} graded`}
                    >
                      {assignment.stats.totalSubmissions}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <ActionsDropdown
                      assignment={assignment}
                      onEdit={() => navigate(`/admin/assignments/${assignment._id}/edit`)}
                      onPreview={() => setPreviewId(assignment._id)}
                      onPublish={() => handlePublish(assignment._id)}
                      onViewSubmissions={() => navigate(`/admin/assignments/${assignment._id}/submissions`)}
                      onArchive={() => handleArchive(assignment._id)}
                      onClone={() => handleClone(assignment._id)}
                      onDelete={() => handleDelete(assignment._id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ 
              padding: '16px 20px', 
              display: 'flex', 
              justifyContent: 'center',
              gap: '8px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span style={{ padding: '6px 12px', color: '#6b7280' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {previewId && <AssignmentPreviewModal assignmentId={previewId} onClose={() => setPreviewId(null)} />}
    </div>
  );
};

export default AdminAssignmentList;
