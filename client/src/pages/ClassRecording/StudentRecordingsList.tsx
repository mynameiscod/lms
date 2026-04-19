import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { classRecordingApi, ClassRecording } from '../../api/classRecordingApi';
import { Spinner } from '../../components/common';
import './ClassRecording.css';

const StudentRecordingsList: React.FC = () => {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<ClassRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchRecordings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await classRecordingApi.listForStudents({ page, limit: 12 });
      setRecordings(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load recordings:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchRecordings(); }, [fetchRecordings]);

  const formatDuration = (s: number) => {
    if (!s) return '--';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="cr-page">
      <div className="cr-header">
        <div>
          <h1><i className="fa-solid fa-play-circle"></i> Class Recordings</h1>
          <p>Watch recorded classes and read AI-generated summaries</p>
        </div>
      </div>

      {loading ? (
        <div className="cr-loading"><Spinner /></div>
      ) : recordings.length === 0 ? (
        <div className="cr-empty">
          <i className="fa-solid fa-video-slash"></i>
          <h3>No recordings available</h3>
          <p>Your instructor hasn't published any class recordings yet.</p>
        </div>
      ) : (
        <>
          <div className="cr-grid">
            {recordings.map(rec => (
              <div key={rec._id} className="cr-card" onClick={() => navigate(`/class-recordings/${rec._id}`)}>
                <div className="cr-card-thumb cr-card-thumb-student">
                  <div className="cr-card-overlay"><i className="fa-solid fa-play"></i></div>
                  <span className="cr-card-duration">{formatDuration(rec.duration)}</span>
                </div>
                <div className="cr-card-body">
                  <h3 className="cr-card-title">{rec.title}</h3>
                  <p className="cr-card-meta">
                    {typeof rec.courseId === 'object' ? rec.courseId?.title : ''}
                    {rec.subjectId && typeof rec.subjectId === 'object' ? ` • ${rec.subjectId.name}` : ''}
                  </p>
                  {rec.summary?.overview && (
                    <p className="cr-card-summary">{rec.summary.overview.substring(0, 100)}...</p>
                  )}
                  <div className="cr-card-footer">
                    <span className="cr-card-date">
                      <i className="fa-solid fa-calendar"></i> {new Date(rec.recordedAt).toLocaleDateString()}
                    </span>
                    <span className="cr-card-views">
                      <i className="fa-solid fa-eye"></i> {rec.viewCount || 0} views
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

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

export default StudentRecordingsList;
