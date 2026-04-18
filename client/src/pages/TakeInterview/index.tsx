import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, ProgressBar, Spinner, Alert } from 'react-bootstrap';
import mockInterviewApi, { MockInterview, InterviewResponse, RecordingData } from '../../api/mockInterviewApi';
import { useMediaRecorder } from '../../hooks/useMediaRecorder';
import './TakeInterview.css';

type AnswerMode = 'video' | 'audio' | 'text';

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
  const [answerMode, setAnswerMode] = useState<AnswerMode>('video');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Video preview ref
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Per-question media recorder
  const mediaRecorder = useMediaRecorder(
    answerMode === 'audio' ? 'audio' : 'video',
    false // don't auto-request — we do it on mount
  );

  // Whole-session recording data (optional, for legacy saveRecording)
  const [sessionRecordingData, setSessionRecordingData] = useState<RecordingData | null>(null);

  // Request camera permission on mount
  useEffect(() => {
    if (answerMode !== 'text') {
      mediaRecorder.requestPermission();
    }
  }, [answerMode]);

  // Attach live stream to video preview element
  useEffect(() => {
    if (videoPreviewRef.current && mediaRecorder.stream && answerMode === 'video') {
      videoPreviewRef.current.srcObject = mediaRecorder.stream;
    }
  }, [mediaRecorder.stream, answerMode]);

  useEffect(() => {
    loadInterview();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorder.cleanup();
    };
  }, [interviewId]);

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

      // If user recorded audio/video, use the transcription placeholder OR let server
      // handle evaluation with the media. For now we also send text answer (possibly blank).
      const result = await mockInterviewApi.submitAnswer(interviewId, {
        questionIndex: interview.currentQuestionIndex,
        answer: answer || '(Answered via ' + answerMode + ' recording)',
        responseTime
      });

      // If there's a recorded blob, upload it as supplementary media
      if (mediaRecorder.recordedBlob) {
        try {
          const formData = new FormData();
          const ext = mediaRecorder.recordedBlob.type.includes('video') ? '.webm' : '.webm';
          formData.append('recording', mediaRecorder.recordedBlob, `mock-answer-${interview.currentQuestionIndex}${ext}`);
          formData.append('questionIndex', String(interview.currentQuestionIndex));
          formData.append('responseTimeSeconds', String(responseTime));

          const token = localStorage.getItem('token');
          const tenantId = localStorage.getItem('tenantId');
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          if (tenantId) headers['X-Tenant-Id'] = tenantId;

          await fetch(
            `${process.env.REACT_APP_API_URL || '/api/v1'}/mock-interviews/${interviewId}/upload-answer`,
            { method: 'POST', headers, body: formData }
          );
        } catch (uploadErr) {
          console.error('Recording upload failed (non-blocking):', uploadErr);
        }
      }

      setLastFeedback(result.evaluation);
      setShowFeedback(true);

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
      if (currentInterview.currentQuestionIndex < currentInterview.responses.length) {
        const nextQuestion = currentInterview.responses[currentInterview.currentQuestionIndex];
        setCurrentQuestion(nextQuestion);
        setQuestionStartTime(Date.now());
      }
      return currentInterview;
    });
    setShowFeedback(false);
    setAnswer('');
    setLastFeedback(null);
    // Reset recorder for next question
    mediaRecorder.reset();
  }, [mediaRecorder]);

  const handleCompleteInterview = async () => {
    if (!interviewId) return;
    try {
      setSubmitting(true);
      mediaRecorder.cleanup();
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
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading interview...</p>
      </Container>
    );
  }

  if (!interview || !currentQuestion) {
    if (interview && interview.currentQuestionIndex >= interview.responses.length) {
      return (
        <Container className="py-5 text-center">
          <div style={{ fontSize: '4rem' }}>🎉</div>
          <h2 className="mt-3">Interview Complete!</h2>
          <p className="text-muted">You have answered all questions. Click below to see your results.</p>
          <Button variant="primary" size="lg" onClick={handleCompleteInterview} disabled={submitting}>
            {submitting ? <><Spinner size="sm" animation="border" className="me-2" />Processing...</> : 'View Results →'}
          </Button>
        </Container>
      );
    }
    return (
      <Container className="py-5 text-center">
        <p className="text-muted">Interview not found or has been completed.</p>
        <Button variant="outline-primary" onClick={() => navigate('/mock-interviews')}>Back to Hub</Button>
      </Container>
    );
  }

  const progress = (interview.currentQuestionIndex / interview.totalQuestions) * 100;

  return (
    <Container fluid className="take-interview-bs px-3 px-md-4 py-3">
      {/* Header Bar */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Body className="py-2 px-3">
          <Row className="align-items-center">
            <Col xs={12} md={5}>
              <div className="d-flex align-items-center gap-2">
                <span className="fs-5">
                  {interview.category === 'technical' && '💻'}
                  {interview.category === 'hr' && '👥'}
                  {interview.category === 'company-specific' && '🏢'}
                  {interview.category === 'mixed' && '🎯'}
                </span>
                <span className="fw-semibold text-capitalize">
                  {interview.subCategory || interview.targetCompany || interview.category} Interview
                </span>
                <Badge bg={interview.difficulty === 'easy' ? 'success' : interview.difficulty === 'medium' ? 'warning' : 'danger'}>
                  {interview.difficulty}
                </Badge>
              </div>
            </Col>
            <Col xs={6} md={4}>
              <div className="text-muted small">
                Question {interview.currentQuestionIndex + 1} of {interview.totalQuestions}
              </div>
              <ProgressBar now={progress} variant="primary" style={{ height: '6px' }} />
            </Col>
            <Col xs={6} md={3} className="text-end">
              <Badge
                bg={isTimeUp ? 'danger' : isTimeWarning ? 'warning' : 'light'}
                text={isTimeUp || isTimeWarning ? 'white' : 'dark'}
                className="fs-6 px-3 py-2"
              >
                ⏱️ {formatTime(timeElapsed)} / {interview.timeLimit}:00
              </Badge>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Question dots */}
      <div className="d-flex flex-wrap gap-1 mb-3 justify-content-center">
        {interview.responses.map((_, idx) => (
          <span
            key={idx}
            className={`question-dot ${idx < interview.currentQuestionIndex ? 'answered' : ''} ${idx === interview.currentQuestionIndex ? 'current' : ''}`}
          />
        ))}
      </div>

      {!showFeedback ? (
        <Row className="g-3">
          {/* Left: Video / Audio Preview */}
          <Col xs={12} lg={5}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white border-bottom">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">📹 Your Response</span>
                  <div className="btn-group btn-group-sm">
                    <Button
                      variant={answerMode === 'video' ? 'primary' : 'outline-secondary'}
                      onClick={() => { setAnswerMode('video'); mediaRecorder.reset(); }}
                    >🎥 Video</Button>
                    <Button
                      variant={answerMode === 'audio' ? 'primary' : 'outline-secondary'}
                      onClick={() => { setAnswerMode('audio'); mediaRecorder.reset(); }}
                    >🎤 Audio</Button>
                    <Button
                      variant={answerMode === 'text' ? 'primary' : 'outline-secondary'}
                      onClick={() => { setAnswerMode('text'); mediaRecorder.reset(); }}
                    >⌨️ Text</Button>
                  </div>
                </div>
              </Card.Header>
              <Card.Body className="d-flex flex-column">
                {answerMode === 'video' && (
                  <div className="video-preview-container mb-3 flex-grow-1">
                    {mediaRecorder.previewUrl ? (
                      <video src={mediaRecorder.previewUrl} controls className="w-100 rounded" style={{ maxHeight: '320px', background: '#000' }} />
                    ) : (
                      <video
                        ref={videoPreviewRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-100 rounded"
                        style={{ maxHeight: '320px', background: '#000', transform: 'scaleX(-1)' }}
                      />
                    )}
                    {mediaRecorder.isRecording && (
                      <div className="recording-indicator-bs">
                        <span className="rec-dot" /> REC {formatTime(mediaRecorder.duration)}
                      </div>
                    )}
                  </div>
                )}

                {answerMode === 'audio' && (
                  <div className="audio-preview-container mb-3 flex-grow-1 d-flex flex-column align-items-center justify-content-center p-4 bg-light rounded" style={{ minHeight: '200px' }}>
                    {mediaRecorder.previewUrl ? (
                      <audio src={mediaRecorder.previewUrl} controls className="w-100" />
                    ) : (
                      <>
                        <div style={{ fontSize: '4rem' }}>
                          {mediaRecorder.isRecording ? '🔴' : '🎤'}
                        </div>
                        {mediaRecorder.isRecording && (
                          <div className="mt-2 fw-semibold text-danger">
                            Recording... {formatTime(mediaRecorder.duration)}
                          </div>
                        )}
                        {!mediaRecorder.isRecording && mediaRecorder.hasPermission && (
                          <p className="text-muted mt-2 mb-0">Click "Start Recording" to begin</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {answerMode === 'text' && (
                  <textarea
                    className="form-control flex-grow-1"
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    placeholder="Type your answer here... Be detailed and use examples."
                    style={{ minHeight: '250px', resize: 'vertical' }}
                    disabled={submitting}
                  />
                )}

                {/* Permission error */}
                {answerMode !== 'text' && mediaRecorder.error && (
                  <Alert variant="warning" className="mt-2 mb-0 small">
                    {mediaRecorder.error}
                    <Button size="sm" variant="link" onClick={() => mediaRecorder.requestPermission()}>
                      Retry
                    </Button>
                  </Alert>
                )}

                {/* Recording controls */}
                {answerMode !== 'text' && mediaRecorder.hasPermission && (
                  <div className="d-flex gap-2 mt-2">
                    {!mediaRecorder.isRecording && !mediaRecorder.recordedBlob && (
                      <Button variant="danger" className="flex-grow-1" onClick={mediaRecorder.startRecording}>
                        ⏺ Start Recording
                      </Button>
                    )}
                    {mediaRecorder.isRecording && (
                      <Button variant="outline-danger" className="flex-grow-1" onClick={mediaRecorder.stopRecording}>
                        ⏹ Stop Recording
                      </Button>
                    )}
                    {mediaRecorder.recordedBlob && !mediaRecorder.isRecording && (
                      <>
                        <Button variant="outline-secondary" onClick={mediaRecorder.reset}>
                          🔄 Re-record
                        </Button>
                        <Badge bg="success" className="d-flex align-items-center px-3">
                          ✅ {formatTime(mediaRecorder.duration)} recorded
                        </Badge>
                      </>
                    )}
                  </div>
                )}

                {/* Optional text notes alongside video/audio */}
                {answerMode !== 'text' && (
                  <div className="mt-3">
                    <label className="form-label small text-muted">Optional text notes:</label>
                    <textarea
                      className="form-control form-control-sm"
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      placeholder="Add any additional notes (optional)..."
                      rows={2}
                    />
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Right: Question */}
          <Col xs={12} lg={7}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="d-flex flex-column">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Badge bg="primary" className="px-3 py-2">Q{interview.currentQuestionIndex + 1}</Badge>
                  <Badge bg="light" text="dark" className="text-capitalize border">{currentQuestion.questionType}</Badge>
                </div>
                <h5 className="fw-semibold mb-4 flex-grow-1">{currentQuestion.question}</h5>
                <div className="d-flex gap-2 mt-auto">
                  <Button
                    variant="outline-secondary"
                    onClick={handleSubmitAnswer}
                    disabled={submitting}
                  >
                    Skip
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-grow-1 fw-semibold"
                    onClick={handleSubmitAnswer}
                    disabled={submitting || (answerMode === 'text' && answer.trim().length < 10 && !mediaRecorder.recordedBlob)}
                  >
                    {submitting ? <><Spinner size="sm" animation="border" className="me-2" />Evaluating...</> : 'Submit Answer →'}
                  </Button>
                </div>
                <div className="text-muted small mt-2">
                  💡 Tip: {answerMode === 'text'
                    ? 'Cover key concepts, provide examples, and structure your answer clearly.'
                    : 'Speak clearly, maintain eye contact with the camera, and structure your thoughts before answering.'}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : lastFeedback && (
        /* Feedback Section */
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Question Feedback</h5>
            <Badge
              className="px-3 py-2 fs-6"
              style={{ backgroundColor: getScoreColor(lastFeedback.score) + '20', color: getScoreColor(lastFeedback.score) }}
            >
              Score: {lastFeedback.score}/10
            </Badge>
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col xs={12}>
                <div className="bg-light p-3 rounded">
                  <h6 className="text-muted mb-1">Your Answer:</h6>
                  <p className="mb-0">{lastFeedback.answer || '(Answered via recording)'}</p>
                </div>
              </Col>
              <Col xs={12}>
                <p>{lastFeedback.feedback}</p>
              </Col>
              {lastFeedback.strengths.length > 0 && (
                <Col xs={12} md={6}>
                  <Card className="border-success border-opacity-25 h-100">
                    <Card.Body>
                      <h6 className="text-success">✅ Strengths</h6>
                      <ul className="mb-0 ps-3">{lastFeedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </Card.Body>
                  </Card>
                </Col>
              )}
              {lastFeedback.improvements.length > 0 && (
                <Col xs={12} md={6}>
                  <Card className="border-warning border-opacity-25 h-100">
                    <Card.Body>
                      <h6 className="text-warning">💡 Improve</h6>
                      <ul className="mb-0 ps-3">{lastFeedback.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </Card.Body>
                  </Card>
                </Col>
              )}
              {lastFeedback.keywordsMissed.length > 0 && (
                <Col xs={12}>
                  <h6>📚 Key Topics to Review:</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {lastFeedback.keywordsMissed.map((k, i) => (
                      <Badge key={i} bg="light" text="dark" className="border">{k}</Badge>
                    ))}
                  </div>
                </Col>
              )}
            </Row>
          </Card.Body>
          <Card.Footer className="bg-white text-end">
            {interview.currentQuestionIndex < interview.responses.length ? (
              <Button variant="primary" onClick={handleNextQuestion}>Next Question →</Button>
            ) : (
              <Button variant="success" onClick={handleCompleteInterview} disabled={submitting}>
                {submitting ? 'Processing...' : 'Finish & See Results 🎯'}
              </Button>
            )}
          </Card.Footer>
        </Card>
      )}

      {/* Exit Button */}
      <div className="text-center mt-4">
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => {
            if (window.confirm('Are you sure you want to exit? Your progress will be saved.')) {
              mediaRecorder.cleanup();
              navigate('/mock-interviews');
            }
          }}
        >
          Exit Interview
        </Button>
      </div>
    </Container>
  );
};

export default TakeInterview;
