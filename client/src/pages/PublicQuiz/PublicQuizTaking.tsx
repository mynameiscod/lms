import React, { useCallback, useEffect, useRef, useState } from 'react';
import { publicQuizApi } from '../../api';

interface Props {
  submissionId: string;
  primaryColor: string;
  onCompleted: () => void;
}

const PublicQuizTaking: React.FC<Props> = ({ submissionId, primaryColor, onCompleted }) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'active' | 'denied' | 'uploading'>('idle');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    publicQuizApi.getQuestions(submissionId).then(data => {
      if (data.message && !data.questions) { setError(data.message); setLoading(false); return; }
      setQuestions(data.questions || []);
      if (data.quiz?.totalTime) setTimeLeft(data.quiz.totalTime * 60);
      else if (data.totalTime) setTimeLeft(data.totalTime * 60);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, [submissionId]);

  // Start camera+mic recording when quiz loads
  useEffect(() => {
    if (loading) return;
    startRecording();
    return () => stopStream();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      recordingChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = e => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      recorder.start(5000); // collect chunks every 5s
      mediaRecorderRef.current = recorder;
      setRecordingStatus('active');
    } catch {
      setRecordingStatus('denied');
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const stopRecordingAndUpload = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') { resolve(); return; }

      recorder.onstop = async () => {
        stopStream();
        if (recordingChunksRef.current.length === 0) { resolve(); return; }
        try {
          setRecordingStatus('uploading');
          const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
          await publicQuizApi.uploadRecording(submissionId, blob);
        } catch { /* recording upload failure is non-fatal */ }
        resolve();
      };
      recorder.stop();
    });
  }, [submissionId]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setInterval(() => setTimeLeft(t => (t !== null ? t - 1 : null)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft === null ? null : Math.floor(timeLeft / 60)]);

  useEffect(() => {
    if (timeLeft === 0) handleSubmit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const selectAnswer = (qId: string, optIdx: string, multi: boolean) => {
    setAnswers(prev => {
      const current = prev[qId] || [];
      if (multi) {
        return { ...prev, [qId]: current.includes(optIdx) ? current.filter(x => x !== optIdx) : [...current, optIdx] };
      }
      return { ...prev, [qId]: [optIdx] };
    });
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      // Stop recording and upload before submitting quiz result
      await stopRecordingAndUpload();

      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const answersArray = Object.entries(answers).map(([questionId, selectedOptions]) => ({
        questionId,
        selectedOptions
      }));
      await publicQuizApi.submitQuiz(submissionId, { answers: answersArray, timeSpent });
      onCompleted();
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting, answers, submissionId, onCompleted, stopRecordingAndUpload]);

  const confirmSubmit = () => {
    const unanswered = questions.filter(q => !(answers[q._id]?.length));
    const msg = unanswered.length
      ? `You have ${unanswered.length} unanswered question(s). Submit anyway?`
      : 'Submit quiz now?';
    if (window.confirm(msg)) handleSubmit();
  };

  if (loading) return (
    <div className="pq-quiz-loading">
      <div className="pq-public-spinner"></div>
      <p>Loading questions...</p>
    </div>
  );

  if (error) return (
    <div className="pq-public-error">
      <h3>Error</h3><p>{error}</p>
    </div>
  );

  const q = questions[currentIdx];
  const isMulti = q?.type === 'mcq_multiple';

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const answered = questions.filter(q => answers[q._id]?.length).length;

  return (
    <div className="pq-quiz-page">
      {/* Header bar */}
      <div className="pq-quiz-header" style={{ background: primaryColor }}>
        <div className="pq-quiz-header-left">
          <span>{currentIdx + 1} / {questions.length}</span>
          <span className="pq-quiz-answered">{answered} answered</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          {/* Recording indicator */}
          {recordingStatus === 'active' && (
            <span style={{ fontSize: 12, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4444', display: 'inline-block', animation: 'blink 1s infinite' }} />
              Recording
            </span>
          )}
          {recordingStatus === 'denied' && (
            <span style={{ fontSize: 11, opacity: 0.8 }}>⚠ Camera denied</span>
          )}
          {recordingStatus === 'uploading' && (
            <span style={{ fontSize: 11, opacity: 0.8 }}>Uploading…</span>
          )}
          {timeLeft !== null && (
            <div className={`pq-quiz-timer ${timeLeft < 120 ? 'pq-timer-warning' : ''}`}>
              ⏱ {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      <div className="pq-quiz-body">
        {/* Question navigator */}
        <div className="pq-quiz-nav">
          {questions.map((q, i) => {
            const isAnswered = !!(answers[q._id]?.length);
            const isCurrent = i === currentIdx;
            return (
              <button
                key={q._id}
                className={`pq-nav-btn ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}`}
                style={isCurrent ? { background: primaryColor, color: '#fff', borderColor: primaryColor } : undefined}
                onClick={() => setCurrentIdx(i)}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Question panel */}
        <div className="pq-quiz-question-panel">
          {q && (
            <>
              <div className="pq-question-header">
                <span className="pq-question-type">{isMulti ? 'Multiple correct' : 'Single correct'}</span>
                <span className="pq-question-marks">{q.marks || 1} mark{q.marks !== 1 ? 's' : ''}</span>
              </div>
              <div className="pq-question-text"
                dangerouslySetInnerHTML={{ __html: q.question }} />

              <div className="pq-options-list">
                {(q.options || []).map((opt: string, idx: number) => {
                  const idxStr = String(idx);
                  const selected = answers[q._id]?.includes(idxStr);
                  return (
                    <div
                      key={idx}
                      className={`pq-option${selected ? ' pq-option-selected' : ''}`}
                      style={selected ? { borderColor: primaryColor, background: `${primaryColor}18` } : undefined}
                      onClick={() => selectAnswer(q._id, idxStr, isMulti)}
                    >
                      <span className="pq-option-bubble" style={selected ? { background: primaryColor, borderColor: primaryColor } : undefined}>
                        {selected && <span className="pq-option-check">✓</span>}
                      </span>
                      <span className="pq-option-text">{opt}</span>
                    </div>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="pq-quiz-nav-btns">
                <button className="btn btn-outline-secondary" onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}>
                  ← Previous
                </button>
                {currentIdx < questions.length - 1 ? (
                  <button className="btn" style={{ background: primaryColor, color: '#fff' }} onClick={() => setCurrentIdx(i => i + 1)}>
                    Next →
                  </button>
                ) : (
                  <button className="btn btn-success" onClick={confirmSubmit} disabled={submitting}>
                    {submitting ? 'Submitting...' : '✅ Submit Quiz'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicQuizTaking;
