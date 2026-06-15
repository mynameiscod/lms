import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import * as tus from 'tus-js-client';
import { studentInterviewApi } from '../../api/interviewModuleApi';
import { learningContentLibraryApi } from '../../api/learningContentLibraryApi';
import { useMediaRecorder } from '../../hooks/useMediaRecorder';
import { useInterviewVoice } from '../../hooks/useInterviewVoice';
import './TakeStructuredInterview.css';

/**
 * Student take flow for the structured AI interview.
 * One question at a time; answers (text / MCQ / code, plus optional audio/video)
 * are saved + silently AI-evaluated on the server. Grades are never shown here —
 * they're revealed on the report after submit.
 */
const TakeStructuredInterview: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId') || undefined;
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [overallRemaining, setOverallRemaining] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [voiceMode, setVoiceMode] = useState(false);
  const [tool, setTool] = useState<'' | 'notes' | 'calculator' | 'whiteboard' | 'code'>('');
  const [notes, setNotes] = useState('');
  const [calcExpr, setCalcExpr] = useState('');
  const [scratchCode, setScratchCode] = useState('');
  const questionStartRef = useRef<number>(Date.now());
  const submitOnceRef = useRef(false);

  // ── Continuous video recording (template-level) ─────────────────────
  const [camState, setCamState] = useState<'idle' | 'requesting' | 'on' | 'denied'>('idle');
  const [recError, setRecError] = useState('');
  const [uploadingRec, setUploadingRec] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const camStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const selfViewRef = useRef<HTMLVideoElement>(null);
  const camStartedRef = useRef(false);
  const [camRetry, setCamRetry] = useState(0);

  // ── Media recording for audio/video answer modes ────────────────────
  const sectionsRef = attempt?.sectionAttempts || [];
  const liveSection = sectionsRef[currentSectionIdx];
  const liveQuestion = liveSection?.questionResponses?.[currentQuestionIdx];
  const qMode: string = liveQuestion?.answerMode || 'text';

  const [answerMediaMode, setAnswerMediaMode] = useState<'text' | 'video' | 'audio'>('text');
  const mediaRecorder = useMediaRecorder(answerMediaMode === 'audio' ? 'audio' : 'video', false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoPreviewRef.current && mediaRecorder.stream && answerMediaMode === 'video') {
      videoPreviewRef.current.srcObject = mediaRecorder.stream;
    }
  }, [mediaRecorder.stream, answerMediaMode]);

  // Sync media mode with the current question's answer mode
  useEffect(() => {
    if (qMode === 'video' || qMode === 'audio') {
      setAnswerMediaMode(qMode);
      mediaRecorder.requestPermission();
    } else {
      setAnswerMediaMode('text');
    }
    questionStartRef.current = Date.now();
  }, [currentSectionIdx, currentQuestionIdx, qMode]);

  // ── Voice layer (browser TTS/STT) ───────────────────────────────────
  const voice = useInterviewVoice();
  const baseAnswerRef = useRef('');
  const lastSpokenRef = useRef('');

  const questionSpeech = useCallback(() => {
    if (!liveQuestion) return '';
    const opts = qMode === 'mcq' && liveQuestion.mcqOptions?.length
      ? '. Options: ' + liveQuestion.mcqOptions.map((o: any) => `${o.label}. ${o.text}`).join('. ')
      : '';
    return `${liveQuestion.questionText}${opts}`;
  }, [liveQuestion, qMode]);

  const toggleVoiceMode = () => {
    setVoiceMode(prev => {
      const next = !prev;
      if (next) { lastSpokenRef.current = ''; }       // re-speak current question
      else { voice.stopSpeaking(); voice.stopListening(); }
      return next;
    });
  };

  // Speak the question once when it changes (voice mode only)
  useEffect(() => {
    if (!voiceMode || !liveQuestion || loading) return;
    const key = `${currentSectionIdx}:${currentQuestionIdx}`;
    if (lastSpokenRef.current === key) return;
    lastSpokenRef.current = key;
    voice.speak(questionSpeech());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode, currentSectionIdx, currentQuestionIdx, liveQuestion, qMode]);

  // Live transcript → answer box
  useEffect(() => {
    if (voice.listening) setAnswer((baseAnswerRef.current + voice.transcript).trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.transcript, voice.listening]);

  // Stop voice when leaving a question
  useEffect(() => {
    voice.stopListening();
    voice.resetTranscript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionIdx, currentQuestionIdx]);

  const handleMic = () => {
    if (voice.listening) { voice.stopListening(); return; }
    baseAnswerRef.current = answer ? answer + ' ' : '';
    voice.resetTranscript();
    voice.startListening();
  };

  // ── Start / resume attempt ──────────────────────────────────────────
  useEffect(() => {
    const start = async () => {
      try {
        setLoading(true);
        const res = await studentInterviewApi.startAttempt(templateId!, assignmentId);
        const a = res.data;
        setAttempt(a);
        const secs = a?.sectionAttempts || [];
        const activeSec = Math.max(0, secs.findIndex((s: any) => s.status !== 'completed'));
        setCurrentSectionIdx(activeSec >= 0 ? activeSec : 0);
        const qs = secs[activeSec]?.questionResponses || [];
        const activeQ = qs.findIndex((q: any) => q.status === 'not_started');
        setCurrentQuestionIdx(activeQ >= 0 ? activeQ : 0);
      } catch (err: any) {
        setError(err.message || 'Failed to start interview');
      } finally {
        setLoading(false);
      }
    };
    if (templateId) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, assignmentId]);

  // ── Overall timer (from template.totalDuration) ─────────────────────
  useEffect(() => {
    if (!attempt) return;
    const totalMin = attempt.templateId?.totalDuration || 0;
    if (!totalMin || !attempt.startedAt) { setOverallRemaining(0); return; }
    const tick = () => {
      const elapsed = (Date.now() - new Date(attempt.startedAt).getTime()) / 1000;
      const remaining = Math.max(0, totalMin * 60 - elapsed);
      setOverallRemaining(remaining);
      if (remaining <= 0 && !submitOnceRef.current) {
        submitOnceRef.current = true;
        handleSubmitInterview();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.startedAt, attempt?.templateId?.totalDuration]);

  // ── Tab detection ───────────────────────────────────────────────────
  useEffect(() => {
    if (!attempt?.templateId?.blockMultipleTabs) return;
    const onVisibility = () => {
      if (document.hidden) {
        setTabWarnings(prev => {
          const next = prev + 1;
          if (next >= 3 && !submitOnceRef.current) { submitOnceRef.current = true; handleSubmitInterview(); }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // ── Derived current section/question ────────────────────────────────
  const sections = attempt?.sectionAttempts || [];
  const currentSection = sections[currentSectionIdx];
  const questions = currentSection?.questionResponses || [];
  const currentQuestion = questions[currentQuestionIdx];
  const navMode = attempt?.templateId?.sectionNavigationMode || 'sequential';
  const recordVideo = !!attempt?.templateId?.recordVideo;
  const videoFallback = attempt?.templateId?.videoFallback || 'allow_text';

  // Request camera + start ONE continuous recording for the whole interview.
  // Guarded by a ref so it runs exactly once (attempt changes on every save,
  // and we must not re-trigger / cancel the in-flight getUserMedia).
  useEffect(() => {
    if (!attempt || !recordVideo || camStartedRef.current) return;
    camStartedRef.current = true;
    setCamState('requesting');
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no getUserMedia');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
        camStreamRef.current = stream;
        if (selfViewRef.current) selfViewRef.current.srcObject = stream;
        const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
          .find(t => (window as any).MediaRecorder?.isTypeSupported?.(t)) || '';
        const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        chunksRef.current = [];
        rec.ondataavailable = e => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
        rec.start(2000);
        recorderRef.current = rec;
        setCamState('on');
        studentInterviewApi.saveRecording(attempt._id, { status: 'recording' }).catch(() => {});
      } catch {
        camStartedRef.current = false;   // allow retry
        setCamState('denied');
        setRecError('Camera and microphone access is needed for this video interview.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, recordVideo, camRetry]);

  const retryCamera = () => { camStartedRef.current = false; setRecError(''); setCamState('idle'); setCamRetry(n => n + 1); };

  // ── Interview control tools (notes / calculator / whiteboard / code) ──
  const wbRef = useRef<HTMLCanvasElement | null>(null);
  const wbDrawing = useRef(false);
  const wbPos = (e: React.MouseEvent) => { const r = wbRef.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const wbStart = (e: React.MouseEvent) => { wbDrawing.current = true; const ctx = wbRef.current!.getContext('2d')!; const p = wbPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const wbMove = (e: React.MouseEvent) => { if (!wbDrawing.current) return; const ctx = wbRef.current!.getContext('2d')!; const p = wbPos(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); };
  const wbEnd = () => { wbDrawing.current = false; };
  const wbClear = () => { const c = wbRef.current; if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height); };
  const calcResult = (() => {
    if (!calcExpr.trim()) return '';
    if (!/^[-+*/().\d\s]*$/.test(calcExpr)) return 'invalid expression';
    try { /* eslint-disable-next-line no-new-func */ return String(Function(`"use strict";return (${calcExpr})`)()); } catch { return 'error'; }
  })();

  // Bind the live stream to the self-view element
  useEffect(() => {
    if (selfViewRef.current && camStreamRef.current) selfViewRef.current.srcObject = camStreamRef.current;
  }, [camState, currentSectionIdx, currentQuestionIdx]);

  // Stop camera + recorder on unmount
  useEffect(() => () => {
    try { if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop(); } catch { /* ignore */ }
    camStreamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const stopAndUploadRecording = async () => {
    const rec = recorderRef.current;
    if (!rec || !attempt) return;
    const blob: Blob = await new Promise(resolve => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'video/webm' }));
      try { if (rec.state !== 'inactive') rec.stop(); else resolve(new Blob(chunksRef.current, { type: 'video/webm' })); }
      catch { resolve(new Blob(chunksRef.current, { type: 'video/webm' })); }
    });
    camStreamRef.current?.getTracks().forEach(t => t.stop());
    if (!blob.size) return;
    try {
      setUploadingRec(true); setUploadPct(0);
      const meta = await learningContentLibraryApi.createBunnyVideo(`Interview ${attempt._id}`);
      await new Promise<void>((resolve, reject) => {
        const up = new tus.Upload(blob, {
          endpoint: meta.tus.endpoint,
          retryDelays: [0, 3000, 6000],
          headers: {
            AuthorizationSignature: meta.tus.signature,
            AuthorizationExpire: String(meta.tus.expiration),
            VideoId: meta.videoId,
            LibraryId: String(meta.libraryId),
          },
          metadata: { filetype: blob.type || 'video/webm' },
          onError: reject,
          onProgress: (sent, total) => setUploadPct(Math.round((sent / total) * 100)),
          onSuccess: () => resolve(),
        });
        up.start();
      });
      await studentInterviewApi.saveRecording(attempt._id, { bunnyVideoId: meta.videoId, bunnyLibraryId: meta.libraryId, status: 'uploaded' });
    } catch {
      await studentInterviewApi.saveRecording(attempt._id, { status: 'failed' }).catch(() => {});
    } finally {
      setUploadingRec(false);
    }
  };

  // ── Load existing answer when navigating ────────────────────────────
  useEffect(() => {
    if (!currentQuestion) { setAnswer(''); return; }
    setAnswer(
      currentQuestion.answerText ||
      currentQuestion.selectedMCQOption ||
      currentQuestion.answerCode ||
      ''
    );
  }, [currentSectionIdx, currentQuestionIdx, attempt]);

  // ── Save answer ─────────────────────────────────────────────────────
  const handleSaveAnswer = useCallback(async () => {
    if (!attempt || !currentQuestion) return;
    try {
      setSaving(true);
      const responseTimeSeconds = Math.round((Date.now() - questionStartRef.current) / 1000);
      const payload: any = { sectionIndex: currentSectionIdx, questionIndex: currentQuestionIdx, responseTimeSeconds };
      if (qMode === 'mcq') payload.selectedMCQOption = answer;
      else if (qMode === 'code') payload.answerCode = answer;
      else payload.answerText = answer;

      const res = await studentInterviewApi.saveAnswer(attempt._id, payload);
      setAttempt(res.data);

      if (mediaRecorder.recordedBlob) {
        try {
          await studentInterviewApi.uploadAnswerRecording(
            attempt._id, mediaRecorder.recordedBlob, currentSectionIdx, currentQuestionIdx, responseTimeSeconds
          );
        } catch (uploadErr) {
          console.error('Recording upload failed (non-blocking):', uploadErr);
        }
      }
    } catch (err: any) {
      console.error('Save failed:', err.message);
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, answer, currentSectionIdx, currentQuestionIdx, qMode, mediaRecorder.recordedBlob]);

  // ── Skip ────────────────────────────────────────────────────────────
  const handleSkip = async () => {
    if (!attempt || !currentQuestion) return;
    try {
      const res = await studentInterviewApi.skipQuestion(attempt._id, currentSectionIdx, currentQuestionIdx);
      setAttempt(res.data);
      goNextQuestion();
    } catch (err: any) { console.error(err); }
  };

  // ── Navigation ──────────────────────────────────────────────────────
  const goNextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      mediaRecorder.reset();
    }
  };
  const goPrevQuestion = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(prev => prev - 1);
      mediaRecorder.reset();
    }
  };
  const handleSaveAndNext = async () => { await handleSaveAnswer(); goNextQuestion(); };

  // ── Complete section ────────────────────────────────────────────────
  const handleCompleteSection = async () => {
    if (!attempt) return;
    try {
      const res = await studentInterviewApi.completeSection(attempt._id, currentSectionIdx);
      setAttempt(res.data);
      if (currentSectionIdx < sections.length - 1) {
        setCurrentSectionIdx(prev => prev + 1);
        setCurrentQuestionIdx(0);
      } else {
        setShowConfirmSubmit(true);
      }
    } catch (err: any) { alert(err.message); }
  };

  // ── Submit ──────────────────────────────────────────────────────────
  const handleSubmitInterview = async () => {
    if (!attempt) return;
    try {
      setSubmitting(true);
      if (recordVideo && (camState === 'on' || recorderRef.current)) {
        await stopAndUploadRecording();
      }
      await studentInterviewApi.submitAttempt(attempt._id);
      navigate(`/student/interviews/report/${attempt._id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  // ── Render ──────────────────────────────────────────────────────────
  if (loading) return <div className="tsi-loading"><div className="tsi-spinner" />Starting interview...</div>;
  if (error) return <div className="tsi-error">{error}<br /><button onClick={() => navigate('/student/interviews')}>Back to Hub</button></div>;
  if (!attempt) return <div className="tsi-error">No attempt data.</div>;

  if (recordVideo && camState === 'denied' && videoFallback === 'block') {
    return (
      <div className="tsi-error">
        <h3>📷 Camera & microphone required</h3>
        <p>{recError || 'This is a video interview — please allow camera and microphone access to continue.'}</p>
        <div style={{ marginTop: 12 }}>
          <button onClick={retryCamera}>Retry camera</button>
          <button onClick={() => navigate('/student/interviews')} style={{ marginLeft: 8 }}>Back to Hub</button>
        </div>
      </div>
    );
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const isAnswered = (q: any) => q.status === 'answered';
  const isSkipped = (q: any) => q.status === 'skipped';
  const answeredCount = questions.filter(isAnswered).length;
  const skippedCount = questions.filter(isSkipped).length;
  const totalQ = questions.length;
  const remainingQ = Math.max(0, totalQ - answeredCount - skippedCount);
  const progressPct = totalQ ? Math.round((answeredCount / totalQ) * 100) : 0;
  const isLastQ = currentQuestionIdx >= totalQ - 1;
  const isLastSection = currentSectionIdx >= sections.length - 1;
  const nextLabel = !isLastQ ? 'Save & Next →' : (isLastSection ? 'Finish & Review →' : 'Complete Section →');
  const onNext = async () => { if (!isLastQ) { await handleSaveAndNext(); } else { await handleSaveAnswer(); handleCompleteSection(); } };
  const reportIssue = () => window.open(`mailto:support@codebegun.com?subject=Interview%20issue%20-%20Q${currentQuestionIdx + 1}`);

  return (
    <div className="tsi-container">
      {/* Top bar */}
      <div className="tsi-top">
        <div className="tsi-brand"><span className="logo">🟦</span><b>CodeBegun</b></div>
        <div className="tsi-top-title">
          <h2>{attempt.templateId?.title || 'Interview'}</h2>
          <span>Section {currentSectionIdx + 1}/{sections.length}: {currentSection?.sectionTitle}</span>
        </div>
        <div className="tsi-top-right">
          <span className="tsi-timer2">⏱ {overallRemaining > 0 ? formatTime(overallRemaining) : '∞'}</span>
          {voice.ttsSupported && (
            <button className={`tsi-voice-btn ${voiceMode ? 'on' : ''}`} onClick={toggleVoiceMode}>
              {voiceMode ? '🔊 Voice On' : '🔈 Voice Off'}
            </button>
          )}
          <button className="tsi-end" onClick={() => setShowConfirmSubmit(true)}>End Interview</button>
        </div>
      </div>

      {/* Body */}
      <div className="tsi-body">
        {/* Main question card */}
        <div className="tsi-main2">
          {currentQuestion ? (<>
            <div className="tsi-qhead">
              <span className="tsi-qnum">Question {currentQuestionIdx + 1} of {totalQ}</span>
              {currentQuestion.difficulty && <span className="tsi-badge diff">{currentQuestion.difficulty}</span>}
              {currentQuestion.topic && <span className="tsi-badge topic">{currentQuestion.topic}</span>}
              <button className="tsi-report" onClick={reportIssue}>🚩 Report an Issue</button>
            </div>

            <div className="tsi-qtext">{currentQuestion.questionText || 'Loading question…'}</div>
            {voiceMode && voice.ttsSupported && (
              <button className="tsi-replay" onClick={() => voice.speak(questionSpeech())}>{voice.speaking ? '🔊 Speaking…' : '🔁 Replay question'}</button>
            )}

            {/* Answer area */}
            <div className="tsi-ans">
              {voiceMode && (qMode === 'text' || qMode === 'code') && (
                <div className="tsi-voice-input">
                  {voice.sttSupported
                    ? <button className={`tsi-mic ${voice.listening ? 'listening' : ''}`} onClick={handleMic}>{voice.listening ? '⏹ Stop & use answer' : '🎤 Speak your answer'}</button>
                    : <span className="tsi-voice-note">Voice input not supported — please type.</span>}
                  {voice.listening && <span className="tsi-listening-dot">● listening…</span>}
                </div>
              )}

              {qMode === 'mcq' ? (
                <div className="tsi-mcq">
                  {(currentQuestion.mcqOptions || []).map((opt: any, i: number) => (
                    <label key={i} className={`tsi-mcq-opt ${answer === opt.label ? 'sel' : ''}`}>
                      <input type="radio" name="mcq" value={opt.label} checked={answer === opt.label} onChange={e => setAnswer(e.target.value)} />
                      <span><strong>{opt.label}.</strong> {opt.text}</span>
                    </label>
                  ))}
                </div>
              ) : qMode === 'code' ? (
                <>
                  <textarea className="tsi-code2" value={answer} onChange={e => setAnswer(e.target.value)} placeholder={currentQuestion.codeStarterTemplate || 'Write your code here…'} spellCheck={false} />
                  <div className="tsi-count">{answer.length} chars</div>
                </>
              ) : (
                <>
                  <div className="tsi-ans-toolbar">
                    <button title="Bold"><b>B</b></button><button title="Italic"><i>I</i></button><button title="Underline"><u>U</u></button>
                    <span className="sep" /><button title="Bulleted list">☰</button><button title="Numbered list">≡</button><button title="Indent">⇥</button>
                    <span className="sep" /><button title="Quote">❝</button><button title="Link">🔗</button>
                    <span className="sep" /><button title="Undo">↶</button><button title="Redo">↷</button>
                  </div>
                  <textarea className="tsi-textarea" value={answer} maxLength={5000} onChange={e => setAnswer(e.target.value)} placeholder="Type your answer here…" />
                  <div className="tsi-count">{answer.length} / 5000</div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="tsi-qfoot">
              <span className="tsi-saved">{saving ? '⏳ Saving…' : '✓ Auto-saved'}</span>
              <div className="tsi-foot-right">
                <button className="tsi-skip" onClick={handleSkip}>Skip</button>
                <button className="tsi-next" onClick={onNext} disabled={saving}>{nextLabel}</button>
              </div>
            </div>
          </>) : (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <h3 style={{ color: '#16a34a' }}>Section Complete!</h3>
              <p style={{ color: '#64748b' }}>All questions in this section are done.</p>
              <button className="tsi-next" onClick={() => setShowConfirmSubmit(true)}>Finish & Review</button>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="tsi-right2">
          {/* Interviewer */}
          <div className="tsi-panel">
            <div className="tsi-panel-h"><span className="lbl">INTERVIEWER</span><span className="tsi-live">LIVE</span><span className="ico">📶</span><span className="grow"><span className="ico">⛶</span></span></div>
            <div className="tsi-vid">
              {currentSection?.avatarImageUrl
                ? <img src={currentSection.avatarImageUrl} alt="Interviewer" />
                : <div className="ph">🧑‍💼 Interviewer</div>}
              <div className="tsi-vid-ctrls">
                <button className="tsi-vctl" title="Mic">🎤</button>
                <button className="tsi-vctl" title="Camera">🎥</button>
                <button className="tsi-vctl" title="More">⋯</button>
              </div>
            </div>
          </div>

          {/* You */}
          <div className="tsi-panel">
            <div className="tsi-panel-h"><span className="lbl">YOU</span>{camState === 'on' && <span className="tsi-live">LIVE</span>}<span className="grow"><span className="ico">⛶</span></span></div>
            <div className="tsi-vid">
              {camState === 'on'
                ? <video ref={selfViewRef} autoPlay muted playsInline className="self" />
                : <div className="ph">{camState === 'requesting' ? 'Starting camera…' : (recordVideo ? 'Camera off' : 'Camera not used')}</div>}
              {camState === 'on' && <span className="tsi-rec-badge"><span className="tsi-rec-dot" /> REC</span>}
              {recordVideo && camState !== 'on' && <span className="tsi-mute-badge">🔇</span>}
            </div>
            {camState === 'denied' && videoFallback === 'allow_text' && (
              <div style={{ padding: '8px 12px', fontSize: 12, color: '#b45309' }}>Recording unavailable — continuing without video. <button onClick={retryCamera} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button></div>
            )}
          </div>

          {/* Interview controls */}
          <div className="tsi-panel">
            <div className="tsi-ctrls-h">INTERVIEW CONTROLS</div>
            <div className="tsi-ctrls">
              <button className="tsi-ctrl" onClick={() => setTool('notes')}><span className="i">📝</span> Take Notes</button>
              <button className="tsi-ctrl" onClick={() => setTool('calculator')}><span className="i">🧮</span> Calculator</button>
              <button className="tsi-ctrl" onClick={() => setTool('whiteboard')}><span className="i">🖊️</span> Whiteboard</button>
              <button className="tsi-ctrl" onClick={() => setTool('code')}><span className="i">{'</>'}</span> Code Editor</button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom progress */}
      <div className="tsi-bottom">
        <span>{answeredCount} of {totalQ} answered</span>
        <div className="tsi-prog"><div className="tsi-prog-fill" style={{ width: `${progressPct}%` }} /></div>
        <span>{progressPct}%</span>
        <div className="tsi-bottom-right">
          <span><span className="tsi-dot-a">✓</span> Answered ({answeredCount})</span>
          <span><span className="tsi-dot-r">◐</span> Review ({skippedCount})</span>
          <span><span className="tsi-dot-rem">○</span> Remaining ({remainingQ})</span>
        </div>
      </div>

      {/* Tool modals */}
      {tool && (
        <div className="tsi-modal-overlay" onClick={() => setTool('')}>
          <div className="tsi-tool" onClick={e => e.stopPropagation()}>
            <div className="tsi-tool-h">
              {tool === 'notes' ? '📝 Notes' : tool === 'calculator' ? '🧮 Calculator' : tool === 'whiteboard' ? '🖊️ Whiteboard' : '</> Scratch Code'}
              <button onClick={() => setTool('')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8' }}>×</button>
            </div>
            <div className="tsi-tool-b">
              {tool === 'notes' && <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Jot down your thoughts (not submitted)…" />}
              {tool === 'code' && <textarea value={scratchCode} onChange={e => setScratchCode(e.target.value)} placeholder="Scratch code area (not submitted)…" style={{ fontFamily: 'monospace' }} />}
              {tool === 'calculator' && (
                <>
                  <div className="tsi-calc-out">{calcResult || '0'}</div>
                  <input className="tsi-textarea" style={{ minHeight: 'auto', width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontFamily: 'monospace' } as any}
                    value={calcExpr} onChange={e => setCalcExpr(e.target.value)} placeholder="e.g. (12 + 8) * 3" />
                </>
              )}
              {tool === 'whiteboard' && (
                <>
                  <canvas ref={wbRef} width={520} height={320} style={{ border: '1px solid #e2e8f0', borderRadius: 8, width: '100%', background: '#fff', cursor: 'crosshair' }}
                    onMouseDown={wbStart} onMouseMove={wbMove} onMouseUp={wbEnd} onMouseLeave={wbEnd} />
                  <button onClick={wbClear} style={{ marginTop: 10, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>Clear</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Uploading recording overlay */}
      {uploadingRec && (
        <div className="tsi-modal-overlay">
          <div className="tsi-modal" style={{ textAlign: 'center' }}>
            <h3>Saving your interview…</h3>
            <p>Uploading your video recording ({uploadPct}%). Please keep this tab open.</p>
            <div className="tsi-upload-bar"><div className="tsi-upload-fill" style={{ width: `${uploadPct}%` }} /></div>
          </div>
        </div>
      )}

      {/* Confirm Submit */}
      {showConfirmSubmit && (
        <div className="tsi-modal-overlay" onClick={() => setShowConfirmSubmit(false)}>
          <div className="tsi-modal" onClick={e => e.stopPropagation()}>
            <h3>End &amp; Submit Interview?</h3>
            <p>You have answered <strong>{answeredCount}</strong> of <strong>{totalQ}</strong> questions in this section.</p>
            <p>Once submitted, our AI will evaluate your answers and generate your feedback report.</p>
            <div className="tsi-modal-actions">
              <button onClick={() => setShowConfirmSubmit(false)}>Continue Interview</button>
              <button className="tsi-btn-submit" onClick={handleSubmitInterview} disabled={submitting}>{submitting ? 'Submitting…' : 'Confirm Submit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeStructuredInterview;
