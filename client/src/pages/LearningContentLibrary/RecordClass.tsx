import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as tus from 'tus-js-client';
import { learningContentLibraryApi } from '../../api/learningContentLibraryApi';
import { newSessionId, logRecording } from '../../api/recordingLogApi';
import { rbStart, rbAppend, rbMark, rbList, rbChunks, rbDelete, RecSession } from '../../utils/recordingBuffer';

/**
 * Record Class — stable single-source recorder.
 *
 * Records ONE source per recording (no canvas compositing — canvas.captureStream
 * crashes the GPU process on some machines / STATUS_BREAKPOINT):
 *   🖥️🎙️ Screen + Mic   ·   📷🎙️ Camera + Mic   ·   🖥️ Screen only
 * The MediaStream is recorded directly via MediaRecorder and uploaded to Bunny.
 * (For a class that mixes whiteboard + screen in one file, use OBS — browser
 * compositing isn't reliable here.)
 */

type Mode = 'screen_mic' | 'camera_mic' | 'screen';
type Status = 'idle' | 'recording' | 'recorded' | 'saving' | 'saved';

const MODES: { key: Mode; title: string; sub: string; icon: string }[] = [
  { key: 'screen_mic', title: 'Screen + Mic', sub: 'Slides, coding, projector + your voice', icon: '🖥️🎙️' },
  { key: 'camera_mic', title: 'Camera + Mic', sub: 'Webcam / USB cam on the whiteboard',     icon: '📷🎙️' },
  { key: 'screen',     title: 'Screen only',  sub: 'Screen + tab audio, no microphone',       icon: '🖥️' },
];

