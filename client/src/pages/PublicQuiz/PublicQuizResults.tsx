import React, { useEffect, useState } from 'react';
import { publicQuizApi } from '../../api';

interface Props {
  submissionId: string;
  primaryColor: string;
  backToHomeUrl?: string;
}

const PublicQuizResults: React.FC<Props> = ({ submissionId, primaryColor, backToHomeUrl }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    publicQuizApi.getResults(submissionId).then(res => {
      if (res.message) { setError(res.message); setLoading(false); return; }
      setData(res);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, [submissionId]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (loading) return (
    <div className="pq-results-loading">
      <div className="pq-public-spinner"></div>
      <p>Loading your results...</p>
    </div>
  );

  if (error) return (
    <div className="pq-public-error"><h3>Error</h3><p>{error}</p></div>
  );

  const { submission, resultSettings, shareUrls, answers } = data || {};
  const passed = submission?.passed;
  // Certificate URL is built from shareToken (the endpoint serves HTML directly)
  const certificateUrl = submission?.shareToken
    ? publicQuizApi.getCertificateUrl(submission.shareToken)
    : null;

  return (
    <div className="pq-results-page">
      <div className="pq-results-card">
        {/* Result header */}
        <div className="pq-results-hero" style={{ background: passed ? '#10b981' : '#ef4444' }}>
          <div className="pq-results-icon">{passed ? '🎉' : '📚'}</div>
          <h2>{passed ? 'Congratulations!' : 'Keep Practising!'}</h2>
          <p>{passed ? "You've passed the quiz!" : "You didn't pass this time, but keep going!"}</p>
        </div>

        {/* Score */}
        {resultSettings?.showScore !== false && submission && (
          <div className="pq-results-score-section">
            <div className="pq-score-ring" style={{ '--ring-color': primaryColor } as any}>
              <div className="pq-score-ring-inner">
                <div className="pq-score-pct">{Math.round(submission.percentage)}%</div>
                <div className="pq-score-sub">Score</div>
              </div>
            </div>
            <div className="pq-score-detail">
              <div><strong>{submission.score}</strong> out of <strong>{submission.totalMarks}</strong> marks</div>
              {passed != null && (
                <div className={`pq-result-badge ${passed ? 'pass' : 'fail'}`}>{passed ? 'PASSED ✅' : 'FAILED ❌'}</div>
              )}
            </div>
          </div>
        )}

        {/* Certificate */}
        {resultSettings?.showCertificate && certificateUrl && (
          <div className="pq-results-section">
            <h5>🏆 Your Certificate</h5>
            <p className="text-muted">Download and share your certificate of achievement</p>
            <a href={certificateUrl} target="_blank" rel="noreferrer" className="btn pq-cert-btn" style={{ background: primaryColor }}>
              ⬇️ Download Certificate
            </a>
          </div>
        )}

        {/* Thank you message */}
        {resultSettings?.showThankYouMessage && resultSettings.thankYouMessage && (
          <div className="pq-results-section pq-thankyou-section">
            <div className="pq-thankyou-text">{resultSettings.thankYouMessage}</div>
          </div>
        )}

        {/* Social share */}
        {shareUrls && (
          <div className="pq-results-section">
            <h5>📣 Share Your Result</h5>
            <div className="pq-share-buttons">
              <a href={shareUrls.twitter} target="_blank" rel="noreferrer" className="btn pq-share-btn pq-share-twitter">
                🐦 Share on X
              </a>
              <a href={shareUrls.linkedin} target="_blank" rel="noreferrer" className="btn pq-share-btn pq-share-linkedin">
                💼 LinkedIn
              </a>
              <a href={shareUrls.whatsapp} target="_blank" rel="noreferrer" className="btn pq-share-btn pq-share-whatsapp">
                💬 WhatsApp
              </a>
              {shareUrls.instagramCaption && (
                <button
                  className="btn pq-share-btn pq-share-instagram"
                  onClick={() => copy(shareUrls.instagramCaption)}
                >
                  {copied ? '✅ Copied!' : '📸 Copy for Instagram'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Answers review */}
        {resultSettings?.showAnswers && answers?.length > 0 && (
          <div className="pq-results-section">
            <h5>📋 Answer Review</h5>
            <div className="pq-answers-list">
              {answers.map((a: any, i: number) => (
                <div key={i} className={`pq-answer-row ${a.isCorrect ? 'correct' : 'wrong'}`}>
                  <div className="pq-answer-q">
                    <span className="pq-answer-num">Q{i + 1}</span>
                    <span dangerouslySetInnerHTML={{ __html: a.questionText }} />
                  </div>
                  <div className="pq-answer-detail">
                    <div>Your answer: <strong>{a.selectedAnswer || '(not answered)'}</strong></div>
                    {!a.isCorrect && a.correctAnswer && (
                      <div className="pq-correct-ans">Correct: <strong>{a.correctAnswer}</strong></div>
                    )}
                    {a.explanation && (
                      <div className="pq-explanation text-muted small mt-1">💡 {a.explanation}</div>
                    )}
                  </div>
                  <div className="pq-answer-icon">{a.isCorrect ? '✅' : '❌'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back home */}
        {backToHomeUrl && (
          <div className="text-center pq-results-section">
            <a href={backToHomeUrl} className="btn btn-outline-secondary">← Back to Home</a>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicQuizResults;

  return (
    <div className="pq-results-page">
      <div className="pq-results-card">
        {/* Result header */}
        <div className="pq-results-hero" style={{ background: passed ? '#10b981' : '#ef4444' }}>
          <div className="pq-results-icon">{passed ? '🎉' : '📚'}</div>
          <h2>{passed ? 'Congratulations!' : 'Keep Practising!'}</h2>
          <p>{passed ? "You've passed the quiz!" : "You didn't pass this time, but keep going!"}</p>
        </div>

        {/* Score */}
        {resultSettings?.showScore !== false && submission && (
          <div className="pq-results-score-section">
            <div className="pq-score-ring" style={{ '--ring-color': primaryColor } as any}>
              <div className="pq-score-ring-inner">
                <div className="pq-score-pct">{Math.round(submission.percentage)}%</div>
                <div className="pq-score-sub">Score</div>
              </div>
            </div>
            <div className="pq-score-detail">
              <div><strong>{submission.score}</strong> out of <strong>{submission.totalMarks}</strong> marks</div>
              {passed != null && (
                <div className={`pq-result-badge ${passed ? 'pass' : 'fail'}`}>{passed ? 'PASSED ✅' : 'FAILED ❌'}</div>
              )}
            </div>
          </div>
        )}

        {/* Certificate */}
        {resultSettings?.showCertificate && certificateUrl && (
          <div className="pq-results-section">
            <h5>🏆 Your Certificate</h5>
            <p className="text-muted">Download and share your certificate of achievement</p>
            <a href={certificateUrl} target="_blank" rel="noreferrer" className="btn pq-cert-btn" style={{ background: primaryColor }}>
              ⬇️ Download Certificate
            </a>
          </div>
        )}

        {/* Thank you message */}
        {resultSettings?.showThankYouMessage && resultSettings.thankYouMessage && (
          <div className="pq-results-section pq-thankyou-section">
            <div className="pq-thankyou-text">{resultSettings.thankYouMessage}</div>
          </div>
        )}

        {/* Social share */}
        {shareUrls && (
          <div className="pq-results-section">
            <h5>📣 Share Your Result</h5>
            <div className="pq-share-buttons">
              <a href={shareUrls.twitter} target="_blank" rel="noreferrer" className="btn pq-share-btn pq-share-twitter">
                🐦 Share on X
              </a>
              <a href={shareUrls.linkedin} target="_blank" rel="noreferrer" className="btn pq-share-btn pq-share-linkedin">
                💼 LinkedIn
              </a>
              <a href={shareUrls.whatsapp} target="_blank" rel="noreferrer" className="btn pq-share-btn pq-share-whatsapp">
                💬 WhatsApp
              </a>
              {shareUrls.instagramCaption && (
                <button
                  className={`btn pq-share-btn pq-share-instagram`}
                  onClick={() => copy(shareUrls.instagramCaption)}
                >
                  {copied ? '✅ Copied!' : '📸 Copy for Instagram'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Answers review */}
        {resultSettings?.showAnswers && submission?.answers?.length > 0 && (
          <div className="pq-results-section">
            <h5>📋 Answer Review</h5>
            <div className="pq-answers-list">
              {submission.answers.map((a: any, i: number) => (
                <div key={i} className={`pq-answer-row ${a.isCorrect ? 'correct' : 'wrong'}`}>
                  <div className="pq-answer-q">
                    <span className="pq-answer-num">Q{i + 1}</span>
                    <span dangerouslySetInnerHTML={{ __html: a.questionText }} />
                  </div>
                  <div className="pq-answer-detail">
                    <div>Your answer: <strong>{Array.isArray(a.studentAnswer) ? a.studentAnswer.join(', ') : a.studentAnswer}</strong></div>
                    {!a.isCorrect && (
                      <div className="pq-correct-ans">Correct: <strong>{Array.isArray(a.correctAnswer) ? a.correctAnswer.join(', ') : a.correctAnswer}</strong></div>
                    )}
                  </div>
                  <div className="pq-answer-icon">{a.isCorrect ? '✅' : '❌'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back home */}
        {backToHomeUrl && (
          <div className="text-center pq-results-section">
            <a href={backToHomeUrl} className="btn btn-outline-secondary">← Back to Home</a>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicQuizResults;
