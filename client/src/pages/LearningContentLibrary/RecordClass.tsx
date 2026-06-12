import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

/**
 * Record Class — in-app class recorder (Slice 1).
 *
 * Captures screen + mic (or camera + mic) entirely in the browser via
 * getDisplayMedia / getUserMedia + MediaRecorder, then uploads the recording
 * through the existing learning-library video endpoint (videoSource: 'upload',
 * field name `videoFile`). The result lands in the Content Library and can be
 * assigned to any day — no external software for trainers.
 *
 * Hosting note: Slice 1 stores via the existing upload+stream pipeline (500 MB
 * cap). Slice 2 swaps storage to Bunny Stream (resumable upload) without
 * changing this recorder UX.
 */

type Mode = 'screen_mic' | 'screen' | 'camera_mic';
type Status = 'idle' | 'recording' | 'recorded' | 'saving' | 'saved';

const MAX_BYTES = 490 * 1024 * 1024; // keep under the server's 500 MB limit

const MODE_LABELS: Record<Mode, { title: string; sub: string; icon: string }> = {
  screen_mic: { title: 'Screen + Mic', sub: 'Slides, coding, projector + your voice', icon: '🖥️🎙️' },
  screen:     { title: 'Screen only',  sub: 'Screen + tab audio, no microphone',     icon: '🖥️' },
  camera_mic: { title: 'Camera + Mic', sub: 'Webcam / USB cam on the whiteboard',    icon: '📷🎙️' },
};

const pickMime = (): string => {
  const cands = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const c of cands) {
    try { if ((window as any).MediaRecorder?.isTypeSupported?.(c)) return c; } catch { /* noop */ }
  }
  return '';
};

