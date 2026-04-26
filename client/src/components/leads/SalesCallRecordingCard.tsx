import React, { useEffect, useState, useRef, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '/api/v1';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};

interface Scores {
  opening: number; needsDiscovery: number; productKnowledge: number;
  objectionHandling: number; closingAttempt: number; professionalism: number;
}

interface Analysis {
  transcript: string; summary: string; qualityScore: number;
  scores: Scores; keyMoments: string[]; improvements: string[];
  competitorsMentioned: string[]; sentimentOverall: string;
  leadInterestLevel: string; callDurationSeconds: number;
  wordsPerMinute: number; processedAt: string;
}

interface Recording {
  _id: string; fileName: string; fileSize: number; mimeType: string;
  durationSeconds?: number; status: 'uploaded' | 'processing' | 'processed' | 'failed';
  processingProgress: number; analysis?: Analysis;
  errorMessage?: string; notes?: string;
  recordedBy?: { name?: string; firstName?: string; lastName?: string; email?: string };
  createdAt: string;
}

interface Props {
  leadId: string;
}

function formatDuration(secs?: number) {
  if (!secs) return '--';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const SCORE_LABELS: Record<keyof Scores, string> = {
  opening: 'Opening', needsDiscovery: 'Needs Discovery',
  productKnowledge: 'Product Knowledge', objectionHandling: 'Objection Handling',
  closingAttempt: 'Closing', professionalism: 'Professionalism',
};

const statusBadge = (status: string, progress: number) => {
  switch (status) {
    case 'processing': return <span className="badge bg-warning text-dark"><i className="fas fa-spinner fa-spin me-1" />Processing {progress}%</span>;
    case 'processed': return <span className="badge bg-success"><i className="fas fa-check me-1" />Analysed</span>;
    case 'failed': return <span className="badge bg-danger"><i className="fas fa-times me-1" />Failed</span>;
    default: return <span className="badge bg-secondary"><i className="fas fa-clock me-1" />Uploaded</span>;
  }
};

export default function SalesCallRecordingCard({ leadId }: Props) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/sales-call-recordings?leadId=${leadId}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setRecordings(data.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [leadId]);

  useEffect(() => {
    load();
    // Poll every 8s if any recording is processing
    pollRef.current = setInterval(() => {
      setRecordings((prev) => {
        if (prev.some((r) => r.status === 'processing' || r.status === 'uploaded')) {
          load();
        }
        return prev;
      });
    }, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size guard (100 MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('File is too large (max 100 MB). Please compress or trim the recording.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setUploading(true); setError('');
    try {
      const form = new FormData();
      form.append('audio', file);
      form.append('leadId', leadId);
      const res = await fetch(`${API_BASE}/sales-call-recordings`, {
        method: 'POST',
        headers: getHeaders(),
        body: form,
      });

      if (!res.ok) {
        if (res.status === 413) {
          setError('File is too large for the server. Ask your admin to increase nginx client_max_body_size.');
        } else {
          let msg = `Upload failed (HTTP ${res.status})`;
          try { const d = await res.json(); msg = d.message || msg; } catch { /* html error page */ }
          setError(msg);
        }
        return;
      }

      const data = await res.json();
      if (data.success) { await load(); }
      else setError(data.message || 'Upload failed');
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const reanalyze = async (id: string) => {
    try {
      await fetch(`${API_BASE}/sales-call-recordings/${id}/reanalyze`, { method: 'POST', headers: getHeaders() });
      await load();
    } catch { /* silent */ }
  };

  const deleteRec = async (id: string) => {
    if (!window.confirm('Delete this recording?')) return;
    await fetch(`${API_BASE}/sales-call-recordings/${id}`, { method: 'DELETE', headers: getHeaders() });
    setRecordings((prev) => prev.filter((r) => r._id !== id));
    if (expanded === id) setExpanded(null);
  };

  const scoreColor = (v: number) => v >= 70 ? 'success' : v >= 45 ? 'warning' : 'danger';

  return (
    <div className="card mb-3">
      <div className="card-header d-flex align-items-center justify-content-between">
        <strong><i className="fas fa-phone-alt me-2 text-primary" />Sales Call Recordings</strong>
        <div>
          <input ref={fileRef} type="file" accept="audio/*,video/*" style={{ display: 'none' }} onChange={upload} />
          <button className="btn btn-sm btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <><span className="spinner-border spinner-border-sm me-1" />Uploading…</> : <><i className="fas fa-upload me-1" />Upload Recording</>}
          </button>
        </div>
      </div>
      <div className="card-body p-0">
        {error && <div className="alert alert-danger m-3 mb-0">{error}</div>}
        {loading ? (
          <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
        ) : recordings.length === 0 ? (
          <div className="text-center text-muted py-4">
            <i className="fas fa-microphone-slash fa-2x mb-2 opacity-25" />
            <p className="mb-0">No recordings yet. Upload a call recording for AI analysis.</p>
          </div>
        ) : (
          <div>
            {recordings.map((rec) => (
              <div key={rec._id} className="border-bottom">
                <div
                  className="d-flex align-items-center justify-content-between px-3 py-2 cursor-pointer"
                  onClick={() => setExpanded(expanded === rec._id ? null : rec._id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <i className={`fas fa-chevron-${expanded === rec._id ? 'down' : 'right'} text-muted`} />
                    <div>
                      <div className="fw-semibold small">{rec.fileName}</div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                        {formatDuration(rec.durationSeconds)} • {formatBytes(rec.fileSize)} • {new Date(rec.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {rec.analysis && <span className={`badge bg-${scoreColor(rec.analysis.qualityScore)}`}>{rec.analysis.qualityScore}/100</span>}
                    {statusBadge(rec.status, rec.processingProgress)}
                    {rec.status === 'failed' && (
                      <button className="btn btn-xs btn-outline-warning" style={{ padding: '2px 6px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); reanalyze(rec._id); }}>
                        <i className="fas fa-redo" />
                      </button>
                    )}
                    <button className="btn btn-xs btn-outline-danger" style={{ padding: '2px 6px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); deleteRec(rec._id); }}>
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>

                {expanded === rec._id && rec.analysis && (
                  <div className="px-3 pb-3 bg-light">
                    {/* Summary */}
                    <div className="mb-3">
                      <div className="fw-semibold small mb-1"><i className="fas fa-brain me-1" />AI Summary</div>
                      <p className="small mb-0 text-muted">{rec.analysis.summary}</p>
                    </div>

                    {/* Quality Score Breakdown */}
                    <div className="mb-3">
                      <div className="fw-semibold small mb-2">Quality Score Breakdown</div>
                      <div className="row g-2">
                        {(Object.keys(SCORE_LABELS) as (keyof Scores)[]).map((k) => (
                          <div className="col-6 col-md-4" key={k}>
                            <div className="d-flex justify-content-between mb-1">
                              <span style={{ fontSize: '0.75rem' }}>{SCORE_LABELS[k]}</span>
                              <span style={{ fontSize: '0.75rem' }} className={`text-${scoreColor(rec.analysis!.scores[k])}`}>{rec.analysis!.scores[k]}</span>
                            </div>
                            <div className="progress" style={{ height: 5 }}>
                              <div className={`progress-bar bg-${scoreColor(rec.analysis!.scores[k])}`} style={{ width: `${rec.analysis!.scores[k]}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key Moments */}
                    {rec.analysis.keyMoments?.length > 0 && (
                      <div className="mb-3">
                        <div className="fw-semibold small mb-1"><i className="fas fa-star me-1 text-warning" />Key Moments</div>
                        <ul className="small text-muted mb-0" style={{ paddingLeft: 16 }}>
                          {rec.analysis.keyMoments.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Coaching Tips */}
                    {rec.analysis.improvements?.length > 0 && (
                      <div className="mb-3">
                        <div className="fw-semibold small mb-1"><i className="fas fa-lightbulb me-1 text-info" />Coaching Tips</div>
                        <ul className="small text-muted mb-0" style={{ paddingLeft: 16 }}>
                          {rec.analysis.improvements.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="d-flex gap-3 flex-wrap">
                      <span className="badge bg-light text-dark border">Lead Interest: {rec.analysis.leadInterestLevel}</span>
                      <span className={`badge bg-${rec.analysis.sentimentOverall === 'positive' ? 'success' : rec.analysis.sentimentOverall === 'negative' ? 'danger' : 'secondary'}`}>Sentiment: {rec.analysis.sentimentOverall}</span>
                      {rec.analysis.wordsPerMinute > 0 && <span className="badge bg-light text-dark border">{rec.analysis.wordsPerMinute} WPM</span>}
                    </div>
                  </div>
                )}

                {expanded === rec._id && rec.status === 'failed' && (
                  <div className="px-3 pb-3 bg-light">
                    <div className="alert alert-danger py-2 mb-0 small"><i className="fas fa-exclamation-triangle me-2" />{rec.errorMessage || 'Processing failed'}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
