import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { classRecordingApi, ClassRecording } from '../../api/classRecordingApi';
import { courseApi } from '../../api';
import './ClassFlow.css';

interface Course { _id: string; title: string; }
interface Subject { _id: string; name: string; }
interface Chapter { _id: string; title: string; }

type Step = 1 | 2 | 3 | 4;
type SessionMode = 'record' | 'upload';
type ReviewTab = 'summary' | 'quiz' | 'notes' | 'practice' | 'assignment';

const PIPELINE_STEPS = [
  { status: 'transcribing',           label: 'Transcribing audio',       icon: '🎙️' },
  { status: 'summarizing',            label: 'Generating summary',        icon: '📋' },
  { status: 'generating_notes',       label: 'Compiling notes',           icon: '📝' },
  { status: 'generating_quiz',        label: 'Creating quiz',             icon: '❓' },
  { status: 'generating_practice',    label: 'Practice problems',         icon: '💪' },
  { status: 'generating_assignment',  label: 'Building assignment',       icon: '📋' },
];

const STATUS_ORDER = ['uploaded', 'transcribing', 'summarizing', 'generating_notes', 'generating_quiz', 'generating_practice', 'generating_assignment', 'completed'];

function getStepState(pipelineStatus: string, recordingStatus: string): 'done' | 'active' | 'pending' {
  const recordingIdx = STATUS_ORDER.indexOf(recordingStatus);
  const stepIdx = STATUS_ORDER.indexOf(pipelineStatus);
  if (stepIdx < recordingIdx) return 'done';
  if (stepIdx === recordingIdx) return 'active';
  return 'pending';
}

const ClassFlowPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Step
  const [step, setStep] = useState<Step>(1);

  // Step 1 form
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [courseId, setCourseId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [classTitle, setClassTitle] = useState('');
  const [learningObjectives, setLearningObjectives] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [sessionMode, setSessionMode] = useState<SessionMode>('record');
  const [formError, setFormError] = useState('');

  // Step 2 — recording
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingError, setRecordingError] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 3 — processing
  const [recordingId, setRecordingId] = useState('');
  const [processingStatus, setProcessingStatus] = useState('uploaded');
  const [processingProgress, setProcessingProgress] = useState(0);

  // Step 4 — review
  const [recordingData, setRecordingData] = useState<ClassRecording | null>(null);
  const [reviewTab, setReviewTab] = useState<ReviewTab>('summary');
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [quizSaved, setQuizSaved] = useState(false);
  const [assignmentSaved, setAssignmentSaved] = useState(false);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'X-Tenant-Id': localStorage.getItem('tenantId') || '',
  }), []);

  // Load courses
  useEffect(() => {
    courseApi.getCourses().then((res: any) => {
      setCourses(Array.isArray(res) ? res : res.data || []);
    }).catch(() => {});
  }, []);

  // Load subjects when course changes
  useEffect(() => {
    if (!courseId) { setSubjects([]); setChapters([]); return; }
    fetch(`/api/v1/subjects?courseId=${courseId}`, { headers: authHeaders() })
      .then(r => r.json()).then(res => setSubjects(Array.isArray(res) ? res : res.data || []))
      .catch(() => {});
  }, [courseId, authHeaders]);

  // Load chapters when subject changes
  useEffect(() => {
    if (!subjectId) { setChapters([]); return; }
    fetch(`/api/v1/chapters?subjectId=${subjectId}`, { headers: authHeaders() })
      .then(r => r.json()).then(res => setChapters(Array.isArray(res) ? res : res.data || []))
      .catch(() => {});
  }, [subjectId, authHeaders]);

  // Poll processing status in step 3
  useEffect(() => {
    if (step !== 3 || !recordingId) return;
    if (['completed', 'failed'].includes(processingStatus)) return;

    const interval = setInterval(async () => {
      try {
        const res = await classRecordingApi.getStatus(recordingId);
        setProcessingStatus(res.data.status);
        setProcessingProgress(res.data.processingProgress);
        if (res.data.status === 'completed') {
          clearInterval(interval);
          setTimeout(() => { setStep(4); loadReviewData(); }, 800);
        }
      } catch {}
    }, 3500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, recordingId, processingStatus]);

  const loadReviewData = useCallback(async () => {
    if (!recordingId) return;
    try {
      const res = await classRecordingApi.getById(recordingId);
      setRecordingData(res.data);
      if (res.data.generatedQuiz?.savedQuizId) setQuizSaved(true);
      if (res.data.generatedAssignment?.savedAssignmentId) setAssignmentSaved(true);
      if (res.data.isPublished) setPublished(true);
    } catch {}
  }, [recordingId]);

  // ── Timer helpers ──
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // ── Step 1 → 2 ──
  const handleStartSetup = () => {
    setFormError('');
    if (!classTitle.trim()) return setFormError('Please enter a class title (Chapter/Topic name).');
    if (!courseId) return setFormError('Please select a course.');
    setStep(2);
  };

  // ── Step 2: Start recording ──
  const startRecording = useCallback(async () => {
    setRecordingError('');
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: true,
      });
      screenStreamRef.current = screenStream;

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      micStreamRef.current = micStream;

      const tracks = [...screenStream.getTracks(), ...(micStream ? micStream.getAudioTracks() : [])];
      const combined = new MediaStream(tracks);
      combinedStreamRef.current = combined;

      if (previewRef.current) {
        previewRef.current.srcObject = screenStream;
        previewRef.current.play().catch(() => {});
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';
      const mr = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 2500000 });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(1000);
      mediaRecorderRef.current = mr;

      setRecording(true);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch (err: any) {
      setRecordingError(err.message || 'Could not start recording. Please allow screen access.');
    }
  }, []);

  const pauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (paused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setPaused(p => !p);
  };

  const stopRecordingAndUpload = useCallback(async () => {
    if (!mediaRecorderRef.current) return;
    setUploading(true);
    setRecordingError('');
    if (timerRef.current) clearInterval(timerRef.current);

    await new Promise<void>(resolve => {
      const mr = mediaRecorderRef.current!;
      mr.onstop = () => resolve();
      mr.stop();
    });

    [screenStreamRef, micStreamRef, combinedStreamRef].forEach(ref => {
      ref.current?.getTracks().forEach(t => t.stop());
      ref.current = null;
    });
    if (previewRef.current) previewRef.current.srcObject = null;

    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    const file = new File([blob], `class-recording-${Date.now()}.webm`, { type: 'video/webm' });
    await doUpload(file);
  }, []);  // eslint-disable-line

  const doUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', classTitle);
    formData.append('courseId', courseId);
    if (subjectId) formData.append('subjectId', subjectId);
    if (chapterId) formData.append('chapterId', chapterId);
    formData.append('duration', String(durationMinutes * 60));
    if (learningObjectives) formData.append('description', learningObjectives);

    try {
      // Use XMLHttpRequest for upload progress
      const token = localStorage.getItem('token') || '';
      const tenantId = localStorage.getItem('tenantId') || '';
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/v1/class-recordings/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('X-Tenant-Id', tenantId);
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      const result = await new Promise<any>((resolve, reject) => {
        xhr.onload = () => {
          try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error('Upload failed')); }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });

      if (!result.success) throw new Error(result.message || 'Upload failed');
      setRecordingId(result.data._id);
      setProcessingStatus('uploaded');
      setProcessingProgress(0);
      setRecording(false);
      setUploading(false);
      setStep(3);
    } catch (err: any) {
      setRecordingError(err.message || 'Upload failed.');
      setUploading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('video/')) return setRecordingError('Please select a video file.');
    setUploadFile(file);
    setRecordingError('');
  };

  const handleUploadSelected = async () => {
    if (!uploadFile) return;
    setUploading(true);
    await doUpload(uploadFile);
  };

  // ── Step 4: Publish ──
  const handlePublish = async () => {
    if (!recordingId) return;
    setPublishing(true);
    try {
      // First save quiz and assignment if not already saved
      if (recordingData?.generatedQuiz?.questions?.length && !quizSaved) {
        try {
          await classRecordingApi.saveQuiz(recordingId);
          setQuizSaved(true);
        } catch {}
      }
      if (recordingData?.generatedAssignment?.title && !assignmentSaved) {
        try {
          await classRecordingApi.saveAssignment(recordingId);
          setAssignmentSaved(true);
        } catch {}
      }
      await classRecordingApi.togglePublish(recordingId);
      setPublished(true);
    } catch (err: any) {
      alert(err.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : 'TR';
  const courseName = courses.find(c => c._id === courseId)?.title || '';
  const subjectName = subjects.find(s => s._id === subjectId)?.name || '';

  return (
    <div className="cf-page">
      {/* Top Bar */}
      <div className="cf-topbar">
        <div className="cf-breadcrumb">
          {step === 1 && <><span>Admin › </span><strong>Create Class</strong></>}
          {step === 2 && <><span>Admin › </span><strong>Record / Upload</strong></>}
          {step === 3 && <><span>Admin › </span><strong>AI Processing</strong></>}
          {step === 4 && <><span>Admin › </span><strong>Review &amp; Publish</strong></>}
        </div>
        <div className="cf-user-badge">
          <span className="cf-role-pill">{user?.role === 'INSTRUCTOR' ? 'Teacher' : 'Admin'}</span>
          <div className="cf-avatar">{initials}</div>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#0b1437' }}>
            {user?.firstName} {user?.lastName}
          </span>
        </div>
      </div>

      {/* ── STEP 1: Create Class ── */}
      {step === 1 && (
        <div className="cf-content">
          <div className="cf-step-label">Step 1 of 4</div>
          <div className="cf-step-title">Create a New Class</div>
          <div className="cf-step-sub">Set up the class details before recording or uploading</div>

          <div className="cf-card">
            <div className="cf-card-title">📚 Class Details</div>

            <div className="row g-3">
              <div className="col-12">
                <div className="cf-label">Course Name <span className="text-danger">*</span></div>
                <select className="cf-select" value={courseId} onChange={e => { setCourseId(e.target.value); setSubjectId(''); setChapterId(''); }}>
                  <option value="">e.g. Full Stack Java</option>
                  {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                </select>
              </div>

              <div className="col-12">
                <div className="cf-label">Subject Name</div>
                <select className="cf-select" value={subjectId} onChange={e => { setSubjectId(e.target.value); setChapterId(''); }} disabled={!courseId}>
                  <option value="">e.g. Core Java</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>

              <div className="col-12">
                <div className="cf-label">Chapter / Topic Name <span className="text-danger">*</span></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="cf-select" value={chapterId} onChange={e => { setChapterId(e.target.value); if (e.target.value) { const ch = chapters.find(c => c._id === e.target.value); if (ch) setClassTitle(ch.title); } }} disabled={!subjectId} style={{ flex: 1 }}>
                    <option value="">Select existing chapter</option>
                    {chapters.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                  </select>
                </div>
                <div style={{ marginTop: 8 }}>
                  <input
                    className="cf-input"
                    placeholder="e.g. Chapter 5 — Polymorphism &amp; Inheritance"
                    value={classTitle}
                    onChange={e => setClassTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-12">
                <div className="cf-label">Learning Objectives (optional)</div>
                <textarea
                  className="cf-textarea"
                  placeholder="What will students understand after this class?"
                  value={learningObjectives}
                  onChange={e => setLearningObjectives(e.target.value)}
                />
              </div>

              <div className="col-6">
                <div className="cf-label">Duration (minutes)</div>
                <input
                  type="number"
                  className="cf-input"
                  value={durationMinutes}
                  min={10}
                  max={300}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                />
              </div>

              <div className="col-6">
                <div className="cf-label">Session Mode</div>
                <select className="cf-select" value={sessionMode} onChange={e => setSessionMode(e.target.value as SessionMode)}>
                  <option value="record">Record Live in Browser</option>
                  <option value="upload">Upload Pre-recorded Video</option>
                </select>
              </div>
            </div>

            {formError && <div className="alert alert-danger mt-3 py-2 small">{formError}</div>}

            <button className="cf-btn-primary mt-4 w-100" onClick={handleStartSetup}>
              {sessionMode === 'record' ? 'Start Recording →' : 'Proceed to Upload →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Record / Upload ── */}
      {step === 2 && (
        <div className="cf-content">
          <div className="cf-step-label">Step 2 of 4 · {classTitle || 'New Chapter'}</div>
          <div className="cf-step-title">Record or Upload</div>
          <div className="cf-step-sub">Record live in the browser or upload a saved video — no third-party tools needed</div>

          {/* Meta row */}
          <div className="cf-meta-row">
            {courseName && <span className="cf-chip">📚 {courseName}</span>}
            {subjectName && <span className="cf-chip">🗂 {subjectName}</span>}
            {classTitle && <span className="cf-chip">📌 {classTitle}</span>}
            <span className="cf-chip">⏱ {durationMinutes} min</span>
          </div>

          {/* Mode switch */}
          <div className="cf-mode-tabs">
            <div className={`cf-mode-tab ${sessionMode === 'record' ? 'active' : ''}`} onClick={() => { setSessionMode('record'); setRecordingError(''); }}>🔴 Record Live</div>
            <div className={`cf-mode-tab ${sessionMode === 'upload' ? 'active' : ''}`} onClick={() => { setSessionMode('upload'); setRecordingError(''); }}>📁 Upload Video</div>
          </div>

          {/* Record Live */}
          {sessionMode === 'record' && (
            <div className="cf-card">
              <div className="cf-recorder">
                {recording && <video ref={previewRef} className="cf-recorder-preview" muted />}
                {!recording && (
                  <>
                    <div style={{ fontSize: 48 }}>🎬</div>
                    <div className="cf-recorder-timer">00:00</div>
                    <div className="cf-recorder-hint">Click to start recording</div>
                  </>
                )}
                {recording && (
                  <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: '6px 14px' }}>
                    {!paused && <span className="cf-recorder-dot" />}
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{formatTime(elapsed)}</span>
                    {paused && <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 600 }}>PAUSED</span>}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14 }} className="text-center">
                <div className="cf-recorder-hint" style={{ color: '#64748b', marginBottom: 16 }}>
                  Recorded locally in your browser · No data leaves your network until you publish
                </div>
                {!recording && !uploading && (
                  <button className="cf-btn-primary" onClick={startRecording}>▶ Start Recording</button>
                )}
                {recording && !uploading && (
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button className="btn btn-outline-secondary" style={{ borderRadius: 10 }} onClick={pauseRecording}>
                      {paused ? '▶ Resume' : '⏸ Pause'}
                    </button>
                    <button className="cf-btn-primary" style={{ background: '#ef4444' }} onClick={stopRecordingAndUpload}>
                      ⏹ Stop &amp; Upload
                    </button>
                  </div>
                )}
                {uploading && (
                  <div className="cf-upload-progress">
                    <div className="cf-upload-label">Uploading… {uploadProgress}%</div>
                    <div className="cf-progress-bar-wrap">
                      <div className="cf-progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
              {recordingError && <div className="alert alert-danger mt-3 py-2 small">{recordingError}</div>}
            </div>
          )}

          {/* Upload */}
          {sessionMode === 'upload' && (
            <div className="cf-card">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
              />
              {!uploadFile && (
                <div
                  className={`cf-drop-zone ${dragging ? 'dragging' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}
                >
                  <div className="cf-drop-icon">📁</div>
                  <div className="cf-drop-title">Drop your video here or click to browse</div>
                  <div className="cf-drop-sub">MP4, WebM, MOV, AVI · Max 2GB</div>
                </div>
              )}
              {uploadFile && !uploading && (
                <div>
                  <div className="cf-chip" style={{ marginBottom: 16, display: 'inline-flex' }}>
                    🎬 {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => setUploadFile(null)}>Remove</button>
                    <button className="cf-btn-primary" onClick={handleUploadSelected}>Upload &amp; Process →</button>
                  </div>
                </div>
              )}
              {uploading && (
                <div className="cf-upload-progress">
                  <div className="cf-upload-label">Uploading… {uploadProgress}%</div>
                  <div className="cf-progress-bar-wrap">
                    <div className="cf-progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
              {recordingError && <div className="alert alert-danger mt-3 py-2 small">{recordingError}</div>}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: AI Processing ── */}
      {step === 3 && (
        <div className="cf-content">
          <div className="cf-process-card">
            <div className="cf-process-header">
              <div className="cf-process-icon">🤖</div>
              <div className="cf-process-title">AI is analysing your class…</div>
              <div className="cf-process-sub">Generating notes, quiz, practice and assignment</div>
            </div>

            {PIPELINE_STEPS.map(ps => {
              const state = getStepState(ps.status, processingStatus);
              return (
                <div key={ps.status} className="cf-pipeline-step">
                  <div className={`cf-pipeline-icon ${state === 'done' ? 'done' : state === 'active' ? 'active' : ''}`}>
                    {state === 'done' ? '✅' : ps.icon}
                  </div>
                  <div className="cf-pipeline-label">{ps.label}</div>
                  <div className={`cf-pipeline-status ${state}`}>
                    {state === 'done' ? 'Done' : state === 'active' ? 'Processing…' : 'Waiting'}
                  </div>
                </div>
              );
            })}

            <div className="cf-progress-bar-wrap">
              <div className="cf-progress-bar-fill" style={{ width: `${processingProgress}%` }} />
            </div>
            <div className="cf-progress-pct">{processingProgress}% complete</div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Review & Publish ── */}
      {step === 4 && recordingData && (
        <div className="cf-content">
          <div className="cf-step-label">Step 4 of 4 · AI-Generated Content</div>
          <div className="cf-step-title">Review &amp; Publish</div>
          <div className="cf-step-sub">Check all AI-generated content before students can access it</div>

          {published ? (
            <div className="cf-card cf-success">
              <div className="cf-success-icon">🎉</div>
              <div className="cf-success-title">Class Published!</div>
              <div className="cf-success-sub">Students can now access the class hub with all content</div>
              <button className="cf-btn-primary mt-4" onClick={() => navigate('/class-hub')}>
                Go to Student View →
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="cf-publish-header">
                <div>
                  <div className="cf-class-name">"{recordingData.title}"</div>
                  <div className="cf-class-meta">
                    {typeof recordingData.courseId === 'object' ? recordingData.courseId?.title : ''}
                    {typeof recordingData.subjectId === 'object' && recordingData.subjectId ? ` · ${recordingData.subjectId.name}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="cf-ai-badge">✓ AI Ready</span>
                  <button className="cf-publish-btn" style={{ width: 'auto', margin: 0, padding: '10px 24px', fontSize: 14 }} onClick={handlePublish} disabled={publishing}>
                    {publishing ? 'Publishing…' : 'Publish to Students →'}
                  </button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="cf-pub-tabs">
                {(['summary', 'quiz', 'notes', 'practice', 'assignment'] as ReviewTab[]).map(t => (
                  <button key={t} className={`cf-pub-tab ${reviewTab === t ? 'active' : ''}`} onClick={() => setReviewTab(t)}>
                    {t === 'summary' ? 'Summary' : t === 'quiz' ? 'Quiz' : t === 'notes' ? 'Notes' : t === 'practice' ? 'Practice' : 'Assignment'}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="cf-review-content">

                {/* Summary */}
                {reviewTab === 'summary' && recordingData.summary && (
                  <div>
                    <div className="fw-bold mb-3" style={{ color: '#0b1437' }}>Chapter Overview</div>
                    <ul className="cf-key-points">
                      {recordingData.summary.keyPoints.map((kp, i) => <li key={i}>{kp}</li>)}
                    </ul>
                    <div className="cf-key-takeaway">
                      <div className="cf-key-takeaway-label">🎯 Key Takeaway</div>
                      <p>{recordingData.summary.overview?.substring(0, 220)}…</p>
                    </div>
                  </div>
                )}
                {reviewTab === 'summary' && !recordingData.summary && <div className="text-muted">No summary available.</div>}

                {/* Quiz */}
                {reviewTab === 'quiz' && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <small className="text-muted">Click an option to check your answer</small>
                      {!quizSaved && (
                        <button className="cf-btn-primary" style={{ padding: '8px 18px', fontSize: 13 }} onClick={async () => { setSavingQuiz(true); try { await classRecordingApi.saveQuiz(recordingId); setQuizSaved(true); } catch {} finally { setSavingQuiz(false); } }} disabled={savingQuiz}>
                          {savingQuiz ? 'Saving…' : '💾 Save Quiz'}
                        </button>
                      )}
                      {quizSaved && <span className="badge bg-success">✓ Saved to Quiz System</span>}
                    </div>
                    {(recordingData.generatedQuiz?.questions || []).map((q, i) => (
                      <ReviewQuizQuestion key={i} index={i} question={q} />
                    ))}
                    {!recordingData.generatedQuiz?.questions?.length && <div className="text-muted">No quiz generated yet.</div>}
                  </div>
                )}

                {/* Notes */}
                {reviewTab === 'notes' && (
                  <div>
                    {((recordingData as any).generatedNotes?.sections || []).map((sec: any, i: number) => (
                      <div key={i} className="cf-note-section">
                        <div className="cf-note-heading">{sec.heading}</div>
                        <div className="cf-note-content">{sec.content}</div>
                      </div>
                    ))}
                    {!((recordingData as any).generatedNotes?.sections?.length) && <div className="text-muted">Notes not generated yet.</div>}
                  </div>
                )}

                {/* Practice */}
                {reviewTab === 'practice' && (
                  <div>
                    {((recordingData as any).generatedPractice?.problems || []).map((prob: any, i: number) => (
                      <div key={i} className="cf-practice-item">
                        <div className="cf-practice-title">Problem {i + 1} — {prob.title}</div>
                        <div className="cf-code-block">{prob.starterCode}</div>
                        <div className="cf-hint">{prob.hint}</div>
                      </div>
                    ))}
                    {!((recordingData as any).generatedPractice?.problems?.length) && <div className="text-muted">Practice problems not generated yet.</div>}
                  </div>
                )}

                {/* Assignment */}
                {reviewTab === 'assignment' && recordingData.generatedAssignment && (
                  <div>
                    <div className="cf-assignment-meta">⏰ Due in 2 days · 100 XP reward on completion</div>
                    <div className="d-flex justify-content-end mb-2">
                      {!assignmentSaved && (
                        <button className="cf-btn-primary" style={{ padding: '8px 18px', fontSize: 13 }} onClick={async () => { setSavingAssignment(true); try { await classRecordingApi.saveAssignment(recordingId); setAssignmentSaved(true); } catch {} finally { setSavingAssignment(false); } }} disabled={savingAssignment}>
                          {savingAssignment ? 'Saving…' : '💾 Save Assignment'}
                        </button>
                      )}
                      {assignmentSaved && <span className="badge bg-success">✓ Saved to Assignments</span>}
                    </div>
                    <div className="cf-task-item">
                      <div className="cf-task-num">1</div>
                      <div>
                        <div className="cf-task-title">{recordingData.generatedAssignment.title}</div>
                        <div className="cf-task-desc" dangerouslySetInnerHTML={{ __html: recordingData.generatedAssignment.description?.substring(0, 300) || '' }} />
                      </div>
                    </div>
                    {recordingData.generatedAssignment.instructions && (
                      <div className="cf-task-item">
                        <div className="cf-task-num">2</div>
                        <div>
                          <div className="cf-task-title">Instructions</div>
                          <div className="cf-task-desc" dangerouslySetInnerHTML={{ __html: recordingData.generatedAssignment.instructions?.substring(0, 300) || '' }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {reviewTab === 'assignment' && !recordingData.generatedAssignment && <div className="text-muted">Assignment not generated yet.</div>}

              </div>

              {/* Publish button at bottom */}
              <button className="cf-publish-btn" onClick={handlePublish} disabled={publishing}>
                {publishing ? 'Publishing…' : 'Publish to Students →'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <div className="cf-bottom-nav">
        {(['Create', 'Record', 'Process', 'Publish'] as const).map((label, i) => (
          <button
            key={label}
            className={`cf-nav-item ${step === (i + 1) as Step ? 'active' : ''}`}
            onClick={() => {
              // Only allow going back or to already-unlocked steps
              if (i + 1 <= step) setStep((i + 1) as Step);
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Sub-component: quiz question with answer reveal ── */
const ReviewQuizQuestion: React.FC<{ index: number; question: any }> = ({ index, question }) => {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="cf-quiz-q">
      <div className="cf-quiz-q-text">Q{index + 1}. {question.question}</div>
      {(question.options || []).map((opt: any, j: number) => (
        <div
          key={j}
          className={`cf-quiz-option ${selected !== null && opt.isCorrect ? 'correct' : ''}`}
          onClick={() => setSelected(j)}
        >
          <span style={{ fontWeight: 600, minWidth: 18 }}>{String.fromCharCode(65 + j)}.</span>
          {opt.text}
        </div>
      ))}
      {selected !== null && question.explanation && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#6650d8', background: '#ede9ff', borderRadius: 8, padding: '8px 12px' }}>
          💡 {question.explanation}
        </div>
      )}
    </div>
  );
};

export default ClassFlowPage;
