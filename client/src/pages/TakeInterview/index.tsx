import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mockInterviewApi, { MockInterview, InterviewResponse, RecordingData } from '../../api/mockInterviewApi';
import { InterviewRecorder, InterviewRecorderRef } from '../../components/InterviewRecorder';
import './TakeInterview.css';

const TakeInterview: React.FC = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<MockInterview | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewResponse | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<InterviewResponse | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [recordingData, setRecordingData] = useState<RecordingData | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recorderRef = useRef<InterviewRecorderRef>(null);

  const handleRecordingComplete = useCallback((data: RecordingData) => {
    setRecordingData(data);
    console.log('Recording completed:', data);
  }, []);

  // Cleanup function to stop camera and recording
  const cleanupRecording = useCallback(() => {
    console.log('🎥 Cleaning up recording...');
    if (recorderRef.current) {
      recorderRef.current.stopRecording();
    }
  }, []);

  useEffect(() => {
    loadInterview();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Cleanup recording on unmount
      cleanupRecording();
    };
  }, [interviewId, cleanupRecording]);

  useEffect(() => {
    if (interview?.status === 'in-progress') {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interview?.status]);

  const loadInterview = async () => {
    if (!interviewId) return;
    
    try {
      setLoading(true);
      let data = await mockInterviewApi.getInterview(interviewId);
      
      // Start if scheduled
      if (data.status === 'scheduled') {
        data = await mockInterviewApi.startInterview(interviewId);
      }
      
      setInterview(data);
      
      if (data.status === 'in-progress' && data.currentQuestionIndex < data.responses.length) {
        setCurrentQuestion(data.responses[data.currentQuestionIndex]);
        setQuestionStartTime(Date.now());
      }
      
      if (data.startedAt) {
        const elapsed = Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000);
        setTimeElapsed(elapsed);
      }
    } catch (error) {
      console.error('Error loading interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!interview || !interviewId || !currentQuestion) return;
    
    try {
      setSubmitting(true);
      const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);
      
      const result = await mockInterviewApi.submitAnswer(interviewId, {
        questionIndex: interview.currentQuestionIndex,
        answer,
        responseTime
      });
      
      setLastFeedback(result.evaluation);
      setShowFeedback(true);
      
      // Update interview state
      const updatedResponses = [...interview.responses];
      updatedResponses[interview.currentQuestionIndex] = result.evaluation;
      
      setInterview({
        ...interview,
        responses: updatedResponses,
        currentQuestionIndex: interview.currentQuestionIndex + 1
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = useCallback(() => {
    setInterview(currentInterview => {
      if (!currentInterview) return currentInterview;
      
      console.log('📝 Moving to next question...');
      console.log('   Current index:', currentInterview.currentQuestionIndex);
      console.log('   Total questions:', currentInterview.responses.length);
      
      if (currentInterview.currentQuestionIndex < currentInterview.responses.length) {
        const nextQuestion = currentInterview.responses[currentInterview.currentQuestionIndex];
        console.log('   Next question:', nextQuestion?.question?.substring(0, 50) + '...');
        
        // Update current question state
        setCurrentQuestion(nextQuestion);
        setQuestionStartTime(Date.now());
      } else {
        console.log('   No more questions');
      }
      
      return currentInterview; // No change to interview state itself
    });
    
    setShowFeedback(false);
    setAnswer('');
    setLastFeedback(null);
  }, []);

  const handleCompleteInterview = async () => {
    if (!interviewId) return;
    
    try {
      setSubmitting(true);
      
      // Stop recording and camera
      cleanupRecording();
      
      // Save recording if available
      if (recordingData) {
        try {
          await mockInterviewApi.saveRecording(interviewId, recordingData);
        } catch (err) {
          console.error('Failed to save recording:', err);
          // Continue even if recording save fails
        }
      }
      
      await mockInterviewApi.completeInterview(interviewId);
      navigate(`/mock-interviews/${interviewId}/result`);
    } catch (error) {
      console.error('Error completing interview:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return '#10b981';
    if (score >= 5) return '#f59e0b';
    return '#ef4444';
  };

  const isTimeWarning = interview && timeElapsed > (interview.timeLimit * 60 * 0.8);
  const isTimeUp = interview && timeElapsed > interview.timeLimit * 60;

  if (loading) {
    return (
      <div className="take-interview-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading interview...</p>
        </div>
      </div>
    );
  }

  if (!interview || !currentQuestion) {
    // Interview completed or no more questions
    if (interview && interview.currentQuestionIndex >= interview.responses.length) {
      return (
        <div className="take-interview-page">
          <div className="interview-complete">
            <div className="complete-icon">🎉</div>
            <h2>Interview Complete!</h2>
            <p>You have answered all questions. Click below to see your results.</p>
            <button 
              className="view-results-btn"
              onClick={handleCompleteInterview}
              disabled={submitting}
            >
              {submitting ? 'Processing...' : 'View Results →'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="take-interview-page">
        <div className="error-state">
          <p>Interview not found or has been completed.</p>
          <button onClick={() => navigate('/mock-interviews')}>Back to Hub</button>
        </div>
      </div>
    );
  }

  return (
    <div className="take-interview-page">
      {/* Header */}
      <div className="interview-header">
        <div className="interview-info">
          <span className="interview-type">
            {interview.category === 'technical' && '💻'}
            {interview.category === 'hr' && '👥'}
            {interview.category === 'company-specific' && '🏢'}
            {interview.category === 'mixed' && '🎯'}
            {' '}
            {interview.subCategory || interview.targetCompany || interview.category} Interview
          </span>
          <span className={`difficulty-badge ${interview.difficulty}`}>
            {interview.difficulty}
          </span>
        </div>
        <div className={`timer ${isTimeWarning ? 'warning' : ''} ${isTimeUp ? 'danger' : ''}`}>
          ⏱️ {formatTime(timeElapsed)} / {interview.timeLimit}:00
        </div>
      </div>

      {/* Progress */}
      <div className="progress-section">
        <div className="progress-text">
          Question {interview.currentQuestionIndex + 1} of {interview.totalQuestions}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((interview.currentQuestionIndex) / interview.totalQuestions) * 100}%` }}
          ></div>
        </div>
        <div className="questions-dots">
          {interview.responses.map((_, idx) => (
            <span 
              key={idx} 
              className={`dot ${idx < interview.currentQuestionIndex ? 'answered' : ''} ${idx === interview.currentQuestionIndex ? 'current' : ''}`}
            ></span>
          ))}
        </div>
      </div>

      {/* Video Recording Section */}
      {interview.recordingEnabled && (
        <div className="recording-section">
          <InterviewRecorder
            ref={recorderRef}
            isEnabled={interview.recordingEnabled}
            onRecordingComplete={handleRecordingComplete}
            autoStart={true}
          />
        </div>
      )}

      {/* Question Card */}
      <div className="question-card">
        {!showFeedback ? (
          <>
            <div className="question-header">
              <span className="question-number">Q{interview.currentQuestionIndex + 1}</span>
              <span className={`question-type-badge ${currentQuestion.questionType}`}>
                {currentQuestion.questionType}
              </span>
            </div>
            <h2 className="question-text">{currentQuestion.question}</h2>
            
            <div className="answer-section">
              <label>Your Answer:</label>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer here... Be detailed and use examples where possible."
                rows={8}
                disabled={submitting}
              />
              <div className="answer-hint">
                💡 Tip: Cover key concepts, provide examples, and structure your answer clearly.
              </div>
            </div>

            <div className="question-actions">
              <button 
                className="skip-btn"
                onClick={handleSubmitAnswer}
                disabled={submitting}
              >
                Skip Question
              </button>
              <button 
                className="submit-answer-btn"
                onClick={handleSubmitAnswer}
                disabled={submitting || answer.trim().length < 10}
              >
                {submitting ? 'Evaluating...' : 'Submit Answer →'}
              </button>
            </div>
          </>
        ) : lastFeedback && (
          <div className="feedback-section">
            <div className="feedback-header">
              <h3>Question Feedback</h3>
              <div 
                className="score-badge"
                style={{ backgroundColor: getScoreColor(lastFeedback.score) + '20', color: getScoreColor(lastFeedback.score) }}
              >
                Score: {lastFeedback.score}/10
              </div>
            </div>

            <div className="your-answer">
              <h4>Your Answer:</h4>
              <p>{lastFeedback.answer || '(Skipped)'}</p>
            </div>

            <div className="ai-feedback">
              <p>{lastFeedback.feedback}</p>
            </div>

            {lastFeedback.strengths.length > 0 && (
              <div className="feedback-list strengths">
                <h4>✅ Strengths:</h4>
                <ul>
                  {lastFeedback.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {lastFeedback.improvements.length > 0 && (
              <div className="feedback-list improvements">
                <h4>💡 Areas to Improve:</h4>
                <ul>
                  {lastFeedback.improvements.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {lastFeedback.keywordsMissed.length > 0 && (
              <div className="missed-keywords">
                <h4>📚 Key Topics to Review:</h4>
                <div className="keyword-tags">
                  {lastFeedback.keywordsMissed.map((k, i) => (
                    <span key={i} className="keyword-tag">{k}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="feedback-actions">
              {interview.currentQuestionIndex < interview.responses.length ? (
                <button className="next-question-btn" onClick={handleNextQuestion}>
                  Next Question →
                </button>
              ) : (
                <button 
                  className="finish-btn" 
                  onClick={handleCompleteInterview}
                  disabled={submitting}
                >
                  {submitting ? 'Processing...' : 'Finish & See Results 🎯'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button 
          className="exit-btn"
          onClick={() => {
            if (window.confirm('Are you sure you want to exit? Your progress will be saved.')) {
              // Stop camera and recording before navigating
              cleanupRecording();
              navigate('/mock-interviews');
            }
          }}
        >
          Exit Interview
        </button>
      </div>
    </div>
  );
};

export default TakeInterview;
