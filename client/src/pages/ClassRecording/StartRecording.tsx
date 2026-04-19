import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { classRecordingApi } from '../../api/classRecordingApi';
import { courseApi } from '../../api';
import './ClassRecording.css';

interface Course { _id: string; title: string; }
interface Subject { _id: string; name: string; }
interface Chapter { _id: string; title: string; }

const StartRecording: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Courses / subjects / chapters
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [title, setTitle] = useState('');

  // Recording state
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Load courses on mount
  useEffect(() => {
    courseApi.getCourses().then((res: any) => {
      const list = Array.isArray(res) ? res : res.data || [];
      setCourses(list);
    }).catch(() => {});
  }, []);

  // Load subjects when course changes
  useEffect(() => {
    if (!selectedCourse) { setSubjects([]); setChapters([]); return; }
    fetch(`/api/v1/subjects?courseId=${selectedCourse}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Tenant-Id': localStorage.getItem('tenantId') || ''
      }
    }).then(r => r.json()).then(res => {
      setSubjects(Array.isArray(res) ? res : res.data || []);
    }).catch(() => {});
  }, [selectedCourse]);

  // Load chapters when subject changes
  useEffect(() => {
    if (!selectedSubject) { setChapters([]); return; }
    fetch(`/api/v1/chapters?subjectId=${selectedSubject}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Tenant-Id': localStorage.getItem('tenantId') || ''
      }
    }).then(r => r.json()).then(res => {
      setChapters(Array.isArray(res) ? res : res.data || []);
    }).catch(() => {});
  }, [selectedSubject]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    setError('');
    setPermissionDenied(false);

    if (!title.trim()) { setError('Please enter a class title'); return; }
    if (!selectedCourse) { setError('Please select a course'); return; }

    try {
      // 1. Request screen share (entire screen)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: true // system audio
      });
      screenStreamRef.current = screenStream;

      // 2. Request microphone
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;
      } catch (e) {
        console.warn('Microphone not available, continuing without mic');
      }

      // 3. Optional camera
      let cameraStream: MediaStream | null = null;
      if (showCamera) {
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: 'user' }
          });
          cameraStreamRef.current = cameraStream;
          if (cameraPreviewRef.current) {
            cameraPreviewRef.current.srcObject = cameraStream;
          }
        } catch (e) {
          console.warn('Camera not available');
        }
      }

      // 4. Combine streams
      const audioContext = new AudioContext();
      const dest = audioContext.createMediaStreamDestination();

      // Add screen audio tracks
      screenStream.getAudioTracks().forEach(track => {
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        source.connect(dest);
      });

      // Add mic audio
      if (micStream) {
        micStream.getAudioTracks().forEach(track => {
          const source = audioContext.createMediaStreamSource(new MediaStream([track]));
          source.connect(dest);
        });
      }

      // Combined stream: screen video + mixed audio
      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      // Preview
      if (previewRef.current) {
        previewRef.current.srcObject = combinedStream;
      }

      // 5. Start MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Handle screen share stop (user clicks "Stop sharing" in browser)
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        if (mediaRecorderRef.current?.state !== 'inactive') {
          stopRecording();
        }
      });

      recorder.start(1000); // collect data every second
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setPaused(false);
      setElapsed(0);

      // Timer
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);

    } catch (err: any) {
      console.error('Recording start error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Screen sharing permission denied. Please allow screen access and select "Entire Screen".');
      } else {
        setError(err.message || 'Failed to start recording');
      }
    }
  }, [title, selectedCourse, showCamera]);

  const togglePause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === 'recording') {
      recorder.pause();
      setPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (recorder.state === 'paused') {
      recorder.resume();
      setPaused(false);
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        // Stop timer
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

        // Stop all streams
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        micStreamRef.current?.getTracks().forEach(t => t.stop());
        cameraStreamRef.current?.getTracks().forEach(t => t.stop());

        setRecording(false);
        setPaused(false);

        // Create video blob
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        if (blob.size === 0) {
          setError('Recording is empty. Please try again.');
          resolve();
          return;
        }

        // Upload
        setUploading(true);
        setUploadProgress(0);

        try {
          const formData = new FormData();
          formData.append('video', blob, `class-recording-${Date.now()}.webm`);
          formData.append('title', title);
          formData.append('courseId', selectedCourse);
          if (selectedSubject) formData.append('subjectId', selectedSubject);
          if (selectedChapter) formData.append('chapterId', selectedChapter);
          formData.append('duration', String(elapsed));

          const result = await classRecordingApi.upload(formData);
          setUploading(false);

          if (result.success) {
            navigate(`/admin/class-recordings/${result.data._id}`);
          }
        } catch (err: any) {
          setUploading(false);
          setError(err.message || 'Upload failed. Please try again.');
        }
        resolve();
      };

      if (recorder.state !== 'inactive') {
        recorder.stop();
      } else {
        resolve();
      }
    });
  }, [title, selectedCourse, selectedSubject, selectedChapter, elapsed, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="cr-page">
      <div className="cr-header">
        <h1><i className="fa-solid fa-video"></i> Smart Classroom Recording</h1>
        <p>Record your entire screen, microphone, and optional camera overlay</p>
      </div>

      {/* Error display */}
      {error && (
        <div className={`cr-alert ${permissionDenied ? 'cr-alert-warn' : 'cr-alert-error'}`}>
          <i className={`fa-solid ${permissionDenied ? 'fa-triangle-exclamation' : 'fa-circle-xmark'}`}></i>
          <span>{error}</span>
          <button onClick={() => setError('')}><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      {/* Recording indicator */}
      {recording && (
        <div className="cr-live-bar">
          <span className="cr-live-dot"></span>
          <span className="cr-live-label">{paused ? 'PAUSED' : 'LIVE RECORDING'}</span>
          <span className="cr-live-timer">{formatTime(elapsed)}</span>
        </div>
      )}

      {/* Setup form (shown when not recording) */}
      {!recording && !uploading && (
        <div className="cr-setup">
          <div className="cr-form-grid">
            <div className="cr-field">
              <label>Class Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Java Arrays - Day 5"
              />
            </div>
            <div className="cr-field">
              <label>Course *</label>
              <select value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSubject(''); setSelectedChapter(''); }}>
                <option value="">Select course</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>
            <div className="cr-field">
              <label>Subject</label>
              <select value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setSelectedChapter(''); }} disabled={!selectedCourse}>
                <option value="">Select subject (optional)</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="cr-field">
              <label>Chapter</label>
              <select value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)} disabled={!selectedSubject}>
                <option value="">Select chapter (optional)</option>
                {chapters.map(ch => <option key={ch._id} value={ch._id}>{ch.title}</option>)}
              </select>
            </div>
          </div>

          <div className="cr-options">
            <label className="cr-toggle">
              <input type="checkbox" checked={showCamera} onChange={(e) => setShowCamera(e.target.checked)} />
              <span className="cr-toggle-slider"></span>
              <span>Include camera overlay</span>
            </label>
          </div>

          <div className="cr-info-box">
            <i className="fa-solid fa-circle-info"></i>
            <div>
              <strong>How it works:</strong>
              <ul>
                <li>Click "Start Class" and select <strong>Entire Screen</strong> when prompted</li>
                <li>Your screen, microphone, and optionally camera will be recorded</li>
                <li>Click "End Class" when done — the video will upload and AI will auto-generate a summary, quiz, and assignment</li>
              </ul>
            </div>
          </div>

          <button className="cr-start-btn" onClick={startRecording}>
            <i className="fa-solid fa-circle-dot"></i>
            Start Class
          </button>
        </div>
      )}

      {/* Preview while recording */}
      {recording && (
        <div className="cr-preview-area">
          <div className="cr-preview-container">
            <video ref={previewRef} autoPlay muted playsInline className="cr-screen-preview" />
            {showCamera && cameraStreamRef.current && (
              <video ref={cameraPreviewRef} autoPlay muted playsInline className="cr-camera-overlay" />
            )}
          </div>

          <div className="cr-controls">
            <button className="cr-ctrl-btn cr-pause" onClick={togglePause}>
              <i className={`fa-solid ${paused ? 'fa-play' : 'fa-pause'}`}></i>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button className="cr-ctrl-btn cr-stop" onClick={stopRecording}>
              <i className="fa-solid fa-stop"></i>
              End Class
            </button>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="cr-uploading">
          <div className="cr-upload-spinner"></div>
          <h3>Uploading Recording...</h3>
          <p>Please don't close this tab. The video is being uploaded and processing will begin automatically.</p>
          <div className="cr-upload-bar">
            <div className="cr-upload-bar-fill" style={{ width: `${uploadProgress || 50}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartRecording;
