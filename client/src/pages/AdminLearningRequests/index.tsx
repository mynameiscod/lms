import React, { useState, useEffect, useCallback } from 'react';
import { learningRequestApi, LearningRequest, LearningRequestStatus, LearningRequestType } from '../../api/learningRequestApi';
import './AdminLearningRequests.css';

const TYPE_ICONS: Record<string, string> = {
  notes: '📝',
  interview_qs: '❓',
  practice: '🏋️',
  '1on1': '🎓',
  clarification: '💬'
};
const TYPE_LABELS: Record<string, string> = {
  notes: 'More Notes',
  interview_qs: 'Interview Questions',
  practice: 'Practice Problems',
  '1on1': '1-on-1 Session',
  clarification: 'Clarification'
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  fulfilled: 'Fulfilled',
  scheduled: 'Scheduled'
};

interface Stats {
  byStatus: { pending: number; in_progress: number; fulfilled: number; scheduled: number };
  byType: { _id: string; count: number }[];
}

const AdminLearningRequests: React.FC = () => {
  const [requests, setRequests] = useState<LearningRequest[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType]     = useState('');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalCount, setTotalCount]     = useState(0);

  const [selected, setSelected]   = useState<LearningRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [newStatus, setNewStatus] = useState<LearningRequestStatus>('in_progress');
  const [saving, setSaving]       = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadStats = useCallback(async () => {
    try {
      const res = await learningRequestApi.getStats();
      setStats(res.data);
    } catch (e) { /* silent */ }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await learningRequestApi.list({
        status: filterStatus || undefined,
        type:   filterType   || undefined,
        page,
        limit: 20
      });
      setRequests(res.data || []);
      setTotalPages(res.pagination?.pages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, page]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [filterStatus, filterType]);
  useEffect(() => { loadRequests(); }, [loadRequests]);

  const openDetail = (req: LearningRequest) => {
    setSelected(req);
    setAdminNote(req.adminNote || '');
    setNewStatus(req.status);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await learningRequestApi.update(selected._id, {
        status: newStatus,
        adminNote: adminNote.trim() || undefined
      });
      setSuccessMsg('Updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowModal(false);
      loadRequests();
      loadStats();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (id: string, status: LearningRequestStatus) => {
    try {
      await learningRequestApi.update(id, { status });
      loadRequests();
      loadStats();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const getStudentName = (req: LearningRequest) => {
    if (typeof req.studentId === 'object') {
      return `${req.studentId.firstName} ${req.studentId.lastName}`.trim() || req.studentId.email;
    }
    return 'Student';
  };

  const getTopicName = (req: LearningRequest) => {
    if (req.topicTitle) return req.topicTitle;
    if (typeof req.topicId === 'object') return req.topicId.title;
    return '—';
  };

  const getSubjectName = (req: LearningRequest) => {
    if (req.subjectName) return req.subjectName;
    if (typeof req.subjectId === 'object') return req.subjectId.name;
    return '';
  };

  return (
    <div className="alr-page">
      {/* Header */}
      <div className="alr-header">
        <div>
          <h1 className="alr-title">🙋 Learning Requests</h1>
          <p className="alr-subtitle">Student help requests from the Topic Hub</p>
        </div>
      </div>

      {successMsg && <div className="alr-alert alr-alert-success">{successMsg}</div>}
      {error      && <div className="alr-alert alr-alert-error">{error}</div>}

      {/* Stats */}
      {stats && (
        <div className="alr-stats-row">
          <button className={`alr-stat-card ${filterStatus === '' ? 'alr-stat-active' : ''}`} onClick={() => setFilterStatus('')}>
            <span className="alr-stat-num">{totalCount}</span>
            <span className="alr-stat-label">All Requests</span>
          </button>
          <button className={`alr-stat-card alr-stat-pending ${filterStatus === 'pending' ? 'alr-stat-active' : ''}`} onClick={() => setFilterStatus('pending')}>
            <span className="alr-stat-num">{stats.byStatus.pending}</span>
            <span className="alr-stat-label">⏳ Pending</span>
          </button>
          <button className={`alr-stat-card alr-stat-inprogress ${filterStatus === 'in_progress' ? 'alr-stat-active' : ''}`} onClick={() => setFilterStatus('in_progress')}>
            <span className="alr-stat-num">{stats.byStatus.in_progress}</span>
            <span className="alr-stat-label">🔵 In Progress</span>
          </button>
          <button className={`alr-stat-card alr-stat-scheduled ${filterStatus === 'scheduled' ? 'alr-stat-active' : ''}`} onClick={() => setFilterStatus('scheduled')}>
            <span className="alr-stat-num">{stats.byStatus.scheduled}</span>
            <span className="alr-stat-label">📅 Scheduled</span>
          </button>
          <button className={`alr-stat-card alr-stat-fulfilled ${filterStatus === 'fulfilled' ? 'alr-stat-active' : ''}`} onClick={() => setFilterStatus('fulfilled')}>
            <span className="alr-stat-num">{stats.byStatus.fulfilled}</span>
            <span className="alr-stat-label">✅ Fulfilled</span>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="alr-filters">
        <select className="alr-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{TYPE_ICONS[v]} {l}</option>
          ))}
        </select>
        <select className="alr-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <span className="alr-count-txt">
          {totalCount} request{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="alr-loading"><div className="alr-spinner" /></div>
      ) : requests.length === 0 ? (
        <div className="alr-empty">
          <div className="alr-empty-icon">📭</div>
          <p>No requests found</p>
        </div>
      ) : (
        <>
          <div className="alr-table-wrap">
            <table className="alr-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Type</th>
                  <th>Topic</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req._id} className={`alr-row alr-row-${req.status}`}>
                    <td className="alr-td-student">
                      <div className="alr-student-info">
                        <span className="alr-avatar">{getStudentName(req).charAt(0).toUpperCase()}</span>
                        <div>
                          <div className="alr-student-name">{getStudentName(req)}</div>
                          {typeof req.studentId === 'object' && (
                            <div className="alr-student-email">{req.studentId.email}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`alr-type-badge alr-type-${req.type}`}>
                        {TYPE_ICONS[req.type]} {TYPE_LABELS[req.type]}
                      </span>
                    </td>
                    <td>
                      <div className="alr-topic-cell">
                        <div className="alr-topic-name">{getTopicName(req)}</div>
                        {getSubjectName(req) && (
                          <div className="alr-topic-sub">{getSubjectName(req)}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="alr-message-preview" title={req.message}>
                        {req.message.length > 80 ? req.message.slice(0, 80) + '…' : req.message}
                      </div>
                    </td>
                    <td>
                      <span className={`alr-status-badge alr-status-${req.status}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                    </td>
                    <td className="alr-td-date">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="alr-actions">
                        <button className="alr-btn alr-btn-view" onClick={() => openDetail(req)} title="View/Edit">
                          ✏️
                        </button>
                        {req.status === 'pending' && (
                          <button className="alr-btn alr-btn-progress" onClick={() => handleQuickStatus(req._id, 'in_progress')} title="Mark In Progress">
                            🔵
                          </button>
                        )}
                        {(req.status === 'pending' || req.status === 'in_progress') && (
                          <button className="alr-btn alr-btn-fulfill" onClick={() => handleQuickStatus(req._id, 'fulfilled')} title="Mark Fulfilled">
                            ✅
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="alr-pagination">
              <button className="alr-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="alr-page-info">Page {page} of {totalPages}</span>
              <button className="alr-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {showModal && selected && (
        <div className="alr-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="alr-modal" onClick={e => e.stopPropagation()}>
            <div className="alr-modal-header">
              <div>
                <h2>{TYPE_ICONS[selected.type]} {TYPE_LABELS[selected.type]} Request</h2>
                <p className="alr-modal-meta">from <strong>{getStudentName(selected)}</strong> • {new Date(selected.createdAt).toLocaleString()}</p>
              </div>
              <button className="alr-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="alr-modal-body">
              {/* Topic info */}
              <div className="alr-detail-info">
                <div className="alr-detail-row">
                  <span className="alr-detail-label">Topic</span>
                  <span className="alr-detail-val">{getTopicName(selected)}</span>
                </div>
                {getSubjectName(selected) && (
                  <div className="alr-detail-row">
                    <span className="alr-detail-label">Subject</span>
                    <span className="alr-detail-val">{getSubjectName(selected)}</span>
                  </div>
                )}
              </div>

              {/* Student message */}
              <div className="alr-detail-section">
                <h3>Student's Message</h3>
                <p className="alr-detail-message">{selected.message}</p>
              </div>

              {/* Update form */}
              <div className="alr-detail-section">
                <h3>Update Status</h3>
                <div className="alr-status-btns">
                  {(Object.entries(STATUS_LABELS) as [LearningRequestStatus, string][]).map(([v, l]) => (
                    <button
                      key={v}
                      className={`alr-modal-status-btn alr-mstatus-${v} ${newStatus === v ? 'alr-mstatus-active' : ''}`}
                      onClick={() => setNewStatus(v)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="alr-detail-section">
                <h3>Instructor Note <span className="alr-optional">(optional)</span></h3>
                <textarea
                  className="alr-note-textarea"
                  placeholder="Add a note for the student (e.g. 'Added extra notes to the chapter', 'Session scheduled for Friday 3pm')…"
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <div className="alr-modal-footer">
              <button className="alr-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="alr-btn-save" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Saving…' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLearningRequests;