const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`);
const splitTags = (s: string) => s.split(',').map(t => t.trim()).filter(Boolean);

export default function RecordClass() {
  const navigate = useNavigate();

  const previewRef   = useRef<HTMLVideoElement>(null);
  const recRef       = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const streamRef    = useRef<MediaStream | null>(null);   // combined (recorded)
  const rawStreams   = useRef<MediaStream[]>([]);          // sources to stop
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const secondsRef   = useRef(0);

  const [mode,    setMode]    = useState<Mode>('screen_mic');
  const [status,  setStatus]  = useState<Status>('idle');
  const [paused,  setPaused]  = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error,   setError]   = useState('');

  const [blob,       setBlob]       = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [topics,   setTopics]   = useState('');
  const [courses,  setCourses]  = useState('');
  const [uploadPct, setUploadPct] = useState(0);
  const [savedId,  setSavedId]  = useState('');

  useEffect(() => { secondsRef.current = seconds; }, [seconds]);

  // duration timer
  useEffect(() => {
    if (status !== 'recording' || paused) return;
    const iv = setInterval(() => setSeconds(p => p + 1), 1000);
    return () => clearInterval(iv);
  }, [status, paused]);

  // attach the live stream once the recording UI (and its <video>) is mounted
  useEffect(() => {
    if (status === 'recording' && previewRef.current && streamRef.current) {
      previewRef.current.srcObject = streamRef.current;
      previewRef.current.muted = true;
      previewRef.current.play().catch(() => {});
    }
  }, [status]);

  const stopAllTracks = useCallback(() => {
    rawStreams.current.forEach(s => s.getTracks().forEach(t => t.stop()));
    rawStreams.current = [];
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
  }, []);

  // cleanup on unmount
  useEffect(() => () => { stopAllTracks(); if (previewUrl) URL.revokeObjectURL(previewUrl); }, [stopAllTracks, previewUrl]);

  // mix 0..n audio streams into a single track
  const mixAudio = (streams: MediaStream[]): MediaStreamTrack | null => {
    const withAudio = streams.filter(s => s.getAudioTracks().length);
    if (withAudio.length === 0) return null;
    if (withAudio.length === 1) return withAudio[0].getAudioTracks()[0];
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new Ctx();
    audioCtxRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();
    withAudio.forEach(s => ctx.createMediaStreamSource(s).connect(dest));
    return dest.stream.getAudioTracks()[0];
  };

  const startRecording = async () => {
    setError('');
    try {
      let videoTrack: MediaStreamTrack;
      const audioStreams: MediaStream[] = [];

      if (mode === 'camera_mic') {
        const cam = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true,
        });
        rawStreams.current.push(cam);
        videoTrack = cam.getVideoTracks()[0];
        audioStreams.push(cam);
      } else {
        const disp = await (navigator.mediaDevices as any).getDisplayMedia({
          video: { frameRate: { ideal: 15 } }, audio: true,
        });
        rawStreams.current.push(disp);
        videoTrack = disp.getVideoTracks()[0];
        if (disp.getAudioTracks().length) audioStreams.push(disp);
        if (mode === 'screen_mic') {
          try {
            const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
            rawStreams.current.push(mic);
            audioStreams.push(mic);
          } catch { /* mic optional */ }
        }
      }

      const audioTrack = mixAudio(audioStreams);
      const tracks: MediaStreamTrack[] = [videoTrack];
      if (audioTrack) tracks.push(audioTrack);
      const combined = new MediaStream(tracks);
      streamRef.current = combined;
      if (previewRef.current) { previewRef.current.srcObject = combined; previewRef.current.muted = true; previewRef.current.play().catch(() => {}); }

      // auto-stop if the user ends screen-share from the browser bar
      videoTrack.addEventListener('ended', () => stopRecording());

      const mime = pickMime();
      const rec = new MediaRecorder(combined, mime ? { mimeType: mime, videoBitsPerSecond: 1_000_000, audioBitsPerSecond: 128_000 } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'video/webm' });
        setBlob(b);
        setPreviewUrl(URL.createObjectURL(b));
        setTitle(`Class Recording — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        setStatus('recorded');
        stopAllTracks();
      };
      recRef.current = rec;
      rec.start(2000); // gather chunks every 2s
      setStatus('recording');
      setSeconds(0);
      setPaused(false);
    } catch (e: any) {
      stopAllTracks();
      setError(e?.name === 'NotAllowedError'
        ? 'Permission denied or the picker was cancelled. Click Start and choose a screen/window to share.'
        : (e?.message || 'Could not start recording in this browser. Use Chrome or Edge.'));
    }
  };

  const pauseRecording  = () => { if (recRef.current?.state === 'recording') { recRef.current.pause(); setPaused(true); } };
  const resumeRecording = () => { if (recRef.current?.state === 'paused') { recRef.current.resume(); setPaused(false); } };
  const stopRecording   = useCallback(() => { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop(); }, []);

  const discard = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null); setPreviewUrl(''); setSeconds(0); setUploadPct(0);
    setStatus('idle');
  };

  const save = async () => {
    if (!blob) return;
    if (!title.trim()) { setError('Please enter a title.'); return; }
    if (blob.size > MAX_BYTES) {
      setError(`This recording is ${fmtSize(blob.size)} — over the 490 MB limit. Record a shorter session (Bunny hosting in the next slice removes this cap).`);
      return;
    }
    setError(''); setStatus('saving'); setUploadPct(0);
    try {
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const fd = new FormData();
      fd.append('videoFile', blob, `class-recording-${Date.now()}.${ext}`);
      fd.append('type', 'video');
      fd.append('videoSource', 'upload');
      fd.append('title', title.trim());
      if (desc.trim()) fd.append('description', desc.trim());
      fd.append('topicTags', JSON.stringify(splitTags(topics)));
      fd.append('courseTags', JSON.stringify(splitTags(courses)));
      fd.append('estimatedDuration', String(Math.max(1, Math.round(secondsRef.current / 60))));
      fd.append('videoDuration', String(secondsRef.current));
      fd.append('isPublished', 'true');

      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');
      const { data } = await axios.post('/api/v1/learning-library', fd, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
        },
        onUploadProgress: (e) => { if (e.total) setUploadPct(Math.round((e.loaded / e.total) * 100)); },
      });
      setSavedId(data?._id || '');
      setStatus('saved');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Upload failed. Please try again.');
      setStatus('recorded');
    }
  };

  // ── styles ──
  const btn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' });
  const ghost: React.CSSProperties = { background: '#fff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' };
  const input: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14, marginTop: 6 };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#334155' };

  const big = status === 'recording' || status === 'recorded' || status === 'saving';

  return (
    <div style={{ maxWidth: big ? 1320 : 920, margin: '0 auto', padding: 24 }}>
      <style>{`@keyframes recpulse{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>🔴 Record Class</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Record a class right here — it saves to your Content Library to assign to any day.</p>
        </div>
        <button style={ghost} onClick={() => navigate('/learning-library')}>← Back to Library</button>
      </div>

      {error && (
        <div style={{ background: '#fdecec', border: '1px solid #f3c9c9', color: '#b3261e', padding: '10px 14px', borderRadius: 10, margin: '12px 0', fontSize: 14 }}>{error}</div>
      )}

      {/* ── IDLE: choose mode ── */}
      {status === 'idle' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, margin: '16px 0' }}>
            {(Object.keys(MODE_LABELS) as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                textAlign: 'left', cursor: 'pointer', borderRadius: 14, padding: 16,
                border: mode === m ? '2px solid #0a66c2' : '1.5px solid #e2e8f0',
                background: mode === m ? '#eff6ff' : '#fff',
              }}>
                <div style={{ fontSize: 24 }}>{MODE_LABELS[m].icon}</div>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 6 }}>{MODE_LABELS[m].title}</div>
                <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>{MODE_LABELS[m].sub}</div>
              </button>
            ))}
          </div>
          <button style={btn('#dc2626')} onClick={startRecording}>⏺ Start Recording</button>
          <p style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 12 }}>
            Tip: use a clip-on mic for clear audio. Keep recordings under ~45 min for now (490 MB cap — lifted when we add Bunny hosting). Works best in Chrome / Edge.
          </p>
        </>
      )}

      {/* ── RECORDING ── */}
      {status === 'recording' && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fef2f2', color: '#dc2626', fontWeight: 700, padding: '6px 12px', borderRadius: 999 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', animation: paused ? 'none' : 'recpulse 1.2s infinite' }} />
              {paused ? 'PAUSED' : 'REC'} · {fmtTime(seconds)}
            </span>
          </div>
          <video ref={previewRef} autoPlay muted playsInline style={{ width: '100%', height: '74vh', maxHeight: 'none', objectFit: 'contain', borderRadius: 12, background: '#000' }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {!paused
              ? <button style={ghost} onClick={pauseRecording}>⏸ Pause</button>
              : <button style={ghost} onClick={resumeRecording}>▶ Resume</button>}
            <button style={btn('#0f172a')} onClick={stopRecording}>⏹ Stop &amp; Review</button>
          </div>
        </div>
      )}

      {/* ── RECORDED / SAVING: preview + details ── */}
      {(status === 'recorded' || status === 'saving') && (
        <div style={{ marginTop: 16 }}>
          <video src={previewUrl} controls style={{ width: '100%', height: '64vh', maxHeight: 'none', objectFit: 'contain', borderRadius: 12, background: '#000' }} />
          <div style={{ fontSize: 13, color: '#64748b', margin: '8px 0 16px' }}>
            Length {fmtTime(seconds)} · Size {blob ? fmtSize(blob.size) : '—'}
            {blob && blob.size > MAX_BYTES && <span style={{ color: '#dc2626', fontWeight: 600 }}> · over 490 MB limit</span>}
          </div>

          <div style={{ display: 'grid', gap: 14, maxWidth: 640 }}>
            <div><span style={label}>Title *</span><input style={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Java — Day 12: Spring Boot Controllers" /></div>
            <div><span style={label}>Description</span><input style={input} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional — what was covered" /></div>
            <div><span style={label}>Topic tags (comma-separated)</span><input style={input} value={topics} onChange={e => setTopics(e.target.value)} placeholder="Spring Boot, REST, Controllers" /></div>
            <div><span style={label}>Course tags (comma-separated)</span><input style={input} value={courses} onChange={e => setCourses(e.target.value)} placeholder="Java Full Stack" /></div>
          </div>

          {status === 'saving' && (
            <div style={{ margin: '16px 0', maxWidth: 640 }}>
              <div style={{ height: 10, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: `${uploadPct}%`, height: '100%', background: '#0a66c2', transition: 'width .2s' }} />
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>Uploading… {uploadPct}% — keep this tab open.</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button style={{ ...btn('#16a34a'), opacity: status === 'saving' ? 0.6 : 1 }} disabled={status === 'saving'} onClick={save}>💾 Save to Library</button>
            <button style={{ ...ghost, opacity: status === 'saving' ? 0.6 : 1 }} disabled={status === 'saving'} onClick={discard}>🗑 Discard &amp; Re-record</button>
          </div>
        </div>
      )}

      {/* ── SAVED ── */}
      {status === 'saved' && (
        <div style={{ marginTop: 24, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <h3 style={{ margin: '8px 0 4px', color: '#166534' }}>Recording saved to the Library</h3>
          <p style={{ color: '#15803d', margin: '0 0 16px', fontSize: 14 }}>You can now add it to a day plan, or record another class.</p>
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
