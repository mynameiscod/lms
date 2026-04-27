import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { classRecordingApi, ClassRecording } from '../../api/classRecordingApi';
import { courseApi } from '../../api';
import LiveClassroom from './LiveClassroom';
import './ClassFlow.css';

interface Course { _id: string; title: string; }
interface Subject { _id: string; name: string; }
interface Chapter { _id: string; title: string; }

type Step = 1 | 2 | 3 | 4;
type SessionMode = 'record' | 'upload';
type ReviewTab = 'summary' | 'quiz' | 'notes' | 'practice' | 'assignment';

// ── IndexedDB helpers for local chunk backup (survives page reload) ──
const IDB_DB = 'cf_rec_backup';
const IDB_STORE = 'chunks';
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbAppend(idx: number, chunk: Blob): Promise<void> {
  try {
    const db = await idbOpen();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(chunk, idx);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* non-blocking — don't interrupt recording */ }
}
async function idbLoadAll(): Promise<Blob[]> {
  try {
    const db = await idbOpen();
    return new Promise(res => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const items: { key: number; val: Blob }[] = [];
      store.openCursor().onsuccess = (ev: Event) => {
        const cursor = (ev.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) { items.push({ key: cursor.key as number, val: cursor.value as Blob }); cursor.continue(); }
        else res(items.sort((a, b) => a.key - b.key).map(i => i.val));
      };
    });
  } catch { return []; }
}
async function idbClear(): Promise<void> {
  try {
    const db = await idbOpen();
    await new Promise<void>(res => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => res();
    });
  } catch {}
}
async function idbCount(): Promise<number> {
  try {
    const db = await idbOpen();
    return new Promise(res => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).count();
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(0);
    });
  } catch { return 0; }
}

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
  const [batches, setBatches] = useState<{_id: string; name: string}[]>([]);
  const [courseId, setCourseId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [classTitle, setClassTitle] = useState('');
  const [learningObjectives, setLearningObjectives] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [classDate, setClassDate] = useState('');
  const [classTime, setClassTime] = useState('');
  const [classMode, setClassMode] = useState<'live' | 'schedule'>('live');
  const [sessionMode, setSessionMode] = useState<SessionMode>('record');
  const [formError, setFormError] = useState('');

  // Step 2 — recording
  const [recording, setRecording] = useState(false);
  // Step 2 — live session
  const [liveSessionActive, setLiveSessionActive] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState('');
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

  // Step 2 — device selection
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState('default');
  const [selectedCameraId, setSelectedCameraId] = useState('none');
  const [showCameraPip, setShowCameraPip] = useState(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunkIdxRef = useRef(0);
  const pendingUploadRef = useRef<File | null>(null);

  // Step 2 — online / recovery
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasRecovery, setHasRecovery] = useState(false);
  const [uploadPaused, setUploadPaused] = useState(false);

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
  // Step 4 — quiz editing
  const [isEditingQuiz, setIsEditingQuiz] = useState(false);
  const [editedQuizQuestions, setEditedQuizQuestions] = useState<any[]>([]);
  const [savingEditedQuiz, setSavingEditedQuiz] = useState(false);
  // Step 4 — assignment editing
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedInstructions, setEditedInstructions] = useState('');

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

  // Load batches
  useEffect(() => {
    fetch('/api/v1/batches', { headers: authHeaders() })
      .then(r => r.json())
      .then(res => setBatches(Array.isArray(res) ? res : res.data || []))
      .catch(() => {});
  }, [authHeaders]);

  // Enumerate media devices (mics, cameras — including external USB)
  useEffect(() => {
    const enumerate = async () => {
      try {
        // Request permission first so labels are populated
        await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAvailableMics(devices.filter(d => d.kind === 'audioinput'));
        setAvailableCameras(devices.filter(d => d.kind === 'videoinput'));
      } catch {}
    };
    enumerate();
    navigator.mediaDevices.addEventListener('devicechange', enumerate);
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerate);
  }, []);

  // Online / offline detection
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      // Auto-retry upload if one was paused
      if (pendingUploadRef.current && uploadPaused) {
        setUploadPaused(false);
        setUploading(true);
        setRecordingError('');
        doUpload(pendingUploadRef.current);
      }
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadPaused]);

  // Check IDB for unfinished recording on mount
  useEffect(() => {
    idbCount().then(n => { if (n > 0) setHasRecovery(true); });
  }, []);

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

  // ── Generate a short, human-readable session ID ──
  const generateSessionId = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  // ── Step 1 → 2 ──
  const handleStartSetup = () => {
    setFormError('');
    if (!classTitle.trim()) return setFormError('Please enter a class title (Chapter/Topic name).');
    if (!courseId) return setFormError('Please select a course.');
    if (classMode === 'schedule' && !classDate) return setFormError('Please select a scheduled date for the class.');
    setStep(2);
  };

  // ── Step 2: Start recording ──
  const startRecording = useCallback(async () => {
    setRecordingError('');
    chunkIdxRef.current = 0;
    try {
      // 1. Screen share
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: true,
      });
      screenStreamRef.current = screenStream;

      // 2. Microphone (selected device or default)
      const micConstraints: MediaStreamConstraints = selectedMicId === 'default'
        ? { audio: true }
        : { audio: { deviceId: { exact: selectedMicId } } };
      const micStream = await navigator.mediaDevices.getUserMedia(micConstraints).catch(() => null);
      micStreamRef.current = micStream;

      // 3. Camera / external device (if selected)
      let cameraStream: MediaStream | null = null;
      if (selectedCameraId !== 'none') {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCameraId }, width: { ideal: 320 }, height: { ideal: 240 } }
        }).catch(() => null);
      }
      cameraStreamRef.current = cameraStream;
      if (cameraStream && cameraPreviewRef.current) {
        cameraPreviewRef.current.srcObject = cameraStream;
        setShowCameraPip(true);
      }

      // 4. Mix audio sources (system + mic) via AudioContext
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      screenStream.getAudioTracks().forEach(t =>
        audioCtx.createMediaStreamSource(new MediaStream([t])).connect(dest)
      );
      if (micStream) {
        micStream.getAudioTracks().forEach(t =>
          audioCtx.createMediaStreamSource(new MediaStream([t])).connect(dest)
        );
      }

      // 5. Combined stream: screen video + mixed audio
      const combined = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);
      combinedStreamRef.current = combined;

      // 6. MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';
      const mr = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 2500000 });
      chunksRef.current = [];
      mr.ondataavailable = e => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          // Persist chunk to IDB for crash/disconnect recovery (fire-and-forget)
          idbAppend(chunkIdxRef.current++, e.data);
        }
      };
      mr.start(1000);
      mediaRecorderRef.current = mr;

      // Auto-stop if user clicks "Stop sharing" in browser
      screenStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (mediaRecorderRef.current?.state !== 'inactive') stopRecordingAndUpload();
      });

      setRecording(true);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

      requestAnimationFrame(() => {
        if (previewRef.current) {
          previewRef.current.srcObject = screenStream;
          previewRef.current.play().catch(() => {});
        }
      });
    } catch (err: any) {
      setRecordingError(err.message || 'Could not start recording. Please allow screen access.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMicId, selectedCameraId]);

  // ── Start live session + recording together ──
  const startLiveSession = useCallback(async () => {
    setRecordingError('');
    const sid = generateSessionId();
    setLiveSessionId(sid);
    // Start recording (screen share) — open live overlay only if it succeeded
    await startRecording();
    // mediaRecorderRef is set only when recording starts successfully
    if (mediaRecorderRef.current) {
      setLiveSessionActive(true);
    }
  }, [startRecording]);

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

  const doUpload = useCallback(async (file: File, attempt = 0) => {
    // If offline, pause and wait for reconnect
    if (!navigator.onLine) {
      pendingUploadRef.current = file;
      setUploadPaused(true);
      setUploading(false);
      setRecordingError('📶 No internet — recording is saved locally and will upload automatically when you reconnect.');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', classTitle);
    formData.append('courseId', courseId);
    if (subjectId) formData.append('subjectId', subjectId);
    if (chapterId) formData.append('chapterId', chapterId);
    if (batchId) formData.append('batchId', batchId);
    formData.append('duration', String(durationMinutes * 60));
    if (learningObjectives) formData.append('description', learningObjectives);
    if (classMode === 'schedule' && classDate) {
      const scheduledAt = classTime ? `${classDate}T${classTime}:00` : `${classDate}T00:00:00`;
      formData.append('scheduledAt', scheduledAt);
    }

    try {
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
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));
        xhr.timeout = 0; // no timeout for large files
        xhr.send(formData);
      });

      if (!result.success) throw new Error(result.message || 'Upload failed');
      // Success — clear IDB backup
      await idbClear();
      pendingUploadRef.current = null;
      setHasRecovery(false);
      setRecordingId(result.data._id);
      setProcessingStatus('uploaded');
      setProcessingProgress(0);
      setRecording(false);
      setUploading(false);
      setUploadPaused(false);
      // Recording saved — go back to all recordings list
      navigate('/admin/class-recordings');
    } catch (err: any) {
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
        setRecordingError(`Upload failed — retrying in ${delay / 1000}s… (${attempt + 1}/3)`);
        setTimeout(() => doUpload(file, attempt + 1), delay);
      } else {
        // Store for reconnect retry
        pendingUploadRef.current = file;
        setUploadPaused(true);
        setUploading(false);
        setRecordingError('⚠️ Upload failed after 3 attempts. Your recording is saved locally — reconnect internet to retry.');
      }
    }
  }, [classTitle, courseId, subjectId, chapterId, durationMinutes, learningObjectives, batchId, classDate, classMode, classTime]);

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

    // Stop all streams
    [screenStreamRef, micStreamRef, combinedStreamRef, cameraStreamRef].forEach(ref => {
      ref.current?.getTracks().forEach(t => t.stop());
      ref.current = null;
    });
    if (previewRef.current) previewRef.current.srcObject = null;
    if (cameraPreviewRef.current) cameraPreviewRef.current.srcObject = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setShowCameraPip(false);

    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    const file = new File([blob], `class-recording-${Date.now()}.webm`, { type: 'video/webm' });
    pendingUploadRef.current = file;
    await doUpload(file);
  }, [doUpload]);

  // Recover from IDB after crash / disconnect during recording
  const handleRecoverFromIDB = async () => {
    setRecordingError('');
    setUploading(true);
    setUploadProgress(0);
    const chunks = await idbLoadAll();
    if (chunks.length === 0) { setHasRecovery(false); setUploading(false); return; }
    const blob = new Blob(chunks, { type: 'video/webm' });
    const file = new File([blob], `recovered-recording-${Date.now()}.webm`, { type: 'video/webm' });
    pendingUploadRef.current = file;
    await doUpload(file);
    setHasRecovery(false);
  };

  const handleFileSelect = (file: File) => {    if (!file.type.startsWith('video/')) return setRecordingError('Please select a video file.');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className="cf-back-btn"
            onClick={() => {
              if (step > 1 && step < 3) setStep((step - 1) as Step);
              else navigate('/admin/class-recordings');
            }}
            title={step > 1 && step < 3 ? 'Go back one step' : 'Back to All Recordings'}
          >
            ← {step > 1 && step < 3 ? 'Back' : 'All Recordings'}
          </button>
          <div className="cf-breadcrumb">
            {step === 1 && <><span>Admin › </span><strong>Create Class</strong></>}
            {step === 2 && <><span>Admin › </span><strong>Record / Upload</strong></>}
            {step === 3 && <><span>Admin › </span><strong>AI Processing</strong></>}
            {step === 4 && <><span>Admin › </span><strong>Review &amp; Publish</strong></>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="cf-user-badge">
            <span className="cf-role-pill">{user?.role === 'INSTRUCTOR' ? 'Teacher' : 'Admin'}</span>
            <div className="cf-avatar">{initials}</div>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#0b1437' }}>
              {user?.firstName} {user?.lastName}
            </span>
          </div>
          <button
            className="cf-exit-btn"
            onClick={() => navigate('/admin/class-recordings')}
            title="Exit to All Recordings"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Step Nav (top) ── */}
      <div className="cf-step-nav">
        {(['Create', 'Record', 'Process', 'Publish'] as const).map((label, i) => (
          <button
            key={label}
            className={`cf-step-nav-item ${step === (i + 1) as Step ? 'active' : ''} ${i + 1 < step ? 'done' : ''}`}
            onClick={() => { if (i + 1 <= step) setStep((i + 1) as Step); }}
          >
            <span className="cf-step-nav-num">{i + 1 < step ? '✓' : i + 1}</span>
            <span>{label}</span>
          </button>
        ))}
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
                <div className="cf-label">Batch (optional)</div>
                <select className="cf-select" value={batchId} onChange={e => setBatchId(e.target.value)}>
                  <option value="">All students / No batch</option>
                  {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>

              <div className="col-6">
                <div className="cf-label">Session Mode</div>
                <select className="cf-select" value={sessionMode} onChange={e => setSessionMode(e.target.value as SessionMode)}>
                  <option value="record">Record Live in Browser</option>
                  <option value="upload">Upload Pre-recorded Video</option>
                </select>
              </div>

              {/* Schedule toggle */}
              <div className="col-12">
                <div className="cf-label">Class Timing</div>
                <div className="cf-mode-tabs" style={{ marginBottom: 0 }}>
                  <div className={`cf-mode-tab ${classMode === 'live' ? 'active' : ''}`} onClick={() => setClassMode('live')}>
                    🔴 Start Now (Live)
                  </div>
                  <div className={`cf-mode-tab ${classMode === 'schedule' ? 'active' : ''}`} onClick={() => setClassMode('schedule')}>
                    📅 Schedule for Later
                  </div>
                </div>
              </div>

              {classMode === 'schedule' && (
                <>
                  <div className="col-6">
                    <div className="cf-label">Class Date <span className="text-danger">*</span></div>
                    <input
                      type="date"
                      className="cf-input"
                      value={classDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setClassDate(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <div className="cf-label">Class Time</div>
                    <input
                      type="time"
                      className="cf-input"
                      value={classTime}
                      onChange={e => setClassTime(e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <div className="alert alert-info py-2 small" style={{ borderRadius: 10 }}>
                      📅 This class is scheduled for <strong>{classDate ? new Date(classDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '—'}</strong>
                      {classTime ? ` at ${classTime}` : ''}. You can upload the recording after the session.
                    </div>
                  </div>
                </>
              )}
            </div>

            {formError && <div className="alert alert-danger mt-3 py-2 small">{formError}</div>}

            <button className="cf-btn-primary mt-4 w-100" onClick={handleStartSetup}>
              {classMode === 'schedule' ? '📅 Schedule Class →' : sessionMode === 'record' ? 'Start Recording →' : 'Proceed to Upload →'}
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

          {/* Offline/paused upload banner */}
          {!isOnline && (
            <div className="cf-offline-banner">
              <span>📶</span>
              <strong>You're offline.</strong>
              <span>Recording continues locally. Upload will auto-resume when internet is restored.</span>
            </div>
          )}
          {isOnline && uploadPaused && pendingUploadRef.current && (
            <div className="cf-recovery-banner" style={{ background: '#fff7ed', borderColor: '#fb923c' }}>
              <span>🔄</span>
              <strong>Ready to resume upload.</strong>
              <button className="cf-btn-primary" style={{ padding: '6px 16px', fontSize: 13 }} onClick={() => {
                setUploadPaused(false); setUploading(true); setRecordingError('');
                doUpload(pendingUploadRef.current!);
              }}>Upload Now</button>
            </div>
          )}

          {/* Recovery from crashed/disconnected session */}
          {hasRecovery && !recording && !uploading && (
            <div className="cf-recovery-banner">
              <span>💾</span>
              <strong>Unsaved recording found!</strong>
              <span>Looks like a previous recording was interrupted. Recover and upload it?</span>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="cf-btn-primary" style={{ padding: '6px 16px', fontSize: 13 }} onClick={handleRecoverFromIDB}>Recover &amp; Upload</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => { idbClear(); setHasRecovery(false); }}>Discard</button>
              </div>
            </div>
          )}

          {/* Record Live */}
          {sessionMode === 'record' && (
            <div className="cf-card">
              {/* Device setup — shown before recording starts */}
              {!recording && !uploading && (
                <div className="cf-device-setup">
                  <div className="cf-device-setup-title">🎛️ Configure Recording Sources</div>
                  <div className="cf-device-grid">

                    <div className="cf-device-row">
                      <div className="cf-device-icon">🖥️</div>
                      <div className="cf-device-info">
                        <div className="cf-device-label">Screen / Whiteboard</div>
                        <div className="cf-device-sub">Share your entire screen, a window, or a browser tab. External HDMI whiteboards appear as a display.</div>
                      </div>
                      <span className="cf-device-badge ready">Auto</span>
                    </div>

                    <div className="cf-device-row">
                      <div className="cf-device-icon">🎙️</div>
                      <div className="cf-device-info">
                        <div className="cf-device-label">Microphone</div>
                        <select
                          className="cf-device-select"
                          value={selectedMicId}
                          onChange={e => setSelectedMicId(e.target.value)}
                        >
                          <option value="default">Default microphone</option>
                          {availableMics.map(m => (
                            <option key={m.deviceId} value={m.deviceId}>
                              {m.label || `Microphone ${m.deviceId.slice(0, 6)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="cf-device-badge ready">✓</span>
                    </div>

                    <div className="cf-device-row">
                      <div className="cf-device-icon">📷</div>
                      <div className="cf-device-info">
                        <div className="cf-device-label">Camera (PiP overlay)</div>
                        <div className="cf-device-sub" style={{ marginBottom: 6 }}>Front camera, USB webcam, or document camera (whiteboard cam)</div>
                        <select
                          className="cf-device-select"
                          value={selectedCameraId}
                          onChange={e => setSelectedCameraId(e.target.value)}
                        >
                          <option value="none">No camera</option>
                          {availableCameras.map(c => (
                            <option key={c.deviceId} value={c.deviceId}>
                              {c.label || `Camera ${c.deviceId.slice(0, 6)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className={`cf-device-badge ${selectedCameraId !== 'none' ? 'ready' : 'off'}`}>
                        {selectedCameraId !== 'none' ? '✓' : 'Off'}
                      </span>
                    </div>

                    {availableMics.length === 0 && availableCameras.length === 0 && (
                      <div className="alert alert-info py-2 small mb-0" style={{ borderRadius: 10 }}>
                        🔌 No external devices detected. Connect a USB microphone, webcam, or document camera — they'll appear in the lists above automatically.
                      </div>
                    )}
                  </div>

                  <div className="cf-record-hint">
                    <span>💡</span>
                    <span>For best quality, share <strong>Entire Screen</strong> when prompted. The camera overlay will be visible in the recording if sharing the full screen.</span>
                  </div>
                </div>
              )}

              <div className="cf-recorder" style={{ position: 'relative' }}>
                <video
                  ref={previewRef}
                  className="cf-recorder-preview"
                  muted
                  style={{ display: recording ? 'block' : 'none' }}
                />
                {/* Camera PiP overlay */}
                {showCameraPip && (
                  <div className="cf-camera-pip">
                    <video ref={cameraPreviewRef} autoPlay muted playsInline className="cf-camera-pip-video" />
                    <div className="cf-camera-pip-label">📷 Camera</div>
                  </div>
                )}
                {!recording && (
                  <>
                    <div style={{ fontSize: 48 }}>🎬</div>
                    <div className="cf-recorder-timer">00:00</div>
                    <div className="cf-recorder-hint">Configure sources above, then click Start Recording</div>
                  </>
                )}
                {recording && (
                  <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: '6px 14px' }}>
                    {!paused && <span className="cf-recorder-dot" />}
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{formatTime(elapsed)}</span>
                    {paused && <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 600 }}>PAUSED</span>}
                    {!isOnline && <span style={{ color: '#fb923c', fontSize: 12, fontWeight: 600 }}>📶 OFFLINE — saving locally</span>}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14 }} className="text-center">
                <div className="cf-recorder-hint" style={{ color: '#64748b', marginBottom: 16 }}>
                  Recorded locally in your browser · Saved to disk if connection drops
                </div>
                {!recording && !uploading && (
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="cf-btn-primary" onClick={startRecording}>▶ Start Recording</button>
                    <button
                      className="cf-btn-primary"
                      style={{ background: 'linear-gradient(135deg,#ef4444,#f97316)' }}
                      onClick={startLiveSession}
                      title="Record + invite students to join live"
                    >
                      🔴 Go Live + Record
                    </button>
                  </div>
                )}
                {recording && !uploading && (
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
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
                    <div className="cf-upload-label">
                      {uploadPaused ? '📶 Waiting for internet…' : `Uploading… ${uploadProgress}%`}
                    </div>
                    {!uploadPaused && (
                      <div className="cf-progress-bar-wrap">
                        <div className="cf-progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
              {recordingError && <div className="alert alert-warning mt-3 py-2 small">{recordingError}</div>}
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
                    <button className="cf-btn-primary" onClick={handleUploadSelected}>💾 Save Recording →</button>
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
          <div className="cf-step-label">Step 4 of 4 · {recordingData.status === 'uploaded' ? 'Saved Recording' : 'AI-Generated Content'}</div>
          <div className="cf-step-title">Review &amp; Publish</div>
          <div className="cf-step-sub">
            {recordingData.status === 'uploaded'
              ? 'Your recording is saved. Publish it now or run AI processing to auto-generate notes, quiz and more.'
              : 'Check all AI-generated content before students can access it'
            }
          </div>

          {/* Process-later banner — shown when AI hasn't run yet */}
          {(recordingData.status === 'uploaded' || recordingData.status === 'failed') && !published && (
            <div className="cf-recovery-banner" style={{ background: '#f0f9ff', borderColor: '#7dd3fc', color: '#0369a1', marginBottom: 20 }}>
              <span>🤖</span>
              <div style={{ flex: 1 }}>
                <strong>AI processing not yet started.</strong>
                {' '}Run it now to auto-generate transcript, summary, notes, quiz and assignments.
              </div>
              <button
                className="cf-btn-primary"
                style={{ padding: '7px 18px', fontSize: 13, flexShrink: 0 }}
                onClick={() => {
                  setProcessingStatus('uploaded');
                  setProcessingProgress(0);
                  setStep(3);
                }}
              >
                🚀 Process with AI
              </button>
            </div>
          )}

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
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                      <div>
                        <strong style={{ color: '#0b1437' }}>
                          {isEditingQuiz ? 'Editing Quiz' : `Quiz — ${(recordingData.generatedQuiz?.questions || []).length} Questions`}
                        </strong>
                        {!isEditingQuiz && <small className="text-muted ms-2">Click an option to preview answers</small>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {!isEditingQuiz && (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            style={{ borderRadius: 8 }}
                            onClick={() => {
                              const qs = (recordingData.generatedQuiz?.questions || []).map(q => ({
                                question: q.question,
                                explanation: q.explanation,
                                difficulty: q.difficulty,
                                options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect }))
                              }));
                              setEditedQuizQuestions(qs);
                              setIsEditingQuiz(true);
                            }}
                          >
                            ✏️ Edit Quiz
                          </button>
                        )}
                        {isEditingQuiz && (
                          <>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              style={{ borderRadius: 8 }}
                              onClick={() => {
                                setEditedQuizQuestions(prev => [...prev, {
                                  question: 'New question?',
                                  explanation: '',
                                  difficulty: 'medium',
                                  options: [
                                    { text: 'Option A', isCorrect: true },
                                    { text: 'Option B', isCorrect: false },
                                    { text: 'Option C', isCorrect: false },
                                    { text: 'Option D', isCorrect: false },
                                  ]
                                }]);
                              }}
                            >
                              + Add Question
                            </button>
                            <button
                              className="cf-btn-primary btn-sm"
                              style={{ padding: '6px 16px', fontSize: 13, borderRadius: 8 }}
                              disabled={savingEditedQuiz}
                              onClick={async () => {
                                setSavingEditedQuiz(true);
                                try {
                                  await classRecordingApi.update(recordingId, {
                                    generatedQuiz: { questions: editedQuizQuestions }
                                  } as any);
                                  await loadReviewData();
                                  setIsEditingQuiz(false);
                                } catch {}
                                finally { setSavingEditedQuiz(false); }
                              }}
                            >
                              {savingEditedQuiz ? 'Saving…' : '💾 Save Changes'}
                            </button>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              style={{ borderRadius: 8 }}
                              onClick={() => setIsEditingQuiz(false)}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {!isEditingQuiz && !quizSaved && (
                          <button className="cf-btn-primary" style={{ padding: '8px 18px', fontSize: 13, borderRadius: 8 }} onClick={async () => { setSavingQuiz(true); try { await classRecordingApi.saveQuiz(recordingId); setQuizSaved(true); } catch {} finally { setSavingQuiz(false); } }} disabled={savingQuiz}>
                            {savingQuiz ? 'Saving…' : '💾 Save to Quiz System'}
                          </button>
                        )}
                        {quizSaved && <span className="badge bg-success align-self-center">✓ Saved to Quiz System</span>}
                      </div>
                    </div>

                    {isEditingQuiz ? (
                      <div>
                        {editedQuizQuestions.map((q, qi) => (
                          <div key={qi} className="cf-quiz-q" style={{ borderLeft: '3px solid #6650d8', paddingLeft: 12 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                              <span style={{ minWidth: 24, fontWeight: 700, color: '#6650d8', marginTop: 8 }}>Q{qi + 1}</span>
                              <textarea
                                className="cf-textarea"
                                style={{ minHeight: 54, flex: 1 }}
                                value={q.question}
                                onChange={e => setEditedQuizQuestions(prev => prev.map((x, i) => i === qi ? { ...x, question: e.target.value } : x))}
                              />
                              <button
                                className="btn btn-sm btn-outline-danger"
                                style={{ borderRadius: 8, flexShrink: 0, marginTop: 4 }}
                                onClick={() => setEditedQuizQuestions(prev => prev.filter((_, i) => i !== qi))}
                              >
                                🗑
                              </button>
                            </div>
                            {q.options.map((opt: any, oi: number) => (
                              <div key={oi} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center', paddingLeft: 32 }}>
                                <input
                                  type="radio"
                                  name={`q${qi}-correct`}
                                  checked={opt.isCorrect}
                                  onChange={() => setEditedQuizQuestions(prev => prev.map((x, i) => i === qi
                                    ? { ...x, options: x.options.map((o: any, j: number) => ({ ...o, isCorrect: j === oi })) }
                                    : x))}
                                  style={{ cursor: 'pointer', flexShrink: 0 }}
                                  title="Mark as correct"
                                />
                                <input
                                  className="cf-input"
                                  style={{ flex: 1, padding: '6px 10px' }}
                                  value={opt.text}
                                  onChange={e => setEditedQuizQuestions(prev => prev.map((x, i) => i === qi
                                    ? { ...x, options: x.options.map((o: any, j: number) => j === oi ? { ...o, text: e.target.value } : o) }
                                    : x))}
                                />
                              </div>
                            ))}
                            <div style={{ paddingLeft: 32, marginTop: 4 }}>
                              <input
                                className="cf-input"
                                style={{ fontSize: 12, padding: '5px 10px', background: '#fffbeb', borderColor: '#fde68a' }}
                                placeholder="Explanation (optional)"
                                value={q.explanation || ''}
                                onChange={e => setEditedQuizQuestions(prev => prev.map((x, i) => i === qi ? { ...x, explanation: e.target.value } : x))}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {(recordingData.generatedQuiz?.questions || []).map((q, i) => (
                          <ReviewQuizQuestion key={i} index={i} question={q} />
                        ))}
                        {!recordingData.generatedQuiz?.questions?.length && <div className="text-muted">No quiz generated yet.</div>}
                      </>
                    )}
                  </div>
                )}

                {/* Notes */}
                {reviewTab === 'notes' && (
                  <div>
                    {((recordingData as any).generatedNotes?.sections || []).map((sec: any, i: number) => (
                      <div key={i} className="cf-note-card">
                        <div className="cf-note-num">{i + 1}</div>
                        <div className="cf-note-body">
                          <div className="cf-note-heading">{sec.heading}</div>
                          <div className="cf-note-lines">
                            {sec.content.split('\n').filter((l: string) => l.trim()).map((line: string, li: number) => (
                              <div key={li} className="cf-note-line">
                                <span className="cf-note-bullet">▸</span>
                                <span>{line.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
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
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                      <strong style={{ color: '#0b1437' }}>
                        {isEditingAssignment ? 'Editing Assignment' : 'Assignment Details'}
                      </strong>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {!isEditingAssignment && (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            style={{ borderRadius: 8 }}
                            onClick={() => {
                              setEditedTitle(recordingData.generatedAssignment?.title || '');
                              setEditedDescription(recordingData.generatedAssignment?.description || '');
                              setEditedInstructions(recordingData.generatedAssignment?.instructions || '');
                              setIsEditingAssignment(true);
                            }}
                          >
                            ✏️ Edit Assignment
                          </button>
                        )}
                        {isEditingAssignment && (
                          <>
                            <button
                              className="cf-btn-primary btn-sm"
                              style={{ padding: '6px 16px', fontSize: 13, borderRadius: 8 }}
                              onClick={async () => {
                                try {
                                  await classRecordingApi.update(recordingId, {
                                    generatedAssignment: {
                                      ...recordingData.generatedAssignment,
                                      title: editedTitle,
                                      description: editedDescription,
                                      instructions: editedInstructions,
                                    }
                                  } as any);
                                  await loadReviewData();
                                  setIsEditingAssignment(false);
                                } catch {}
                              }}
                            >
                              💾 Save Changes
                            </button>
                            <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: 8 }} onClick={() => setIsEditingAssignment(false)}>
                              Cancel
                            </button>
                          </>
                        )}
                        {!assignmentSaved && !isEditingAssignment && (
                          <button className="cf-btn-primary" style={{ padding: '8px 18px', fontSize: 13, borderRadius: 8 }} onClick={async () => { setSavingAssignment(true); try { await classRecordingApi.saveAssignment(recordingId); setAssignmentSaved(true); } catch {} finally { setSavingAssignment(false); } }} disabled={savingAssignment}>
                            {savingAssignment ? 'Saving…' : '💾 Save to Assignments'}
                          </button>
                        )}
                        {assignmentSaved && <span className="badge bg-success align-self-center">✓ Saved to Assignments</span>}
                      </div>
                    </div>

                    {isEditingAssignment ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                          <div className="cf-label">Assignment Title</div>
                          <input className="cf-input" value={editedTitle} onChange={e => setEditedTitle(e.target.value)} />
                        </div>
                        <div>
                          <div className="cf-label">Description</div>
                          <textarea className="cf-textarea" style={{ minHeight: 100 }} value={editedDescription} onChange={e => setEditedDescription(e.target.value)} />
                        </div>
                        <div>
                          <div className="cf-label">Instructions</div>
                          <textarea className="cf-textarea" style={{ minHeight: 80 }} value={editedInstructions} onChange={e => setEditedInstructions(e.target.value)} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="cf-task-item">
                          <div className="cf-task-num">1</div>
                          <div>
                            <div className="cf-task-title">{recordingData.generatedAssignment.title}</div>
                            <div className="cf-task-desc" dangerouslySetInnerHTML={{ __html: recordingData.generatedAssignment.description?.substring(0, 500) || '' }} />
                          </div>
                        </div>
                        {recordingData.generatedAssignment.instructions && (
                          <div className="cf-task-item">
                            <div className="cf-task-num">2</div>
                            <div>
                              <div className="cf-task-title">Instructions</div>
                              <div className="cf-task-desc" dangerouslySetInnerHTML={{ __html: recordingData.generatedAssignment.instructions?.substring(0, 500) || '' }} />
                            </div>
                          </div>
                        )}
                      </>
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

      {/* ── Live Classroom overlay ── */}
      {liveSessionActive && liveSessionId && (
        <LiveClassroom
          sessionId={liveSessionId}
          classTitle={classTitle || 'Live Class'}
          role="host"
          recordingState={paused ? 'paused' : recording ? 'recording' : 'stopped'}
          elapsed={elapsed}
          onRecordingAction={(action) => {
            if (action === 'pause' || action === 'resume') pauseRecording();
            if (action === 'stop') stopRecordingAndUpload();
          }}
          onClose={() => setLiveSessionActive(false)}
        />
      )}
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
