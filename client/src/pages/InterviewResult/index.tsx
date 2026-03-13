import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mockInterviewApi, { MockInterview, InterviewResponse } from '../../api/mockInterviewApi';
import './InterviewResult.css';

const InterviewResult: React.FC = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<MockInterview | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  useEffect(() => {
    loadInterview();
  }, [interviewId]);

  const loadInterview = async () => {
    if (!interviewId) return;
    
    try {
      setLoading(true);
      const data = await mockInterviewApi.getInterview(interviewId);
      
      if (data.status !== 'completed') {
        // If not completed, complete it
        const completed = await mockInterviewApi.completeInterview(interviewId);
        setInterview(completed);
      } else {
        setInterview(data);
      }
    } catch (error) {
      console.error('Error loading interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    if (percentage >= 40) return '#f97316';
    return '#ef4444';
  };

  const getGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', label: 'Excellent' };
    if (score >= 80) return { grade: 'A', label: 'Great' };
    if (score >= 70) return { grade: 'B+', label: 'Good' };
    if (score >= 60) return { grade: 'B', label: 'Above Average' };
    if (score >= 50) return { grade: 'C', label: 'Average' };
    if (score >= 40) return { grade: 'D', label: 'Below Average' };
    return { grade: 'F', label: 'Needs Improvement' };
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="interview-result-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="interview-result-page">
        <div className="error-state">
          <p>Interview not found.</p>
          <button onClick={() => navigate('/mock-interviews')}>Back to Hub</button>
        </div>
      </div>
    );
  }

  const gradeInfo = getGrade(interview.overallScore || 0);
  const answeredCount = interview.responses.filter(r => r.answer.length > 0).length;

  return (
    <div className="interview-result-page">
      {/* Header */}
      <div className="result-header">
        <button className="back-btn" onClick={() => navigate('/mock-interviews')}>
          ← Back to Hub
        </button>
        <h1>Interview Results</h1>
        <button className="retake-btn" onClick={() => navigate('/mock-interviews')}>
          🔄 Take New Interview
        </button>
      </div>

      {/* Score Card */}
      <div className="score-card">
        <div className="score-main">
          <div 
            className="score-circle"
            style={{ 
              background: `conic-gradient(${getScoreColor(interview.overallScore || 0)} ${(interview.overallScore || 0) * 3.6}deg, #e5e7eb 0deg)` 
            }}
          >
            <div className="score-inner">
              <span className="score-value">{interview.overallScore || 0}</span>
              <span className="score-max">/100</span>
            </div>
          </div>
          <div className="grade-info">
            <span className="grade" style={{ color: getScoreColor(interview.overallScore || 0) }}>
              {gradeInfo.grade}
            </span>
            <span className="grade-label">{gradeInfo.label}</span>
          </div>
        </div>

        <div className="score-details">
          <div className="detail-row">
            <span className="detail-label">Interview Type</span>
            <span className="detail-value">
              {interview.category === 'technical' && '💻'}
              {interview.category === 'hr' && '👥'}
              {interview.category === 'company-specific' && '🏢'}
              {interview.category === 'mixed' && '🎯'}
              {' '}{interview.subCategory || interview.targetCompany || interview.category}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Difficulty</span>
            <span className={`detail-value difficulty ${interview.difficulty}`}>
              {interview.difficulty}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Questions Answered</span>
            <span className="detail-value">{answeredCount} / {interview.totalQuestions}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Time Taken</span>
            <span className="detail-value">{formatDuration(interview.actualDuration)}</span>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="breakdown-section">
        <h2>Score Breakdown</h2>
        <div className="breakdown-grid">
          {interview.technicalScore !== undefined && (
            <div className="breakdown-card">
              <span className="breakdown-icon">💻</span>
              <span className="breakdown-label">Technical</span>
              <div className="breakdown-bar-container">
                <div 
                  className="breakdown-bar"
                  style={{ 
                    width: `${interview.technicalScore}%`,
                    backgroundColor: getScoreColor(interview.technicalScore)
                  }}
                ></div>
              </div>
              <span className="breakdown-score">{interview.technicalScore}%</span>
            </div>
          )}
          {interview.communicationScore !== undefined && (
            <div className="breakdown-card">
              <span className="breakdown-icon">🗣️</span>
              <span className="breakdown-label">Communication</span>
              <div className="breakdown-bar-container">
                <div 
                  className="breakdown-bar"
                  style={{ 
                    width: `${interview.communicationScore}%`,
                    backgroundColor: getScoreColor(interview.communicationScore)
                  }}
                ></div>
              </div>
              <span className="breakdown-score">{interview.communicationScore}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="feedback-grid">
        {interview.topStrengths.length > 0 && (
          <div className="feedback-card strengths">
            <h3>✅ Your Strengths</h3>
            <ul>
              {interview.topStrengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {interview.topImprovements.length > 0 && (
          <div className="feedback-card improvements">
            <h3>💡 Areas to Improve</h3>
            <ul>
              {interview.topImprovements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommended Topics */}
      {interview.recommendedTopics.length > 0 && (
        <div className="recommended-section">
          <h2>📚 Topics to Review</h2>
          <div className="topic-tags">
            {interview.recommendedTopics.map((topic, i) => (
              <span key={i} className="topic-tag">{topic}</span>
            ))}
          </div>
        </div>
      )}

      {/* Overall Feedback */}
      {interview.overallFeedback && (
        <div className="overall-feedback">
          <h2>📋 Overall Feedback</h2>
          <p>{interview.overallFeedback}</p>
        </div>
      )}

      {/* Question-wise Analysis */}
      <div className="questions-section">
        <h2>Question-wise Analysis</h2>
        <div className="questions-list">
          {interview.responses.map((response, idx) => (
            <div 
              key={idx} 
              className={`question-item ${expandedQuestion === idx ? 'expanded' : ''}`}
            >
              <div 
                className="question-summary"
                onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
              >
                <span className="q-number">Q{idx + 1}</span>
                <span className="q-text">
                  {response.question.length > 80 
                    ? response.question.substring(0, 80) + '...' 
                    : response.question}
                </span>
                <span 
                  className="q-score"
                  style={{ color: getScoreColor(response.score, 10) }}
                >
                  {response.score}/10
                </span>
                <span className="expand-icon">
                  {expandedQuestion === idx ? '▼' : '▶'}
                </span>
              </div>
              
              {expandedQuestion === idx && (
                <div className="question-details">
                  <div className="full-question">
                    <strong>Question:</strong> {response.question}
                  </div>
                  
                  <div className="your-answer">
                    <strong>Your Answer:</strong>
                    <p>{response.answer || '(No answer provided)'}</p>
                  </div>
                  
                  <div className="q-feedback">
                    <strong>Feedback:</strong> {response.feedback}
                  </div>
                  
                  {response.strengths.length > 0 && (
                    <div className="q-strengths">
                      <strong>✅ Good:</strong>
                      <ul>
                        {response.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  {response.improvements.length > 0 && (
                    <div className="q-improvements">
                      <strong>💡 Improve:</strong>
                      <ul>
                        {response.improvements.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  {response.keywordsMissed.length > 0 && (
                    <div className="q-keywords">
                      <strong>Key topics missed:</strong>
                      <div className="keyword-list">
                        {response.keywordsMissed.map((k, i) => (
                          <span key={i} className="keyword">{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="result-actions">
        <button className="action-btn secondary" onClick={() => navigate('/mock-interviews/history')}>
          📜 View All Interviews
        </button>
        <button className="action-btn primary" onClick={() => navigate('/mock-interviews')}>
          🚀 Practice More
        </button>
      </div>
    </div>
  );
};

export default InterviewResult;
