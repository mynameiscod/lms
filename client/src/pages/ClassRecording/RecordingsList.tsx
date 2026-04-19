import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { classRecordingApi, ClassRecording } from '../../api/classRecordingApi';
import { Spinner } from '../../components/common';
import './ClassRecording.css';

const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
  uploading: { label: 'Uploading', color: '#f59e0b', icon: 'fa-cloud-arrow-up' },
  uploaded: { label: 'Queued', color: '#6366f1', icon: 'fa-clock' },
  transcribing: { label: 'Transcribing', color: '#359aad', icon: 'fa-microphone' },
  summarizing: { label: 'Summarizing', color: '#8b5cf6', icon: 'fa-brain' },
  generating_quiz: { label: 'Generating Quiz', color: '#ec4899', icon: 'fa-clipboard-question' },
  generating_assignment: { label: 'Generating Assignment', color: '#f97316', icon: 'fa-file-code' },
  completed: { label: 'Completed', color: '#10b981', icon: 'fa-circle-check' },
  failed: { label: 'Failed', color: '#ef4444', icon: 'fa-circle-xmark' }
};

const RecordingsList: React.FC = () => {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<ClassRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchRecordings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await classRecordingApi.list({ page, limit: 12 });
      setRecordings(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load recordings:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchRecordings(); }, [fetchRecordings]);

  // Poll for processing status of non-completed recordings
  useEffect(() => {
    const processing = recordings.filter(r => !['completed', 'failed'].includes(r.status));
    if (processing.length === 0) return;

    const interval = setInterval(async () => {
      let changed = false;
      const updated = await Promise.all(
        recordings.map(async (r) => {
          if (['completed', 'failed'].includes(r.status)) return r;
          try {
            const res = await classRecordingApi.getStatus(r._id);
            if (res.data.status !== r.status || res.data.processingProgress !== r.processingProgress) {
              changed = true;
              return { ...r, ...res.data };
            }
          } catch {}
          return r;
        })
      );
      if (changed) setRecordings(updated as ClassRecording[]);
    }, 5000);

    return () => clearInterval(interval);
  }, [recordings]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this recording? This cannot be undone.')) return;
    try {
      await classRecordingApi.delete(id);
      setRecordings(prev => prev.filter(r => r._id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleTogglePublish = async (id: string) => {
    try {
      const res = await classRecordingApi.togglePublish(id);
      setRecordings(prev => prev.map(r => r._id === id ? { ...r, isPublished: res.data.isPublished } : r));
    } catch (err: any) {
      alert(err.message || 'Failed to update');
    }
  };

  const formatDuration = (s: number) => {
    if (!s) return '--';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '--';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="cr-page">
      <div className="cr-header">
        <div>
          <h1><i className="fa-solid fa-clapperboard"></i> Class Recordings</h1>
          <p>{total} recording{total !== 1 ? 's' : ''}</p>
        </div>
        <button className="cr-start-btn" onClick={() => navigate('/admin/class-recordings/start')}>
          <i className="fa-solid fa-circle-dot"></i> Start New Class
        </button>
      </div>

      {loading ? (
        <div className="cr-loading"><Spinner /></div>
      ) : recordings.length === 0 ? (
        <div className="cr-empty">
          <i className="fa-solid fa-video-slash"></i>
          <h3>No recordings yet</h3>
          <p>Start a class recording to capture your screen, generate transcripts, summaries, quizzes, and assignments automatically.</p>
          <button className="cr-start-btn" onClick={() => navigate('/admin/class-recordings/start')}>
            <i className="fa-solid fa-circle-dot"></i> Record First Class
          </button>
        </div>
      ) : (
        <>
          <div className="cr-grid">
            {recordings.map(rec => {
              const st = statusLabels[rec.status] || statusLabels.uploaded;
              return (
                <div key={rec._id} className="cr-card" onClick={() => navigate(`/admin/class-recordings/${rec._id}`)}>
                  {/* Thumbnail / status header */}
                  <div className="cr-card-thumb">
                    <div className="cr-card-overlay">
                      <i className="fa-solid fa-play"></i>
                    </div>
                    <span className="cr-card-duration">{formatDuration(rec.duration)}</span>
                    <span className="cr-card-status" style={{ background: st.color }}>
                      <i className={`fa-solid ${st.icon}`}></i> {st.label}
                    </span>
                  </div>

                  <div className="cr-card-body">
                    <h3 className="cr-card-title">{rec.title}</h3>
                    <p className="cr-card-meta">
                      {typeof rec.courseId === 'object' ? rec.courseId?.title : 'Course'}
                      {rec.subjectId && typeof rec.subjectId === 'object' ? ` • ${rec.subjectId.name}` : ''}
                    </p>
                    <div className="cr-card-footer">
                      <span className="cr-card-date">
                        <i className="fa-solid fa-calendar"></i> {new Date(rec.recordedAt).toLocaleDateString()}
                      </span>
                      <span className="cr-card-size">{formatSize(rec.fileSize)}</span>
                    </div>

                    {/* Progress bar for processing */}
                    {!['completed', 'failed'].includes(rec.status) && (
                      <div className="cr-card-progress">
                        <div className="cr-card-progress-bar" style={{ width: `${rec.processingProgress}%` }}></div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="cr-card-actions" onClick={e => e.stopPropagation()}>
                      {rec.status === 'completed' && (
                        <button
                          className={`cr-action-btn ${rec.isPublished ? 'cr-published' : ''}`}
                          onClick={() => handleTogglePublish(rec._id)}
                          title={rec.isPublished ? 'Unpublish' : 'Publish'}
                        >
                          <i className={`fa-solid ${rec.isPublished ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                        </button>
                      )}
                      {rec.status === 'failed' && (
                        <button className="cr-action-btn cr-retry" onClick={() => classRecordingApi.reprocess(rec._id).then(fetchRecordings)} title="Retry processing">
                          <i className="fa-solid fa-rotate-right"></i>
                        </button>
                      )}
                      <button className="cr-action-btn cr-delete" onClick={() => handleDelete(rec._id)} title="Delete">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="cr-pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RecordingsList;