const pickMime = (): string => {
  for (const c of ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']) {
    try { if ((window as any).MediaRecorder?.isTypeSupported?.(c)) return c; } catch { /* noop */ }
  }
  return '';
};
const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
const fmtSize = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`);
const splitTags = (s: string) => s.split(',').map(t => t.trim()).filter(Boolean);

export default function RecordClass() {
  const navigate = useNavigate();

  const previewRef = useRef<HTMLVideoElement>(null);
  const recRef     = useRef<MediaRecorder | null>(null);
  const chunksRef  = useRef<Blob[]>([]);
  const rawStreams = useRef<MediaStream[]>([]);
  const streamRef  = useRef<MediaStream | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const secondsRef  = useRef(0);
  const sessionRef  = useRef('');
  const statusRef   = useRef<Status>('idle');
  const lastPctRef  = useRef(-1);
  const autoSaveArmedRef = useRef(false);  // true after a real Stop → arms the auto-upload countdown

  // telemetry helper — fire-and-forget
  const rlog = useCallback((type: string, opts?: { message?: string; data?: any }) =>
    logRecording(sessionRef.current, type, { source: 'class_recording', message: opts?.message, data: opts?.data }), []);

  const [mode, setMode]       = useState<Mode>('screen_mic');
  const [status, setStatus]   = useState<Status>('idle');
  const [paused, setPaused]   = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError]     = useState('');
  const [blob, setBlob]       = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [title, setTitle]     = useState('');
  const [desc, setDesc]       = useState('');
  const [topics, setTopics]   = useState('');
  const [courses, setCourses] = useState('');
  const [uploadPct, setUploadPct] = useState(0);
  const [savedId, setSavedId] = useState('');
  const [recoverable, setRecoverable] = useState<RecSession[]>([]);  // unsaved recordings found in IndexedDB

  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => { statusRef.current = status; }, [status]);

  // Capture tab close / navigate-away while a recording is unsaved — the #1 cause
  // of "recording stopped and not saved".
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      const s = statusRef.current;
      if (s === 'recording' || s === 'recorded' || s === 'saving') {
        rlog('page_unload', { data: { status: s } });
        // Real browser warning — the recording is buffered locally and recoverable,
        // but warn so they don't lose the live capture.
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const onVis = () => { if (document.hidden) {
      const s = statusRef.current;
      if (s === 'recording' || s === 'saving') rlog('tab_hidden', { data: { status: s } });
    }};
    window.addEventListener('beforeunload', onLeave);
    window.addEventListener('pagehide', onLeave);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('beforeunload', onLeave);
      window.removeEventListener('pagehide', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [rlog]);
  useEffect(() => {
    if (status !== 'recording' || paused) return;
    const iv = setInterval(() => setSeconds(p => {
      const n = p + 1;
      if (n % 30 === 0) rlog('heartbeat', { data: { sec: n } });  // alive signal for stale-recording alerts
      return n;
    }), 1000);
    return () => clearInterval(iv);
  }, [status, paused, rlog]);

  const stopAllTracks = useCallback(() => {
    rawStreams.current.forEach(s => s.getTracks().forEach(t => t.stop()));
    rawStreams.current = [];
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
  }, []);
  useEffect(() => () => { stopAllTracks(); if (previewUrl) URL.revokeObjectURL(previewUrl); }, [stopAllTracks, previewUrl]);

  // attach the SAFE preview (camera only) once the recording UI mounts — never mirror the screen.
  useEffect(() => {
    if (status === 'recording' && previewRef.current && previewStreamRef.current) {
      previewRef.current.srcObject = previewStreamRef.current;
      previewRef.current.muted = true;
      previewRef.current.play().catch(() => {});
    }
  }, [status]);

  const mixAudio = (streams: MediaStream[]): MediaStreamTrack | null => {
    const withAudio = streams.filter(s => s.getAudioTracks().length);
    if (withAudio.length === 0) return null;
    if (withAudio.length === 1) return withAudio[0].getAudioTracks()[0];
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new Ctx(); audioCtxRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();
    withAudio.forEach(s => ctx.createMediaStreamSource(s).connect(dest));
    return dest.stream.getAudioTracks()[0];
  };

  const start = async () => {
    setError('');
    sessionRef.current = newSessionId();
    lastPctRef.current = -1;
    rlog('session_start', { data: { mode } });
    try {
      let videoTrack: MediaStreamTrack;
      let camStream: MediaStream | null = null;
      const audioStreams: MediaStream[] = [];

      if (mode === 'camera_mic') {
        const cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 } }, audio: true });
        rawStreams.current.push(cam); camStream = cam;
        videoTrack = cam.getVideoTracks()[0]; audioStreams.push(cam);
      } else {
        const disp = await (navigator.mediaDevices as any).getDisplayMedia({ video: { frameRate: { ideal: 15 } }, audio: true });
        rawStreams.current.push(disp);
        videoTrack = disp.getVideoTracks()[0];
        if (disp.getAudioTracks().length) audioStreams.push(disp);
        if (mode === 'screen_mic') {
          try { const mic = await navigator.mediaDevices.getUserMedia({ audio: true }); rawStreams.current.push(mic); audioStreams.push(mic); } catch { /* mic optional */ }
        }
      }

      const audioTrack = mixAudio(audioStreams);
      const tracks: MediaStreamTrack[] = [videoTrack];
      if (audioTrack) tracks.push(audioTrack);
      const combined = new MediaStream(tracks);
      streamRef.current = combined;
      previewStreamRef.current = camStream ? new MediaStream(camStream.getVideoTracks()) : null;

      rlog('permission_granted', { data: { mode, hasAudio: audioStreams.length > 0 } });
      videoTrack.addEventListener('ended', () => { rlog('track_ended', { message: 'screen share / camera track ended' }); stop(); });

      const mime = pickMime();
      const rec = new MediaRecorder(combined, mime ? { mimeType: mime, videoBitsPerSecond: 1_200_000, audioBitsPerSecond: 128_000 } : undefined);
      chunksRef.current = [];
      rbStart({ id: sessionRef.current, title: '', mime: mime || 'video/webm', mode }); // crash-safe buffer
      rec.ondataavailable = e => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          rbAppend(sessionRef.current, e.data); // mirror every chunk to IndexedDB
        }
      };
      rec.onerror = (ev: any) => rlog('recorder_error', { message: ev?.error?.name || ev?.error?.message || 'MediaRecorder error' });
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'video/webm' });
        setBlob(b); setPreviewUrl(URL.createObjectURL(b));
        setTitle(t => t.trim() ? t : `Class Recording — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        autoSaveArmedRef.current = true; // arm the auto-upload countdown
        rbMark(sessionRef.current, { status: 'recorded', durationSec: secondsRef.current });
        setStatus('recorded'); stopAllTracks();
        rlog('recording_stopped', { data: { durationSec: secondsRef.current, sizeBytes: b.size, chunks: chunksRef.current.length } });
      };
      recRef.current = rec; rec.start(2000);
      setStatus('recording'); setSeconds(0); setPaused(false);
      rlog('recording_started', { data: { mime } });
    } catch (e: any) {
      stopAllTracks();
      const msg = e?.name === 'NotAllowedError' ? 'Permission denied / picker cancelled. Click Start and choose what to share.' : (e?.message || 'Could not start. Use Chrome or Edge.');
      setError(msg);
      rlog('permission_denied', { message: e?.name ? `${e.name}: ${e.message || ''}` : msg });
    }
  };

  const pause  = () => { if (recRef.current?.state === 'recording') { recRef.current.pause(); setPaused(true); rlog('paused'); } };
  const resume = () => { if (recRef.current?.state === 'paused') { recRef.current.resume(); setPaused(false); rlog('resumed'); } };
  const stop   = useCallback(() => { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop(); }, []);
  const discard = () => { rlog('discard'); autoSaveArmedRef.current = false; rbDelete(sessionRef.current); if (previewUrl) URL.revokeObjectURL(previewUrl); setBlob(null); setPreviewUrl(''); setSeconds(0); setUploadPct(0); setStatus('idle'); };

  const save = useCallback(async (overrideBlob?: Blob, overrideSession?: string) => {
    const b = overrideBlob || blob;
    const sid = overrideSession || sessionRef.current;
    if (!b) return;
    const useTitle = title.trim() || `Class Recording — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    autoSaveArmedRef.current = false; // we're saving now — cancel any auto-save countdown
    setError(''); setStatus('saving'); setUploadPct(0);
    rlog('save_clicked', { data: { sizeBytes: b.size, durationSec: secondsRef.current } });
    let stage = 'bunny_create';
    try {
      const meta = await learningContentLibraryApi.createBunnyVideo(useTitle);
      rlog('bunny_create_ok', { data: { bunnyVideoId: meta.videoId, libraryId: meta.libraryId } });
      stage = 'upload';
      rlog('upload_started', { data: { endpoint: meta.tus.endpoint, sizeBytes: b.size } });
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(b, {
          endpoint: meta.tus.endpoint,
          retryDelays: [0, 2000, 5000, 10000, 20000, 30000],
          // Resumable: persist the upload so a dropped connection / reload resumes
          // instead of restarting or failing.
          storeFingerprintForResuming: true,
          removeFingerprintOnSuccess: true,
          headers: { AuthorizationSignature: meta.tus.signature, AuthorizationExpire: String(meta.tus.expiration), VideoId: meta.videoId, LibraryId: String(meta.libraryId) },
          metadata: { filetype: b.type || 'video/webm', title: useTitle },
          onError: (err) => reject(err),
          onProgress: (sent, total) => {
            if (!total) return;
            const pct = Math.round((sent / total) * 100);
            setUploadPct(pct);
            if (pct >= lastPctRef.current + 10 || pct === 100) { lastPctRef.current = pct; rlog('upload_progress', { data: { pct } }); }
          },
          onSuccess: () => resolve(),
        });
        upload.start();
      });
      rlog('upload_success', { data: { bunnyVideoId: meta.videoId } });
      stage = 'content_save';
      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');
      const { data } = await axios.post('/api/v1/learning-library/bunny/content', {
        type: 'video', videoSource: 'bunny', bunnyVideoId: meta.videoId, bunnyLibraryId: meta.libraryId,
        videoThumbnail: meta.cdnHostname ? `https://${meta.cdnHostname}/${meta.videoId}/thumbnail.jpg` : undefined,
        title: useTitle, description: desc.trim() || undefined,
        topicTags: splitTags(topics), courseTags: splitTags(courses),
        estimatedDuration: Math.max(1, Math.round(secondsRef.current / 60)), videoDuration: secondsRef.current, isPublished: true,
      }, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}) } });
      setSavedId(data?._id || ''); setStatus('saved');
      rlog('content_save_ok', { data: { contentId: data?._id, bunnyVideoId: meta.videoId } });
      rbDelete(sid); // safely on Bunny — clear the local crash-safe buffer
      setRecoverable(prev => prev.filter(r => r.id !== sid));
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Upload failed. Please try again.';
      setError(msg); setStatus('recorded');
      rlog(stage === 'bunny_create' ? 'bunny_create_error' : stage === 'upload' ? 'upload_error' : 'content_save_error', { message: `${stage}: ${msg}` });
    }
  }, [blob, title, desc, topics, courses, rlog]);

  // Auto-save countdown (Tier 2): after a real Stop, auto-upload if the instructor
  // hasn't saved within 60s — eliminates "forgot to save".
  useEffect(() => {
    if (status !== 'recorded' || !autoSaveArmedRef.current) return;
    const t = setTimeout(() => { if (statusRef.current === 'recorded') { rlog('auto_save_triggered'); save(); } }, 60000);
    return () => clearTimeout(t);
  }, [status, save, rlog]);

  // Recovery (Tier 1): surface any unsaved recordings left in the crash-safe buffer.
  useEffect(() => { rbList().then(list => setRecoverable(list.filter(s => s.chunkCount > 0))); }, []);

  const recover = async (s: RecSession) => {
    const chunks = await rbChunks(s.id);
    if (!chunks.length) { rbDelete(s.id); setRecoverable(p => p.filter(r => r.id !== s.id)); return; }
    const b = new Blob(chunks, { type: s.mime || 'video/webm' });
    sessionRef.current = s.id;
    autoSaveArmedRef.current = false; // user decides when to upload a recovered file
    setBlob(b); setPreviewUrl(URL.createObjectURL(b));
    setTitle(s.title || `Class Recording — ${new Date(s.createdAt).toLocaleString()}`);
    setSeconds(s.durationSec || 0); secondsRef.current = s.durationSec || 0;
    setError(''); setStatus('recorded');
    rlog('recovery_loaded', { data: { sizeBytes: b.size, durationSec: s.durationSec } });
  };
  const discardRecoverable = (s: RecSession) => { rbDelete(s.id); setRecoverable(p => p.filter(r => r.id !== s.id)); };

  const btn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' });
  const ghost: React.CSSProperties = { background: '#fff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' };
  const input: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14, marginTop: 6 };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#334155' };

  return (
    <div style={{ maxWidth: status === 'recording' || status === 'recorded' || status === 'saving' ? 1100 : 820, margin: '0 auto', padding: 24 }}>
      <style>{`@keyframes recpulse{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>🔴 Record Class</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Record a class — it saves to your Content Library to assign to any day.</p>
        </div>
        <button style={ghost} onClick={() => navigate('/learning-library')}>← Back to Library</button>
      </div>

      {error && <div style={{ background: '#fdecec', border: '1px solid #f3c9c9', color: '#b3261e', padding: '10px 14px', borderRadius: 10, margin: '12px 0', fontSize: 14 }}>{error}</div>}

      {/* Recovery banner (Tier 1): unsaved recordings found in the crash-safe buffer */}
      {status === 'idle' && recoverable.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px', margin: '12px 0' }}>
          <div style={{ fontWeight: 700, color: '#92400e', fontSize: 14, marginBottom: 8 }}>⚠️ {recoverable.length} unsaved recording{recoverable.length > 1 ? 's' : ''} found</div>
          {recoverable.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid #fde7b0' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || 'Untitled class recording'}</div>
                <div style={{ fontSize: 12, color: '#92400e' }}>{fmtTime(s.durationSec || 0)} · {fmtSize(s.bytes || 0)} · {new Date(s.createdAt).toLocaleString()}</div>
              </div>
              <button style={{ ...btn('#16a34a'), padding: '8px 14px', fontSize: 13 }} onClick={() => recover(s)}>↻ Recover &amp; Upload</button>
              <button style={{ ...ghost, padding: '8px 12px', fontSize: 13 }} onClick={() => { if (window.confirm('Permanently delete this unsaved recording?')) discardRecoverable(s); }}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {status === 'idle' && (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '18px 0 8px' }}>1. Choose what to record</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, margin: '6px 0 16px' }}>
            {MODES.map(m => (
              <button key={m.key} onClick={() => setMode(m.key)} style={{
                textAlign: 'left', cursor: 'pointer', borderRadius: 14, padding: 16,
                border: mode === m.key ? '2px solid #0a66c2' : '1.5px solid #e2e8f0',
                background: mode === m.key ? '#eff6ff' : '#fff',
              }}>
                <div style={{ fontSize: 24 }}>{m.icon}</div>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 6 }}>{m.title}</div>
                <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>{m.sub}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '4px 0 8px' }}>2. Start</div>
          <button style={btn('#dc2626')} onClick={start}>⏺ Start Recording</button>
          <p style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 12 }}>
            For screen modes, your browser will ask which screen/window/tab to share. Use a clip-on mic for clear audio. Uploads privately to Bunny Stream. Works best in Chrome/Edge.
          </p>
        </>
      )}

      {status === 'recording' && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fef2f2', color: '#dc2626', fontWeight: 700, padding: '6px 12px', borderRadius: 999 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', animation: paused ? 'none' : 'recpulse 1.2s infinite' }} />
              {paused ? 'PAUSED' : 'REC'} · {fmtTime(seconds)}
            </span>
          </div>
          {mode !== 'camera_mic' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#0f172a', color: '#fff', borderRadius: 12, padding: '22px 24px' }}>
              <span style={{ fontSize: 30 }}>🖥️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Recording your screen…</div>
                <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 2 }}>The live screen is hidden here on purpose. Keep teaching — it's all being captured.</div>
              </div>
            </div>
          )}
          {mode === 'camera_mic' && <video ref={previewRef} autoPlay muted playsInline style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 12, background: '#000' }} />}
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {!paused ? <button style={ghost} onClick={pause}>⏸ Pause</button> : <button style={ghost} onClick={resume}>▶ Resume</button>}
            <button style={btn('#0f172a')} onClick={stop}>⏹ Stop &amp; Review</button>
          </div>
        </div>
      )}

      {(status === 'recorded' || status === 'saving') && (
        <div style={{ marginTop: 14 }}>
          <video src={previewUrl} controls style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 12, background: '#000' }} />
          <div style={{ fontSize: 13, color: '#64748b', margin: '8px 0 16px' }}>Length {fmtTime(seconds)} · Size {blob ? fmtSize(blob.size) : '—'} · uploads privately to Bunny Stream</div>
          <div style={{ display: 'grid', gap: 14, maxWidth: 640 }}>
            <div><span style={label}>Title *</span><input style={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Java — Day 12: Spring Boot Controllers" /></div>
            <div><span style={label}>Description</span><input style={input} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional — what was covered" /></div>
            <div><span style={label}>Topic tags (comma-separated)</span><input style={input} value={topics} onChange={e => setTopics(e.target.value)} placeholder="Spring Boot, REST" /></div>
            <div><span style={label}>Course tags (comma-separated)</span><input style={input} value={courses} onChange={e => setCourses(e.target.value)} placeholder="Java Full Stack" /></div>
          </div>
          {status === 'saving' && (
            <div style={{ margin: '16px 0', maxWidth: 640 }}>
              <div style={{ height: 10, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${uploadPct}%`, height: '100%', background: '#0a66c2', transition: 'width .2s' }} /></div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>Uploading… {uploadPct}% — keep this tab open.</div>
            </div>
          )}
          {status === 'recorded' && autoSaveArmedRef.current && (
            <div style={{ fontSize: 12.5, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', margin: '14px 0 0', maxWidth: 640 }}>
              ⏱ Auto-uploads in ~60s if you don't save — your recording is already buffered safely.
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button style={{ ...btn('#16a34a'), opacity: status === 'saving' ? 0.6 : 1 }} disabled={status === 'saving'} onClick={() => save()}>💾 Save to Library</button>
            <button style={{ ...ghost, opacity: status === 'saving' ? 0.6 : 1 }} disabled={status === 'saving'} onClick={discard}>🗑 Discard &amp; Re-record</button>
          </div>
        </div>
      )}

      {status === 'saved' && (
        <div style={{ marginTop: 24, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <h3 style={{ margin: '8px 0 4px', color: '#166534' }}>Recording saved to the Library</h3>
          <p style={{ color: '#15803d', margin: '0 0 16px', fontSize: 14 }}>Add it to a day plan, or record another class.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={btn('#0f172a')} onClick={() => navigate('/learning-library')}>Go to Library</button>
            {savedId && <button style={ghost} onClick={() => navigate(`/learning-library/edit/${savedId}`)}>Edit details</button>}
            <button style={ghost} onClick={() => { setSavedId(''); setBlob(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(''); setTitle(''); setDesc(''); setTopics(''); setCourses(''); setSeconds(0); setUploadPct(0); setStatus('idle'); }}>Record another</button>
          </div>
        </div>
      )}
    </div>
  );
}
