import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './CertificatePage.css';

type ResultType = 'quiz' | 'assignment' | 'snippet';

interface CertData {
  type: ResultType;
  title: string;
  studentName: string;
  score: number;
  totalMarks?: number;
  totalPoints?: number;
  percentage: number;
  passed?: boolean;
  isPassing?: boolean;
  status?: string;
  submittedAt: string;
}

const typeLabel: Record<ResultType, string> = {
  quiz: 'Quiz',
  assignment: 'Assignment',
  snippet: 'Code Assessment',
};

const CertificatePage: React.FC = () => {
  const { type, token } = useParams<{ type: string; token: string }>();
  const [data, setData] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!type || !token) {
      setError('Invalid certificate link');
      setLoading(false);
      return;
    }
    const apiBase = process.env.REACT_APP_API_URL || '/api/v1';
    fetch(`${apiBase}/share/${type}/${token}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.message || 'Certificate not found');
        }
      })
      .catch(() => setError('Failed to load certificate'))
      .finally(() => setLoading(false));
  }, [type, token]);

  if (loading) {
    return (
      <div className="cert-page">
        <div className="cert-loading">Loading…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="cert-page">
        <div className="cert-error">
          <h2>Certificate Not Found</h2>
          <p>{error || 'This certificate link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  const isPassing = data.passed ?? data.isPassing ?? data.percentage >= 50;
  const total = data.totalMarks ?? data.totalPoints ?? 0;
  const submittedDate = new Date(data.submittedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleSharePost = () => {
    const certUrl = window.location.href;
    window.open(
      `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(certUrl)}&title=${encodeURIComponent(data.title + ' — ' + data.percentage + '%')}&summary=${encodeURIComponent(data.studentName + ' scored ' + data.percentage + '% on ' + data.title + ' — Codebegun LMS')}`,
      '_blank',
      'noopener,noreferrer,width=600,height=500'
    );
  };

  const handleAddToProfile = () => {
    const certUrl = window.location.href;
    const now = new Date(data.submittedAt);
    const name = encodeURIComponent(`${data.title} — ${data.percentage}%`);
    const url = [
      'https://www.linkedin.com/profile/add',
      '?startTask=CERTIFICATION_NAME',
      `&name=${name}`,
      `&certUrl=${encodeURIComponent(certUrl)}`,
      `&certId=${token}`,
      `&issueYear=${now.getFullYear()}`,
      `&issueMonth=${now.getMonth() + 1}`,
    ].join('');
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  return (
    <div className="cert-page">
      <div className="cert-card">
        {/* Header */}
        <div className="cert-header">
          <div className="cert-badge">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
          </div>
          <div className="cert-org">Certificate of Completion</div>
        </div>

        {/* Body */}
        <div className="cert-body">
          <p className="cert-presented-to">This certifies that</p>
          <h1 className="cert-student-name">{data.studentName}</h1>
          <p className="cert-has-completed">has successfully completed the {typeLabel[data.type as ResultType] || 'assessment'}</p>
          <h2 className="cert-title">"{data.title}"</h2>

          <div className="cert-score-row">
            <div className="cert-score-box">
              <span className="cert-score-num">{data.percentage}%</span>
              <span className="cert-score-label">Score</span>
            </div>
            {total > 0 && (
              <div className="cert-score-box">
                <span className="cert-score-num">{data.score} / {total}</span>
                <span className="cert-score-label">Marks</span>
              </div>
            )}
            <div className={`cert-score-box cert-status-box ${isPassing ? 'cert-passed' : 'cert-failed'}`}>
              <span className="cert-score-num">{isPassing ? '✓ Passed' : '✗ Not Passed'}</span>
              <span className="cert-score-label">Result</span>
            </div>
          </div>

          <p className="cert-date">Completed on {submittedDate}</p>
        </div>

        {/* LinkedIn actions */}
        <div className="cert-actions">
          <button className="cert-linkedin-btn cert-linkedin-btn--post" onClick={handleSharePost}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
            Share on LinkedIn
          </button>
          <button className="cert-linkedin-btn cert-linkedin-btn--profile" onClick={handleAddToProfile}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
            Add to LinkedIn Profile
          </button>
          <button className="cert-print-btn" onClick={() => window.print()}>
            🖨️ Print Certificate
          </button>
        </div>

        <div className="cert-footer">
          <p>Powered by Codebegun LMS</p>
        </div>
      </div>
    </div>
  );
};

export default CertificatePage;
